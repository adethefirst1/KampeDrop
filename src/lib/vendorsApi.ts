import { getSupabase, isSupabaseConfigured } from './supabase'
import type { Category, MenuItem, VerificationStatus, Vendor } from '../data/vendors'

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

export type VendorLoginResult = {
  id: string
  name: string
  verification_status: string
  active: boolean
  access_token: string
}

/**
 * Live vendor board sign-in via SECURITY DEFINER RPC.
 * Returns access_token (portal credential) — never pin_hash.
 */
export async function vendorLogin(
  phone: string,
  pin: string,
): Promise<{ ok: true; vendor: VendorLoginResult } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: 'Sign-in is unavailable right now (Supabase is not configured).',
    }
  }
  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, reason: 'Sign-in is unavailable right now.' }
  }

  const { data, error } = await supabase.rpc('vendor_login', {
    p_phone: phone,
    p_pin: pin,
  })

  if (error) {
    return { ok: false, reason: error.message }
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object' || !('id' in row) || !row.id) {
    return { ok: false, reason: 'Sign-in succeeded but no vendor was returned.' }
  }

  const r = row as Record<string, unknown>
  const accessToken = r.access_token != null ? String(r.access_token) : ''
  if (!accessToken) {
    return {
      ok: false,
      reason:
        'Sign-in succeeded but no access token was returned. Run the vendor portal migration.',
    }
  }

  return {
    ok: true,
    vendor: {
      id: String(r.id),
      name: String(r.name ?? ''),
      verification_status: String(r.verification_status ?? ''),
      active: Boolean(r.active),
      access_token: accessToken,
    },
  }
}

export type VendorPortalOrder = {
  id: string
  createdAt: string
  customerName: string
  phone: string
  address: string
  note: string
  payment: 'cod' | 'transfer' | 'card'
  fulfillment: 'delivery' | 'pickup'
  status: string
  passkey: string
  escrowState: string
  deliveryFee: number
  subtotal: number
  total: number
  lines: import('../context/CartContext').PlacedOrder['lines']
  vendorId: string
  vendorConfirmed: boolean
  kitchenReady: boolean
  cancelledAt: string | null
  cancelReason: string | null
  placeName: string | null
  placeId: string | null
  placeLat: number | null
  placeLng: number | null
}

function rowToVendorPortalOrder(row: Record<string, unknown>): VendorPortalOrder {
  const fulfillment = row.fulfillment === 'pickup' ? 'pickup' : 'delivery'
  const status = String(row.status ?? '')
  const payment =
    row.payment === 'transfer' ? 'transfer' : row.payment === 'card' ? 'card' : 'cod'
  return {
    id: String(row.id),
    createdAt: String(row.created_at ?? ''),
    customerName: String(row.customer_name ?? ''),
    phone: String(row.phone ?? ''),
    address: String(row.address ?? ''),
    note: String(row.note ?? ''),
    payment,
    fulfillment,
    status,
    passkey: String(row.passkey ?? ''),
    escrowState: String(row.escrow_state ?? ''),
    deliveryFee: Number(row.delivery_fee ?? 0),
    subtotal: Number(row.subtotal ?? 0),
    total: Number(row.total ?? 0),
    lines: Array.isArray(row.lines) ? (row.lines as VendorPortalOrder['lines']) : [],
    vendorId: row.vendor_id != null ? String(row.vendor_id) : '',
    vendorConfirmed: Boolean(row.vendor_confirmed),
    kitchenReady: status === 'ready_for_pickup',
    cancelledAt: row.cancelled_at != null ? String(row.cancelled_at) : null,
    cancelReason: row.cancel_reason != null ? String(row.cancel_reason) : null,
    placeName: row.place_name != null ? String(row.place_name) : null,
    placeId: row.place_id != null ? String(row.place_id) : null,
    placeLat: typeof row.place_lat === 'number' ? row.place_lat : null,
    placeLng: typeof row.place_lng === 'number' ? row.place_lng : null,
  }
}

/** Vendor portal: open orders for this access_token. */
export async function getVendorOrders(
  accessToken: string,
): Promise<{ ok: true; orders: VendorPortalOrder[] } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('get_vendor_orders', {
    p_token: accessToken,
  })

  if (error) return { ok: false, reason: error.message }

  const rows = Array.isArray(data) ? data : data ? [data] : []
  return {
    ok: true,
    orders: rows.map((r) => rowToVendorPortalOrder(r as Record<string, unknown>)),
  }
}

/** Vendor portal: delivered + cancelled orders (newest first). */
export async function getVendorOrderHistory(
  accessToken: string,
): Promise<{ ok: true; orders: VendorPortalOrder[] } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('get_vendor_order_history', {
    p_token: accessToken,
  })

  if (error) return { ok: false, reason: error.message }

  const rows = Array.isArray(data) ? data : data ? [data] : []
  return {
    ok: true,
    orders: rows.map((r) => rowToVendorPortalOrder(r as Record<string, unknown>)),
  }
}

/** Vendor portal: preparing | ready_for_pickup only. */
export async function updateOrderStatusByVendor(
  accessToken: string,
  orderId: string,
  newStatus: 'preparing' | 'ready_for_pickup',
): Promise<{ ok: true; order: VendorPortalOrder } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('update_order_status_by_vendor', {
    p_token: accessToken,
    p_id: orderId,
    p_new_status: newStatus,
  })

  if (error) return { ok: false, reason: error.message }

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') {
    return { ok: false, reason: 'Status update returned no order.' }
  }
  return { ok: true, order: rowToVendorPortalOrder(row as Record<string, unknown>) }
}

/**
 * Vendor portal handoff: passkey → validate_passkey_and_release_by_vendor
 * (delegates to the sole escrow-release path).
 */
export async function validatePasskeyAndReleaseByVendor(
  accessToken: string,
  orderId: string,
  passkey: string,
): Promise<{ ok: true; order: VendorPortalOrder } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('validate_passkey_and_release_by_vendor', {
    p_token: accessToken,
    p_id: orderId,
    p_passkey: passkey.trim(),
  })

  if (error) return { ok: false, reason: error.message }

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') {
    return { ok: false, reason: 'Passkey confirmation returned no order.' }
  }
  return { ok: true, order: rowToVendorPortalOrder(row as Record<string, unknown>) }
}

// -----------------------------------------------------------------------------
// Menu items (cloud)
// -----------------------------------------------------------------------------

export type MenuItemRow = {
  id: string
  vendor_id: string
  name: string
  price: number
  description: string | null
  available: boolean
  created_at: string
}

export function menuItemRowToMenuItem(row: MenuItemRow): MenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description?.trim() || '',
    price: Number(row.price),
    available: row.available !== false,
  }
}

function asMenuItemRow(row: Record<string, unknown>): MenuItemRow {
  return {
    id: String(row.id),
    vendor_id: String(row.vendor_id),
    name: String(row.name ?? ''),
    price: Number(row.price ?? 0),
    description: row.description != null ? String(row.description) : null,
    available: row.available !== false,
    created_at: String(row.created_at ?? ''),
  }
}

/**
 * Buyer browse: available items for live (approved+active) vendors.
 * RLS enforces visibility — no token needed.
 */
export async function fetchLiveMenuItemsByVendorIds(
  vendorIds: string[],
): Promise<{ ok: true; byVendorId: Record<string, MenuItem[]> } | { ok: false; reason: string }> {
  if (!vendorIds.length) return { ok: true, byVendorId: {} }
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase
    .from('menu_items')
    .select('id, vendor_id, name, price, description, available, created_at')
    .in('vendor_id', vendorIds)
    .order('created_at', { ascending: true })

  if (error) return { ok: false, reason: error.message }

  const byVendorId: Record<string, MenuItem[]> = {}
  for (const id of vendorIds) byVendorId[id] = []
  for (const raw of data ?? []) {
    const row = asMenuItemRow(raw as Record<string, unknown>)
    const list = byVendorId[row.vendor_id] ?? (byVendorId[row.vendor_id] = [])
    list.push(menuItemRowToMenuItem(row))
  }
  return { ok: true, byVendorId }
}

/** Vendor portal: all items including unavailable. */
export async function getVendorMenuItems(
  accessToken: string,
): Promise<{ ok: true; items: MenuItem[] } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('get_vendor_menu_items', {
    p_token: accessToken,
  })

  if (error) return { ok: false, reason: error.message }

  const rows = Array.isArray(data) ? data : data ? [data] : []
  return {
    ok: true,
    items: rows.map((r) => menuItemRowToMenuItem(asMenuItemRow(r as Record<string, unknown>))),
  }
}

export async function addMenuItem(
  accessToken: string,
  input: { name: string; price: number; description?: string },
): Promise<{ ok: true; item: MenuItem } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('add_menu_item', {
    p_token: accessToken,
    p_name: input.name,
    p_price: Math.round(input.price),
    p_description: input.description?.trim() || null,
  })

  if (error) return { ok: false, reason: error.message }

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') {
    return { ok: false, reason: 'Add item returned no row.' }
  }
  return { ok: true, item: menuItemRowToMenuItem(asMenuItemRow(row as Record<string, unknown>)) }
}

export async function updateMenuItem(
  accessToken: string,
  itemId: string,
  input: {
    name: string
    price: number
    description?: string
    available: boolean
  },
): Promise<{ ok: true; item: MenuItem } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('update_menu_item', {
    p_token: accessToken,
    p_item_id: itemId,
    p_name: input.name,
    p_price: Math.round(input.price),
    p_description: input.description?.trim() || null,
    p_available: input.available,
  })

  if (error) return { ok: false, reason: error.message }

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') {
    return { ok: false, reason: 'Update item returned no row.' }
  }
  return { ok: true, item: menuItemRowToMenuItem(asMenuItemRow(row as Record<string, unknown>)) }
}

export async function deleteMenuItem(
  accessToken: string,
  itemId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { error } = await supabase.rpc('delete_menu_item', {
    p_token: accessToken,
    p_item_id: itemId,
  })

  if (error) return { ok: false, reason: error.message }
  return { ok: true }
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

/**
 * Ops: set verification_status (+ active when approved).
 * Uses authenticated session — RLS ops_update_vendors / is_ops().
 */
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
      // Buyer visibility requires approved AND active
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
 * Map a cloud vendors row (+ optional photo URLs + menu items) into the app Vendor shape.
 */
export function vendorRowToVendor(
  row: VendorRow,
  photos: string[] = [],
  items: MenuItem[] = [],
): Vendor {
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
    items,
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
