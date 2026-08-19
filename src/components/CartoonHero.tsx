import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { AppEntryButton, InstallPrompt } from './InstallPrompt'
import { SITE, IMAGES } from '../data/site'
import { hoverLift, springPop, springWobble, tapPress } from '../motion/tokens'

const MotionLink = motion.create(Link)

const STICKERS: Array<{
  label: string
  bg: string
  rot: number
  x: string
  y: string
  ink?: boolean
}> = [
  { label: 'Food 🔥', bg: '#FF8A4C', rot: -8, x: '6%', y: '16%' },
  { label: 'Pharmacy 💊', bg: '#5EC4C0', rot: 6, x: '70%', y: '20%' },
  { label: 'Track live 📍', bg: '#EFC27A', rot: -4, x: '74%', y: '56%', ink: true },
  { label: 'Kampe ✓', bg: '#FFFFFF', rot: 10, x: '10%', y: '58%', ink: true },
  { label: 'Badagry only', bg: '#2A5C38', rot: -12, x: '55%', y: '76%' },
]

/** Gen Z / inDrive-adjacent hero — comic type energy, cartoon motion, KampeDrop colors. */
export function CartoonHero() {
  const reduce = useReducedMotion()
  const letters = SITE.name.split('')

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-ink text-white">
      <div className="absolute inset-0">
        <img src={IMAGES.hero} alt="" className="h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(217,119,47,0.45),transparent_50%),radial-gradient(ellipse_at_80%_10%,rgba(239,194,122,0.35),transparent_45%),radial-gradient(ellipse_at_70%_80%,rgba(12,101,96,0.5),transparent_55%),linear-gradient(180deg,#06181c_0%,#0a2e2a_55%,#06181c_100%)]" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1.2px, transparent 1.3px)',
          backgroundSize: '18px 18px',
        }}
        aria-hidden
      />

      {!reduce && (
        <>
          <motion.div
            className="pointer-events-none absolute -left-16 top-24 h-48 w-48 rounded-[40%] border-4 border-ink bg-mango"
            animate={{ y: [0, 18, 0], rotate: [0, 8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute -right-10 top-40 h-40 w-40 rounded-full border-4 border-ink bg-dusk"
            animate={{ y: [0, -16, 0], scale: [1, 1.06, 1] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
          <motion.div
            className="pointer-events-none absolute bottom-24 left-[18%] h-28 w-28 rounded-[30%] border-4 border-ink bg-lagoon"
            animate={{ x: [0, 14, 0], rotate: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
          <motion.svg
            className="pointer-events-none absolute right-[16%] top-[26%] h-16 w-28 text-dusk"
            viewBox="0 0 120 40"
            fill="none"
            animate={{ x: [0, 8, 0], rotate: [0, 4, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            <path
              d="M4 20c12-16 24 16 36 0s24 16 36 0 24 16 36 0"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </motion.svg>
        </>
      )}

      {!reduce &&
        STICKERS.map((s, i) => (
          <motion.span
            key={s.label}
            className={`pointer-events-none absolute z-[5] hidden rounded-full border-[3px] border-ink px-3 py-1.5 text-xs font-extrabold shadow-[4px_4px_0_#020a0c] sm:inline-flex md:text-sm ${
              s.ink ? 'text-ink' : 'text-white'
            }`}
            style={{
              left: s.x,
              top: s.y,
              backgroundColor: s.bg,
              rotate: `${s.rot}deg`,
            }}
            initial={{ opacity: 0, scale: 0.4, y: 24 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, i % 2 === 0 ? -10 : 10, 0],
            }}
            transition={{
              opacity: { ...springPop, delay: 0.35 + i * 0.08 },
              scale: { ...springWobble, delay: 0.35 + i * 0.08 },
              y: {
                duration: 3.2 + i * 0.35,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.8 + i * 0.1,
              },
            }}
          >
            {s.label}
          </motion.span>
        ))}

      <div className="container-site relative z-10 flex min-h-[100svh] flex-col justify-end pb-[max(4rem,env(safe-area-inset-bottom))] pt-[calc(6.75rem+env(safe-area-inset-top))] sm:pt-[calc(7rem+env(safe-area-inset-top))] md:justify-center md:pb-24 md:pt-24">
        <motion.p
          className="inline-flex w-fit items-center gap-2 rounded-full border-[3px] border-ink bg-dusk px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-ink shadow-[3px_3px_0_#020a0c]"
          initial={reduce ? false : { opacity: 0, y: -16, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: -3 }}
          transition={springPop}
        >
          Badagry · by the lagoon 🌊
        </motion.p>

        <h1
          className="mt-5 flex flex-wrap font-display text-[clamp(2.75rem,14vw,3.4rem)] font-bold leading-[0.95] tracking-[-0.03em] sm:text-[4.6rem] md:text-[5.6rem]"
          aria-label={SITE.name}
        >
          {letters.map((ch, i) => (
            <motion.span
              key={`${ch}-${i}`}
              className="inline-block"
              initial={
                reduce
                  ? false
                  : {
                      opacity: 0,
                      y: 48,
                      rotate: i % 2 === 0 ? -12 : 12,
                      scale: 0.6,
                    }
              }
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              transition={{ ...springWobble, delay: 0.08 + i * 0.045 }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </motion.span>
          ))}
        </h1>

        {/* Mobile sticker row — comic chips without cluttering small screens */}
        <motion.div
          className="mt-4 flex flex-wrap gap-2 sm:hidden"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springPop, delay: 0.45 }}
        >
          {STICKERS.slice(0, 3).map((s) => (
            <span
              key={s.label}
              className={`rounded-full border-2 border-ink px-2.5 py-1 text-[11px] font-extrabold shadow-[2px_2px_0_#020a0c] ${
                s.ink ? 'text-ink' : 'text-white'
              }`}
              style={{ backgroundColor: s.bg, transform: `rotate(${s.rot / 2}deg)` }}
            >
              {s.label}
            </span>
          ))}
        </motion.div>

        <motion.p
          className="mt-5 max-w-[16ch] font-display text-[1.55rem] font-semibold leading-[1.15] text-dusk sm:text-[1.9rem]"
          initial={reduce ? false : { opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springPop, delay: 0.55 }}
        >
          Order like it&apos;s already kampe.
        </motion.p>

        <motion.p
          className="mt-3 max-w-md text-base font-semibold leading-relaxed text-white/75"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.45 }}
        >
          {SITE.nameMeaning}. Track it. Hold the pay. Get it made right — built for homes the
          big apps ghosted.
        </motion.p>

        <motion.div
          className="mt-8 flex w-full max-w-lg flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center"
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springPop, delay: 0.8 }}
        >
          <AppEntryButton className="btn-primary w-full sm:w-auto">
            Order in Badagry →
          </AppEntryButton>
          <InstallPrompt compact />
          <MotionLink
            to="/how"
            className="btn-secondary w-full sm:w-auto"
            whileHover={hoverLift}
            whileTap={tapPress}
          >
            How it works
          </MotionLink>
        </motion.div>
      </div>
    </section>
  )
}
