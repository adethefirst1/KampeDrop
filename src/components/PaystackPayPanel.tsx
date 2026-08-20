import { useState } from 'react'
import { formatNaira } from '../data/vendors'
import { initializePaystackPayment } from '../lib/paystackApi'
import type { OpsOrder } from '../data/ops'

type Props = {
  order: Pick<OpsOrder, 'id' | 'total' | 'paymentState'> & {
    payment: 'card' | 'transfer'
  }
  /** True while we know user just returned from Paystack / verify in flight */
  confirming?: boolean
  emailHint?: string
  onRetryRefresh?: () => void
}

function isPaidState(state: string | undefined): boolean {
  return (
    state === 'card_paid' ||
    state === 'transfer_confirmed' ||
    state === 'released'
  )
}

/**
 * Track payment strip — status first, not a second checkout form.
 * Modes: confirming | paid | failed | unpaid
 */
export function PaystackPayPanel({
  order,
  confirming = false,
  emailHint = '',
  onRetryRefresh,
}: Props) {
  const state =
    order.paymentState ??
    (order.payment === 'card' ? 'card_pending' : 'transfer_pending')
  const [email, setEmail] = useState(emailHint)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isTransfer = order.payment === 'transfer'
  const paid = isPaidState(state)
  const failed = state === 'card_failed'

  if (paid) {
    return (
      <div className="mt-4 rounded-2xl bg-lagoon/10 px-4 py-3 ring-1 ring-lagoon/25">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-lagoon">
          Payment received
        </p>
        <p className="mt-1 text-sm font-semibold text-ink">
          {isTransfer ? 'Bank transfer' : 'Card'} · {formatNaira(order.total)}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Held until handoff passkey — vendor isn’t paid yet.
        </p>
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="mt-4 rounded-2xl bg-mist px-4 py-4 ring-1 ring-line">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-lagoon">
          Confirming payment
        </p>
        <p className="mt-1.5 text-sm font-semibold text-ink">
          Checking Paystack for {formatNaira(order.total)}…
        </p>
        <p className="mt-1 text-xs text-muted">
          This usually takes a few seconds. You don’t need to pay again.
        </p>
      </div>
    )
  }

  async function payAgain() {
    if (!email.trim()) {
      setError('Enter the email you use for Paystack.')
      return
    }
    setBusy(true)
    setError(null)
    const result = await initializePaystackPayment({
      orderId: order.id,
      email: email.trim(),
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    window.location.href = result.authorizationUrl
  }

  return (
    <div className="mt-4 rounded-2xl bg-paper px-4 py-4 ring-1 ring-line">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
        {isTransfer ? 'Bank transfer' : 'Card payment'}
      </p>
      {failed ? (
        <p className="mt-1.5 text-sm font-semibold text-mango-deep">
          Payment didn’t go through. You can try once more.
        </p>
      ) : (
        <p className="mt-1.5 text-sm text-muted">
          {isTransfer
            ? `Pay exactly ${formatNaira(order.total)} via a Paystack account.`
            : `Complete card payment for ${formatNaira(order.total)}.`}
        </p>
      )}

      <label className="mt-3 block">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Email for receipt
        </span>
        <input
          className="field mt-1.5"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          disabled={busy}
        />
      </label>

      {error && (
        <p className="mt-2 text-sm font-semibold text-mango-deep">{error}</p>
      )}

      <button
        type="button"
        className="btn-primary mt-3 w-full"
        disabled={busy}
        onClick={() => void payAgain()}
      >
        {busy
          ? 'Opening Paystack…'
          : isTransfer
            ? 'Continue to bank transfer'
            : 'Continue to card payment'}
      </button>

      {onRetryRefresh && (
        <button
          type="button"
          className="mt-2 w-full text-center text-xs font-semibold text-muted hover:text-ink"
          onClick={onRetryRefresh}
        >
          Refresh status
        </button>
      )}
    </div>
  )
}
