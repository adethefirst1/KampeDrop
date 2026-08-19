import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { NgPhoneField } from '../../components/NgPhoneField'
import { useVendor } from '../../context/VendorContext'
import { SITE } from '../../data/site'
import {
  MAX_ONBOARDING_PHOTOS,
  MIN_ONBOARDING_PHOTOS,
  categoryLabel,
  type Category,
} from '../../data/vendors'
import { compressImageFile } from '../../lib/compressImage'
import { isValidNgMobileNational } from '../../lib/nigeriaPhone'
import {
  submitVendorApplication,
  uploadVendorApplicationPhotos,
} from '../../lib/vendorsApi'
import { vendorPath } from './VendorShell'

const AREAS = [
  'Badagry Town',
  'Ajara',
  'Ibereko',
  'Aradagun',
  'Apa',
  'Mowo',
  'Iworo',
  'Agbara edge',
] as const

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const TIME_OPTIONS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
] as const

const CATEGORY_CARDS: { id: Category; hint: string }[] = [
  { id: 'food', hint: 'Kitchen, grill, swallow, pepper soup' },
  { id: 'mart', hint: 'Staples, household, everyday stock' },
  { id: 'pharmacy', hint: 'OTC, sealed packs, careful handoff' },
]

const PHOTO_SLOTS = [
  { label: 'Front of business', hint: 'Storefront or entrance' },
  { label: 'Inside / counter', hint: 'Where orders are packed' },
  { label: 'Extra proof', hint: 'Optional — kitchen, shelf, sign' },
  { label: 'Extra proof', hint: 'Optional' },
] as const

const STEPS = [
  { id: 'identity', title: 'Your business', sub: 'Name & what you sell' },
  { id: 'place', title: 'Where you are', sub: 'Area & how riders find you' },
  { id: 'hours', title: 'When you’re open', sub: 'Tap days & times' },
  { id: 'photos', title: 'Show the place', sub: 'Photos for verification' },
  { id: 'access', title: 'Your access', sub: 'Phone & board PIN' },
] as const

type StepId = (typeof STEPS)[number]['id']

const HOUR_PRESETS: { label: string; days: string[]; open: string; close: string }[] = [
  { label: 'Weekdays', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], open: '10:00', close: '20:00' },
  { label: 'Mon–Sat', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], open: '10:00', close: '20:00' },
  { label: 'Every day', days: [...DAYS], open: '09:00', close: '21:00' },
  { label: 'Evenings', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], open: '16:00', close: '22:00' },
]

function formatHoursLabel(days: string[], open: string, close: string) {
  if (!days.length) return ''
  const ordered = DAYS.filter((d) => days.includes(d))
  const isMonSat =
    ordered.length === 6 &&
    ordered[0] === 'Mon' &&
    ordered[5] === 'Sat' &&
    !ordered.includes('Sun')
  const isEveryday = ordered.length === 7
  const isWeekdays =
    ordered.length === 5 &&
    ordered[0] === 'Mon' &&
    ordered[4] === 'Fri' &&
    !ordered.includes('Sat') &&
    !ordered.includes('Sun')

  let dayPart: string
  if (isEveryday) dayPart = 'Daily'
  else if (isMonSat) dayPart = 'Mon–Sat'
  else if (isWeekdays) dayPart = 'Mon–Fri'
  else if (ordered.length === 1) dayPart = ordered[0]
  else dayPart = ordered.join(', ')

  return `${dayPart} · ${open} – ${close}`
}

/**
 * Multi-step vendor onboarding — submits via Supabase RPC + Storage photos.
 */
export function VendorSignupPage() {
  const navigate = useNavigate()
  const { authenticated } = useVendor()

  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [photoUploadNote, setPhotoUploadNote] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [area, setArea] = useState<string | null>(null)
  const [pickupSpot, setPickupSpot] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [showPinConfirm, setShowPinConfirm] = useState(false)
  const [about, setAbout] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [openDays, setOpenDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
  const [openTime, setOpenTime] = useState('10:00')
  const [closeTime, setCloseTime] = useState('20:00')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hoursLabel = useMemo(
    () => formatHoursLabel(openDays, openTime, closeTime),
    [openDays, openTime, closeTime],
  )

  const pinMatchStatus = useMemo(() => {
    if (!pinConfirm.length) return 'idle' as const
    if (pin.length !== 4) return 'waiting' as const
    return pin === pinConfirm ? ('match' as const) : ('mismatch' as const)
  }, [pin, pinConfirm])

  const stepId: StepId = STEPS[step].id

  if (authenticated && !done) return <Navigate to={vendorPath()} replace />

  function toggleDay(day: string) {
    setOpenDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  async function addPhoto(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    const room = MAX_ONBOARDING_PHOTOS - photos.length
    if (room <= 0) return
    setBusy(true)
    try {
      const next: string[] = []
      for (const file of Array.from(files).slice(0, room)) {
        if (!file.type.startsWith('image/')) continue
        next.push(await compressImageFile(file))
      }
      setPhotos((prev) => [...prev, ...next].slice(0, MAX_ONBOARDING_PHOTOS))
    } catch {
      setError('We couldn’t process that image. Try another photo.')
    } finally {
      setBusy(false)
    }
  }

  function validateStep(): string | null {
    if (stepId === 'identity') {
      if (!name.trim()) return 'Add your business name.'
      if (!category) return 'Pick a category.'
      return null
    }
    if (stepId === 'place') {
      if (!area) return 'Pick your area.'
      if (!pickupSpot.trim() || pickupSpot.trim().length < 4) {
        return 'Add how riders find you — street or landmark.'
      }
      return null
    }
    if (stepId === 'hours') {
      if (!openDays.length) return 'Tap at least one open day.'
      if (TIME_OPTIONS.indexOf(closeTime as (typeof TIME_OPTIONS)[number]) <=
        TIME_OPTIONS.indexOf(openTime as (typeof TIME_OPTIONS)[number])) {
        return 'Closing time should be after opening time.'
      }
      return null
    }
    if (stepId === 'photos') {
      if (photos.length < MIN_ONBOARDING_PHOTOS) {
        return `Add at least ${MIN_ONBOARDING_PHOTOS} photos to continue.`
      }
      return null
    }
    if (stepId === 'access') {
      if (!isValidNgMobileNational(phone)) {
        return 'Enter a valid 10-digit number after +234 (e.g. 8012345678).'
      }
      if (pin.length !== 4) return 'PIN must be exactly 4 digits.'
      if (pin !== pinConfirm) return 'PINs don’t match.'
      return null
    }
    return null
  }

  function goNext() {
    const issue = validateStep()
    if (issue) {
      setError(issue)
      return
    }
    setError(null)
    if (step < STEPS.length - 1) setStep((s) => s + 1)
    else void finish()
  }

  async function finish() {
    const issue = validateStep()
    if (issue) {
      setError(issue)
      return
    }

    setBusy(true)
    setError(null)
    setPhotoUploadNote(null)

    const aboutForDb = [
      about.trim(),
      pickupSpot.trim() ? `Pickup / landmark: ${pickupSpot.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const result = await submitVendorApplication({
      name: name.trim(),
      category: category!,
      area: area!,
      phone,
      hours: hoursLabel,
      about: aboutForDb,
      pin,
      lat: null,
      lng: null,
    })

    if (!result.ok) {
      setBusy(false)
      setError(result.reason)
      return
    }

    const photoResult = await uploadVendorApplicationPhotos(result.vendorId, photos)
    setBusy(false)

    if (!photoResult.ok) {
      setPhotoUploadNote(
        `Application saved, but photo upload failed: ${photoResult.reason}. Message support with your phone number so we can attach photos.`,
      )
    }

    setSubmittedId(result.vendorId)
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex min-h-svh flex-col mist-wash text-ink">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lagoon">
            Application submitted
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.03em]">
            Application submitted — pending review
          </h1>
          <div className="mt-5 rounded-[1.5rem] border-[3px] border-ink bg-dusk px-5 py-5 text-ink shadow-[5px_5px_0_#06181C]">
            <p className="text-sm font-semibold leading-relaxed">
              We typically verify within 24 hours once details and photos are complete.
              Your business stays hidden from customers until we approve.
            </p>
            {submittedId && (
              <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-ink/70">
                Ref · {submittedId.slice(0, 8)}
              </p>
            )}
          </div>
          {photoUploadNote && (
            <p className="mt-4 rounded-xl bg-mango/15 px-3 py-2.5 text-sm font-semibold text-mango-deep">
              {photoUploadNote}
            </p>
          )}
          <ul className="mt-6 space-y-2 text-sm font-semibold text-muted">
            <li>✓ You’re in the verification queue</li>
            <li>✓ Customers can’t see you until approval</li>
            <li>✓ Keep this phone + PIN for board access after go-live</li>
          </ul>
          <Link to="/work-with-us" className="btn-primary mt-8 w-full text-center">
            Back to Work with us →
          </Link>
          <button
            type="button"
            className="mt-4 text-center text-sm font-bold text-lagoon hover:underline"
            onClick={() => navigate(vendorPath('/login'), { replace: true })}
          >
            Already approved? Sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh mist-wash text-ink">
      <div className="mx-auto max-w-lg px-4 pb-28 pt-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lagoon">
              {SITE.name} · Partners
            </p>
            <h1 className="mt-2 font-display text-[1.85rem] font-bold leading-tight tracking-[-0.03em]">
              {STEPS[step].title}
            </h1>
            <p className="mt-1 text-sm font-semibold text-muted">{STEPS[step].sub}</p>
          </div>
          <Link
            to={vendorPath('/login')}
            className="shrink-0 rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-muted ring-1 ring-line"
          >
            Sign in
          </Link>
        </div>

        {/* Progress */}
        <div className="mt-6 flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full ${
                i <= step ? 'bg-mango' : 'bg-ink/10'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
          Step {step + 1} of {STEPS.length}
        </p>

        <div className="mt-4 rounded-2xl border-[2px] border-ink/10 bg-paper/80 px-3.5 py-3 text-xs font-semibold leading-relaxed text-ink-soft">
          Complimentary · verified within ~24 hours · live only after approval
        </div>

        <div className="mt-7">
          {stepId === 'identity' && (
            <div className="space-y-5">
              <label className="block">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                  Business name
                </span>
                <input
                  className="field mt-2 border-[2px] border-ink/15 font-semibold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="As customers should see it"
                  autoFocus
                />
                <p className="mt-1.5 text-[11px] font-semibold text-muted">
                  Locked after approval — contact support to change.
                </p>
              </label>

              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                  Category
                </p>
                <div className="mt-3 grid gap-2.5">
                  {CATEGORY_CARDS.map((c) => {
                    const on = category === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(c.id)}
                        className={`rounded-[1.25rem] border-[3px] px-4 py-3.5 text-left transition ${
                          on
                            ? 'border-ink bg-dusk shadow-[3px_3px_0_#06181C]'
                            : 'border-ink/15 bg-paper'
                        }`}
                      >
                        <p className="font-display text-xl font-bold tracking-[-0.02em]">
                          {categoryLabel[c.id]}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-ink-soft">{c.hint}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                  Short description
                </span>
                <textarea
                  className="field mt-2 min-h-[5rem] border-[2px] border-ink/15"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="What you serve or stock — a few lines"
                />
              </label>
            </div>
          )}

          {stepId === 'place' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                  Area
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {AREAS.map((a) => {
                    const on = area === a
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setArea(a)}
                        className={`rounded-full border-[2px] px-3.5 py-2 text-sm font-extrabold ${
                          on
                            ? 'border-ink bg-ink text-white'
                            : 'border-ink/15 bg-paper text-ink-soft'
                        }`}
                      >
                        {a}
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                  How riders find you
                </span>
                <textarea
                  className="field mt-2 min-h-[5.5rem] border-[2px] border-ink/15 font-semibold"
                  value={pickupSpot}
                  onChange={(e) => setPickupSpot(e.target.value)}
                  placeholder="e.g. Hospital Road, near First Baptist — blue gate"
                />
                <p className="mt-1.5 text-[11px] font-semibold text-muted">
                  Address is locked after approval — contact support to change.
                </p>
              </label>
            </div>
          )}

          {stepId === 'hours' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                  Quick presets
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {HOUR_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setOpenDays(p.days)
                        setOpenTime(p.open)
                        setCloseTime(p.close)
                      }}
                      className="rounded-full border-[2px] border-ink/15 bg-paper px-3 py-1.5 text-xs font-extrabold text-ink-soft"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                  Open days
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {DAYS.map((d) => {
                    const on = openDays.includes(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`min-w-[3.1rem] rounded-full border-[2px] px-2.5 py-2 text-xs font-extrabold ${
                          on
                            ? 'border-ink bg-lagoon text-white'
                            : 'border-ink/15 bg-paper text-muted'
                        }`}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                    Opens
                  </span>
                  <select
                    className="field mt-2 border-[2px] border-ink/15 font-bold"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                    Closes
                  </span>
                  <select
                    className="field mt-2 border-[2px] border-ink/15 font-bold"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {hoursLabel && (
                <div className="rounded-[1.25rem] border-[3px] border-ink bg-dusk px-4 py-3 shadow-[3px_3px_0_#06181C]">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink/60">
                    Customers will see
                  </p>
                  <p className="mt-1 font-display text-lg font-bold">{hoursLabel}</p>
                </div>
              )}
            </div>
          )}

          {stepId === 'photos' && (
            <div className="space-y-4">
              <p className="text-sm font-semibold leading-relaxed text-muted">
                At least {MIN_ONBOARDING_PHOTOS} clear photos. Locked after approval — this is how
                we confirm you’re a real Badagry business.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PHOTO_SLOTS.map((slot, i) => {
                  const src = photos[i]
                  const required = i < MIN_ONBOARDING_PHOTOS
                  return (
                    <div key={slot.label + i} className="relative">
                      {src ? (
                        <div className="relative aspect-square overflow-hidden rounded-[1.25rem] border-[3px] border-ink">
                          <img src={src} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            className="absolute right-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white"
                            onClick={() =>
                              setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label
                          className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[1.25rem] border-[3px] border-dashed px-2 text-center ${
                            required
                              ? 'border-ink/35 bg-paper'
                              : 'border-ink/15 bg-mist/40'
                          }`}
                        >
                          <span className="text-xs font-extrabold text-ink">
                            {busy ? '…' : '+ Add'}
                          </span>
                          <span className="mt-1 text-[10px] font-bold leading-snug text-muted">
                            {slot.label}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            disabled={busy || photos.length >= MAX_ONBOARDING_PHOTOS}
                            onChange={(e) => {
                              void addPhoto(e.target.files)
                              e.target.value = ''
                            }}
                          />
                        </label>
                      )}
                      <p className="mt-1.5 text-[10px] font-semibold text-muted">
                        {slot.hint}
                        {required ? ' · required' : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs font-bold text-lagoon">
                {photos.length}/{MAX_ONBOARDING_PHOTOS} added
                {photos.length < MIN_ONBOARDING_PHOTOS
                  ? ` · need ${MIN_ONBOARDING_PHOTOS - photos.length} more`
                  : ' · ready'}
              </p>
            </div>
          )}

          {stepId === 'access' && (
            <div className="space-y-5">
              <label className="block">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                  WhatsApp phone
                </span>
                <div className="mt-2">
                  <NgPhoneField
                    id="vendor-signup-phone"
                    value={phone}
                    onChange={setPhone}
                  />
                </div>
              </label>

              <div>
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                  Create board PIN
                </span>
                <div className="relative mt-2">
                  <input
                    className="field w-full border-[2px] border-ink/15 pr-12 tracking-[0.35em] font-bold"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    autoComplete="new-password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    placeholder="••••"
                    aria-label="Create board PIN"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-ink"
                    onClick={() => setShowPin((v) => !v)}
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    <EyeIcon open={showPin} />
                  </button>
                </div>
                {pin.length > 0 && pin.length < 4 && (
                  <p className="mt-1.5 text-[11px] font-semibold text-muted">Exactly 4 digits</p>
                )}
              </div>

              <div>
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                  Confirm PIN
                </span>
                <div className="relative mt-2">
                  <input
                    className={`field w-full border-[2px] pr-12 tracking-[0.35em] font-bold ${
                      pinMatchStatus === 'match'
                        ? 'border-lagoon'
                        : pinMatchStatus === 'mismatch'
                          ? 'border-mango'
                          : 'border-ink/15'
                    }`}
                    type={showPinConfirm ? 'text' : 'password'}
                    inputMode="numeric"
                    autoComplete="new-password"
                    value={pinConfirm}
                    onChange={(e) =>
                      setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    maxLength={4}
                    placeholder="••••"
                    aria-label="Confirm board PIN"
                    aria-invalid={pinMatchStatus === 'mismatch'}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-ink"
                    onClick={() => setShowPinConfirm((v) => !v)}
                    aria-label={showPinConfirm ? 'Hide confirm PIN' : 'Show confirm PIN'}
                  >
                    <EyeIcon open={showPinConfirm} />
                  </button>
                </div>
                {pinMatchStatus === 'match' && (
                  <p className="mt-1.5 text-[11px] font-extrabold text-lagoon">PINs match ✓</p>
                )}
                {pinMatchStatus === 'mismatch' && (
                  <p className="mt-1.5 text-[11px] font-extrabold text-mango-deep">
                    PINs don’t match
                  </p>
                )}
                {pinMatchStatus === 'waiting' && (
                  <p className="mt-1.5 text-[11px] font-semibold text-muted">
                    Enter a 4-digit PIN, then confirm
                  </p>
                )}
              </div>

              <div className="rounded-[1.25rem] bg-mist px-4 py-3 text-sm font-semibold text-ink-soft">
                After submit you’re <strong>pending review</strong> — not visible to customers
                yet.
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-5 rounded-xl bg-mango/15 px-3 py-2.5 text-sm font-semibold text-mango-deep">
            {error}
          </p>
        )}
      </div>

      {/* Sticky footer actions */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-paper/95 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg gap-2">
          {step > 0 ? (
            <button
              type="button"
              className="rounded-full bg-mist px-5 py-3 text-sm font-extrabold text-ink"
              onClick={() => {
                setError(null)
                setStep((s) => s - 1)
              }}
            >
              Back
            </button>
          ) : (
            <Link
              to="/work-with-us"
              className="grid place-items-center rounded-full bg-mist px-5 py-3 text-sm font-extrabold text-ink"
            >
              Exit
            </Link>
          )}
          <button
            type="button"
            className="btn-primary min-w-0 flex-1 !py-3 disabled:opacity-45"
            disabled={
              busy ||
              (stepId === 'access' && (pinMatchStatus !== 'match' || pin.length !== 4))
            }
            onClick={goNext}
          >
            {busy
              ? 'Submitting…'
              : step === STEPS.length - 1
                ? 'Submit for verification →'
                : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5M9.9 5.1A10.5 10.5 0 0 1 12 5c5 0 9.3 3.1 11 7-.5 1.2-1.3 2.4-2.3 3.4M6.1 6.1C4.2 7.4 2.8 9.1 2 12c1.7 3.9 6 7 11 7 1.4 0 2.7-.2 3.9-.7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12c1.7-3.9 6-7 11-7s9.3 3.1 11 7c-1.7 3.9-6 7-11 7S3.7 15.9 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}
