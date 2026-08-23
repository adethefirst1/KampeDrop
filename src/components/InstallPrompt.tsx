import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { APP_BASE, isStandaloneDisplay } from '../paths'
import { springSoft } from '../motion/tokens'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'ios' | 'android' | 'desktop'
type Audience = 'customer' | 'vendor'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'desktop'
}

function isIosSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) && /^((?!chrome|android).)*safari/i.test(ua)
}

const customerSteps: Record<Platform, { title: string; items: string[] }> = {
  ios: {
    title: 'Add KampeDrop to your iPhone',
    items: [
      'Open this site in Safari (not Chrome or Instagram browser).',
      'Tap the Share button at the bottom of Safari.',
      'Scroll and tap Add to Home Screen.',
      'Tap Add. KampeDrop appears as an icon — tap it anytime to order.',
    ],
  },
  android: {
    title: 'Install KampeDrop on Android',
    items: [
      'Tap Install below (or use the Chrome menu ⋮).',
      'Confirm Install app when Chrome asks.',
      'Find the KampeDrop icon on your home screen.',
      'Open it anytime — it launches straight into ordering.',
    ],
  },
  desktop: {
    title: 'Install KampeDrop on this device',
    items: [
      'In Chrome or Edge, look for the install icon in the address bar.',
      'Or tap Install below if your browser offers it.',
      'KampeDrop opens in its own window, like a normal app.',
      'On your phone, visit kampedrop and use Add to Home Screen for the best experience.',
    ],
  },
}

/** Prefer Add to Home Screen so the icon opens /vendor, not customer /app. */
const vendorSteps: Record<Platform, { title: string; items: string[] }> = {
  ios: {
    title: 'Add your vendor board to iPhone',
    items: [
      'Stay on this vendor page in Safari (not Chrome or WhatsApp browser).',
      'Tap the Share button at the bottom of Safari.',
      'Scroll and tap Add to Home Screen.',
      'Name it e.g. KampeDrop Vendor, tap Add. Open that icon anytime for Orders.',
    ],
  },
  android: {
    title: 'Add your vendor board on Android',
    items: [
      'Stay on this vendor board page in Chrome.',
      'Tap the Chrome menu ⋮ (top right).',
      'Choose Add to Home screen (not the customer Install app shortcut).',
      'Confirm. Open the icon anytime — it should land on your vendor board.',
    ],
  },
  desktop: {
    title: 'Put the vendor board on your phone',
    items: [
      'Open your vendor board URL on your phone in Chrome or Safari.',
      'Use Add to Home Screen so Orders is one tap away during service.',
      'On this computer, bookmark /vendor for desk use.',
      'Sign in once on the phone icon — stay signed in on that device.',
    ],
  },
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

function useInstallAvailability() {
  const [, bump] = useState(0)
  useEffect(() => {
    const fn = () => bump((n) => n + 1)
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [])
  return {
    deferred: deferredPrompt,
    installed: isStandaloneDisplay(),
    platform: detectPlatform(),
    iosSafari: isIosSafari(),
  }
}

export function AppEntryButton({
  className,
  children = 'Open app',
  light = false,
}: {
  className?: string
  children?: ReactNode
  light?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <AppGuideSheet open={open} onClose={() => setOpen(false)} mode="entry" light={light} />
    </>
  )
}

export function InstallPrompt({
  compact = false,
  audience = 'customer',
}: {
  compact?: boolean
  audience?: Audience
}) {
  const { deferred, installed, platform } = useInstallAvailability()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const dismissKey =
    audience === 'vendor'
      ? 'kampedrop-vendor-install-dismissed'
      : 'kampedrop-install-dismissed'

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(dismissKey) === '1')
    } catch {
      /* ignore */
    }
  }, [dismissKey])

  if (installed || dismissed) return null

  function dismiss() {
    setDismissed(true)
    setOpen(false)
    try {
      sessionStorage.setItem(dismissKey, '1')
    } catch {
      /* ignore */
    }
  }

  const label =
    audience === 'vendor'
      ? 'How to install on your phone'
      : platform === 'ios'
        ? 'How to install'
        : deferred
          ? 'Install app'
          : 'How to install'

  if (compact) {
    return (
      <>
        <button
          type="button"
          className="btn-secondary w-full sm:w-auto"
          onClick={() => setOpen(true)}
        >
          {label}
        </button>
        <AppGuideSheet
          open={open}
          onClose={() => setOpen(false)}
          mode="install"
          audience={audience}
        />
      </>
    )
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={springSoft}
        >
          <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-white/10 bg-ink px-3 py-3 text-white shadow-[0_12px_40px_rgba(14,28,24,0.4)] sm:gap-3 sm:px-4 sm:py-3.5">
            <img
              src="/icons/icon-192.png"
              alt=""
              className="h-10 w-10 shrink-0 rounded-xl sm:h-11 sm:w-11"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-snug">
                {audience === 'vendor'
                  ? 'Put your vendor board on the home screen'
                  : 'Put KampeDrop on your home screen'}
              </p>
              <p className="hidden text-xs text-white/60 sm:block">
                We’ll show you the exact steps for your phone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-xl bg-mango px-3 py-2 text-xs font-bold"
            >
              Show me
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 px-1 text-xs font-semibold text-white/45 hover:text-white"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
      <AppGuideSheet
        open={open}
        onClose={() => setOpen(false)}
        mode="install"
        audience={audience}
      />
    </>
  )
}

export function AppGuideSheet({
  open,
  onClose,
  mode = 'entry',
  audience = 'customer',
}: {
  open: boolean
  onClose: () => void
  mode?: 'entry' | 'install'
  audience?: Audience
  light?: boolean
}) {
  const { deferred, installed, platform } = useInstallAvailability()
  const guide = (audience === 'vendor' ? vendorSteps : customerSteps)[platform]
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<'choose' | 'install'>(
    mode === 'install' ? 'install' : 'choose',
  )
  const [mounted, setMounted] = useState(false)
  const isVendor = audience === 'vendor'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (open) setView(mode === 'install' ? 'install' : 'choose')
  }, [open, mode])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  async function runNativeInstall() {
    if (!deferred || isVendor) {
      setView('install')
      return
    }
    setBusy(true)
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') onClose()
    } finally {
      setBusy(false)
      deferredPrompt = null
      notify()
    }
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/60 px-4 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex max-h-[min(88dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] bg-paper text-ink shadow-2xl"
            initial={{ y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={springSoft}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-guide-title"
          >
            <div className="flex shrink-0 items-start gap-3 border-b border-line/60 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <img
                src="/icons/icon-192.png"
                alt=""
                className="h-11 w-11 shrink-0 rounded-2xl sm:h-12 sm:w-12"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-lagoon">
                  {isVendor ? 'Vendor board' : 'KampeDrop app'}
                </p>
                <h2
                  id="app-guide-title"
                  className="mt-1 font-display text-[1.35rem] font-semibold leading-tight tracking-[-0.02em] sm:text-2xl"
                >
                  {view === 'choose' ? 'How do you want to continue?' : guide.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mist text-sm font-bold text-muted"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {view === 'choose' ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-muted">
                    {isVendor
                      ? 'Use the board in your browser now, or add it to your home screen so Orders is one tap away.'
                      : 'You can order in your browser right now, or install KampeDrop so it sits on your home screen like a normal app.'}
                  </p>

                  {isVendor ? (
                    <button type="button" className="btn-primary w-full" onClick={onClose}>
                      Continue in browser
                    </button>
                  ) : (
                    <Link
                      to={APP_BASE}
                      onClick={onClose}
                      className="btn-primary flex w-full shadow-[0_10px_28px_rgba(255,107,44,0.25)]"
                    >
                      Continue in browser
                    </Link>
                  )}

                  {!installed && (
                    <button
                      type="button"
                      className="btn-ink w-full"
                      onClick={() => {
                        if (!isVendor && deferred) void runNativeInstall()
                        else setView('install')
                      }}
                    >
                      {!isVendor && deferred ? 'Install app' : 'Show install steps'}
                    </button>
                  )}

                  <div className="rounded-2xl bg-mist px-4 py-3 text-sm text-ink-soft">
                    <p className="font-semibold text-ink">Tip</p>
                    <p className="mt-1 leading-relaxed">
                      {isVendor
                        ? 'Add to Home Screen from this vendor page so the icon opens your board — not the customer order app.'
                        : 'Installing is free and takes under a minute. No App Store download needed.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted">
                    {isVendor
                      ? 'Follow these steps on your phone. When you’re done, open the icon — it should open your vendor board.'
                      : 'Follow these steps on your device. When you’re done, open the KampeDrop icon — it goes straight to ordering.'}
                  </p>

                  <ol className="space-y-3">
                    {guide.items.map((item, i) => (
                      <li
                        key={item}
                        className="flex gap-3 rounded-2xl bg-mist px-3.5 py-3 text-sm leading-relaxed text-ink-soft"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>

                  {!isVendor && (platform === 'android' || platform === 'desktop') && deferred && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runNativeInstall()}
                      className="btn-primary w-full disabled:opacity-70"
                    >
                      {busy ? 'Opening install…' : 'Install now'}
                    </button>
                  )}

                  {platform === 'ios' && (
                    <div className="rounded-2xl border border-lagoon/20 bg-lagoon/8 px-4 py-3 text-sm text-lagoon-deep">
                      Must use <span className="font-bold">Safari</span>. In-app browsers
                      (WhatsApp, Instagram) often hide Share → Add to Home Screen.
                    </div>
                  )}

                  {isVendor && platform === 'android' && (
                    <div className="rounded-2xl border border-lagoon/20 bg-lagoon/8 px-4 py-3 text-sm text-lagoon-deep">
                      Prefer <span className="font-bold">Add to Home screen</span> while on
                      this vendor page. Chrome’s “Install app” shortcut opens the customer
                      ordering app instead.
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    {mode === 'entry' && (
                      <button
                        type="button"
                        className="btn-ink flex-1"
                        onClick={() => setView('choose')}
                      >
                        Back
                      </button>
                    )}
                    {isVendor ? (
                      <button
                        type="button"
                        onClick={onClose}
                        className="btn-primary flex flex-1 items-center justify-center"
                      >
                        Got it
                      </button>
                    ) : (
                      <Link
                        to={APP_BASE}
                        onClick={onClose}
                        className="btn-primary flex flex-1 items-center justify-center"
                      >
                        Order in browser instead
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Soft tip inside the customer app for first-time visitors */
export function InAppInstallTip() {
  const { installed } = useInstallAvailability()
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (installed) {
      setHidden(true)
      return
    }
    try {
      setHidden(sessionStorage.getItem('kampedrop-app-tip-hidden') === '1')
    } catch {
      setHidden(false)
    }
  }, [installed])

  if (installed || hidden) return null

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 rounded-full border border-lagoon/15 bg-paper/70 px-3.5 py-2 backdrop-blur-sm">
        <p className="min-w-0 truncate text-xs font-semibold text-ink-soft">
          Want the home-screen icon?
        </p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold text-white"
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => {
              setHidden(true)
              try {
                sessionStorage.setItem('kampedrop-app-tip-hidden', '1')
              } catch {
                /* ignore */
              }
            }}
            className="rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-muted"
          >
            Later
          </button>
        </div>
      </div>
      <AppGuideSheet open={open} onClose={() => setOpen(false)} mode="install" />
    </>
  )
}

/** Tip + how-to on the vendor board (same web app, vendor-specific steps). */
export function VendorInstallTip() {
  const { installed } = useInstallAvailability()
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (installed) {
      setHidden(true)
      return
    }
    try {
      setHidden(sessionStorage.getItem('kampedrop-vendor-tip-hidden') === '1')
    } catch {
      setHidden(false)
    }
  }, [installed])

  if (installed || hidden) return null

  return (
    <>
      <div className="mb-5 rounded-2xl border border-lagoon/20 bg-paper px-4 py-3.5 shadow-sm">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-lagoon">
          On your phone
        </p>
        <p className="mt-1.5 text-sm font-semibold leading-snug text-ink">
          Add this vendor board to your home screen — one tap to Orders during service.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-ink px-3.5 py-2 text-xs font-bold text-white"
          >
            Show install steps
          </button>
          <button
            type="button"
            onClick={() => {
              setHidden(true)
              try {
                sessionStorage.setItem('kampedrop-vendor-tip-hidden', '1')
              } catch {
                /* ignore */
              }
            }}
            className="rounded-full bg-mist px-3.5 py-2 text-xs font-bold text-muted"
          >
            Later
          </button>
        </div>
      </div>
      <AppGuideSheet
        open={open}
        onClose={() => setOpen(false)}
        mode="install"
        audience="vendor"
      />
    </>
  )
}

/** Always-available “how to install” control for vendor login / footer. */
export function VendorInstallButton({
  className = 'text-lagoon hover:underline',
}: {
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const { installed } = useInstallAvailability()

  if (installed) return null

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Install on your phone
      </button>
      <AppGuideSheet
        open={open}
        onClose={() => setOpen(false)}
        mode="install"
        audience="vendor"
      />
    </>
  )
}
