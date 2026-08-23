import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { slowFloatTransition } from '../motion/tokens'

/**
 * Homepage “How it works” — same scroll-morph stack as category grocery cards.
 * SVG doodles only (no photos).
 */

type StepId = 'order' | 'confirm' | 'track' | 'secure'

type StoryBeat = {
  id: StepId
  n: string
  title: string
  shortTitle: string
  emotion: string
  body: string
  tag: string
  chips: string[]
  bg: string
  fg: string
  muted: string
  badge: string
  chipBg: string
}

const BEATS: StoryBeat[] = [
  {
    id: 'order',
    n: '01',
    title: 'You ask.',
    shortTitle: 'Ask',
    emotion: 'Hungry evening. Empty shelf. Quiet worry.',
    body: 'From your Badagry home, you tap a vetted kitchen, mart, or pharmacy — not a stranger in a chat.',
    tag: 'The wanting',
    chips: ['Food', 'Mart', 'Pharmacy', 'Near you'],
    bg: '#EDE4F5',
    fg: '#1A120C',
    muted: 'rgba(26,18,12,0.62)',
    badge: 'rgba(26,18,12,0.08)',
    chipBg: '#B85A1C',
  },
  {
    id: 'confirm',
    n: '02',
    title: 'We answer.',
    shortTitle: 'Answer',
    emotion: 'No silence. No “we go check”.',
    body: 'Confirmation lands now. Your passkey waits. If you pay ahead, escrow holds it safe.',
    tag: 'The relief',
    chips: ['Instant', 'Passkey', 'Escrow'],
    bg: '#D9ECF7',
    fg: '#0B1C22',
    muted: 'rgba(11,28,34,0.62)',
    badge: 'rgba(11,28,34,0.08)',
    chipBg: '#0F2E34',
  },
  {
    id: 'track',
    n: '03',
    title: 'You watch.',
    shortTitle: 'Watch',
    emotion: 'Kitchen heat → Expressway wind → your gate.',
    body: 'Live stages, not guesswork. Preparing. On the way. Almost home.',
    tag: 'The journey',
    chips: ['Preparing', 'On the way', 'At gate'],
    bg: '#F5EFC8',
    fg: '#0A2A26',
    muted: 'rgba(10,42,38,0.62)',
    badge: 'rgba(10,42,38,0.08)',
    chipBg: '#0C6560',
  },
  {
    id: 'secure',
    n: '04',
    title: 'We stand.',
    shortTitle: 'Stand',
    emotion: 'Handed over — or made right.',
    body: 'That’s the KampeDrop Guarantee. Wrong, late, missing: we don’t vanish. We fix it.',
    tag: 'The promise',
    chips: ['Guarantee', 'Make it right', 'Human'],
    bg: '#E6F0E8',
    fg: '#122018',
    muted: 'rgba(18,32,24,0.62)',
    badge: 'rgba(18,32,24,0.08)',
    chipBg: '#2A5C38',
  },
]

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

function useStackProgress(
  sectionRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const [progress, setProgress] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    const section = sectionRef.current
    if (!section) return

    const update = () => {
      raf.current = null
      const rect = section.getBoundingClientRect()
      const total = section.offsetHeight - window.innerHeight
      if (total <= 0) {
        setProgress(0)
        return
      }
      setProgress(clamp(-rect.top / total, 0, 1))
    }

    const onScroll = () => {
      if (raf.current != null) return
      raf.current = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf.current != null) window.cancelAnimationFrame(raf.current)
    }
  }, [sectionRef, enabled])

  return progress
}

function SceneArt({
  id,
  accent,
  reduce,
  className = '',
}: {
  id: StepId
  accent: string
  reduce: boolean
  className?: string
}) {
  return (
    <motion.svg
      viewBox="0 0 320 200"
      className={className}
      fill="none"
      aria-hidden
      animate={
        reduce ? undefined : { y: [0, -4, 0], transition: slowFloatTransition }
      }
    >
      <ellipse cx="160" cy="178" rx="110" ry="12" fill={accent} opacity="0.12" />

      {id === 'order' && (
        <>
          <circle cx="240" cy="40" r="48" fill={accent} opacity="0.14" />
          <circle cx="118" cy="58" r="22" stroke={accent} strokeWidth="3" />
          <path
            d="M92 90c4-16 14-24 26-24s22 8 26 24v48H92V90Z"
            stroke={accent}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M108 140v32M128 140v32"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <motion.g
            style={{ transformOrigin: '178px 118px' }}
            animate={
              reduce
                ? undefined
                : {
                    rotate: [0, -7, 0, 5, 0],
                    transition: { duration: 2.6, repeat: Infinity },
                  }
            }
          >
            <rect
              x="156"
              y="92"
              width="44"
              height="68"
              rx="8"
              stroke={accent}
              strokeWidth="3"
              fill={accent}
              fillOpacity="0.1"
            />
            <rect
              x="164"
              y="104"
              width="28"
              height="36"
              rx="3"
              fill={accent}
              fillOpacity="0.22"
            />
            <circle cx="178" cy="150" r="3" fill={accent} />
          </motion.g>
          {!reduce && (
            <motion.g
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <path
                d="M212 78l6-12M222 88l14-4M218 102l12 10"
                stroke={accent}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </motion.g>
          )}
          <path
            d="M70 70c0-6 4-10 8-10 3 0 5 2 6 4 1-2 3-4 6-4 4 0 8 4 8 10 0 8-14 18-14 18S70 78 70 70Z"
            fill={accent}
            opacity="0.35"
          />
        </>
      )}

      {id === 'confirm' && (
        <>
          <circle cx="250" cy="46" r="40" fill={accent} opacity="0.1" />
          <circle cx="100" cy="62" r="20" stroke={accent} strokeWidth="3" />
          <path
            d="M78 90c3-14 12-22 22-22s19 8 22 22v42H78V90Z"
            stroke={accent}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M90 132v30M110 132v30"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <motion.g
            style={{ transformOrigin: '210px 110px' }}
            animate={
              reduce
                ? undefined
                : {
                    scale: [0.88, 1.06, 1],
                    rotate: [-10, 0, 0],
                    transition: {
                      duration: 1.7,
                      repeat: Infinity,
                      repeatDelay: 1,
                    },
                  }
            }
          >
            <rect
              x="168"
              y="72"
              width="84"
              height="84"
              rx="18"
              stroke={accent}
              strokeWidth="3.5"
              fill={accent}
              fillOpacity="0.12"
            />
            <path
              d="M188 116l16 16 32-34"
              stroke={accent}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.g>
          <path
            d="M48 120h28M48 132h20"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.35"
          />
        </>
      )}

      {id === 'track' && (
        <>
          <circle cx="60" cy="50" r="36" fill={accent} opacity="0.12" />
          <motion.g
            animate={
              reduce
                ? undefined
                : { x: [0, 10, 0], transition: { duration: 2, repeat: Infinity } }
            }
          >
            <circle cx="96" cy="148" r="18" stroke={accent} strokeWidth="3" />
            <circle cx="210" cy="148" r="18" stroke={accent} strokeWidth="3" />
            <circle cx="96" cy="148" r="5" fill={accent} opacity="0.35" />
            <circle cx="210" cy="148" r="5" fill={accent} opacity="0.35" />
            <path
              d="M96 148h42l24-36h34l12 36"
              stroke={accent}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M162 112h-22l-8 16"
              stroke={accent}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="156" cy="72" r="16" stroke={accent} strokeWidth="3" />
            <path
              d="M138 94c3-10 10-16 18-16s15 6 18 16v28H138V94Z"
              stroke={accent}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <rect
              x="184"
              y="98"
              width="28"
              height="22"
              rx="4"
              stroke={accent}
              strokeWidth="2.75"
              fill={accent}
              fillOpacity="0.15"
            />
            <path d="M190 98v-6h16v6" stroke={accent} strokeWidth="2.75" />
          </motion.g>
          {!reduce && (
            <motion.path
              d="M36 168h24M72 168h24M108 168h24M144 168h24M180 168h24M216 168h24M252 168h24"
              stroke={accent}
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.28"
              animate={{ x: [0, -36] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </>
      )}

      {id === 'secure' && (
        <>
          <circle cx="70" cy="48" r="42" fill={accent} opacity="0.12" />
          <circle cx="112" cy="64" r="20" stroke={accent} strokeWidth="3" />
          <path
            d="M90 92c3-14 12-22 22-22s19 8 22 22v40H90V92Z"
            stroke={accent}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M102 132v30M122 132v30"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <motion.g
            animate={
              reduce
                ? undefined
                : {
                    y: [0, -5, 0],
                    transition: {
                      duration: 2.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                  }
            }
          >
            <path
              d="M210 52c26 8 40 22 40 48 0 32-26 52-40 60-14-8-40-28-40-60 0-26 14-40 40-48Z"
              stroke={accent}
              strokeWidth="3.5"
              fill={accent}
              fillOpacity="0.12"
              strokeLinejoin="round"
            />
            <path
              d="M192 102l14 14 24-26"
              stroke={accent}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.g>
          <path
            d="M140 118c10 8 22 8 34 0"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.4"
          />
        </>
      )}
    </motion.svg>
  )
}

function ExpandedFace({
  beat,
  reduce,
}: {
  beat: StoryBeat
  reduce: boolean
}) {
  return (
    <div className="relative flex h-full flex-col justify-between p-6 sm:p-8 md:p-10 lg:p-12">
      <div>
        <div
          className="grid h-12 w-12 place-items-center rounded-2xl text-sm font-extrabold ring-1 ring-ink/10 md:h-14 md:w-14 md:text-base"
          style={{ backgroundColor: beat.badge, color: beat.chipBg }}
        >
          {beat.n}
        </div>
        <h3 className="mt-6 max-w-[11ch] font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[2.85rem] md:mt-8 md:text-[3.5rem] lg:text-[4rem]">
          {beat.title}
        </h3>
        <p
          className="mt-4 max-w-lg text-base leading-relaxed md:mt-5 md:text-lg"
          style={{ color: beat.muted }}
        >
          <span className="font-semibold" style={{ color: beat.chipBg }}>
            {beat.emotion}
          </span>{' '}
          {beat.body}
        </p>
      </div>

      <div className="relative mt-10 md:mt-12">
        <div className="pointer-events-none absolute -top-28 right-0 w-[min(100%,19rem)] sm:-top-32 sm:w-[21rem] md:-top-36 md:w-[23rem]">
          <SceneArt
            id={beat.id}
            accent={beat.chipBg}
            reduce={reduce}
            className="h-auto w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2 pr-32 sm:gap-2.5 sm:pr-44 md:pr-52">
          {beat.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full px-3.5 py-2 text-xs font-bold text-white md:px-4 md:text-[13px]"
              style={{ backgroundColor: beat.chipBg }}
            >
              {chip}
            </span>
          ))}
        </div>
        <p
          className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] md:text-xs"
          style={{ color: beat.chipBg }}
        >
          {beat.tag}
        </p>
      </div>
    </div>
  )
}

function CollapsedFace({ beat }: { beat: StoryBeat }) {
  return (
    <div className="flex h-full flex-col items-center justify-between border border-ink/80 px-1.5 py-6 sm:py-8">
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold"
        style={{ backgroundColor: beat.badge, color: beat.chipBg }}
      >
        {beat.n}
      </div>
      <p
        className="max-h-[75%] font-display text-xl font-semibold tracking-[-0.02em] md:text-2xl"
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          color: beat.fg,
        }}
      >
        {beat.shortTitle}
      </p>
    </div>
  )
}

function StaticHowCards() {
  return (
    <section className="bg-paper py-16 md:py-24">
      <div className="container-site">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-lagoon">
          How it works
        </p>
        <h2 className="mt-3 max-w-[16ch] font-display text-3xl font-semibold tracking-[-0.03em]">
          A short story from want to door.
        </h2>
        <ul className="mt-10 space-y-4">
          {BEATS.map((beat) => (
            <li key={beat.id}>
              <div
                className="rounded-[1.5rem] p-5 ring-1 ring-line"
                style={{ backgroundColor: beat.bg, color: beat.fg }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xs font-extrabold"
                    style={{ backgroundColor: beat.badge, color: beat.chipBg }}
                  >
                    {beat.n}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: beat.chipBg }}
                    >
                      {beat.tag}
                    </p>
                    <h3 className="mt-1.5 font-display text-2xl font-semibold leading-tight">
                      {beat.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: beat.muted }}>
                      <span className="font-semibold" style={{ color: beat.chipBg }}>
                        {beat.emotion}
                      </span>{' '}
                      {beat.body}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {beat.chips.slice(0, 3).map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                          style={{ backgroundColor: beat.chipBg }}
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link to="/how" className="mt-8 inline-flex text-sm font-bold text-lagoon hover:underline">
          Read the full flow →
        </Link>
      </div>
    </section>
  )
}

export function HowStoryCarousel() {
  const reduce = useReducedMotion()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const useMorph = Boolean(isDesktop && !reduce)
  const sectionRef = useRef<HTMLElement>(null)
  const progress = useStackProgress(sectionRef, useMorph)

  const n = BEATS.length
  const floatIndex = progress * (n - 1)
  const active = Math.round(clamp(floatIndex, 0, n - 1))

  const styles = useMemo(() => {
    if (!useMorph) return []
    const STRIP = 8.4
    const PAD = 1.4
    const t = floatIndex

    const leftStack = t * STRIP
    const openLeft = PAD + leftStack
    const upcomingRoom = (n - 1 - t) * STRIP
    const openWidth = Math.max(42, 100 - PAD * 2 - leftStack - upcomingRoom)

    return BEATS.map((_, i) => {
      const d = i - t
      const open = clamp(1 - Math.abs(d), 0, 1)
      const o = open * open * (3 - 2 * open)

      const pastLeft = PAD + i * STRIP
      const upLeft = openLeft + openWidth + (i - t) * STRIP

      let left: number
      let width: number

      if (i <= t) {
        left = lerp(pastLeft, openLeft, o)
        width = lerp(STRIP, openWidth, o)
      } else {
        left = lerp(upLeft, openLeft, o)
        width = lerp(STRIP, openWidth, o)
      }

      return {
        open: o,
        width: `${width}%`,
        left: `${left}%`,
        zIndex: Math.round(10 + i + o * 25),
        scale: lerp(0.985, 1, o),
        opacity: 1,
      }
    })
  }, [floatIndex, n, useMorph])

  if (!useMorph) {
    return <StaticHowCards />
  }

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: `${n * 100}vh` }}
      aria-label="How it works"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[#f4efe6]" aria-hidden />

        <div className="absolute inset-0 z-10 px-2 pb-[max(2.75rem,env(safe-area-inset-bottom))] pt-[calc(4.25rem+env(safe-area-inset-top))] sm:px-3 md:px-4">
          <div className="relative h-full w-full">
            {BEATS.map((beat, i) => {
              const s = styles[i]
              if (!s) return null
              const showExpanded = s.open > 0.42
              return (
                <div
                  key={beat.id}
                  className="absolute top-0 h-full overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem] md:rounded-[2rem]"
                  style={{
                    backgroundColor: beat.bg,
                    color: beat.fg,
                    width: s.width,
                    left: s.left,
                    zIndex: s.zIndex,
                    opacity: s.opacity,
                    transform: `scale(${s.scale})`,
                    transformOrigin: 'left center',
                    boxShadow:
                      s.open > 0.5
                        ? '0 28px 64px rgba(6,24,28,0.14)'
                        : '0 10px 28px rgba(6,24,28,0.08)',
                  }}
                  aria-current={active === i ? 'true' : undefined}
                >
                  {showExpanded ? (
                    <ExpandedFace beat={beat} reduce={Boolean(reduce)} />
                  ) : (
                    <CollapsedFace beat={beat} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-[calc(4.5rem+env(safe-area-inset-top))] sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-lagoon md:text-xs">
            How it works
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink/80">
            Scroll — each scene opens
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
          <Link
            to="/how"
            className="pointer-events-auto text-xs font-bold text-ink/70 underline-offset-2 hover:text-ink hover:underline"
          >
            Read the full flow →
          </Link>
          <div
            className="flex items-center gap-2 rounded-full bg-ink/70 px-3 py-2 backdrop-blur-md"
            role="tablist"
            aria-label="Story progress"
          >
            {BEATS.map((beat, i) => {
              const on = i === active
              return (
                <span
                  key={beat.id}
                  role="tab"
                  aria-selected={on}
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                    on ? 'w-6 bg-dusk' : 'w-1.5 bg-white/35'
                  }`}
                />
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
