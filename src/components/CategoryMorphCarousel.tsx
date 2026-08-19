import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { appPath } from '../paths'
import { SITE } from '../data/site'

/**
 * Chowdeck-style vertical stack (KampeDrop):
 * Scroll down — category cards open / fold.
 * Collapsed cards show icon + vertical labels.
 */

type CategoryCard = {
  id: string
  title: string
  shortTitle: string
  description: string
  tag: string
  href: string
  bg: string
  fg: string
  muted: string
  badge: string
  chipBg: string
  chips: string[]
  icon: 'food' | 'mart' | 'pharmacy' | 'market' | 'shopper'
  accents?: string[]
}

const CATEGORIES: CategoryCard[] = [
  {
    id: 'food',
    title: 'Food & Restaurants',
    shortTitle: 'Food',
    description:
      'Kitchen heat from Town to Ajara — jollof to pepper soup, tracked to your gate.',
    tag: 'Evening favourites',
    href: appPath(),
    bg: '#EDE4F5',
    fg: '#1A120C',
    muted: 'rgba(26,18,12,0.62)',
    badge: 'rgba(26,18,12,0.08)',
    chipBg: '#B85A1C',
    chips: ['Jollof', 'Swallow', 'Pepper soup', 'Grill'],
    icon: 'food',
    accents: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=240&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=240&q=80',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=240&q=80',
    ],
  },
  {
    id: 'groceries',
    title: 'Groceries',
    shortTitle: 'Shops',
    description:
      'Rice, oil, eggs — the things Badagry homes actually run out of.',
    tag: 'Home staples',
    href: appPath(),
    bg: '#F5EFC8',
    fg: '#0A2A26',
    muted: 'rgba(10,42,38,0.62)',
    badge: 'rgba(10,42,38,0.08)',
    chipBg: '#0C6560',
    chips: ['Rice', 'Oil', 'Eggs', 'Detergent'],
    icon: 'mart',
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy',
    shortTitle: 'Pharmacies',
    description: 'Sealed packs, careful handoff — calm when you need it most.',
    tag: 'Handled with care',
    href: appPath(),
    bg: '#D9ECF7',
    fg: '#0B1C22',
    muted: 'rgba(11,28,34,0.62)',
    badge: 'rgba(11,28,34,0.08)',
    chipBg: '#0F2E34',
    chips: ['OTC', 'Sealed', 'Urgent'],
    icon: 'pharmacy',
  },
  {
    id: 'markets',
    title: 'Local Markets',
    shortTitle: 'Markets',
    description: 'Lagoon-side produce and market runs, without the guesswork.',
    tag: 'Coming into focus',
    href: appPath(),
    bg: '#D8F0E4',
    fg: '#2A2108',
    muted: 'rgba(42,33,8,0.62)',
    badge: 'rgba(42,33,8,0.08)',
    chipBg: '#A8842E',
    chips: ['Fresh', 'Local', 'Same-day'],
    icon: 'market',
  },
  {
    id: 'shopper',
    title: 'Personal Shopper',
    shortTitle: 'Shopper',
    description:
      'A vetted shopper buys on your behalf — photo proof, payment held.',
    tag: `Only on ${SITE.name}`,
    href: '/how',
    bg: '#E8E4DE',
    fg: '#06181C',
    muted: 'rgba(6,24,28,0.62)',
    badge: 'rgba(239,194,122,0.28)',
    chipBg: '#06181C',
    chips: ['Vetted', 'Photo proof', 'Escrow'],
    icon: 'shopper',
  },
]

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function CategoryIcon({
  kind,
  color,
}: {
  kind: CategoryCard['icon']
  color: string
}) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
  switch (kind) {
    case 'food':
      return (
        <svg {...common}>
          <path d="M4 7h16v2H4z" />
          <path d="M6 9v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
          <path d="M9 5h6" />
        </svg>
      )
    case 'mart':
      return (
        <svg {...common}>
          <path d="M4 7h16l-1.2 11.2A2 2 0 0 1 16.8 20H7.2a2 2 0 0 1-2-1.8L4 7Z" />
          <path d="M8 7V5a4 4 0 0 1 8 0v2" />
        </svg>
      )
    case 'pharmacy':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      )
    case 'market':
      return (
        <svg {...common}>
          <path d="M3 10h18l-1 9H4l-1-9Z" />
          <path d="M5 10V7l2-3h10l2 3v3" />
        </svg>
      )
    case 'shopper':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19.5c1.4-3.2 3.6-4.8 6.5-4.8s5.1 1.6 6.5 4.8" />
        </svg>
      )
  }
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

function StaticCategoryCards() {
  return (
    <section className="bg-paper py-16 md:py-24">
      <div className="container-site">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-lagoon">
          What you can order
        </p>
        <h2 className="mt-3 max-w-[16ch] font-display text-3xl font-semibold tracking-[-0.03em]">
          Everything Badagry needs tonight.
        </h2>
        <ul className="mt-10 space-y-4">
          {CATEGORIES.map((cat) => (
            <li key={cat.id}>
              <Link
                to={cat.href}
                className="block rounded-[1.5rem] p-5 ring-1 ring-line"
                style={{ backgroundColor: cat.bg, color: cat.fg }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                    style={{ backgroundColor: cat.badge }}
                  >
                    <CategoryIcon kind={cat.icon} color={cat.chipBg} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: cat.chipBg }}
                    >
                      {cat.tag}
                    </p>
                    <h3 className="mt-1.5 font-display text-2xl font-semibold leading-tight">
                      {cat.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: cat.muted }}>
                      {cat.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cat.chips.slice(0, 3).map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                          style={{ backgroundColor: cat.chipBg }}
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function ExpandedFace({ cat }: { cat: CategoryCard }) {
  return (
    <div className="relative flex h-full flex-col justify-between p-6 sm:p-8 md:p-10 lg:p-12">
      <div>
        <div
          className="grid h-12 w-12 place-items-center rounded-2xl ring-1 ring-ink/10 md:h-14 md:w-14"
          style={{ backgroundColor: cat.badge }}
        >
          <CategoryIcon kind={cat.icon} color={cat.chipBg} />
        </div>
        <h3 className="mt-6 max-w-[11ch] font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[2.85rem] md:mt-8 md:text-[3.5rem] lg:text-[4rem]">
          {cat.title}
        </h3>
        <p
          className="mt-4 max-w-lg text-base leading-relaxed md:mt-5 md:text-lg"
          style={{ color: cat.muted }}
        >
          {cat.description}
        </p>
      </div>

      <div className="relative mt-10 md:mt-12">
        {cat.accents && cat.accents.length > 0 && (
          <div className="pointer-events-none absolute -top-20 right-0 flex sm:-top-24 md:-top-28">
            {cat.accents.map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className="h-20 w-20 rounded-full object-cover ring-[3px] ring-white/90 sm:h-24 sm:w-24 md:h-28 md:w-28"
                style={{
                  marginLeft: i === 0 ? 0 : -22,
                  transform: `rotate(${(i - 1) * 8}deg)`,
                  zIndex: cat.accents!.length - i,
                }}
              />
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pr-28 sm:gap-2.5 sm:pr-36 md:pr-40">
          {cat.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full px-3.5 py-2 text-xs font-bold text-white md:px-4 md:text-[13px]"
              style={{ backgroundColor: cat.chipBg }}
            >
              {chip}
            </span>
          ))}
        </div>
        <p
          className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] md:text-xs"
          style={{ color: cat.chipBg }}
        >
          {cat.tag}
        </p>
      </div>
    </div>
  )
}

function CollapsedFace({ cat }: { cat: CategoryCard }) {
  return (
    <div className="flex h-full flex-col items-center justify-between border border-ink/80 px-1.5 py-6 sm:py-8">
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
        style={{ backgroundColor: cat.badge }}
      >
        <CategoryIcon kind={cat.icon} color={cat.chipBg} />
      </div>
      <p
        className="max-h-[75%] font-display text-xl font-semibold tracking-[-0.02em] md:text-2xl"
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          color: cat.fg,
        }}
      >
        {cat.shortTitle}
      </p>
    </div>
  )
}

export function CategoryMorphCarousel() {
  const reduce = useReducedMotion()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const useMorph = Boolean(isDesktop && !reduce)
  const sectionRef = useRef<HTMLElement>(null)
  const progress = useStackProgress(sectionRef, useMorph)

  const n = CATEGORIES.length
  const floatIndex = progress * (n - 1)
  const active = Math.round(clamp(floatIndex, 0, n - 1))

  const styles = useMemo(() => {
    if (!useMorph) return []
    const STRIP = 8.4
    const PAD = 1.4
    const t = floatIndex

    // Continuous left-stack width (past cards parked as folded strips)
    const leftStack = t * STRIP
    const openLeft = PAD + leftStack
    const upcomingRoom = ((n - 1) - t) * STRIP
    const openWidth = Math.max(42, 100 - PAD * 2 - leftStack - upcomingRoom)

    return CATEGORIES.map((_, i) => {
      const d = i - t
      const open = clamp(1 - Math.abs(d), 0, 1)
      const o = open * open * (3 - 2 * open)

      // Folded home on the LEFT for every card index (past stack)
      const pastLeft = PAD + i * STRIP
      // Folded home on the RIGHT for upcoming peeks
      const upLeft = openLeft + openWidth + (i - t) * STRIP

      let left: number
      let width: number

      if (i <= t) {
        // Active or already scrolled past — morph into / stay in left folded stack
        // Never exit the stage; past cards remain as inscribed strips.
        left = lerp(pastLeft, openLeft, o)
        width = lerp(STRIP, openWidth, o)
      } else {
        // Still ahead — peek on the right, then open as scroll reaches them
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

  // Mobile / reduced motion: plain stacked cards, no fold or sticky scroll.
  if (!useMorph) {
    return <StaticCategoryCards />
  }

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: `${n * 100}vh` }}
      aria-label="What you can order"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[#f4efe6]" aria-hidden />

        <div className="absolute inset-0 z-10 px-2 pb-[max(2.75rem,env(safe-area-inset-bottom))] pt-[calc(4.25rem+env(safe-area-inset-top))] sm:px-3 md:px-4">
          <div className="relative h-full w-full">
            {CATEGORIES.map((cat, i) => {
              const s = styles[i]
              if (!s) return null
              const showExpanded = s.open > 0.42
              return (
                <Link
                  key={cat.id}
                  to={cat.href}
                  className="absolute top-0 block h-full overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem] md:rounded-[2rem]"
                  style={{
                    backgroundColor: cat.bg,
                    color: cat.fg,
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
                    <ExpandedFace cat={cat} />
                  ) : (
                    <CollapsedFace cat={cat} />
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-[calc(4.5rem+env(safe-area-inset-top))] sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-lagoon md:text-xs">
            What you can order
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink/80">
            Scroll — each card opens
          </p>
        </div>

        <div
          className="absolute inset-x-0 bottom-0 z-20 flex justify-center pb-[max(0.85rem,env(safe-area-inset-bottom))]"
          role="tablist"
          aria-label="Category progress"
        >
          <div className="flex items-center gap-2 rounded-full bg-ink/70 px-3 py-2 backdrop-blur-md">
            {CATEGORIES.map((cat, i) => {
              const on = i === active
              return (
                <span
                  key={cat.id}
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
