import { Link, useNavigate } from 'react-router-dom'
import { appPath } from '../paths'
import { OrderLayout, StickyCommerceBar } from '../components/layout'
import { useCart } from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import { labelForStatus } from '../data/ops'
import { formatNaira } from '../data/vendors'

export function CartPage() {
  const navigate = useNavigate()
  const {
    lines,
    vendor,
    subtotal,
    setQty,
    clear,
    itemCount,
    lastOrder,
  } = useCart()
  const { getVendor } = useCatalog()

  function goBack() {
    const idx =
      typeof window.history.state?.idx === 'number'
        ? window.history.state.idx
        : 0
    if (idx > 0) {
      navigate(-1)
      return
    }
    navigate(appPath())
  }

  if (!itemCount) {
    const lastVendor = lastOrder
      ? getVendor(lastOrder.lines[0]?.vendorId ?? '')
      : null
    const lastFulfillment = lastOrder?.fulfillment ?? 'delivery'
    const lastDone =
      lastOrder?.status === 'delivered' || lastOrder?.status === 'cancelled'
    const firstName = lastOrder?.customerName.trim().split(/\s+/)[0]

    return (
      <OrderLayout>
        <button
          type="button"
          onClick={goBack}
          className="text-sm font-semibold text-muted hover:text-ink"
        >
          ← Back
        </button>
        <div className="py-12 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
            Cart is empty
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Browse a vetted vendor in Badagry, add items, then checkout as a
            guest.
          </p>
          <Link to={appPath()} className="btn-primary mt-8">
            Browse vendors
          </Link>
          <p className="mt-4 text-center text-sm text-muted">
            Already ordered?{' '}
            <Link
              to={appPath('/find-order')}
              className="font-semibold text-lagoon hover:underline"
            >
              Find my order
            </Link>
          </p>

          {lastOrder && (
            <Link
              to={appPath(`/orders/${lastOrder.id}`)}
              className="mx-auto mt-10 block max-w-sm rounded-[1.35rem] bg-paper p-4 text-left ring-1 ring-line transition hover:ring-lagoon/40"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lagoon">
                {lastDone ? 'Your last order' : 'Order in progress'}
              </p>
              <p className="mt-2 font-display text-xl font-semibold tracking-[-0.02em] text-ink">
                {lastVendor?.name ?? 'KampeDrop order'}
              </p>
              <p className="mt-1 text-sm leading-snug text-muted">
                {firstName ? `For ${firstName} · ` : ''}
                {labelForStatus(lastOrder.status, lastFulfillment)}
                {lastFulfillment === 'pickup' ? ' · Pickup' : ' · Delivery'}
              </p>
              <span className="mt-3 inline-flex text-sm font-bold text-lagoon-deep">
                {lastDone ? 'View order' : 'Continue tracking'} →
              </span>
            </Link>
          )}
        </div>
      </OrderLayout>
    )
  }

  return (
    <OrderLayout>
      <button
        type="button"
        onClick={goBack}
        className="text-sm font-semibold text-muted hover:text-ink"
      >
        ← Back
      </button>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.03em]">
            Your cart
          </h1>
          <p className="mt-1 text-sm text-muted">
            <span className="font-semibold text-ink">{vendor?.name}</span>
            {' · '}
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-xs font-bold text-muted hover:text-ink"
        >
          Clear
        </button>
      </div>

      <ul className="mt-5 space-y-2.5">
        {lines.map((line) => (
          <li
            key={line.item.id}
            className="flex items-center gap-3 rounded-2xl bg-paper p-3.5 ring-1 ring-line"
          >
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold leading-snug">{line.item.name}</h2>
              <p className="mt-0.5 text-sm font-bold">
                {formatNaira(line.item.price * line.qty)}
              </p>
              <p className="text-xs text-muted">{formatNaira(line.item.price)} each</p>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-xl bg-mist p-1">
              <button
                type="button"
                aria-label="Decrease"
                onClick={() => setQty(line.item.id, line.qty - 1)}
                className="grid h-9 w-9 place-items-center rounded-lg bg-paper text-lg font-bold ring-1 ring-line"
              >
                −
              </button>
              <span className="min-w-7 text-center text-sm font-bold">{line.qty}</span>
              <button
                type="button"
                aria-label="Increase"
                onClick={() => setQty(line.item.id, line.qty + 1)}
                className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-lg font-bold text-white"
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-2xl bg-paper p-4 ring-1 ring-line">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="font-semibold">{formatNaira(subtotal)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-line pt-3">
          <span className="font-bold">Items total</span>
          <span className="font-display text-xl font-semibold">
            {formatNaira(subtotal)}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted">
          Delivery or free pickup is chosen on the next step.
        </p>
      </div>

      {/* StickyCommerceBar provides measured in-flow spacer */}
      <StickyCommerceBar>
        <Link
          to={appPath('/checkout')}
          className="flex w-full items-center justify-between gap-3 rounded-xl bg-mango px-4 py-3.5 text-ink"
        >
          <span className="text-sm font-bold">Checkout</span>
          <span className="text-sm font-bold">{formatNaira(subtotal)}</span>
        </Link>
      </StickyCommerceBar>
    </OrderLayout>
  )
}
