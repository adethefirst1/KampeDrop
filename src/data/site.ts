export const SITE = {
  name: 'KampeDrop',
  /** Yoruba/Naija: kampe ≈ sure / certain / solid */
  nameMeaning: 'Kampe means sure',
  tagline: 'From a Badagry home to your door — kampe.',
  supportLine: 'Confirmed. Tracked. Made right.',
  area: 'Badagry',
  areaLong: 'Badagry Town and along the Expressway',
  city: 'Lagos State',
  supportPhone: '+2348038617226',
  supportPhoneDisplay: '0803 861 7226',
  /** digits only for wa.me */
  supportWhatsApp: '2348076283611',
  supportWhatsAppDisplay: '0807 628 3611',
  /** Still the live inbox until a KampeDrop address is ready */
  email: 'suredropltd@gmail.com',
  neighbourhoods: [
    'Badagry Town',
    'Ajara',
    'Ibereko',
    'Aradagun',
    'Apa',
    'Mowo',
    'Iworo',
    'Agbara edge',
  ],
  /**
   * @deprecated Manual escrow account — retired for Paystack bank_transfer VAs.
   * Kept only so older copy/imports don’t break until fully removed.
   */
  transferAccount: {
    bankName: 'Providus Bank',
    accountName: 'KampeDrop Escrow',
    accountNumber: '0000000000',
    narrationHint: 'Use your order ID as narration',
  },
} as const

export function whatsappHelpUrl(message: string) {
  return `https://wa.me/${SITE.supportWhatsApp}?text=${encodeURIComponent(message)}`
}

/** Local brand photography — lagoon dusk, corridor, home kitchen, people */
export const IMAGES = {
  hero: '/brand/hero.jpg',
  corridor: '/brand/corridor.jpg',
  door: '/brand/kitchen.jpg',
  kitchen: '/brand/kitchen.jpg',
  /** Warm everyday faces for landing trust sections */
  truthPeople: '/brand/truth-people.jpg',
  feelPeople: '/brand/feel-people.jpg',
  mart:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  pharmacy:
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80',
}
