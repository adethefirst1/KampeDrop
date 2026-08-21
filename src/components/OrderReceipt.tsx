import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Category } from '../data/vendors'
import { categoryLabel, formatNaira } from '../data/vendors'
import type { PlacedOrder } from '../context/CartContext'
import { SITE } from '../data/site'
import { springPop, springSoft, slowFloatTransition } from '../motion/tokens'

type ReceiptOrder = Pick<
  PlacedOrder,
  | 'id'
  | 'createdAt'
  | 'customerName'
  | 'payment'
  | 'fulfillment'
  | 'lines'
  | 'deliveryFee'
  | 'subtotal'
  | 'total'
  | 'passkey'
  | 'placeName'
  | 'address'
>

type Props = {
  open: boolean
  onClose: () => void
  order: ReceiptOrder
  vendorName: string
  category: Category
}

type Mood = {
  eyebrow: string
  headline: string
  sub: string
  paper: string
  ink: string
  accent: string
  accentSoft: string
  stamp: string
}

const moods: Record<Category, Mood> = {
  food: {
    eyebrow: 'Kitchen ticket',
    headline: 'Looks delicious',
    sub: 'Hot order locked in — enjoy every bite.',
    paper: '#fff8f1',
    ink: '#3a1f12',
    accent: '#d9772f',
    accentSoft: 'rgba(217, 119, 47, 0.14)',
    stamp: 'PAID · HELD',
  },
  mart: {
    eyebrow: 'Basket slip',
    headline: 'All stocked',
    sub: 'Mall run locked in — home’s almost fuller.',
    paper: '#f3faf6',
    ink: '#143028',
    accent: '#2a5c38',
    accentSoft: 'rgba(42, 92, 56, 0.12)',
    stamp: 'PAID · HELD',
  },
  pharmacy: {
    eyebrow: 'Care slip',
    headline: 'Sealed & set',
    sub: 'Pharmacy order locked in — careful handoff ahead.',
    paper: '#f4f9fb',
    ink: '#0f2a32',
    accent: '#0c6560',
    accentSoft: 'rgba(12, 101, 96, 0.12)',
    stamp: 'PAID · HELD',
  },
  store: {
    eyebrow: 'Store slip',
    headline: 'All set',
    sub: 'Neighbourhood haul locked in — small shop, solid handoff.',
    paper: '#f7f5fc',
    ink: '#1f1833',
    accent: '#5b4a9a',
    accentSoft: 'rgba(91, 74, 154, 0.12)',
    stamp: 'PAID · HELD',
  },
}

function paymentLabel(payment: ReceiptOrder['payment']) {
  if (payment === 'card') return 'Card · Paystack'
  if (payment === 'transfer') return 'Bank transfer · Paystack'
  return 'Pay later'
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-NG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/** Soft category doodles — garnish, not clutter. */
function ReceiptDoodles({
  category,
  reduce,
}: {
  category: Category
  reduce: boolean | null
}) {
  const float = reduce ? undefined : slowFloatTransition

  if (category === 'food') {
    return (
      <>
        <motion.svg
          className="pointer-events-none absolute -right-1 top-8 h-16 w-16 opacity-[0.22]"
          viewBox="0 0 64 64"
          fill="none"
          animate={reduce ? undefined : { y: [0, -5, 0], rotate: [0, 4, 0] }}
          transition={float}
          aria-hidden
        >
          <ellipse cx="32" cy="42" rx="22" ry="8" fill="currentColor" />
          <path
            d="M14 40c2-14 10-24 18-24s16 10 18 24"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M28 14c0-4 2-8 4-8s4 4 4 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M36 12c1-3 3-5 4-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </motion.svg>
        <motion.svg
          className="pointer-events-none absolute -left-2 bottom-28 h-12 w-12 opacity-[0.18]"
          viewBox="0 0 48 48"
          fill="none"
          animate={reduce ? undefined : { y: [0, 4, 0], rotate: [0, -6, 0] }}
          transition={float}
          aria-hidden
        >
          <path
            d="M10 34c4-10 12-16 20-10 6 4 8 12 4 16-6 6-18 4-24-6Z"
            fill="currentColor"
          />
          <circle cx="22" cy="28" r="2" fill="#fff8f1" />
          <circle cx="28" cy="32" r="1.5" fill="#fff8f1" />
        </motion.svg>
      </>
    )
  }

  if (category === 'mart') {
    return (
      <>
        <motion.svg
          className="pointer-events-none absolute right-2 top-10 h-14 w-14 opacity-[0.2]"
          viewBox="0 0 56 56"
          fill="none"
          animate={reduce ? undefined : { y: [0, -4, 0] }}
          transition={float}
          aria-hidden
        >
          <path
            d="M14 20h28l-3 24H17L14 20Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M20 20c0-6 4-10 8-10s8 4 8 10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </motion.svg>
        <motion.svg
          className="pointer-events-none absolute left-1 bottom-24 h-11 w-11 opacity-[0.18]"
          viewBox="0 0 44 44"
          fill="none"
          animate={reduce ? undefined : { rotate: [0, 8, 0] }}
          transition={float}
          aria-hidden
        >
          <ellipse cx="22" cy="28" rx="12" ry="10" fill="currentColor" />
          <path
            d="M22 8c-2 6-8 10-8 16 0 4 3 8 8 8s8-4 8-8c0-6-6-10-8-16Z"
            fill="currentColor"
            opacity="0.7"
          />
        </motion.svg>
      </>
    )
  }

  if (category === 'store') {
    return (
      <>
        <motion.svg
          className="pointer-events-none absolute right-3 top-9 h-14 w-14 opacity-[0.2]"
          viewBox="0 0 56 56"
          fill="none"
          animate={reduce ? undefined : { y: [0, -3, 0] }}
          transition={float}
          aria-hidden
        >
          <path
            d="M8 22h40l-2.5 22H10.5L8 22Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M12 22V16l4-6h24l4 6v6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M24 44V32h8v12" stroke="currentColor" strokeWidth="2.5" />
        </motion.svg>
        <motion.svg
          className="pointer-events-none absolute left-2 bottom-24 h-10 w-10 opacity-[0.16]"
          viewBox="0 0 40 40"
          fill="none"
          animate={reduce ? undefined : { rotate: [0, -5, 0] }}
          transition={float}
          aria-hidden
        >
          <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="2.5" />
          <path
            d="M14 20h12M20 14v12"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </motion.svg>
      </>
    )
  }

  return (
    <>
      <motion.svg
        className="pointer-events-none absolute right-3 top-9 h-14 w-14 opacity-[0.2]"
        viewBox="0 0 56 56"
        fill="none"
        animate={reduce ? undefined : { y: [0, -3, 0] }}
        transition={float}
        aria-hidden
      >
        <rect
          x="18"
          y="10"
          width="20"
          height="8"
          rx="2"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <rect
          x="14"
          y="18"
          width="28"
          height="28"
          rx="6"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <path
          d="M28 24v16M20 32h16"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </motion.svg>
      <motion.svg
        className="pointer-events-none absolute left-2 bottom-24 h-10 w-10 opacity-[0.16]"
        viewBox="0 0 40 40"
        fill="none"
        animate={reduce ? undefined : { rotate: [0, -5, 0] }}
        transition={float}
        aria-hidden
      >
        <path
          d="M20 6c-6 8-10 14-10 20a10 10 0 0 0 20 0c0-6-4-12-10-20Z"
          fill="currentColor"
        />
      </motion.svg>
    </>
  )
}

/**
 * Playful keepsake receipt — category mood first, doodles as soft garnish.
 */
export function OrderReceiptSheet({
  open,
  onClose,
  order,
  vendorName,
  category,
}: Props) {
  const reduce = useReducedMotion()
  const mood = moods[category]
  const pickup = order.fulfillment === 'pickup'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
            aria-label="Close receipt"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-receipt-title"
            className="relative z-10 flex max-h-[90svh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] shadow-[0_-12px_48px_rgba(6,24,28,0.28)] sm:rounded-[1.75rem]"
            style={{ background: mood.paper, color: mood.ink }}
            initial={reduce ? false : { y: 56, scale: 0.96, opacity: 0.9 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={reduce ? undefined : { y: 40, opacity: 0, scale: 0.98 }}
            transition={springSoft}
          >
            {/* Torn / ticket top edge */}
            <div
              className="h-3 shrink-0"
              style={{
                backgroundImage: `radial-gradient(circle at 8px 0, transparent 6px, ${mood.paper} 6.5px)`,
                backgroundSize: '16px 12px',
                backgroundPosition: 'center top',
                backgroundColor: 'transparent',
                transform: 'translateY(-1px)',
              }}
              aria-hidden
            />

            <div className="relative flex-1 overflow-y-auto px-5 pb-6 pt-1">
              <div style={{ color: mood.accent }}>
                <ReceiptDoodles category={category} reduce={reduce} />
              </div>

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="text-[11px] font-extrabold uppercase tracking-[0.16em]"
                    style={{ color: mood.accent }}
                  >
                    {SITE.name} · {mood.eyebrow}
                  </p>
                  <h2
                    id="order-receipt-title"
                    className="mt-1.5 font-display text-[1.85rem] font-semibold leading-[1.05] tracking-[-0.03em]"
                  >
                    {mood.headline}
                  </h2>
                  <p className="mt-1.5 max-w-[16rem] text-sm leading-snug opacity-75">
                    {mood.sub}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold opacity-70 ring-1 ring-current/20 hover:opacity-100"
                >
                  Close
                </button>
              </div>

              <motion.div
                className="relative mt-5 inline-flex rotate-[-3deg] items-center rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]"
                style={{
                  background: mood.accentSoft,
                  color: mood.accent,
                  boxShadow: `0 0 0 1.5px ${mood.accent}`,
                }}
                initial={reduce ? false : { scale: 0.7, rotate: -12 }}
                animate={{ scale: 1, rotate: -3 }}
                transition={springPop}
              >
                {mood.stamp}
              </motion.div>

              <div className="relative mt-5 space-y-1">
                <p className="font-display text-xl font-semibold tracking-[-0.02em]">
                  {vendorName}
                </p>
                <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-55">
                  {categoryLabel[category]} · {pickup ? 'Pickup' : 'Delivery'}
                </p>
                <p className="text-sm opacity-70">
                  {order.customerName} · {formatWhen(order.createdAt)}
                </p>
                <p className="font-mono text-xs opacity-55">{order.id}</p>
              </div>

              <div
                className="relative my-4 border-t-2 border-dashed opacity-25"
                style={{ borderColor: mood.ink }}
              />

              <ul className="relative space-y-2.5">
                {order.lines.map((line) => (
                  <li
                    key={line.item.id}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="font-semibold">{line.item.name}</span>
                      <span className="opacity-50"> ×{line.qty}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatNaira(line.item.price * line.qty)}
                    </span>
                  </li>
                ))}
              </ul>

              <div
                className="relative my-4 border-t-2 border-dashed opacity-25"
                style={{ borderColor: mood.ink }}
              />

              <dl className="relative space-y-1.5 text-sm">
                <div className="flex justify-between gap-3 opacity-70">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{formatNaira(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-3 opacity-70">
                  <dt>{pickup ? 'Pickup' : 'Delivery'}</dt>
                  <dd className="tabular-nums">
                    {order.deliveryFee === 0
                      ? 'Free'
                      : formatNaira(order.deliveryFee)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 pt-1 font-display text-lg font-semibold tracking-[-0.02em]">
                  <dt>Total</dt>
                  <dd className="tabular-nums" style={{ color: mood.accent }}>
                    {formatNaira(order.total)}
                  </dd>
                </div>
              </dl>

              <p className="relative mt-3 text-xs opacity-60">
                {paymentLabel(order.payment)}
              </p>

              <div
                className="relative mt-5 rounded-2xl px-4 py-3"
                style={{ background: mood.accentSoft }}
              >
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] opacity-60">
                  Handoff passkey
                </p>
                <p className="mt-1 font-display text-3xl font-semibold tracking-[0.22em]">
                  {order.passkey}
                </p>
                <p className="mt-1 text-xs leading-snug opacity-65">
                  Escrow releases when this code is used at the vendor — not on
                  door arrival.
                </p>
              </div>

              <div className="relative mt-4 text-xs leading-relaxed opacity-55">
                <p>
                  {pickup ? 'Collect at' : 'Delivering to'}{' '}
                  <span className="font-semibold opacity-90">
                    {order.placeName || order.address}
                  </span>
                </p>
                {order.placeName && (
                  <p className="mt-0.5 opacity-80">{order.address}</p>
                )}
              </div>

              <p
                className="relative mt-6 text-center font-display text-sm font-semibold tracking-[-0.02em] opacity-50"
              >
                {SITE.name} · Badagry · kampe
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
