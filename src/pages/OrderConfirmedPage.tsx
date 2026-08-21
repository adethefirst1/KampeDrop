import { Link, useParams } from 'react-router-dom'
import { appPath } from '../paths'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { OrderLayout } from '../components/layout'
import { SecureSeal } from '../components/motion'
import { loadOrder, useCart, type PlacedOrder } from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import { formatNaira, type Category } from '../data/vendors'
import { SITE } from '../data/site'
import { easeOut, springSnap } from '../motion/tokens'

type ConfirmTone = {
  eyebrow: string
  headline: string
  support: (firstName: string, vendor: string, pickup: boolean) => string
  nextHint: (payment: PlacedOrder['payment'], pickup: boolean) => string
  /** Full-bleed atmosphere — not flat white */
  shell: string
  wash: string
  ink: string
  muted: string
  cta: string
  ctaClass: string
  accentBlob: string
}

const tones: Record<Category, ConfirmTone> = {
  food: {
    eyebrow: 'Order locked in',
    headline: 'Kitchen’s on it.',
    support: (first, vendor, pickup) =>
      pickup
        ? `${first}, ${vendor} is preparing your plate. Follow Track for ready — WhatsApp support if you need a hand.`
        : `${first}, ${vendor} is firing up your order — lagoon heat, headed your way.`,
    nextHint: (payment, pickup) =>
      payment === 'transfer'
        ? pickup
          ? 'Next: Paystack shows a one-time account — then bring your passkey when you collect.'
          : 'Next: Paystack shows a one-time account — vendor is paid only at pickup passkey.'
        : payment === 'card'
          ? 'Next: complete Paystack card payment. Escrow releases at handoff passkey.'
          : pickup
            ? 'Pay at the vendor when you collect. Keep your passkey ready.'
            : 'Pay the rider at your door. We’ll keep you posted on the way.',
    shell: 'bg-[#1a120c] text-[#fff6ea]',
    wash: 'from-[#3d2418] via-[#1a120c] to-[#0e1c18]',
    ink: 'text-[#fff6ea]',
    muted: 'text-[#e8c9a8]/70',
    cta: 'Track my food',
    ctaClass: 'bg-mango text-ink hover:brightness-105',
    accentBlob: 'bg-mango/35',
  },
  pharmacy: {
    eyebrow: 'Order recorded',
    headline: 'Handled with care.',
    support: (first, vendor, pickup) =>
      pickup
        ? `${first}, ${vendor} has your request. Sealed packs — collect with your passkey when ready.`
        : `${first}, ${vendor} is preparing a sealed pack. Careful handoff, clear tracking.`,
    nextHint: (payment, pickup) =>
      payment === 'transfer'
        ? 'Next: Paystack shows a one-time account. Payment releases only at vendor handoff passkey.'
        : payment === 'card'
          ? 'Next: complete Paystack card payment. Escrow releases at handoff passkey.'
          : pickup
            ? 'Pay at the pharmacy counter when you collect.'
            : 'Pay the rider on delivery. Pack stays sealed until handoff.',
    shell: 'bg-lagoon-deep text-white',
    wash: 'from-[#063834] via-lagoon-deep to-[#041c22]',
    ink: 'text-white',
    muted: 'text-white/65',
    cta: 'Track this order',
    ctaClass: 'bg-white text-lagoon-deep hover:bg-mist',
    accentBlob: 'bg-lagoon/40',
  },
  mart: {
    eyebrow: 'Order confirmed',
    headline: 'Coming home.',
    support: (first, vendor, pickup) =>
      pickup
        ? `${first}, ${vendor} is packing your run. Pick up when we say it’s ready.`
        : `${first}, ${vendor} is packing what you need — solid, counted, on the way.`,
    nextHint: (payment, pickup) =>
      payment === 'transfer'
        ? 'Next: Paystack shows a one-time account — held until vendor handoff.'
        : payment === 'card'
          ? 'Next: complete Paystack card payment. Escrow releases at handoff passkey.'
          : pickup
            ? 'Pay at the mall when you collect.'
            : 'Pay the rider at your door. Essentials, tracked.',
    shell: 'bg-ink text-white',
    wash: 'from-[#0a2a24] via-ink to-[#06181c]',
    ink: 'text-white',
    muted: 'text-white/65',
    cta: 'Track my order',
    ctaClass: 'bg-dusk text-ink hover:brightness-105',
    accentBlob: 'bg-palm/45',
  },
  store: {
    eyebrow: 'Order locked',
    headline: 'Corner’s got you.',
    support: (first, vendor, pickup) =>
      pickup
        ? `${first}, ${vendor} is packing your bits. Collect with your passkey when ready.`
        : `${first}, ${vendor} is packing your run — neighbourhood speed, tracked handoff.`,
    nextHint: (payment, pickup) =>
      payment === 'transfer'
        ? 'Next: Paystack shows a one-time account — held until vendor handoff.'
        : payment === 'card'
          ? 'Next: complete Paystack card payment. Escrow releases at handoff passkey.'
          : pickup
            ? 'Pay at the store when you collect.'
            : 'Pay the rider at your door. Small shop, clear tracking.',
    shell: 'bg-[#1f1833] text-[#f7f5fc]',
    wash: 'from-[#3d3266] via-[#1f1833] to-[#0f2e34]',
    ink: 'text-[#f7f5fc]',
    muted: 'text-[#d4cce8]/70',
    cta: 'Track my order',
    ctaClass: 'bg-[#c4b5fd] text-[#1f1833] hover:brightness-105',
    accentBlob: 'bg-[#5b4a9a]/45',
  },
}

export function OrderConfirmedPage() {
  const { orderId } = useParams()
  const { lastOrder } = useCart()
  const { getVendor } = useCatalog()
  const reduce = useReducedMotion()

  const order = useMemo(() => {
    if (!orderId) return null
    if (lastOrder?.id === orderId) return lastOrder
    return loadOrder(orderId)
  }, [orderId, lastOrder])

  const vendor = getVendor(order?.lines[0]?.vendorId ?? '')
  const category: Category = vendor?.category ?? 'mart'
  const tone = tones[category]
  const pickup = order?.fulfillment === 'pickup'
  const firstName = order?.customerName.trim().split(/\s+/)[0] || 'You'

  if (!order) {
    return (
      <OrderLayout>
        <div className="py-16 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
            Order not found
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-muted">
            This confirmation link may be from another phone or browser.
          </p>
          <Link to={appPath()} className="btn-primary mt-8 inline-flex">
            Browse vendors
          </Link>
        </div>
      </OrderLayout>
    )
  }

  return (
    <OrderLayout bleed>
      <section
        className={`relative min-h-[calc(100svh-4.5rem)] overflow-hidden ${tone.shell}`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.wash}`}
          aria-hidden
        />
        <motion.div
          className={`pointer-events-none absolute -right-16 top-8 h-56 w-56 rounded-full blur-3xl ${tone.accentBlob}`}
          aria-hidden
          animate={reduce ? undefined : { y: [0, 18, 0], opacity: [0.45, 0.7, 0.45] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={`pointer-events-none absolute -left-20 bottom-24 h-64 w-64 rounded-full blur-3xl ${
            category === 'food' ? 'bg-laterite/30' : 'bg-white/10'
          }`}
          aria-hidden
          animate={reduce ? undefined : { y: [0, -14, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-xl flex-col justify-center px-5 py-12 md:px-8">
          <motion.p
            className={`text-xs font-bold uppercase tracking-[0.2em] ${tone.muted}`}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easeOut }}
          >
            {SITE.name} · {tone.eyebrow}
          </motion.p>

          <div className="mt-6 flex items-start gap-4">
            <SecureSeal />
            <motion.h1
              className={`font-display text-[2.35rem] font-semibold leading-[1.05] tracking-[-0.03em] md:text-5xl ${tone.ink}`}
              initial={reduce ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.65, ease: easeOut, delay: 0.08 }}
            >
              {tone.headline}
            </motion.h1>
          </div>

          <motion.p
            className={`mt-5 max-w-[34ch] text-base leading-relaxed md:text-lg ${tone.muted}`}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut, delay: 0.2 }}
          >
            {tone.support(firstName, vendor?.name ?? 'your vendor', pickup)}
          </motion.p>

          <motion.div
            className="mt-8 border-t border-white/15 pt-5"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${tone.muted}`}>
              Order {order.id}
            </p>
            <p className={`mt-1 text-sm font-semibold ${tone.ink}`}>
              {formatNaira(order.total)}
              <span className={`font-medium ${tone.muted}`}>
                {' '}
                · {pickup ? 'Pickup' : 'Delivery'} ·{' '}
                {order.payment === 'transfer' ? 'Transfer' : pickup ? 'Pay at vendor' : 'COD'}
              </span>
            </p>
            <p className={`mt-3 text-sm leading-relaxed ${tone.muted}`}>
              {tone.nextHint(order.payment, pickup)}
            </p>
          </motion.div>

          <motion.div
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSnap, delay: 0.45 }}
          >
            <Link
              to={appPath(`/orders/${order.id}`)}
              className={`inline-flex items-center justify-center rounded-xl px-5 py-3.5 text-sm font-bold transition ${tone.ctaClass}`}
            >
              {tone.cta}
            </Link>
            <p className={`text-xs leading-snug sm:max-w-[22ch] ${tone.muted}`}>
              Wrong or late — KampeDrop makes it right.
            </p>
          </motion.div>
        </div>
      </section>
    </OrderLayout>
  )
}
