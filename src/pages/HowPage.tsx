import { Link } from 'react-router-dom'
import { appPath } from '../paths'
import { MarketingLayout } from '../components/layout'
import { IMAGES, SITE } from '../data/site'

const steps = [
  {
    n: '01',
    title: 'Order from home',
    body: 'Open SureDrop in your browser. Pick a vetted vendor in Badagry — food, mart essentials, or pharmacy. No app download.',
    image: IMAGES.kitchen,
  },
  {
    n: '02',
    title: 'Confirm instantly',
    body: 'The moment you place an order, it’s confirmed. No waiting to see if a rider “saw your message.”',
    image: IMAGES.corridor,
  },
  {
    n: '03',
    title: 'Track every step',
    body: 'Watch status move from preparing to on the way to delivered. Silence is not the default here.',
    image: IMAGES.door,
  },
  {
    n: '04',
    title: 'Secured — or made right',
    body: 'If it’s wrong or late, we fix it. That’s the SureDrop Guarantee, built into every order.',
    image: IMAGES.hero,
  },
]

export function HowPage() {
  return (
    <MarketingLayout>
      <section className="bg-ink py-16 text-white md:py-24">
        <div className="container-site">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-mango">How it works</p>
          <h1 className="mt-4 max-w-[14ch] font-display text-4xl font-semibold tracking-[-0.03em] md:text-6xl">
            From your Badagry home to a secured drop.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/65">
            Built for {SITE.areaLong} — with the reliability of a neighbour who always shows up.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-site space-y-20">
          {steps.map((step, i) => (
            <article
              key={step.n}
              className={`grid items-center gap-8 md:grid-cols-2 md:gap-14 ${
                i % 2 === 1 ? '' : ''
              }`}
            >
              <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                <p className="font-display text-3xl font-semibold text-mango">{step.n}</p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em]">
                  {step.title}
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-muted">{step.body}</p>
              </div>
              <div className={`overflow-hidden rounded-[2rem] ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                <img
                  src={step.image}
                  alt=""
                  className="aspect-[5/4] w-full object-cover"
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-paper py-16 md:py-20">
        <div className="container-site text-center">
          <h2 className="font-display text-3xl font-semibold tracking-[-0.03em]">
            Ready when you are.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Guest checkout. Cash on delivery available. Covered by the SureDrop Guarantee.
          </p>
          <Link to={appPath()} className="btn-primary mt-8">
            Order near me
          </Link>
        </div>
      </section>
    </MarketingLayout>
  )
}
