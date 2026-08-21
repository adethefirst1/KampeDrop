import { Link, Navigate, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { appPath } from '../paths'
import { motion, useReducedMotion } from 'motion/react'
import { AppShell } from '../components/layout'
import { MotionItem, Stagger } from '../components/motion'
import { CategoryIcon } from '../components/CategoryIcon'
import { ShopBackdrop } from '../components/ShopBackdrop'
import {
  categoryThemes,
  isCategory,
  shuffleCopy,
} from '../data/categories'
import { formatNaira, type MenuItem, type Vendor } from '../data/vendors'
import { useCatalog } from '../context/CatalogContext'
import { fadeUp, springSoft, tapPress } from '../motion/tokens'

const MotionLink = motion.create(Link)

type CatItem = {
  key: string
  vendor: Vendor
  item: MenuItem
}

/** Category world — full mood wash, doodles, shops + shelf. */
export function CategoryPage() {
  const { categoryId } = useParams()
  const { activeVendors } = useCatalog()
  const reduce = useReducedMotion()
  const valid = Boolean(categoryId && isCategory(categoryId))
  const id = valid && categoryId && isCategory(categoryId) ? categoryId : 'food'
  const theme = categoryThemes[id]

  const vendors = useMemo(
    () => (valid ? activeVendors.filter((v) => v.category === id) : []),
    [activeVendors, id, valid],
  )

  const items = useMemo(() => {
    const rows: CatItem[] = []
    for (const vendor of vendors) {
      for (const item of vendor.items) {
        if (item.available === false) continue
        rows.push({ key: `${vendor.id}:${item.id}`, vendor, item })
      }
    }
    return shuffleCopy(rows)
  }, [vendors])

  if (!valid) {
    return <Navigate to={appPath()} replace />
  }

  return (
    <AppShell wash="shop" showInstallTip={false}>
      <div className="relative -mx-4 min-h-[70svh] overflow-hidden px-4 pb-2 md:mx-0 md:px-0">
        <ShopBackdrop />

        <Link
          to={appPath()}
          className="relative z-[1] text-sm font-semibold text-muted hover:text-ink"
        >
          ← All categories
        </Link>

        <motion.div
          className="relative mt-3 overflow-hidden rounded-[1.85rem] border-[3px] border-ink/90 px-5 pb-7 pt-5 shadow-[4px_4px_0_rgba(6,24,28,0.12)]"
          style={{ background: theme.wash, color: theme.ink }}
          initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={springSoft}
        >
          <ShopBackdrop category={id} intense />
          <div className="relative">
            <span
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-ink/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em]"
              style={{ background: theme.accentSoft, color: theme.accent }}
            >
              <CategoryIcon category={id} className="h-4 w-4" />
              {theme.label}
            </span>
            <h1 className="mt-3 max-w-[10ch] font-display text-[2.15rem] font-semibold leading-[1.02] tracking-[-0.035em]">
              {theme.headline}
            </h1>
            <p className="mt-2.5 max-w-sm text-sm leading-relaxed opacity-80">
              {theme.sub}
            </p>
            <p className="mt-4 inline-flex rounded-full bg-ink/5 px-3 py-1 text-xs font-bold opacity-70">
              {vendors.length} shop{vendors.length === 1 ? '' : 's'} ·{' '}
              {items.length} item{items.length === 1 ? '' : 's'}
            </p>
          </div>
        </motion.div>

        {vendors.length === 0 ? (
          <div className="relative mt-8 rounded-[1.5rem] border-[3px] border-dashed border-ink/20 bg-paper/85 px-5 py-10 text-center">
            <p className="font-display text-xl font-semibold">Coming soon here</p>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
              We’re onboarding more {theme.label.toLowerCase()} partners in
              Badagry.
            </p>
            <Link to={appPath()} className="btn-ink mt-5 inline-flex">
              Browse everything
            </Link>
          </div>
        ) : (
          <>
            <h2 className="relative mt-8 text-xs font-extrabold uppercase tracking-[0.16em] text-muted">
              Shops
            </h2>
            <Stagger className="relative mt-3 space-y-2.5" as="ul" fast immediate>
              {vendors.map((vendor) => (
                <MotionItem key={vendor.id} as="li" variants={fadeUp}>
                  <MotionLink
                    to={appPath(`/vendors/${vendor.id}`)}
                    className="flex items-center gap-3 rounded-[1.35rem] border-[2px] border-ink/80 bg-paper/95 p-3.5 shadow-[3px_3px_0_rgba(6,24,28,0.08)]"
                    whileHover={reduce ? undefined : { y: -3 }}
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
                        <h3 className="font-semibold leading-snug">
                          {vendor.name}
                        </h3>
                        <span className="shrink-0 text-xs font-bold text-muted">
                          ~{vendor.etaMins}m
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                        {vendor.tagline}
                      </p>
                    </div>
                  </MotionLink>
                </MotionItem>
              ))}
            </Stagger>

            <h2 className="relative mt-9 text-xs font-extrabold uppercase tracking-[0.16em] text-muted">
              On the shelf
            </h2>
            <Stagger className="relative mt-3 space-y-2.5" as="ul" fast immediate>
              {items.map(({ key, vendor, item }, index) => (
                <MotionItem key={key} as="li" variants={fadeUp}>
                  <MotionLink
                    to={appPath(`/vendors/${vendor.id}`)}
                    className="flex items-center gap-3 rounded-[1.35rem] border-[2px] border-ink/80 bg-paper/95 p-3 shadow-[3px_3px_0_rgba(6,24,28,0.08)]"
                    whileHover={
                      reduce
                        ? undefined
                        : { y: -3, rotate: index % 2 === 0 ? -0.35 : 0.35 }
                    }
                    whileTap={tapPress}
                  >
                    <span
                      className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 border-ink/10"
                      style={{
                        background: theme.accentSoft,
                        color: theme.accent,
                      }}
                      aria-hidden
                    >
                      <CategoryIcon category={id} className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-snug tracking-[-0.01em]">
                          {item.name}
                        </h3>
                        <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-xs font-extrabold text-paper">
                          {formatNaira(item.price)}
                        </span>
                      </div>
                      <p
                        className="mt-0.5 text-[11px] font-extrabold"
                        style={{ color: theme.accent }}
                      >
                        {vendor.name}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                        {item.description}
                      </p>
                    </div>
                  </MotionLink>
                </MotionItem>
              ))}
            </Stagger>
          </>
        )}
      </div>
    </AppShell>
  )
}
