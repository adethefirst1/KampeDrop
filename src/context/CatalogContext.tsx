import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  emptyVendorDraft,
  isBuyerVisible,
  normalizePhoneDigits,
  seedVendors,
  slugifyItemId,
  VENDOR_DEMO_PIN,
  type MenuItem,
  type VerificationStatus,
  type Vendor,
} from '../data/vendors'
import {
  fetchLiveMenuItemsByVendorIds,
  fetchLiveVendors,
  listVendorApplicationPhotoUrls,
  vendorRowToVendor,
} from '../lib/vendorsApi'

export const CATALOG_STORAGE_KEY = 'kampedrop-catalog'

export type VendorApplicationInput = {
  name: string
  category: Vendor['category']
  area: string
  pickupSpot: string
  phone: string
  accessPin: string
  hours: string
  about: string
  tagline: string
  photos: string[]
}

/** Fields vendors may edit themselves (name / address / photos stay ops-locked). */
export type VendorSelfPatch = Partial<
  Pick<Vendor, 'tagline' | 'about' | 'phone' | 'hours' | 'etaMins' | 'acceptingOrders'>
>

type CatalogContextValue = {
  vendors: Vendor[]
  activeVendors: Vendor[]
  pendingVendors: Vendor[]
  getVendor: (id: string) => Vendor | undefined
  findVendorByPhone: (phone: string) => Vendor | undefined
  saveVendor: (vendor: Vendor) => Vendor
  patchVendorSelf: (id: string, patch: VendorSelfPatch) => void
  /**
   * @deprecated Live signup uses `submitVendorApplication` in `src/lib/vendorsApi.ts`
   * (Supabase RPC). Do not call this — it only writes localStorage and is retired.
   */
  submitApplication: (
    input: VendorApplicationInput,
  ) => { ok: true; vendor: Vendor } | { ok: false; reason: string }
  setVerification: (
    id: string,
    status: VerificationStatus,
    reviewNote?: string | null,
  ) => void
  deleteVendor: (id: string) => void
  setVendorActive: (id: string, active: boolean) => void
  upsertItem: (vendorId: string, item: MenuItem) => void
  deleteItem: (vendorId: string, itemId: string) => void
  resetCatalog: () => void
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

function normalizeVendor(raw: Vendor): Vendor {
  const seed = seedVendors.find((v) => v.id === raw.id)
  const verificationStatus: VerificationStatus =
    raw.verificationStatus ?? (seed ? 'approved' : 'pending')
  return {
    ...raw,
    phone: raw.phone ?? seed?.phone ?? '',
    about: raw.about || seed?.about || raw.tagline || '',
    hours: raw.hours || seed?.hours || 'Hours on request',
    lat: typeof raw.lat === 'number' ? raw.lat : (seed?.lat ?? null),
    lng: typeof raw.lng === 'number' ? raw.lng : (seed?.lng ?? null),
    photos:
      Array.isArray(raw.photos) && raw.photos.length
        ? raw.photos
        : (seed?.photos ?? []),
    acceptingOrders: raw.acceptingOrders !== false,
    pickupSpot:
      raw.pickupSpot?.trim() ||
      seed?.pickupSpot ||
      (raw.area ? `${raw.area} — ${raw.name}` : raw.name),
    verificationStatus,
    submittedAt: raw.submittedAt ?? null,
    reviewNote: raw.reviewNote ?? null,
    accessPin: raw.accessPin?.trim() || VENDOR_DEMO_PIN,
    active: verificationStatus === 'approved' ? raw.active !== false : false,
    items: Array.isArray(raw.items)
      ? raw.items.map((it) => ({ ...it, available: it.available !== false }))
      : [],
  }
}

function loadCatalog(): Vendor[] {
  try {
    const raw = localStorage.getItem(CATALOG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Vendor[]
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map(normalizeVendor)
      }
    }
  } catch {
    /* ignore */
  }
  return seedVendors.map((v) => structuredClone(v)).map(normalizeVendor)
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [vendors, setVendors] = useState<Vendor[]>(loadCatalog)
  const [cloudVendors, setCloudVendors] = useState<Vendor[]>([])

  useEffect(() => {
    try {
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(vendors))
    } catch {
      /* ignore */
    }
  }, [vendors])

  useEffect(() => {
    let cancelled = false
    async function loadCloud() {
      const result = await fetchLiveVendors()
      if (cancelled || !result.ok) return

      const menus = await fetchLiveMenuItemsByVendorIds(result.vendors.map((v) => v.id))
      const byVendorId = menus.ok ? menus.byVendorId : {}

      const mapped = await Promise.all(
        result.vendors.map(async (row) =>
          vendorRowToVendor(
            row,
            await listVendorApplicationPhotoUrls(row.id),
            byVendorId[row.id] ?? [],
          ),
        ),
      )
      if (!cancelled) setCloudVendors(mapped)
    }
    void loadCloud()
    return () => {
      cancelled = true
    }
  }, [])

  const mergedVendors = useMemo(() => {
    const byId = new Map<string, Vendor>()
    for (const v of vendors) byId.set(v.id, v)
    for (const v of cloudVendors) byId.set(v.id, v)
    return [...byId.values()]
  }, [vendors, cloudVendors])

  const getVendor = useCallback(
    (id: string) => mergedVendors.find((v) => v.id === id),
    [mergedVendors],
  )

  const findVendorByPhone = useCallback(
    (phone: string) => {
      const digits = normalizePhoneDigits(phone)
      if (digits.length < 10) return undefined
      return mergedVendors.find((v) => {
        const d = normalizePhoneDigits(v.phone)
        return (
          d === digits ||
          d.endsWith(digits.slice(-10)) ||
          digits.endsWith(d.slice(-10))
        )
      })
    },
    [mergedVendors],
  )

  const saveVendor = useCallback((vendor: Vendor) => {
    const next = normalizeVendor(vendor)
    setVendors((prev) => {
      const i = prev.findIndex((v) => v.id === next.id)
      if (i < 0) return [next, ...prev]
      const copy = [...prev]
      copy[i] = next
      return copy
    })
    return next
  }, [])

  /** @deprecated Use submitVendorApplication (vendorsApi) — localStorage signup is retired. */
  const submitApplication = useCallback((_input: VendorApplicationInput) => {
    console.warn(
      '[CatalogContext] submitApplication is deprecated. Live signup uses submit_vendor_application via vendorsApi.',
    )
    return {
      ok: false as const,
      reason:
        'Local signup is retired. Use the online registration form (Supabase submit_vendor_application).',
    }
  }, [])

  const setVerification = useCallback(
    (id: string, status: VerificationStatus, reviewNote: string | null = null) => {
      setVendors((prev) =>
        prev.map((v) => {
          if (v.id !== id) return v
          const approved = status === 'approved'
          return normalizeVendor({
            ...v,
            verificationStatus: status,
            reviewNote,
            active: approved,
            acceptingOrders: approved ? true : false,
            vettedNote: approved
              ? v.vettedNote?.includes('Awaiting')
                ? 'Verified by KampeDrop for Badagry fulfilment.'
                : v.vettedNote || 'Verified by KampeDrop for Badagry fulfilment.'
              : v.vettedNote,
          })
        }),
      )
    },
    [],
  )

  const patchVendorSelf = useCallback((id: string, patch: VendorSelfPatch) => {
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v
        return normalizeVendor({
          ...v,
          tagline: patch.tagline ?? v.tagline,
          about: patch.about ?? v.about,
          phone: patch.phone ?? v.phone,
          hours: patch.hours ?? v.hours,
          etaMins: patch.etaMins ?? v.etaMins,
          acceptingOrders: patch.acceptingOrders ?? v.acceptingOrders,
        })
      }),
    )
  }, [])

  const deleteVendor = useCallback((id: string) => {
    setVendors((prev) => prev.filter((v) => v.id !== id))
  }, [])

  const setVendorActive = useCallback((id: string, active: boolean) => {
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v
        if (v.verificationStatus !== 'approved') {
          return normalizeVendor({ ...v, active: false })
        }
        return normalizeVendor({ ...v, active })
      }),
    )
  }, [])

  const upsertItem = useCallback((vendorId: string, item: MenuItem) => {
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id !== vendorId) return v
        const i = v.items.findIndex((it) => it.id === item.id)
        if (i < 0) return { ...v, items: [...v.items, item] }
        const items = [...v.items]
        items[i] = item
        return { ...v, items }
      }),
    )
  }, [])

  const deleteItem = useCallback((vendorId: string, itemId: string) => {
    setVendors((prev) =>
      prev.map((v) =>
        v.id === vendorId
          ? { ...v, items: v.items.filter((it) => it.id !== itemId) }
          : v,
      ),
    )
  }, [])

  const resetCatalog = useCallback(() => {
    setVendors(seedVendors.map((v) => structuredClone(v)).map(normalizeVendor))
  }, [])

  const activeVendors = useMemo(
    () => mergedVendors.filter(isBuyerVisible),
    [mergedVendors],
  )

  const pendingVendors = useMemo(
    () =>
      vendors.filter(
        (v) =>
          v.verificationStatus === 'pending' ||
          v.verificationStatus === 'needs_info',
      ),
    [vendors],
  )

  const value = useMemo(
    () => ({
      vendors: mergedVendors,
      activeVendors,
      pendingVendors,
      getVendor,
      findVendorByPhone,
      saveVendor,
      patchVendorSelf,
      submitApplication,
      setVerification,
      deleteVendor,
      setVendorActive,
      upsertItem,
      deleteItem,
      resetCatalog,
    }),
    [
      mergedVendors,
      activeVendors,
      pendingVendors,
      getVendor,
      findVendorByPhone,
      saveVendor,
      patchVendorSelf,
      submitApplication,
      setVerification,
      deleteVendor,
      setVendorActive,
      upsertItem,
      deleteItem,
      resetCatalog,
    ],
  )

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  )
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}

export function createMenuItem(partial: Partial<MenuItem> & { name: string }): MenuItem {
  return {
    id: partial.id || slugifyItemId(partial.name),
    name: partial.name,
    description: partial.description ?? '',
    price: partial.price ?? 0,
    popular: partial.popular,
    available: partial.available !== false,
  }
}

export function createVendor(name: string): Vendor {
  return emptyVendorDraft(name)
}
