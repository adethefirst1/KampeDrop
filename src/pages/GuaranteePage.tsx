import { Link } from 'react-router-dom'
import { appPath } from '../paths'
import { MarketingLayout } from '../components/layout'
import { SITE } from '../data/site'

export function GuaranteePage() {
  return (
    <MarketingLayout>
      <section className="bg-lagoon-deep py-16 text-white md:py-24">
        <div className="container-site">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">
            SureDrop Guarantee
          </p>
          <h1 className="mt-4 max-w-[16ch] font-display text-4xl font-semibold tracking-[-0.03em] md:text-6xl">
            Wrong or late — we make it right.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70">
            The guarantee isn’t fine print. It’s why SureDrop exists for Badagry homes — from Town
            to Ajara and along the Expressway.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-site grid gap-6 md:grid-cols-3">
          {[
            {
              t: 'Confirmed',
              d: 'You get instant confirmation the moment an order is placed. No guessing.',
            },
            {
              t: 'Tracked',
              d: 'Visible status from preparing to delivered — so you’re never left in silence.',
            },
            {
              t: 'Made right',
              d: 'If the order arrives wrong or late, we fix it — refund, replace, or redeliver.',
            },
          ].map((item) => (
            <div key={item.t} className="rounded-[1.75rem] bg-paper p-6 ring-1 ring-line">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">{item.t}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-paper py-16 md:py-20">
        <div className="container-narrow">
          <h2 className="font-display text-3xl font-semibold tracking-[-0.03em]">
            What “make it right” means
          </h2>
          <ul className="mt-8 space-y-5 text-base leading-relaxed text-muted">
            <li>
              <span className="font-bold text-ink">Late delivery — </span>
              We own the delay. You’ll hear from a real person, and we’ll adjust or refund the
              delivery fee.
            </li>
            <li>
              <span className="font-bold text-ink">Wrong or missing item — </span>
              We replace what we can, or refund what we can’t — without making you chase anyone.
            </li>
            <li>
              <span className="font-bold text-ink">Need help — </span>
              Call or message us. A human answers. Not a bot maze.
            </li>
          </ul>
          <p className="mt-10 text-sm text-muted">
            Pilot note: during our {SITE.area} launch, every order on SureDrop is covered. Orders
            arranged outside SureDrop are not.
          </p>
          <Link to={appPath()} className="btn-ink mt-8">
            Order with the guarantee
          </Link>
        </div>
      </section>
    </MarketingLayout>
  )
}
