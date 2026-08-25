import { useCallback, useEffect, useState } from 'react'
import {
  fetchAvailableRiders,
  zoneLabel,
  type AvailableRider,
} from '../../lib/ridersApi'

function formatWhen(iso: string | null) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/** Compact ops glance: who’s on duty and roughly where. */
export function AvailableRidersPanel() {
  const [riders, setRiders] = useState<AvailableRider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await fetchAvailableRiders()
    setLoading(false)
    if (!result.ok) {
      setError(result.reason)
      setRiders([])
      return
    }
    setRiders(result.riders)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <section className="rounded-[1.5rem] border border-line/80 bg-paper px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lagoon">
            Available riders
          </p>
          <p className="mt-1 text-xs font-semibold text-muted">
            On duty right now — use zone when assigning a nearby pickup.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-[11px] font-bold text-ink-soft"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm font-semibold text-mango-deep">{error}</p>
      )}

      {!loading && !error && !riders.length && (
        <p className="mt-4 rounded-xl border border-dashed border-line px-3 py-4 text-center text-sm font-semibold text-muted">
          Nobody marked available. Riders toggle this on their private board.
        </p>
      )}

      {riders.length > 0 && (
        <ul className="mt-3 divide-y divide-line/70">
          {riders.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-1"
            >
              <div className="min-w-0">
                <p className="font-display text-base font-semibold tracking-[-0.02em]">
                  {r.name}
                </p>
                <p className="mt-0.5 text-xs font-bold text-lagoon">
                  {zoneLabel(r.currentZone)}
                </p>
                {r.zoneUpdatedAt && (
                  <p className="mt-0.5 text-[10px] font-semibold text-muted">
                    Updated {formatWhen(r.zoneUpdatedAt)}
                  </p>
                )}
              </div>
              <a
                href={`tel:${r.phone}`}
                className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink-soft ring-1 ring-line"
              >
                {r.phone}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
