/**
 * Rider bank — create Paystack transfer recipient + persist on riders row.
 *
 * Call only after rider confirmed the resolved account_name in the UI.
 * Kept separate from vendor-save-bank.
 *
 * POST {
 *   token,
 *   bank_code, bank_name, account_number, account_name  // account_name from resolve
 * }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { PAYSTACK_SECRET, paystackFetch } from '../_shared/paystack.ts'

type Body = {
  token?: string
  bank_code?: string
  bank_name?: string
  account_number?: string
  account_name?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }
  if (!PAYSTACK_SECRET) {
    return jsonResponse({ error: 'Payouts are not configured.' }, 500)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Server misconfigured.' }, 500)
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400)
  }

  const token = body.token?.trim()
  const bankCode = body.bank_code?.trim()
  const bankName = body.bank_name?.trim()
  const accountNumber = body.account_number?.trim().replace(/\s+/g, '')
  const accountName = body.account_name?.trim()

  if (!token) {
    return jsonResponse({ error: 'Missing rider access token.' }, 401)
  }
  if (!bankCode || !bankName) {
    return jsonResponse({ error: 'bank_code and bank_name are required.' }, 400)
  }
  if (!accountNumber || !/^\d{10}$/.test(accountNumber)) {
    return jsonResponse({ error: 'account_number must be a 10-digit NUBAN.' }, 400)
  }
  if (!accountName) {
    return jsonResponse({ error: 'account_name from Paystack resolve is required.' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: rider, error: loadErr } = await admin
    .from('riders')
    .select('id, name, paystack_recipient_code')
    .eq('access_token', token)
    .maybeSingle()

  if (loadErr || !rider) {
    return jsonResponse({ error: 'Invalid rider access token.' }, 401)
  }

  // Re-resolve so we never persist a name the rider (or a stale UI) invented.
  const resolved = await paystackFetch(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
  )
  if (!resolved.ok || !resolved.json.data || Array.isArray(resolved.json.data)) {
    return jsonResponse(
      { error: resolved.json.message || 'Account could not be re-verified.' },
      502,
    )
  }
  const resolvedName = String(
    (resolved.json.data as { account_name?: string }).account_name ?? '',
  ).trim()
  if (!resolvedName) {
    return jsonResponse({ error: 'Paystack did not return an account name.' }, 502)
  }
  if (resolvedName.toLowerCase() !== accountName.toLowerCase()) {
    return jsonResponse(
      {
        error:
          'Account name no longer matches Paystack. Resolve again before saving.',
        account_name: resolvedName,
      },
      409,
    )
  }

  const { ok, json } = await paystackFetch('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type: 'nuban',
      name: resolvedName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
      description: `KampeDrop rider ${rider.id}`,
      metadata: { rider_id: rider.id },
    }),
  })

  if (!ok || !json.data || Array.isArray(json.data)) {
    console.error('create recipient failed', json)
    return jsonResponse(
      { error: json.message || 'Paystack could not create a transfer recipient.' },
      502,
    )
  }

  const recipientCode = String(
    (json.data as { recipient_code?: string }).recipient_code ?? '',
  ).trim()
  if (!recipientCode) {
    return jsonResponse({ error: 'Paystack did not return a recipient_code.' }, 502)
  }

  const { error: updateErr } = await admin
    .from('riders')
    .update({
      bank_name: bankName,
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: resolvedName,
      paystack_recipient_code: recipientCode,
    })
    .eq('id', rider.id)

  if (updateErr) {
    console.error('save bank on rider', updateErr)
    return jsonResponse({ error: 'Could not save bank details.' }, 500)
  }

  return jsonResponse({
    ok: true,
    bank_name: bankName,
    bank_code: bankCode,
    account_number: accountNumber,
    account_name: resolvedName,
    paystack_recipient_code: recipientCode,
  })
})
