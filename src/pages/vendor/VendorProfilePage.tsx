import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { NgPhoneField } from '../../components/NgPhoneField'
import { useCatalog } from '../../context/CatalogContext'
import { useVendor } from '../../context/VendorContext'
import { SITE, whatsappHelpUrl } from '../../data/site'
import {
  isValidNgMobileNational,
  toNationalMobile,
  toStoredNgPhone,
} from '../../lib/nigeriaPhone'

const changeRequestUrl = whatsappHelpUrl(
  `Hi KampeDrop — I need to update my locked business details (name / address / photos) for ${SITE.area}.`,
)

export function VendorProfilePage() {
  const { vendorId } = useVendor()
  const { getVendor, patchVendorSelf } = useCatalog()
  const vendor = getVendor(vendorId ?? '')
  const [tagline, setTagline] = useState('')
  const [about, setAbout] = useState('')
  const [phone, setPhone] = useState('')
  const [hours, setHours] = useState('')
  const [etaMins, setEtaMins] = useState(35)
  const [accepting, setAccepting] = useState(true)
  const [saved, setSaved] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  useEffect(() => {
    if (!vendor) return
    setTagline(vendor.tagline)
    setAbout(vendor.about)
    setPhone(toNationalMobile(vendor.phone))
    setHours(vendor.hours)
    setEtaMins(vendor.etaMins)
    setAccepting(vendor.acceptingOrders)
  }, [vendor])

  if (!vendor) return null

  function save() {
    if (!isValidNgMobileNational(phone)) {
      setPhoneError('Enter a valid 10-digit number after +234.')
      return
    }
    setPhoneError(null)
    patchVendorSelf(vendor!.id, {
      tagline: tagline.trim(),
      about: about.trim(),
      phone: toStoredNgPhone(phone),
      hours: hours.trim(),
      etaMins,
      acceptingOrders: accepting,
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">Your business</h1>
      <p className="mt-1 text-sm text-muted">
        Edit story & hours. Name, address, and photos stay locked after verification —
        contact support to change them.
      </p>

      <label className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
        <div>
          <p className="font-bold text-ink">Accepting orders</p>
          <p className="text-xs text-muted">Pause when the kitchen is closed</p>
        </div>
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={accepting}
          onChange={(e) => setAccepting(e.target.checked)}
        />
      </label>

      <section className="mt-6 space-y-3">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Tagline</span>
          <input className="field mt-1.5" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">About</span>
          <textarea
            className="field mt-1.5 min-h-[6rem]"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Phone</span>
          <div className="mt-1.5">
            <NgPhoneField value={phone} onChange={setPhone} id="vendor-profile-phone" />
          </div>
          {phoneError && (
            <p className="mt-1 text-xs font-semibold text-mango-deep">{phoneError}</p>
          )}
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Hours</span>
          <input className="field mt-1.5" value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">ETA hint (mins)</span>
          <input
            className="field mt-1.5"
            type="number"
            min={10}
            max={120}
            value={etaMins}
            onChange={(e) => setEtaMins(Number(e.target.value) || 35)}
          />
        </label>
        <button type="button" className="btn-primary w-full" onClick={save}>
          {saved ? 'Saved ✓' : 'Save changes'}
        </button>
      </section>

      <section className="mt-10 rounded-[1.5rem] border-[3px] border-ink/15 bg-mist/50 p-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-lagoon">
          Locked by KampeDrop
        </p>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="font-bold text-muted">Name</dt>
            <dd className="font-semibold text-ink">{vendor.name}</dd>
          </div>
          <div>
            <dt className="font-bold text-muted">Address / pickup</dt>
            <dd className="font-semibold text-ink">{vendor.pickupSpot}</dd>
          </div>
          <div>
            <dt className="font-bold text-muted">Photos</dt>
            <dd className="font-semibold text-ink">
              {vendor.photos.length
                ? `${vendor.photos.length} on file — contact support to update`
                : 'None yet — contact support'}
            </dd>
          </div>
        </dl>
        <a
          href={changeRequestUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-sm font-bold text-lagoon hover:underline"
        >
          Request a change on WhatsApp →
        </a>
      </section>

      <p className="mt-8 text-center text-sm">
        <Link to={`/app/vendors/${vendor.id}`} className="font-bold text-lagoon hover:underline">
          Preview buyer page →
        </Link>
      </p>
    </div>
  )
}
