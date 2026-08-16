export type Category = 'food' | 'mart' | 'pharmacy'

export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  popular?: boolean
}

export type Vendor = {
  id: string
  name: string
  category: Category
  area: string
  /** Where the buyer collects for self-pickup */
  pickupSpot: string
  tagline: string
  etaMins: number
  rating: number
  orders: string
  accent: string
  vettedNote: string
  phone: string
  /** hidden from buyer browse when false */
  active: boolean
  items: MenuItem[]
}

export const DELIVERY_FEE = 700
export const SERVICE_AREA = 'Badagry'

export const categoryLabel: Record<Category, string> = {
  food: 'Food',
  mart: 'Mart',
  pharmacy: 'Pharmacy',
}

export const seedVendors: Vendor[] = [
  {
    id: 'mama-toke',
    name: 'Mama Toke Kitchen',
    category: 'food',
    area: 'Badagry Town',
    pickupSpot: 'Hospital Road, near First Baptist — Mama Toke Kitchen',
    tagline: 'Lagoon-side jollof, pepper soup, and swallow that tastes like Sunday at home.',
    etaMins: 30,
    rating: 4.9,
    orders: '120+',
    accent: '#0E6B6B',
    vettedNote: 'Kitchen on Hospital Road. We ate there before onboarding.',
    phone: '08034441001',
    active: true,
    items: [
      {
        id: 'jollof',
        name: 'Jollof Rice & Chicken',
        description: 'Smoky party jollof, grilled chicken, plantain.',
        price: 2500,
        popular: true,
      },
      {
        id: 'efo',
        name: 'Efo Riro & Swallow',
        description: 'Rich vegetable soup with pounded yam or eba.',
        price: 2200,
        popular: true,
      },
      {
        id: 'pepper-soup',
        name: 'Catfish Pepper Soup',
        description: 'Fresh lagoon catfish — hot, clear, serious.',
        price: 2800,
      },
      {
        id: 'beans',
        name: 'Beans & Plantain',
        description: 'Soft honey beans, ripe plantain, palm oil finish.',
        price: 1800,
      },
    ],
  },
  {
    id: 'ajara-mart',
    name: 'Ajara Everyday Mart',
    category: 'mart',
    area: 'Ajara',
    pickupSpot: 'Ajara Junction mart — ask for SureDrop counter',
    tagline: 'Rice, oil, eggs, detergent — the things Badagry homes actually run out of.',
    etaMins: 35,
    rating: 4.8,
    orders: '80+',
    accent: '#1A5F4A',
    vettedNote: 'Shelf-checked every week. We only list what’s in stock.',
    phone: '08034441002',
    active: true,
    items: [
      {
        id: 'rice5',
        name: 'Rice, 5kg',
        description: 'Local long-grain. Sealed bag.',
        price: 6800,
        popular: true,
      },
      {
        id: 'oil',
        name: 'Vegetable Oil, 1L',
        description: 'Everyday cooking oil.',
        price: 2200,
      },
      {
        id: 'eggs',
        name: 'Eggs (crate)',
        description: 'Fresh crate — counted before packing.',
        price: 4500,
        popular: true,
      },
      {
        id: 'detergent',
        name: 'Washing Detergent',
        description: '1kg pack for laundry day.',
        price: 1600,
      },
    ],
  },
  {
    id: 'careplus',
    name: 'Ibereko Care Pharmacy',
    category: 'pharmacy',
    area: 'Ibereko',
    pickupSpot: 'Ibereko Care Pharmacy — main counter, sealed packs',
    tagline: 'OTC essentials sealed and delivered — no roadside guessing on the Expressway.',
    etaMins: 40,
    rating: 4.9,
    orders: '60+',
    accent: '#146C5B',
    vettedNote: 'Licensed pharmacy partner. Sealed packs only.',
    phone: '08034441003',
    active: true,
    items: [
      {
        id: 'paracetamol',
        name: 'Paracetamol 500mg',
        description: 'Pack of 20. Expiry verified.',
        price: 800,
        popular: true,
      },
      {
        id: 'ors',
        name: 'ORS Sachets',
        description: 'Rehydration salts — pack of 5.',
        price: 1200,
      },
      {
        id: 'vitamin-c',
        name: 'Vitamin C',
        description: 'Chewable tablets, sealed bottle.',
        price: 2500,
      },
      {
        id: 'antiseptic',
        name: 'Antiseptic Liquid',
        description: 'Small bottle for first-aid shelf.',
        price: 1800,
      },
    ],
  },
  {
    id: 'aradagun-grill',
    name: 'Aradagun Express Grill',
    category: 'food',
    area: 'Aradagun',
    pickupSpot: 'Aradagun Expressway side — green grill kiosk',
    tagline: 'Suya, asun, and cold zobo off the Badagry Expressway.',
    etaMins: 40,
    rating: 4.7,
    orders: '95+',
    accent: '#C45C26',
    vettedNote: 'Meat handled clean. Pickup window confirmed with riders.',
    phone: '08034441004',
    active: true,
    items: [
      {
        id: 'suya',
        name: 'Beef Suya (full)',
        description: 'Spiced, sliced, with onions and yaji.',
        price: 3500,
        popular: true,
      },
      {
        id: 'asun',
        name: 'Asun Plate',
        description: 'Peppered goat meat, hot and ready.',
        price: 4000,
        popular: true,
      },
      {
        id: 'chicken-wings',
        name: 'Grilled Wings',
        description: 'Six pieces, sticky pepper glaze.',
        price: 3200,
      },
      {
        id: 'zobo',
        name: 'Zobo (1L)',
        description: 'Chilled hibiscus — Badagry evening drink.',
        price: 1000,
      },
    ],
  },
]

/** Static seed lookup — for ops mocks / first load. Live catalog is CatalogContext. */
export function getSeedVendor(id: string) {
  return seedVendors.find((v) => v.id === id)
}

export function slugifyVendorId(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || `vendor-${Date.now()}`
}

export function slugifyItemId(name: string) {
  return slugifyVendorId(name)
}

export const ACCENT_OPTIONS = [
  '#0E6B6B',
  '#1A5F4A',
  '#146C5B',
  '#C45C26',
  '#8B4513',
  '#2F4F4F',
] as const

export function emptyVendorDraft(name = 'New vendor'): Vendor {
  return {
    id: slugifyVendorId(name),
    name,
    category: 'food',
    area: 'Badagry Town',
    pickupSpot: '',
    tagline: '',
    etaMins: 35,
    rating: 5,
    orders: '0',
    accent: ACCENT_OPTIONS[0],
    vettedNote: '',
    phone: '',
    active: true,
    items: [],
  }
}

export function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}
