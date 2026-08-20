import { Link } from 'react-router-dom'
import { useVendor } from '../../context/VendorContext'
import { labelForStatus } from '../../data/ops'
import { formatNaira } from '../../data/vendors'
import { vendorPath } from './VendorShell'

function bucket(order: ReturnType<typeof useVendor>['ordersForVendor'][number]) {
  if (order.status === 'cancelled' || order.status === 'delivered') return 'done'
  if (order.status === 'picked_up' || order.status === 'on_the_way') return 'done'
  if (order.status === 'ready_for_pickup') return 'ready'
  if (order.status === 'preparing') return 'active'
  if (
    order.status === 'confirmed' ||
    order.status === 'finding_rider' ||
    order.status === 'rider_assigned'
  ) {
    return 'new'
  }
  if (!order.vendorConfirmed) return 'new'
  return 'active'
}

export function VendorOrdersPage() {
  const { ordersForVendor, ordersLoading, ordersError, refreshOrders } = useVendor()

  const newOrders = ordersForVendor.filter((o) => bucket(o) === 'new')
  const active = ordersForVendor.filter((o) => bucket(o) === 'active')
  const ready = ordersForVendor.filter((o) => bucket(o) === 'ready')

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">Orders</h1>
          <p className="mt-1 text-sm text-muted">
            Start preparing → ready (pickup) → confirm handoff with the buyer passkey.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold"
          onClick={() => void refreshOrders()}
          disabled={ordersLoading}
        >
          {ordersLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {ordersError && (
        <p className="mt-4 rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
          {ordersError}
        </p>
      )}

      {!ordersForVendor.length && !ordersLoading && (
        <div className="mt-8 rounded-[1.5rem] border-[3px] border-dashed border-ink/20 bg-paper px-5 py-10 text-center">
          <p className="font-display text-xl font-semibold">No open orders</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            When a buyer checks out from your shop, it lands here.
          </p>
        </div>
      )}

      {ordersLoading && !ordersForVendor.length && (
        <p className="mt-8 text-sm font-semibold text-muted">Loading orders…</p>
      )}

      <Section title="Incoming" items={newOrders} />
      <Section title="In kitchen" items={active} />
      <Section title="Ready for handoff" items={ready} />
    </div>
  )
}

function Section({
  title,
  items,
}: {
  title: string
  items: ReturnType<typeof useVendor>['ordersForVendor']
}) {
  if (!items.length) return null
  return (
    <section className="mt-8">
      <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-lagoon">
        {title}
      </h2>
      <ul className="mt-3 space-y-2.5">
        {items.map((order) => (
          <li key={order.id}>
            <Link
              to={vendorPath(`/orders/${order.id}`)}
              className="block rounded-2xl bg-paper p-4 ring-1 ring-line transition hover:ring-lagoon/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-extrabold text-ink">{order.id}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {order.customerName} · {order.fulfillment}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink-soft">
                    {order.lines.map((l) => `${l.qty}× ${l.item.name}`).join(', ')}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-extrabold">{formatNaira(order.total)}</p>
                  <p className="mt-1 text-[11px] font-bold text-lagoon">
                    {labelForStatus(order.status, order.fulfillment)}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
