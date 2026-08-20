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
import {
  getVendorOrders,
  updateOrderStatusByVendor,
  validatePasskeyAndReleaseByVendor,
  vendorLogin,
  type VendorPortalOrder,
} from '../lib/vendorsApi'
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
  accessToken: string
  name: string
  verificationStatus: VerificationStatus | string
  active: boolean
  signedInAt: string
}

type ActionResult = { ok: true } | { ok: false; reason: string }

type VendorContextValue = {
  vendorId: string | null
  accessToken: string | null
  vendorName: string | null
  verificationStatus: string | null
  vendorActive: boolean | null
  authenticated: boolean
  ordersLoading: boolean
  ordersError: string | null
  login: (phone: string, pin: string) => Promise<ActionResult>
  logout: () => void
  refreshOrders: () => Promise<void>
  orders: VendorOrder[]
  ordersForVendor: VendorOrder[]
  ingestOrder: (order: PlacedOrder & { vendorId: string }) => void
  markPreparing: (id: string) => Promise<ActionResult>
  markReadyForPickup: (id: string) => Promise<ActionResult>
  confirmHandoff: (id: string, passkey: string) => Promise<ActionResult>
  getOrder: (id: string) => VendorOrder | undefined
}

const VendorContext = createContext<VendorContextValue | null>(null)

function portalToVendorOrder(o: VendorPortalOrder): VendorOrder {
  return {
    id: o.id,
    createdAt: o.createdAt,
    customerName: o.customerName,
    phone: o.phone,
    address: o.address,
    note: o.note,
    payment: o.payment,
    fulfillment: o.fulfillment,
    lines: o.lines,
    deliveryFee: o.deliveryFee,
    subtotal: o.subtotal,
    total: o.total,
    status: o.status as OrderStatus,
    passkey: o.passkey,
    escrowState: o.escrowState as VendorOrder['escrowState'],
    cancelledAt: o.cancelledAt,
    cancelReason: o.cancelReason,
    vendorId: o.vendorId,
    vendorConfirmed: o.vendorConfirmed,
    kitchenReady: o.kitchenReady,
  }
}

function loadSession(): VendorSession | null {
  try {
    const raw = localStorage.getItem(VENDOR_AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as VendorSession
    // Pre-token sessions are invalid — portal RPCs need access_token
    if (parsed?.vendorId && parsed?.accessToken) return parsed
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
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | null>(null)

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

  const refreshOrders = useCallback(async () => {
    const token = session?.accessToken
    if (!token) return

    setOrdersLoading(true)
    setOrdersError(null)
    const result = await getVendorOrders(token)
    setOrdersLoading(false)

    if (!result.ok) {
      setOrdersError(result.reason)
      if (/invalid vendor access token/i.test(result.reason)) {
        setSession(null)
      }
      return
    }

    setOrders(result.orders.map(portalToVendorOrder))
  }, [session?.accessToken])

  useEffect(() => {
    if (!session?.accessToken) return
    void refreshOrders()
    const id = window.setInterval(() => void refreshOrders(), 20_000)
    const onFocus = () => void refreshOrders()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [session?.accessToken, refreshOrders])

  const login = useCallback(async (phone: string, pin: string) => {
    if (!phone.trim()) return { ok: false as const, reason: 'Enter your business phone.' }
    if (!/^\d{4}$/.test(pin.trim())) {
      return { ok: false as const, reason: 'PIN must be exactly 4 digits.' }
    }

    const result = await vendorLogin(phone.trim(), pin.trim())
    if (!result.ok) return { ok: false as const, reason: result.reason }

    setSession({
      vendorId: result.vendor.id,
      accessToken: result.vendor.access_token,
      name: result.vendor.name,
      verificationStatus: result.vendor.verification_status,
      active: result.vendor.active,
      signedInAt: new Date().toISOString(),
    })
    return { ok: true as const }
  }, [])

  const logout = useCallback(() => {
    setSession(null)
    setOrders([])
    setOrdersError(null)
  }, [])

  const ingestOrder = useCallback((order: PlacedOrder & { vendorId: string }) => {
    setOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev
      return [toVendorOrder(order), ...prev]
    })
  }, [])

  const applyCloudOrder = useCallback((order: VendorOrder) => {
    persistOrderPatch(order)
    setOrders((prev) => {
      const i = prev.findIndex((o) => o.id === order.id)
      if (i < 0) return [order, ...prev]
      const copy = [...prev]
      copy[i] = order
      return copy
    })
  }, [])

  const markPreparing = useCallback(
    async (id: string) => {
      const token = session?.accessToken
      if (!token) return { ok: false as const, reason: 'Sign in again to update orders.' }
      const result = await updateOrderStatusByVendor(token, id, 'preparing')
      if (!result.ok) return { ok: false as const, reason: result.reason }
      applyCloudOrder(portalToVendorOrder(result.order))
      return { ok: true as const }
    },
    [session?.accessToken, applyCloudOrder],
  )

  const markReadyForPickup = useCallback(
    async (id: string) => {
      const token = session?.accessToken
      if (!token) return { ok: false as const, reason: 'Sign in again to update orders.' }
      const result = await updateOrderStatusByVendor(token, id, 'ready_for_pickup')
      if (!result.ok) return { ok: false as const, reason: result.reason }
      applyCloudOrder(portalToVendorOrder(result.order))
      return { ok: true as const }
    },
    [session?.accessToken, applyCloudOrder],
  )

  const confirmHandoff = useCallback(
    async (id: string, passkey: string) => {
      const token = session?.accessToken
      if (!token) return { ok: false as const, reason: 'Sign in again to confirm handoff.' }
      if (!passkey.trim()) {
        return { ok: false as const, reason: 'Enter the buyer passkey.' }
      }
      const result = await validatePasskeyAndReleaseByVendor(token, id, passkey)
      if (!result.ok) return { ok: false as const, reason: result.reason }
      applyCloudOrder(portalToVendorOrder(result.order))
      return { ok: true as const }
    },
    [session?.accessToken, applyCloudOrder],
  )

  const getOrder = useCallback(
    (id: string) => orders.find((o) => o.id === id),
    [orders],
  )

  const vendorId = session?.vendorId ?? null
  const accessToken = session?.accessToken ?? null
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
      accessToken,
      vendorName,
      verificationStatus,
      vendorActive,
      authenticated: Boolean(vendorId && accessToken),
      ordersLoading,
      ordersError,
      login,
      logout,
      refreshOrders,
      orders,
      ordersForVendor,
      ingestOrder,
      markPreparing,
      markReadyForPickup,
      confirmHandoff,
      getOrder,
    }),
    [
      vendorId,
      accessToken,
      vendorName,
      verificationStatus,
      vendorActive,
      ordersLoading,
      ordersError,
      login,
      logout,
      refreshOrders,
      orders,
      ordersForVendor,
      ingestOrder,
      markPreparing,
      markReadyForPickup,
      confirmHandoff,
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
