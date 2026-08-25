/**
 * Vendor bank — list NGN banks + resolve account number (Paystack).
 *
 * Auth: vendor access_token in body (same credential as portal RPCs).
 *
 * POST { token, action: "list_banks" }
 * POST { token, action: "resolve", bank_code, account_number }
 *
 * Resolve does NOT save — returns Paystack's account_name for UI confirmation.
 * Saving is vendor-save-bank after the vendor confirms the name.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { PAYSTACK_SECRET, paystackFetch } from '../_shared/paystack.ts'

type Body = {
  token?: string
  action?: 'list_banks' | 'resolve'
  bank_code?: string
  account_number?: string
}

async function vendorFromToken(
  admin: ReturnType<typeof createClient>,
  token: string,
): Promise<{ id: string } | null> {
  const { data, error } = await admin
    .from('vendors')
    .select('id')
    .eq('access_token', token)
    .maybeSingle()
  if (error || !data) return null
  return data as { id: string }
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
  if (!token) {
    return jsonResponse({ error: 'Missing vendor access token.' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const vendor = await vendorFromToken(admin, token)
  if (!vendor) {
    return jsonResponse({ error: 'Invalid vendor access token.' }, 401)
  }

  const action = body.action ?? 'resolve'

  if (action === 'list_banks') {
    const { ok, json } = await paystackFetch('/bank?currency=NGN&country=nigeria')
    if (!ok) {
      console.error('list banks failed', json)
      return jsonResponse(
        { error: json.message || 'Could not load bank list from Paystack.' },
        502,
      )
    }
    const rows = Array.isArray(json.data) ? json.data : []
    const banks = rows
      .map((b) => {
        const row = b as { name?: string; code?: string; active?: boolean }
        return {
          name: String(row.name ?? ''),
          code: String(row.code ?? ''),
          active: row.active !== false,
        }
      })
      .filter((b) => b.name && b.code && b.active)
      .sort((a, b) => a.name.localeCompare(b.name))

    return jsonResponse({ banks })
  }

  if (action !== 'resolve') {
    return jsonResponse({ error: 'Unknown action. Use list_banks or resolve.' }, 400)
  }

  const bankCode = body.bank_code?.trim()
  const accountNumber = body.account_number?.trim().replace(/\s+/g, '')
  if (!bankCode) {
    return jsonResponse({ error: 'bank_code is required.' }, 400)
  }
  if (!accountNumber || !/^\d{10}$/.test(accountNumber)) {
    return jsonResponse({ error: 'account_number must be a 10-digit NUBAN.' }, 400)
  }

  const { ok, json } = await paystackFetch(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
  )

  if (!ok || !json.data || Array.isArray(json.data)) {
    console.error('resolve account failed', json)
    return jsonResponse(
      {
        error:
          json.message ||
          'Could not resolve this account. Check the number and bank, then try again.',
      },
      502,
    )
  }

  const data = json.data as {
    account_number?: string
    account_name?: string
    bank_id?: number
  }

  const accountName = data.account_name?.trim()
  if (!accountName) {
    return jsonResponse({ error: 'Paystack did not return an account name.' }, 502)
  }

  return jsonResponse({
    account_number: data.account_number ?? accountNumber,
    account_name: accountName,
    bank_code: bankCode,
    bank_id: data.bank_id ?? null,
  })
})
