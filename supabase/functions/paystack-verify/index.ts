import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''

type VerifyBody = {
  order_id?: string
  reference?: string
}

function isPaidState(state: string | null | undefined): boolean {
  return (
    state === 'card_paid' ||
    state === 'transfer_confirmed' ||
    state === 'released'
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!PAYSTACK_SECRET) {
    return jsonResponse({ error: 'Payment is not configured.' }, 500)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Server misconfigured.' }, 500)
  }

  let body: VerifyBody
  try {
    body = (await req.json()) as VerifyBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400)
  }

  const orderId = body.order_id?.trim()
  if (!orderId) {
    return jsonResponse({ error: 'order_id is required.' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: order, error: loadError } = await admin
    .from('orders')
    .select('id, total, payment, payment_state, paystack_reference')
    .eq('id', orderId)
    .maybeSingle()

  if (loadError) {
    console.error('verify load order', loadError)
    return jsonResponse({ error: 'Could not load order.' }, 500)
  }
  if (!order) {
    return jsonResponse({ error: 'Order not found.' }, 404)
  }
  if (order.payment !== 'card' && order.payment !== 'transfer') {
    return jsonResponse({ error: 'This order is not a Paystack payment.' }, 400)
  }

  if (isPaidState(order.payment_state)) {
    return jsonResponse({
      paid: true,
      payment_state: order.payment_state,
      order_id: order.id,
    })
  }

  const reference =
    body.reference?.trim() ||
    (order.paystack_reference as string | null)?.trim() ||
    ''

  if (!reference) {
    return jsonResponse({
      paid: false,
      payment_state: order.payment_state,
      order_id: order.id,
      reason: 'No Paystack reference yet.',
    })
  }

  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    },
  )
  const verifyJson = await verifyRes.json().catch(() => null)

  if (!verifyRes.ok || !verifyJson?.status) {
    console.error('Paystack verify failed', verifyRes.status, verifyJson)
    return jsonResponse({
      paid: false,
      payment_state: order.payment_state,
      order_id: order.id,
      reason: verifyJson?.message || 'Could not verify payment yet.',
    })
  }

  const data = verifyJson.data as {
    status?: string
    amount?: number
    reference?: string
  }

  if (data?.status !== 'success') {
    return jsonResponse({
      paid: false,
      payment_state: order.payment_state,
      order_id: order.id,
      paystack_status: data?.status ?? null,
    })
  }

  const expectedKobo = Math.round(Number(order.total) * 100)
  const paidKobo =
    typeof data.amount === 'number' ? Math.round(data.amount) : null
  if (paidKobo != null && paidKobo !== expectedKobo) {
    console.error('verify amount mismatch', {
      order: order.id,
      expectedKobo,
      got: paidKobo,
    })
    return jsonResponse({
      paid: false,
      payment_state: order.payment_state,
      order_id: order.id,
      reason: 'Amount mismatch.',
    }, 400)
  }

  const nextState =
    order.payment === 'transfer' ? 'transfer_confirmed' : 'card_paid'

  const { error: updateError } = await admin
    .from('orders')
    .update({
      payment_state: nextState,
      paystack_reference: data.reference ?? reference,
    })
    .eq('id', order.id)

  if (updateError) {
    console.error('verify update', updateError)
    return jsonResponse({ error: 'Could not update order.' }, 500)
  }

  return jsonResponse({
    paid: true,
    payment_state: nextState,
    order_id: order.id,
  })
})
