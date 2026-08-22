import { useEffect, useMemo, useState } from 'react'
import {
  BADAGRY_CENTER,
  curatedLandmarks,
  curatedToDelivery,
  formatDistanceKm,
  haversineKm,
  type DeliveryPlace,
} from '../data/places'
import {
  autocompleteBadagry,
  hasGoogleMapsKey,
  loadGoogleMaps,
  nearbyBadagryEstablishments,
  placeDetailsToDelivery,
  type GooglePlaceSuggestion,
} from '../lib/googleMaps'

type Props = {
  value: DeliveryPlace | null
  onChange: (place: DeliveryPlace | null) => void
}

function PinIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 22s7-7.2 7-12.2A7 7 0 1 0 5 9.8C5 14.8 12 22 12 22Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

export function PlacePicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(
    null,
  )
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [googleReady, setGoogleReady] = useState(false)
  const [googleSuggestions, setGoogleSuggestions] = useState<
    GooglePlaceSuggestion[]
  >([])
  const [nearbyGoogle, setNearbyGoogle] = useState<DeliveryPlace[]>([])
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const googleEnabled = hasGoogleMapsKey()

  useEffect(() => {
    if (!googleEnabled) return
    void loadGoogleMaps().then((g) => setGoogleReady(Boolean(g)))
  }, [googleEnabled])

  useEffect(() => {
    if (!googleReady || !query.trim() || query.trim().length < 2) {
      setGoogleSuggestions([])
      return
    }
    const t = window.setTimeout(() => {
      setLoadingGoogle(true)
      void autocompleteBadagry(query).then((rows) => {
        setGoogleSuggestions(rows)
        setLoadingGoogle(false)
      })
    }, 280)
    return () => window.clearTimeout(t)
  }, [query, googleReady])

  const curatedRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const origin = userPos ?? BADAGRY_CENTER
    let list = curatedLandmarks.map((l) => ({
      landmark: l,
      km: haversineKm(origin, { lat: l.lat, lng: l.lng }),
    }))
    if (q) {
      list = list.filter(
        (r) =>
          r.landmark.name.toLowerCase().includes(q) ||
          r.landmark.area.toLowerCase().includes(q) ||
          r.landmark.address.toLowerCase().includes(q),
      )
    }
    list.sort((a, b) => a.km - b.km)
    return list.slice(0, 8)
  }, [query, userPos])

  const selectedDistance = useMemo(() => {
    if (value?.lat == null || value?.lng == null) return null
    const origin = userPos ?? BADAGRY_CENTER
    return haversineKm(origin, { lat: value.lat, lng: value.lng })
  }, [value, userPos])

  function useNearMe() {
    setLocError(null)
    if (!navigator.geolocation) {
      setLocError('Location isn’t available on this device.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPos(next)
        setLocating(false)
        setQuery('')
        if (googleReady) {
          void nearbyBadagryEstablishments(next).then(setNearbyGoogle)
        }
      },
      () => {
        setLocating(false)
        setLocError('Couldn’t get your location. Search a landmark instead.')
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    )
  }

  async function pickGoogleSuggestion(s: GooglePlaceSuggestion) {
    setLoadingGoogle(true)
    const place = await placeDetailsToDelivery(s.placeId)
    setLoadingGoogle(false)
    if (place) {
      onChange(place)
      setQuery('')
      setGoogleSuggestions([])
    }
  }

  function clearSelection() {
    onChange(null)
    setQuery('')
  }

  const searching = query.trim().length > 0
  const showSearchHits =
    googleSuggestions.length > 0 || (searching && loadingGoogle)
  const showNearbyGoogle = nearbyGoogle.length > 0 && !searching

  if (value) {
    return (
      <div
        className="flex items-start gap-3 rounded-[1.25rem] border-[2px] border-lagoon/25 bg-lagoon/[0.07] px-3.5 py-3.5"
        role="status"
      >
        <span
          className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lagoon text-white"
          aria-hidden
        >
          <PinIcon className="h-[1.15rem] w-[1.15rem]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-lagoon">
            Drop confirmed
          </p>
          <p className="mt-1 font-semibold leading-snug tracking-[-0.01em] text-ink">
            {value.name}
          </p>
          <p className="mt-0.5 text-sm leading-snug text-muted line-clamp-2">
            {value.address}
          </p>
          {selectedDistance != null && (
            <p className="mt-1.5 text-[11px] font-bold text-lagoon-deep">
              {formatDistanceKm(selectedDistance)}
              {userPos ? ' from you' : ' from Badagry centre'}
            </p>
          )}
          <button
            type="button"
            onClick={clearSelection}
            className="mt-2.5 text-sm font-bold text-ink underline decoration-line underline-offset-2 hover:text-lagoon"
          >
            Change
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Primary: search */}
      <div className="rounded-[1.25rem] bg-paper p-2 ring-1 ring-line">
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search drop landmark</span>
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lagoon"
              aria-hidden
            >
              <PinIcon className="h-4 w-4" />
            </span>
            <input
              id="place-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your street or estate…"
              className="field w-full border-0 bg-mist/60 py-3 pl-10 pr-3 shadow-none ring-0 focus:bg-paper"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            onClick={useNearMe}
            disabled={locating}
            className="shrink-0 self-stretch rounded-xl bg-ink px-3 text-xs font-bold text-white disabled:opacity-60"
          >
            {locating ? '…' : 'Near me'}
          </button>
        </div>
        <p className="mt-2 px-1 text-xs text-muted">
          {googleEnabled
            ? googleReady
              ? 'Google Places + Badagry landmarks'
              : 'Loading Google Places…'
            : 'Search your street, or pick a nearby landmark below'}
        </p>
      </div>

      {locError && (
        <p className="text-xs font-semibold text-mango-deep">{locError}</p>
      )}

      {/* Search results (when typing / Google hits) */}
      {showSearchHits && (
        <ul className="max-h-44 space-y-0.5 overflow-y-auto rounded-2xl bg-paper p-1.5 ring-1 ring-line">
          {loadingGoogle && googleSuggestions.length === 0 && (
            <li className="px-3 py-3 text-sm text-muted">Searching…</li>
          )}
          {googleSuggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => void pickGoogleSuggestion(s)}
                className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-mist"
              >
                <span className="mt-0.5 text-lagoon" aria-hidden>
                  <PinIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{s.primary}</span>
                  <span className="block text-xs text-muted">{s.secondary}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showNearbyGoogle && (
        <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-2xl bg-paper p-1.5 ring-1 ring-line">
          <li className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-muted">
            Near you
          </li>
          {nearbyGoogle.map((p) => (
            <li key={p.placeId ?? p.address}>
              <button
                type="button"
                onClick={() => {
                  onChange(p)
                  setNearbyGoogle([])
                }}
                className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-mist"
              >
                <span className="mt-0.5 text-lagoon" aria-hidden>
                  <PinIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{p.name}</span>
                  <span className="block text-xs text-muted line-clamp-1">
                    {p.address}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Secondary: curated landmarks */}
      <div className="pt-0.5">
        <div className="mb-2 flex items-center gap-2.5">
          <div className="h-px flex-1 bg-line" />
          <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            Or pick a nearby landmark
            {userPos ? ' · closest first' : ''}
          </p>
          <div className="h-px flex-1 bg-line" />
        </div>

        <ul
          className="max-h-48 space-y-1 overflow-y-auto rounded-2xl bg-mist/40 p-1.5 ring-1 ring-line/80"
          style={{
            paddingBottom:
              'max(0.5rem, var(--sticky-commerce-bar-height, 7.5rem))',
            scrollPaddingBottom: 'var(--sticky-commerce-bar-height, 7.5rem)',
          }}
        >
          {curatedRows.map(({ landmark, km }) => (
            <li key={landmark.id}>
              <button
                type="button"
                onClick={() => onChange(curatedToDelivery(landmark))}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition hover:bg-paper"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">
                    {landmark.name}
                  </span>
                  <span className="block text-xs text-muted">{landmark.area}</span>
                </span>
                <span className="shrink-0 text-[11px] font-bold text-muted">
                  {formatDistanceKm(km)}
                </span>
              </button>
            </li>
          ))}

          {curatedRows.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-muted">
              {loadingGoogle
                ? 'Searching…'
                : searching
                  ? 'No landmarks matched — try another word.'
                  : 'No landmarks available.'}
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
