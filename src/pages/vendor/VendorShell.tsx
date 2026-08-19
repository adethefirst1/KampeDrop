import type { ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useCatalog } from '../../context/CatalogContext'
import { useVendor } from '../../context/VendorContext'
import { SITE } from '../../data/site'

export const VENDOR_BASE = '/vendor'

export function vendorPath(path = ''): string {
  if (!path || path === '/') return VENDOR_BASE
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${VENDOR_BASE}${normalized}`
}

export function RequireVendor({ children }: { children: ReactNode }) {
  const { authenticated } = useVendor()
  if (!authenticated) return <Navigate to={vendorPath('/login')} replace />
  return children
}

export function VendorShell() {
  const { vendorId, logout, ordersForVendor } = useVendor()
  const { getVendor } = useCatalog()
  const vendor = getVendor(vendorId ?? '')
  const { pathname } = useLocation()
  const pending = ordersForVendor.filter(
    (o) =>
      o.status !== 'cancelled' &&
      o.status !== 'delivered' &&
      !o.vendorConfirmed,
  ).length
  const awaitingReview =
    vendor &&
    (vendor.verificationStatus === 'pending' ||
      vendor.verificationStatus === 'needs_info' ||
      vendor.verificationStatus === 'draft')

  const tabs = [
    { to: vendorPath(), label: 'Orders', end: true },
    { to: vendorPath('/menu'), label: 'Menu', end: false },
    { to: vendorPath('/profile'), label: 'Business', end: false },
  ]

  return (
    <div className="min-h-svh mist-wash text-ink">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-lagoon">
              {SITE.name} Vendor
            </p>
            <p className="truncate font-display text-lg font-bold leading-tight tracking-[-0.02em]">
              {vendor?.name ?? 'Your business'}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink-soft"
          >
            Sign out
          </button>
        </div>
        <nav className="mx-auto flex max-w-lg gap-1 px-4 pb-2.5" aria-label="Vendor">
          {tabs.map((tab) => {
            const active = tab.end
              ? pathname === tab.to
              : pathname.startsWith(tab.to)
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold ${
                  active ? 'bg-ink text-white' : 'bg-mist text-muted'
                }`}
              >
                {tab.label}
                {tab.label === 'Orders' && pending > 0 && !awaitingReview
                  ? ` · ${pending}`
                  : ''}
              </NavLink>
            )
          })}
        </nav>
      </header>

      {awaitingReview && (
        <div className="border-b border-dusk/40 bg-dusk/90 px-4 py-3 text-ink">
          <div className="mx-auto max-w-lg">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
              {vendor.verificationStatus === 'needs_info'
                ? 'More information needed'
                : 'Verification in progress'}
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug">
              {vendor.verificationStatus === 'needs_info' && vendor.reviewNote
                ? vendor.reviewNote
                : 'You’re not visible to customers yet. We typically complete review within 24 hours of a complete submission.'}
            </p>
          </div>
        </div>
      )}

      {vendor?.verificationStatus === 'rejected' && (
        <div className="border-b border-mango/30 bg-mango/15 px-4 py-3 text-mango-deep">
          <div className="mx-auto max-w-lg">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
              Not approved
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug">
              {vendor.reviewNote ||
                'We couldn’t verify this listing. WhatsApp support if you believe this is a mistake.'}
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-lg px-4 py-5 pb-24">
        <Outlet />
      </main>
      <p className="pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[11px] font-semibold text-muted">
        <Link to="/work-with-us" className="text-lagoon hover:underline">
          Work with us
        </Link>
        {' · '}
        No app download
      </p>
    </div>
  )
}
