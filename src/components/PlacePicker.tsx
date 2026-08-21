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

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          id="place-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            // typing without a pick → allow manual fallback via parent if they clear selection
          }}
          placeholder="Search Ajara, Hospital Road, estate…"
          className="field flex-1"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={useNearMe}
          disabled={locating}
          className="shrink-0 rounded-2xl bg-mist px-3 py-2 text-xs font-bold text-ink ring-1 ring-line disabled:opacity-60"
        >
          {locating ? '…' : 'Near me'}
        </button>
      </div>

      <p className="text-xs text-muted">
        {googleEnabled
          ? googleReady
            ? 'Google Places + Badagry landmarks'
            : 'Loading Google Places…'
          : 'Search your street, or pick a nearby landmark below'}
      </p>

      {locError && (
        <p className="text-xs font-semibold text-mango-deep">{locError}</p>
      )}

      {value && (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-lagoon/10 px-3 py-3 ring-1 ring-lagoon/20">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-lagoon">
              Delivering near
            </p>
            <p className="mt-0.5 font-semibold">{value.name}</p>
            <p className="text-sm text-muted line-clamp-2">{value.address}</p>
          </div>
          <button
            type="button"
            className="shrink-0 text-xs font-bold text-muted"
            onClick={() => onChange(null)}
          >
            Change
          </button>
        </div>
      )}

      {!value && (
        <ul
          className="max-h-56 space-y-1.5 overflow-y-auto rounded-2xl bg-paper p-2 ring-1 ring-line"
          style={{
            // Extra scroll room so the last rows clear the measured sticky bar.
            paddingBottom:
              'max(0.5rem, var(--sticky-commerce-bar-height, 7.5rem))',
            scrollPaddingBottom:
              'var(--sticky-commerce-bar-height, 7.5rem)',
          }}
        >
          {googleSuggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => void pickGoogleSuggestion(s)}
                className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-mist"
              >
                <p className="text-sm font-semibold">{s.primary}</p>
                <p className="text-xs text-muted">{s.secondary}</p>
              </button>
            </li>
          ))}

          {nearbyGoogle.length > 0 && !query.trim() && (
            <>
              <li className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                Near you (Google)
              </li>
              {nearbyGoogle.map((p) => (
                <li key={p.placeId ?? p.address}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(p)
                      setNearbyGoogle([])
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-mist"
                  >
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted line-clamp-1">{p.address}</p>
                  </button>
                </li>
              ))}
            </>
          )}

          <li className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wide text-muted">
            Badagry landmarks
            {userPos ? ' · closest first' : ''}
          </li>
          {curatedRows.map(({ landmark, km }) => (
            <li key={landmark.id}>
              <button
                type="button"
                onClick={() => onChange(curatedToDelivery(landmark))}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-mist"
              >
                <span>
                  <span className="block text-sm font-semibold">{landmark.name}</span>
                  <span className="block text-xs text-muted">{landmark.area}</span>
                </span>
                <span className="shrink-0 text-[11px] font-bold text-muted">
                  {formatDistanceKm(km)}
                </span>
              </button>
            </li>
          ))}

          {curatedRows.length === 0 && googleSuggestions.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-muted">
              {loadingGoogle ? 'Searching…' : 'No matches — try another landmark.'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
