import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, jsonResponse, textResponse } from '../_shared/cors.ts'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''

async function hmacSha512Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
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

  let event: {
    event?: string
    data?: {
      reference?: string
      status?: string
      amount?: number
      currency?: string
      metadata?: { order_id?: string }
    }
  }
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
  const reference = data?.reference?.trim()
  const orderIdFromMeta = data?.metadata?.order_id?.trim()

  // Resolve order: prefer metadata.order_id, else strip retry suffix from reference
  let orderId = orderIdFromMeta
  if (!orderId && reference) {
    // references look like `${orderId}-${timestamp36}` or plain order id
    const maybe = reference.includes('-')
      ? reference.replace(/-[a-z0-9]+$/i, '')
      : reference
    // Order ids are SD-… — if strip broke it, fall back to looking up by paystack_reference
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
      // 200 so Paystack does not retry forever for unknown refs
      return jsonResponse({ received: true, ignored: 'order not found' })
    }

    if (order.payment !== 'card') {
      return jsonResponse({ received: true, ignored: 'not a card order' })
    }

    // Idempotent success
    if (order.payment_state === 'card_paid' || order.payment_state === 'released') {
      return jsonResponse({ received: true, already: 'paid' })
    }

    // Amount check (Paystack sends kobo)
    const expectedKobo = Math.round(Number(order.total) * 100)
    if (typeof data?.amount === 'number' && data.amount !== expectedKobo) {
      console.error('Amount mismatch', {
        order: order.id,
        expectedKobo,
        got: data.amount,
      })
      return jsonResponse({ received: true, ignored: 'amount mismatch' }, 200)
    }

    const { error: updateError } = await admin
      .from('orders')
      .update({
        payment_state: 'card_paid',
        paystack_reference: reference,
        // escrow stays held until passkey release (same as transfer)
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('webhook update', updateError)
      return textResponse('Update failed', 500)
    }

    return jsonResponse({ received: true, order_id: order.id, payment_state: 'card_paid' })
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
    if (order.payment !== 'card') {
      return jsonResponse({ received: true, ignored: 'not a card order' })
    }
    if (order.payment_state === 'card_paid' || order.payment_state === 'released') {
      return jsonResponse({ received: true, already: 'paid' })
    }

    await admin
      .from('orders')
      .update({ payment_state: 'card_failed' })
      .eq('id', order.id)

    return jsonResponse({ received: true, order_id: order.id, payment_state: 'card_failed' })
  }

  return jsonResponse({ received: true, ignored: eventName || 'unknown event' })
})
