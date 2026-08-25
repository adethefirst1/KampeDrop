/**
 * Initiate a Paystack Transfer for one wallet_withdrawals row.
 *
 * Auth (either):
 *   - Vendor: { token } matching the withdrawal's vendor (auto path after request)
 *   - Ops: Authorization Bearer = user JWT where is_ops() is true (Approve path)
 *
 * Body: { withdrawal_id, token? }
 *
 * Flow:
 *   1. Load withdrawal; must be pending or processing (retry after soft fail)
 *   2. Require vendor.paystack_recipient_code
 *   3. POST /transfer (amount in kobo = NGN * 100)
 *   4. On acceptance (transfer_code returned, including status otp):
 *        RPC record_payout_initiated → debit wallet + ledger + status
 *        processing | needs_otp
 *   5. On Paystack reject (no transfer_code): leave / revert to pending (no debit)
 *
 * Final paid is NOT set here — only paystack-webhook (or ops manual override RPC).
 *
 * Depends on RPC (next piece):
 *   record_payout_initiated(p_withdrawal_id, p_transfer_code, p_reference, p_paystack_status)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { PAYSTACK_SECRET, paystackFetch } from '../_shared/paystack.ts'

type Body = {
  withdrawal_id?: string
  token?: string
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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Server misconfigured.' }, 500)
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400)
  }

  const withdrawalId = body.withdrawal_id?.trim()
  if (!withdrawalId) {
    return jsonResponse({ error: 'withdrawal_id is required.' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: withdrawal, error: wErr } = await admin
    .from('wallet_withdrawals')
    .select(
      'id, vendor_id, amount, status, paystack_transfer_code, paystack_reference',
    )
    .eq('id', withdrawalId)
    .maybeSingle()

  if (wErr || !withdrawal) {
    return jsonResponse({ error: 'Withdrawal not found.' }, 404)
  }

  // --- Auth: vendor token OR ops JWT ---
  const vendorToken = body.token?.trim()
  let authorized = false

  if (vendorToken) {
    const { data: vendor } = await admin
      .from('vendors')
      .select('id')
      .eq('access_token', vendorToken)
      .eq('id', withdrawal.vendor_id)
      .maybeSingle()
    authorized = Boolean(vendor)
  }

  if (!authorized) {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (anonKey && authHeader.startsWith('Bearer ')) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: isOps, error: opsErr } = await userClient.rpc('is_ops')
      if (!opsErr && isOps === true) authorized = true
    }
  }

  if (!authorized) {
    return jsonResponse({ error: 'Not authorized to payout this withdrawal.' }, 403)
  }

  if (withdrawal.status === 'paid') {
    return jsonResponse({ ok: true, already: 'paid', withdrawal_id: withdrawal.id })
  }
  if (withdrawal.status === 'rejected' || withdrawal.status === 'failed') {
    return jsonResponse(
      { error: `Withdrawal is ${withdrawal.status} and cannot be paid out.` },
      400,
    )
  }
  if (withdrawal.status === 'needs_otp') {
    return jsonResponse(
      {
        error:
          'This transfer needs OTP in Paystack. Complete finalize there, or wait for webhook.',
        status: 'needs_otp',
        transfer_code: withdrawal.paystack_transfer_code,
      },
      409,
    )
  }
  // Idempotent: already initiated
  if (
    withdrawal.status === 'processing' &&
    withdrawal.paystack_transfer_code
  ) {
    return jsonResponse({
      ok: true,
      already: 'processing',
      withdrawal_id: withdrawal.id,
      transfer_code: withdrawal.paystack_transfer_code,
      reference: withdrawal.paystack_reference,
    })
  }
  if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
    return jsonResponse(
      { error: `Cannot payout from status "${withdrawal.status}".` },
      400,
    )
  }

  const { data: vendor, error: vErr } = await admin
    .from('vendors')
    .select('id, paystack_recipient_code, account_name')
    .eq('id', withdrawal.vendor_id)
    .maybeSingle()

  if (vErr || !vendor) {
    return jsonResponse({ error: 'Vendor not found.' }, 404)
  }
  const recipient = String(vendor.paystack_recipient_code ?? '').trim()
  if (!recipient) {
    return jsonResponse(
      { error: 'Vendor has no verified bank details. Add bank details first.' },
      400,
    )
  }

  const amountNgn = Number(withdrawal.amount)
  if (!Number.isFinite(amountNgn) || amountNgn < 100) {
    return jsonResponse({ error: 'Withdrawal amount is too small for transfer.' }, 400)
  }
  const amountKobo = Math.round(amountNgn * 100)

  // Stable unique reference (Paystack: lowercase, - _ alphanumeric)
  const reference =
    withdrawal.paystack_reference?.trim() ||
    `wd_${String(withdrawal.id).replace(/-/g, '').toLowerCase()}`

  // Mark processing before calling Paystack so concurrent Approve can't double-fire.
  // No debit yet — debit only after Paystack returns transfer_code (docs: funds deducted then).
  if (withdrawal.status === 'pending') {
    const { error: lockErr } = await admin
      .from('wallet_withdrawals')
      .update({
        status: 'processing',
        paystack_reference: reference,
      })
      .eq('id', withdrawal.id)
      .eq('status', 'pending')
    if (lockErr) {
      console.error('lock processing', lockErr)
      return jsonResponse({ error: 'Could not start payout.' }, 500)
    }
  } else if (!withdrawal.paystack_reference) {
    await admin
      .from('wallet_withdrawals')
      .update({ paystack_reference: reference })
      .eq('id', withdrawal.id)
  }

  const reason = `KampeDrop vendor withdrawal ${withdrawal.id}`

  const { ok, json } = await paystackFetch('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount: amountKobo,
      recipient,
      reason,
      currency: 'NGN',
      reference,
    }),
  })

  const data = (!Array.isArray(json.data) && json.data) || null
  const transferCode = String(
    (data as { transfer_code?: string } | null)?.transfer_code ?? '',
  ).trim()
  const paystackStatus = String(
    (data as { status?: string } | null)?.status ?? '',
  )
    .trim()
    .toLowerCase()

  // Paystack accepted initiate (including OTP gate) iff we got a transfer_code.
  // Docs: balance is deducted at this point, before OTP finalize.
  if (ok && transferCode) {
    const { data: recorded, error: rpcErr } = await admin.rpc(
      'record_payout_initiated',
      {
        p_withdrawal_id: withdrawal.id,
        p_transfer_code: transferCode,
        p_reference: reference,
        p_paystack_status: paystackStatus || null,
      },
    )

    if (rpcErr) {
      console.error('record_payout_initiated', rpcErr)
      // Money may already be in flight at Paystack — surface loudly for ops.
      return jsonResponse(
        {
          error:
            'Paystack accepted the transfer but wallet debit failed. Contact ops immediately.',
          transfer_code: transferCode,
          reference,
          paystack_status: paystackStatus,
          detail: rpcErr.message,
        },
        500,
      )
    }

    const status =
      paystackStatus === 'otp'
        ? 'needs_otp'
        : ((recorded as { status?: string } | null)?.status ?? 'processing')

    return jsonResponse({
      ok: true,
      withdrawal_id: withdrawal.id,
      status,
      transfer_code: transferCode,
      reference,
      paystack_status: paystackStatus,
      needs_otp: paystackStatus === 'otp',
      message:
        paystackStatus === 'otp'
          ? 'Transfer requires OTP. Complete it in Paystack (Finalize Transfer), then webhook will mark paid.'
          : 'Transfer initiated. Waiting for Paystack webhook for final paid.',
    })
  }

  // Initiate failed — no transfer_code → Paystack did not deduct. Revert to pending.
  console.error('Paystack transfer initiate failed', json)
  await admin
    .from('wallet_withdrawals')
    .update({
      status: 'pending',
      paystack_reference: null,
      note: `Payout initiate failed: ${json.message || 'unknown'}`,
    })
    .eq('id', withdrawal.id)
    .in('status', ['processing', 'pending'])

  return jsonResponse(
    {
      error: json.message || 'Paystack could not initiate this transfer.',
      withdrawal_id: withdrawal.id,
      status: 'pending',
    },
    502,
  )
})
