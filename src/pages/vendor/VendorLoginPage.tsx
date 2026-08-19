import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { NgPhoneField } from '../../components/NgPhoneField'
import { useCatalog } from '../../context/CatalogContext'
import { useVendor } from '../../context/VendorContext'
import { SITE, whatsappHelpUrl } from '../../data/site'
import { VENDOR_DEMO_PIN } from '../../data/vendors'
import { isValidNgMobileNational, toStoredNgPhone } from '../../lib/nigeriaPhone'
import { vendorPath } from './VendorShell'

const helpUrl = whatsappHelpUrl(
  `Hi KampeDrop — I need help signing in to my business board in ${SITE.area}.`,
)

export function VendorLoginPage() {
  const { findVendorByPhone } = useCatalog()
  const { authenticated, login } = useVendor()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (authenticated) return <Navigate to={vendorPath()} replace />

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isValidNgMobileNational(phone)) {
      setError('Enter a valid 10-digit number after +234 (e.g. 8034441001).')
      return
    }
    const vendor = findVendorByPhone(toStoredNgPhone(phone))
    if (!vendor) {
      setError('No business found for that phone. Register first.')
      return
    }
    const result = login(vendor.id, pin)
    if (!result.ok) setError(result.reason)
    else setError(null)
  }

  return (
    <div className="flex min-h-svh flex-col mist-wash text-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lagoon">
          {SITE.name} Vendor
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.03em]">
          Sign in to your board
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Browser only — no app download. Pilot PIN{' '}
          <span className="font-bold text-ink">{VENDOR_DEMO_PIN}</span> — enter digits after
          +234 (skip the leading 0).
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              Business phone
            </span>
            <div className="mt-1.5">
              <NgPhoneField id="vendor-login-phone" value={phone} onChange={setPhone} />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">PIN</span>
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
            />
          </label>
          {error && (
            <p className="rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full">
            Open board →
          </button>
        </form>

        <div className="mt-8 space-y-2 text-center text-sm font-semibold text-muted">
          <p>
            New here?{' '}
            <Link to={vendorPath('/signup')} className="text-lagoon hover:underline">
              Register your business
            </Link>
          </p>
          <a href={helpUrl} target="_blank" rel="noreferrer" className="text-lagoon hover:underline">
            Need help? WhatsApp us
          </a>
          <p>
            <Link to="/work-with-us" className="hover:text-ink">
              ← Work with us
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
