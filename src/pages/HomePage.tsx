import { Link } from 'react-router-dom'
import { appPath } from '../paths'
import { motion, useReducedMotion } from 'motion/react'
import { MarketingLayout, GuaranteePill } from '../components/layout'
import { AppEntryButton, InstallPrompt } from '../components/InstallPrompt'
import { MotionItem, Reveal, SecureSeal, Stagger } from '../components/motion'
import { IMAGES, SITE } from '../data/site'
import { categoryLabel } from '../data/vendors'
import { useCatalog } from '../context/CatalogContext'
import { easeOut, fadeUp, heroWord, hoverLift, springSoft, tapPress } from '../motion/tokens'

const MotionLink = motion.create(Link)

function NeighbourhoodMarquee() {
  const places = [...SITE.neighbourhoods, ...SITE.neighbourhoods]
  return (
    <div className="overflow-hidden border-y border-line bg-paper py-5">
      <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-lagoon">
        We know these roads
      </p>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-paper to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-paper to-transparent" />
        <div className="flex w-max marquee gap-3 pr-3">
          {places.map((place, i) => (
            <span
              key={`${place}-${i}`}
              className="shrink-0 rounded-full border border-line bg-mist px-4 py-2 text-sm font-semibold text-ink-soft"
            >
              {place}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function HomePage() {
  const reduce = useReducedMotion()
  const { activeVendors } = useCatalog()

  return (
    <MarketingLayout transparentHeader showInstall>
      {/* Hero — brand first, Badagry dusk */}
      <section className="relative min-h-[100svh] overflow-hidden bg-ink text-white">
        <div className="absolute inset-0">
          <img
            src={IMAGES.hero}
            alt="Badagry lagoon at dusk"
            className={`h-full w-full object-cover opacity-60 ${reduce ? '' : 'ken-burns'}`}
          />
          <div className="absolute inset-0 lagoon-shine" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/50" />
        </div>

        {!reduce && (
          <>
            <motion.div
              className="pointer-events-none absolute -right-8 top-24 h-72 w-72 rounded-full bg-dusk/20 blur-3xl"
              animate={{ x: [0, -18, 0], y: [0, 14, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="pointer-events-none absolute -left-20 bottom-16 h-80 w-80 rounded-full bg-lagoon/30 blur-3xl"
              animate={{ x: [0, 16, 0], y: [0, -12, 0] }}
              transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
            />
          </>
        )}

        <div className="container-site relative z-10 flex min-h-[100svh] flex-col justify-end pb-16 pt-28 md:justify-center md:pb-28 md:pt-24">
          <motion.p
            className="text-xs font-semibold uppercase tracking-[0.24em] text-dusk"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: easeOut }}
          >
            Badagry · by the lagoon
          </motion.p>

          <motion.h1
            className="mt-4 max-w-[9ch] font-display text-[3.6rem] font-semibold leading-[0.95] tracking-[-0.045em] sm:text-[4.75rem] md:text-[5.75rem]"
            variants={heroWord}
            initial="hidden"
            animate="show"
          >
            SureDrop
          </motion.h1>

          <motion.span
            className="mt-5 block h-[3px] w-20 origin-left rounded-full bg-gradient-to-r from-mango to-dusk"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.75, ease: easeOut }}
          />

          <motion.p
            className="mt-5 max-w-[18ch] font-display text-[1.55rem] font-medium leading-[1.2] tracking-[-0.02em] text-white sm:text-[1.85rem]"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.7, ease: easeOut }}
          >
            {SITE.tagline}
          </motion.p>

          <motion.p
            className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
          >
            {SITE.supportLine} Built for homes that the big apps forgot.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.55, ease: easeOut }}
          >
            <AppEntryButton className="btn-primary shadow-[0_14px_40px_rgba(217,119,47,0.38)]">
              Order in Badagry
            </AppEntryButton>
            <div className="flex flex-col gap-3 sm:flex-row">
              <InstallPrompt compact />
              <MotionLink to="/how" className="btn-secondary" whileHover={hoverLift} whileTap={tapPress}>
                How it works
              </MotionLink>
            </div>
          </motion.div>
        </div>
      </section>

      <NeighbourhoodMarquee />

      {/* Emotion: the gap */}
      <section className="bg-paper py-20 md:py-28">
        <div className="container-site grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-lagoon">
              The Badagry truth
            </p>
            <h2 className="mt-3 max-w-[15ch] font-display text-3xl font-semibold tracking-[-0.03em] md:text-[2.75rem] md:leading-[1.1]">
              Waiting on a rider who never confirms shouldn’t be normal.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
              Between the lagoon and the Expressway, ordering from home often means informal chats
              and hope. SureDrop exists so Ajara, Ibereko, Aradagun, and Town get the same certainty
              Mainland apps promise elsewhere.
            </p>
          </Reveal>
          <Reveal
            variants={{
              hidden: { opacity: 0, y: 28, scale: 0.97 },
              show: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.75, ease: easeOut },
              },
            }}
          >
            <div className="relative overflow-hidden rounded-[2rem]">
              <motion.img
                src={IMAGES.corridor}
                alt="Palm corridor along Badagry roads"
                className="aspect-[4/3] w-full object-cover"
                whileHover={reduce ? undefined : { scale: 1.03 }}
                transition={{ duration: 0.8, ease: easeOut }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-5">
                <p className="font-display text-lg font-semibold text-white">
                  The corridor we actually live on
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Emotion: relief */}
      <section className="relative overflow-hidden bg-ink py-20 text-white md:py-28">
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-lagoon/25 blur-3xl" />
        <div className="container-site relative grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <Reveal className="order-2 md:order-1">
            <div className="overflow-hidden rounded-[2rem]">
              <motion.img
                src={IMAGES.kitchen}
                alt="Home food ready for delivery"
                className="aspect-[4/3] w-full object-cover"
                whileHover={reduce ? undefined : { scale: 1.03 }}
                transition={{ duration: 0.8, ease: easeOut }}
              />
            </div>
          </Reveal>
          <Reveal className="order-1 md:order-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-dusk">The feeling</p>
            <h2 className="mt-3 max-w-[14ch] font-display text-3xl font-semibold tracking-[-0.03em] md:text-[2.75rem] md:leading-[1.1]">
              Evening calm. Food on the way. No guessing.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/65">
              That knock at your gate should feel expected — not like a surprise. Confirmed when you
              order. Visible while it moves. Made right if anything slips.
            </p>
            <div className="mt-6">
              <GuaranteePill />
            </div>
            <MotionLink
              to="/guarantee"
              className="mt-6 inline-flex text-sm font-bold text-dusk hover:underline"
            >
              Read the SureDrop Guarantee →
            </MotionLink>
          </Reveal>
        </div>
      </section>

      {/* How */}
      <section className="wave-line py-20 md:py-28">
        <div className="container-site">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-lagoon">How it works</p>
            <h2 className="mt-3 max-w-[18ch] font-display text-3xl font-semibold tracking-[-0.03em] md:text-[2.75rem] md:leading-[1.1]">
              Four quiet steps from your Badagry home.
            </h2>
          </Reveal>
          <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" as="ol">
            {[
              {
                n: '01',
                t: 'Order',
                d: 'Pick a vetted kitchen, mart, or pharmacy near you.',
              },
              {
                n: '02',
                t: 'Confirm',
                d: 'Instant confirmation — not a silent chat.',
              },
              {
                n: '03',
                t: 'Track',
                d: 'Preparing → on the Expressway → at your gate.',
              },
              {
                n: '04',
                t: 'Secure',
                d: 'Delivered — or we make it right. That’s the promise.',
              },
            ].map((step) => (
              <MotionItem
                key={step.n}
                as="li"
                variants={fadeUp}
                className="rounded-[1.5rem] bg-paper p-5 ring-1 ring-line"
              >
                <p className="font-display text-2xl font-semibold text-mango">{step.n}</p>
                <h3 className="mt-3 text-lg font-bold">{step.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.d}</p>
              </MotionItem>
            ))}
          </Stagger>
          <Reveal className="mt-10">
            <Link to="/how" className="inline-flex text-sm font-bold text-lagoon hover:underline">
              See the full flow →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Vendors */}
      <section className="bg-paper py-20 md:py-28">
        <div className="container-site">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-lagoon">
                Local, vetted
              </p>
              <h2 className="mt-3 max-w-[16ch] font-display text-3xl font-semibold tracking-[-0.03em] md:text-[2.75rem] md:leading-[1.1]">
                Vendors we stand behind
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
                Small on purpose — from Hospital Road kitchens to Ajara staples and Aradagun grill.
                If they’re here, we’ve looked them in the eye.
              </p>
            </Reveal>
            <Reveal>
              <AppEntryButton className="btn-ink shrink-0">Browse vendors</AppEntryButton>
            </Reveal>
          </div>

          <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" as="ul" fast>
            {activeVendors.map((vendor) => (
              <MotionItem key={vendor.id} as="li" variants={fadeUp}>
                <MotionLink
                  to={appPath(`/vendors/${vendor.id}`)}
                  className="group block h-full overflow-hidden rounded-[1.5rem] bg-mist ring-1 ring-line"
                  whileHover={{ y: -6, transition: springSoft }}
                  whileTap={tapPress}
                >
                  <motion.div
                    className="h-1.5 w-full origin-left"
                    style={{ background: vendor.accent }}
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: easeOut }}
                  />
                  <div className="p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-lagoon">
                      {categoryLabel[vendor.category]} · {vendor.area}
                    </p>
                    <h3 className="mt-2 font-display text-xl font-semibold tracking-[-0.02em]">
                      {vendor.name}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                      {vendor.tagline}
                    </p>
                    <p className="mt-4 text-xs font-semibold text-ink-soft">
                      ~{vendor.etaMins} min · Vetted
                    </p>
                  </div>
                </MotionLink>
              </MotionItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Close */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="absolute inset-0">
          <img src={IMAGES.hero} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-ink/82" />
          <div className="absolute inset-0 lagoon-shine opacity-60" />
        </div>
        <div className="container-site relative text-center text-white">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-dusk">
              Born in Badagry
            </p>
            <h2 className="mx-auto mt-4 max-w-[16ch] font-display text-3xl font-semibold tracking-[-0.03em] md:text-5xl md:leading-[1.08]">
              Every order, secured — starting here.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base text-white/65">
              Guest checkout. Install to your home screen. A real person when you need help — not a
              bot maze.
            </p>
          </Reveal>
          <Reveal className="mt-8 flex flex-col items-center gap-4">
            <SecureSeal />
            <GuaranteePill />
          </Reveal>
          <Reveal className="mt-10 flex justify-center">
            <AppEntryButton className="btn-primary shadow-[0_14px_40px_rgba(217,119,47,0.38)]">
              Order in Badagry
            </AppEntryButton>
          </Reveal>
        </div>
      </section>
    </MarketingLayout>
  )
}
