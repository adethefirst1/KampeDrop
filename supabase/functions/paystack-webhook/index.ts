/**
 * Paystack webhook — charge (orders) + transfer (vendor withdrawals).
 *
 * Transfer events (after paystack-payout):
 *   transfer.success  → RPC finalize_withdrawal_paid
 *   transfer.failed   → RPC fail_withdrawal_payout (restore balance)
 *   transfer.reversed → same as failed
 *
 * Charge events unchanged (card / VA for orders).
 *
 * Depends on RPCs (next piece):
 *   finalize_withdrawal_paid(p_withdrawal_id, p_paystack_status)
 *   fail_withdrawal_payout(p_withdrawal_id, p_note, p_paystack_status)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse, textResponse } from '../_shared/cors.ts'
import {
  PAYSTACK_SECRET,
  hmacSha512Hex,
  timingSafeEqual,
} from '../_shared/paystack.ts'

function isPaidState(state: string | null | undefined): boolean {
  return (
    state === 'card_paid' ||
    state === 'transfer_confirmed' ||
    state === 'released'
  )
}

type TransferData = {
  reference?: string
  transfer_code?: string
  status?: string
  amount?: number
  currency?: string
  reason?: string
}

type ChargeData = {
  reference?: string
  status?: string
  amount?: number
  currency?: string
  channel?: string
  metadata?: { order_id?: string; payment_method?: string }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return textResponse('Method not allowed', 405)
  }

  if (!PAYSTACK_SECRET) {
    console.error('PAYSTACK_SECRET_KEY is not set')
    return textResponse('Misconfigured', 500)
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature') ?? ''
  const expected = await hmacSha512Hex(PAYSTACK_SECRET, rawBody)

  if (!signature || !timingSafeEqual(signature, expected)) {
    console.error('Invalid Paystack signature')
    return textResponse('Invalid signature', 401)
  }

  let event: { event?: string; data?: ChargeData & TransferData }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return textResponse('Invalid JSON', 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return textResponse('Misconfigured', 500)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const eventName = event.event ?? ''
  const data = event.data

  // ---------------------------------------------------------------------------
  // Transfer lifecycle (vendor withdrawals)
  // ---------------------------------------------------------------------------
  if (
    eventName === 'transfer.success' ||
    eventName === 'transfer.failed' ||
    eventName === 'transfer.reversed'
  ) {
    const transferCode = data?.transfer_code?.trim()
    const reference = data?.reference?.trim()
    const paystackStatus = (data?.status ?? eventName.replace('transfer.', '')).trim()

    if (!transferCode && !reference) {
      return jsonResponse({ received: true, ignored: 'missing transfer ids' })
    }

    let q = admin
      .from('wallet_withdrawals')
      .select('id, amount, status, paystack_transfer_code, paystack_reference')

    if (transferCode) {
      q = q.eq('paystack_transfer_code', transferCode)
    } else {
      q = q.eq('paystack_reference', reference!)
    }

    const { data: withdrawal, error: loadErr } = await q.maybeSingle()
    if (loadErr) {
      console.error('webhook load withdrawal', loadErr)
      return textResponse('DB error', 500)
    }
    if (!withdrawal) {
      console.error('webhook: withdrawal not found', { transferCode, reference })
      return jsonResponse({ received: true, ignored: 'withdrawal not found' })
    }

    // Optional amount check (Paystack sends kobo)
    if (typeof data?.amount === 'number') {
      const expectedKobo = Math.round(Number(withdrawal.amount) * 100)
      if (data.amount !== expectedKobo) {
        console.error('Transfer amount mismatch', {
          withdrawal: withdrawal.id,
          expectedKobo,
          got: data.amount,
        })
        // Still process — log loudly; do not ignore (ops needs the status)
      }
    }

    if (eventName === 'transfer.success') {
      if (withdrawal.status === 'paid') {
        return jsonResponse({ received: true, already: 'paid', id: withdrawal.id })
      }

      const { error: rpcErr } = await admin.rpc('finalize_withdrawal_paid', {
        p_withdrawal_id: withdrawal.id,
        p_paystack_status: paystackStatus || 'success',
      })

      if (rpcErr) {
        console.error('finalize_withdrawal_paid', rpcErr)
        return textResponse('Finalize failed', 500)
      }

      return jsonResponse({
        received: true,
        withdrawal_id: withdrawal.id,
        status: 'paid',
      })
    }

    // failed | reversed → restore balance if we had debited
    if (withdrawal.status === 'failed') {
      return jsonResponse({ received: true, already: 'failed', id: withdrawal.id })
    }
    if (withdrawal.status === 'paid') {
      // Rare: success then reverse — still run fail path (idempotent restore)
      console.warn('transfer reverse/fail after paid', withdrawal.id, eventName)
    }

    const note =
      eventName === 'transfer.reversed'
        ? 'Paystack reversed this transfer — balance restored.'
        : 'Paystack reported transfer failed — balance restored.'

    const { error: failErr } = await admin.rpc('fail_withdrawal_payout', {
      p_withdrawal_id: withdrawal.id,
      p_note: note,
      p_paystack_status: paystackStatus || eventName.replace('transfer.', ''),
    })

    if (failErr) {
      console.error('fail_withdrawal_payout', failErr)
      return textResponse('Fail/restore failed', 500)
    }

    return jsonResponse({
      received: true,
      withdrawal_id: withdrawal.id,
      status: 'failed',
      event: eventName,
    })
  }

  // ---------------------------------------------------------------------------
  // Charge lifecycle (orders) — unchanged
  // ---------------------------------------------------------------------------
  const reference = data?.reference?.trim()
  const orderIdFromMeta = data?.metadata?.order_id?.trim()

  let orderId = orderIdFromMeta
  if (!orderId && reference) {
    const maybe = reference.includes('-')
      ? reference.replace(/-[a-z0-9]+$/i, '')
      : reference
    orderId = maybe.startsWith('SD-') ? maybe : undefined
  }

  if (eventName === 'charge.success') {
    if (!reference) {
      return jsonResponse({ received: true, ignored: 'missing reference' })
    }

    let orderQuery = admin
      .from('orders')
      .select('id, total, payment, payment_state, paystack_reference')

    if (orderId) {
      orderQuery = orderQuery.eq('id', orderId)
    } else {
      orderQuery = orderQuery.eq('paystack_reference', reference)
    }

    const { data: order, error } = await orderQuery.maybeSingle()
    if (error) {
      console.error('webhook load order', error)
      return textResponse('DB error', 500)
    }
    if (!order) {
      console.error('webhook: order not found', { orderId, reference })
      return jsonResponse({ received: true, ignored: 'order not found' })
    }

    if (order.payment !== 'card' && order.payment !== 'transfer') {
      return jsonResponse({ received: true, ignored: 'not a paystack order' })
    }

    if (isPaidState(order.payment_state)) {
      return jsonResponse({ received: true, already: 'paid' })
    }

    const expectedKobo = Math.round(Number(order.total) * 100)
    if (typeof data?.amount === 'number' && data.amount !== expectedKobo) {
      console.error('Amount mismatch', {
        order: order.id,
        expectedKobo,
        got: data.amount,
      })
      return jsonResponse({ received: true, ignored: 'amount mismatch' }, 200)
    }

    const nextState =
      order.payment === 'transfer' ? 'transfer_confirmed' : 'card_paid'

    const { error: updateError } = await admin
      .from('orders')
      .update({
        payment_state: nextState,
        paystack_reference: reference,
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('webhook update', updateError)
      return textResponse('Update failed', 500)
    }

    return jsonResponse({
      received: true,
      order_id: order.id,
      payment_state: nextState,
      channel: data?.channel ?? null,
    })
  }

  if (eventName === 'charge.failed') {
    if (!reference && !orderId) {
      return jsonResponse({ received: true, ignored: 'missing ids' })
    }

    let failQuery = admin.from('orders').select('id, payment, payment_state')
    if (orderId) failQuery = failQuery.eq('id', orderId)
    else failQuery = failQuery.eq('paystack_reference', reference!)

    const { data: order, error } = await failQuery.maybeSingle()
    if (error || !order) {
      return jsonResponse({ received: true, ignored: 'order not found' })
    }
    if (order.payment !== 'card' && order.payment !== 'transfer') {
      return jsonResponse({ received: true, ignored: 'not a paystack order' })
    }
    if (isPaidState(order.payment_state)) {
      return jsonResponse({ received: true, already: 'paid' })
    }

    if (order.payment === 'card') {
      await admin
        .from('orders')
        .update({ payment_state: 'card_failed' })
        .eq('id', order.id)
      return jsonResponse({
        received: true,
        order_id: order.id,
        payment_state: 'card_failed',
      })
    }

    await admin
      .from('orders')
      .update({ payment_state: 'transfer_pending' })
      .eq('id', order.id)

    return jsonResponse({
      received: true,
      order_id: order.id,
      payment_state: 'transfer_pending',
    })
  }

  return jsonResponse({ received: true, ignored: eventName || 'unknown event' })
})
