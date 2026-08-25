import type { ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { VendorInstallButton, VendorInstallTip } from '../../components/InstallPrompt'
import { useCatalog } from '../../context/CatalogContext'
import { useVendor } from '../../context/VendorContext'
import { SITE } from '../../data/site'
import { VendorLockScreen } from './VendorLockScreen'

export const VENDOR_BASE = '/vendor'

export function vendorPath(path = ''): string {
  if (!path || path === '/') return VENDOR_BASE
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${VENDOR_BASE}${normalized}`
}

export function RequireVendor({ children }: { children: ReactNode }) {
  const { authenticated, boardLocked } = useVendor()
  if (!authenticated) return <Navigate to={vendorPath('/login')} replace />
  if (boardLocked) return <VendorLockScreen />
  return children
}

export function VendorShell() {
  const {
    vendorId,
    vendorName,
    verificationStatus: sessionStatus,
    logout,
    lockBoard,
    ordersForVendor,
  } = useVendor()
  const { getVendor } = useCatalog()
  const vendor = getVendor(vendorId ?? '')
  const displayName = vendor?.name ?? vendorName ?? 'Your business'
  const status = vendor?.verificationStatus ?? sessionStatus
  const { pathname } = useLocation()
  const pending = ordersForVendor.filter((o) =>
    ['confirmed', 'finding_rider', 'rider_assigned'].includes(o.status),
  ).length
  const awaitingReview =
    status === 'pending' || status === 'needs_info' || status === 'draft'

  const tabs = [
    { to: vendorPath(), label: 'Orders', end: true },
    { to: vendorPath('/history'), label: 'History', end: false },
    { to: vendorPath('/wallet'), label: 'Wallet', end: false },
    { to: vendorPath('/menu'), label: 'Menu', end: false },
    { to: vendorPath('/profile'), label: 'Business', end: false },
  ]

  return (
    <div className="min-h-svh vendor-wash text-ink">
      <header className="sticky top-0 z-40 border-b border-ink/15 bg-[#e8eceb]/92 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-dusk">
              {SITE.name} · Board
            </p>
            <p className="truncate font-display text-lg font-bold leading-tight tracking-[-0.02em]">
              {displayName}
            </p>
            <p className="truncate text-[11px] font-semibold text-ink-soft/80">
              {pending > 0 && !awaitingReview
                ? `Heat’s on — ${pending} waiting.`
                : 'Kitchen open. Orders will come.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={lockBoard}
              className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft hover:bg-ink/5 hover:text-ink"
              aria-label="Lock board"
            >
              Lock
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-muted hover:bg-ink/5 hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav
          className="mx-auto flex max-w-lg gap-1 overflow-x-auto px-4 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Vendor board"
        >
          {tabs.map((tab) => {
            const active = tab.end
              ? pathname === tab.to
              : pathname.startsWith(tab.to)
            const showPending =
              tab.label === 'Orders' && pending > 0 && !awaitingReview
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                  active
                    ? 'bg-ink text-dusk shadow-[0_2px_0_rgba(6,24,28,0.35)]'
                    : 'bg-ink/6 text-ink-soft hover:bg-ink/10'
                }`}
              >
                {tab.label}
                {showPending ? (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-mango px-1 text-[10px] font-bold text-white">
                    {pending}
                  </span>
                ) : null}
              </NavLink>
            )
          })}
        </nav>
      </header>

      {awaitingReview && (
        <div className="border-b border-dusk/50 bg-dusk/85 px-4 py-3 text-ink">
          <div className="mx-auto max-w-lg">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
              {status === 'needs_info'
                ? 'More information needed'
                : 'Verification in progress'}
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug">
              {status === 'needs_info' && vendor?.reviewNote
                ? vendor.reviewNote
                : 'You’re not visible to customers yet. We typically complete review within 24 hours of a complete submission.'}
            </p>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="border-b border-mango/30 bg-mango/15 px-4 py-3 text-mango-deep">
          <div className="mx-auto max-w-lg">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
              Not approved
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug">
              {vendor?.reviewNote ||
                'We couldn’t verify this listing. WhatsApp support if you believe this is a mistake.'}
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-lg px-4 py-5 pb-24">
        <VendorInstallTip />
        <Outlet />
      </main>
      <p className="pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[11px] font-semibold text-muted">
        <Link to="/work-with-us" className="text-ink-soft hover:text-ink hover:underline">
          Work with us
        </Link>
        {' · '}
        <VendorInstallButton className="text-ink-soft hover:text-ink hover:underline" />
      </p>
    </div>
  )
}
