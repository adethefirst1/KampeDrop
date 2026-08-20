import { getSupabase, isSupabaseConfigured } from './supabase'

const FUNCTIONS_BASE = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  return url?.replace(/\/$/, '') + '/functions/v1'
}

/**
 * Start Paystack checkout for an existing card order (Edge Function).
 * Secret key never touches the browser.
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

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  const res = await fetch(`${FUNCTIONS_BASE()}/paystack-initialize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      order_id: input.orderId,
      email: input.email.trim(),
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
      reason: json?.error || 'Could not start card payment. Try again.',
    }
  }

  return {
    ok: true,
    authorizationUrl: json.authorization_url,
    reference: json.reference ?? '',
  }
}
