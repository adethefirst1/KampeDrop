import { Link } from 'react-router-dom'
import { useVendor } from '../../context/VendorContext'
import { labelForStatus } from '../../data/ops'
import { formatNaira } from '../../data/vendors'
import { vendorPath } from './VendorShell'

function bucket(order: ReturnType<typeof useVendor>['ordersForVendor'][number]) {
  if (order.status === 'cancelled') return 'done'
  if (order.status === 'delivered') return 'done'
  if (!order.vendorConfirmed) return 'new'
  if (order.kitchenReady || order.status === 'ready_for_pickup') return 'ready'
  return 'active'
}

export function VendorOrdersPage() {
  const { ordersForVendor } = useVendor()

  const newOrders = ordersForVendor.filter((o) => bucket(o) === 'new')
  const active = ordersForVendor.filter((o) => bucket(o) === 'active')
  const ready = ordersForVendor.filter((o) => bucket(o) === 'ready')
  const done = ordersForVendor.filter((o) => bucket(o) === 'done').slice(0, 8)

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">Orders</h1>
      <p className="mt-1 text-sm text-muted">
        Accept → prepare → ready. KampeDrop still owns riders & escrow.
      </p>

      {!ordersForVendor.length && (
        <div className="mt-8 rounded-[1.5rem] border-[3px] border-dashed border-ink/20 bg-paper px-5 py-10 text-center">
          <p className="font-display text-xl font-semibold">No orders yet</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            When a buyer checks out from your shop, it lands here (and can ping WhatsApp later).
          </p>
        </div>
      )}

      <Section title="New" items={newOrders} empty={null} />
      <Section title="In kitchen" items={active} empty={null} />
      <Section title="Ready" items={ready} empty={null} />
      {done.length > 0 && <Section title="Recent" items={done} empty={null} />}
    </div>
  )
}

function Section({
  title,
  items,
}: {
  title: string
  items: ReturnType<typeof useVendor>['ordersForVendor']
  empty: null
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
                    {order.kitchenReady && order.fulfillment === 'delivery'
                      ? 'Ready for rider'
                      : labelForStatus(order.status, order.fulfillment)}
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
