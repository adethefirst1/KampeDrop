import type { ReactNode } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
        className={`grid shrink-0 place-items-center rounded-xl ${icon} ${
          light ? 'bg-white/20 ring-1 ring-white/25' : 'bg-ink'
        }`}
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

export function MarketingHeader({ transparent = false }: { transparent?: boolean }) {
  const { itemCount } = useCart()
  const location = useLocation()
  const [overHero, setOverHero] = useState(true)

  useEffect(() => {
    if (!transparent || location.pathname !== '/') {
      setOverHero(false)
      return
    }

    const update = () => {
      // Float over the dark hero, then settle into warm paper with the body.
      setOverHero(window.scrollY < window.innerHeight * 0.55)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [transparent, location.pathname])

  const onHero = transparent && location.pathname === '/' && overHero

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ${
        onHero
          ? 'border-b border-transparent bg-transparent text-white'
          : 'border-b border-line/50 bg-[#fffaf4]/92 text-ink shadow-[0_8px_28px_rgba(6,24,28,0.06)] backdrop-blur-md'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container-site flex h-14 items-center justify-between gap-2 sm:gap-3 md:h-[4.25rem] md:gap-4">
        <Logo light={onHero} />

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
          {marketingNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                  isActive
                    ? onHero
                      ? 'bg-white/18 text-white'
                      : 'bg-mango/12 text-mango-deep'
                    : onHero
                      ? 'text-white/75 hover:bg-white/10 hover:text-white'
                      : 'text-muted hover:bg-mist hover:text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            to={appPath('/cart')}
            className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
              onHero
                ? 'text-white hover:bg-white/15'
                : 'text-ink hover:bg-mango/10'
            }`}
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
          <AppEntryButton
            className={`inline-flex items-center justify-center rounded-full px-3.5 py-2.5 text-xs font-extrabold transition sm:px-4 sm:text-sm ${
              onHero
                ? 'bg-mango text-white shadow-[0_4px_0_#9a4f16] hover:bg-mango-deep'
                : 'bg-mango text-white shadow-[0_3px_0_#9a4f16] hover:bg-mango-deep'
            }`}
          >
            Order now
          </AppEntryButton>
        </div>
      </div>

      {/* Mobile nav — soft chips that match header mood, not a second bar */}
      <nav
        className={`flex gap-1.5 overflow-x-auto px-[max(1rem,calc((100%-min(1120px,100%-2rem))/2))] pb-3 pt-0 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden ${
          onHero ? 'border-t border-white/10' : 'border-t border-line/40'
        }`}
        aria-label="Site"
      >
        {marketingNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? onHero
                    ? 'bg-white text-ink'
                    : 'bg-ink text-white'
                  : onHero
                    ? 'bg-white/12 text-white/85'
                    : 'bg-mist/90 text-muted'
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

function TrackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AppHeader() {
  const { itemCount } = useCart()
  const standalone = isStandaloneDisplay()
  const location = useLocation()
  const onBrowse =
    location.pathname === APP_BASE || location.pathname === `${APP_BASE}/`

  return (
    <header
      className={`sticky top-0 z-50 pt-[env(safe-area-inset-top)] backdrop-blur-md transition-colors ${
        onBrowse
          ? 'border-b border-mango/10 bg-[#fff8f1]/88'
          : 'border-b border-line/60 bg-paper/92'
      }`}
    >
      <div
        className={`mx-auto flex max-w-lg items-center justify-between gap-2 px-4 ${
          onBrowse ? 'min-h-14 py-2' : 'h-14'
        }`}
      >
        <div className="min-w-0 flex-1">
          <Logo to={APP_BASE} />
          {onBrowse && (
            <p className="mt-0.5 truncate pl-[2.65rem] text-[10px] font-bold uppercase tracking-[0.14em] text-mango-deep sm:pl-[2.85rem]">
              Someone’s got you
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {!standalone && (
            <Link
              to="/"
              className="hidden rounded-full px-2.5 py-2 text-xs font-semibold text-muted hover:bg-mist hover:text-ink sm:inline"
            >
              Website
            </Link>
          )}
          <Link
            to={appPath('/find-order')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-mango/10 hover:text-ink"
            aria-label="Track order"
          >
            <TrackIcon />
          </Link>
          <Link
            to={appPath('/cart')}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-mango-deep transition hover:bg-mango/15 sm:w-auto sm:gap-1.5 sm:bg-mango/12 sm:px-3 sm:ring-1 sm:ring-mango/20"
            aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : 'Cart'}
          >
            <CartIcon />
            <span className="hidden text-sm font-semibold sm:inline">Cart</span>
            {itemCount > 0 && (
              <motion.span
                key={itemCount}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springSnap}
                className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-mango px-1 text-[11px] font-bold text-white sm:static sm:ml-0.5"
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
