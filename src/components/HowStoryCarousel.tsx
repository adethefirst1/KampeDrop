import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from 'motion/react'
import { Reveal } from './motion'
import { easeOut, slowFloatTransition } from '../motion/tokens'

/**
 * Homepage “How it works” — a lived-in story stage.
 * Same grocery-card color family as categories; different verb (swipe / breathe).
 * Feeling first: full wash, honest progress, room for the beat to sit.
 */

type StepId = 'order' | 'confirm' | 'track' | 'secure'

type StoryBeat = {
  id: StepId
  n: string
  title: string
  emotion: string
  body: string
  whisper: string
  wash: string
  fg: string
  muted: string
  accent: string
  glow: string
}

const BEATS: StoryBeat[] = [
  {
    id: 'order',
    n: '01',
    title: 'You ask.',
    emotion: 'Hungry evening. Empty shelf. That quiet worry.',
    body: 'From your Badagry home, tap a kitchen, mart, or pharmacy — not a stranger in a chat.',
    whisper: 'The wanting',
    wash: '#EDE4F5',
    fg: '#1A120C',
    muted: 'rgba(26,18,12,0.62)',
    accent: '#B85A1C',
    glow: 'rgba(184,90,28,0.22)',
  },
  {
    id: 'confirm',
    n: '02',
    title: 'We answer.',
    emotion: 'No silence. No “we go check”.',
    body: 'Confirmation lands now. Your passkey waits. Pay ahead and escrow holds it safe.',
    whisper: 'The relief',
    wash: '#D9ECF7',
    fg: '#0B1C22',
    muted: 'rgba(11,28,34,0.62)',
    accent: '#0F2E34',
    glow: 'rgba(15,46,52,0.18)',
  },
  {
    id: 'track',
    n: '03',
    title: 'You watch.',
    emotion: 'Kitchen heat → Expressway wind → your gate.',
    body: 'Live stages, not guesswork. Preparing. On the way. Almost home.',
    whisper: 'The journey',
    wash: '#F5EFC8',
    fg: '#0A2A26',
    muted: 'rgba(10,42,38,0.62)',
    accent: '#0C6560',
    glow: 'rgba(12,101,96,0.2)',
  },
  {
    id: 'secure',
    n: '04',
    title: 'We stand.',
    emotion: 'Handed over — or made right.',
    body: 'Wrong, late, missing: we don’t vanish. That’s the KampeDrop Guarantee.',
    whisper: 'The promise',
    wash: '#E6F0E8',
    fg: '#122018',
    muted: 'rgba(18,32,24,0.62)',
    accent: '#2A5C38',
    glow: 'rgba(42,92,56,0.22)',
  },
]

const AUTO_MS = 5800

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
      viewBox="0 0 320 220"
      className={className}
      fill="none"
      aria-hidden
      animate={
        reduce ? undefined : { y: [0, -5, 0], transition: slowFloatTransition }
      }
    >
      <ellipse cx="160" cy="198" rx="118" ry="14" fill={accent} opacity="0.14" />
      <circle cx="250" cy="42" r="56" fill={accent} opacity="0.1" />
      <circle cx="48" cy="160" r="36" fill={accent} opacity="0.08" />

      {id === 'order' && (
        <>
          <circle cx="118" cy="58" r="24" stroke={accent} strokeWidth="2.5" />
          <path
            d="M90 92c4-18 15-28 28-28s24 10 28 28v52H90V92Z"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M108 146v36M134 146v36"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <motion.g
            style={{ transformOrigin: '188px 120px' }}
            animate={
              reduce
                ? undefined
                : {
                    rotate: [0, -6, 0, 5, 0],
                    transition: { duration: 2.8, repeat: Infinity },
                  }
            }
          >
            <rect
              x="164"
              y="94"
              width="48"
              height="74"
              rx="10"
              stroke={accent}
              strokeWidth="2.5"
              fill={accent}
              fillOpacity="0.14"
            />
            <rect
              x="174"
              y="108"
              width="28"
              height="38"
              rx="4"
              fill={accent}
              fillOpacity="0.28"
            />
            <circle cx="188" cy="156" r="3.5" fill={accent} />
          </motion.g>
          {!reduce && (
            <motion.g
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <path
                d="M224 78l7-14M236 90l16-5M232 106l14 12"
                stroke={accent}
                strokeWidth="2.25"
                strokeLinecap="round"
              />
            </motion.g>
          )}
          <path
            d="M64 72c0-7 5-12 10-12 3 0 6 2 7 5 1-3 4-5 7-5 5 0 10 5 10 12 0 9-17 20-17 20S64 81 64 72Z"
            fill={accent}
            opacity="0.4"
          />
        </>
      )}

      {id === 'confirm' && (
        <>
          <circle cx="100" cy="62" r="22" stroke={accent} strokeWidth="2.5" />
          <path
            d="M76 92c3-16 13-24 24-24s21 8 24 24v46H76V92Z"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M90 140v32M112 140v32"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <motion.g
            style={{ transformOrigin: '214px 112px' }}
            animate={
              reduce
                ? undefined
                : {
                    scale: [0.9, 1.05, 1],
                    transition: {
                      duration: 1.8,
                      repeat: Infinity,
                      repeatDelay: 0.9,
                    },
                  }
            }
          >
            <rect
              x="170"
              y="70"
              width="88"
              height="88"
              rx="20"
              stroke={accent}
              strokeWidth="2.75"
              fill={accent}
              fillOpacity="0.14"
            />
            <path
              d="M192 116l16 16 34-36"
              stroke={accent}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.g>
        </>
      )}

      {id === 'track' && (
        <>
          <motion.g
            animate={
              reduce
                ? undefined
                : {
                    x: [0, 12, 0],
                    transition: { duration: 2.2, repeat: Infinity },
                  }
            }
          >
            <circle cx="96" cy="152" r="18" stroke={accent} strokeWidth="2.5" />
            <circle cx="214" cy="152" r="18" stroke={accent} strokeWidth="2.5" />
            <circle cx="96" cy="152" r="5" fill={accent} opacity="0.35" />
            <circle cx="214" cy="152" r="5" fill={accent} opacity="0.35" />
            <path
              d="M96 152h46l26-38h36l14 38"
              stroke={accent}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M168 114h-24l-8 18"
              stroke={accent}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="158" cy="74" r="17" stroke={accent} strokeWidth="2.5" />
            <path
              d="M138 98c3-12 11-18 20-18s17 6 20 18v30H138V98Z"
              stroke={accent}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <rect
              x="188"
              y="100"
              width="30"
              height="24"
              rx="5"
              stroke={accent}
              strokeWidth="2.25"
              fill={accent}
              fillOpacity="0.16"
            />
          </motion.g>
          {!reduce && (
            <motion.path
              d="M28 176h28M68 176h28M108 176h28M148 176h28M188 176h28M228 176h28M268 176h28"
              stroke={accent}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.3"
              animate={{ x: [0, -40] }}
              transition={{ duration: 1.15, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </>
      )}

      {id === 'secure' && (
        <>
          <circle cx="108" cy="62" r="22" stroke={accent} strokeWidth="2.5" />
          <path
            d="M84 92c3-16 13-24 24-24s21 8 24 24v44H84V92Z"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M98 138v34M118 138v34"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <motion.g
            animate={
              reduce
                ? undefined
                : {
                    y: [0, -6, 0],
                    transition: {
                      duration: 2.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                  }
            }
          >
            <path
              d="M214 48c28 9 44 24 44 52 0 34-28 56-44 66-16-10-44-32-44-66 0-28 16-43 44-52Z"
              stroke={accent}
              strokeWidth="2.75"
              fill={accent}
              fillOpacity="0.14"
              strokeLinejoin="round"
            />
            <path
              d="M194 104l16 16 28-30"
              stroke={accent}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.g>
          <path
            d="M136 118c12 10 26 10 40 0"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.45"
          />
        </>
      )}
    </motion.svg>
  )
}

const beatContent = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
  exit: {
    transition: { staggerChildren: 0.04, staggerDirection: -1 },
  },
}

const beatLine = {
  hidden: (dir: number) =>
    ({
      opacity: 0,
      x: dir > 0 ? 36 : -36,
      y: 12,
      filter: 'blur(8px)',
    }) as const,
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: easeOut },
  },
  exit: (dir: number) =>
    ({
      opacity: 0,
      x: dir > 0 ? -28 : 28,
      filter: 'blur(6px)',
      transition: { duration: 0.28, ease: easeOut },
    }) as const,
}

const beatArt = {
  hidden: (dir: number) =>
    ({
      opacity: 0,
      x: dir > 0 ? 64 : -64,
      scale: 0.92,
      filter: 'blur(12px)',
    }) as const,
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: easeOut, delay: 0.08 },
  },
  exit: (dir: number) =>
    ({
      opacity: 0,
      x: dir > 0 ? -48 : 48,
      scale: 0.96,
      filter: 'blur(8px)',
      transition: { duration: 0.3, ease: easeOut },
    }) as const,
}

export function HowStoryCarousel() {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [holding, setHolding] = useState(false)

  const beat = BEATS[index]!
  const prevBeat = BEATS[(index - 1 + BEATS.length) % BEATS.length]!
  const nextBeat = BEATS[(index + 1) % BEATS.length]!
  const paused = holding

  function go(to: number, dir: number) {
    setDirection(dir)
    setIndex((to + BEATS.length) % BEATS.length)
  }

  function next() {
    go(index + 1, 1)
  }

  function prev() {
    go(index - 1, -1)
  }

  useEffect(() => {
    if (reduce || paused) return
    const id = window.setInterval(() => {
      setDirection(1)
      setIndex((i) => (i + 1) % BEATS.length)
    }, AUTO_MS)
    return () => window.clearInterval(id)
  }, [reduce, paused, index])

  function onDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info
    if (offset.x < -64 || velocity.x < -420) next()
    else if (offset.x > 64 || velocity.x > 420) prev()
  }

  return (
    <section
      className="relative overflow-hidden py-16 md:py-24"
      aria-label="How it works"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[#f4efe6]"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-1/3 h-[55%] blur-3xl"
        animate={{ backgroundColor: beat.glow }}
        transition={{ duration: 0.9, ease: easeOut }}
        aria-hidden
      />

      <div className="container-site relative">
        <Reveal className="max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lagoon">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-ink md:text-[2.65rem] md:leading-[1.08]">
            A short story from want to door.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Four beats. One promise. Let it breathe — or swipe when you’re ready.
          </p>
        </Reveal>
      </div>

      {/* Edge-to-edge stage — same posture as category doors */}
      <div
        className="relative mt-9 px-2 sm:mt-11 sm:px-3 md:px-4"
        onPointerDown={() => setHolding(true)}
        onPointerUp={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
      >
        <div className="relative">
          {/* Neighbour peeks — the story spans the road */}
          <div
            className="pointer-events-none absolute inset-y-3 left-0 hidden w-[4.5%] overflow-hidden rounded-l-[1.25rem] md:block"
            style={{ backgroundColor: prevBeat.wash }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-3 right-0 hidden w-[4.5%] overflow-hidden rounded-r-[1.25rem] md:block"
            style={{ backgroundColor: nextBeat.wash }}
            aria-hidden
          />

          <motion.div
            className="relative z-10 overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem] md:mx-[3.5%] md:rounded-[2rem]"
            animate={{ backgroundColor: beat.wash }}
            transition={{ duration: 0.7, ease: easeOut }}
            style={{
              color: beat.fg,
              boxShadow: '0 28px 64px rgba(6,24,28,0.14)',
            }}
          >
            <div className="relative z-20 px-5 pt-5 sm:px-8 sm:pt-6 md:px-10 md:pt-7 lg:px-14">
              <div
                className="flex gap-2.5 md:gap-3"
                role="tablist"
                aria-label="Story beats"
              >
                {BEATS.map((b, i) => {
                  const done = i < index
                  const active = i === index
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-label={`${b.n} ${b.whisper}`}
                      onClick={() => go(i, i > index ? 1 : -1)}
                      className="group flex flex-1 flex-col gap-2"
                    >
                      <span
                        className="relative h-[3px] w-full overflow-hidden rounded-full"
                        style={{
                          backgroundColor: done
                            ? beat.accent
                            : 'rgba(6,24,28,0.14)',
                        }}
                      >
                        {active ? (
                          <span
                            key={`fill-${index}`}
                            className="how-story-fill absolute inset-0 origin-left rounded-full"
                            style={{
                              backgroundColor: beat.accent,
                              transformOrigin: 'left center',
                              ...(reduce
                                ? { transform: 'scaleX(1)' }
                                : {
                                    animation: `howStoryFill ${AUTO_MS}ms linear forwards`,
                                    animationPlayState: paused
                                      ? 'paused'
                                      : 'running',
                                  }),
                            }}
                          />
                        ) : null}
                      </span>
                      <span
                        className={`hidden text-left text-[10px] font-bold uppercase tracking-[0.14em] md:block ${
                          active
                            ? 'opacity-90'
                            : 'opacity-35 group-hover:opacity-60'
                        }`}
                        style={{ color: active ? beat.accent : beat.fg }}
                      >
                        {b.whisper}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.article
                key={beat.id}
                custom={direction}
                variants={reduce ? undefined : beatContent}
                initial={reduce ? { opacity: 0 } : 'hidden'}
                animate={reduce ? { opacity: 1 } : 'show'}
                exit={reduce ? { opacity: 0 } : 'exit'}
                drag={reduce ? false : 'x'}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={onDragEnd}
                className="relative cursor-grab touch-pan-y select-none active:cursor-grabbing"
                aria-roledescription="slide"
                aria-label={`${beat.title}. ${beat.emotion}`}
              >
                <div
                  className="pointer-events-none absolute -right-8 top-0 h-[70%] w-[45%] rounded-full opacity-90 blur-3xl"
                  style={{ backgroundColor: beat.glow }}
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-[40%] opacity-70 blur-3xl"
                  style={{ backgroundColor: beat.glow }}
                  aria-hidden
                />

                <div className="relative grid min-h-[28rem] items-center gap-8 px-5 pb-8 pt-6 sm:min-h-[30rem] sm:px-8 sm:pb-10 md:min-h-[32rem] md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:px-10 md:pb-12 md:pt-8 lg:min-h-[34rem] lg:gap-14 lg:px-14">
                  <motion.div
                    custom={direction}
                    variants={reduce ? undefined : beatLine}
                    className="relative z-10"
                  >
                    <p
                      className="text-[11px] font-bold uppercase tracking-[0.18em] md:hidden"
                      style={{ color: beat.accent }}
                    >
                      {beat.n} · {beat.whisper}
                    </p>
                    <h3 className="mt-3 max-w-[10ch] font-display text-[2.85rem] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[3.4rem] md:mt-0 md:text-[3.9rem] lg:text-[4.35rem]">
                      {beat.title}
                    </h3>
                    <p
                      className="mt-5 max-w-[22ch] text-lg font-semibold leading-snug md:text-[1.4rem]"
                      style={{ color: beat.accent }}
                    >
                      {beat.emotion}
                    </p>
                    <p
                      className="mt-3 max-w-md text-[15px] leading-relaxed md:text-base"
                      style={{ color: beat.muted }}
                    >
                      {beat.body}
                    </p>
                  </motion.div>

                  <motion.div
                    custom={direction}
                    variants={reduce ? undefined : beatArt}
                    className="relative flex items-center justify-center md:justify-end"
                  >
                    <SceneArt
                      id={beat.id}
                      accent={beat.accent}
                      reduce={Boolean(reduce)}
                      className="h-auto w-full max-w-[20rem] sm:max-w-[23rem] md:max-w-[26rem] lg:max-w-[28rem]"
                    />
                  </motion.div>
                </div>
              </motion.article>
            </AnimatePresence>

            <div className="absolute bottom-5 right-5 z-20 flex gap-2 sm:bottom-7 sm:right-7 md:bottom-8 md:right-8">
              <button
                type="button"
                onClick={prev}
                className="grid h-11 w-11 place-items-center rounded-full bg-ink/8 text-ink/70 backdrop-blur-sm transition hover:bg-ink/14 hover:text-ink"
                aria-label="Previous beat"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M10 3L5 8l5 5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={next}
                className="grid h-11 w-11 place-items-center rounded-full bg-ink text-dusk transition hover:bg-ink-soft"
                aria-label="Next beat"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </motion.div>
        </div>

        <div className="container-site">
          <Reveal className="mt-8 text-center">
            <Link
              to="/how"
              className="inline-flex text-sm font-bold text-lagoon hover:underline"
            >
              Read the full flow →
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
