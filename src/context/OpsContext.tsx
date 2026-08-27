import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import type { OrderStatus, PlacedOrder } from './CartContext'
import {
  canCancelOrder,
  placedToOps,
  statusLabel,
  syncBuyerOrder,
  type OpsOrder,
  type OpsRider,
} from '../data/ops'
import {
  claimTransferPaidInSupabase,
  fetchAllOrdersFromSupabase,
  opsOrderToPatch,
  updateOrderInSupabase,
  validatePasskeyAndRelease,
} from '../lib/ordersApi'
import { fetchOpsRiders, zoneLabel } from '../lib/ridersApi'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

type OpsContextValue = {
  /** False until first auth session check finishes */
  authReady: boolean
  authenticated: boolean
  user: User | null
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>
  logout: () => Promise<void>
  orders: OpsOrder[]
  ordersLoading: boolean
  ordersError: string | null
  refreshOrders: (opts?: { quiet?: boolean }) => Promise<void>
  getOrder: (id: string) => OpsOrder | undefined
  ingestPlacedOrder: (order: PlacedOrder) => void
  setStatus: (id: string, status: OrderStatus) => void
  setVendorConfirmed: (id: string, value: boolean) => void
  assignRider: (id: string, riderId: string | null) => void
  markPreparing: (id: string) => { ok: true } | { ok: false; reason: string }
  markReadyForPickup: (id: string) => { ok: true } | { ok: false; reason: string }
  validatePickup: (
    id: string,
    passkey: string,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>
  markOnTheWay: (id: string) => void
  markDelivered: (id: string) => void
  cancelOrder: (
    id: string,
    reason: string,
  ) => { ok: true } | { ok: false; reason: string }
  claimTransferPaid: (id: string) => { ok: true } | { ok: false; reason: string }
  confirmTransfer: (
    id: string,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>
  setPaymentState: (id: string, state: OpsOrder['paymentState']) => void
  flagProblem: (id: string, reason: string) => void
  clearProblem: (id: string) => void
  addNote: (id: string, text: string) => void
  riders: OpsRider[]
  ridersLoading: boolean
  ridersError: string | null
  refreshRiders: () => Promise<void>
}

const OpsContext = createContext<OpsContextValue | null>(null)

function note(text: string) {
  return {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    at: new Date().toISOString(),
    text,
  }
}

function mergeNotes(prev: OpsOrder[], incoming: OpsOrder[]): OpsOrder[] {
  const noteMap = new Map(prev.map((o) => [o.id, o.notes]))
  return incoming.map((o) => ({
    ...o,
    notes: noteMap.get(o.id)?.length ? noteMap.get(o.id)! : o.notes,
  }))
}

export function OpsProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<OpsOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [riders, setRiders] = useState<OpsRider[]>([])
  const [ridersLoading, setRidersLoading] = useState(false)
  const [ridersError, setRidersError] = useState<string | null>(null)
  const ordersRef = useRef(orders)
  ordersRef.current = orders
  const ridersRef = useRef(riders)
  ridersRef.current = riders

  const authenticated = Boolean(user)

  const refreshOrders = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!user) {
      setOrders([])
      return
    }
    if (!opts?.quiet) setOrdersLoading(true)
    const result = await fetchAllOrdersFromSupabase()
    if (!opts?.quiet) setOrdersLoading(false)
    if (!result.ok) {
      setOrdersError(result.reason)
      return
    }
    setOrdersError(null)
    setOrders((prev) => mergeNotes(prev, result.orders))
  }, [user])

  const refreshRiders = useCallback(async () => {
    if (!user) {
      setRiders([])
      setRidersError(null)
      return
    }
    setRidersLoading(true)
    const result = await fetchOpsRiders()
    setRidersLoading(false)
    if (!result.ok) {
      setRidersError(result.reason)
      setRiders([])
      return
    }
    setRidersError(null)
    setRiders(
      result.riders.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        area: zoneLabel(r.currentZone),
        available: r.available,
        currentZone: r.currentZone,
        zoneUpdatedAt: r.zoneUpdatedAt,
      })),
    )
  }, [user])

  // Auth session bootstrap + listener (replaces PIN / sessionStorage)
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setAuthReady(true)
      setUser(null)
      return
    }

    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(data.session?.user ?? null)
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Load + poll orders while ops is signed in; re-pull when tab is focused.
  useEffect(() => {
    if (!user) {
      setOrders([])
      setOrdersError(null)
      setRiders([])
      setRidersError(null)
      return
    }

    let poll: number | null = null

    function startPolling() {
      if (poll != null) window.clearInterval(poll)
      poll = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          void refreshOrders({ quiet: true })
        }
      }, 4000)
    }

    function onVisible() {
      if (document.visibilityState !== 'visible') return
      void refreshOrders({ quiet: true })
      void refreshRiders()
      startPolling()
    }

    void refreshOrders()
    void refreshRiders()
    startPolling()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      if (poll != null) window.clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [user, refreshOrders, refreshRiders])

  const login = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) {
      return {
        ok: false as const,
        reason:
          'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env',
      }
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      return { ok: false as const, reason: error.message }
    }
    return { ok: true as const }
  }, [])

  const logout = useCallback(async () => {
    const supabase = getSupabase()
    if (supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setOrders([])
    try {
      sessionStorage.removeItem('kampedrop-ops-auth')
    } catch {
      /* ignore */
    }
  }, [])

  const persistCloud = useCallback((updated: OpsOrder) => {
    syncBuyerOrder(updated)
    if (!isSupabaseConfigured()) return
    void updateOrderInSupabase(updated.id, opsOrderToPatch(updated)).then(
      (result) => {
        if (!result.ok) {
          console.error('Ops cloud update failed:', result.reason)
          setOrdersError(result.reason)
        }
      },
    )
  }, [])

  const updateOrder = useCallback(
    (id: string, fn: (o: OpsOrder) => OpsOrder) => {
      setOrders((prev) => {
        const next = prev.map((o) => {
          if (o.id !== id) return o
          const updated = fn(o)
          persistCloud(updated)
          return updated
        })
        return next
      })
    },
    [persistCloud],
  )

  const ingestPlacedOrder = useCallback((order: PlacedOrder) => {
    // Checkout already inserts into Supabase; keep optimistic local row for ops UI.
    setOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev
      return [placedToOps(order), ...prev]
    })
  }, [])

  const getOrder = useCallback(
    (id: string) => orders.find((o) => o.id === id),
    [orders],
  )

  const setStatus = useCallback(
    (id: string, status: OrderStatus) => {
      updateOrder(id, (o) => ({
        ...o,
        status,
        notes: [...o.notes, note(`Status → ${statusLabel[status]}`)],
      }))
    },
    [updateOrder],
  )

  const setVendorConfirmed = useCallback(
    (id: string, value: boolean) => {
      updateOrder(id, (o) => ({
        ...o,
        vendorConfirmed: value,
        notes: value ? [...o.notes, note('Vendor confirmed.')] : o.notes,
      }))
    },
    [updateOrder],
  )

  const assignRider = useCallback(
    (id: string, riderId: string | null) => {
      const rider = ridersRef.current.find((r) => r.id === riderId)
      updateOrder(id, (o) => {
        if (o.fulfillment === 'pickup') return o
        if (
          o.status === 'cancelled' ||
          o.status === 'delivered' ||
          o.status === 'picked_up' ||
          o.status === 'on_the_way'
        ) {
          return o
        }
        if (!riderId) {
          if (o.status === 'preparing') {
            return o
          }
          return {
            ...o,
            riderId: null,
            status: 'finding_rider',
            notes: [...o.notes, note('Rider cleared — back to finding rider.')],
          }
        }
        if (o.riderId === riderId) return o
        const reassign = Boolean(o.riderId)
        const nextStatus: OrderStatus =
          o.status === 'finding_rider' || o.status === 'rider_assigned'
            ? 'rider_assigned'
            : o.status
        return {
          ...o,
          riderId,
          status: nextStatus,
          notes: [
            ...o.notes,
            note(
              reassign
                ? `Rider reassigned: ${rider?.name ?? riderId}.`
                : `Rider assigned: ${rider?.name ?? riderId}. Kitchen may start preparing.`,
            ),
          ],
        }
      })
    },
    [updateOrder],
  )

  const markPreparing = useCallback(
    (id: string) => {
      let result: { ok: true } | { ok: false; reason: string } = { ok: true }
      updateOrder(id, (o) => {
        if (o.status === 'cancelled') {
          result = { ok: false, reason: 'Order is cancelled.' }
          return o
        }
        if (o.fulfillment === 'pickup') {
          if (o.status !== 'confirmed' && o.status !== 'preparing') {
            result = {
              ok: false,
              reason:
                o.status === 'ready_for_pickup' || o.status === 'delivered'
                  ? 'Order is already past preparing.'
                  : 'Pickup order must be confirmed before kitchen starts.',
            }
            return o
          }
          return {
            ...o,
            status: 'preparing',
            vendorConfirmed: true,
            notes: [
              ...o.notes,
              note('Kitchen told to start preparing (pickup).'),
            ],
          }
        }
        if (!o.riderId) {
          result = {
            ok: false,
            reason: 'Assign a rider before the kitchen starts.',
          }
          return o
        }
        if (o.status !== 'rider_assigned' && o.status !== 'preparing') {
          if (
            o.status === 'picked_up' ||
            o.status === 'on_the_way' ||
            o.status === 'delivered'
          ) {
            result = { ok: false, reason: 'Order is already past preparing.' }
            return o
          }
        }
        return {
          ...o,
          status: 'preparing',
          vendorConfirmed: true,
          notes: [...o.notes, note('Kitchen told to start preparing.')],
        }
      })
      return result
    },
    [updateOrder],
  )

  const markReadyForPickup = useCallback(
    (id: string) => {
      let result: { ok: true } | { ok: false; reason: string } = { ok: true }
      updateOrder(id, (o) => {
        if (o.fulfillment !== 'pickup') {
          result = { ok: false, reason: 'Not a pickup order.' }
          return o
        }
        if (o.status === 'cancelled') {
          result = { ok: false, reason: 'Order is cancelled.' }
          return o
        }
        if (o.status !== 'preparing' && o.status !== 'ready_for_pickup') {
          result = {
            ok: false,
            reason: 'Mark preparing before ready for pickup.',
          }
          return o
        }
        return {
          ...o,
          status: 'ready_for_pickup',
          vendorConfirmed: true,
          notes: [...o.notes, note('Ready for customer pickup at vendor.')],
        }
      })
      return result
    },
    [updateOrder],
  )

  const validatePickup = useCallback(
    async (id: string, passkey: string) => {
      const trimmed = passkey.trim()
      if (!/^\d{4}$/.test(trimmed)) {
        return { ok: false as const, reason: 'Enter the 4-digit passkey.' }
      }

      const cloud = await validatePasskeyAndRelease(id, trimmed)
      if (!cloud.ok) {
        return { ok: false as const, reason: cloud.reason }
      }

      setOrders((prev) => {
        const exists = prev.some((o) => o.id === id)
        if (!exists) return [cloud.order, ...prev]
        return prev.map((o) =>
          o.id === id
            ? {
                ...cloud.order,
                notes: [
                  ...o.notes,
                  note(
                    cloud.order.payment === 'cod'
                      ? 'Passkey OK — handoff confirmed (COD).'
                      : 'Passkey OK — handoff confirmed. Escrow released via validate_passkey_and_release.',
                  ),
                ],
              }
            : o,
        )
      })
      syncBuyerOrder(cloud.order)
      return { ok: true as const }
    },
    [],
  )

  const markOnTheWay = useCallback(
    (id: string) => {
      updateOrder(id, (o) => {
        if (o.status !== 'picked_up' && o.status !== 'on_the_way') return o
        return {
          ...o,
          status: 'on_the_way',
          notes: [...o.notes, note('Rider is on the way.')],
        }
      })
    },
    [updateOrder],
  )

  const markDelivered = useCallback(
    (id: string) => {
      updateOrder(id, (o) => {
        if (
          o.status !== 'on_the_way' &&
          o.status !== 'picked_up' &&
          o.status !== 'delivered'
        ) {
          return o
        }
        return {
          ...o,
          status: 'delivered',
          notes: [...o.notes, note('Delivered — secured.')],
        }
      })
    },
    [updateOrder],
  )

  const cancelOrder = useCallback(
    (id: string, reason: string) => {
      let result: { ok: true } | { ok: false; reason: string } = { ok: true }
      updateOrder(id, (o) => {
        if (!canCancelOrder(o.status, o.fulfillment ?? 'delivery')) {
          result = {
            ok: false,
            reason:
              o.fulfillment === 'pickup'
                ? 'Cannot cancel after the kitchen starts. Use the KampeDrop Guarantee if something is wrong.'
                : 'Cannot cancel after a rider accepts. Use the KampeDrop Guarantee if something is wrong.',
          }
          return o
        }
        return {
          ...o,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelReason: reason,
          escrowState: o.payment === 'cod' ? 'cod' : 'refunded',
          paymentState: o.payment === 'cod' ? 'cod' : 'refunded',
          notes: [
            ...o.notes,
            note(
              o.payment === 'cod'
                ? `Cancelled: ${reason}`
                : `Cancelled: ${reason}. Escrow refunded to buyer.`,
            ),
          ],
        }
      })
      return result
    },
    [updateOrder],
  )

  const claimTransferPaid = useCallback(
    (id: string) => {
      let result: { ok: true } | { ok: false; reason: string } = { ok: true }
      const current = ordersRef.current.find((o) => o.id === id)
      if (!current) {
        // Still try cloud RPC for cross-device track pages
        void claimTransferPaidInSupabase(id)
        return { ok: true as const }
      }
      if (current.payment !== 'transfer') {
        return { ok: false as const, reason: 'Not a transfer order.' }
      }
      if (current.status === 'cancelled') {
        return { ok: false as const, reason: 'Order is cancelled.' }
      }
      if (
        current.paymentState === 'transfer_confirmed' ||
        current.paymentState === 'released'
      ) {
        return { ok: false as const, reason: 'Payment already confirmed.' }
      }

      updateOrder(id, (o) => {
        if (o.payment !== 'transfer') {
          result = { ok: false, reason: 'Not a transfer order.' }
          return o
        }
        if (o.status === 'cancelled') {
          result = { ok: false, reason: 'Order is cancelled.' }
          return o
        }
        if (
          o.paymentState === 'transfer_confirmed' ||
          o.paymentState === 'released'
        ) {
          result = { ok: false, reason: 'Payment already confirmed.' }
          return o
        }
        return {
          ...o,
          paymentState: 'transfer_seen',
          notes: [
            ...o.notes,
            note(
              'Buyer marked transfer as sent — waiting for ops confirmation.',
            ),
          ],
        }
      })

      // Guests cannot UPDATE — prefer RPC when available
      void claimTransferPaidInSupabase(id).then((cloud) => {
        if (!cloud.ok) {
          console.warn(
            'claim_transfer_paid RPC failed (ops update may still work if signed in):',
            cloud.reason,
          )
        }
      })

      return result
    },
    [updateOrder],
  )

  const confirmTransfer = useCallback(async (id: string) => {
    const current = ordersRef.current.find((o) => o.id === id)
    if (!current) {
      return { ok: false as const, reason: 'Order not found in ops inbox.' }
    }
    if (current.payment !== 'transfer') {
      return { ok: false as const, reason: 'Not a transfer order.' }
    }
    if (current.status === 'cancelled') {
      return { ok: false as const, reason: 'Order is cancelled.' }
    }

    const updated: OpsOrder = {
      ...current,
      paymentState: 'transfer_confirmed',
      escrowState: 'held',
      notes: [
        ...current.notes,
        note(
          current.fulfillment === 'pickup'
            ? 'Transfer confirmed in escrow. Safe to tell kitchen to start.'
            : 'Transfer confirmed in escrow. Safe to assign rider / start kitchen after rider accepts.',
        ),
      ],
    }

    const cloud = await updateOrderInSupabase(id, opsOrderToPatch(updated))
    if (!cloud.ok) {
      return {
        ok: false as const,
        reason: cloud.reason || 'Cloud update failed — transfer was not confirmed.',
      }
    }

    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)))
    syncBuyerOrder(updated)
    return { ok: true as const }
  }, [])

  const setPaymentState = useCallback(
    (id: string, state: OpsOrder['paymentState']) => {
      updateOrder(id, (o) => ({ ...o, paymentState: state }))
    },
    [updateOrder],
  )

  const flagProblem = useCallback(
    (id: string, reason: string) => {
      updateOrder(id, (o) => ({
        ...o,
        hasProblem: true,
        problemReason: reason,
        notes: [...o.notes, note(`Problem flagged: ${reason}`)],
      }))
    },
    [updateOrder],
  )

  const clearProblem = useCallback(
    (id: string) => {
      updateOrder(id, (o) => ({
        ...o,
        hasProblem: false,
        problemReason: null,
        notes: [...o.notes, note('Problem cleared.')],
      }))
    },
    [updateOrder],
  )

  const addNote = useCallback(
    (id: string, text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      updateOrder(id, (o) => ({
        ...o,
        notes: [...o.notes, note(trimmed)],
      }))
    },
    [updateOrder],
  )

  const value = useMemo(
    () => ({
      authReady,
      authenticated,
      user,
      login,
      logout,
      orders,
      ordersLoading,
      ordersError,
      refreshOrders,
      getOrder,
      ingestPlacedOrder,
      setStatus,
      setVendorConfirmed,
      assignRider,
      markPreparing,
      markReadyForPickup,
      validatePickup,
      markOnTheWay,
      markDelivered,
      cancelOrder,
      claimTransferPaid,
      confirmTransfer,
      setPaymentState,
      flagProblem,
      clearProblem,
      addNote,
      riders,
      ridersLoading,
      ridersError,
      refreshRiders,
    }),
    [
      authReady,
      authenticated,
      user,
      login,
      logout,
      orders,
      ordersLoading,
      ordersError,
      refreshOrders,
      getOrder,
      ingestPlacedOrder,
      setStatus,
      setVendorConfirmed,
      assignRider,
      markPreparing,
      markReadyForPickup,
      validatePickup,
      markOnTheWay,
      markDelivered,
      cancelOrder,
      claimTransferPaid,
      confirmTransfer,
      setPaymentState,
      flagProblem,
      clearProblem,
      addNote,
      riders,
      ridersLoading,
      ridersError,
      refreshRiders,
    ],
  )

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>
}

export function useOps() {
  const ctx = useContext(OpsContext)
  if (!ctx) throw new Error('useOps must be used within OpsProvider')
  return ctx
}
