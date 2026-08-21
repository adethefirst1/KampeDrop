import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVendor } from '../../context/VendorContext'
import { labelForStatus } from '../../data/ops'
import { formatNaira } from '../../data/vendors'
import {
  getVendorOrderHistory,
  type VendorPortalOrder,
} from '../../lib/vendorsApi'
import { vendorPath } from './VendorShell'

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

/** Read-only fulfilled / cancelled orders for this vendor. */
export function VendorHistoryPage() {
  const { accessToken } = useVendor()
  const [orders, setOrders] = useState<VendorPortalOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!accessToken) {
      setOrders([])
      setLoading(false)
      setError('Not signed in.')
      return
    }
    setLoading(true)
    setError(null)
    const result = await getVendorOrderHistory(accessToken)
    if (!result.ok) {
      setError(result.reason)
      setOrders([])
      setLoading(false)
      return
    }
    setOrders(result.orders)
    setLoading(false)
  }, [accessToken])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">
            History
          </h1>
          <p className="mt-1 text-sm text-muted">
            Delivered and cancelled orders — read-only.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <p className="mt-3 text-xs font-semibold text-muted">
        <Link to={vendorPath()} className="text-lagoon hover:underline">
          ← Open orders
        </Link>
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
          {error}
        </p>
      )}

      {loading && !orders.length && (
        <p className="mt-8 text-sm font-semibold text-muted">Loading history…</p>
      )}

      {!loading && !orders.length && !error && (
        <div className="mt-8 rounded-[1.5rem] border-[3px] border-dashed border-ink/20 bg-paper px-5 py-10 text-center">
          <p className="font-display text-xl font-semibold">No past orders yet</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            When an order is collected or cancelled, it shows up here.
          </p>
        </div>
      )}

      <ul className="mt-6 space-y-2.5">
        {orders.map((order) => (
          <li
            key={order.id}
            className="rounded-2xl bg-paper p-4 ring-1 ring-line"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-extrabold text-ink">{order.id}</p>
                <p className="mt-0.5 text-xs font-semibold text-muted">
                  {formatWhen(order.createdAt)}
                </p>
                <p className="mt-1 text-xs font-semibold text-ink-soft">
                  {order.lines.map((l) => `${l.qty}× ${l.item.name}`).join(', ')}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-extrabold">{formatNaira(order.total)}</p>
                <p
                  className={`mt-1 text-[11px] font-bold ${
                    order.status === 'cancelled'
                      ? 'text-mango-deep'
                      : 'text-lagoon'
                  }`}
                >
                  {labelForStatus(order.status, order.fulfillment)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
