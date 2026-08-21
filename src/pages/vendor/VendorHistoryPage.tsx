import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { toPng } from 'html-to-image'
import { useVendor } from '../../context/VendorContext'
import { labelForStatus } from '../../data/ops'
import { formatNaira } from '../../data/vendors'
import { SITE } from '../../data/site'
import {
  getVendorOrderHistory,
  type VendorPortalOrder,
} from '../../lib/vendorsApi'
import { springSoft } from '../../motion/tokens'
import { vendorPath } from './VendorShell'

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-NG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function paymentLabel(payment: VendorPortalOrder['payment']) {
  if (payment === 'card') return 'Card'
  if (payment === 'transfer') return 'Bank transfer'
  return 'Pay later'
}

async function shareReceiptPng(node: HTMLElement, orderId: string) {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#f3f8f6',
  })
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], `kampedrop-${orderId}.png`, {
    type: 'image/png',
  })

  const canShareFiles =
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })

  if (canShareFiles) {
    await navigator.share({
      files: [file],
      title: `Receipt ${orderId}`,
      text: `${SITE.name} receipt · ${orderId}`,
    })
    return
  }

  // Fallback: download the PNG
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `kampedrop-${orderId}.png`
  a.click()
}

/** Compact receipt sheet — details only appear here, shareable as PNG. */
function HistoryOrderSheet({
  order,
  vendorName,
  open,
  onClose,
}: {
  order: VendorPortalOrder | null
  vendorName: string
  open: boolean
  onClose: () => void
}) {
  const reduce = useReducedMotion()
  const receiptRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  if (!order) return null

  const pickup = order.fulfillment === 'pickup'
  const orderId = order.id

  async function onShare() {
    if (!receiptRef.current) return
    setSharing(true)
    setShareError(null)
    try {
      await shareReceiptPng(receiptRef.current, orderId)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        /* user cancelled share sheet */
      } else {
        setShareError('Couldn’t share the receipt. Try again.')
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-order-title"
            className="relative z-10 flex max-h-[88svh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] border-[3px] border-ink bg-paper shadow-[0_-8px_40px_rgba(6,24,28,0.25)] sm:rounded-[1.75rem]"
            initial={reduce ? false : { y: 40, opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: 28, opacity: 0 }}
            transition={springSoft}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-lagoon">
                Receipt
              </p>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink-soft"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {/* Captured node — keep solid backgrounds for clean PNG */}
              <div
                ref={receiptRef}
                className="rounded-2xl bg-[#f3f8f6] px-4 py-5 text-[#06181c]"
              >
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0c6560]">
                  {SITE.name} · {vendorName}
                </p>
                <h2
                  id="history-order-title"
                  className="mt-1.5 font-display text-xl font-bold tracking-[-0.03em]"
                >
                  {labelForStatus(order.status, order.fulfillment)}
                </h2>
                <p className="mt-1 font-mono text-xs text-[#4a6562]">{order.id}</p>
                <p className="mt-0.5 text-xs font-semibold text-[#4a6562]">
                  {formatWhen(order.createdAt)}
                </p>

                <div className="mt-4 space-y-0.5 text-sm">
                  <p className="font-semibold">{order.customerName}</p>
                  <p className="text-[#4a6562]">{order.phone}</p>
                  <p className="text-[#4a6562]">
                    {pickup ? 'Pickup' : 'Delivery'} ·{' '}
                    {paymentLabel(order.payment)}
                  </p>
                  {(order.placeName || order.address) && (
                    <p className="pt-1 text-sm">
                      {pickup ? 'Collect at' : 'Delivered to'}{' '}
                      <span className="font-semibold">
                        {order.placeName || order.address}
                      </span>
                      {order.placeName && order.address ? (
                        <span className="mt-0.5 block text-xs text-[#4a6562]">
                          {order.address}
                        </span>
                      ) : null}
                    </p>
                  )}
                </div>

                <div className="my-4 border-t border-dashed border-[#c5d9d5]" />

                <ul className="space-y-2">
                  {order.lines.map((line) => (
                    <li
                      key={line.item.id}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 font-semibold">
                        {line.qty}× {line.item.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-[#0f2e34]">
                        {formatNaira(line.item.price * line.qty)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="my-4 border-t border-dashed border-[#c5d9d5]" />

                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3 text-[#4a6562]">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">
                      {formatNaira(order.subtotal)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 text-[#4a6562]">
                    <dt>{pickup ? 'Pickup' : 'Delivery'}</dt>
                    <dd className="tabular-nums">
                      {order.deliveryFee === 0
                        ? 'Free'
                        : formatNaira(order.deliveryFee)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 pt-1 font-display text-lg font-semibold tracking-[-0.02em]">
                    <dt>Total</dt>
                    <dd className="tabular-nums text-[#0c6560]">
                      {formatNaira(order.total)}
                    </dd>
                  </div>
                </dl>

                <p className="mt-5 text-center font-display text-sm font-semibold text-[#4a6562]">
                  {SITE.name} · Badagry · kampe
                </p>
              </div>

              {shareError && (
                <p className="mt-3 text-center text-xs font-semibold text-mango-deep">
                  {shareError}
                </p>
              )}
            </div>

            <div className="border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                className="btn-primary w-full"
                disabled={sharing}
                onClick={() => void onShare()}
              >
                {sharing ? 'Preparing image…' : 'Share receipt'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Successful orders list — summary cards; details only in the receipt popup. */
export function VendorHistoryPage() {
  const { accessToken, vendorName } = useVendor()
  const [orders, setOrders] = useState<VendorPortalOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<VendorPortalOrder | null>(null)

  const load = useCallback(async () => {
    if (!accessToken) {
      setOrders([])
      setLoading(false)
      setError('Not signed in.')
      return
    }
    setLoading(true)
    setError(null)
    const result = await getVendorOrderHistory(accessToken)
    if (!result.ok) {
      setError(result.reason)
      setOrders([])
      setLoading(false)
      return
    }
    setOrders(result.orders.filter((o) => o.status === 'delivered'))
    setLoading(false)
  }, [accessToken])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">
            History
          </h1>
          <p className="mt-1 text-sm text-muted">
            Successful orders — tap for receipt.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <p className="mt-3 text-xs font-semibold text-muted">
        <Link to={vendorPath()} className="text-lagoon hover:underline">
          ← Open orders
        </Link>
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
          {error}
        </p>
      )}

      {loading && !orders.length && (
        <p className="mt-8 text-sm font-semibold text-muted">Loading history…</p>
      )}

      {!loading && !orders.length && !error && (
        <div className="mt-8 rounded-[1.5rem] border-[3px] border-dashed border-ink/20 bg-paper px-5 py-10 text-center">
          <p className="font-display text-xl font-semibold">No past orders yet</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            When an order is collected, it shows up here.
          </p>
        </div>
      )}

      <ul className="mt-6 space-y-2.5">
        {orders.map((order) => (
          <li key={order.id}>
            <button
              type="button"
              onClick={() => setSelected(order)}
              className="w-full rounded-2xl bg-paper p-4 text-left ring-1 ring-line transition hover:ring-lagoon/40 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-extrabold text-ink">{order.id}</p>
                  <p className="mt-0.5 text-xs font-semibold text-muted">
                    {formatWhen(order.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-extrabold">{formatNaira(order.total)}</p>
                  <p className="mt-1 text-[11px] font-bold text-lagoon">
                    {labelForStatus(order.status, order.fulfillment)}
                  </p>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <HistoryOrderSheet
        order={selected}
        vendorName={vendorName ?? 'Vendor'}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
