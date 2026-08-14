/** Marketing site vs installable app shell */
export const APP_BASE = '/app'

export function appPath(path = ''): string {
  if (!path || path === '/') return APP_BASE
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${APP_BASE}${normalized}`
}

export function isAppRoute(pathname: string): boolean {
  return pathname === APP_BASE || pathname.startsWith(`${APP_BASE}/`)
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const media = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return media || iosStandalone
}
