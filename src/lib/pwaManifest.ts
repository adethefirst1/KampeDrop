export type PwaAudience = 'customer' | 'vendor'

const CUSTOMER_MANIFEST = '/manifest.webmanifest'
const VENDOR_MANIFEST = '/manifest-vendor.webmanifest'

/** Point the document at the customer or vendor install manifest. */
export function syncPwaManifest(audience: PwaAudience) {
  if (typeof document === 'undefined') return

  const href = audience === 'vendor' ? VENDOR_MANIFEST : CUSTOMER_MANIFEST
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'manifest'
    document.head.appendChild(link)
  }
  if (link.getAttribute('href') !== href) {
    link.setAttribute('href', href)
  }

  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
  if (appleTitle) {
    appleTitle.setAttribute(
      'content',
      audience === 'vendor' ? 'KD Vendor' : 'KampeDrop',
    )
  }
}

export function audienceFromPath(pathname: string): PwaAudience {
  return pathname.startsWith('/vendor') ? 'vendor' : 'customer'
}
