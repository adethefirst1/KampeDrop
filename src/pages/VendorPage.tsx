import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { appPath } from '../paths'
import { AnimatePresence, motion } from 'motion/react'
import { AppShell } from '../components/layout'
import { VendorInfoSheet } from '../components/VendorInfoSheet'
import { MotionItem, Stagger } from '../components/motion'
import { useCart } from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import {
  categoryLabel,
  formatNaira,
  isBuyerVisible,
  type MenuItem,
} from '../data/vendors'
import { fadeUp, springSnap, tapPress } from '../motion/tokens'

export function VendorPage() {
  const { vendorId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { getVendor } = useCatalog()
  const vendor = getVendor(vendorId ?? '')
  const { addItem, setQty, lines, clear, vendor: cartVendor } = useCart()
  const [toast, setToast] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null)
  const [focusItemId, setFocusItemId] = useState<string | null>(null)

  const deepItemId = searchParams.get('item')

  function goBack() {
    const idx =
      typeof window.history.state?.idx === 'number'
        ? window.history.state.idx
        : 0
    if (idx > 0) {
      navigate(-1)
      return
    }
    navigate(appPath())
  }

  useEffect(() => {
    if (!deepItemId || !vendor) return
    setFocusItemId(deepItemId)
    window.setTimeout(() => {
      document
        .getElementById(`menu-item-${deepItemId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
    const next = new URLSearchParams(searchParams)
    next.delete('item')
    setSearchParams(next, { replace: true })
    // Only react to the deep-link param once when vendor is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepItemId, vendor?.id])

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
    if (!result.ok && result.code === 'vendor_conflict') {
      setPendingItem(item)
      return
    }
    flash(result.ok ? `Added ${item.name}` : result.reason)
  }

  function confirmReplaceCart() {
    if (!pendingItem || !vendor) return
    clear()
    const result = addItem(vendor.id, pendingItem)
    setPendingItem(null)
    flash(result.ok ? `Cart cleared · added ${pendingItem.name}` : result.reason)
  }

  const menuItems = vendor.items.filter((it) => it.available !== false)

  return (
    <AppShell showInstallTip={false}>
      <button
        type="button"
        onClick={goBack}
        className="text-sm font-semibold text-muted hover:text-ink"
      >
        ← Back
      </button>

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
          const focused = focusItemId === item.id
          return (
            <MotionItem
              key={item.id}
              as="li"
              variants={fadeUp}
              className={`rounded-2xl bg-paper p-3.5 ring-1 transition ${
                focused ? 'ring-2 ring-lagoon shadow-[0_0_0_4px_rgba(12,101,96,0.12)]' : 'ring-line'
              }`}
            >
              <div id={`menu-item-${item.id}`} className="flex items-center justify-between gap-3">
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
                        onClick={() => setQty(item.id, qty + 1)}
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
        <div className="mt-6 rounded-2xl bg-paper px-5 py-10 text-center ring-1 ring-line">
          <p className="font-display text-xl font-semibold">Menu coming soon</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            This vendor is vetted — items will appear here shortly.
          </p>
          <Link to={appPath()} className="btn-ink mt-5 inline-flex">
            Browse other vendors
          </Link>
        </div>
      )}

      <VendorInfoSheet
        vendor={vendor}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />

      <AnimatePresence>
        {pendingItem && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/55 p-3 sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="replace-cart-title"
              className="w-full max-w-md rounded-[1.5rem] bg-paper p-5 shadow-2xl"
              initial={{ y: 24, opacity: 0.9 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={springSnap}
            >
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-lagoon">
                One shop per order
              </p>
              <h2
                id="replace-cart-title"
                className="mt-2 font-display text-xl font-semibold tracking-[-0.02em]"
              >
                Replace your cart?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Your cart has items from{' '}
                <span className="font-semibold text-ink">
                  {cartVendor?.name ?? 'another shop'}
                </span>
                . Clear it to add{' '}
                <span className="font-semibold text-ink">{pendingItem.name}</span>{' '}
                from {vendor.name}?
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={confirmReplaceCart}
                  className="btn-primary flex-1"
                >
                  Clear & add
                </button>
                <button
                  type="button"
                  onClick={() => setPendingItem(null)}
                  className="btn-ink flex-1"
                >
                  Keep current cart
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={springSnap}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
