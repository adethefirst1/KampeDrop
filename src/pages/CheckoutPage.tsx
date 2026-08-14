import { useState, type FormEvent, type ReactNode } from 'react'
import { appPath } from '../paths'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { OrderLayout, GuaranteePill } from '../components/layout'
import { useCart } from '../context/CartContext'
import { formatNaira } from '../data/vendors'

export function CheckoutPage() {
  const navigate = useNavigate()
  const { itemCount, total, vendor, placeOrder } = useCart()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [payment, setPayment] = useState<'cod' | 'transfer'>('cod')
  const [submitting, setSubmitting] = useState(false)

  if (!itemCount) {
    return <Navigate to={appPath('/cart')} replace />
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const order = placeOrder({
      customerName: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      note: note.trim(),
      payment,
    })
    navigate(appPath(`/orders/${order.id}`), { replace: true })
  }

  return (
    <OrderLayout>
      <Link to={appPath('/cart')} className="text-sm font-semibold text-muted hover:text-ink">
        ← Back to cart
      </Link>
      <h1 className="mt-4 font-display text-[2rem] font-semibold tracking-[-0.03em]">Checkout</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Guest checkout — we only need enough to find your door in Badagry.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Full name" htmlFor="name">
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Adaeze Okonkwo"
            className="field"
            autoComplete="name"
          />
        </Field>

        <Field label="Phone number" htmlFor="phone">
          <input
            id="phone"
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0803 000 0000"
            className="field"
            autoComplete="tel"
          />
        </Field>

        <Field label="Delivery address" htmlFor="address">
          <textarea
            id="address"
            required
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, landmark, estate gate — be specific"
            className="field resize-none"
            autoComplete="street-address"
          />
        </Field>

        <Field label="Note for rider (optional)" htmlFor="note">
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Call on arrival · blue gate"
            className="field"
          />
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">Payment</legend>
          <div className="grid gap-2">
            {(
              [
                {
                  id: 'cod' as const,
                  title: 'Cash on delivery',
                  desc: 'Pay when it arrives. Simple.',
                },
                {
                  id: 'transfer' as const,
                  title: 'Transfer',
                  desc: 'We’ll send account details after confirm.',
                },
              ] as const
            ).map((opt) => {
              const active = payment === opt.id
              return (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 transition ${
                    active ? 'bg-lagoon/8 ring-lagoon' : 'bg-paper ring-line'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    className="mt-1"
                    checked={active}
                    onChange={() => setPayment(opt.id)}
                  />
                  <span>
                    <span className="block font-semibold">{opt.title}</span>
                    <span className="mt-0.5 block text-sm text-muted">{opt.desc}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="rounded-3xl bg-ink px-4 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
            {vendor?.name}
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-sm text-white/70">Total due</p>
            <p className="font-display text-2xl font-semibold">{formatNaira(total)}</p>
          </div>
        </div>

        <GuaranteePill />

        <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-70">
          {submitting ? 'Securing your order…' : 'Place order'}
        </button>
      </form>
    </OrderLayout>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-2 block text-sm font-bold">{label}</span>
      {children}
    </label>
  )
}
