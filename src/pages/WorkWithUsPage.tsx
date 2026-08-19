import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { MarketingLayout } from '../components/layout'
import { Reveal, Stagger, MotionItem } from '../components/motion'
import { SITE, whatsappHelpUrl } from '../data/site'
import { fadeUp, hoverLift, springPop, tapPress } from '../motion/tokens'

const applyWhatsApp = whatsappHelpUrl(
  `Hi KampeDrop — I want to sell from ${SITE.area}. Interested in WhatsApp orders and/or the vendor web board.`,
)

const channels = [
  {
    id: 'whatsapp',
    eyebrow: 'Talk to us',
    title: 'WhatsApp onboarding',
    lead: 'Prefer a conversation? Message us and we’ll walk you through.',
    points: [
      'Human reply for Badagry partners',
      'Same verification standards',
      'Ideal if you’d rather not fill a form',
    ],
    tone: {
      bg: '#EFC27A',
      ink: '#06181C',
      chip: '#06181C',
      border: '#06181C',
    },
    cta: 'Message on WhatsApp',
    href: applyWhatsApp,
    external: true,
  },
  {
    id: 'web',
    eyebrow: 'Self-serve',
    title: 'Register online',
    lead: 'Complimentary signup. Verify within 24 hours. Live only after approval.',
    points: [
      'Submit name, address & storefront photos',
      'We review within 24 hours when complete',
      'Customers see you only after approval',
      'Browser board — no app download',
    ],
    tone: {
      bg: '#0C6560',
      ink: '#F3F8F6',
      chip: '#EFC27A',
      border: '#06181C',
    },
    cta: 'Register your business',
    href: '/vendor/signup',
    external: false,
  },
] as const

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
              Registration is complimentary. Complete your profile and storefront photos —
              we verify within 24 hours. Your business appears to customers only after
              approval.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Two channels */}
      <section className="relative bg-paper py-16 md:py-24">
        <div className="container-site">
          <Reveal>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lagoon">
              Partner pathways
            </p>
            <h2 className="mt-3 max-w-[18ch] font-display text-3xl font-semibold tracking-[-0.03em] md:text-[2.75rem] md:leading-[1.1]">
              How you join.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
              Self-serve registration or WhatsApp — same careful verification either way.
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
                  {ch.external ? (
                    <a
                      href={ch.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-8 inline-flex items-center justify-center rounded-full border-[3px] border-ink bg-ink px-5 py-3 text-sm font-extrabold text-paper shadow-[3px_3px_0_rgba(2,10,12,0.35)]"
                    >
                      {ch.cta} →
                    </a>
                  ) : (
                    <Link
                      to={ch.href}
                      className="mt-8 inline-flex items-center justify-center rounded-full border-[3px] border-ink bg-dusk px-5 py-3 text-sm font-extrabold text-ink shadow-[3px_3px_0_rgba(2,10,12,0.35)]"
                    >
                      {ch.cta} →
                    </Link>
                  )}
                </motion.article>
              </MotionItem>
            ))}
          </Stagger>
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
            <h2 className="mx-auto max-w-[16ch] font-display text-3xl font-bold tracking-[-0.03em] md:text-5xl md:leading-[1.08]">
              Ready to sell on these roads?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base font-semibold text-white/65">
              Tell us your kitchen, mart, or pharmacy. We vet first — then you pick WhatsApp,
              web board, or both.
            </p>
          </Reveal>
          <Reveal className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <motion.a
              href={applyWhatsApp}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
              whileHover={reduce ? undefined : hoverLift}
              whileTap={reduce ? undefined : tapPress}
              transition={springPop}
            >
              Message on WhatsApp →
            </motion.a>
            <Link
              to="/vendor/signup"
              className="inline-flex text-sm font-extrabold text-dusk hover:underline"
            >
              Or register online
            </Link>
          </Reveal>
        </div>
      </section>
    </MarketingLayout>
  )
}
