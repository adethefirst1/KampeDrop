import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { appPath } from '../paths'
import { OrderLayout } from '../components/layout'
import { fetchOrderById } from '../lib/ordersApi'
import type { PlacedOrder } from '../context/CartContext'

function normalizePhone(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 11)
}

function persistFoundOrder(order: PlacedOrder) {
  try {
    sessionStorage.setItem(
      `kampedrop-order-${order.id}`,
      JSON.stringify(order),
    )
  } catch {
    /* ignore */
  }
}

/** Guest recovery — look up a live order by id + phone on any device. */
export function FindOrderPage() {
  const navigate = useNavigate()
  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const id = orderId.trim().toUpperCase()
    const phoneDigits = normalizePhone(phone)
    if (!id) {
      setError('Enter your order ID.')
      return
    }
    if (phoneDigits.length !== 11) {
      setError('Enter the 11-digit phone used at checkout.')
      return
    }

    setBusy(true)
    const result = await fetchOrderById(id)
    setBusy(false)

    if (!result.ok || !result.order) {
      setError('No order found with that ID. Check the spelling and try again.')
      return
    }

    const orderPhone = normalizePhone(result.order.phone)
    if (orderPhone !== phoneDigits) {
      setError('That phone doesn’t match this order. Use the number from checkout.')
      return
    }

    persistFoundOrder(result.order)
    navigate(appPath(`/orders/${result.order.id}`), { replace: true })
  }

  return (
    <OrderLayout>
      <Link
        to={appPath()}
        className="text-sm font-semibold text-muted hover:text-ink"
      >
        ← Browse
      </Link>
      <h1 className="mt-3 font-display text-[1.75rem] font-semibold tracking-[-0.03em]">
        Find my order
      </h1>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">
        Lost the track link? Enter the order ID and the phone you used at
        checkout.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3.5">
        <label className="block" htmlFor="find-order-id">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
            Order ID
          </span>
          <input
            id="find-order-id"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="SD-…"
            className="field font-mono uppercase"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </label>

        <label className="block" htmlFor="find-order-phone">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
            Phone at checkout
          </span>
          <input
            id="find-order-phone"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(normalizePhone(e.target.value))}
            maxLength={11}
            placeholder="08030000000"
            className="field"
            autoComplete="tel"
          />
        </label>

        {error && (
          <p
            className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full disabled:opacity-70"
        >
          {busy ? 'Looking up…' : 'Open tracking'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        Still stuck?{' '}
        <Link to="/guarantee" className="font-semibold text-lagoon">
          Contact support
        </Link>
      </p>
    </OrderLayout>
  )
}
