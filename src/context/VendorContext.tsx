import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { OrderStatus, PlacedOrder } from './CartContext'
import { syncBuyerOrder } from '../data/ops'
import { vendorLogin } from '../lib/vendorsApi'
import type { VerificationStatus } from '../data/vendors'

export const VENDOR_AUTH_KEY = 'kampedrop-vendor-session'
export const VENDOR_ORDERS_KEY = 'kampedrop-vendor-orders-v1'

export type VendorOrder = PlacedOrder & {
  vendorId: string
  vendorConfirmed: boolean
  kitchenReady: boolean
}

type VendorSession = {
  vendorId: string
  name: string
  verificationStatus: VerificationStatus | string
  active: boolean
  signedInAt: string
}

type VendorContextValue = {
  vendorId: string | null
  vendorName: string | null
  verificationStatus: string | null
  vendorActive: boolean | null
  authenticated: boolean
  login: (
    phone: string,
    pin: string,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>
  logout: () => void
  orders: VendorOrder[]
  ordersForVendor: VendorOrder[]
  ingestOrder: (order: PlacedOrder & { vendorId: string }) => void
  acceptOrder: (id: string) => { ok: true } | { ok: false; reason: string }
  rejectOrder: (
    id: string,
    reason?: string,
  ) => { ok: true } | { ok: false; reason: string }
  markPreparing: (id: string) => { ok: true } | { ok: false; reason: string }
  markReady: (id: string) => { ok: true } | { ok: false; reason: string }
  getOrder: (id: string) => VendorOrder | undefined
}

const VendorContext = createContext<VendorContextValue | null>(null)

function loadSession(): VendorSession | null {
  try {
    const raw = localStorage.getItem(VENDOR_AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as VendorSession
    if (parsed?.vendorId) return parsed
  } catch {
    /* ignore */
  }
  return null
}

function loadOrders(): VendorOrder[] {
  try {
    const raw = localStorage.getItem(VENDOR_ORDERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as VendorOrder[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function toVendorOrder(order: PlacedOrder & { vendorId: string }): VendorOrder {
  return {
    ...order,
    vendorConfirmed: false,
    kitchenReady: false,
  }
}

function persistOrderPatch(order: VendorOrder) {
  syncBuyerOrder({
    id: order.id,
    status: order.status,
    cancelledAt: order.cancelledAt,
    cancelReason: order.cancelReason,
    escrowState: order.escrowState,
  })
}

export function VendorProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<VendorSession | null>(() => loadSession())
  const [orders, setOrders] = useState<VendorOrder[]>(() => loadOrders())

  useEffect(() => {
    try {
      if (session) localStorage.setItem(VENDOR_AUTH_KEY, JSON.stringify(session))
      else localStorage.removeItem(VENDOR_AUTH_KEY)
    } catch {
      /* ignore */
    }
  }, [session])

  useEffect(() => {
    try {
      localStorage.setItem(VENDOR_ORDERS_KEY, JSON.stringify(orders))
    } catch {
      /* ignore */
    }
  }, [orders])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === VENDOR_ORDERS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as VendorOrder[]
          if (Array.isArray(parsed)) setOrders(parsed)
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = useCallback(async (phone: string, pin: string) => {
    if (!phone.trim()) return { ok: false as const, reason: 'Enter your business phone.' }
    if (!/^\d{4}$/.test(pin.trim())) {
      return { ok: false as const, reason: 'PIN must be exactly 4 digits.' }
    }

    const result = await vendorLogin(phone.trim(), pin.trim())
    if (!result.ok) return { ok: false as const, reason: result.reason }

    setSession({
      vendorId: result.vendor.id,
      name: result.vendor.name,
      verificationStatus: result.vendor.verification_status,
      active: result.vendor.active,
      signedInAt: new Date().toISOString(),
    })
    return { ok: true as const }
  }, [])

  const logout = useCallback(() => setSession(null), [])

  const ingestOrder = useCallback((order: PlacedOrder & { vendorId: string }) => {
    setOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev
      return [toVendorOrder(order), ...prev]
    })
  }, [])

  const patchOrder = useCallback((id: string, fn: (o: VendorOrder) => VendorOrder | null) => {
    let result: { ok: true } | { ok: false; reason: string } = {
      ok: false,
      reason: 'Order not found',
    }
    setOrders((prev) => {
      const i = prev.findIndex((o) => o.id === id)
      if (i < 0) return prev
      const next = fn(prev[i])
      if (!next) {
        result = { ok: false, reason: 'That action isn’t available for this order.' }
        return prev
      }
      result = { ok: true }
      persistOrderPatch(next)
      const copy = [...prev]
      copy[i] = next
      return copy
    })
    return result
  }, [])

  const acceptOrder = useCallback(
    (id: string) =>
      patchOrder(id, (o) => {
        if (o.status === 'cancelled' || o.status === 'delivered') return null
        const status: OrderStatus =
          o.fulfillment === 'pickup' ? 'preparing' : 'preparing'
        return { ...o, vendorConfirmed: true, status }
      }),
    [patchOrder],
  )

  const rejectOrder = useCallback(
    (id: string, reason = 'Vendor could not fulfil') =>
      patchOrder(id, (o) => {
        if (o.status === 'delivered' || o.status === 'cancelled') return null
        if (o.kitchenReady || o.status === 'picked_up' || o.status === 'on_the_way') {
          return null
        }
        return {
          ...o,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelReason: reason,
          escrowState: o.escrowState === 'held' ? 'refunded' : o.escrowState,
        }
      }),
    [patchOrder],
  )

  const markPreparing = useCallback(
    (id: string) =>
      patchOrder(id, (o) => {
        if (o.status === 'cancelled' || o.status === 'delivered') return null
        return { ...o, vendorConfirmed: true, status: 'preparing' }
      }),
    [patchOrder],
  )

  const markReady = useCallback(
    (id: string) =>
      patchOrder(id, (o) => {
        if (o.status === 'cancelled' || o.status === 'delivered') return null
        if (o.fulfillment === 'pickup') {
          return {
            ...o,
            vendorConfirmed: true,
            kitchenReady: true,
            status: 'ready_for_pickup',
          }
        }
        return {
          ...o,
          vendorConfirmed: true,
          kitchenReady: true,
          status:
            o.status === 'finding_rider' || o.status === 'confirmed'
              ? 'preparing'
              : o.status,
        }
      }),
    [patchOrder],
  )

  const getOrder = useCallback(
    (id: string) => orders.find((o) => o.id === id),
    [orders],
  )

  const vendorId = session?.vendorId ?? null
  const vendorName = session?.name ?? null
  const verificationStatus = session?.verificationStatus ?? null
  const vendorActive = session?.active ?? null
  const ordersForVendor = useMemo(
    () => (vendorId ? orders.filter((o) => o.vendorId === vendorId) : []),
    [orders, vendorId],
  )

  const value = useMemo(
    () => ({
      vendorId,
      vendorName,
      verificationStatus,
      vendorActive,
      authenticated: Boolean(vendorId),
      login,
      logout,
      orders,
      ordersForVendor,
      ingestOrder,
      acceptOrder,
      rejectOrder,
      markPreparing,
      markReady,
      getOrder,
    }),
    [
      vendorId,
      vendorName,
      verificationStatus,
      vendorActive,
      login,
      logout,
      orders,
      ordersForVendor,
      ingestOrder,
      acceptOrder,
      rejectOrder,
      markPreparing,
      markReady,
      getOrder,
    ],
  )

  return <VendorContext.Provider value={value}>{children}</VendorContext.Provider>
}

export function useVendor() {
  const ctx = useContext(VendorContext)
  if (!ctx) throw new Error('useVendor must be used within VendorProvider')
  return ctx
}
