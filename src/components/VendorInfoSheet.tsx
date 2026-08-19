import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Vendor } from '../data/vendors'
import { categoryLabel } from '../data/vendors'
import { springSoft } from '../motion/tokens'

type Props = {
  vendor: Vendor
  open: boolean
  onClose: () => void
}

function mapsUrl(vendor: Vendor) {
  if (vendor.lat != null && vendor.lng != null) {
    return `https://www.google.com/maps?q=${vendor.lat},${vendor.lng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${vendor.pickupSpot}, Badagry`,
  )}`
}

function mapEmbed(vendor: Vendor) {
  if (vendor.lat == null || vendor.lng == null) return null
  const delta = 0.008
  const bbox = [
    vendor.lng - delta,
    vendor.lat - delta,
    vendor.lng + delta,
    vendor.lat + delta,
  ].join('%2C')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${vendor.lat}%2C${vendor.lng}`
}

/** Buyer-facing vendor story: address, map, photos — menu stays the main job. */
export function VendorInfoSheet({ vendor, open, onClose }: Props) {
  const reduce = useReducedMotion()
  const embed = mapEmbed(vendor)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-info-title"
            className="relative z-10 flex max-h-[88svh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border-[3px] border-ink bg-paper shadow-[0_-8px_40px_rgba(6,24,28,0.25)] sm:rounded-[1.75rem]"
            initial={reduce ? false : { y: 48, opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: 32, opacity: 0 }}
            transition={springSoft}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-lagoon">
                  {categoryLabel[vendor.category]} · {vendor.area}
                </p>
                <h2
                  id="vendor-info-title"
                  className="mt-1 font-display text-2xl font-bold tracking-[-0.03em]"
                >
                  {vendor.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink-soft"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {vendor.photos.length > 0 && (
                <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {vendor.photos.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="h-36 w-44 shrink-0 rounded-2xl object-cover ring-1 ring-line"
                    />
                  ))}
                </div>
              )}

              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                {vendor.about || vendor.tagline}
              </p>

              <dl className="mt-5 space-y-3 text-sm">
                <div>
                  <dt className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
                    Address / pickup
                  </dt>
                  <dd className="mt-1 font-semibold text-ink">{vendor.pickupSpot}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
                    Hours
                  </dt>
                  <dd className="mt-1 font-semibold text-ink">{vendor.hours}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
                    Why we trust them
                  </dt>
                  <dd className="mt-1 leading-relaxed text-ink-soft">{vendor.vettedNote}</dd>
                </div>
              </dl>

              {embed && (
                <div className="mt-5 overflow-hidden rounded-2xl border-[2px] border-ink">
                  <iframe
                    title={`Map — ${vendor.name}`}
                    src={embed}
                    className="h-44 w-full border-0"
                    loading="lazy"
                  />
                </div>
              )}

              <a
                href={mapsUrl(vendor)}
                target="_blank"
                rel="noreferrer"
                className="btn-ink mt-4 w-full"
              >
                Open in Maps →
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
