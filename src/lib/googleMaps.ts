import { BADAGRY_CENTER, BADAGRY_RADIUS_M, type DeliveryPlace } from '../data/places'

declare global {
  interface Window {
    google?: typeof google
    __kampedropMapsPromise?: Promise<typeof google>
  }
}

export function getGoogleMapsApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
  return key?.trim() || undefined
}

export function hasGoogleMapsKey(): boolean {
  return Boolean(getGoogleMapsApiKey())
}

/** Load Maps JS + Places library once (no-op without API key). */
export function loadGoogleMaps(): Promise<typeof google | null> {
  const key = getGoogleMapsApiKey()
  if (!key) return Promise.resolve(null)

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google)
  }

  if (window.__kampedropMapsPromise) {
    return window.__kampedropMapsPromise.then(() => window.google ?? null)
  }

  window.__kampedropMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&v=weekly`
    script.async = true
    script.onload = () => {
      if (window.google?.maps) resolve(window.google)
      else reject(new Error('Google Maps failed to load'))
    }
    script.onerror = () => reject(new Error('Google Maps script error'))
    document.head.appendChild(script)
  })

  return window.__kampedropMapsPromise
    .then(() => window.google ?? null)
    .catch(() => null)
}

export type GooglePlaceSuggestion = {
  placeId: string
  primary: string
  secondary: string
}

export async function autocompleteBadagry(
  input: string,
): Promise<GooglePlaceSuggestion[]> {
  const g = await loadGoogleMaps()
  if (!g?.maps?.places || !input.trim()) return []

  const service = new g.maps.places.AutocompleteService()
  const request: google.maps.places.AutocompletionRequest = {
    input: input.trim(),
    componentRestrictions: { country: 'ng' },
    location: new g.maps.LatLng(BADAGRY_CENTER.lat, BADAGRY_CENTER.lng),
    radius: BADAGRY_RADIUS_M,
  }

  return new Promise((resolve) => {
    service.getPlacePredictions(request, (predictions, status) => {
      if (String(status) !== 'OK' || !predictions?.length) {
        resolve([])
        return
      }
      resolve(
        predictions.slice(0, 6).map((p) => ({
          placeId: p.place_id,
          primary: p.structured_formatting?.main_text ?? p.description,
          secondary:
            p.structured_formatting?.secondary_text ?? 'Lagos / Badagry area',
        })),
      )
    })
  })
}

export async function placeDetailsToDelivery(
  placeId: string,
): Promise<DeliveryPlace | null> {
  const g = await loadGoogleMaps()
  if (!g?.maps?.places) return null

  const attribution = document.createElement('div')
  const service = new g.maps.places.PlacesService(attribution)

  return new Promise((resolve) => {
    service.getDetails(
      {
        placeId,
        fields: ['place_id', 'name', 'formatted_address', 'geometry'],
      },
      (place, status) => {
        if (String(status) !== 'OK' || !place?.geometry?.location) {
          resolve(null)
          return
        }
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        const name = place.name ?? 'Selected place'
        const address = place.formatted_address ?? name
        resolve({
          name,
          address,
          placeId: place.place_id ?? placeId,
          lat,
          lng,
          source: 'google',
        })
      },
    )
  })
}

export async function nearbyBadagryEstablishments(
  origin: { lat: number; lng: number },
): Promise<DeliveryPlace[]> {
  const g = await loadGoogleMaps()
  if (!g?.maps?.places) return []

  const attribution = document.createElement('div')
  const service = new g.maps.places.PlacesService(attribution)

  return new Promise((resolve) => {
    service.nearbySearch(
      {
        location: new g.maps.LatLng(origin.lat, origin.lng),
        radius: Math.min(BADAGRY_RADIUS_M, 5000),
        type: 'point_of_interest',
      },
      (results, status) => {
        if (String(status) !== 'OK' || !results?.length) {
          resolve([])
          return
        }
        resolve(
          results.slice(0, 8).map((r) => {
            const lat = r.geometry?.location?.lat() ?? null
            const lng = r.geometry?.location?.lng() ?? null
            const name = r.name ?? 'Nearby place'
            return {
              name,
              address: r.vicinity ? `${name}, ${r.vicinity}` : name,
              placeId: r.place_id ?? null,
              lat,
              lng,
              source: 'google' as const,
            }
          }),
        )
      },
    )
  })
}
