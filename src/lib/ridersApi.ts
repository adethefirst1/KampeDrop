import { getSupabase, isSupabaseConfigured } from './supabase'
import { curatedLandmarks } from '../data/places'

export type RiderMe = {
  id: string
  name: string
  phone: string
  vehicleInfo: string | null
  status: string
  available: boolean
  currentZone: string | null
  zoneUpdatedAt: string | null
}

export type RiderPortalOrder = {
  id: string
  createdAt: string
  customerName: string
  phone: string
  address: string
  note: string
  status: string
  fulfillment: string
  payment: string
  vendorId: string | null
  placeName: string | null
  lines: Array<{
    name: string
    qty: number
    price: number
    vendorId?: string
    vendorName?: string
  }>
  subtotal: number
  total: number
  deliveryFee: number
}

export type AvailableRider = {
  id: string
  name: string
  phone: string
  currentZone: string | null
  zoneUpdatedAt: string | null
  status: string
  accessToken: string
}

/** Human label for a curated landmark id stored on riders.current_zone. */
export function zoneLabel(zoneId: string | null | undefined): string {
  if (!zoneId) return '—'
  const hit = curatedLandmarks.find((l) => l.id === zoneId)
  if (!hit) return zoneId
  return `${hit.name} · ${hit.area}`
}

function parseRiderMe(raw: Record<string, unknown>): RiderMe {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? 'Rider'),
    phone: String(raw.phone ?? ''),
    vehicleInfo: raw.vehicle_info != null ? String(raw.vehicle_info) : null,
    status: String(raw.status ?? ''),
    available: Boolean(raw.available),
    currentZone: raw.current_zone != null ? String(raw.current_zone) : null,
    zoneUpdatedAt:
      raw.zone_updated_at != null ? String(raw.zone_updated_at) : null,
  }
}

function parseRiderOrder(row: Record<string, unknown>): RiderPortalOrder {
  const linesRaw = Array.isArray(row.lines) ? row.lines : []
  const lines = linesRaw.map((line) => {
    const l = line as Record<string, unknown>
    return {
      name: String(l.name ?? 'Item'),
      qty: Number(l.qty ?? 1),
      price: Number(l.price ?? 0),
      vendorId: l.vendorId != null ? String(l.vendorId) : undefined,
      vendorName: l.vendorName != null ? String(l.vendorName) : undefined,
    }
  })
  return {
    id: String(row.id ?? ''),
    createdAt: String(row.created_at ?? ''),
    customerName: String(row.customer_name ?? ''),
    phone: String(row.phone ?? ''),
    address: String(row.address ?? ''),
    note: String(row.note ?? ''),
    status: String(row.status ?? ''),
    fulfillment: String(row.fulfillment ?? 'delivery'),
    payment: String(row.payment ?? ''),
    vendorId: row.vendor_id != null ? String(row.vendor_id) : null,
    placeName: row.place_name != null ? String(row.place_name) : null,
    lines,
    subtotal: Number(row.subtotal ?? 0),
    total: Number(row.total ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
  }
}

export async function getRiderMe(
  accessToken: string,
): Promise<{ ok: true; rider: RiderMe } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('get_rider_me', {
    p_token: accessToken,
  })

  if (error) return { ok: false, reason: error.message }
  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'Empty rider profile.' }
  }

  return { ok: true, rider: parseRiderMe(data as Record<string, unknown>) }
}

export async function setRiderAvailability(
  accessToken: string,
  available: boolean,
  zone: string | null,
): Promise<{ ok: true; rider: RiderMe } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('set_rider_availability', {
    p_token: accessToken,
    p_available: available,
    p_zone: zone,
  })

  if (error) return { ok: false, reason: error.message }
  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'Empty availability response.' }
  }

  const partial = data as Record<string, unknown>
  return {
    ok: true,
    rider: {
      id: String(partial.id ?? ''),
      name: String(partial.name ?? 'Rider'),
      phone: '',
      vehicleInfo: null,
      status: '',
      available: Boolean(partial.available),
      currentZone:
        partial.current_zone != null ? String(partial.current_zone) : null,
      zoneUpdatedAt:
        partial.zone_updated_at != null
          ? String(partial.zone_updated_at)
          : null,
    },
  }
}

export async function getRiderOrders(
  accessToken: string,
): Promise<{ ok: true; orders: RiderPortalOrder[] } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('get_rider_orders', {
    p_token: accessToken,
  })

  if (error) return { ok: false, reason: error.message }

  const rows = Array.isArray(data) ? data : data ? [data] : []
  return {
    ok: true,
    orders: rows.map((r) => parseRiderOrder(r as Record<string, unknown>)),
  }
}

export async function getRiderOrderHistory(
  accessToken: string,
): Promise<{ ok: true; orders: RiderPortalOrder[] } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('get_rider_order_history', {
    p_token: accessToken,
  })

  if (error) return { ok: false, reason: error.message }

  const rows = Array.isArray(data) ? data : data ? [data] : []
  return {
    ok: true,
    orders: rows.map((r) => parseRiderOrder(r as Record<string, unknown>)),
  }
}

export async function updateOrderStatusByRider(
  accessToken: string,
  orderId: string,
  newStatus: 'on_the_way' | 'delivered',
): Promise<{ ok: true; order: RiderPortalOrder } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase.rpc('update_order_status_by_rider', {
    p_token: accessToken,
    p_id: orderId,
    p_new_status: newStatus,
  })

  if (error) return { ok: false, reason: error.message }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null
  if (!row) return { ok: false, reason: 'No order returned.' }

  return { ok: true, order: parseRiderOrder(row) }
}

/** Ops: riders currently marked available (RLS is_ops). */
export async function fetchAvailableRiders(): Promise<
  { ok: true; riders: AvailableRider[] } | { ok: false; reason: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Supabase is not configured.' }

  const { data, error } = await supabase
    .from('riders')
    .select(
      'id, name, phone, current_zone, zone_updated_at, status, access_token',
    )
    .eq('available', true)
    .order('zone_updated_at', { ascending: false })

  if (error) return { ok: false, reason: error.message }

  return {
    ok: true,
    riders: (data ?? []).map((row) => {
      const r = row as Record<string, unknown>
      return {
        id: String(r.id ?? ''),
        name: String(r.name ?? 'Rider'),
        phone: String(r.phone ?? ''),
        currentZone: r.current_zone != null ? String(r.current_zone) : null,
        zoneUpdatedAt:
          r.zone_updated_at != null ? String(r.zone_updated_at) : null,
        status: String(r.status ?? ''),
        accessToken: String(r.access_token ?? ''),
      }
    }),
  }
}
