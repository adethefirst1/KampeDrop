/** Minimal Google Maps Places typings used by SureDrop (avoids hard dep if types lag). */
declare namespace google.maps {
  class LatLng {
    constructor(lat: number, lng: number)
    lat(): number
    lng(): number
  }

  namespace places {
    enum PlacesServiceStatus {
      OK = 'OK',
      ZERO_RESULTS = 'ZERO_RESULTS',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    }

    interface AutocompletionRequest {
      input: string
      componentRestrictions?: { country: string | string[] }
      location?: LatLng
      radius?: number
      types?: string[]
    }

    interface AutocompletePrediction {
      description: string
      place_id: string
      structured_formatting?: {
        main_text: string
        secondary_text: string
      }
    }

    class AutocompleteService {
      getPlacePredictions(
        request: AutocompletionRequest,
        callback: (
          predictions: AutocompletePrediction[] | null,
          status: PlacesServiceStatus,
        ) => void,
      ): void
    }

    interface PlaceResult {
      place_id?: string
      name?: string
      formatted_address?: string
      vicinity?: string
      geometry?: { location?: LatLng }
    }

    class PlacesService {
      constructor(attrContainer: HTMLDivElement | google.maps.Map)
      getDetails(
        request: { placeId: string; fields?: string[] },
        callback: (
          place: PlaceResult | null,
          status: PlacesServiceStatus,
        ) => void,
      ): void
      nearbySearch(
        request: {
          location: LatLng
          radius: number
          type?: string
          keyword?: string
        },
        callback: (
          results: PlaceResult[] | null,
          status: PlacesServiceStatus,
        ) => void,
      ): void
    }
  }

  interface Map {
    /* placeholder for PlacesService ctor */
  }
}

declare const google: {
  maps: typeof google.maps
}
