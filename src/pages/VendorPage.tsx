import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { appPath } from '../paths'
import { AnimatePresence, motion } from 'motion/react'
import { AppShell } from '../components/layout'
import { VendorInfoSheet } from '../components/VendorInfoSheet'
import { MotionItem, Stagger } from '../components/motion'
import { useCart } from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import { categoryLabel, formatNaira, isBuyerVisible, type MenuItem } from '../data/vendors'
import { fadeUp, springSnap, tapPress } from '../motion/tokens'

export function VendorPage() {
  const { vendorId } = useParams()
  const { getVendor } = useCatalog()
  const vendor = getVendor(vendorId ?? '')
  const { addItem, setQty, lines } = useCart()
  const [toast, setToast] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  if (!vendor || !isBuyerVisible(vendor)) {
    return (
      <AppShell showInstallTip={false}>
        <div className="py-16 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
            Vendor unavailable
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted">
            This shop may be offline or no longer on KampeDrop. Pick another nearby
            vendor.
          </p>
          <Link to={appPath()} className="btn-primary mt-8 inline-flex">
            Browse vendors
          </Link>
        </div>
      </AppShell>
    )
  }

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1800)
  }

  function qtyFor(itemId: string) {
    return lines.find((l) => l.item.id === itemId)?.qty ?? 0
  }

  function onAdd(item: MenuItem) {
    const result = addItem(vendor!.id, item)
    flash(result.ok ? `Added ${item.name}` : result.reason)
  }

  const menuItems = vendor.items.filter((it) => it.available !== false)

  return (
    <AppShell showInstallTip={false}>
      <Link to={appPath()} className="text-sm font-semibold text-muted hover:text-ink">
        ← Vendors
      </Link>

      <div className="mt-3 flex items-start gap-3">
        <span
          className="mt-1 h-10 w-1.5 shrink-0 rounded-full"
          style={{ background: vendor.accent }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-lagoon">
            {categoryLabel[vendor.category]} · {vendor.area}
          </p>
          <div className="mt-1 flex items-start gap-2">
            <h1 className="min-w-0 flex-1 font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.03em]">
              {vendor.name}
            </h1>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mist text-sm font-extrabold text-ink ring-1 ring-line"
              aria-label="More about this vendor"
              title="More info"
            >
              ⓘ
            </button>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm text-muted">{vendor.tagline}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-ink-soft">
            <span className="rounded-lg bg-mist px-2 py-1">~{vendor.etaMins} min</span>
            <span className="rounded-lg bg-mist px-2 py-1">★ {vendor.rating}</span>
            <span className="rounded-lg bg-mango/15 px-2 py-1 text-mango-deep">Vetted</span>
            {!vendor.acceptingOrders && (
              <span className="rounded-lg bg-ink/10 px-2 py-1 text-ink-soft">Paused</span>
            )}
          </div>
        </div>
      </div>

      {!vendor.acceptingOrders && (
        <p className="mt-3 rounded-xl bg-mist px-3 py-2.5 text-sm font-semibold text-ink-soft">
          This shop paused new orders for now. Browse another vendor nearby.
        </p>
      )}

      <div className="mt-6 flex items-end justify-between gap-3">
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">Menu</h2>
        <p className="text-xs font-semibold text-muted">{menuItems.length} items</p>
      </div>

      <Stagger className="mt-3 space-y-2.5" as="ul" fast immediate>
        {menuItems.map((item) => {
          const qty = qtyFor(item.id)
          return (
            <MotionItem
              key={item.id}
              as="li"
              variants={fadeUp}
              className="rounded-2xl bg-paper p-3.5 ring-1 ring-line"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink">{item.name}</h3>
                    {item.popular && (
                      <span className="rounded-full bg-mango/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mango-deep">
                        Popular
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted">
                      {item.description}
                    </p>
                  )}
                  <p className="mt-1.5 text-sm font-bold text-ink">
                    {formatNaira(item.price)}
                  </p>
                </div>

                {vendor.acceptingOrders &&
                  (qty === 0 ? (
                    <motion.button
                      type="button"
                      whileTap={tapPress}
                      onClick={() => onAdd(item)}
                      className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white"
                    >
                      Add
                    </motion.button>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1 rounded-xl bg-mist p-1">
                      <button
                        type="button"
                        aria-label="Decrease"
                        onClick={() => setQty(item.id, qty - 1)}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-paper text-lg font-bold ring-1 ring-line"
                      >
                        −
                      </button>
                      <span className="min-w-7 text-center text-sm font-bold">{qty}</span>
                      <button
                        type="button"
                        aria-label="Increase"
                        onClick={() => onAdd(item)}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-lg font-bold text-white"
                      >
                        +
                      </button>
                    </div>
                  ))}
              </div>
            </MotionItem>
          )
        })}
      </Stagger>

      {menuItems.length === 0 && (
        <div className="mt-10 rounded-[1.5rem] bg-paper px-5 py-10 text-center ring-1 ring-line">
          <p className="font-display text-xl font-semibold tracking-[-0.02em]">
            Menu coming soon
          </p>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
            This vendor is on KampeDrop, but their list isn’t live yet. Try another
            shop nearby.
          </p>
          <Link to={appPath()} className="btn-ink mt-5 inline-flex">
            Browse vendors
          </Link>
        </div>
      )}

      <VendorInfoSheet
        vendor={vendor}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />

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
