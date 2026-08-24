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
  const openCount = newOrders.length + active.length + ready.length

  const subline =
    openCount === 0
      ? 'Quiet board. When a buyer checks out, it lands here.'
      : newOrders.length > 0
        ? `Heat’s on — ${newOrders.length} incoming. Start preparing.`
        : ready.length > 0
          ? `${ready.length} ready for handoff. Passkey at the door.`
          : `${active.length} in the kitchen. Keep the line moving.`

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-dusk">
            Station
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.03em]">
            {openCount === 0 ? 'Quiet board' : 'Orders'}
          </h1>
          <p className="mt-1.5 text-sm font-semibold leading-snug text-ink-soft">{subline}</p>
          <p className="mt-2 text-xs font-semibold">
            <Link to={vendorPath('/history')} className="text-ink hover:underline">
              View order history →
            </Link>
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full bg-ink/8 px-3 py-1.5 text-xs font-bold text-ink-soft ring-1 ring-ink/10"
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
        <div className="mt-8 rounded-[1.5rem] border-[3px] border-dashed border-ink/25 bg-paper/80 px-5 py-10 text-center">
          <p className="font-display text-xl font-semibold">Breathing room</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            No open tickets. Stay signed in — the next order will ping this board.
          </p>
        </div>
      )}

      {ordersLoading && !ordersForVendor.length && (
        <p className="mt-8 text-sm font-semibold text-muted">Loading the board…</p>
      )}

      <Section
        title="Incoming"
        feeling="New heat"
        tone="new"
        items={newOrders}
      />
      <Section
        title="In kitchen"
        feeling="Hands on"
        tone="active"
        items={active}
      />
      <Section
        title="Ready for handoff"
        feeling="Almost home"
        tone="ready"
        items={ready}
      />
    </div>
  )
}

function Section({
  title,
  feeling,
  tone,
  items,
}: {
  title: string
  feeling: string
  tone: 'new' | 'active' | 'ready'
  items: ReturnType<typeof useVendor>['ordersForVendor']
}) {
  if (!items.length) return null

  const accent =
    tone === 'new'
      ? 'text-mango-deep'
      : tone === 'ready'
        ? 'text-ok'
        : 'text-dusk'

  const ring =
    tone === 'new'
      ? 'hover:ring-mango/50'
      : tone === 'ready'
        ? 'hover:ring-ok/40'
        : 'hover:ring-dusk/50'

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={`text-xs font-extrabold uppercase tracking-[0.16em] ${accent}`}>
          {title}
        </h2>
        <p className="text-[11px] font-semibold text-muted">{feeling}</p>
      </div>
      <ul className="mt-3 space-y-2.5">
        {items.map((order) => (
          <li key={order.id}>
            <Link
              to={vendorPath(`/orders/${order.id}`)}
              className={`block rounded-2xl bg-paper p-4 ring-1 ring-ink/10 transition ${ring}`}
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
                  <p className={`mt-1 text-[11px] font-bold ${accent}`}>
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
