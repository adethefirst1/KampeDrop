import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'https://sure-drop.vercel.app'
const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''

type InitBody = {
  order_id?: string
  email?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!PAYSTACK_SECRET) {
    console.error('PAYSTACK_SECRET_KEY is not set')
    return jsonResponse({ error: 'Payment is not configured.' }, 500)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Server misconfigured.' }, 500)
  }

  let body: InitBody
  try {
    body = (await req.json()) as InitBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400)
  }

  const orderId = body.order_id?.trim()
  const email = body.email?.trim().toLowerCase()
  if (!orderId) {
    return jsonResponse({ error: 'order_id is required.' }, 400)
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'A valid email is required for Paystack payment.' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: order, error: loadError } = await admin
    .from('orders')
    .select('id, total, payment, payment_state, customer_name, phone, status')
    .eq('id', orderId)
    .maybeSingle()

  if (loadError) {
    console.error('load order', loadError)
    return jsonResponse({ error: 'Could not load order.' }, 500)
  }
  if (!order) {
    return jsonResponse({ error: 'Order not found.' }, 404)
  }
  if (order.payment !== 'card' && order.payment !== 'transfer') {
    return jsonResponse({ error: 'This order is not a Paystack payment.' }, 400)
  }
  if (order.status === 'cancelled') {
    return jsonResponse({ error: 'Order is cancelled.' }, 400)
  }

  const alreadyPaid =
    order.payment_state === 'card_paid' ||
    order.payment_state === 'transfer_confirmed' ||
    order.payment_state === 'released'
  if (alreadyPaid) {
    return jsonResponse({ error: 'This order is already paid.' }, 400)
  }

  const canStartCard =
    order.payment === 'card' &&
    (order.payment_state === 'card_pending' || order.payment_state === 'card_failed')
  const canStartTransfer =
    order.payment === 'transfer' &&
    (order.payment_state === 'transfer_pending' ||
      order.payment_state === 'transfer_seen' ||
      order.payment_state === 'held')

  if (!canStartCard && !canStartTransfer) {
    return jsonResponse(
      { error: `Cannot start Paystack payment from state "${order.payment_state}".` },
      400,
    )
  }

  const amountKobo = Math.round(Number(order.total) * 100)
  if (!Number.isFinite(amountKobo) || amountKobo < 100) {
    return jsonResponse({ error: 'Order total is too small for Paystack payment.' }, 400)
  }

  // card → card only; transfer → bank_transfer only (Paystack virtual account)
  const channels = order.payment === 'transfer' ? ['bank_transfer'] : ['card']

  // Unique reference per attempt so failed retries can re-initialize
  const reference = `${order.id}-${Date.now().toString(36)}`

  const callbackUrl = `${APP_ORIGIN}/app/orders/${encodeURIComponent(order.id)}`

  const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amountKobo,
      currency: 'NGN',
      reference,
      callback_url: callbackUrl,
      channels,
      metadata: {
        order_id: order.id,
        payment_method: order.payment,
        customer_name: order.customer_name,
        phone: order.phone,
        custom_fields: [
          { display_name: 'Order', variable_name: 'order_id', value: order.id },
        ],
      },
    }),
  })

  const paystackJson = await paystackRes.json().catch(() => null)
  if (!paystackRes.ok || !paystackJson?.status) {
    console.error('Paystack initialize failed', paystackRes.status, paystackJson)
    return jsonResponse(
      {
        error:
          paystackJson?.message ||
          'Paystack could not start this payment. Try again.',
      },
      502,
    )
  }

  const authorizationUrl = paystackJson.data?.authorization_url as string | undefined
  const accessCode = paystackJson.data?.access_code as string | undefined
  if (!authorizationUrl) {
    return jsonResponse({ error: 'Paystack did not return a checkout URL.' }, 502)
  }

  const pendingState = order.payment === 'transfer' ? 'transfer_pending' : 'card_pending'

  const { error: patchError } = await admin
    .from('orders')
    .update({
      payment_state: pendingState,
      paystack_reference: reference,
      paystack_access_code: accessCode ?? null,
    })
    .eq('id', order.id)

  if (patchError) {
    console.error('patch order', patchError)
    // Still return URL — payment can complete; webhook uses metadata.order_id
  }

  return jsonResponse({
    authorization_url: authorizationUrl,
    access_code: accessCode ?? null,
    reference,
    order_id: order.id,
    channels,
  })
})
