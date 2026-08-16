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
  seedVendors,
  slugifyItemId,
  type MenuItem,
  type Vendor,
} from '../data/vendors'

export const CATALOG_STORAGE_KEY = 'suredrop-catalog'

type CatalogContextValue = {
  vendors: Vendor[]
  activeVendors: Vendor[]
  getVendor: (id: string) => Vendor | undefined
  saveVendor: (vendor: Vendor) => Vendor
  deleteVendor: (id: string) => void
  setVendorActive: (id: string, active: boolean) => void
  upsertItem: (vendorId: string, item: MenuItem) => void
  deleteItem: (vendorId: string, itemId: string) => void
  resetCatalog: () => void
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

function normalizeVendor(raw: Vendor): Vendor {
  return {
    ...raw,
    phone: raw.phone ?? '',
    pickupSpot:
      raw.pickupSpot?.trim() ||
      (raw.area ? `${raw.area} — ${raw.name}` : raw.name),
    active: raw.active !== false,
    items: Array.isArray(raw.items) ? raw.items : [],
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
  return seedVendors.map((v) => structuredClone(v))
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [vendors, setVendors] = useState<Vendor[]>(loadCatalog)

  useEffect(() => {
    try {
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(vendors))
    } catch {
      /* ignore */
    }
  }, [vendors])

  const getVendor = useCallback(
    (id: string) => vendors.find((v) => v.id === id),
    [vendors],
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

  const deleteVendor = useCallback((id: string) => {
    setVendors((prev) => prev.filter((v) => v.id !== id))
  }, [])

  const setVendorActive = useCallback((id: string, active: boolean) => {
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, active } : v)))
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
    setVendors(seedVendors.map((v) => structuredClone(v)))
  }, [])

  const activeVendors = useMemo(
    () => vendors.filter((v) => v.active),
    [vendors],
  )

  const value = useMemo(
    () => ({
      vendors,
      activeVendors,
      getVendor,
      saveVendor,
      deleteVendor,
      setVendorActive,
      upsertItem,
      deleteItem,
      resetCatalog,
    }),
    [
      vendors,
      activeVendors,
      getVendor,
      saveVendor,
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
  }
}

export function createVendor(name: string): Vendor {
  return emptyVendorDraft(name)
}
