// Shared Paystack helpers for Edge Functions

export const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''
export const PAYSTACK_BASE = 'https://api.paystack.co'

export type PaystackJson = {
  status?: boolean
  message?: string
  data?: Record<string, unknown> | Record<string, unknown>[] | null
}

export async function paystackFetch(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; json: PaystackJson }> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const json = (await res.json().catch(() => null)) as PaystackJson | null
  return {
    ok: res.ok && Boolean(json?.status),
    status: res.status,
    json: json ?? { status: false, message: 'Empty Paystack response' },
  }
}

export async function hmacSha512Hex(secret: string, payload: string): Promise<string> {
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

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}
