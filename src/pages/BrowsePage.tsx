import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { appPath } from '../paths'
import { motion, useReducedMotion } from 'motion/react'
import { AppShell } from '../components/layout'
import { MotionItem, Stagger } from '../components/motion'
import { CategoryIcon } from '../components/CategoryIcon'
import { ShopBackdrop, shopGreeting } from '../components/ShopBackdrop'
import { categoryOrder, categoryThemes, shuffleCopy } from '../data/categories'
import {
  SERVICE_AREA,
  formatNaira,
  type MenuItem,
  type Vendor,
} from '../data/vendors'
import { useCatalog } from '../context/CatalogContext'
import {
  fadeUp,
  slowFloatTransition,
  springPop,
  springSoft,
  tapPress,
} from '../motion/tokens'

const MotionLink = motion.create(Link)

export type FeedItem = {
  key: string
  vendor: Vendor
  item: MenuItem
}

function buildFeed(vendors: Vendor[]): FeedItem[] {
  const rows: FeedItem[] = []
  for (const vendor of vendors) {
    for (const item of vendor.items) {
      if (item.available === false) continue
      rows.push({ key: `${vendor.id}:${item.id}`, vendor, item })
    }
  }
  return shuffleCopy(rows)
}

/** Shop home — atmosphere, portal categories, merchandised feed. */
export function BrowsePage() {
  const { activeVendors } = useCatalog()
  const reduce = useReducedMotion()
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [greeting] = useState(() => shopGreeting())

  useEffect(() => {
    setFeed(buildFeed(activeVendors).slice(0, 24))
  }, [activeVendors])

  return (
    <AppShell wash="shop">
      <div className="relative -mx-4 overflow-hidden px-4 pb-2 pt-1 md:mx-0 md:px-0">
        <ShopBackdrop />

        <motion.div
          className="relative overflow-hidden rounded-[1.85rem] border-[3px] border-ink/90 bg-gradient-to-br from-[#fff8f1] via-[#fff4eb] to-[#e8f3f0] px-5 pb-6 pt-5 shadow-[4px_4px_0_rgba(6,24,28,0.12)]"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSoft}
        >
          {!reduce && (
            <>
              <motion.svg
                className="pointer-events-none absolute -right-1 top-4 h-[4.5rem] w-[4.5rem] text-mango/30"
                viewBox="0 0 64 64"
                fill="none"
                animate={{ y: [0, -7, 0], rotate: [0, 4, 0] }}
                transition={slowFloatTransition}
                aria-hidden
              >
                <ellipse cx="32" cy="42" rx="18" ry="7" fill="currentColor" />
                <path
                  d="M16 40c2-11 9-20 16-20s14 9 16 20"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M28 16c0-3 2-6 4-6s4 3 4 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </motion.svg>
              <motion.svg
                className="pointer-events-none absolute -left-2 bottom-3 h-12 w-12 text-lagoon/25"
                viewBox="0 0 48 48"
                fill="currentColor"
                animate={{ y: [0, 5, 0], rotate: [0, -6, 0] }}
                transition={{ ...slowFloatTransition, duration: 6.2 }}
                aria-hidden
              >
                <path d="M10 34c4-10 12-16 20-10 6 4 8 12 4 16-6 6-18 4-24-6Z" />
              </motion.svg>
            </>
          )}

          <p className="relative text-[11px] font-extrabold uppercase tracking-[0.16em] text-lagoon">
            {greeting} · {SERVICE_AREA}
          </p>
          <h1 className="relative mt-2 max-w-[12ch] font-display text-[2.05rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink">
            What do you need?
          </h1>
          <p className="relative mt-2 max-w-[18rem] text-sm leading-relaxed text-muted">
            Shop with beauty — pick a vibe, or scroll finds nearby.
          </p>
        </motion.div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categoryOrder.map((id, i) => {
            const theme = categoryThemes[id]
            return (
              <MotionLink
                key={id}
                to={appPath(`/category/${id}`)}
                className="relative overflow-hidden rounded-[1.35rem] border-[2.5px] border-ink/85 px-3 pb-3.5 pt-3 shadow-[3px_3px_0_rgba(6,24,28,0.1)]"
                style={{ background: theme.wash, color: theme.ink }}
                initial={reduce ? false : { opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...springPop, delay: 0.04 * i }}
                whileHover={reduce ? undefined : { y: -4, rotate: -1 }}
                whileTap={tapPress}
              >
                <span
                  className="relative z-[1] grid h-12 w-12 place-items-center rounded-2xl border-2 border-ink/10"
                  style={{ background: theme.accentSoft, color: theme.accent }}
                >
                  <CategoryIcon category={id} className="h-6 w-6" />
                </span>
                <p className="relative z-[1] mt-2.5 text-sm font-extrabold tracking-[-0.02em]">
                  {theme.label}
                </p>
                <p className="relative z-[1] mt-0.5 text-[10px] font-semibold leading-snug opacity-65">
                  {theme.hint}
                </p>
              </MotionLink>
            )
          })}
        </div>
      </div>

      <div className="mt-8 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.35rem] font-semibold tracking-[-0.02em]">
            Picked for you
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-muted">
            Neighbourhood finds · fresh shuffle
          </p>
        </div>
        <p className="shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-bold text-muted">
          {activeVendors.length} shops
        </p>
      </div>

      {feed.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border-[3px] border-dashed border-ink/20 bg-paper/80 px-5 py-10 text-center">
          <p className="font-display text-xl font-semibold tracking-[-0.02em]">
            Items opening soon
          </p>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
            We’re stocking vetted shops in Badagry. Check back shortly.
          </p>
        </div>
      ) : (
        <Stagger className="mt-4 space-y-3" as="ul" fast immediate>
          {feed.map(({ key, vendor, item }, index) => {
            const theme = categoryThemes[vendor.category]
            return (
              <MotionItem key={key} as="li" variants={fadeUp}>
                <MotionLink
                  to={appPath(`/vendors/${vendor.id}`)}
                  className="group relative flex items-center gap-3.5 overflow-hidden rounded-[1.4rem] border-[2px] border-ink/80 bg-paper/95 p-3 shadow-[3px_3px_0_rgba(6,24,28,0.08)]"
                  whileHover={
                    reduce
                      ? undefined
                      : { y: -3, rotate: index % 2 === 0 ? -0.4 : 0.4 }
                  }
                  whileTap={tapPress}
                  transition={springSoft}
                >
                  <span
                    className="relative grid h-[3.75rem] w-[3.75rem] shrink-0 place-items-center rounded-[1.1rem] border-2 border-ink/10"
                    style={{
                      background: theme.accentSoft,
                      color: theme.accent,
                    }}
                    aria-hidden
                  >
                    <CategoryIcon
                      category={vendor.category}
                      className="h-7 w-7"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-snug tracking-[-0.015em]">
                        {item.name}
                      </h3>
                      <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-xs font-extrabold text-paper">
                        {formatNaira(item.price)}
                      </span>
                    </div>
                    <p
                      className="mt-1 text-[11px] font-extrabold"
                      style={{ color: theme.accent }}
                    >
                      {theme.label} · {vendor.name}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-muted">
                      {vendor.area} · ~{vendor.etaMins}m
                    </p>
                  </div>
                </MotionLink>
              </MotionItem>
            )
          })}
        </Stagger>
      )}

      <p className="mt-10 text-center text-xs text-muted">
        Covered by the{' '}
        <Link to="/guarantee" className="font-semibold text-lagoon">
          KampeDrop Guarantee
        </Link>
      </p>
    </AppShell>
  )
}
