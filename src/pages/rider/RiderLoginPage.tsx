import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AddToHomeScreenTip } from '../../components/AddToHomeScreenGuide'
import { NgPhoneField } from '../../components/NgPhoneField'
import { SITE, whatsappHelpUrl } from '../../data/site'
import { isValidNgMobileNational, toStoredNgPhone } from '../../lib/nigeriaPhone'
import { riderLogin } from '../../lib/ridersApi'

const helpUrl = whatsappHelpUrl(
  `Hi KampeDrop — I need help signing in to my rider board in ${SITE.area}.`,
)

export function RiderLoginPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isValidNgMobileNational(phone)) {
      setError('Enter a valid 10-digit number after +234 (e.g. 8034441001).')
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const result = await riderLogin(toStoredNgPhone(phone), pin)
      if (!result.ok) {
        setError(result.reason)
        return
      }
      navigate(`/rider?token=${encodeURIComponent(result.rider.accessToken)}`, {
        replace: true,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#eef1f0] text-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-dusk">
          {SITE.name} · Rider
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.03em]">
          Sign in to your board
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Enter the phone and 4-digit PIN ops gave you (digits after +234 — skip
          the leading 0).
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              Phone
            </span>
            <div className="mt-1.5">
              <NgPhoneField id="rider-login-phone" value={phone} onChange={setPhone} />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              PIN
            </span>
            <input
              className="field mt-1.5 tracking-[0.3em]"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              required
              disabled={busy}
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
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Log in →'}
          </button>
        </form>

        <div className="mt-8">
          <AddToHomeScreenTip
            storageKey="kampedrop-rider-login-home-tip-hidden"
            title="Add this board to your home screen"
            body="After you sign in, keep the icon — opens straight to your rides."
          />
        </div>

        <div className="mt-6 space-y-2 text-center text-sm font-semibold text-muted">
          <p>
            Have a private link?{' '}
            <Link to="/rider" className="text-ink hover:underline">
              Open with token
            </Link>
          </p>
          <a
            href={helpUrl}
            target="_blank"
            rel="noreferrer"
            className="text-ink-soft hover:underline"
          >
            Need help? WhatsApp us
          </a>
          <p>
            <Link to="/work-with-us#ride" className="hover:text-ink">
              Interested in riding? Work with us
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
