import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DELIVERY_FEE, getVendor, type MenuItem, type Vendor } from '../data/vendors'

export type CartLine = {
  vendorId: string
  item: MenuItem
  qty: number
}

export type PlacedOrder = {
  id: string
  createdAt: string
  customerName: string
  phone: string
  address: string
  note: string
  payment: 'cod' | 'transfer'
  lines: CartLine[]
  deliveryFee: number
  subtotal: number
  total: number
  status: 'placed' | 'preparing' | 'on_the_way' | 'delivered'
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
  placeOrder: (input: {
    customerName: string
    phone: string
    address: string
    note: string
    payment: 'cod' | 'transfer'
  }) => PlacedOrder
}

const CartContext = createContext<CartContextValue | null>(null)

function nextOrderId() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `SD-${n}`
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [lastOrder, setLastOrder] = useState<PlacedOrder | null>(null)

  const vendorId = lines[0]?.vendorId ?? null
  const vendor = vendorId ? getVendor(vendorId) ?? null : null

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

  const placeOrder = useCallback(
    (input: {
      customerName: string
      phone: string
      address: string
      note: string
      payment: 'cod' | 'transfer'
    }) => {
      const subtotal = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0)
      const order: PlacedOrder = {
        id: nextOrderId(),
        createdAt: new Date().toISOString(),
        ...input,
        lines: [...lines],
        deliveryFee: DELIVERY_FEE,
        subtotal,
        total: subtotal + DELIVERY_FEE,
        status: 'placed',
      }
      setLastOrder(order)
      setLines([])
      try {
        sessionStorage.setItem(`suredrop-order-${order.id}`, JSON.stringify(order))
      } catch {
        /* ignore */
      }
      return order
    },
    [lines],
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
