import { useState, type FormEvent, type ReactNode } from 'react'
import { appPath } from '../paths'
import { Link, Navigate } from 'react-router-dom'
import { OrderLayout, StickyCommerceBar } from '../components/layout'
import { PlacePicker } from '../components/PlacePicker'
import { useCart, type Fulfillment } from '../context/CartContext'
import { useOps } from '../context/OpsContext'
import { useVendor } from '../context/VendorContext'
import type { DeliveryPlace } from '../data/places'
import { DELIVERY_FEE, formatNaira } from '../data/vendors'
import { isOrderRateLimitError, saveOrderToSupabase } from '../lib/ordersApi'
import { initializePaystackPayment } from '../lib/paystackApi'
import { rememberPayEmail } from '../components/PaystackPayPanel'

export function CheckoutPage() {
  const { itemCount, subtotal, vendor, draftOrder, commitOrder } = useCart()
  const { ingestPlacedOrder } = useOps()
  const { ingestOrder: ingestVendorOrder } = useVendor()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [fulfillment, setFulfillment] = useState<Fulfillment>('delivery')
  const [place, setPlace] = useState<DeliveryPlace | null>(null)
  const [note, setNote] = useState('')
  const [payment, setPayment] = useState<'cod' | 'transfer' | 'card'>('card')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [placedId, setPlacedId] = useState<string | null>(null)
  const [placeError, setPlaceError] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  /** Keep sticky totals stable after cart clears mid-Paystack handoff */
  const [handoffTotal, setHandoffTotal] = useState<number | null>(null)
  const [handoffFee, setHandoffFee] = useState<number | null>(null)

  const deliveryFee = fulfillment === 'pickup' ? 0 : DELIVERY_FEE
  const total = subtotal + deliveryFee
  const pickup = fulfillment === 'pickup'
  const barFee = handoffFee ?? deliveryFee
  const barTotal = handoffTotal ?? total

  if (placedId) {
    return <Navigate to={appPath(`/orders/${placedId}/confirmed`)} replace />
  }

  // Stay on a calm handoff screen while Paystack initializes — never bounce to Cart.
  if (submitting) {
    return (
      <OrderLayout>
        <div className="py-20 text-center">
          <p className="font-display text-2xl font-semibold tracking-[-0.03em]">
            Opening Paystack…
          </p>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Hang tight — you’ll pay on the next screen. Don’t close this tab.
          </p>
          <p className="mt-6 text-sm font-bold tabular-nums text-ink">
            {formatNaira(barTotal)}
          </p>
        </div>
      </OrderLayout>
    )
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
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length !== 11) {
      setSubmitError('Enter an 11-digit phone number.')
      return
    }
    if (payment === 'cod') {
      setSubmitError(
        pickup
          ? 'Pay at pickup is for KampeDrop accounts. Choose card or bank transfer.'
          : 'Cash on delivery is for KampeDrop accounts. Choose card or bank transfer.',
      )
      return
    }
    if (payment === 'card' || payment === 'transfer') {
      const trimmedEmail = email.trim()
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setSubmitError('Enter a valid email for Paystack payment.')
        return
      }
    }
    setSubmitting(true)
    setHandoffFee(deliveryFee)
    setHandoffTotal(total)
    setPlaceError(false)
    setSubmitError(null)
    try {
      const pickupAddress =
        vendor?.pickupSpot ||
        `${vendor?.area ?? 'Badagry'} — ${vendor?.name ?? 'vendor'}`
      const order = draftOrder({
        customerName: name.trim(),
        phone: phoneDigits,
        address: pickup ? pickupAddress : place!.address.trim(),
        note: note.trim(),
        payment,
        fulfillment,
        placeName: pickup ? vendor?.name ?? 'Pickup' : place?.name,
        placeId: pickup ? null : place?.placeId,
        placeLat: pickup ? null : place?.lat,
        placeLng: pickup ? null : place?.lng,
      })

      const cloud = await saveOrderToSupabase(order)
      if (!cloud.ok) {
        console.error('Supabase save failed:', cloud.reason)
        if (isOrderRateLimitError(cloud.reason)) {
          setSubmitError(
            'Too many orders from this number recently — please wait a few minutes and try again, or contact support',
          )
        } else {
          setSubmitError(
            cloud.reason ||
              'Could not place your order right now. Please try again.',
          )
        }
        setSubmitting(false)
        setHandoffFee(null)
        setHandoffTotal(null)
        return
      }

      // Start Paystack BEFORE clearing the cart so Checkout doesn’t remount
      // as empty-cart → Cart while waiting on initialize.
      if (payment === 'card' || payment === 'transfer') {
        rememberPayEmail(order.id, email.trim())
        const pay = await initializePaystackPayment({
          orderId: order.id,
          email: email.trim(),
        })

        commitOrder(order)
        ingestPlacedOrder(order)
        if (vendor?.id) {
          ingestVendorOrder({ ...order, vendorId: vendor.id })
        }

        if (!pay.ok) {
          window.location.assign(appPath(`/orders/${order.id}`))
          return
        }
        window.location.assign(pay.authorizationUrl)
        return
      }

      commitOrder(order)
      ingestPlacedOrder(order)
      if (vendor?.id) {
        ingestVendorOrder({ ...order, vendorId: vendor.id })
      }
      setPlacedId(order.id)
    } catch {
      setSubmitError('Could not place your order right now. Please try again.')
      setSubmitting(false)
      setHandoffFee(null)
      setHandoffTotal(null)
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
            inputMode="numeric"
            value={phone}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
              setPhone(digits)
            }}
            maxLength={11}
            minLength={11}
            pattern="[0-9]{11}"
            title="Enter an 11-digit phone number"
            placeholder="08030000000"
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
            How will you pay?
          </legend>
          <div className="overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
            {(
              [
                {
                  id: 'card' as const,
                  title: 'Card',
                  hint: 'Visa, Mastercard · Paystack',
                  locked: false,
                },
                {
                  id: 'transfer' as const,
                  title: 'Bank transfer',
                  hint: 'One-time account · Paystack',
                  locked: false,
                },
                {
                  id: 'cod' as const,
                  title: pickup ? 'Pay at pickup' : 'Cash on delivery',
                  hint: 'Available with a KampeDrop account',
                  locked: true,
                },
              ] as const
            ).map((opt, index) => {
              const active = !opt.locked && payment === opt.id
              return (
                <div
                  key={opt.id}
                  className={index > 0 ? 'border-t border-line' : undefined}
                >
                  <label
                    aria-disabled={opt.locked}
                    className={`flex items-start gap-3 px-3.5 py-3.5 transition ${
                      opt.locked
                        ? 'cursor-not-allowed bg-mist/50'
                        : active
                          ? 'cursor-pointer bg-lagoon/[0.06]'
                          : 'cursor-pointer hover:bg-mist/40'
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full ring-2 ${
                        opt.locked
                          ? 'ring-line bg-mist'
                          : active
                            ? 'ring-lagoon bg-lagoon'
                            : 'ring-line bg-paper'
                      }`}
                      aria-hidden
                    >
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <input
                      type="radio"
                      name="payment"
                      className="sr-only"
                      checked={active}
                      disabled={opt.locked}
                      onChange={() => {
                        if (!opt.locked) setPayment(opt.id)
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm font-bold ${
                            opt.locked ? 'text-muted' : 'text-ink'
                          }`}
                        >
                          {opt.title}
                        </span>
                        {opt.locked && (
                          <span className="rounded-md bg-ink/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                            Accounts
                          </span>
                        )}
                      </span>
                      <span
                        className={`mt-0.5 block text-[12px] leading-snug ${
                          opt.locked ? 'text-muted/80' : 'text-muted'
                        }`}
                      >
                        {opt.hint}
                      </span>
                    </span>
                  </label>

                  {active && (
                    <div className="space-y-2 border-t border-line/70 bg-lagoon/[0.04] px-3.5 pb-3.5 pt-3 pl-[2.65rem]">
                      <p className="text-xs leading-relaxed text-muted">
                        {opt.id === 'transfer'
                          ? 'Paystack shows a one-time account for this amount. Escrow still releases only at the handoff passkey.'
                          : 'You’ll pay securely on Paystack. Escrow still releases only at the handoff passkey.'}
                      </p>
                      <Field label="Email for receipt" htmlFor="email">
                        <input
                          id="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@email.com"
                          className="field"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </fieldset>

        {submitError && (
          <p
            className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {submitError}
          </p>
        )}

        <div className="h-28" aria-hidden />
      </form>

      <StickyCommerceBar>
        <div className="mb-2 flex items-center justify-between px-1 text-xs text-white/60">
          <span>
            {pickup ? 'Pickup' : 'Delivery'} · {formatNaira(barFee)}
          </span>
          <span className="font-bold text-white">{formatNaira(barTotal)}</span>
        </div>
        <button
          type="submit"
          form="checkout-form"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-xl bg-mango px-4 py-3.5 text-sm font-bold text-ink disabled:opacity-70"
        >
          {submitting
            ? 'Opening Paystack…'
            : payment === 'card' || payment === 'transfer'
              ? 'Continue to Paystack'
              : pickup
                ? 'Place pickup'
                : 'Place order'}
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
