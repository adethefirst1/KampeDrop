import { Link } from 'react-router-dom'
import { useDeferredValue, useMemo, useState } from 'react'
import { appPath } from '../paths'
import { motion, useReducedMotion } from 'motion/react'
import { AppShell } from '../components/layout'
import { MotionItem, Stagger } from '../components/motion'
import { CategoryIcon } from '../components/CategoryIcon'
import { ShopBackdrop, shopGreeting } from '../components/ShopBackdrop'
import { categoryOrder, categoryThemes } from '../data/categories'
import {
  isVendorOpenNow,
  SERVICE_AREA,
  type Vendor,
} from '../data/vendors'
import { useCatalog } from '../context/CatalogContext'
import { fadeUp, springPop, springSoft, tapPress } from '../motion/tokens'

const MotionLink = motion.create(Link)

function shopRecency(v: Vendor): number {
  return (
    Date.parse(v.createdAt || '') ||
    Date.parse(v.submittedAt || '') ||
    0
  )
}

/** Open first (newest within), then closed (newest within). */
export function sortShopsForBrowse(vendors: Vendor[]): Vendor[] {
  return [...vendors].sort((a, b) => {
    const aOpen = isVendorOpenNow(a) ? 1 : 0
    const bOpen = isVendorOpenNow(b) ? 1 : 0
    if (aOpen !== bOpen) return bOpen - aOpen
    return shopRecency(b) - shopRecency(a)
  })
}

function shopMatchesQuery(vendor: Vendor, q: string): boolean {
  const hay = [
    vendor.name,
    vendor.area,
    vendor.tagline,
    vendor.about,
    categoryThemes[vendor.category].label,
    ...vendor.items.map((i) => `${i.name} ${i.description}`),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

function ShopCard({
  vendor,
  reduce,
}: {
  vendor: Vendor
  reduce: boolean | null
}) {
  const theme = categoryThemes[vendor.category]
  const open = isVendorOpenNow(vendor)

  return (
    <MotionLink
      to={appPath(`/vendors/${vendor.id}`)}
      className={`flex items-center gap-3 rounded-[1.35rem] border-[2px] bg-paper/95 p-3.5 shadow-[3px_3px_0_rgba(6,24,28,0.08)] ${
        open ? 'border-ink/80' : 'border-ink/40 opacity-90'
      }`}
      whileHover={reduce ? undefined : { y: -3 }}
      whileTap={tapPress}
    >
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-ink/10"
        style={{
          background: theme.accentSoft,
          color: theme.accent,
        }}
        aria-hidden
      >
        <CategoryIcon category={vendor.category} className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{vendor.name}</h3>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {open ? (
              <span className="text-xs font-bold text-muted">~{vendor.etaMins}m</span>
            ) : (
              <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-soft">
                Closed
              </span>
            )}
          </div>
        </div>
        <p className="mt-0.5 text-[11px] font-extrabold" style={{ color: theme.accent }}>
          {theme.label} · {vendor.area}
        </p>
        {vendor.tagline ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-muted">
            {vendor.tagline}
          </p>
        ) : null}
      </div>
    </MotionLink>
  )
}

/** Shop home — greeting, compact categories, open-first shops. */
export function BrowsePage() {
  const { activeVendors } = useCatalog()
  const reduce = useReducedMotion()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const [greeting] = useState(() => shopGreeting())

  const searching = deferredQuery.length > 0

  const shops = useMemo(() => {
    const base = searching
      ? activeVendors.filter((v) => shopMatchesQuery(v, deferredQuery))
      : activeVendors
    return sortShopsForBrowse(base)
  }, [activeVendors, searching, deferredQuery])

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
          <p className="relative text-[11px] font-extrabold uppercase tracking-[0.16em] text-mango-deep">
            {greeting} · {SERVICE_AREA}
          </p>
          <h1 className="relative mt-2 max-w-[12ch] font-display text-[1.85rem] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[2.1rem]">
            What do you need?
          </h1>
          <p className="relative mt-2 max-w-[18rem] text-sm leading-relaxed text-muted">
            Someone’s got you — search a shop, pick a vibe, or scroll who’s open nearby.
          </p>

          <label className="relative mt-4 block">
            <span className="sr-only">Search shops</span>
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lagoon"
              aria-hidden
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle
                  cx="8"
                  cy="8"
                  r="5.25"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
                <path
                  d="M12.2 12.2 15.5 15.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shops, area, jollof…"
              autoComplete="off"
              enterKeyHint="search"
              className="w-full rounded-[1.15rem] border-[2.5px] border-ink/85 bg-paper/95 py-3.5 pl-11 pr-11 text-sm font-semibold tracking-[-0.01em] text-ink shadow-[2px_2px_0_rgba(6,24,28,0.08)] outline-none placeholder:font-medium placeholder:text-muted/80 focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
            />
            {query.trim() ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-mist px-2.5 py-1 text-[11px] font-bold text-muted"
              >
                Clear
              </button>
            ) : null}
          </label>
        </motion.div>

        {!searching && (
          <nav className="relative mt-5" aria-label="Categories">
            <p className="text-center text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted/70">
              Pick a vibe
            </p>
            <ul className="mt-3 grid grid-cols-4 gap-1 sm:gap-2">
              {categoryOrder.map((id, i) => {
                const theme = categoryThemes[id]
                return (
                  <li key={id} className="min-w-0">
                    <MotionLink
                      to={appPath(`/category/${id}`)}
                      className="group flex flex-col items-center gap-2 px-0.5 py-1 text-center"
                      initial={reduce ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...springPop, delay: 0.045 * i }}
                      whileHover={
                        reduce
                          ? undefined
                          : { y: -4, rotate: i % 2 === 0 ? -1.5 : 1.5 }
                      }
                      whileTap={tapPress}
                    >
                      <span
                        className={`relative block ${
                          i % 2 === 0 ? '-rotate-3' : 'rotate-3'
                        }`}
                      >
                        <span
                          className="grid h-[3.35rem] w-[3.35rem] place-items-center rounded-[1.35rem] transition duration-200 group-hover:scale-[1.06] sm:h-14 sm:w-14"
                          style={{
                            background: theme.accentSoft,
                            color: theme.accent,
                            boxShadow: `3px 3px 0 0 ${theme.accent}40`,
                          }}
                          aria-hidden
                        >
                          <CategoryIcon
                            category={id}
                            className="h-7 w-7 sm:h-8 sm:w-8"
                          />
                        </span>
                      </span>
                      <span
                        className="max-w-full truncate text-[11px] font-extrabold leading-tight tracking-[-0.02em] sm:text-xs"
                        style={{ color: theme.ink }}
                      >
                        {theme.label}
                      </span>
                    </MotionLink>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.35rem] font-semibold tracking-[-0.02em]">
            Shops
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-muted">
            {searching
              ? `Matching “${query.trim()}”`
              : 'Open first · newest nearby'}
          </p>
        </div>
        <p className="shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-bold text-muted">
          {shops.length}
        </p>
      </div>

      {shops.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border-[3px] border-dashed border-ink/20 bg-paper/80 px-5 py-10 text-center">
          <p className="font-display text-xl font-semibold tracking-[-0.02em]">
            {searching ? 'Nothing matched' : 'Shops opening soon'}
          </p>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
            {searching
              ? 'Try another word — shop name, area, or what you’re craving.'
              : 'We’re stocking vetted shops in Badagry. Check back shortly.'}
          </p>
          {searching ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="btn-ink mt-5 inline-flex"
            >
              Clear search
            </button>
          ) : null}
        </div>
      ) : (
        <Stagger className="mt-3 space-y-2.5" as="ul" fast immediate>
          {shops.map((vendor) => (
            <MotionItem key={vendor.id} as="li" variants={fadeUp}>
              <ShopCard vendor={vendor} reduce={reduce} />
            </MotionItem>
          ))}
        </Stagger>
      )}

      <p className="mt-10 text-center text-xs text-muted">
        Covered by the{' '}
        <Link to="/guarantee" className="font-semibold text-lagoon">
          KampeDrop Guarantee
        </Link>
        {' · '}
        <Link to={appPath('/find-order')} className="font-semibold text-lagoon">
          Find my order
        </Link>
      </p>
    </AppShell>
  )
}
