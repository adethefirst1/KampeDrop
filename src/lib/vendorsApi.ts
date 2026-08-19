import { getSupabase, isSupabaseConfigured } from './supabase'

export type SubmitVendorApplicationInput = {
  name: string
  category: string
  area: string
  phone: string
  hours: string
  about: string
  pin: string
  lat?: number | null
  lng?: number | null
}

/** Convert a canvas data-URL to a Blob for Storage upload. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',')
  if (!b64) throw new Error('Invalid image data.')
  const mime = /data:(.*?);/.exec(header)?.[1] ?? 'image/jpeg'
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * Live vendor signup via SECURITY DEFINER RPC.
 * Returns the new vendor uuid (use for applications/{id}/ photo uploads).
 */
export async function submitVendorApplication(
  input: SubmitVendorApplicationInput,
): Promise<{ ok: true; vendorId: string } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: 'Signup is unavailable right now (Supabase is not configured).',
    }
  }
  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, reason: 'Signup is unavailable right now.' }
  }

  const { data, error } = await supabase.rpc('submit_vendor_application', {
    p_name: input.name,
    p_category: input.category,
    p_area: input.area,
    p_phone: input.phone,
    p_hours: input.hours,
    p_about: input.about,
    p_pin: input.pin,
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
  })

  if (error) {
    return { ok: false, reason: error.message }
  }

  const vendorId = typeof data === 'string' ? data : data != null ? String(data) : ''
  if (!vendorId) {
    return { ok: false, reason: 'Signup succeeded but no application id was returned.' }
  }

  return { ok: true, vendorId }
}

/**
 * Upload onboarding photos to public bucket vendor-photos under
 * applications/{vendorId}/ — allowed by anon INSERT path policy.
 */
export async function uploadVendorApplicationPhotos(
  vendorId: string,
  photoDataUrls: string[],
): Promise<{ ok: true; paths: string[] } | { ok: false; reason: string; paths: string[] }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Photo upload unavailable (Supabase is not configured).', paths: [] }
  }
  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, reason: 'Photo upload unavailable.', paths: [] }
  }

  const paths: string[] = []
  for (let i = 0; i < photoDataUrls.length; i++) {
    const path = `applications/${vendorId}/${i}.jpg`
    try {
      const blob = dataUrlToBlob(photoDataUrls[i]!)
      const { error } = await supabase.storage.from('vendor-photos').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      })
      if (error) {
        return {
          ok: false,
          reason: error.message,
          paths,
        }
      }
      paths.push(path)
    } catch (e) {
      return {
        ok: false,
        reason: e instanceof Error ? e.message : 'Could not upload a photo.',
        paths,
      }
    }
  }

  return { ok: true, paths }
}
