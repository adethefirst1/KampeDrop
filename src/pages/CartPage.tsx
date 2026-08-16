import { Link } from 'react-router-dom'
import { appPath } from '../paths'
import { OrderLayout, StickyCommerceBar } from '../components/layout'
import { useCart } from '../context/CartContext'
import { formatNaira } from '../data/vendors'

export function CartPage() {
  const {
    lines,
    vendor,
    subtotal,
    deliveryFee,
    total,
    setQty,
    clear,
    itemCount,
    lastOrder,
  } = useCart()

  if (!itemCount) {
    return (
      <OrderLayout>
        <div className="py-16 text-center">
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
          {lastOrder && (
            <Link
              to={appPath(`/orders/${lastOrder.id}`)}
              className="mt-4 block text-sm font-semibold text-lagoon"
            >
              Track last order ({lastOrder.id})
            </Link>
          )}
        </div>
      </OrderLayout>
    )
  }

  return (
    <OrderLayout>
      <div className="flex items-start justify-between gap-3">
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
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted">Delivery</span>
          <span className="font-semibold">{formatNaira(deliveryFee)}</span>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Or pick up at the vendor for free at checkout.
        </p>
        <div className="mt-3 flex justify-between border-t border-line pt-3">
          <span className="font-bold">Total</span>
          <span className="font-display text-xl font-semibold">{formatNaira(total)}</span>
        </div>
      </div>

      {/* Spacer for sticky bar */}
      <div className="h-24" aria-hidden />

      <StickyCommerceBar>
        <Link
          to={appPath('/checkout')}
          className="flex w-full items-center justify-between gap-3 rounded-xl bg-mango px-4 py-3.5 text-ink"
        >
          <span className="text-sm font-bold">Checkout</span>
          <span className="text-sm font-bold">{formatNaira(total)}</span>
        </Link>
      </StickyCommerceBar>
    </OrderLayout>
  )
}
