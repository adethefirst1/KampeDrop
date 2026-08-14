import { Link, useParams } from 'react-router-dom'
import { appPath } from '../paths'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { OrderLayout, GuaranteePill } from '../components/layout'
import { AnimatedCheck, SecureSeal } from '../components/motion'
import { loadOrder, useCart, type PlacedOrder } from '../context/CartContext'
import { SITE } from '../data/site'
import { formatNaira, getVendor } from '../data/vendors'
import { easeOut, springSnap } from '../motion/tokens'

const steps = [
  { key: 'placed', label: 'Order placed', feel: 'We heard you.' },
  { key: 'preparing', label: 'Preparing', feel: 'Your vendor is on it.' },
  { key: 'on_the_way', label: 'On the way', feel: 'Rider is moving toward you.' },
  { key: 'delivered', label: 'Delivered', feel: 'Secured at your door.' },
] as const

type Status = (typeof steps)[number]['key']

export function TrackPage() {
  const { orderId } = useParams()
  const { lastOrder } = useCart()
  const reduce = useReducedMotion()
  const stored = orderId ? loadOrder(orderId) : null
  const baseOrder = stored ?? (lastOrder?.id === orderId ? lastOrder : null)

  const [status, setStatus] = useState<Status>(baseOrder?.status ?? 'placed')

  useEffect(() => {
    if (!baseOrder) return
    setStatus(baseOrder.status)
    const timers = [
      window.setTimeout(() => setStatus('preparing'), 3500),
      window.setTimeout(() => setStatus('on_the_way'), 8000),
      window.setTimeout(() => setStatus('delivered'), 14000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [baseOrder])

  const order: PlacedOrder | null = useMemo(() => {
    if (!baseOrder) return null
    return { ...baseOrder, status }
  }, [baseOrder, status])

  if (!order) {
    return (
      <OrderLayout>
        <div className="py-16 text-center">
          <h1 className="font-display text-2xl font-semibold">Order not found</h1>
          <p className="mt-2 text-sm text-muted">
            This tracking link may have expired in this browser.
          </p>
          <Link to={appPath()} className="mt-6 inline-block font-semibold text-lagoon">
            Start a new order
          </Link>
        </div>
      </OrderLayout>
    )
  }

  const vendor = getVendor(order.lines[0]?.vendorId ?? '')
  const activeIndex = steps.findIndex((s) => s.key === status)
  const feel = steps[activeIndex]?.feel ?? ''
  const delivered = status === 'delivered'

  return (
    <OrderLayout>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Order {order.id}
          </p>
          <AnimatePresence mode="wait">
            <motion.h1
              key={delivered ? 'done' : 'live'}
              className="mt-2 font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.03em]"
              initial={reduce ? false : { opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.45, ease: easeOut }}
            >
              {delivered ? 'It’s secured.' : 'We’re on it.'}
            </motion.h1>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p
              key={feel}
              className="mt-2 text-base font-medium text-lagoon-deep"
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.35 }}
            >
              {feel}
            </motion.p>
          </AnimatePresence>
          <p className="mt-2 text-sm text-muted">
            {vendor?.name} · for {order.customerName.split(' ')[0]}
          </p>
        </div>
        {delivered && <SecureSeal />}
      </div>

      <div className="mt-8 overflow-hidden rounded-[1.75rem] bg-ink p-5 text-white">
        <ol>
          {steps.map((step, i) => {
            const done = i <= activeIndex
            const current = i === activeIndex
            return (
              <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
                {i < steps.length - 1 && (
                  <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 bg-white/15" aria-hidden>
                    <motion.span
                      className="absolute inset-x-0 top-0 origin-top bg-lagoon"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: i < activeIndex ? 1 : 0 }}
                      transition={{ duration: 0.55, ease: easeOut }}
                      style={{ height: '100%', display: 'block' }}
                    />
                  </span>
                )}
                <motion.span
                  className={`relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                    done ? 'bg-lagoon text-white' : 'bg-white/10 text-white/40'
                  }`}
                  animate={
                    current && !delivered && !reduce
                      ? { scale: [1, 1.12, 1], boxShadow: ['0 0 0 0 rgba(26,122,100,0.5)', '0 0 0 10px rgba(26,122,100,0)', '0 0 0 0 rgba(26,122,100,0)'] }
                      : { scale: 1 }
                  }
                  transition={
                    current && !delivered
                      ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                      : springSnap
                  }
                >
                  {done ? <AnimatedCheck active={done} /> : i + 1}
                </motion.span>
                <div className="min-w-0">
                  <motion.p
                    className={`font-semibold ${done ? 'text-white' : 'text-white/40'}`}
                    animate={{ opacity: done ? 1 : 0.45 }}
                  >
                    {step.label}
                  </motion.p>
                  <AnimatePresence>
                    {current && (
                      <motion.p
                        className="mt-0.5 text-sm text-white/55"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {step.feel}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <motion.div
        className="mt-5"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45 }}
      >
        <GuaranteePill />
      </motion.div>

      <motion.div
        className="mt-5 rounded-3xl bg-paper p-4 ring-1 ring-line"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.45 }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Delivering to</p>
        <p className="mt-2 font-semibold">{order.address}</p>
        <p className="mt-1 text-sm text-muted">{order.phone}</p>
        {order.note && (
          <p className="mt-2 rounded-xl bg-mist px-3 py-2 text-sm text-ink-soft">
            Note: {order.note}
          </p>
        )}
      </motion.div>

      <motion.div
        className="mt-4 rounded-3xl bg-paper p-4 ring-1 ring-line"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36, duration: 0.45 }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Your items</p>
        <ul className="mt-3 space-y-2">
          {order.lines.map((line, i) => (
            <motion.li
              key={line.item.id}
              className="flex justify-between gap-3 text-sm"
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
            >
              <span>
                {line.qty}× {line.item.name}
              </span>
              <span className="font-semibold">{formatNaira(line.item.price * line.qty)}</span>
            </motion.li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
          <span className="text-muted">
            {order.payment === 'cod' ? 'Cash on delivery' : 'Transfer'} · total
          </span>
          <span className="font-display text-lg font-semibold">{formatNaira(order.total)}</span>
        </div>
      </motion.div>

      <a
        href={`tel:${SITE.supportPhone}`}
        className="mt-6 flex w-full items-center justify-center rounded-2xl border border-line bg-paper py-4 text-sm font-bold text-ink transition hover:bg-white"
      >
        Need help? Talk to a real person
      </a>
      <p className="mt-2 text-center text-xs text-muted">A human — not a bot.</p>

      <Link
        to={appPath()}
        className="mt-8 block text-center text-sm font-semibold text-lagoon hover:underline"
      >
        Order again
      </Link>
    </OrderLayout>
  )
}
