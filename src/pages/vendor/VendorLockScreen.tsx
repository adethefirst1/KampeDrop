import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useVendor } from '../../context/VendorContext'
import { SITE } from '../../data/site'

/** Full-screen PIN gate — session stays, board stays hidden until unlock. */
export function VendorLockScreen() {
  const { vendorName, vendorPhone, unlockBoard, logout } = useVendor()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await unlockBoard(pin)
      if (!result.ok) {
        setError(result.reason)
        setPin('')
        inputRef.current?.focus()
      }
    } finally {
      setBusy(false)
    }
  }

  const maskedPhone =
    vendorPhone && vendorPhone.length >= 4
      ? `····${vendorPhone.slice(-4)}`
      : null

  return (
    <div className="flex min-h-svh flex-col vendor-wash text-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-dusk">
          {SITE.name} · Locked
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.03em]">
          Board is locked
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {vendorName ? (
            <>
              <span className="font-semibold text-ink">{vendorName}</span>
              {' is still signed in. Enter your board PIN to open the station'}
              {maskedPhone ? ` (${maskedPhone})` : ''}.
            </>
          ) : (
            'Enter your board PIN to open the station again.'
          )}
        </p>

        {!vendorPhone && (
          <p className="mt-4 rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
            This older session can’t unlock with PIN alone. Sign out and clock in once
            more.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              Board PIN
            </span>
            <input
              ref={inputRef}
              className="field mt-1.5 tracking-[0.3em]"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              required
              disabled={busy || !vendorPhone}
            />
          </label>
          {error && (
            <p className="rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-full bg-ink px-4 py-3.5 text-sm font-extrabold text-dusk shadow-[0_4px_0_rgba(6,24,28,0.4)] transition hover:bg-ink-soft disabled:opacity-70"
            disabled={busy || !vendorPhone || pin.length !== 4}
          >
            {busy ? 'Unlocking…' : 'Unlock board →'}
          </button>
        </form>

        <button
          type="button"
          onClick={logout}
          className="mt-8 text-center text-sm font-semibold text-muted hover:text-ink"
        >
          Sign out instead
        </button>
      </div>
    </div>
  )
}
