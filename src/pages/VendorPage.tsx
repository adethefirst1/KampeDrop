import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { appPath } from '../paths'
import { AnimatePresence, motion } from 'motion/react'
import { AppShell, GuaranteePill } from '../components/layout'
import { MotionItem, Stagger } from '../components/motion'
import { useCart } from '../context/CartContext'
import { categoryLabel, formatNaira, getVendor } from '../data/vendors'
import { fadeUp, springSnap, tapPress } from '../motion/tokens'

export function VendorPage() {
  const { vendorId } = useParams()
  const vendor = getVendor(vendorId ?? '')
  const { addItem } = useCart()
  const [toast, setToast] = useState<string | null>(null)

  if (!vendor) {
    return (
      <AppShell>
        <div className="py-16 text-center">
          <h1 className="font-display text-2xl font-semibold">Vendor not found</h1>
          <Link to={appPath()} className="mt-4 inline-block font-semibold text-lagoon">
            Back to vendors
          </Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Link to={appPath()} className="text-sm font-semibold text-muted hover:text-ink">
        ← Vendors
      </Link>

      <motion.div
        className="mt-4 overflow-hidden rounded-[1.5rem] px-4 py-5 text-white"
        style={{ background: `linear-gradient(160deg, ${vendor.accent} 0%, #0E1C18 78%)` }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
          {categoryLabel[vendor.category]} · {vendor.area}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-[-0.03em]">
          {vendor.name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/75">{vendor.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-white/10 px-3 py-1.5">~{vendor.etaMins} min</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5">★ {vendor.rating}</span>
          <span className="rounded-full bg-mango/90 px-3 py-1.5">Vetted</span>
        </div>
      </motion.div>

      <div className="mt-5 rounded-2xl border border-lagoon/15 bg-paper p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-lagoon">Why we trust them</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{vendor.vettedNote}</p>
      </div>

      <div className="mt-4">
        <GuaranteePill compact />
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold tracking-[-0.02em]">Menu</h2>
      <Stagger className="mt-3 space-y-3" as="ul" fast>
        {vendor.items.map((item) => (
          <MotionItem
            key={item.id}
            as="li"
            variants={fadeUp}
            className="rounded-3xl bg-paper p-4 ring-1 ring-line"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">{item.name}</h3>
                  {item.popular && (
                    <span className="rounded-full bg-mango/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mango-deep">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
                <p className="mt-2 text-sm font-bold text-ink">{formatNaira(item.price)}</p>
              </div>
              <motion.button
                type="button"
                whileTap={tapPress}
                whileHover={{ scale: 1.04 }}
                onClick={() => {
                  const result = addItem(vendor.id, item)
                  setToast(result.ok ? `Added ${item.name}` : result.reason)
                  window.setTimeout(() => setToast(null), 2200)
                }}
                className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-ink-soft"
              >
                Add
              </motion.button>
            </div>
          </MotionItem>
        ))}
      </Stagger>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed inset-x-0 top-20 z-50 flex justify-center px-4"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={springSnap}
          >
            <p className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lg">
              {toast}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
