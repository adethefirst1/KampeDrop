import type {
  CartLine,
  Fulfillment,
  OrderStatus,
  PlacedOrder,
} from '../context/CartContext'
import { DELIVERY_FEE, getSeedVendor } from './vendors'

export type OpsStatus = OrderStatus | 'problem'

export type EscrowState = 'held' | 'released' | 'refunded' | 'cod'

export type OpsRider = {
  id: string
  name: string
  phone: string
  area: string
}

export type OpsNote = {
  id: string
  at: string
  text: string
}

export type OpsOrder = PlacedOrder & {
  vendorConfirmed: boolean
  riderId: string | null
  /** Legacy transfer UI + escrow mirror for ops */
  paymentState:
    | 'cod'
    | 'transfer_pending'
    | 'transfer_seen'
    | 'transfer_confirmed'
    | 'held'
    | 'released'
    | 'refunded'
  problemReason: string | null
  notes: OpsNote[]
  hasProblem: boolean
}

export const OPS_STORAGE_KEY = 'suredrop-ops-orders-v2'
export const OPS_AUTH_KEY = 'suredrop-ops-auth'

/** Delivery pipeline (cancel is terminal, not a step). */
export const deliveryPipeline: OrderStatus[] = [
  'finding_rider',
  'rider_assigned',
  'preparing',
  'picked_up',
  'on_the_way',
  'delivered',
]

/** Customer self-pickup pipeline. */
export const pickupPipeline: OrderStatus[] = [
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'delivered',
]

/** @deprecated prefer pipelineFor(fulfillment) */
export const statusPipeline = deliveryPipeline

export function pipelineFor(fulfillment: Fulfillment = 'delivery'): OrderStatus[] {
  return fulfillment === 'pickup' ? pickupPipeline : deliveryPipeline
}

export const statusLabel: Record<OpsStatus, string> = {
  finding_rider: 'Finding rider',
  rider_assigned: 'Rider assigned',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for pickup',
  picked_up: 'Picked up',
  on_the_way: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  problem: 'Problem',
}

export function labelForStatus(
  status: OpsStatus,
  fulfillment: Fulfillment = 'delivery',
): string {
  if (fulfillment === 'pickup') {
    if (status === 'delivered') return 'Collected'
    if (status === 'confirmed') return 'Order confirmed'
  }
  return statusLabel[status]
}

export const statusFeel: Partial<Record<OrderStatus, string>> = {
  finding_rider: 'Matching a vetted Badagry rider. Kitchen hasn’t started yet.',
  rider_assigned: 'Rider locked. Kitchen can start preparing.',
  confirmed: 'Order confirmed. Kitchen can start — no rider needed.',
  preparing: 'Vendor is preparing your order.',
  ready_for_pickup: 'Ready at the vendor. Bring your passkey to collect.',
  picked_up: 'Passkey checked — vendor paid. Heading your way.',
  on_the_way: 'Rider is moving toward you.',
  delivered: 'Secured at your door.',
  cancelled: 'Order cancelled. Payment refunded or released from hold.',
}

export function feelForStatus(
  status: OrderStatus,
  fulfillment: Fulfillment = 'delivery',
): string {
  if (fulfillment === 'pickup') {
    if (status === 'confirmed') {
      return 'You’re picking up. Kitchen can start — cancel is open until they begin.'
    }
    if (status === 'preparing') {
      return 'Vendor is preparing your order for pickup.'
    }
    if (status === 'ready_for_pickup') {
      return 'Ready at the counter. Show your passkey to collect.'
    }
    if (status === 'delivered') {
      return 'Collected — enjoy.'
    }
  }
  return statusFeel[status] ?? ''
}

/** Absolute progression for merging buyer/ops status across tabs. */
const absoluteRank: Record<OrderStatus, number> = {
  cancelled: -1,
  finding_rider: 0,
  confirmed: 0,
  rider_assigned: 1,
  preparing: 2,
  ready_for_pickup: 3,
  picked_up: 3,
  on_the_way: 4,
  delivered: 5,
}

/** Collision-safe guest order ids (seeds use SD-1xxx; live orders use time-based ids). */
export function createOrderId(existingIds?: Iterable<string>): string {
  const taken = new Set(existingIds)
  try {
    const raw = localStorage.getItem(OPS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string }[]
      if (Array.isArray(parsed)) {
        for (const row of parsed) {
          if (row?.id) taken.add(row.id)
        }
      }
    }
  } catch {
    /* ignore */
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    const id = `SD-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`
    if (!taken.has(id)) return id
  }
  return `SD-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

export function createPasskey(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export function canCancelOrder(
  status: OrderStatus,
  fulfillment: Fulfillment = 'delivery',
): boolean {
  // Delivery: cancel only while finding a rider.
  // Pickup: cancel only before kitchen starts.
  if (fulfillment === 'pickup') return status === 'confirmed'
  return status === 'finding_rider'
}

export function kitchenMayStart(
  status: OrderStatus,
  fulfillment: Fulfillment = 'delivery',
): boolean {
  if (fulfillment === 'pickup') {
    return (
      status === 'confirmed' ||
      status === 'preparing' ||
      status === 'ready_for_pickup' ||
      status === 'delivered'
    )
  }
  return (
    status === 'rider_assigned' ||
    status === 'preparing' ||
    status === 'picked_up' ||
    status === 'on_the_way' ||
    status === 'delivered'
  )
}

export function statusRank(
  status: OrderStatus,
  fulfillment: Fulfillment = 'delivery',
): number {
  if (status === 'cancelled') return -1
  const pipe = pipelineFor(fulfillment)
  const i = pipe.indexOf(status)
  return i < 0 ? absoluteRank[status] ?? 0 : i
}

export function furtherStatus(a: OrderStatus, b: OrderStatus): OrderStatus {
  if (a === 'cancelled') return a
  if (b === 'cancelled') return b
  return absoluteRank[a] >= absoluteRank[b] ? a : b
}

export const riders: OpsRider[] = [
  { id: 'tunde', name: 'Tunde Bike', phone: '08031110001', area: 'Badagry Town' },
  { id: 'kemi', name: 'Kemi Express', phone: '08032220002', area: 'Ajara' },
  { id: 'segun', name: 'Segun Corridor', phone: '08033330003', area: 'Aradagun / Expressway' },
]

/** Migrate legacy statuses from older prototypes */
export function migrateStatus(raw: string | undefined): OrderStatus {
  switch (raw) {
    case 'placed':
      return 'finding_rider'
    case 'finding_rider':
    case 'rider_assigned':
    case 'confirmed':
    case 'preparing':
    case 'ready_for_pickup':
    case 'picked_up':
    case 'on_the_way':
    case 'delivered':
    case 'cancelled':
      return raw
    default:
      return 'finding_rider'
  }
}

export function normalizeOpsOrder(raw: Record<string, unknown>): OpsOrder {
  const payment = (raw.payment as PlacedOrder['payment']) === 'transfer' ? 'transfer' : 'cod'
  const fulfillment: Fulfillment =
    raw.fulfillment === 'pickup' ? 'pickup' : 'delivery'
  let status = migrateStatus(raw.status as string | undefined)
  if (fulfillment === 'pickup' && status === 'finding_rider') {
    status = 'confirmed'
  }
  const passkey =
    typeof raw.passkey === 'string' && /^\d{4}$/.test(raw.passkey)
      ? raw.passkey
      : createPasskey()

  let escrowState = raw.escrowState as EscrowState | undefined
  if (!escrowState) {
    if (payment === 'cod') escrowState = 'cod'
    else if (status === 'cancelled') escrowState = 'refunded'
    else if (
      fulfillment === 'delivery' &&
      absoluteRank[status] >= absoluteRank.picked_up
    ) {
      escrowState = 'released'
    } else if (fulfillment === 'pickup' && status === 'delivered') {
      escrowState = 'released'
    } else escrowState = 'held'
  }

  let paymentState = raw.paymentState as OpsOrder['paymentState']
  if (!paymentState) {
    if (payment === 'cod') paymentState = 'cod'
    else if (escrowState === 'released') paymentState = 'released'
    else if (escrowState === 'refunded') paymentState = 'refunded'
    else paymentState = 'transfer_pending'
  }

  return {
    id: String(raw.id ?? createOrderId()),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    customerName: String(raw.customerName ?? 'Guest'),
    phone: String(raw.phone ?? ''),
    address: String(raw.address ?? ''),
    note: String(raw.note ?? ''),
    payment,
    fulfillment,
    lines: Array.isArray(raw.lines) ? (raw.lines as CartLine[]) : [],
    deliveryFee: Number(
      raw.deliveryFee ?? (fulfillment === 'pickup' ? 0 : DELIVERY_FEE),
    ),
    subtotal: Number(raw.subtotal ?? 0),
    total: Number(raw.total ?? 0),
    status,
    passkey,
    escrowState,
    cancelledAt: (raw.cancelledAt as string | null) ?? null,
    cancelReason: (raw.cancelReason as string | null) ?? null,
    placeName: (raw.placeName as string | null) ?? null,
    placeId: (raw.placeId as string | null) ?? null,
    placeLat:
      typeof raw.placeLat === 'number'
        ? raw.placeLat
        : raw.placeLat != null
          ? Number(raw.placeLat)
          : null,
    placeLng:
      typeof raw.placeLng === 'number'
        ? raw.placeLng
        : raw.placeLng != null
          ? Number(raw.placeLng)
          : null,
    vendorConfirmed: Boolean(raw.vendorConfirmed),
    riderId: fulfillment === 'pickup' ? null : ((raw.riderId as string | null) ?? null),
    paymentState,
    problemReason: (raw.problemReason as string | null) ?? null,
    hasProblem: Boolean(raw.hasProblem),
    notes: Array.isArray(raw.notes) ? (raw.notes as OpsNote[]) : [],
  }
}

function minutesAgo(mins: number) {
  return new Date(Date.now() - mins * 60_000).toISOString()
}

function line(
  vendorId: string,
  itemId: string,
  qty: number,
): CartLine | null {
  const vendor = getSeedVendor(vendorId)
  const item = vendor?.items.find((i) => i.id === itemId)
  if (!vendor || !item) return null
  return { vendorId, item, qty }
}

export function buildSeedOrders(): OpsOrder[] {
  const l1 = line('mama-toke', 'jollof', 2)
  const l2 = line('mama-toke', 'pepper-soup', 1)
  const l3 = line('ajara-mart', 'rice5', 1)
  const l4 = line('ajara-mart', 'eggs', 1)
  const l5 = line('aradagun-grill', 'suya', 1)
  const l6 = line('mama-toke', 'efo', 1)

  const seeds: OpsOrder[] = []

  if (l1 && l2) {
    const lines = [l1, l2]
    const subtotal = lines.reduce((s, l) => s + l.item.price * l.qty, 0)
    seeds.push({
      id: 'SD-1042',
      createdAt: minutesAgo(3),
      customerName: 'Adaeze Okonkwo',
      phone: '08035550101',
      address: 'Hospital Road, near First Baptist, Badagry Town — blue gate',
      note: 'Call on arrival',
      payment: 'transfer',
      fulfillment: 'delivery',
      lines,
      deliveryFee: DELIVERY_FEE,
      subtotal,
      total: subtotal + DELIVERY_FEE,
      status: 'finding_rider',
      passkey: '4821',
      escrowState: 'held',
      cancelledAt: null,
      cancelReason: null,
      placeName: 'Hospital Road',
      placeId: 'hospital-road',
      placeLat: 6.4325,
      placeLng: 2.8854,
      vendorConfirmed: false,
      riderId: null,
      paymentState: 'transfer_pending',
      problemReason: null,
      hasProblem: false,
      notes: [
        {
          id: 'n0',
          at: minutesAgo(3),
          text: 'Transfer pending — awaiting buyer payment into escrow.',
        },
      ],
    })
  }

  if (l3 && l4) {
    const lines = [l3, l4]
    const subtotal = lines.reduce((s, l) => s + l.item.price * l.qty, 0)
    seeds.push({
      id: 'SD-1038',
      createdAt: minutesAgo(28),
      customerName: 'Chidi Eze',
      phone: '08036660202',
      address: 'Ajara Junction, second street after the roundabout',
      note: '',
      payment: 'transfer',
      fulfillment: 'delivery',
      lines,
      deliveryFee: DELIVERY_FEE,
      subtotal,
      total: subtotal + DELIVERY_FEE,
      status: 'preparing',
      passkey: '7390',
      escrowState: 'held',
      cancelledAt: null,
      cancelReason: null,
      placeName: 'Ajara Junction',
      placeId: 'ajara-junction',
      placeLat: 6.4482,
      placeLng: 2.9125,
      vendorConfirmed: true,
      riderId: 'kemi',
      paymentState: 'transfer_confirmed',
      problemReason: null,
      hasProblem: false,
      notes: [
        {
          id: 'n1',
          at: minutesAgo(25),
          text: 'Kemi assigned. Kitchen told to start.',
        },
      ],
    })
  }

  if (l5) {
    const lines = [l5]
    const subtotal = lines.reduce((s, l) => s + l.item.price * l.qty, 0)
    seeds.push({
      id: 'SD-1031',
      createdAt: minutesAgo(75),
      customerName: 'Fatima Bello',
      phone: '08037770303',
      address: 'Aradagun, Expressway side — green kiosk landmark',
      note: 'Extra yaji',
      payment: 'transfer',
      fulfillment: 'delivery',
      lines,
      deliveryFee: DELIVERY_FEE,
      subtotal,
      total: subtotal + DELIVERY_FEE,
      status: 'on_the_way',
      passkey: '2156',
      escrowState: 'released',
      cancelledAt: null,
      cancelReason: null,
      placeName: 'Aradagun',
      placeId: 'aradagun',
      placeLat: 6.4725,
      placeLng: 2.9812,
      vendorConfirmed: true,
      riderId: 'segun',
      paymentState: 'released',
      problemReason: null,
      hasProblem: false,
      notes: [
        {
          id: 'n2',
          at: minutesAgo(40),
          text: 'Passkey OK. Escrow released to vendor. Segun en route.',
        },
      ],
    })
  }

  if (l6) {
    const vendor = getSeedVendor('mama-toke')
    const lines = [l6]
    const subtotal = lines.reduce((s, l) => s + l.item.price * l.qty, 0)
    seeds.push({
      id: 'SD-1048',
      createdAt: minutesAgo(12),
      customerName: 'Ifeanyi Nwosu',
      phone: '08038880404',
      address: vendor?.pickupSpot ?? 'Hospital Road, Badagry Town',
      note: 'Coming on a black scooter',
      payment: 'cod',
      fulfillment: 'pickup',
      lines,
      deliveryFee: 0,
      subtotal,
      total: subtotal,
      status: 'preparing',
      passkey: '6610',
      escrowState: 'cod',
      cancelledAt: null,
      cancelReason: null,
      placeName: vendor?.name ?? 'Mama Toke Kitchen',
      placeId: null,
      placeLat: null,
      placeLng: null,
      vendorConfirmed: true,
      riderId: null,
      paymentState: 'cod',
      problemReason: null,
      hasProblem: false,
      notes: [
        {
          id: 'n3',
          at: minutesAgo(10),
          text: 'Pickup order — kitchen started. No rider.',
        },
      ],
    })
  }

  return seeds
}

export function vendorPhone(vendorId: string): string {
  return getSeedVendor(vendorId)?.phone ?? '08000000000'
}

export function getRider(id: string | null) {
  if (!id) return null
  return riders.find((r) => r.id === id) ?? null
}

export function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}

export function placedToOps(order: PlacedOrder): OpsOrder {
  const paymentState = order.payment === 'cod' ? 'cod' : 'transfer_pending'
  const pickup = order.fulfillment === 'pickup'
  return {
    ...order,
    vendorConfirmed: false,
    riderId: null,
    paymentState,
    problemReason: null,
    hasProblem: false,
    notes: [
      {
        id: `n-${Date.now()}`,
        at: new Date().toISOString(),
        text: pickup
          ? order.payment === 'cod'
            ? 'Pickup order — pay at vendor on collect. Kitchen can start.'
            : 'Pickup order — awaiting transfer into escrow. Kitchen can start after pay is seen.'
          : order.payment === 'cod'
            ? 'COD order — finding rider before kitchen starts.'
            : 'Transfer order — awaiting buyer payment into escrow. Finding rider after pay is seen.',
      },
    ],
  }
}

export function syncBuyerOrder(order: Pick<PlacedOrder, 'id'> & Partial<PlacedOrder>) {
  try {
    const key = `suredrop-order-${order.id}`
    const raw = sessionStorage.getItem(key)
    const prev = raw ? (JSON.parse(raw) as PlacedOrder) : null
    const next = { ...(prev ?? {}), ...order } as PlacedOrder
    sessionStorage.setItem(key, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}
