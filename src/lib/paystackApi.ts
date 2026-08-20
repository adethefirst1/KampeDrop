import { getSupabase, isSupabaseConfigured } from './supabase'

const FUNCTIONS_BASE = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  return url?.replace(/\/$/, '') + '/functions/v1'
}

function anonHeaders(): HeadersInit {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
  }
}

/**
 * Start Paystack checkout for an existing card or bank-transfer order.
 * Channel is chosen server-side from orders.payment (card | bank_transfer).
 */
export async function initializePaystackPayment(input: {
  orderId: string
  email: string
}): Promise<
  | { ok: true; authorizationUrl: string; reference: string }
  | { ok: false; reason: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Payments are unavailable (Supabase is not configured).' }
  }
  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, reason: 'Payments are unavailable right now.' }
  }

  const res = await fetch(`${FUNCTIONS_BASE()}/paystack-initialize`, {
    method: 'POST',
    headers: anonHeaders(),
    body: JSON.stringify({
      order_id: input.orderId,
      email: input.email.trim(),
      callback_origin: window.location.origin,
    }),
  })

  const json = (await res.json().catch(() => null)) as {
    authorization_url?: string
    reference?: string
    error?: string
  } | null

  if (!res.ok || !json?.authorization_url) {
    return {
      ok: false,
      reason: json?.error || 'Could not start Paystack payment. Try again.',
    }
  }

  return {
    ok: true,
    authorizationUrl: json.authorization_url,
    reference: json.reference ?? '',
  }
}

/**
 * Confirm payment after Paystack redirect (or while Track is polling).
 * Uses Paystack verify API server-side — does not trust the browser alone.
 */
export async function verifyPaystackPayment(input: {
  orderId: string
  reference?: string
}): Promise<
  | { ok: true; paid: boolean; paymentState: string }
  | { ok: false; reason: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Payments are unavailable (Supabase is not configured).' }
  }
  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, reason: 'Payments are unavailable right now.' }
  }

  const res = await fetch(`${FUNCTIONS_BASE()}/paystack-verify`, {
    method: 'POST',
    headers: anonHeaders(),
    body: JSON.stringify({
      order_id: input.orderId,
      reference: input.reference?.trim() || undefined,
    }),
  })

  const json = (await res.json().catch(() => null)) as {
    paid?: boolean
    payment_state?: string
    error?: string
    reason?: string
  } | null

  if (!res.ok && json?.error) {
    return { ok: false, reason: json.error }
  }

  if (!json || typeof json.paid !== 'boolean') {
    return {
      ok: false,
      reason: json?.error || json?.reason || 'Could not verify payment.',
    }
  }

  return {
    ok: true,
    paid: json.paid,
    paymentState: String(json.payment_state ?? ''),
  }
}
