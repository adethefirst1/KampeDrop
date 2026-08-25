import { getSupabase, isSupabaseConfigured } from './supabase'
import type { Category, MenuItem, VerificationStatus, Vendor } from '../data/vendors'
import { migrateStatus } from '../data/ops'
import type { OrderStatus } from '../context/CartContext'

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
  status: OrderStatus
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
  const status = migrateStatus(String(row.status ?? ''))
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
    row.category === 'mart' ||
    row.category === 'pharmacy' ||
    row.category === 'store'
      ? row.category
      : 'food'
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

/* ─── Vendor wallet ─────────────────────────────────────────────────────── */

export type WalletTransaction = {
  id: string
  orderId: string | null
  withdrawalId: string | null
  amount: number
  type: 'order_credit' | 'withdrawal_paid' | string
  note: string | null
  createdAt: string
}

export type WalletWithdrawal = {
  id: string
  amount: number
  status: 'pending' | 'paid' | 'rejected' | string
  note: string | null
  requestedAt: string
  resolvedAt: string | null
}

export type VendorBankDetails = {
  bankName: string | null
  bankCode: string | null
  accountNumber: string | null
  accountName: string | null
  hasRecipient: boolean
}

export type PaystackBankOption = {
  name: string
  code: string
}

/**
 * Paystack synthetic test bank (not returned by List Banks).
 * Injected only when `import.meta.env.DEV` — never in production Vite builds
 * (Vercel live / any `vite build`), so real vendors never see it.
 */
export const PAYSTACK_DEV_TEST_BANK: PaystackBankOption = {
  name: 'Test Bank (001) — test only',
  code: '001',
}

function withDevTestBank(banks: PaystackBankOption[]): PaystackBankOption[] {
  if (!import.meta.env.DEV) return banks
  if (banks.some((b) => b.code === PAYSTACK_DEV_TEST_BANK.code)) return banks
  return [PAYSTACK_DEV_TEST_BANK, ...banks]
}

export type VendorWalletSnapshot = {
  vendorId: string
  walletBalance: number
  pendingWithdrawalTotal: number
  availableToWithdraw: number
  bank: VendorBankDetails
  transactions: WalletTransaction[]
  withdrawals: WalletWithdrawal[]
}

export type OpsWithdrawalRequest = {
  id: string
  vendorId: string
  vendorName: string
  amount: number
  status: string
  note: string | null
  requestedAt: string
  resolvedAt: string | null
}

function mapOpsWithdrawalRow(row: Record<string, unknown>): OpsWithdrawalRequest {
  const vendorJoin = row.vendors as { name?: string } | { name?: string }[] | null
  const vendorName = Array.isArray(vendorJoin)
    ? String(vendorJoin[0]?.name ?? 'Vendor')
    : String(vendorJoin?.name ?? 'Vendor')
  return {
    id: String(row.id ?? ''),
    vendorId: String(row.vendor_id ?? ''),
    vendorName,
    amount: Number(row.amount ?? 0),
    status: String(row.status ?? 'pending'),
    note: row.note != null ? String(row.note) : null,
    requestedAt: String(row.requested_at ?? ''),
    resolvedAt: row.resolved_at != null ? String(row.resolved_at) : null,
  }
}

function parseBankDetails(raw: unknown): VendorBankDetails {
  const bank =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    bankName: bank.bank_name != null ? String(bank.bank_name) : null,
    bankCode: bank.bank_code != null ? String(bank.bank_code) : null,
    accountNumber:
      bank.account_number != null ? String(bank.account_number) : null,
    accountName: bank.account_name != null ? String(bank.account_name) : null,
    hasRecipient: Boolean(bank.has_recipient),
  }
}

function parseWalletSnapshot(raw: Record<string, unknown>): VendorWalletSnapshot {
  const txs = Array.isArray(raw.transactions) ? raw.transactions : []
  const withdrawals = Array.isArray(raw.withdrawals) ? raw.withdrawals : []
  return {
    vendorId: String(raw.vendor_id ?? ''),
    walletBalance: Number(raw.wallet_balance ?? 0),
    pendingWithdrawalTotal: Number(raw.pending_withdrawal_total ?? 0),
    availableToWithdraw: Number(raw.available_to_withdraw ?? 0),
    bank: parseBankDetails(raw.bank),
    transactions: txs.map((t) => {
      const row = t as Record<string, unknown>
      return {
        id: String(row.id ?? ''),
        orderId: row.order_id != null ? String(row.order_id) : null,
        withdrawalId: row.withdrawal_id != null ? String(row.withdrawal_id) : null,
        amount: Number(row.amount ?? 0),
        type: String(row.type ?? ''),
        note: row.note != null ? String(row.note) : null,
        createdAt: String(row.created_at ?? ''),
      }
    }),
    withdrawals: withdrawals.map((w) => {
      const row = w as Record<string, unknown>
      return {
        id: String(row.id ?? ''),
        amount: Number(row.amount ?? 0),
        status: String(row.status ?? ''),
        note: row.note != null ? String(row.note) : null,
        requestedAt: String(row.requested_at ?? ''),
        resolvedAt: row.resolved_at != null ? String(row.resolved_at) : null,
      }
    }),
  }
}

function vendorFunctionsBase(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  return url?.replace(/\/$/, '') + '/functions/v1'
}

function vendorAnonHeaders(): HeadersInit {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
  }
}

async function postVendorBankFunction(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }

  const res = await fetch(`${vendorFunctionsBase()}/${path}`, {
    method: 'POST',
    headers: vendorAnonHeaders(),
    body: JSON.stringify(body),
  })

  const json = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null

  if (!res.ok) {
    const msg =
      (json?.error != null ? String(json.error) : '') ||
      (json?.message != null ? String(json.message) : '') ||
      `Request failed (${res.status}).`
    return { ok: false, reason: msg }
  }

  if (!json) {
    return { ok: false, reason: 'Empty response from bank service.' }
  }

  return { ok: true, json }
}

/** Paystack NGN bank list via vendor-resolve-account (action: list_banks). */
export async function listVendorPayoutBanks(
  accessToken: string,
): Promise<
  { ok: true; banks: PaystackBankOption[] } | { ok: false; reason: string }
> {
  const result = await postVendorBankFunction('vendor-resolve-account', {
    token: accessToken,
    action: 'list_banks',
  })

  // Local dev: always offer Paystack's synthetic test bank (code 001), even if
  // List Banks fails — production builds never take this path.
  if (!result.ok) {
    if (import.meta.env.DEV) {
      return { ok: true, banks: [PAYSTACK_DEV_TEST_BANK] }
    }
    return result
  }

  const rows = Array.isArray(result.json.banks) ? result.json.banks : []
  const banks = rows
    .map((b) => {
      const row = b as Record<string, unknown>
      return {
        name: String(row.name ?? ''),
        code: String(row.code ?? ''),
      }
    })
    .filter((b) => b.name && b.code)

  if (!banks.length) {
    if (import.meta.env.DEV) {
      return { ok: true, banks: [PAYSTACK_DEV_TEST_BANK] }
    }
    return { ok: false, reason: 'No banks returned from Paystack. Try again.' }
  }

  return { ok: true, banks: withDevTestBank(banks) }
}

/** Resolve NUBAN → Paystack account holder name (does not save). */
export async function resolveVendorBankAccount(
  accessToken: string,
  input: { bankCode: string; accountNumber: string },
): Promise<
  | {
      ok: true
      accountNumber: string
      accountName: string
      bankCode: string
    }
  | { ok: false; reason: string }
> {
  const accountNumber = input.accountNumber.replace(/\s+/g, '')
  if (!/^\d{10}$/.test(accountNumber)) {
    return { ok: false, reason: 'Account number must be exactly 10 digits.' }
  }
  if (!input.bankCode.trim()) {
    return { ok: false, reason: 'Select a bank first.' }
  }

  const result = await postVendorBankFunction('vendor-resolve-account', {
    token: accessToken,
    action: 'resolve',
    bank_code: input.bankCode.trim(),
    account_number: accountNumber,
  })
  if (!result.ok) return result

  const accountName = String(result.json.account_name ?? '').trim()
  if (!accountName) {
    return {
      ok: false,
      reason: 'Paystack did not return an account name for this number.',
    }
  }

  return {
    ok: true,
    accountNumber: String(result.json.account_number ?? accountNumber),
    accountName,
    bankCode: String(result.json.bank_code ?? input.bankCode),
  }
}

/** Confirm resolved name → create recipient + save on vendors row. */
export async function saveVendorBankDetails(
  accessToken: string,
  input: {
    bankCode: string
    bankName: string
    accountNumber: string
    accountName: string
  },
): Promise<
  { ok: true; bank: VendorBankDetails } | { ok: false; reason: string }
> {
  const result = await postVendorBankFunction('vendor-save-bank', {
    token: accessToken,
    bank_code: input.bankCode.trim(),
    bank_name: input.bankName.trim(),
    account_number: input.accountNumber.replace(/\s+/g, ''),
    account_name: input.accountName.trim(),
  })
  if (!result.ok) return result

  return {
    ok: true,
    bank: {
      bankName: String(result.json.bank_name ?? input.bankName),
      bankCode: String(result.json.bank_code ?? input.bankCode),
      accountNumber: String(result.json.account_number ?? input.accountNumber),
      accountName: String(result.json.account_name ?? input.accountName),
      hasRecipient: Boolean(result.json.paystack_recipient_code),
    },
  }
}

/** Mask NUBAN for display: ******1234 */
export function maskAccountNumber(accountNumber: string | null | undefined): string {
  const digits = String(accountNumber ?? '').replace(/\D/g, '')
  if (digits.length < 4) return '••••'
  return `${'•'.repeat(Math.max(6, digits.length - 4))}${digits.slice(-4)}`
}

export type PayoutInitiateResult = {
  withdrawalId: string
  status: string
  transferCode: string | null
  reference: string | null
  needsOtp: boolean
  message: string | null
}

/**
 * Call paystack-payout Edge Function.
 * Vendor auto-path: pass accessToken.
 * Ops Approve: omit token (uses signed-in ops JWT via is_ops).
 */
export async function initiateWithdrawalPayout(input: {
  withdrawalId: string
  /** Vendor portal access_token — required for vendor-triggered auto payout */
  accessToken?: string
}): Promise<
  { ok: true; payout: PayoutInitiateResult } | { ok: false; reason: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  const body: Record<string, unknown> = {
    withdrawal_id: input.withdrawalId,
  }

  let authorization = `Bearer ${anonKey}`

  if (input.accessToken?.trim()) {
    body.token = input.accessToken.trim()
  } else {
    const supabase = getSupabase()
    if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession()
    if (sessionError || !sessionData.session?.access_token) {
      return { ok: false, reason: 'Ops session expired. Sign in again.' }
    }
    authorization = `Bearer ${sessionData.session.access_token}`
  }

  const res = await fetch(`${vendorFunctionsBase()}/paystack-payout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null

  if (!res.ok) {
    const msg =
      (json?.error != null ? String(json.error) : '') ||
      (json?.message != null ? String(json.message) : '') ||
      `Payout failed (${res.status}).`
    return { ok: false, reason: msg }
  }

  if (!json) {
    return { ok: false, reason: 'Empty response from payout service.' }
  }

  return {
    ok: true,
    payout: {
      withdrawalId: String(json.withdrawal_id ?? input.withdrawalId),
      status: String(json.status ?? ''),
      transferCode:
        json.transfer_code != null ? String(json.transfer_code) : null,
      reference: json.reference != null ? String(json.reference) : null,
      needsOtp: Boolean(json.needs_otp),
      message: json.message != null ? String(json.message) : null,
    },
  }
}

/** Vendor portal: balance, ledger, withdrawals. */
export async function getVendorWallet(
  accessToken: string,
): Promise<{ ok: true; wallet: VendorWalletSnapshot } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('get_vendor_wallet', {
    p_token: accessToken,
  })

  if (error) return { ok: false, reason: error.message }
  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'Empty wallet response.' }
  }

  return {
    ok: true,
    wallet: parseWalletSnapshot(data as Record<string, unknown>),
  }
}

/** Vendor portal: create pending withdrawal (does not reduce balance yet). */
export async function requestVendorWithdrawal(
  accessToken: string,
  amountNgn: number,
): Promise<{ ok: true; withdrawal: WalletWithdrawal } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const amount = Math.floor(amountNgn)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: 'Enter a positive amount in Naira.' }
  }

  const { data, error } = await supabase.rpc('request_withdrawal', {
    p_token: accessToken,
    p_amount: amount,
  })

  if (error) return { ok: false, reason: error.message }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null
  if (!row) return { ok: false, reason: 'No withdrawal returned.' }

  return {
    ok: true,
    withdrawal: {
      id: String(row.id ?? ''),
      amount: Number(row.amount ?? 0),
      status: String(row.status ?? 'pending'),
      note: row.note != null ? String(row.note) : null,
      requestedAt: String(row.requested_at ?? ''),
      resolvedAt: row.resolved_at != null ? String(row.resolved_at) : null,
    },
  }
}

/** Ops: pending + in-flight (processing / needs_otp) across all vendors. */
export async function fetchOpsPendingWithdrawals(): Promise<
  { ok: true; requests: OpsWithdrawalRequest[] } | { ok: false; reason: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase
    .from('wallet_withdrawals')
    .select(
      'id, vendor_id, amount, status, note, requested_at, resolved_at, vendors(name)',
    )
    .in('status', ['pending', 'processing', 'needs_otp'])
    .order('requested_at', { ascending: true })

  if (error) return { ok: false, reason: error.message }

  return {
    ok: true,
    requests: (data ?? []).map((row) =>
      mapOpsWithdrawalRow(row as Record<string, unknown>),
    ),
  }
}

/** Ops: paid + rejected + failed, newest resolved first. */
export async function fetchOpsResolvedWithdrawals(): Promise<
  { ok: true; requests: OpsWithdrawalRequest[] } | { ok: false; reason: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase
    .from('wallet_withdrawals')
    .select(
      'id, vendor_id, amount, status, note, requested_at, resolved_at, vendors(name)',
    )
    .in('status', ['paid', 'rejected', 'failed'])
    .order('resolved_at', { ascending: false })
    .limit(100)

  if (error) return { ok: false, reason: error.message }

  return {
    ok: true,
    requests: (data ?? []).map((row) =>
      mapOpsWithdrawalRow(row as Record<string, unknown>),
    ),
  }
}

/** Ops: mark paid manually (emergency override — not the normal Approve path). */
export async function markWithdrawalPaid(
  withdrawalId: string,
  note?: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { error } = await supabase.rpc('mark_withdrawal_paid', {
    p_withdrawal_id: withdrawalId,
    p_note: note?.trim() ? note.trim() : null,
  })

  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

/** Ops: reject a pending withdrawal (no balance change). */
export async function rejectWithdrawal(
  withdrawalId: string,
  note?: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { error } = await supabase.rpc('reject_withdrawal', {
    p_withdrawal_id: withdrawalId,
    p_note: note?.trim() ? note.trim() : null,
  })

  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}
