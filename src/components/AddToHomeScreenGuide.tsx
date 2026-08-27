import { useEffect, useState } from 'react'
import { isStandaloneDisplay } from '../paths'

const iosSteps = [
  'Open KampeDrop in Safari (not Chrome or an in-app browser).',
  'Tap Share at the bottom of Safari.',
  'Scroll and tap Add to Home Screen, then Add.',
]

const androidSteps = [
  'Open KampeDrop in Chrome.',
  'Tap the menu ⋮ → Install app (or Add to Home screen).',
  'Confirm. The icon opens your board like an app.',
]

/** Static iOS + Android steps — reusable on marketing and partner boards. */
export function AddToHomeScreenGuide({
  eyebrow = 'One-tap access',
  title = 'Add to your home screen',
  lead = 'Vendors and riders: put your board on the phone so it opens like an app — no App Store download.',
  tone = 'paper',
}: {
  eyebrow?: string
  title?: string
  lead?: string
  tone?: 'paper' | 'ink'
}) {
  const onInk = tone === 'ink'

  return (
    <div className={onInk ? 'text-white' : 'text-ink'}>
      <p
        className={`text-xs font-extrabold uppercase tracking-[0.18em] ${
          onInk ? 'text-dusk' : 'text-lagoon'
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 max-w-[18ch] font-display text-3xl font-semibold tracking-[-0.03em] md:text-[2.5rem] md:leading-[1.1] ${
          onInk ? 'text-white' : ''
        }`}
      >
        {title}
      </h2>
      <p
        className={`mt-4 max-w-lg text-base leading-relaxed ${
          onInk ? 'text-white/65' : 'text-muted'
        }`}
      >
        {lead}
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <GuideCard
          label="iPhone · Safari"
          steps={iosSteps}
          note="Must use Safari. WhatsApp / Instagram browsers hide Add to Home Screen."
          onInk={onInk}
        />
        <GuideCard
          label="Android · Chrome"
          steps={androidSteps}
          note="If Chrome offers Install, use that — same result as the menu path."
          onInk={onInk}
        />
      </div>
    </div>
  )
}

function GuideCard({
  label,
  steps,
  note,
  onInk,
}: {
  label: string
  steps: string[]
  note: string
  onInk: boolean
}) {
  return (
    <div
      className={`rounded-[1.5rem] p-5 ring-1 sm:p-6 ${
        onInk
          ? 'bg-white/5 ring-white/15'
          : 'bg-paper ring-line shadow-[4px_4px_0_rgba(6,24,28,0.08)]'
      }`}
    >
      <p
        className={`text-[11px] font-extrabold uppercase tracking-[0.14em] ${
          onInk ? 'text-dusk' : 'text-lagoon'
        }`}
      >
        {label}
      </p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, i) => (
          <li
            key={step}
            className={`flex gap-3 text-sm font-semibold leading-snug ${
              onInk ? 'text-white/85' : 'text-ink-soft'
            }`}
          >
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                onInk ? 'bg-dusk text-ink' : 'bg-ink text-dusk'
              }`}
            >
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p
        className={`mt-4 text-xs leading-relaxed ${
          onInk ? 'text-white/50' : 'text-muted'
        }`}
      >
        {note}
      </p>
    </div>
  )
}

/**
 * Dismissible tip for partner boards (rider / vendor) after login.
 * Hides when already installed as a standalone PWA.
 */
export function AddToHomeScreenTip({
  storageKey,
  title = 'Put your board on the home screen',
  body = 'One tap next time — Share → Add to Home Screen (iPhone) or Chrome ⋮ → Install app (Android).',
}: {
  storageKey: string
  title?: string
  body?: string
}) {
  const [hidden, setHidden] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setHidden(true)
      return
    }
    try {
      setHidden(sessionStorage.getItem(storageKey) === '1')
    } catch {
      setHidden(false)
    }
  }, [storageKey])

  if (hidden) return null

  function dismiss() {
    setHidden(true)
    setOpen(false)
    try {
      sessionStorage.setItem(storageKey, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mb-5 rounded-2xl border border-ink/15 bg-paper/90 px-4 py-3.5 shadow-sm">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-dusk">
        Home screen
      </p>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-ink">{title}</p>
      {!open ? (
        <p className="mt-1 text-xs font-semibold leading-relaxed text-muted">{body}</p>
      ) : (
        <div className="mt-3 space-y-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-lagoon">
              iPhone · Safari
            </p>
            <ol className="mt-2 space-y-1.5 text-xs font-semibold text-ink-soft">
              {iosSteps.map((s, i) => (
                <li key={s}>
                  {i + 1}. {s}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-lagoon">
              Android · Chrome
            </p>
            <ol className="mt-2 space-y-1.5 text-xs font-semibold text-ink-soft">
              {androidSteps.map((s, i) => (
                <li key={s}>
                  {i + 1}. {s}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-ink px-3.5 py-2 text-xs font-bold text-dusk"
          >
            Show steps
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full bg-ink/6 px-3.5 py-2 text-xs font-bold text-muted"
        >
          {open ? 'Got it' : 'Later'}
        </button>
      </div>
    </div>
  )
}
