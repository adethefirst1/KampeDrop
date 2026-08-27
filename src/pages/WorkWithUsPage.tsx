import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { AddToHomeScreenGuide } from '../components/AddToHomeScreenGuide'
import { MarketingLayout } from '../components/layout'
import { Reveal, Stagger, MotionItem } from '../components/motion'
import { SITE, whatsappHelpUrl } from '../data/site'
import { fadeUp, hoverLift, tapPress } from '../motion/tokens'

const riderInterestWa = whatsappHelpUrl(
  `Hi, I'm interested in riding for ${SITE.name}`,
)

const channels = [
  {
    id: 'web',
    eyebrow: 'Self-serve',
    title: 'Register online',
    lead: 'Complimentary signup. Verify within 24 hours. Live only after approval.',
    points: [
      'Submit name, address & storefront photos',
      'We review within 24 hours when complete',
      'Customers see you only after approval',
      'Browser board — install to your home screen',
    ],
    tone: {
      bg: '#0C6560',
      ink: '#F3F8F6',
      chip: '#EFC27A',
      border: '#06181C',
    },
    cta: 'Register your business',
    href: '/vendor/signup',
  },
  {
    id: 'signin',
    eyebrow: 'Already approved',
    title: 'Clock in to your board',
    lead: 'Open your station — orders, menu, and handoff in one place.',
    points: [
      'Use the phone + PIN from registration',
      'Lock when you step away — PIN to reopen',
      'Put the board on your home screen',
    ],
    tone: {
      bg: '#06181C',
      ink: '#F3F8F6',
      chip: '#EFC27A',
      border: '#06181C',
    },
    cta: 'Sign in',
    href: '/vendor/login',
  },
] as const

const riderBenefits = [
  {
    t: 'Paid the same day',
    d: 'Finish the delivery, get paid that day. Cash at the door on COD; wallet credit on card and transfer.',
  },
  {
    t: 'Flexible hours',
    d: 'Go available when you can ride. Ops assigns nearby pickups from your zone.',
  },
  {
    t: 'We create your account',
    d: 'No public signup. We meet you, vet you, and set up your private rider board by hand.',
  },
]

const stillOurs = [
  {
    t: 'Verification',
    d: 'Name, address, and photos are reviewed by hand. You go live only when we approve.',
  },
  {
    t: 'Escrow & passkey',
    d: 'Buyer pay stays held until handoff. You cook or pack — we hold the money story.',
  },
  {
    t: 'Riders & exceptions',
    d: 'Matching, silent buyers, disputes, guarantee — that’s our desk, not yours.',
  },
]

export function WorkWithUsPage() {
  const reduce = useReducedMotion()

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink py-16 text-white md:py-24">
        <div
          className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-[40%] border-4 border-ink bg-mango/80 opacity-90"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full border-4 border-ink bg-dusk opacity-90"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1.2px, transparent 1.3px)',
            backgroundSize: '18px 18px',
          }}
          aria-hidden
        />

        <div className="container-site relative">
          <Reveal>
            <p className="inline-flex rounded-full border-[3px] border-ink bg-dusk px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-ink shadow-[3px_3px_0_#020a0c]">
              Work with us · {SITE.area}
            </p>
            <h1 className="mt-5 max-w-[14ch] font-display text-4xl font-bold leading-[0.98] tracking-[-0.03em] md:text-6xl">
              Partner with KampeDrop.
            </h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-relaxed text-white/70 md:text-lg">
              Sell from your kitchen — or ride deliveries across {SITE.area}. Vendors
              register online; riders reach us directly. We vet every partner by hand.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/vendor/signup"
                className="inline-flex items-center justify-center rounded-full bg-mango px-5 py-3 text-sm font-extrabold text-white shadow-[3px_3px_0_#9a4f16]"
              >
                Register →
              </Link>
              <a
                href="#ride"
                className="inline-flex items-center justify-center rounded-full border-[3px] border-dusk bg-transparent px-5 py-3 text-sm font-extrabold text-dusk hover:bg-dusk/10"
              >
                Ride with us
              </a>
              <Link
                to="/vendor/login"
                className="inline-flex items-center justify-center rounded-full border-[3px] border-white/25 bg-transparent px-5 py-3 text-sm font-extrabold text-white/80 hover:bg-white/5"
              >
                Sign in
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Vendor channels */}
      <section className="relative bg-paper py-16 md:py-24">
        <div className="container-site">
          <Reveal>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lagoon">
              Sell with us
            </p>
            <h2 className="mt-3 max-w-[18ch] font-display text-3xl font-semibold tracking-[-0.03em] md:text-[2.75rem] md:leading-[1.1]">
              How kitchens and shops join.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
              New partners register online. Approved kitchens and shops sign in to the board.
            </p>
          </Reveal>

          <Stagger className="mt-12 grid gap-5 md:grid-cols-2" as="ul" fast>
            {channels.map((ch) => (
              <MotionItem key={ch.id} as="li" variants={fadeUp}>
                <motion.article
                  className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border-[3px] border-ink p-6 shadow-[6px_6px_0_#06181C] sm:p-8"
                  style={{ backgroundColor: ch.tone.bg, color: ch.tone.ink }}
                  whileHover={reduce ? undefined : hoverLift}
                  whileTap={reduce ? undefined : tapPress}
                >
                  <p
                    className="text-[11px] font-extrabold uppercase tracking-[0.16em]"
                    style={{ color: ch.tone.chip }}
                  >
                    {ch.eyebrow}
                  </p>
                  <h3 className="mt-3 font-display text-3xl font-bold tracking-[-0.03em]">
                    {ch.title}
                  </h3>
                  <p className="mt-3 text-base font-semibold leading-relaxed opacity-85">
                    {ch.lead}
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm font-semibold leading-snug opacity-90">
                    {ch.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span aria-hidden className="font-extrabold">
                          ✓
                        </span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={ch.href}
                    className="mt-8 inline-flex items-center justify-center rounded-full border-[3px] border-ink bg-dusk px-5 py-3 text-sm font-extrabold text-ink shadow-[3px_3px_0_rgba(2,10,12,0.35)]"
                  >
                    {ch.cta} →
                  </Link>
                </motion.article>
              </MotionItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Ride with us — contact only, no signup */}
      <section id="ride" className="relative scroll-mt-24 bg-ink py-16 text-white md:py-24">
        <div
          className="pointer-events-none absolute -right-10 top-20 h-40 w-40 rounded-[35%] border-4 border-ink bg-lagoon/90 opacity-90"
          aria-hidden
        />
        <div className="container-site relative">
          <Reveal>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-dusk">
              Ride with us
            </p>
            <h2 className="mt-3 max-w-[16ch] font-display text-3xl font-semibold tracking-[-0.03em] md:text-[2.75rem] md:leading-[1.1]">
              Deliver across {SITE.area}.
            </h2>
            <p className="mt-4 max-w-lg text-base font-semibold leading-relaxed text-white/70">
              Same-day pay per delivery. Flexible hours. We don’t take online rider
              applications — call or WhatsApp us, and we’ll meet you.
            </p>
          </Reveal>

          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2" as="ul" fast>
            {riderBenefits.map((item) => (
              <MotionItem
                key={item.t}
                as="li"
                variants={fadeUp}
                className="rounded-[1.5rem] bg-white/5 p-5 ring-1 ring-white/12"
              >
                <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-dusk">
                  {item.t}
                </h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-white/65">
                  {item.d}
                </p>
              </MotionItem>
            ))}
          </Stagger>

          <Reveal className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={`tel:${SITE.supportPhone}`}
              className="inline-flex items-center justify-center rounded-full bg-dusk px-5 py-3.5 text-sm font-extrabold text-ink shadow-[3px_3px_0_rgba(2,10,12,0.45)]"
            >
              Call us · {SITE.supportPhoneDisplay}
            </a>
            <a
              href={riderInterestWa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border-[3px] border-dusk px-5 py-3.5 text-sm font-extrabold text-dusk hover:bg-dusk/10"
            >
              WhatsApp us
            </a>
            <Link
              to="/rider/login"
              className="inline-flex items-center justify-center rounded-full border-[3px] border-white/20 px-5 py-3.5 text-sm font-extrabold text-white/70 hover:bg-white/5"
            >
              Already a rider? Sign in
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Still ours */}
      <section className="wave-line py-16 md:py-24">
        <div className="container-site">
          <Reveal>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lagoon">
              What we still own
            </p>
            <h2 className="mt-3 max-w-[16ch] font-display text-3xl font-semibold tracking-[-0.03em] md:text-[2.75rem]">
              You’re not the call centre.
            </h2>
          </Reveal>
          <Stagger className="mt-10 grid gap-5 sm:grid-cols-3" as="ul">
            {stillOurs.map((item) => (
              <MotionItem
                key={item.t}
                as="li"
                variants={fadeUp}
                className="rounded-[1.5rem] bg-paper p-5 ring-1 ring-line"
              >
                <h3 className="font-display text-xl font-semibold tracking-[-0.02em]">{item.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.d}</p>
              </MotionItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Home screen guide — vendors + riders */}
      <section className="bg-paper py-16 md:py-24">
        <div className="container-site">
          <Reveal>
            <AddToHomeScreenGuide />
          </Reveal>
        </div>
      </section>

      {/* Close */}
      <section className="relative overflow-hidden bg-ink py-20 text-white md:py-28">
        <motion.div
          className="pointer-events-none absolute right-[12%] top-16 h-24 w-24 rounded-[30%] border-4 border-ink bg-lagoon"
          aria-hidden
          animate={reduce ? undefined : { y: [0, 12, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="container-site relative text-center">
          <Reveal>
            <h2 className="mx-auto max-w-[18ch] font-display text-3xl font-bold tracking-[-0.03em] md:text-5xl md:leading-[1.08]">
              Ready to sell — or ride?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base font-semibold text-white/65">
              Kitchens register online. Riders call or WhatsApp us. We vet first — then
              you open the board.
            </p>
          </Reveal>
          <Reveal className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/vendor/signup" className="btn-primary">
              Register your business →
            </Link>
            <a
              href={`tel:${SITE.supportPhone}`}
              className="inline-flex rounded-full border-[3px] border-dusk px-5 py-3 text-sm font-extrabold text-dusk hover:bg-dusk/10"
            >
              Call to ride
            </a>
            <Link
              to="/vendor/login"
              className="inline-flex rounded-full border-[3px] border-white/25 px-5 py-3 text-sm font-extrabold text-white/75 hover:bg-white/5"
            >
              Sign in to your board
            </Link>
          </Reveal>
        </div>
      </section>
    </MarketingLayout>
  )
}
