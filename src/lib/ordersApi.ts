import type { EscrowState, OpsOrder } from '../data/ops'
import type { Fulfillment, OrderStatus, PlacedOrder } from '../context/CartContext'
import { getSupabase, isSupabaseConfigured } from './supabase'

/** Shape of one row in public.orders (snake_case = Postgres style). */
export type OrderRow = {
  id: string
  created_at: string
  customer_name: string
  phone: string
  address: string
  note: string
  payment: 'cod' | 'transfer' | 'card'
  fulfillment: 'delivery' | 'pickup'
  status: string
  passkey: string
  escrow_state: string
  payment_state: string
  delivery_fee: number
  subtotal: number
  total: number
  lines: PlacedOrder['lines']
  place_name: string | null
  place_id: string | null
  place_lat: number | null
  place_lng: number | null
  vendor_id: string | null
  vendor_confirmed: boolean
  rider_id: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  problem_reason: string | null
  has_problem: boolean
}

export function placedOrderToRow(order: PlacedOrder): OrderRow {
  return {
    id: order.id,
    created_at: order.createdAt,
    customer_name: order.customerName,
    phone: order.phone,
    address: order.address,
    note: order.note,
    payment: order.payment,
    fulfillment: order.fulfillment ?? 'delivery',
    status: order.status,
    passkey: order.passkey,
    escrow_state: order.escrowState,
    payment_state:
      order.payment === 'cod'
        ? 'cod'
        : order.payment === 'card'
          ? 'card_pending'
          : 'transfer_pending',
    delivery_fee: order.deliveryFee,
    subtotal: order.subtotal,
    total: order.total,
    lines: order.lines,
    place_name: order.placeName,
    place_id: order.placeId,
    place_lat: order.placeLat,
    place_lng: order.placeLng,
    vendor_id: order.lines[0]?.vendorId ?? null,
    vendor_confirmed: false,
    rider_id: null,
    cancelled_at: order.cancelledAt,
    cancel_reason: order.cancelReason,
    problem_reason: null,
    has_problem: false,
  }
}

export function rowToPlacedOrder(row: OrderRow): PlacedOrder {
  const payment: PlacedOrder['payment'] =
    row.payment === 'transfer' ? 'transfer' : row.payment === 'card' ? 'card' : 'cod'
  const fulfillment: Fulfillment =
    row.fulfillment === 'pickup' ? 'pickup' : 'delivery'
  return {
    id: row.id,
    createdAt: row.created_at,
    customerName: row.customer_name,
    phone: row.phone,
    address: row.address,
    note: row.note ?? '',
    payment,
    fulfillment,
    lines: Array.isArray(row.lines) ? row.lines : [],
    deliveryFee: Number(row.delivery_fee ?? 0),
    subtotal: Number(row.subtotal ?? 0),
    total: Number(row.total ?? 0),
    status: row.status as OrderStatus,
    passkey: row.passkey,
    escrowState: row.escrow_state as EscrowState,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    placeName: row.place_name,
    placeId: row.place_id,
    placeLat: row.place_lat,
    placeLng: row.place_lng,
  }
}

/** Guest track payload: placed order + live payment / problem fields from cloud. */
export type CloudOrder = PlacedOrder & {
  paymentState: OpsOrder['paymentState']
  hasProblem: boolean
  riderId: string | null
}

export function rowToCloudOrder(row: OrderRow): CloudOrder {
  const placed = rowToPlacedOrder(row)
  return {
    ...placed,
    paymentState:
      (row.payment_state as OpsOrder['paymentState']) ||
      (placed.payment === 'cod' ? 'cod' : 'transfer_pending'),
    hasProblem: Boolean(row.has_problem),
    riderId: row.rider_id,
  }
}

/**
 * Save a placed order to Supabase.
 * Dual-write: local cart/ops still work; this makes the order visible in the cloud.
 */
export async function saveOrderToSupabase(
  order: PlacedOrder,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env',
    }
  }

  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, reason: 'Supabase client failed to start.' }
  }

  const row = placedOrderToRow(order)
  const { error } = await supabase.from('orders').insert(row)

  if (error) {
    return { ok: false, reason: error.message }
  }

  return { ok: true }
}

/** True when Postgres rate-limit trigger rejected the insert. */
export function isOrderRateLimitError(message: string) {
  const m = message.toLowerCase()
  return (
    m.includes('too many orders from this number') ||
    m.includes('too many orders')
  )
}

/**
 * Load one order by id via get_order_by_id RPC (guest-safe; no full table list).
 */
export async function fetchOrderById(
  orderId: string,
): Promise<
  | { ok: true; order: CloudOrder }
  | { ok: false; reason: string; order: null }
> {
  if (!orderId.trim()) {
    return { ok: false, reason: 'Missing order id.', order: null }
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: 'Supabase is not configured.',
      order: null,
    }
  }

  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, reason: 'Supabase client failed to start.', order: null }
  }

  const { data, error } = await supabase.rpc('get_order_by_id', {
    p_id: orderId,
  })

  if (error) {
    return { ok: false, reason: error.message, order: null }
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') {
    return { ok: false, reason: 'Order not found in cloud.', order: null }
  }

  return { ok: true, order: rowToCloudOrder(row as OrderRow) }
}

export function rowToOpsOrder(row: OrderRow): OpsOrder {
  const placed = rowToPlacedOrder(row)
  return {
    ...placed,
    vendorConfirmed: Boolean(row.vendor_confirmed),
    riderId: row.rider_id,
    paymentState: (row.payment_state as OpsOrder['paymentState']) ||
      (placed.payment === 'cod' ? 'cod' : 'transfer_pending'),
    problemReason: row.problem_reason,
    hasProblem: Boolean(row.has_problem),
    notes: [],
  }
}

/** Fields ops may patch on public.orders (snake_case). */
export type OrderPatch = Partial<{
  status: string
  escrow_state: string
  payment_state: string
  vendor_confirmed: boolean
  rider_id: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  problem_reason: string | null
  has_problem: boolean
}>

export function opsOrderToPatch(order: OpsOrder): OrderPatch {
  return {
    status: order.status,
    escrow_state: order.escrowState,
    payment_state: order.paymentState,
    vendor_confirmed: order.vendorConfirmed,
    rider_id: order.riderId,
    cancelled_at: order.cancelledAt,
    cancel_reason: order.cancelReason,
    problem_reason: order.problemReason,
    has_problem: order.hasProblem,
  }
}

/** Ops inbox: requires authenticated session + ops RLS policy. */
export async function fetchAllOrdersFromSupabase(): Promise<
  { ok: true; orders: OpsOrder[] } | { ok: false; reason: string }
> {
  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false, reason: error.message }
  }

  const rows = (data ?? []) as OrderRow[]
  return { ok: true, orders: rows.map(rowToOpsOrder) }
}

/** Ops update: requires authenticated ops session. */
export async function updateOrderInSupabase(
  id: string,
  patch: OrderPatch,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }

  // Never push escrow/payment "released" from the client — only via
  // validate_passkey_and_release RPC (DB trigger also rejects this).
  const safe: OrderPatch = { ...patch }
  if (safe.escrow_state === 'released') delete safe.escrow_state
  if (safe.payment_state === 'released') delete safe.payment_state

  const { error } = await supabase.from('orders').update(safe).eq('id', id)

  if (error) {
    return { ok: false, reason: error.message }
  }
  return { ok: true }
}

/**
 * Ops passkey confirm + escrow release (SECURITY DEFINER RPC).
 * Only authenticated callers should be granted EXECUTE.
 */
export async function validatePasskeyAndRelease(
  orderId: string,
  passkey: string,
): Promise<{ ok: true; order: OpsOrder } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }

  const { data, error } = await supabase.rpc('validate_passkey_and_release', {
    p_id: orderId,
    p_passkey: passkey.trim(),
  })

  if (error) {
    return { ok: false, reason: error.message }
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') {
    return { ok: false, reason: 'Passkey validation returned no order.' }
  }

  return { ok: true, order: rowToOpsOrder(row as OrderRow) }
}

/**
 * Guest “I’ve paid” — needs SECURITY DEFINER RPC (anon cannot UPDATE).
 * SQL: claim_transfer_paid(p_id text) → sets payment_state = transfer_seen
 */
export async function claimTransferPaidInSupabase(
  orderId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, reason: 'Supabase is not configured.' }
  }

  const { error } = await supabase.rpc('claim_transfer_paid', {
    p_id: orderId,
  })

  if (error) {
    return { ok: false, reason: error.message }
  }
  return { ok: true }
}
