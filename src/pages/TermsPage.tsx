import { Link } from 'react-router-dom'
import { appPath } from '../paths'
import { MarketingLayout } from '../components/layout'
import { SITE, whatsappHelpUrl } from '../data/site'

const LAST_UPDATED = '22 August 2026'

export function TermsPage() {
  return (
    <MarketingLayout>
      <section className="bg-ink py-16 text-white md:py-20">
        <div className="container-site">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">
            Legal
          </p>
          <h1 className="mt-4 max-w-[18ch] font-display text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
            Terms &amp; Guarantee Policy
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65">
            Draft for operational clarity during the {SITE.area} pilot. Have a lawyer review
            before treating this as final. Last updated: {LAST_UPDATED}.
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-narrow space-y-12 text-base leading-relaxed text-muted">
          <Section title="1. Who we are">
            <p>
              KampeDrop is a hyperlocal delivery and pickup service currently operating in the
              Badagry–Ojo corridor, Lagos State, Nigeria. This page explains what our guarantee
              covers, how payments and cancellations work, and what happens if something goes
              wrong.
            </p>
            <p className="mt-4">
              By placing an order or registering with KampeDrop, you agree to the terms below.
            </p>
          </Section>

          <Section title="2. Ordering — no account required">
            <p>
              You can browse vendors and place an order as a guest, with no account or login
              needed. We only require your name, phone number, and delivery address (or pickup
              preference) to fulfil an order.
            </p>
            <p className="mt-4">
              After you place an order, you can follow status on your{' '}
              <span className="font-semibold text-ink">Track</span> page (keep the link, or
              recover it later with your order ID and checkout phone). For help, contact us on
              WhatsApp or phone — we do not send automated SMS updates yet.
            </p>
          </Section>

          <Section title="3. How payment works">
            <p>We currently support these payment methods at checkout:</p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>
                <span className="font-semibold text-ink">Card — </span>
                pay securely via Paystack (Visa / Mastercard). Funds are held until handoff
                passkey confirmation (see Escrow).
              </li>
              <li>
                <span className="font-semibold text-ink">Bank transfer — </span>
                Paystack shows a one-time account for the order amount. Funds are held until
                handoff passkey confirmation.
              </li>
              <li>
                <span className="font-semibold text-ink">Cash on delivery / pay at pickup — </span>
                pay the rider or vendor directly when your order arrives or is collected. No
                advance payment; these orders are not held in escrow.
              </li>
            </ul>
            <p className="mt-4">
              Card and transfer payments are processed by Paystack. KampeDrop does not store
              your full card details.
            </p>
          </Section>

          <Section title="4. Escrow &amp; the KampeDrop Guarantee">
            <p className="mt-4">
              For orders paid by{' '}
              <span className="font-semibold text-ink">card or bank transfer</span>, your
              payment is <span className="font-semibold text-ink">held</span>, not released to
              the vendor, until KampeDrop confirms the order left the vendor correctly —
              either with a vetted rider, or collected by you on pickup.
            </p>
            <p className="mt-4">
              Confirmation happens through a{' '}
              <span className="font-semibold text-ink">4-digit passkey</span>, shown on your
              order tracking page. For delivery, you (or ops with you) read this code when
              the rider collects at the vendor. For self-pickup, you show it when you
              collect. Only then is payment released to the vendor.
            </p>
            <p className="mt-4">
              Door delivery after that handoff is still tracked. Problems on the way to you
              (late, wrong, missing) are covered by the KampeDrop Guarantee via report /
              support — but escrow release is tied to the{' '}
              <span className="font-semibold text-ink">vendor handoff</span>, not arrival at
              your door.
            </p>
            <p className="mt-4">
              <span className="font-semibold text-ink">This is the core of the KampeDrop Guarantee:</span>{' '}
              if the vendor fill or handoff goes wrong before passkey confirmation, payment
              has not been released. Contact support and we will make it right — replacement,
              refund, or another fair resolution. After passkey, we still make late or wrong
              deliveries right through support.
            </p>
            <p className="mt-4">
              Cash-on-delivery and pay-at-pickup orders are not held in escrow, since payment
              happens at the point of handoff directly.
            </p>
            <p className="mt-4">
              Read the short version on our{' '}
              <Link to="/guarantee" className="font-semibold text-lagoon hover:underline">
                Guarantee
              </Link>{' '}
              page.
            </p>
          </Section>

          <Section title="5. Cancellations">
            <p>You can cancel an order for free only in the early stage of the order:</p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>
                <span className="font-semibold text-ink">Delivery orders — </span>
                cancellable while we are still finding a rider, before one has been assigned.
              </li>
              <li>
                <span className="font-semibold text-ink">Pickup orders — </span>
                cancellable while the order is newly confirmed, before the vendor has started
                preparing it.
              </li>
            </ul>
            <p className="mt-4">
              Once an order moves past this point, it can no longer be cancelled through the
              app — the vendor has committed resources to it. If something goes wrong after this
              point, use the <span className="font-semibold text-ink">“report a problem”</span>{' '}
              option on your order instead, and our team will review it.
            </p>
          </Section>

          <Section title="6. If something goes wrong">
            <p>
              Every order has a “report a problem” option once you’ve passed the point where
              quick cancellation ends. Use this if your order is late, wrong, damaged, or
              anything else feels off. Our team reviews every report and will work with you
              toward a fair resolution under the KampeDrop Guarantee.
            </p>
          </Section>

          <Section title="7. Personal Shoppers">
            <p>
              KampeDrop’s Personal Shopper service (when available) lets a verified KampeDrop
              shopper purchase items on your behalf from local markets or shops.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>
                <span className="font-semibold text-ink">Registration is required on both sides. </span>
                Personal shoppers are ID-verified and registered with KampeDrop before they can
                accept requests. Customers must also have a registered KampeDrop account to
                request a personal shopper.
              </li>
              <li>
                <span className="font-semibold text-ink">Photo verification. </span>
                Shoppers provide photo proof of items and prices purchased on your behalf.
              </li>
              <li>
                <span className="font-semibold text-ink">The guarantee applies only within the app. </span>
                If you request and pay for a personal shopper through KampeDrop, you are covered
                by the KampeDrop Guarantee described above.{' '}
                <span className="font-semibold text-ink">
                  Any arrangement made outside the KampeDrop app or platform — including direct
                  off-app agreements with a shopper, rider, or vendor — is not covered by
                  KampeDrop, and we are not liable for any loss, damage, or dispute arising from
                  it.
                </span>
              </li>
            </ul>
          </Section>

          <Section title="8. Vendors and riders">
            <p>
              Vendors and riders on KampeDrop go through a vetting process before joining the
              platform, including identity verification. We hold vendors and riders accountable
              to standards of reliability and conduct, and may remove any partner who does not
              meet them.
            </p>
          </Section>

          <Section title="9. Limitation of liability">
            <p>
              KampeDrop makes reasonable efforts to ensure reliable service through vetted
              partners, escrow protection, and the passkey handoff system described above.
              However, to the fullest extent permitted by law, KampeDrop’s liability for any
              single order is limited to the value of that order (items, delivery fee, and any
              applicable service fee paid).
            </p>
            <p className="mt-4">
              KampeDrop is not liable for delays or failures caused by circumstances outside our
              reasonable control, including but not limited to severe weather, road closures, or
              actions taken outside the KampeDrop platform as described in Section 7.
            </p>
            <p className="mt-4 text-sm italic text-muted">
              This section in particular should be finalized with a lawyer — liability caps and
              exclusions need to reflect current Nigerian consumer protection law.
            </p>
          </Section>

          <Section title="10. Changes to these terms">
            <p>
              We may update these terms from time to time as KampeDrop’s services grow. Continued
              use of KampeDrop after changes take effect means you accept the updated terms.
              Material changes will be noted with an updated “last updated” date above.
            </p>
          </Section>

          <Section title="11. Contact us">
            <p>Questions, disputes, or problem reports:</p>
            <ul className="mt-4 space-y-2">
              <li>
                <span className="font-semibold text-ink">Phone: </span>
                <a href={`tel:${SITE.supportPhone}`} className="text-lagoon hover:underline">
                  {SITE.supportPhoneDisplay}
                </a>
              </li>
              <li>
                <span className="font-semibold text-ink">WhatsApp: </span>
                <a
                  href={whatsappHelpUrl('Hello KampeDrop — I have a question about an order.')}
                  className="text-lagoon hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {SITE.supportWhatsAppDisplay}
                </a>
              </li>
              <li>
                <span className="font-semibold text-ink">Email: </span>
                <a href={`mailto:${SITE.email}`} className="text-lagoon hover:underline">
                  {SITE.email}
                </a>
              </li>
            </ul>
          </Section>

          <Section title="12. Governing law">
            <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>
            <p className="mt-4 text-sm italic text-muted">
              To be confirmed with legal counsel: appropriate jurisdiction/venue for dispute
              resolution, and whether a separate Privacy Policy is needed alongside this
              document — likely yes, given phone numbers and addresses are collected.
            </p>
          </Section>

          <div className="flex flex-wrap gap-3 border-t border-line pt-10">
            <Link to="/guarantee" className="btn-ink">
              Read the Guarantee
            </Link>
            <Link to={appPath()} className="btn-primary">
              Order nearby
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}
