import { useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useVendor } from '../../context/VendorContext'
import { labelForStatus } from '../../data/ops'
import { formatNaira } from '../../data/vendors'
import { vendorPath } from './VendorShell'

export function VendorOrderDetailPage() {
  const { orderId } = useParams()
  const {
    getOrder,
    vendorId,
    markPreparing,
    markReadyForPickup,
    confirmHandoff,
  } = useVendor()
  const order = getOrder(orderId ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passkey, setPasskey] = useState('')
  const [handoffDone, setHandoffDone] = useState(false)

  if (!order) {
    return (
      <div className="py-12 text-center">
        <p className="font-display text-xl font-semibold">Order not found</p>
        <p className="mt-2 text-sm text-muted">
          It may have been handed off already, or isn’t on your board.
        </p>
        <Link to={vendorPath()} className="mt-4 inline-flex text-sm font-bold text-lagoon">
          ← Back to orders
        </Link>
      </div>
    )
  }

  if (order.vendorId !== vendorId) {
    return <Navigate to={vendorPath()} replace />
  }

  const orderIdSafe = order.id

  const terminal =
    order.status === 'cancelled' ||
    order.status === 'delivered' ||
    order.status === 'picked_up' ||
    order.status === 'on_the_way'

  // Pipeline: pickup confirmed→preparing; delivery rider_assigned→preparing
  const canStartPreparing =
    !terminal &&
    ((order.fulfillment === 'pickup' && order.status === 'confirmed') ||
      (order.fulfillment === 'delivery' && order.status === 'rider_assigned'))

  const canReadyForPickup =
    !terminal && order.fulfillment === 'pickup' && order.status === 'preparing'

  const canHandoff =
    !terminal &&
    !handoffDone &&
    ((order.fulfillment === 'pickup' &&
      (order.status === 'preparing' || order.status === 'ready_for_pickup')) ||
      (order.fulfillment === 'delivery' &&
        (order.status === 'rider_assigned' || order.status === 'preparing')))

  async function run(action: () => Promise<{ ok: true } | { ok: false; reason: string }>) {
    setBusy(true)
    setError(null)
    try {
      const result = await action()
      if (!result.ok) setError(result.reason)
    } finally {
      setBusy(false)
    }
  }

  async function onHandoff(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await confirmHandoff(orderIdSafe, passkey)
      if (!result.ok) {
        setError(result.reason)
        return
      }
      setHandoffDone(true)
      setPasskey('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Link to={vendorPath()} className="text-sm font-semibold text-muted hover:text-ink">
        ← Orders
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-[-0.03em]">
        {order.id}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {labelForStatus(order.status, order.fulfillment)}
        {handoffDone ? ' · Handoff confirmed' : ''}
      </p>

      <div className="mt-5 rounded-2xl bg-paper p-4 ring-1 ring-line">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Buyer</p>
        <p className="mt-1 font-bold">{order.customerName}</p>
        <a href={`tel:${order.phone}`} className="text-sm font-semibold text-lagoon">
          {order.phone}
        </a>
        <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
          {order.fulfillment === 'pickup' ? 'Pickup' : 'Deliver to'}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{order.address}</p>
        {order.note && (
          <p className="mt-3 rounded-xl bg-mist px-3 py-2 text-sm text-ink-soft">
            Note: {order.note}
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {order.lines.map((l) => (
          <li
            key={l.item.id}
            className="flex items-center justify-between rounded-xl bg-paper px-3 py-2.5 ring-1 ring-line"
          >
            <span className="text-sm font-semibold">
              {l.qty}× {l.item.name}
            </span>
            <span className="text-sm font-bold">{formatNaira(l.item.price * l.qty)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-right text-sm font-extrabold">
        Total {formatNaira(order.total)} · {order.payment}
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
          {error}
        </p>
      )}

      {!terminal && !handoffDone && (
        <div className="mt-8 space-y-2">
          {canStartPreparing && (
            <button
              type="button"
              className="btn-primary w-full"
              disabled={busy}
              onClick={() => void run(() => markPreparing(order.id))}
            >
              {busy ? 'Updating…' : 'Start preparing'}
            </button>
          )}

          {canReadyForPickup && (
            <button
              type="button"
              className="btn-ink w-full"
              disabled={busy}
              onClick={() => void run(() => markReadyForPickup(order.id))}
            >
              {busy ? 'Updating…' : 'Ready for pickup'}
            </button>
          )}

          {order.fulfillment === 'delivery' && order.status === 'finding_rider' && (
            <p className="rounded-xl bg-mist px-3 py-2 text-sm text-muted">
              Waiting for KampeDrop to assign a rider before you can start preparing.
            </p>
          )}

          {canHandoff && (
            <form
              onSubmit={onHandoff}
              className="mt-4 space-y-3 rounded-2xl border-[2px] border-dusk bg-paper p-4"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-lagoon">
                Confirm handoff
              </p>
              <p className="text-sm text-muted">
                {order.fulfillment === 'pickup'
                  ? 'Ask the buyer for their passkey when they collect.'
                  : 'Ask the rider (or buyer) for the passkey at handoff. This releases escrow for transfer orders.'}
              </p>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">
                  Passkey
                </span>
                <input
                  className="field mt-1.5 tracking-[0.25em]"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={busy}
                  required
                />
              </label>
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? 'Confirming…' : 'Confirm handoff'}
              </button>
            </form>
          )}
        </div>
      )}

      {(terminal || handoffDone) && order.status !== 'cancelled' && (
        <p className="mt-6 rounded-xl bg-lagoon/10 px-3 py-2 text-sm font-semibold text-lagoon">
          {handoffDone || order.status === 'delivered' || order.status === 'picked_up'
            ? 'Handoff complete.'
            : labelForStatus(order.status, order.fulfillment)}
        </p>
      )}

      {order.status === 'cancelled' && (
        <p className="mt-6 rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
          Cancelled{order.cancelReason ? ` — ${order.cancelReason}` : ''}
        </p>
      )}
    </div>
  )
}
