export const SITE = {
  name: 'SureDrop',
  tagline: 'From a Badagry home to your door — secured.',
  supportLine: 'Confirmed. Tracked. Made right.',
  area: 'Badagry',
  areaLong: 'Badagry Town and along the Expressway',
  city: 'Lagos State',
  supportPhone: '+2348000000000',
  supportPhoneDisplay: '0800 000 0000',
  /** digits only for wa.me */
  supportWhatsApp: '2348000000000',
  email: 'hello@suredrop.ng',
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
   * Escrow receiving account (Phase 1 manual transfer).
   * Replace with real SureDrop account before pilot.
   */
  transferAccount: {
    bankName: 'Providus Bank',
    accountName: 'SureDrop Escrow',
    accountNumber: '0000000000',
    narrationHint: 'Use your order ID as narration',
  },
} as const

export function whatsappHelpUrl(message: string) {
  return `https://wa.me/${SITE.supportWhatsApp}?text=${encodeURIComponent(message)}`
}


/** Local brand photography — lagoon dusk, corridor, home kitchen */
export const IMAGES = {
  hero: '/brand/hero.jpg',
  corridor: '/brand/corridor.jpg',
  door: '/brand/kitchen.jpg',
  kitchen: '/brand/kitchen.jpg',
  mart:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  pharmacy:
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80',
}
