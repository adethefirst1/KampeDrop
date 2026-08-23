import type { ReactNode } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCart } from '../context/CartContext'
import { SITE } from '../data/site'
import { formatNaira } from '../data/vendors'
import { springSnap, springSoft } from '../motion/tokens'
import { APP_BASE, appPath, isAppRoute, isStandaloneDisplay } from '../paths'
import { InstallPrompt, AppEntryButton, InAppInstallTip } from './InstallPrompt'

export function Logo({
  light = false,
  size = 'md',
  to = '/',
}: {
  light?: boolean
  size?: 'md' | 'lg'
  to?: string
}) {
  const icon = size === 'lg' ? 'h-11 w-11' : 'h-8 w-8 sm:h-9 sm:w-9'
  const text =
    size === 'lg'
      ? 'text-[1.6rem]'
      : 'text-[1.15rem] sm:text-[1.35rem]'
  return (
    <Link to={to} className="inline-flex min-w-0 items-center gap-2 sm:gap-2.5">
      <span
        className={`grid shrink-0 place-items-center rounded-xl bg-ink ${icon}`}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M3 7.2C3 4.5 5.2 2.2 9 2.2s6 2.3 6 5v4.4c0 .9-.7 1.6-1.6 1.6H4.6C3.7 13.2 3 12.5 3 11.6V7.2z"
            fill="#efc27a"
            opacity="0.35"
          />
          <path
            d="M5.2 8h7.6v1.2H5.2V8zm0 2.4h4.8V11.6H5.2V10.4z"
            fill="#efc27a"
          />
          <circle cx="13.2" cy="4.2" r="2" fill="#efc27a" />
        </svg>
      </span>
      <span
        className={`truncate font-display font-semibold tracking-[-0.03em] ${text} ${
          light ? 'text-white' : 'text-ink'
        }`}
      >
        {SITE.name}
      </span>
    </Link>
  )
}

const marketingNav = [
  { to: '/how', label: 'How it works', short: 'How' },
  { to: '/work-with-us', label: 'Work with us', short: 'Sell' },
  { to: '/guarantee', label: 'Guarantee', short: 'Guarantee' },
]

export function MarketingHeader(_props: { transparent?: boolean } = {}) {
  const { itemCount } = useCart()

  return (
    <header
      className="sticky top-0 z-50 border-b border-line/70 bg-paper/95 text-ink backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container-site flex h-14 items-center justify-between gap-2 sm:gap-3 md:h-16 md:gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {marketingNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-mist text-ink'
                    : 'text-muted hover:bg-mist hover:text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            to={appPath('/cart')}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-mist"
            aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : 'Cart'}
          >
            <CartIcon />
            {itemCount > 0 && (
              <motion.span
                key={itemCount}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springSnap}
                className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-mango px-1 text-[11px] font-bold text-white"
              >
                {itemCount}
              </motion.span>
            )}
          </Link>
          <AppEntryButton className="inline-flex items-center justify-center rounded-full bg-mango px-3 py-2 text-xs font-extrabold text-white transition hover:bg-mango-deep sm:px-3.5 sm:py-2.5 sm:text-sm">
            Order now
          </AppEntryButton>
        </div>
      </div>

      {/* Mobile secondary nav — single scroll row, no tall wrap */}
      <nav
        className="container-site -mx-0 flex gap-1.5 overflow-x-auto pb-2.5 pt-0 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
        aria-label="Site"
      >
        {marketingNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                isActive ? 'bg-ink text-white' : 'bg-mist text-muted'
              }`
            }
          >
            {item.short}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6h15l-1.5 9h-12L6 6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M6 6 5 3H2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="9" cy="20" r="1.25" fill="currentColor" />
      <circle cx="17" cy="20" r="1.25" fill="currentColor" />
    </svg>
  )
}

function AppHeader() {
  const { itemCount } = useCart()
  const standalone = isStandaloneDisplay()

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <Logo to={APP_BASE} />
        <div className="flex items-center gap-2">
          {!standalone && (
            <Link to="/" className="text-xs font-semibold text-muted hover:text-ink">
              Website
            </Link>
          )}
          <Link
            to={appPath('/find-order')}
            className="text-xs font-semibold text-muted hover:text-ink"
          >
            Track
          </Link>
          <Link
            to={appPath('/cart')}
            className="relative rounded-full bg-mist px-3 py-2 text-sm font-semibold"
          >
            Cart
            {itemCount > 0 && (
              <motion.span
                key={itemCount}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springSnap}
                className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-mango px-1 text-[11px] font-bold text-white"
              >
                {itemCount}
              </motion.span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink text-white">
      <div className="container-site grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light size="lg" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            Born by the lagoon. Delivery for Badagry homes — Town to Ajara, Ibereko to Aradagun —
            confirmed, tracked, and made right.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Explore</p>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            <li>
              <AppEntryButton className="text-left text-sm text-white/75 hover:text-white">
                Open app
              </AppEntryButton>
            </li>
            <li>
              <Link to="/how" className="hover:text-white">
                How it works
              </Link>
            </li>
            <li>
              <Link to="/work-with-us" className="hover:text-white">
                Work with us
              </Link>
            </li>
            <li>
              <Link to="/vendor/signup" className="hover:text-white">
                Register a business
              </Link>
            </li>
            <li>
              <Link to="/vendor/login" className="hover:text-white">
                Vendor board
              </Link>
            </li>
            <li>
              <Link to="/guarantee" className="hover:text-white">
                Guarantee
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-white">
                Terms
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Talk to us</p>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            <li>
              <a href={`tel:${SITE.supportPhone}`} className="hover:text-white">
                {SITE.supportPhoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`} className="hover:text-white">
                {SITE.email}
              </a>
            </li>
            <li className="text-white/50">Serving {SITE.areaLong}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-2 py-5 text-xs text-white/40 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} KampeDrop. Born in Badagry, by the lagoon.</p>
          <p>Web app · Install to your home screen</p>
        </div>
      </div>
    </footer>
  )
}

export function GuaranteePill({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`inline-flex items-start gap-2 rounded-2xl border border-lagoon/20 bg-lagoon/8 ${
        compact ? 'px-3 py-2' : 'px-4 py-3'
      }`}
    >
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lagoon text-[11px] font-bold text-white">
        ✓
      </span>
      <p
        className={`text-left text-lagoon-deep ${
          compact ? 'text-xs leading-snug' : 'text-sm leading-snug'
        }`}
      >
        <span className="font-bold">KampeDrop Guarantee</span>
        {compact
          ? ' — wrong or late, we fix it.'
          : ' — if it’s wrong or late, we make it right. Immediately.'}
      </p>
    </div>
  )
}

export function BottomCartBar() {
  const { itemCount, subtotal, vendor } = useCart()
  const location = useLocation()
  const reduce = useReducedMotion()
  const path = location.pathname
  const hidden =
    !itemCount ||
    path === appPath('/cart') ||
    path.startsWith(appPath('/checkout')) ||
    path.startsWith(appPath('/orders')) ||
    (!isAppRoute(path) && path !== '/')

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6"
          initial={reduce ? false : { y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 64, opacity: 0 }}
          transition={springSoft}
        >
          <motion.div layout transition={springSoft}>
            <Link
              to={appPath('/cart')}
              className="pointer-events-auto mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-ink px-3.5 py-3 text-white shadow-[0_12px_40px_rgba(14,28,24,0.35)]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mango text-sm font-bold text-white">
                {itemCount}
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-bold">View cart</p>
                <p className="truncate text-xs text-white/65">
                  {vendor?.name ?? 'Your order'}
                </p>
              </div>
              <motion.span
                key={subtotal}
                initial={reduce ? false : { scale: 0.9, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                className="shrink-0 text-sm font-bold"
              >
                {formatNaira(subtotal)}
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Sticky primary CTA for cart / checkout (replaces bottom cart bar on those screens) */
export function StickyCommerceBar({ children }: { children: ReactNode }) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    const publish = (next: number) => {
      setHeight(next)
      document.documentElement.style.setProperty(
        '--sticky-commerce-bar-height',
        `${next}px`,
      )
    }

    const measure = () => {
      // Outer fixed wrapper includes bottom safe-area padding.
      const outer = shell.parentElement
      const h = outer?.getBoundingClientRect().height ?? shell.getBoundingClientRect().height
      publish(Math.ceil(h))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(shell)
    if (shell.parentElement) ro.observe(shell.parentElement)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      document.documentElement.style.removeProperty('--sticky-commerce-bar-height')
    }
  }, [])

  return (
    <>
      {/* In-flow spacer matches the real fixed bar so page content clears it */}
      <div
        aria-hidden
        className="pointer-events-none shrink-0"
        style={{ height: height > 0 ? height : '7.5rem' }}
      />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6">
        <div
          ref={shellRef}
          className="pointer-events-auto mx-auto max-w-xl rounded-2xl bg-ink p-3 shadow-[0_12px_40px_rgba(14,28,24,0.35)]"
        >
          {children}
        </div>
      </div>
    </>
  )
}

export function MarketingLayout({
  children,
  transparentHeader = false,
  withCartBar = false,
  showInstall = false,
}: {
  children: ReactNode
  transparentHeader?: boolean
  withCartBar?: boolean
  showInstall?: boolean
}) {
  return (
    <div className="min-h-svh mist-wash text-ink">
      <MarketingHeader transparent={transparentHeader} />
      <main>{children}</main>
      <SiteFooter />
      {withCartBar && <BottomCartBar />}
      {showInstall && <InstallPrompt />}
    </div>
  )
}

/** Installable app shell — used under /app */
export function AppShell({
  children,
  narrow = false,
  showInstallTip,
  bleed = false,
  wash = 'mist',
}: {
  children: ReactNode
  narrow?: boolean
  /** Default: only on browse home to keep commerce screens clean */
  showInstallTip?: boolean
  /** Edge-to-edge main (no mist wash / container) — confirmation moments */
  bleed?: boolean
  /** Page atmosphere */
  wash?: 'mist' | 'shop'
}) {
  const { pathname } = useLocation()
  const tip =
    showInstallTip ?? (pathname === APP_BASE || pathname === `${APP_BASE}/`)

  const washClass = bleed ? 'bg-ink' : wash === 'shop' ? 'shop-wash' : 'mist-wash'

  return (
    <div className={`relative min-h-svh text-ink ${washClass}`}>
      <AppHeader />
      <main
        className={
          bleed
            ? 'min-h-[calc(100svh-3.5rem)] p-0'
            : `relative min-h-[70svh] pb-28 pt-4 ${
                narrow ? 'container-narrow' : 'mx-auto max-w-lg px-4 md:max-w-3xl'
              }`
        }
      >
        {tip && <InAppInstallTip />}
        {children}
      </main>
      {!bleed && <BottomCartBar />}
    </div>
  )
}

export function OrderLayout({
  children,
  bleed = false,
}: {
  children: ReactNode
  bleed?: boolean
}) {
  return (
    <AppShell narrow={!bleed} bleed={bleed} showInstallTip={false}>
      {children}
    </AppShell>
  )
}
