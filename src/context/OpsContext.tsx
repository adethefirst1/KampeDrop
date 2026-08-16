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
  riders,
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
} from '../lib/ordersApi'
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
  refreshOrders: () => Promise<void>
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
  ) => { ok: true } | { ok: false; reason: string }
  markOnTheWay: (id: string) => void
  markDelivered: (id: string) => void
  cancelOrder: (
    id: string,
    reason: string,
  ) => { ok: true } | { ok: false; reason: string }
  claimTransferPaid: (id: string) => { ok: true } | { ok: false; reason: string }
  confirmTransfer: (id: string) => { ok: true } | { ok: false; reason: string }
  setPaymentState: (id: string, state: OpsOrder['paymentState']) => void
  flagProblem: (id: string, reason: string) => void
  clearProblem: (id: string) => void
  addNote: (id: string, text: string) => void
  riders: OpsRider[]
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
  const ordersRef = useRef(orders)
  ordersRef.current = orders

  const authenticated = Boolean(user)

  const refreshOrders = useCallback(async () => {
    if (!user) {
      setOrders([])
      return
    }
    setOrdersLoading(true)
    const result = await fetchAllOrdersFromSupabase()
    setOrdersLoading(false)
    if (!result.ok) {
      setOrdersError(result.reason)
      return
    }
    setOrdersError(null)
    setOrders((prev) => mergeNotes(prev, result.orders))
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

  // Load + poll orders while ops is signed in
  useEffect(() => {
    if (!user) {
      setOrders([])
      setOrdersError(null)
      return
    }
    void refreshOrders()
    const poll = window.setInterval(() => {
      void refreshOrders()
    }, 4000)
    return () => window.clearInterval(poll)
  }, [user, refreshOrders])

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
      sessionStorage.removeItem('suredrop-ops-auth')
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
      const rider = riders.find((r) => r.id === riderId)
      updateOrder(id, (o) => {
        if (o.fulfillment === 'pickup') return o
        if (o.status === 'cancelled' || o.status === 'delivered') return o
        if (!riderId) {
          if (
            o.status === 'preparing' ||
            o.status === 'picked_up' ||
            o.status === 'on_the_way'
          ) {
            return o
          }
          return {
            ...o,
            riderId: null,
            status: 'finding_rider',
            notes: [...o.notes, note('Rider cleared — back to finding rider.')],
          }
        }
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
              `Rider assigned: ${rider?.name ?? riderId}. Kitchen may start preparing.`,
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
    (id: string, passkey: string) => {
      let result: { ok: true } | { ok: false; reason: string } = { ok: true }
      updateOrder(id, (o) => {
        if (o.status === 'cancelled') {
          result = { ok: false, reason: 'Order is cancelled.' }
          return o
        }
        if (passkey.trim() !== o.passkey) {
          result = { ok: false, reason: 'Wrong passkey.' }
          return o
        }

        if (o.fulfillment === 'pickup') {
          if (o.status !== 'ready_for_pickup' && o.status !== 'preparing') {
            if (o.status === 'delivered') {
              result = { ok: false, reason: 'Already collected.' }
              return o
            }
            result = {
              ok: false,
              reason: 'Mark ready for pickup before collecting.',
            }
            return o
          }
          return {
            ...o,
            status: 'delivered',
            escrowState: o.payment === 'cod' ? 'cod' : 'released',
            paymentState: o.payment === 'cod' ? 'cod' : 'released',
            notes: [
              ...o.notes,
              note(
                o.payment === 'cod'
                  ? 'Passkey OK — customer collected. COD paid at vendor.'
                  : 'Passkey OK — customer collected. Escrow released to vendor.',
              ),
            ],
          }
        }

        if (!o.riderId) {
          result = { ok: false, reason: 'Assign a rider first.' }
          return o
        }
        if (o.status !== 'preparing' && o.status !== 'rider_assigned') {
          if (
            o.status === 'picked_up' ||
            o.status === 'on_the_way' ||
            o.status === 'delivered'
          ) {
            result = { ok: false, reason: 'Already picked up.' }
            return o
          }
          result = {
            ok: false,
            reason: 'Mark preparing (kitchen started) before pickup.',
          }
          return o
        }
        return {
          ...o,
          status: 'picked_up',
          escrowState: o.payment === 'cod' ? 'cod' : 'released',
          paymentState: o.payment === 'cod' ? 'cod' : 'released',
          notes: [
            ...o.notes,
            note(
              o.payment === 'cod'
                ? 'Passkey OK — picked up. COD: collect from buyer.'
                : 'Passkey OK — picked up. Escrow released to vendor (Paystack).',
            ),
          ],
        }
      })
      return result
    },
    [updateOrder],
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
                ? 'Cannot cancel after the kitchen starts. Use the SureDrop Guarantee if something is wrong.'
                : 'Cannot cancel after a rider accepts. Use the SureDrop Guarantee if something is wrong.',
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

  const confirmTransfer = useCallback(
    (id: string) => {
      let result: { ok: true } | { ok: false; reason: string } = { ok: true }
      updateOrder(id, (o) => {
        if (o.payment !== 'transfer') {
          result = { ok: false, reason: 'Not a transfer order.' }
          return o
        }
        if (o.status === 'cancelled') {
          result = { ok: false, reason: 'Order is cancelled.' }
          return o
        }
        return {
          ...o,
          paymentState: 'transfer_confirmed',
          escrowState: 'held',
          notes: [
            ...o.notes,
            note(
              o.fulfillment === 'pickup'
                ? 'Transfer confirmed in escrow. Safe to tell kitchen to start.'
                : 'Transfer confirmed in escrow. Safe to assign rider / start kitchen after rider accepts.',
            ),
          ],
        }
      })
      return result
    },
    [updateOrder],
  )

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
    ],
  )

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>
}

export function useOps() {
  const ctx = useContext(OpsContext)
  if (!ctx) throw new Error('useOps must be used within OpsProvider')
  return ctx
}
