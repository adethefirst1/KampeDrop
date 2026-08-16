/** Badagry corridor — bias for Places search / distance sort */
export const BADAGRY_CENTER = { lat: 6.4316, lng: 2.8876 }
/** ~20km covers Town → Ajara → Ibereko → Aradagun corridor */
export const BADAGRY_RADIUS_M = 20_000

export type PlaceSource = 'curated' | 'google' | 'manual'

export type DeliveryPlace = {
  /** Rider-facing address line */
  address: string
  /** Short landmark / place name */
  name: string
  placeId: string | null
  lat: number | null
  lng: number | null
  source: PlaceSource
}

export type CuratedLandmark = {
  id: string
  name: string
  area: string
  address: string
  lat: number
  lng: number
}

/** Hand-picked drop landmarks — works without Google; always available as fallback */
export const curatedLandmarks: CuratedLandmark[] = [
  {
    id: 'town-roundabout',
    name: 'Badagry Roundabout',
    area: 'Badagry Town',
    address: 'Badagry Roundabout, Badagry Town',
    lat: 6.4298,
    lng: 2.8871,
  },
  {
    id: 'hospital-road',
    name: 'Hospital Road',
    area: 'Badagry Town',
    address: 'Hospital Road, near First Baptist, Badagry Town',
    lat: 6.4325,
    lng: 2.8854,
  },
  {
    id: 'marina',
    name: 'Badagry Marina / Waterfront',
    area: 'Badagry Town',
    address: 'Marina area, Badagry Town',
    lat: 6.4155,
    lng: 2.8812,
  },
  {
    id: 'ajara-junction',
    name: 'Ajara Junction',
    area: 'Ajara',
    address: 'Ajara Junction, Badagry',
    lat: 6.4482,
    lng: 2.9125,
  },
  {
    id: 'ajara-market',
    name: 'Ajara Market',
    area: 'Ajara',
    address: 'Ajara Market, Badagry',
    lat: 6.4501,
    lng: 2.9158,
  },
  {
    id: 'ibereko',
    name: 'Ibereko',
    area: 'Ibereko',
    address: 'Ibereko, Badagry Expressway side',
    lat: 6.4612,
    lng: 2.9485,
  },
  {
    id: 'aradagun',
    name: 'Aradagun',
    area: 'Aradagun',
    address: 'Aradagun, Badagry Expressway',
    lat: 6.4725,
    lng: 2.9812,
  },
  {
    id: 'apa',
    name: 'Apa',
    area: 'Apa',
    address: 'Apa, Badagry',
    lat: 6.4418,
    lng: 2.862,
  },
  {
    id: 'mowo',
    name: 'Mowo',
    area: 'Mowo',
    address: 'Mowo, Badagry corridor',
    lat: 6.455,
    lng: 2.935,
  },
  {
    id: 'iworo',
    name: 'Iworo',
    area: 'Iworo',
    address: 'Iworo, Badagry',
    lat: 6.438,
    lng: 2.905,
  },
]

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function curatedToDelivery(l: CuratedLandmark): DeliveryPlace {
  return {
    address: l.address,
    name: l.name,
    placeId: l.id,
    lat: l.lat,
    lng: l.lng,
    source: 'curated',
  }
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}
