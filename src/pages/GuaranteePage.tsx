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
            KampeDrop Guarantee
          </p>
          <h1 className="mt-4 max-w-[16ch] font-display text-4xl font-semibold tracking-[-0.03em] md:text-6xl">
            Wrong or late — we make it right.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70">
            For transfer orders, payment stays held until your passkey confirms the order
            left the vendor with a vetted rider — or you collected it yourself. If something’s
            wrong after that, contact us — we’ll make it right.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-site grid gap-6 md:grid-cols-3">
          {[
            {
              t: 'Held until vendor handoff',
              d: 'Transfer stays in escrow until your 4-digit passkey confirms pickup at the vendor or your own collection — not until the rider reaches your door.',
            },
            {
              t: 'Tracked',
              d: 'Visible status from preparing to delivered — so you’re never left in silence.',
            },
            {
              t: 'Made right',
              d: 'Late, wrong, or missing — report a problem on your order and a human follows up.',
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
              We own the delay. You’ll hear from a real person, and we’ll adjust or refund where
              appropriate.
            </li>
            <li>
              <span className="font-bold text-ink">Wrong or missing item — </span>
              We replace what we can, or refund what we can’t — without making you chase anyone.
            </li>
            <li>
              <span className="font-bold text-ink">Need help — </span>
              Call or WhatsApp us. A human answers. Not a bot maze.
            </li>
          </ul>
          <p className="mt-10 text-sm text-muted">
            Pilot note: during our {SITE.area} launch, every order placed on KampeDrop is covered.
            Arrangements made outside KampeDrop are not.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={appPath()} className="btn-ink">
              Order with the guarantee
            </Link>
            <Link to="/terms" className="btn-primary">
              Full terms &amp; policy
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
