import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useVendor } from '../../context/VendorContext'
import { formatNaira } from '../../data/vendors'
import {
  getVendorWallet,
  requestVendorWithdrawal,
  type VendorWalletSnapshot,
} from '../../lib/vendorsApi'

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function statusTone(status: string) {
  if (status === 'paid') return 'bg-ok/15 text-ok'
  if (status === 'rejected') return 'bg-mango/15 text-mango-deep'
  return 'bg-dusk/40 text-ink'
}

export function VendorWalletPage() {
  const { accessToken } = useVendor()
  const [wallet, setWallet] = useState<VendorWalletSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formOk, setFormOk] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setError('Sign in again to view your wallet.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const result = await getVendorWallet(accessToken)
    if (!result.ok) {
      setError(result.reason)
      setWallet(null)
    } else {
      setWallet(result.wallet)
    }
    setLoading(false)
  }, [accessToken])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function onRequest(e: FormEvent) {
    e.preventDefault()
    if (!accessToken || !wallet) return

    const naira = Math.floor(Number(amount.replace(/[^\d]/g, '')))
    setFormError(null)
    setFormOk(null)

    if (!Number.isFinite(naira) || naira <= 0) {
      setFormError('Enter a whole Naira amount.')
      return
    }
    if (naira > wallet.availableToWithdraw) {
      setFormError(
        `Max available is ${formatNaira(wallet.availableToWithdraw)}.`,
      )
      return
    }

    setBusy(true)
    const result = await requestVendorWithdrawal(accessToken, naira)
    setBusy(false)

    if (!result.ok) {
      setFormError(result.reason)
      return
    }

    setAmount('')
    setFormOk(`Withdrawal of ${formatNaira(naira)} requested. We’ll pay out manually.`)
    await refresh()
  }

  const credits =
    wallet?.transactions.filter((t) => t.type === 'order_credit') ?? []

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-dusk">
            Settlements
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.03em]">
            Wallet
          </h1>
          <p className="mt-1.5 text-sm font-semibold leading-snug text-ink-soft">
            Credits land when a passkey confirms handoff. Withdrawals are paid by
            KampeDrop ops.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full bg-ink/8 px-3 py-1.5 text-xs font-bold text-ink-soft ring-1 ring-ink/10"
          onClick={() => void refresh()}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
          {error}
        </p>
      )}

      {wallet && (
        <>
          <div className="mt-6 rounded-[1.5rem] border border-ink/10 bg-paper/90 px-5 py-5 shadow-sm">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
              Wallet balance
            </p>
            <p className="mt-2 font-display text-4xl font-bold tracking-[-0.03em] tabular-nums text-ink">
              {formatNaira(wallet.walletBalance)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/8 pt-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  Available
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-lagoon">
                  {formatNaira(wallet.availableToWithdraw)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  Pending out
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-ink-soft">
                  {formatNaira(wallet.pendingWithdrawalTotal)}
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={onRequest}
            className="mt-5 rounded-[1.25rem] border border-ink/10 bg-paper/80 px-4 py-4"
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-dusk">
              Request withdrawal
            </p>
            <p className="mt-1.5 text-xs font-semibold text-muted">
              We’ll transfer to your registered payout details, then mark it paid.
            </p>
            <label className="mt-3 block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted">
                Amount (₦)
              </span>
              <input
                className="field mt-1.5"
                inputMode="numeric"
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                disabled={busy}
              />
            </label>
            {formError && (
              <p className="mt-2 text-sm font-semibold text-mango-deep">{formError}</p>
            )}
            {formOk && (
              <p className="mt-2 text-sm font-semibold text-ok">{formOk}</p>
            )}
            <button
              type="submit"
              className="btn-ink mt-3 w-full disabled:opacity-60"
              disabled={busy || wallet.availableToWithdraw <= 0}
            >
              {busy ? 'Requesting…' : 'Request withdrawal'}
            </button>
          </form>

          <section className="mt-8">
            <h2 className="font-display text-lg font-bold tracking-[-0.02em]">
              Credits
            </h2>
            <p className="mt-1 text-xs font-semibold text-muted">
              Order handoffs that funded this wallet.
            </p>
            {!credits.length ? (
              <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-muted">
                No credits yet. They appear when a buyer’s passkey confirms delivery.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {credits.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-paper/90 px-3.5 py-3 ring-1 ring-ink/8"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">
                        Order credit
                        {tx.orderId ? (
                          <span className="font-semibold text-muted">
                            {' '}
                            · {tx.orderId.slice(0, 8)}…
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-muted">
                        {formatWhen(tx.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-extrabold tabular-nums text-ok">
                      +{formatNaira(tx.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h2 className="font-display text-lg font-bold tracking-[-0.02em]">
              Withdrawals
            </h2>
            {!wallet.withdrawals.length ? (
              <p className="mt-4 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-muted">
                No withdrawal requests yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {wallet.withdrawals.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-paper/90 px-3.5 py-3 ring-1 ring-ink/8"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold tabular-nums text-ink">
                          {formatNaira(w.amount)}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${statusTone(w.status)}`}
                        >
                          {w.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] font-semibold text-muted">
                        Requested {formatWhen(w.requestedAt)}
                        {w.resolvedAt ? ` · Resolved ${formatWhen(w.resolvedAt)}` : ''}
                      </p>
                      {w.note && (
                        <p className="mt-1 truncate text-[11px] text-ink-soft">{w.note}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {loading && !wallet && (
        <p className="mt-8 text-center text-sm font-semibold text-muted">
          Loading wallet…
        </p>
      )}
    </div>
  )
}
