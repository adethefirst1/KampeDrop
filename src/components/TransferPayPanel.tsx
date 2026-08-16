import { useState } from 'react'
import { formatNaira } from '../data/vendors'
import { SITE } from '../data/site'
import type { OpsOrder } from '../data/ops'
import type { PlacedOrder } from '../context/CartContext'

type OrderLike = Pick<
  PlacedOrder,
  'id' | 'total' | 'payment' | 'escrowState'
> & {
  paymentState?: OpsOrder['paymentState']
}

type Props = {
  order: OrderLike
  onClaimPaid: () => { ok: true } | { ok: false; reason: string }
}

export function TransferPayPanel({ order, onClaimPaid }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const acct = SITE.transferAccount
  const state = order.paymentState ?? 'transfer_pending'

  if (order.payment !== 'transfer') return null
  if (order.escrowState === 'refunded') return null

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      setCopied(null)
    }
  }

  function claim() {
    const result = onClaimPaid()
    setError(result.ok ? null : result.reason)
  }

  const confirmed =
    state === 'transfer_confirmed' ||
    state === 'released' ||
    order.escrowState === 'released'
  const claimed = state === 'transfer_seen'
  const pending = state === 'transfer_pending' || state === 'held'

  return (
    <section className="mt-5 rounded-[1.5rem] bg-paper p-4 ring-1 ring-line">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-lagoon">
        Pay by transfer
      </p>
      <p className="mt-2 text-sm text-muted">
        Send exactly{' '}
        <span className="font-bold text-ink">{formatNaira(order.total)}</span> to
        SureDrop escrow. Use order ID as narration.
      </p>

      <div className="mt-4 space-y-2 rounded-2xl bg-mist p-3">
        <CopyRow
          label="Bank"
          value={acct.bankName}
          copied={copied === 'Bank'}
          onCopy={() => void copy('Bank', acct.bankName)}
        />
        <CopyRow
          label="Account name"
          value={acct.accountName}
          copied={copied === 'Name'}
          onCopy={() => void copy('Name', acct.accountName)}
        />
        <CopyRow
          label="Account number"
          value={acct.accountNumber}
          copied={copied === 'Number'}
          onCopy={() => void copy('Number', acct.accountNumber)}
        />
        <CopyRow
          label="Narration"
          value={order.id}
          copied={copied === 'Narration'}
          onCopy={() => void copy('Narration', order.id)}
        />
      </div>

      {pending && (
        <>
          <button type="button" onClick={claim} className="btn-primary mt-4 w-full">
            I’ve paid
          </button>
          <p className="mt-2 text-center text-xs text-muted">
            We’ll confirm the transfer, then match your rider.
          </p>
        </>
      )}

      {claimed && (
        <p className="mt-4 rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
          Thanks — we’re confirming your transfer. Hang tight.
        </p>
      )}

      {confirmed && (
        <p className="mt-4 rounded-xl bg-lagoon/15 px-3 py-2 text-sm font-semibold text-lagoon-deep">
          Transfer confirmed. Payment held until pickup.
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
      )}
    </section>
  )
}

function CopyRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string
  value: string
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
          {label}
        </p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 rounded-lg bg-paper px-2.5 py-1.5 text-[11px] font-bold ring-1 ring-line"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
