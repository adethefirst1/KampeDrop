import { Link } from 'react-router-dom'
import { appPath } from '../paths'
import { OrderLayout, GuaranteePill } from '../components/layout'
import { useCart } from '../context/CartContext'
import { formatNaira } from '../data/vendors'

export function CartPage() {
  const { lines, vendor, subtotal, deliveryFee, total, setQty, clear, itemCount } = useCart()

  if (!itemCount) {
    return (
      <OrderLayout>
        <div className="py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Cart</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em]">
            Nothing to secure yet
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Pick a vetted vendor and add what you need. We’ll handle the rest.
          </p>
          <Link to={appPath()} className="btn-primary mt-8">
            Browse vendors
          </Link>
        </div>
      </OrderLayout>
    )
  }

  return (
    <OrderLayout>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Your bag</p>
      <h1 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.03em]">
        Almost there
      </h1>
      <p className="mt-1 text-sm text-muted">
        From <span className="font-semibold text-ink">{vendor?.name}</span>
      </p>

      <ul className="mt-6 space-y-3">
        {lines.map((line) => (
          <li key={line.item.id} className="rounded-3xl bg-paper p-4 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{line.item.name}</h2>
                <p className="mt-1 text-sm text-muted">{formatNaira(line.item.price)} each</p>
              </div>
              <p className="font-bold">{formatNaira(line.item.price * line.qty)}</p>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                aria-label="Decrease"
                onClick={() => setQty(line.item.id, line.qty - 1)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-mist text-lg font-bold"
              >
                −
              </button>
              <span className="min-w-6 text-center text-sm font-bold">{line.qty}</span>
              <button
                type="button"
                aria-label="Increase"
                onClick={() => setQty(line.item.id, line.qty + 1)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-mist text-lg font-bold"
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={clear}
        className="mt-4 text-sm font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        Clear cart
      </button>

      <div className="mt-6 rounded-3xl bg-paper p-4 ring-1 ring-line">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="font-semibold">{formatNaira(subtotal)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted">Delivery</span>
          <span className="font-semibold">{formatNaira(deliveryFee)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-line pt-3">
          <span className="font-bold">Total</span>
          <span className="font-display text-xl font-semibold">{formatNaira(total)}</span>
        </div>
      </div>

      <div className="mt-4">
        <GuaranteePill compact />
      </div>

      <Link to={appPath('/checkout')} className="btn-ink mt-6 w-full">
        Continue as guest
      </Link>
      <p className="mt-3 text-center text-xs text-muted">
        No account. No download. Just your order — secured.
      </p>
    </OrderLayout>
  )
}
