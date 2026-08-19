import { getSupabase, isSupabaseConfigured } from './supabase'
import type { Category, VerificationStatus, Vendor } from '../data/vendors'

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

/** Row shape in public.vendors (snake_case). */
export type VendorRow = {
  id: string
  name: string
  category: string
  area: string
  phone: string
  hours: string | null
  about: string | null
  lat: number | null
  lng: number | null
  verification_status: string
  review_note: string | null
  active: boolean
  submitted_at: string
  created_at: string
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

/** Ops: list all vendors (RLS: is_ops). */
export async function fetchOpsVendors(): Promise<
  { ok: true; vendors: VendorRow[] } | { ok: false; reason: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase
    .from('vendors')
    .select(
      'id, name, category, area, phone, hours, about, lat, lng, verification_status, review_note, active, submitted_at, created_at',
    )
    .order('submitted_at', { ascending: false })

  if (error) return { ok: false, reason: error.message }
  return { ok: true, vendors: (data ?? []) as VendorRow[] }
}

/** Ops: set verification_status (+ active when approved). */
export async function updateVendorVerification(
  id: string,
  status: Extract<VerificationStatus, 'approved' | 'needs_info' | 'rejected'>,
  reviewNote: string | null = null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { error } = await supabase
    .from('vendors')
    .update({
      verification_status: status,
      review_note: reviewNote,
      active: status === 'approved',
    })
    .eq('id', id)

  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

/** Buyer-visible vendors (RLS: approved + active). */
export async function fetchLiveVendors(): Promise<
  { ok: true; vendors: VendorRow[] } | { ok: false; reason: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase
    .from('vendors')
    .select(
      'id, name, category, area, phone, hours, about, lat, lng, verification_status, review_note, active, submitted_at, created_at',
    )
    .eq('verification_status', 'approved')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) return { ok: false, reason: error.message }
  return { ok: true, vendors: (data ?? []) as VendorRow[] }
}

/**
 * Map a cloud vendors row (+ optional photo URLs) into the app Vendor shape.
 * Menu items are empty until cloud menu sync exists.
 */
export function vendorRowToVendor(row: VendorRow, photos: string[] = []): Vendor {
  const category = (
    row.category === 'mart' || row.category === 'pharmacy' ? row.category : 'food'
  ) as Category
  const about = row.about?.trim() || ''
  const pickupFromAbout = about.match(/Pickup \/ landmark:\s*(.+)/i)?.[1]?.trim()
  return {
    id: row.id,
    name: row.name,
    category,
    area: row.area,
    pickupSpot: pickupFromAbout || `${row.area} — ${row.name}`,
    tagline: about.split('\n')[0]?.slice(0, 140) || 'Verified on KampeDrop.',
    about: about || 'Verified partner on KampeDrop.',
    etaMins: 35,
    rating: 5,
    orders: 'New',
    accent: '#0c6560',
    vettedNote: 'Verified by KampeDrop for Badagry fulfilment.',
    phone: row.phone,
    hours: row.hours?.trim() || 'Hours on request',
    lat: row.lat,
    lng: row.lng,
    photos,
    acceptingOrders: true,
    active: row.active,
    verificationStatus:
      (row.verification_status as VerificationStatus) || 'approved',
    submittedAt: row.submitted_at,
    reviewNote: row.review_note,
    accessPin: '',
    items: [],
  }
}

/** Public URLs for applications/{vendorId}/* photos. */
export async function listVendorApplicationPhotoUrls(
  vendorId: string,
): Promise<string[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const folder = `applications/${vendorId}`
  const { data, error } = await supabase.storage.from('vendor-photos').list(folder)
  if (error || !data?.length) return []

  return data
    .filter((f) => f.name && !f.name.endsWith('/'))
    .map(
      (f) =>
        supabase.storage.from('vendor-photos').getPublicUrl(`${folder}/${f.name}`).data
          .publicUrl,
    )
}
