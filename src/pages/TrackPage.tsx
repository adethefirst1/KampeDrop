import { Link, useParams, useSearchParams } from 'react-router-dom'
import { appPath } from '../paths'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { OrderLayout, GuaranteePill } from '../components/layout'
import { PaystackPayPanel } from '../components/PaystackPayPanel'
import { OrderReceiptSheet } from '../components/OrderReceipt'
import { HelpGuaranteePanel } from '../components/HelpGuaranteePanel'
import { AnimatedCheck, SecureSeal } from '../components/motion'
import {
  loadOrder,
  useCart,
  type OrderStatus,
  type PlacedOrder,
} from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import { useOps } from '../context/OpsContext'
import {
  canCancelOrder,
  feelForStatus,
  getRider,
  labelForStatus,
  pipelineFor,
  statusRank,
  furtherStatus,
} from '../data/ops'
import { fetchOrderById, type CloudOrder } from '../lib/ordersApi'
import { verifyPaystackPayment } from '../lib/paystackApi'
import { formatNaira } from '../data/vendors'
import { easeOut, springSnap } from '../motion/tokens'

const TRACK_POLL_MS = 4000
const TRACK_POLL_FAST_MS = 2000

function isPaystackPaid(state: string | undefined): boolean {
  return (
    state === 'card_paid' ||
    state === 'transfer_confirmed' ||
    state === 'released'
  )
}

function isPaystackPending(state: string | undefined): boolean {
  return (
    state === 'card_pending' ||
    state === 'transfer_pending' ||
    state === 'transfer_seen' ||
    state === 'card_failed' ||
    !state
  )
}

export function TrackPage() {
  const { orderId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { lastOrder } = useCart()
  const { getVendor } = useCatalog()
  const { getOrder: getOpsOrder, cancelOrder, flagProblem } =
    useOps()
  const reduce = useReducedMotion()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cloudOrder, setCloudOrder] = useState<CloudOrder | null>(null)
  const [cloudLoading, setCloudLoading] = useState(Boolean(orderId))
  const [cloudTried, setCloudTried] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const verifyStarted = useRef(false)

  const paystackRef =
    searchParams.get('reference')?.trim() ||
    searchParams.get('trxref')?.trim() ||
    ''

  const opsOrder = orderId ? getOpsOrder(orderId) : undefined
  const stored = useMemo(() => {
    if (!orderId) return null
    return loadOrder(orderId)
  }, [orderId, opsOrder, cloudOrder])

  // Prefer Supabase RPC; poll so status + payment_state stay live for guests.
  // Also re-pull when the tab becomes visible — background timers are throttled.
  useEffect(() => {
    if (!orderId) {
      setCloudOrder(null)
      setCloudLoading(false)
      setCloudTried(true)
      return
    }

    let cancelled = false
    let isFirst = true
    let timer: number | null = null
    setCloudLoading(true)
    setCloudTried(false)
    setCloudOrder(null)

    async function pull() {
      const result = await fetchOrderById(orderId!)
      if (cancelled) return
      if (result.ok) {
        setCloudOrder(result.order)
        try {
          sessionStorage.setItem(
            `kampedrop-order-${orderId}`,
            JSON.stringify(result.order),
          )
        } catch {
          /* ignore */
        }
      } else if (isFirst) {
        setCloudOrder(null)
        console.warn(
          'Track: cloud fetch failed, using local fallback:',
          result.reason,
        )
      }
      if (isFirst) {
        setCloudLoading(false)
        setCloudTried(true)
        isFirst = false
      }
    }

    function startPolling(ms: number) {
      if (timer != null) window.clearInterval(timer)
      timer = window.setInterval(() => {
        if (document.visibilityState === 'visible') void pull()
      }, ms)
    }

    function onVisible() {
      if (document.visibilityState !== 'visible') return
      void pull()
      startPolling(TRACK_POLL_MS)
    }

    void pull()
    startPolling(TRACK_POLL_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      cancelled = true
      if (timer != null) window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [orderId])

  // After Paystack redirect (?reference= / ?trxref=), verify server-side once.
  // Also verify when Track opens unpaid — webhook may lag, and local Track often
  // has no query params (Paystack used to callback only to production).
  useEffect(() => {
    if (!orderId) return

    let cancelled = false

    async function confirm(reference?: string, force = false) {
      if (!force && verifyStarted.current && !reference) return
      if (reference) verifyStarted.current = true
      setConfirmingPayment(true)

      const verified = await verifyPaystackPayment({
        orderId: orderId!,
        reference: reference || undefined,
      })
      if (cancelled) return

      const refreshed = await fetchOrderById(orderId!)
      if (cancelled) return
      if (refreshed.ok) {
        if (
          verified.ok &&
          verified.paid &&
          !isPaystackPaid(refreshed.order.paymentState) &&
          verified.paymentState
        ) {
          setCloudOrder({
            ...refreshed.order,
            paymentState:
              verified.paymentState as CloudOrder['paymentState'],
          })
        } else {
          setCloudOrder(refreshed.order)
        }
      }

      setConfirmingPayment(false)

      if (reference) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.delete('reference')
            next.delete('trxref')
            return next
          },
          { replace: true },
        )
      }

      return verified
    }

    if (paystackRef && !verifyStarted.current) {
      void confirm(paystackRef, true)
    }

    return () => {
      cancelled = true
    }
  }, [orderId, paystackRef, setSearchParams])

  // While still pending, keep asking Paystack (uses stored paystack_reference).
  useEffect(() => {
    if (!orderId || !cloudOrder) return
    if (cloudOrder.payment !== 'card' && cloudOrder.payment !== 'transfer') return
    if (!isPaystackPending(cloudOrder.paymentState)) return
    if (isPaystackPaid(cloudOrder.paymentState)) return

    let cancelled = false

    async function tick() {
      const verified = await verifyPaystackPayment({ orderId: orderId! })
      if (cancelled) return
      if (verified.ok && verified.paid) {
        const refreshed = await fetchOrderById(orderId!)
        if (cancelled) return
        if (refreshed.ok) {
          setCloudOrder({
            ...refreshed.order,
            paymentState: (verified.paymentState ||
              refreshed.order.paymentState) as CloudOrder['paymentState'],
          })
        } else {
          setCloudOrder((prev) =>
            prev
              ? {
                  ...prev,
                  paymentState:
                    verified.paymentState as CloudOrder['paymentState'],
                }
              : prev,
          )
        }
        setConfirmingPayment(false)
        return
      }
      const refreshed = await fetchOrderById(orderId!)
      if (cancelled) return
      if (refreshed.ok) setCloudOrder(refreshed.order)
    }

    const boot = window.setTimeout(() => void tick(), 600)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void tick()
    }, TRACK_POLL_FAST_MS)

    return () => {
      cancelled = true
      window.clearTimeout(boot)
      window.clearInterval(timer)
    }
  }, [orderId, cloudOrder?.payment, cloudOrder?.paymentState])

  useEffect(() => {
    if (!confirmingPayment) return
    if (isPaystackPaid(cloudOrder?.paymentState)) {
      setConfirmingPayment(false)
    }
  }, [confirmingPayment, cloudOrder?.paymentState])

  const localFallback: PlacedOrder | null = useMemo(() => {
    if (!orderId) return null
    if (opsOrder) {
      return {
        id: opsOrder.id,
        createdAt: opsOrder.createdAt,
        customerName: opsOrder.customerName,
        phone: opsOrder.phone,
        address: opsOrder.address,
        note: opsOrder.note,
        payment: opsOrder.payment,
        fulfillment: opsOrder.fulfillment ?? 'delivery',
        lines: opsOrder.lines,
        deliveryFee: opsOrder.deliveryFee,
        subtotal: opsOrder.subtotal,
        total: opsOrder.total,
        status: opsOrder.status,
        passkey: opsOrder.passkey,
        escrowState: opsOrder.escrowState,
        cancelledAt: opsOrder.cancelledAt,
        cancelReason: opsOrder.cancelReason,
        placeName: opsOrder.placeName,
        placeId: opsOrder.placeId,
        placeLat: opsOrder.placeLat,
        placeLng: opsOrder.placeLng,
      }
    }
    if (stored) return stored
    if (lastOrder?.id === orderId) return lastOrder
    return null
  }, [orderId, stored, lastOrder, opsOrder])

  const baseOrder: PlacedOrder | null = cloudOrder ?? localFallback

  const status: OrderStatus = useMemo(() => {
    const fromCloud = cloudOrder?.status
    const fromOps = opsOrder?.status
    const fromLocal = localFallback?.status
    // Cloud wins when present; merge forward with local ops if ops is ahead
    // (ops may not write to Supabase yet during dual-write).
    if (fromCloud && fromOps) return furtherStatus(fromCloud, fromOps)
    if (fromCloud) return fromCloud
    if (fromOps && fromLocal) return furtherStatus(fromOps, fromLocal)
    return fromOps ?? fromLocal ?? 'finding_rider'
  }, [cloudOrder?.status, opsOrder?.status, localFallback?.status])

  useEffect(() => {
    if (!orderId || !opsOrder) return
    try {
      const raw = sessionStorage.getItem(`kampedrop-order-${orderId}`)
      if (!raw) {
        if (baseOrder) {
          sessionStorage.setItem(
            `kampedrop-order-${orderId}`,
            JSON.stringify(baseOrder),
          )
        }
        return
      }
      const buyer = JSON.parse(raw) as PlacedOrder
      const nextStatus = furtherStatus(buyer.status, opsOrder.status)
      sessionStorage.setItem(
        `kampedrop-order-${orderId}`,
        JSON.stringify({
          ...buyer,
          ...opsOrder,
          status: nextStatus,
        }),
      )
    } catch {
      /* ignore */
    }
  }, [orderId, opsOrder, baseOrder])

  const order: PlacedOrder | null = useMemo(() => {
    if (!baseOrder) return null
    return {
      ...baseOrder,
      fulfillment: baseOrder.fulfillment ?? 'delivery',
      status,
      passkey: opsOrder?.passkey ?? baseOrder.passkey,
      escrowState:
        cloudOrder?.escrowState ??
        opsOrder?.escrowState ??
        baseOrder.escrowState,
    }
  }, [baseOrder, status, opsOrder, cloudOrder?.escrowState])

  const paymentState =
    cloudOrder?.paymentState ?? opsOrder?.paymentState ?? undefined

  const fulfillment = order?.fulfillment ?? 'delivery'
  const pickup = fulfillment === 'pickup'
  const pipe = pipelineFor(fulfillment)
  const vendor = getVendor(order?.lines[0]?.vendorId ?? '')
  const rider = getRider(cloudOrder?.riderId ?? opsOrder?.riderId ?? null)
  const cancelled = status === 'cancelled'
  const delivered = status === 'delivered'
  const activeIndex = cancelled ? -1 : statusRank(status, fulfillment)
  const feel = feelForStatus(status, fulfillment)
  const showCancel = order ? canCancelOrder(status, fulfillment) : false

  if (cloudLoading && !localFallback) {
    return (
      <OrderLayout>
        <div className="py-16 text-center">
          <p className="text-sm font-semibold text-muted">Loading order…</p>
        </div>
      </OrderLayout>
    )
  }

  if (cloudTried && !order) {
    return (
      <OrderLayout>
        <div className="py-16 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
            Order not found
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted">
            This link may be from another phone or browser. Place a new order, or
            call KampeDrop with your order ID.
          </p>
          <Link to={appPath()} className="btn-primary mt-8 inline-flex">
            Browse vendors
          </Link>
        </div>
      </OrderLayout>
    )
  }

  if (!order) {
    return (
      <OrderLayout>
        <div className="py-16 text-center">
          <p className="text-sm font-semibold text-muted">Loading order…</p>
        </div>
      </OrderLayout>
    )
  }

  function onCancel() {
    if (!order) return
    setCancelBusy(true)
    setCancelError(null)
    const result = cancelOrder(order.id, 'Cancelled by buyer')
    setCancelBusy(false)
    if (!result.ok) {
      setCancelError(result.reason)
      return
    }
    setCancelOpen(false)
  }

  return (
    <OrderLayout>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Order {order.id}
          </p>
          <AnimatePresence mode="wait">
            <motion.h1
              key={cancelled ? 'x' : delivered ? 'done' : 'live'}
              className="mt-2 font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.03em]"
              initial={reduce ? false : { opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.45, ease: easeOut }}
            >
              {cancelled
                ? 'Order cancelled'
                : delivered
                  ? pickup
                    ? 'Collected.'
                    : 'It’s secured.'
                  : status === 'finding_rider'
                    ? 'Finding your rider'
                    : status === 'ready_for_pickup'
                      ? 'Ready for pickup'
                      : pickup
                        ? 'Pickup in progress'
                        : 'We’re on it.'}
            </motion.h1>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p
              key={feel}
              className="mt-2 text-base font-medium text-lagoon-deep"
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.35 }}
            >
              {feel}
            </motion.p>
          </AnimatePresence>
          <p className="mt-2 text-sm text-muted">
            {vendor?.name ?? 'Vendor'} · for {order.customerName.split(' ')[0]}
          </p>
        </div>
        {delivered && <SecureSeal />}
      </div>

      {cancelled && (
        <div className="mt-5 rounded-2xl bg-mist px-4 py-3 text-sm text-ink-soft">
          {order.cancelReason ?? 'Cancelled.'}
          {order.payment === 'transfer' && order.escrowState === 'refunded'
            ? ' Your payment has been refunded from escrow.'
            : null}
        </div>
      )}

      {!cancelled && (
        <div className="mt-8 overflow-hidden rounded-[1.75rem] bg-ink p-5 text-white">
          <ol>
            {pipe.map((step, i) => {
              const done = i <= activeIndex
              const current = status === step
              return (
                <li key={step} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < pipe.length - 1 && (
                    <span
                      className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 bg-white/15"
                      aria-hidden
                    >
                      <motion.span
                        className="absolute inset-x-0 top-0 origin-top bg-lagoon"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: i < activeIndex ? 1 : 0 }}
                        transition={{ duration: 0.55, ease: easeOut }}
                        style={{ height: '100%', display: 'block' }}
                      />
                    </span>
                  )}
                  <motion.span
                    className={`relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      done ? 'bg-lagoon text-white' : 'bg-white/10 text-white/40'
                    }`}
                    animate={
                      current && !delivered && !reduce
                        ? {
                            scale: [1, 1.12, 1],
                            boxShadow: [
                              '0 0 0 0 rgba(26,122,100,0.5)',
                              '0 0 0 10px rgba(26,122,100,0)',
                              '0 0 0 0 rgba(26,122,100,0)',
                            ],
                          }
                        : { scale: 1 }
                    }
                    transition={
                      current && !delivered
                        ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                        : springSnap
                    }
                  >
                    {done ? <AnimatedCheck active={done} /> : i + 1}
                  </motion.span>
                  <div className="min-w-0">
                    <p className={`font-semibold ${done ? 'text-white' : 'text-white/40'}`}>
                      {labelForStatus(step, fulfillment)}
                    </p>
                    {current && (
                      <p className="mt-0.5 text-sm text-white/55">
                        {feelForStatus(step, fulfillment)}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {!cancelled && !delivered && (
        <div className="mt-5 rounded-[1.5rem] bg-paper p-4 ring-1 ring-line">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-lagoon">
            {pickup ? 'Collection passkey' : 'Pickup passkey'}
          </p>
          <p className="mt-2 font-display text-4xl font-semibold tracking-[0.2em]">
            {order.passkey}
          </p>
          <p className="mt-2 text-sm text-muted">
            {pickup
              ? 'Show this code at the vendor when you collect. That vendor handoff releases escrow — not door arrival.'
              : 'Share this only when the rider picks up at the vendor. That handoff releases escrow; door delivery stays tracked after.'}
          </p>
        </div>
      )}

      {rider && !cancelled && !pickup && (
        <div className="mt-4 rounded-2xl bg-mist px-4 py-3 text-sm">
          <span className="font-semibold">Rider:</span> {rider.name} · {rider.area}
        </div>
      )}

      {(order.payment === 'transfer' || order.payment === 'card') && !cancelled && (
        <PaystackPayPanel
          order={{
            id: order.id,
            total: order.total,
            payment: order.payment,
            paymentState: paymentState ?? (order.payment === 'card' ? 'card_pending' : 'transfer_pending'),
          }}
          confirming={confirmingPayment || Boolean(paystackRef)}
          phone={order.phone}
          onViewReceipt={() => setReceiptOpen(true)}
          onRetryRefresh={() => {
            void (async () => {
              const verified = await verifyPaystackPayment({ orderId: order.id })
              const refreshed = await fetchOrderById(order.id)
              if (refreshed.ok) {
                if (
                  verified.ok &&
                  verified.paid &&
                  verified.paymentState &&
                  !isPaystackPaid(refreshed.order.paymentState)
                ) {
                  setCloudOrder({
                    ...refreshed.order,
                    paymentState:
                      verified.paymentState as CloudOrder['paymentState'],
                  })
                } else {
                  setCloudOrder(refreshed.order)
                }
              }
            })()
          }}
        />
      )}

      <OrderReceiptSheet
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        order={order}
        vendorName={vendor?.name ?? 'Vendor'}
        category={vendor?.category ?? 'food'}
      />

      {order.payment === 'transfer' && order.escrowState === 'refunded' && (
        <div className="mt-4 rounded-2xl border border-line bg-mist px-4 py-3 text-sm text-muted">
          Transfer refunded — you won’t be charged for this order.
        </div>
      )}

      <div className="mt-5">
        <GuaranteePill />
      </div>

      <HelpGuaranteePanel
        orderId={order.id}
        status={status}
        alreadyFlagged={cloudOrder?.hasProblem || opsOrder?.hasProblem}
        onReport={(reason) => flagProblem(order.id, reason)}
      />

      <div className="mt-5 rounded-3xl bg-paper p-4 ring-1 ring-line">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
          {pickup ? 'Collecting at' : 'Delivering to'}
        </p>
        {order.placeName && (
          <p className="mt-2 font-semibold text-lagoon">{order.placeName}</p>
        )}
        <p className={`font-semibold ${order.placeName ? 'mt-0.5 text-sm text-ink-soft' : 'mt-2'}`}>
          {order.address}
        </p>
        <p className="mt-1 text-sm text-muted">{order.phone}</p>
        {order.note && (
          <p className="mt-2 rounded-xl bg-mist px-3 py-2 text-sm text-ink-soft">
            Note: {order.note}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-3xl bg-paper p-4 ring-1 ring-line">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Your items</p>
        <ul className="mt-3 space-y-2">
          {order.lines.map((line) => (
            <li key={line.item.id} className="flex justify-between gap-3 text-sm">
              <span>
                {line.qty}× {line.item.name}
              </span>
              <span className="font-semibold">
                {formatNaira(line.item.price * line.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
          <span className="text-muted">
            {pickup ? 'Pickup' : 'Delivery'} ·{' '}
            {order.payment === 'cod'
              ? pickup
                ? 'Pay at vendor'
                : 'Cash on delivery'
              : order.payment === 'card'
                ? 'Card'
                : 'Transfer'}{' '}
            · total
          </span>
          <span className="font-display text-lg font-semibold">
            {formatNaira(order.total)}
          </span>
        </div>
      </div>

      {showCancel && (
        <div className="mt-6">
          {!cancelOpen ? (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="w-full rounded-2xl border border-line bg-paper py-3.5 text-sm font-bold text-muted"
            >
              Cancel order
            </button>
          ) : (
            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                {pickup
                  ? 'Cancel before the kitchen starts? Full refund if you paid by transfer. Once preparing begins, cancel is locked.'
                  : 'Cancel while we find a rider? Full refund if you paid by transfer. Once a rider accepts, the kitchen can start and cancel is locked.'}
              </p>
              {cancelError && (
                <p className="mt-2 text-sm font-semibold text-red-700">{cancelError}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={cancelBusy}
                  onClick={onCancel}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  Confirm cancel
                </button>
                <button
                  type="button"
                  onClick={() => setCancelOpen(false)}
                  className="rounded-xl bg-paper px-4 py-2 text-sm font-bold ring-1 ring-line"
                >
                  Keep order
                </button>
              </div>
            </div>
          )}
          <p className="mt-2 text-center text-xs text-muted">
            {pickup
              ? 'After the kitchen starts, this order can’t be cancelled.'
              : 'After a rider accepts, this order can’t be cancelled.'}
          </p>
        </div>
      )}

      <Link
        to={appPath()}
        className="mt-8 block text-center text-sm font-semibold text-lagoon hover:underline"
      >
        Order again
      </Link>
    </OrderLayout>
  )
}
