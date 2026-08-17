import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DELIVERY_FEE, type MenuItem, type Vendor } from '../data/vendors'
import {
  createOrderId,
  createPasskey,
  type EscrowState,
} from '../data/ops'
import { useCatalog } from './CatalogContext'

export type CartLine = {
  vendorId: string
  item: MenuItem
  qty: number
}

export type Fulfillment = 'delivery' | 'pickup'

export type OrderStatus =
  | 'finding_rider'
  | 'rider_assigned'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled'

export type PlacedOrder = {
  id: string
  createdAt: string
  customerName: string
  phone: string
  address: string
  note: string
  payment: 'cod' | 'transfer'
  /** Delivery to door, or customer collects at vendor */
  fulfillment: Fulfillment
  lines: CartLine[]
  deliveryFee: number
  subtotal: number
  total: number
  status: OrderStatus
  /** 4-digit passkey — rider pickup or customer collection */
  passkey: string
  escrowState: EscrowState
  cancelledAt: string | null
  cancelReason: string | null
  /** Drop landmark / Google place (delivery). Pickup spot label for pickup. */
  placeName: string | null
  placeId: string | null
  placeLat: number | null
  placeLng: number | null
}

type PlaceOrderInput = {
  customerName: string
  phone: string
  address: string
  note: string
  payment: 'cod' | 'transfer'
  fulfillment: Fulfillment
  placeName?: string | null
  placeId?: string | null
  placeLat?: number | null
  placeLng?: number | null
}

type CartContextValue = {
  lines: CartLine[]
  vendor: Vendor | null
  itemCount: number
  subtotal: number
  deliveryFee: number
  total: number
  addItem: (vendorId: string, item: MenuItem) => { ok: true } | { ok: false; reason: string }
  setQty: (itemId: string, qty: number) => void
  clear: () => void
  lastOrder: PlacedOrder | null
  /** Build order from cart without clearing (for cloud insert first). */
  draftOrder: (input: PlaceOrderInput) => PlacedOrder
  /** Persist buyer snapshot, set lastOrder, clear cart. */
  commitOrder: (order: PlacedOrder) => void
  placeOrder: (input: PlaceOrderInput) => PlacedOrder
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { getVendor, vendors } = useCatalog()
  const [lines, setLines] = useState<CartLine[]>([])
  const [lastOrder, setLastOrder] = useState<PlacedOrder | null>(null)

  const vendorId = lines[0]?.vendorId ?? null
  const vendor = vendorId ? getVendor(vendorId) ?? null : null

  useEffect(() => {
    if (!vendorId) return
    const v = getVendor(vendorId)
    if (!v || !v.active) setLines([])
  }, [vendorId, getVendor, vendors])

  const addItem = useCallback((nextVendorId: string, item: MenuItem) => {
    let result: { ok: true } | { ok: false; reason: string } = { ok: true }
    setLines((prev) => {
      if (prev.length && prev[0].vendorId !== nextVendorId) {
        result = {
          ok: false,
          reason: 'One vendor per order for now — clear your cart to switch.',
        }
        return prev
      }
      const existing = prev.find((l) => l.item.id === item.id)
      if (existing) {
        return prev.map((l) =>
          l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l,
        )
      }
      return [...prev, { vendorId: nextVendorId, item, qty: 1 }]
    })
    return result
  }, [])

  const setQty = useCallback((itemId: string, qty: number) => {
    setLines((prev) => {
      if (qty <= 0) return prev.filter((l) => l.item.id !== itemId)
      return prev.map((l) => (l.item.id === itemId ? { ...l, qty } : l))
    })
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const draftOrder = useCallback(
    (input: PlaceOrderInput) => {
      const subtotal = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0)
      const fulfillment = input.fulfillment
      const deliveryFee = fulfillment === 'pickup' ? 0 : DELIVERY_FEE
      const order: PlacedOrder = {
        id: createOrderId(),
        createdAt: new Date().toISOString(),
        customerName: input.customerName,
        phone: input.phone,
        address: input.address,
        note: input.note,
        payment: input.payment,
        fulfillment,
        lines: [...lines],
        deliveryFee,
        subtotal,
        total: subtotal + deliveryFee,
        status: fulfillment === 'pickup' ? 'confirmed' : 'finding_rider',
        passkey: createPasskey(),
        escrowState: input.payment === 'cod' ? 'cod' : 'held',
        cancelledAt: null,
        cancelReason: null,
        placeName: input.placeName ?? null,
        placeId: input.placeId ?? null,
        placeLat: input.placeLat ?? null,
        placeLng: input.placeLng ?? null,
      }
      return order
    },
    [lines],
  )

  const commitOrder = useCallback((order: PlacedOrder) => {
    try {
      sessionStorage.setItem(`suredrop-order-${order.id}`, JSON.stringify(order))
    } catch {
      /* ignore */
    }
    setLastOrder(order)
    setLines([])
  }, [])

  const placeOrder = useCallback(
    (input: PlaceOrderInput) => {
      const order = draftOrder(input)
      commitOrder(order)
      return order
    },
    [draftOrder, commitOrder],
  )

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.item.price * l.qty, 0),
    [lines],
  )
  const itemCount = useMemo(() => lines.reduce((sum, l) => sum + l.qty, 0), [lines])
  const deliveryFee = lines.length ? DELIVERY_FEE : 0

  const value = useMemo(
    () => ({
      lines,
      vendor,
      itemCount,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      addItem,
      setQty,
      clear,
      lastOrder,
      draftOrder,
      commitOrder,
      placeOrder,
    }),
    [
      lines,
      vendor,
      itemCount,
      subtotal,
      deliveryFee,
      addItem,
      setQty,
      clear,
      lastOrder,
      draftOrder,
      commitOrder,
      placeOrder,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export function loadOrder(id: string): PlacedOrder | null {
  try {
    const raw = sessionStorage.getItem(`suredrop-order-${id}`)
    if (!raw) return null
    return JSON.parse(raw) as PlacedOrder
  } catch {
    return null
  }
}
