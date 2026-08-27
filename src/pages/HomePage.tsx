import { Link } from 'react-router-dom'
import { appPath } from '../paths'
import { motion, useReducedMotion } from 'motion/react'
import { MarketingLayout, GuaranteePill } from '../components/layout'
import { AppEntryButton } from '../components/InstallPrompt'
import { MotionItem, Reveal, SecureSeal, Stagger } from '../components/motion'
import { CartoonHero } from '../components/CartoonHero'
import { CategoryMorphCarousel } from '../components/CategoryMorphCarousel'
import { HowStoryCarousel } from '../components/HowStoryCarousel'
import { IMAGES, SITE } from '../data/site'
import { categoryLabel } from '../data/vendors'
import { useCatalog } from '../context/CatalogContext'
import { easeOut, fadeUp, springSoft, tapPress } from '../motion/tokens'

const MotionLink = motion.create(Link)

function NeighbourhoodMarquee() {
  const reduce = useReducedMotion()
  const places = [...SITE.neighbourhoods, ...SITE.neighbourhoods]
  return (
    <div className="overflow-hidden border-y-4 border-ink bg-dusk py-5">
      <p className="mb-3 text-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink">
        We know these roads 🛵
      </p>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-dusk to-transparent sm:w-16" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-dusk to-transparent sm:w-16" />
        <div
          className={
            reduce
              ? 'flex flex-wrap justify-center gap-3 px-3'
              : 'flex w-max gap-3 pr-3 marquee'
          }
        >
          {(reduce ? SITE.neighbourhoods : places).map((place, i) => (
            <span
              key={`${place}-${i}`}
              className="shrink-0 rounded-full border-2 border-ink bg-paper px-4 py-2 text-sm font-extrabold text-ink"
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
    <MarketingLayout showInstall>
      <CartoonHero />

      <NeighbourhoodMarquee />

      <CategoryMorphCarousel />

      {/* Badagry truth — soft, human, it’s finally here */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#f7f1e8] via-paper to-mist"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-dusk/25 blur-3xl"
          aria-hidden
        />
        <div className="container-site relative grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-lagoon">
              The Badagry truth
            </p>
            <h2 className="mt-3 max-w-[16ch] font-display text-3xl font-semibold tracking-[-0.03em] text-ink md:text-[2.75rem] md:leading-[1.1]">
              You’re not thinking it again. It’s happening.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
              For a long time, homes here watched the rest of Lagos order with a tap — while we
              mostly made do with chats and hope. KampeDrop is for Badagry nights: food, mart, or
              pharmacy from people you can trust, tracked to your gate, payment held until handoff.
              Breathe. It’s live on these roads.
            </p>
            <p className="mt-4 max-w-md text-sm font-semibold text-lagoon-deep">
              Town · Ajara · Ibereko · Aradagun — same calm you deserve.
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
            <div className="relative overflow-hidden rounded-[2rem] shadow-[0_24px_60px_rgba(6,24,28,0.12)]">
              <motion.img
                src={IMAGES.truthPeople}
                alt="A Badagry neighbour smiling — ordering from home finally feels possible"
                className="aspect-[4/5] w-full object-cover object-top md:aspect-[4/3]"
                whileHover={reduce ? undefined : { scale: 1.03 }}
                transition={{ duration: 0.8, ease: easeOut }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/55 via-ink/15 to-transparent p-5 pt-16">
                <p className="font-display text-lg font-semibold text-white">
                  For homes like yours
                </p>
                <p className="mt-1 text-sm text-white/80">Real people. Real roads. Real orders.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* The feeling — warm comfort, does shopping feel like shopping? */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-[#e8f2ef] via-[#f3f8f6] to-[#efe6d8]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-lagoon/15 blur-3xl"
          aria-hidden
        />
        <div className="container-site relative grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <Reveal className="order-2 md:order-1">
            <div className="relative overflow-hidden rounded-[2rem] shadow-[0_24px_60px_rgba(6,24,28,0.12)]">
              <motion.img
                src={IMAGES.feelPeople}
                alt="Evening ease — the quiet comfort of knowing your order is handled"
                className="aspect-[4/5] w-full object-cover object-[center_20%] md:aspect-[4/3]"
                whileHover={reduce ? undefined : { scale: 1.03 }}
                transition={{ duration: 0.8, ease: easeOut }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent p-5 pt-20">
                <p className="font-display text-lg font-semibold text-white">
                  That evening ease
                </p>
              </div>
            </div>
          </Reveal>
          <Reveal className="order-1 md:order-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-lagoon">
              The feeling
            </p>
            <h2 className="mt-3 max-w-[15ch] font-display text-3xl font-semibold tracking-[-0.03em] text-ink md:text-[2.75rem] md:leading-[1.1]">
              Don’t just say it’s shopping. Does it feel like shopping?
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
              Real shopping feels soft on the nerves: you see what you chose, you know it’s moving,
              money isn’t a leap of faith, and someone owns the outcome. A chat that only takes your
              order isn’t the same thing. When it’s KampeDrop, it should feel like sitting back —
              food, soap, or medicine on the way, without the guesswork.
            </p>
            <div className="mt-6">
              <GuaranteePill />
            </div>
            <MotionLink
              to="/guarantee"
              className="mt-6 inline-flex text-sm font-bold text-lagoon hover:underline"
            >
              Read the KampeDrop Guarantee →
            </MotionLink>
          </Reveal>
        </div>
      </section>

      {/* How — story carousel */}
      <HowStoryCarousel />

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
              <Link
                to="/work-with-us"
                className="mt-4 inline-flex text-sm font-bold text-lagoon hover:underline"
              >
                Own a kitchen or shop? Work with us →
              </Link>
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
                  whileHover={reduce ? undefined : { y: -6, transition: springSoft }}
                  whileTap={reduce ? undefined : tapPress}
                >
                  <motion.div
                    className="h-1.5 w-full origin-left"
                    style={{ background: vendor.accent }}
                    initial={reduce ? false : { scaleX: 0 }}
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
