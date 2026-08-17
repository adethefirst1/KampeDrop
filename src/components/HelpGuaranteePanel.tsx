import { useState } from 'react'
import { SITE, whatsappHelpUrl } from '../data/site'
import type { OrderStatus } from '../context/CartContext'

const ISSUES = [
  { id: 'late', label: 'Order is late' },
  { id: 'wrong', label: 'Wrong item' },
  { id: 'missing', label: 'Missing item' },
  { id: 'never', label: 'Never arrived' },
  { id: 'other', label: 'Something else' },
] as const

type Props = {
  orderId: string
  status: OrderStatus
  onReport: (reason: string) => void
  alreadyFlagged?: boolean
}

export function HelpGuaranteePanel({
  orderId,
  status,
  onReport,
  alreadyFlagged = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [issue, setIssue] = useState<(typeof ISSUES)[number]['id']>('late')
  const [sent, setSent] = useState(false)

  const afterVendorHandoff =
    status === 'picked_up' ||
    status === 'on_the_way' ||
    status === 'delivered'

  const wa = whatsappHelpUrl(
    `SureDrop help — order ${orderId}. Issue: ${issue}. Status: ${status}.`,
  )

  function submitReport() {
    const label = ISSUES.find((i) => i.id === issue)?.label ?? issue
    onReport(label)
    setSent(true)
    setOpen(false)
  }

  return (
    <section className="mt-5 rounded-[1.5rem] bg-paper p-4 ring-1 ring-line">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-lagoon">
        Need help
      </p>
      <p className="mt-2 text-sm text-muted">
        {afterVendorHandoff
          ? 'Vendor handoff is done (passkey). Door delivery issues still get the SureDrop Guarantee — we’ll make it right.'
          : 'Talk to a human, or report an issue on this order.'}
      </p>

      {(alreadyFlagged || sent) && (
        <p className="mt-3 rounded-xl bg-lagoon/10 px-3 py-2 text-sm font-semibold text-lagoon-deep">
          We’ve got your report. Someone will follow up.
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <a
          href={`tel:${SITE.supportPhone}`}
          className="rounded-2xl bg-ink px-4 py-3 text-center text-sm font-bold text-white"
        >
          Call SureDrop
        </a>
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl bg-mist px-4 py-3 text-center text-sm font-bold ring-1 ring-line"
        >
          WhatsApp
        </a>
      </div>

      {!alreadyFlagged && !sent && (
        <div className="mt-3">
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full text-center text-sm font-semibold text-lagoon"
            >
              Report an issue
            </button>
          ) : (
            <div className="rounded-2xl bg-mist p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                What’s wrong?
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ISSUES.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setIssue(i.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      issue === i.id
                        ? 'bg-ink text-white'
                        : 'bg-paper text-muted ring-1 ring-line'
                    }`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={submitReport}
                  className="btn-primary flex-1 !py-2.5 text-sm"
                >
                  Submit report
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-paper px-4 py-2.5 text-sm font-bold ring-1 ring-line"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
