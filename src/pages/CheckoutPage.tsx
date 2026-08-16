import { useState, type FormEvent, type ReactNode } from 'react'
import { appPath } from '../paths'
import { Link, Navigate } from 'react-router-dom'
import { OrderLayout, StickyCommerceBar } from '../components/layout'
import { PlacePicker } from '../components/PlacePicker'
import { useCart, type Fulfillment } from '../context/CartContext'
import { useOps } from '../context/OpsContext'
import type { DeliveryPlace } from '../data/places'
import { DELIVERY_FEE, formatNaira } from '../data/vendors'
import { saveOrderToSupabase } from '../lib/ordersApi'

export function CheckoutPage() {
  const { itemCount, subtotal, vendor, placeOrder } = useCart()
  const { ingestPlacedOrder } = useOps()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [fulfillment, setFulfillment] = useState<Fulfillment>('delivery')
  const [place, setPlace] = useState<DeliveryPlace | null>(null)
  const [note, setNote] = useState('')
  const [payment, setPayment] = useState<'cod' | 'transfer'>('transfer')
  const [submitting, setSubmitting] = useState(false)
  const [placedId, setPlacedId] = useState<string | null>(null)
  const [placeError, setPlaceError] = useState(false)

  const deliveryFee = fulfillment === 'pickup' ? 0 : DELIVERY_FEE
  const total = subtotal + deliveryFee
  const pickup = fulfillment === 'pickup'

  if (placedId) {
    return <Navigate to={appPath(`/orders/${placedId}`)} replace />
  }

  if (!itemCount) {
    return <Navigate to={appPath('/cart')} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!pickup && !place?.address.trim()) {
      setPlaceError(true)
      return
    }
    if (pickup && !vendor) {
      return
    }
    setSubmitting(true)
    setPlaceError(false)
    try {
      const pickupAddress =
        vendor?.pickupSpot ||
        `${vendor?.area ?? 'Badagry'} — ${vendor?.name ?? 'vendor'}`
      const order = placeOrder({
        customerName: name.trim(),
        phone: phone.trim(),
        address: pickup ? pickupAddress : place!.address.trim(),
        note: note.trim(),
        payment,
        fulfillment,
        placeName: pickup ? vendor?.name ?? 'Pickup' : place?.name,
        placeId: pickup ? null : place?.placeId,
        placeLat: pickup ? null : place?.lat,
        placeLng: pickup ? null : place?.lng,
      })
      ingestPlacedOrder(order)

      const cloud = await saveOrderToSupabase(order)
      if (!cloud.ok) {
        console.error('Supabase save failed:', cloud.reason)
        window.alert(
          `Order placed locally, but cloud save failed:\n\n${cloud.reason}\n\nCheck .env keys, table columns, and RLS policies.`,
        )
      }

      setPlacedId(order.id)
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <OrderLayout>
      <Link to={appPath('/cart')} className="text-sm font-semibold text-muted hover:text-ink">
        ← Cart
      </Link>
      <h1 className="mt-3 font-display text-[1.75rem] font-semibold tracking-[-0.03em]">
        Checkout
      </h1>
      <p className="mt-1 text-sm text-muted">
        {vendor?.name} · guest checkout · Badagry only
      </p>

      <form id="checkout-form" onSubmit={onSubmit} className="mt-5 space-y-3.5">
        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
            How will you get it?
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  id: 'delivery' as const,
                  title: 'Delivery',
                  hint: `+${formatNaira(DELIVERY_FEE)}`,
                },
                {
                  id: 'pickup' as const,
                  title: 'Pickup',
                  hint: 'Free · at vendor',
                },
              ] as const
            ).map((opt) => {
              const active = fulfillment === opt.id
              return (
                <label
                  key={opt.id}
                  className={`cursor-pointer rounded-2xl px-3 py-3 text-center ring-1 transition ${
                    active ? 'bg-ink text-white ring-ink' : 'bg-paper text-ink-soft ring-line'
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    className="sr-only"
                    checked={active}
                    onChange={() => {
                      setFulfillment(opt.id)
                      setPlaceError(false)
                    }}
                  />
                  <span className="block text-sm font-bold">{opt.title}</span>
                  <span
                    className={`mt-0.5 block text-[11px] font-medium ${
                      active ? 'text-white/70' : 'text-muted'
                    }`}
                  >
                    {opt.hint}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

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

        <Field label="Phone" htmlFor="phone">
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

        {pickup ? (
          <div className="rounded-2xl bg-mist px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Collect at
            </p>
            <p className="mt-1 font-semibold">{vendor?.name}</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              {vendor?.pickupSpot || vendor?.area}
            </p>
            <p className="mt-2 text-xs text-muted">
              We’ll text when it’s ready. Bring your passkey to collect.
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              Drop landmark
            </p>
            <PlacePicker
              value={place}
              onChange={(p) => {
                setPlace(p)
                setPlaceError(false)
              }}
            />
            {placeError && (
              <p className="mt-2 text-sm font-semibold text-mango-deep">
                Pick a landmark or place so the rider can find you.
              </p>
            )}
          </div>
        )}

        <Field
          label={pickup ? 'Note for vendor (optional)' : 'Note for rider (optional)'}
          htmlFor="note"
        >
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              pickup
                ? 'Coming on a black scooter · call when ready'
                : 'Call on arrival · blue gate · flat 2'
            }
            className="field"
          />
        </Field>

        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
            Payment
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  id: 'transfer' as const,
                  title: 'Bank transfer',
                  hint: pickup ? 'Held until collect' : 'Held until pickup',
                },
                {
                  id: 'cod' as const,
                  title: pickup ? 'Pay at pickup' : 'Cash on delivery',
                  hint: pickup ? 'Pay at vendor' : 'Pay the rider',
                },
              ] as const
            ).map((opt) => {
              const active = payment === opt.id
              return (
                <label
                  key={opt.id}
                  className={`cursor-pointer rounded-2xl px-3 py-3 text-center ring-1 transition ${
                    active ? 'bg-ink text-white ring-ink' : 'bg-paper text-ink-soft ring-line'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    className="sr-only"
                    checked={active}
                    onChange={() => setPayment(opt.id)}
                  />
                  <span className="block text-sm font-bold">{opt.title}</span>
                  <span
                    className={`mt-0.5 block text-[11px] font-medium ${
                      active ? 'text-white/70' : 'text-muted'
                    }`}
                  >
                    {opt.hint}
                  </span>
                </label>
              )
            })}
          </div>
          {payment === 'transfer' && (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              You’ll get bank details on the next screen. Transfer to SureDrop
              escrow — vendor is paid only after{' '}
              {pickup ? 'you collect' : 'pickup'}.
            </p>
          )}
        </fieldset>

        <div className="h-28" aria-hidden />
      </form>

      <StickyCommerceBar>
        <div className="mb-2 flex items-center justify-between px-1 text-xs text-white/60">
          <span>
            {pickup ? 'Pickup' : 'Delivery'} · {formatNaira(deliveryFee)}
          </span>
          <span className="font-bold text-white">{formatNaira(total)}</span>
        </div>
        <button
          type="submit"
          form="checkout-form"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-xl bg-mango px-4 py-3.5 text-sm font-bold text-ink disabled:opacity-70"
        >
          {submitting
            ? 'Placing order…'
            : pickup
              ? payment === 'transfer'
                ? 'Place pickup · pay by transfer'
                : 'Place pickup · pay at vendor'
              : payment === 'transfer'
                ? 'Place order · pay by transfer'
                : 'Place order · pay on delivery'}
        </button>
      </StickyCommerceBar>
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
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  )
}
