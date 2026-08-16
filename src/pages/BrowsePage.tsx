import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { appPath } from '../paths'
import { motion } from 'motion/react'
import { AppShell } from '../components/layout'
import { MotionItem, Stagger } from '../components/motion'
import { categoryLabel, SERVICE_AREA, type Category } from '../data/vendors'
import { useCatalog } from '../context/CatalogContext'
import { fadeUp, springSoft, tapPress } from '../motion/tokens'

const filters: Array<'all' | Category> = ['all', 'food', 'mart', 'pharmacy']
const MotionLink = motion.create(Link)

export function BrowsePage() {
  const { activeVendors } = useCatalog()
  const [filter, setFilter] = useState<'all' | Category>('all')

  const list = useMemo(
    () =>
      filter === 'all'
        ? activeVendors
        : activeVendors.filter((v) => v.category === filter),
    [filter, activeVendors],
  )

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lagoon">
            {SERVICE_AREA}
          </p>
          <h1 className="mt-1 font-display text-[1.85rem] font-semibold tracking-[-0.03em]">
            Order nearby
          </h1>
        </div>
        <p className="shrink-0 pb-1 text-xs font-semibold text-muted">
          {activeVendors.length} vetted
        </p>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => {
          const active = filter === f
          const label = f === 'all' ? 'All' : categoryLabel[f]
          return (
            <motion.button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`relative shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                active ? 'text-white' : 'bg-paper text-ink-soft ring-1 ring-line'
              }`}
              whileTap={tapPress}
            >
              {active && (
                <motion.span
                  layoutId="browse-filter"
                  className="absolute inset-0 rounded-full bg-ink"
                  transition={springSoft}
                />
              )}
              <span className="relative z-10">{label}</span>
            </motion.button>
          )
        })}
      </div>

      {list.length === 0 ? (
        <div className="mt-12 rounded-[1.5rem] bg-paper px-5 py-10 text-center ring-1 ring-line">
          <p className="font-display text-xl font-semibold tracking-[-0.02em]">
            {activeVendors.length === 0
              ? 'Vendors opening soon'
              : 'Nothing in this category'}
          </p>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
            {activeVendors.length === 0
              ? 'We’re onboarding vetted shops in Badagry. Check back shortly, or message SureDrop.'
              : 'Try another filter — food, mart, and pharmacy rotate by time of day.'}
          </p>
          {filter !== 'all' && activeVendors.length > 0 && (
            <button
              type="button"
              className="btn-ink mt-5"
              onClick={() => setFilter('all')}
            >
              Show all
            </button>
          )}
        </div>
      ) : (
        <Stagger key={filter} className="mt-5 space-y-2.5" as="ul" fast immediate>
          {list.map((vendor) => (
            <MotionItem key={vendor.id} as="li" variants={fadeUp}>
              <MotionLink
                to={appPath(`/vendors/${vendor.id}`)}
                className="flex items-center gap-3 rounded-2xl bg-paper p-3.5 ring-1 ring-line"
                whileHover={{ y: -2, transition: springSoft }}
                whileTap={tapPress}
              >
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
                  style={{ background: vendor.accent }}
                  aria-hidden
                >
                  {vendor.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold leading-snug tracking-[-0.01em]">
                      {vendor.name}
                    </h2>
                    <span className="shrink-0 text-xs font-bold text-muted">
                      ~{vendor.etaMins}m
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-lagoon">
                    {categoryLabel[vendor.category]} · {vendor.area}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-muted">{vendor.tagline}</p>
                </div>
              </MotionLink>
            </MotionItem>
          ))}
        </Stagger>
      )}

      <p className="mt-8 text-center text-xs text-muted">
        Covered by the{' '}
        <Link to="/guarantee" className="font-semibold text-lagoon">
          SureDrop Guarantee
        </Link>
      </p>
    </AppShell>
  )
}
