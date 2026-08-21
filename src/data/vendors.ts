export type Category = 'food' | 'mart' | 'pharmacy' | 'store'

export type VerificationStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'needs_info'
  | 'rejected'

export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  popular?: boolean
  /** Soft-hide from buyer menu without deleting */
  available?: boolean
}

export type Vendor = {
  id: string
  name: string
  category: Category
  area: string
  /** Where the buyer collects for self-pickup — ops-locked after approval */
  pickupSpot: string
  tagline: string
  /** Longer story for buyer “more info” — vendor may edit */
  about: string
  etaMins: number
  rating: number
  orders: string
  accent: string
  vettedNote: string
  phone: string
  /** Display hours — vendor may edit */
  hours: string
  /** Map pin — ops-locked */
  lat: number | null
  lng: number | null
  /** Storefront photos — ops-locked after approval */
  photos: string[]
  /** Vendor pause switch (still listed, but not accepting) */
  acceptingOrders: boolean
  /** Buyer browse: must be active AND approved */
  active: boolean
  /** Manual verification gate */
  verificationStatus: VerificationStatus
  /** Set when vendor submits a complete application */
  submittedAt: string | null
  /** Ops note when needs_info / rejected */
  reviewNote: string | null
  /** Simple access PIN for vendor board (pilot) */
  accessPin: string
  items: MenuItem[]
}

export const DELIVERY_FEE = 700
export const SERVICE_AREA = 'Badagry'

/** Legacy field on seed/local catalog rows — not used for board auth. */
export const VENDOR_DEMO_PIN = '1234'

export const MIN_ONBOARDING_PHOTOS = 2
export const MAX_ONBOARDING_PHOTOS = 4

export { categoryLabel } from './categories'

export const verificationLabel: Record<VerificationStatus, string> = {
  draft: 'Draft',
  pending: 'Pending review',
  approved: 'Approved',
  needs_info: 'Needs more info',
  rejected: 'Not approved',
}

export function isBuyerVisible(vendor: Vendor) {
  return vendor.active && vendor.verificationStatus === 'approved'
}

export function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, '')
}

export const seedVendors: Vendor[] = [
  {
    id: 'mama-toke',
    name: 'Mama Toke Kitchen',
    category: 'food',
    area: 'Badagry Town',
    pickupSpot: 'Hospital Road, near First Baptist — Mama Toke Kitchen',
    tagline: 'Lagoon-side jollof, pepper soup, and swallow that tastes like Sunday at home.',
    about:
      'Family kitchen on Hospital Road. Same pots that feed neighbours after church — now on KampeDrop with tracked handoff.',
    etaMins: 30,
    rating: 4.9,
    orders: '120+',
    accent: '#0E6B6B',
    vettedNote: 'Kitchen on Hospital Road. We ate there before onboarding.',
    phone: '08034441001',
    hours: 'Mon–Sat · 10:00 – 21:00',
    lat: 6.4325,
    lng: 2.8854,
    photos: [
      '/brand/kitchen.jpg',
      'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    ],
    acceptingOrders: true,
    active: true,
    verificationStatus: 'approved',
    submittedAt: null,
    reviewNote: null,
    accessPin: VENDOR_DEMO_PIN,
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
    pickupSpot: 'Ajara Junction mart — ask for KampeDrop counter',
    tagline: 'Rice, oil, eggs, detergent — the things Badagry homes actually run out of.',
    about:
      'Neighbourhood staples at Ajara Junction. Ask for the KampeDrop counter — packed and sealed for riders.',
    etaMins: 35,
    rating: 4.8,
    orders: '80+',
    accent: '#1A5F4A',
    vettedNote: 'Shelf-checked every week. We only list what’s in stock.',
    phone: '08034441002',
    hours: 'Daily · 8:00 – 20:00',
    lat: 6.4482,
    lng: 2.9125,
    photos: [
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
      '/brand/corridor.jpg',
    ],
    acceptingOrders: true,
    active: true,
    verificationStatus: 'approved',
    submittedAt: null,
    reviewNote: null,
    accessPin: VENDOR_DEMO_PIN,
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
    about:
      'Licensed OTC partner on the Expressway side. Sealed packs only — careful handoff for every order.',
    etaMins: 40,
    rating: 4.9,
    orders: '60+',
    accent: '#146C5B',
    vettedNote: 'Licensed pharmacy partner. Sealed packs only.',
    phone: '08034441003',
    hours: 'Mon–Sat · 8:00 – 19:00 · Sun 10:00 – 16:00',
    lat: 6.4612,
    lng: 2.9485,
    photos: [
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
    ],
    acceptingOrders: true,
    active: true,
    verificationStatus: 'approved',
    submittedAt: null,
    reviewNote: null,
    accessPin: VENDOR_DEMO_PIN,
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
    about:
      'Green kiosk on the Expressway — suya smoke you can smell from the road. Packed hot for KampeDrop riders.',
    etaMins: 40,
    rating: 4.7,
    orders: '95+',
    accent: '#C45C26',
    vettedNote: 'Meat handled clean. Pickup window confirmed with riders.',
    phone: '08034441004',
    hours: 'Tue–Sun · 12:00 – 22:00',
    lat: 6.4725,
    lng: 2.9812,
    photos: [
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
      '/brand/hero.jpg',
    ],
    acceptingOrders: true,
    active: true,
    verificationStatus: 'approved',
    submittedAt: null,
    reviewNote: null,
    accessPin: VENDOR_DEMO_PIN,
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
  {
    id: 'mowo-corner-store',
    name: 'Mowo Corner Store',
    category: 'store',
    area: 'Mowo',
    pickupSpot: 'Mowo bus stop — blue kiosk, ask for Tunde',
    tagline: 'Phone credit, snacks, and the little things you forgot on the way home.',
    about:
      'Neighbourhood counter by the bus stop. Fast pack for riders — no long queues.',
    etaMins: 25,
    rating: 4.7,
    orders: '40+',
    accent: '#5b4a9a',
    vettedNote: 'Walk-in verified. Clean counter, clear prices.',
    phone: '08034441005',
    hours: 'Daily · 7:00 – 22:00',
    lat: 6.439,
    lng: 2.901,
    photos: [
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=800&q=80',
    ],
    acceptingOrders: true,
    active: true,
    verificationStatus: 'approved',
    submittedAt: null,
    reviewNote: null,
    accessPin: VENDOR_DEMO_PIN,
    items: [
      {
        id: 'airtime',
        name: 'Airtime ₦1,000',
        description: 'MTN / Airtel / Glo — tell us the number in the note.',
        price: 1000,
        popular: true,
      },
      {
        id: 'peak-milk',
        name: 'Peak Milk (tin)',
        description: 'Sealed tin — expiry checked.',
        price: 1800,
      },
      {
        id: 'biscuit-pack',
        name: 'Family Biscuit Pack',
        description: 'Assorted — good for the road.',
        price: 1200,
        popular: true,
      },
      {
        id: 'candle-pack',
        name: 'Candles (pack of 6)',
        description: 'For NEPA nights.',
        price: 900,
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

export function emptyVendorDraft(name = 'New business'): Vendor {
  return {
    id: slugifyVendorId(name),
    name,
    category: 'food',
    area: 'Badagry Town',
    pickupSpot: '',
    tagline: '',
    about: '',
    etaMins: 35,
    rating: 5,
    orders: '0',
    accent: ACCENT_OPTIONS[0],
    vettedNote: '',
    phone: '',
    hours: 'Mon–Sat · 10:00 – 20:00',
    lat: null,
    lng: null,
    photos: [],
    acceptingOrders: false,
    active: false,
    verificationStatus: 'draft',
    submittedAt: null,
    reviewNote: null,
    accessPin: VENDOR_DEMO_PIN,
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
