import { useState } from 'react'
import { formatNaira } from '../data/vendors'
import { initializePaystackPayment } from '../lib/paystackApi'
import type { OpsOrder } from '../data/ops'

type Props = {
  order: Pick<OpsOrder, 'id' | 'total' | 'paymentState'> & {
    payment: 'card' | 'transfer'
  }
  /** Phone on the order — used to resume Paystack if checkout email isn’t cached */
  phone?: string
  /**
   * User just returned from Paystack success — treat as paid in the UI.
   * Server verify still runs in the background on Track.
   */
  justPaid?: boolean
  onRetryRefresh?: () => void
  /** Opens the playful keepsake receipt after payment */
  onViewReceipt?: () => void
}

function isPaidState(state: string | undefined): boolean {
  return (
    state === 'card_paid' ||
    state === 'transfer_confirmed' ||
    state === 'released'
  )
}

export function payEmailStorageKey(orderId: string) {
  return `kampedrop-pay-email-${orderId}`
}

export function rememberPayEmail(orderId: string, email: string) {
  try {
    sessionStorage.setItem(payEmailStorageKey(orderId), email.trim())
  } catch {
    /* ignore */
  }
}

export function markOrderPaidLocally(orderId: string) {
  try {
    sessionStorage.setItem(`kampedrop-paid-${orderId}`, '1')
  } catch {
    /* ignore */
  }
}

export function wasOrderPaidLocally(orderId: string): boolean {
  try {
    return sessionStorage.getItem(`kampedrop-paid-${orderId}`) === '1'
  } catch {
    return false
  }
}

function resolvePayEmail(orderId: string, phone?: string): string | null {
  try {
    const cached = sessionStorage.getItem(payEmailStorageKey(orderId))?.trim()
    if (cached && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cached)) return cached
  } catch {
    /* ignore */
  }
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.length >= 10) return `${digits}@orders.kampedrop.app`
  return null
}

function PaidStrip({
  isTransfer,
  total,
  onViewReceipt,
}: {
  isTransfer: boolean
  total: number
  onViewReceipt?: () => void
}) {
  return (
    <div className="mt-4 rounded-2xl bg-lagoon/10 px-4 py-3 ring-1 ring-lagoon/25">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-lagoon">
            Payment received
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {isTransfer ? 'Bank transfer' : 'Card'} · {formatNaira(total)}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Held until handoff passkey — vendor isn’t paid yet.
          </p>
        </div>
        {onViewReceipt && (
          <button
            type="button"
            onClick={onViewReceipt}
            className="shrink-0 rounded-full bg-paper px-2.5 py-1 text-[11px] font-bold text-lagoon ring-1 ring-lagoon/25 transition hover:bg-white"
          >
            View receipt
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Track payment strip — status first, not a second checkout form.
 * Return from Paystack = payment made → paid strip + receipt (not “confirming”).
 */
export function PaystackPayPanel({
  order,
  phone,
  justPaid = false,
  onRetryRefresh,
  onViewReceipt,
}: Props) {
  const state =
    order.paymentState ??
    (order.payment === 'card' ? 'card_pending' : 'transfer_pending')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isTransfer = order.payment === 'transfer'
  const paid =
    isPaidState(state) || justPaid || wasOrderPaidLocally(order.id)
  const failed = state === 'card_failed' && !paid

  if (paid) {
    return (
      <PaidStrip
        isTransfer={isTransfer}
        total={order.total}
        onViewReceipt={onViewReceipt}
      />
    )
  }

  async function payAgain() {
    const email = resolvePayEmail(order.id, phone)
    if (!email) {
      setError('Couldn’t resume payment. Open checkout again from your cart.')
      return
    }
    setBusy(true)
    setError(null)
    const result = await initializePaystackPayment({
      orderId: order.id,
      email,
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
