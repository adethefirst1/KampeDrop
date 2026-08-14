import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { appPath } from '../paths'
import { motion } from 'motion/react'
import { AppShell, GuaranteePill } from '../components/layout'
import { MotionItem, Reveal, Stagger } from '../components/motion'
import {
  categoryLabel,
  vendors,
  type Category,
} from '../data/vendors'
import { easeOut, fadeUp, springSoft, tapPress } from '../motion/tokens'

const filters: Array<'all' | Category> = ['all', 'food', 'mart', 'pharmacy']
const MotionLink = motion.create(Link)

export function BrowsePage() {
  const [filter, setFilter] = useState<'all' | Category>('all')

  const list = useMemo(
    () => (filter === 'all' ? vendors : vendors.filter((v) => v.category === filter)),
    [filter],
  )

  return (
    <AppShell>
      <motion.p
        className="text-xs font-semibold uppercase tracking-[0.18em] text-lagoon"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
      >
        Badagry · by the lagoon
      </motion.p>
      <motion.h1
        className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] md:text-4xl"
        initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.65, ease: easeOut }}
      >
        What’s near your gate
      </motion.h1>
      <motion.p
        className="mt-2 text-sm leading-relaxed text-muted"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        Ajara, Ibereko, Aradagun, Town — vetted only. Covered by the SureDrop Guarantee.
      </motion.p>

      <Reveal className="mt-5">
        <GuaranteePill compact />
      </Reveal>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => {
          const active = filter === f
          const label = f === 'all' ? 'All' : categoryLabel[f]
          return (
            <motion.button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? 'text-white' : 'bg-paper text-ink-soft ring-1 ring-line hover:bg-white'
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

      <Stagger className="mt-6 space-y-3" as="ul" fast>
        {list.map((vendor) => (
          <MotionItem key={vendor.id} as="li" variants={fadeUp}>
            <MotionLink
              to={appPath(`/vendors/${vendor.id}`)}
              className="block overflow-hidden rounded-[1.5rem] bg-paper ring-1 ring-line"
              whileHover={{ y: -4, transition: springSoft }}
              whileTap={tapPress}
            >
              <motion.div
                className="h-1.5 w-full origin-left"
                style={{ background: vendor.accent }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, ease: easeOut }}
              />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-lagoon">
                      {categoryLabel[vendor.category]} · {vendor.area}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.02em]">
                      {vendor.name}
                    </h2>
                  </div>
                  <span className="shrink-0 rounded-xl bg-mist px-2.5 py-1.5 text-xs font-bold text-ink-soft">
                    ~{vendor.etaMins} min
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{vendor.tagline}</p>
              </div>
            </MotionLink>
          </MotionItem>
        ))}
      </Stagger>
    </AppShell>
  )
}
