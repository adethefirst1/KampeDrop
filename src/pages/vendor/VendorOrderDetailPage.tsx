import { Link, Navigate, useParams } from 'react-router-dom'
import { useVendor } from '../../context/VendorContext'
import { labelForStatus } from '../../data/ops'
import { formatNaira } from '../../data/vendors'
import { vendorPath } from './VendorShell'

export function VendorOrderDetailPage() {
  const { orderId } = useParams()
  const {
    getOrder,
    acceptOrder,
    rejectOrder,
    markPreparing,
    markReady,
  } = useVendor()
  const order = getOrder(orderId ?? '')

  if (!order) {
    return (
      <div className="py-12 text-center">
        <p className="font-display text-xl font-semibold">Order not found</p>
        <Link to={vendorPath()} className="mt-4 inline-flex text-sm font-bold text-lagoon">
          ← Back to orders
        </Link>
      </div>
    )
  }

  // Guard: only this vendor's orders (getOrder is global list — filter by session)
  const { vendorId } = useVendor()
  if (order.vendorId !== vendorId) {
    return <Navigate to={vendorPath()} replace />
  }

  const terminal = order.status === 'cancelled' || order.status === 'delivered'
  const canAccept = !terminal && !order.vendorConfirmed
  const canPrep = !terminal && order.vendorConfirmed && order.status !== 'preparing' && !order.kitchenReady
  const canReady =
    !terminal &&
    order.vendorConfirmed &&
    !order.kitchenReady &&
    order.status !== 'ready_for_pickup' &&
    order.status !== 'picked_up' &&
    order.status !== 'on_the_way'

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
        {order.kitchenReady && order.fulfillment === 'delivery' ? ' · Ready for rider' : ''}
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

      {!terminal && (
        <div className="mt-8 space-y-2">
          {canAccept && (
            <>
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => acceptOrder(order.id)}
              >
                Accept order
              </button>
              <button
                type="button"
                className="w-full rounded-full border-2 border-ink/15 bg-paper py-3 text-sm font-extrabold text-ink-soft"
                onClick={() => {
                  if (window.confirm('Reject this order? Buyer will see it cancelled.')) {
                    rejectOrder(order.id)
                  }
                }}
              >
                Reject
              </button>
            </>
          )}
          {canPrep && (
            <button
              type="button"
              className="btn-ink w-full"
              onClick={() => markPreparing(order.id)}
            >
              Mark preparing
            </button>
          )}
          {canReady && (
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => markReady(order.id)}
            >
              {order.fulfillment === 'pickup' ? 'Ready for pickup' : 'Ready for rider'}
            </button>
          )}
          {order.vendorConfirmed && order.status === 'preparing' && !order.kitchenReady && (
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => markReady(order.id)}
            >
              {order.fulfillment === 'pickup' ? 'Ready for pickup' : 'Ready for rider'}
            </button>
          )}
        </div>
      )}

      {order.status === 'cancelled' && (
        <p className="mt-6 rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
          Cancelled{order.cancelReason ? ` — ${order.cancelReason}` : ''}
        </p>
      )}
    </div>
  )
}
