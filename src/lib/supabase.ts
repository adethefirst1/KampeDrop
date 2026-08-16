import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let client: SupabaseClient | null | undefined

/** True when both Vite env vars are set. */
export function isSupabaseConfigured() {
  return Boolean(url?.trim() && anonKey?.trim())
}

/**
 * Shared browser Supabase client (publishable/anon key).
 * Singleton so Auth session persists across the app.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (client === undefined) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
