import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useOps } from '../../context/OpsContext'

export function RequireOps({ children }: { children: ReactNode }) {
  const { authenticated, authReady } = useOps()
  if (!authReady) {
    return (
      <div className="flex min-h-svh items-center justify-center mist-wash px-4">
        <p className="text-sm font-semibold text-muted">Checking session…</p>
      </div>
    )
  }
  if (!authenticated) return <Navigate to="/admin/login" replace />
  return <AdminShell>{children}</AdminShell>
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { logout, user } = useOps()
  const { pathname } = useLocation()
  const onOrders = pathname === '/admin' || pathname.startsWith('/admin/orders')
  const onVendors = pathname.startsWith('/admin/vendors')

  return (
    <div className="min-h-svh mist-wash text-ink">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link to="/admin" className="font-display text-lg font-semibold tracking-[-0.02em]">
            SureDrop <span className="text-lagoon">Ops</span>
          </Link>
          <nav className="flex items-center gap-1 text-xs font-bold">
            <Link
              to="/admin"
              className={`rounded-full px-3 py-1.5 ${
                onOrders ? 'bg-ink text-white' : 'text-muted hover:text-ink'
              }`}
            >
              Orders
            </Link>
            <Link
              to="/admin/vendors"
              className={`rounded-full px-3 py-1.5 ${
                onVendors ? 'bg-ink text-white' : 'text-muted hover:text-ink'
              }`}
            >
              Vendors
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {user?.email && (
              <span className="hidden max-w-[9rem] truncate text-[11px] font-semibold text-muted sm:inline">
                {user.email}
              </span>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink-soft"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5 pb-16">{children}</main>
    </div>
  )
}
