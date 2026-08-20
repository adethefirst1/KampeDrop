import { useState } from 'react'
import { formatNaira } from '../data/vendors'
import { initializePaystackPayment } from '../lib/paystackApi'
import type { OpsOrder } from '../data/ops'

type Props = {
  order: Pick<OpsOrder, 'id' | 'total' | 'paymentState'> & {
    payment: 'card' | 'transfer'
  }
  emailHint?: string
  onPaidRefresh?: () => void
}

/**
 * Paystack hosted checkout for card or bank_transfer (virtual account).
 * Replaces the old static-account TransferPayPanel for transfer orders.
 */
export function PaystackPayPanel({
  order,
  emailHint = '',
  onPaidRefresh,
}: Props) {
  const state = order.paymentState ?? (order.payment === 'card' ? 'card_pending' : 'transfer_pending')
  const [email, setEmail] = useState(emailHint)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isTransfer = order.payment === 'transfer'
  const paid =
    state === 'card_paid' ||
    state === 'transfer_confirmed' ||
    state === 'released'
  const failed = state === 'card_failed'

  if (paid) {
    return (
      <div className="mt-4 rounded-2xl border border-lagoon/30 bg-lagoon/10 px-4 py-3 text-sm font-semibold text-lagoon">
        {isTransfer ? 'Bank transfer received' : 'Card payment received'} ·{' '}
        {formatNaira(order.total)}. Escrow releases at handoff passkey.
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
    <div className="mt-4 rounded-2xl border-[2px] border-dusk bg-paper p-4">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-lagoon">
        {isTransfer ? 'Bank transfer (Paystack)' : 'Card payment'}
      </p>
      {failed ? (
        <p className="mt-2 text-sm font-semibold text-mango-deep">
          Payment didn’t go through. Try again below.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          {isTransfer
            ? `Paystack will show a one-time account for exactly ${formatNaira(order.total)}. This page updates when the transfer lands.`
            : `Complete Paystack checkout for ${formatNaira(order.total)}. This page updates when payment succeeds.`}
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
            ? 'Get bank details'
            : 'Pay with card'}
      </button>

      {onPaidRefresh && (
        <button
          type="button"
          className="mt-2 w-full text-center text-xs font-bold text-lagoon"
          onClick={onPaidRefresh}
        >
          I’ve paid — refresh status
        </button>
      )}
    </div>
  )
}
