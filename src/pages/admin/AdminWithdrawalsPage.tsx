import { useCallback, useEffect, useState } from 'react'
import { RequireOps } from './AdminShell'
import { formatNaira } from '../../data/vendors'
import {
  fetchOpsPendingWithdrawals,
  fetchOpsResolvedWithdrawals,
  initiateWithdrawalPayout,
  markWithdrawalPaid,
  rejectWithdrawal,
  type OpsWithdrawalRequest,
} from '../../lib/vendorsApi'

type Tab = 'pending' | 'history'

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
  if (status === 'rejected' || status === 'failed') return 'bg-mango/15 text-mango-deep'
  if (status === 'needs_otp') return 'bg-mango/15 text-mango-deep'
  if (status === 'processing') return 'bg-lagoon/15 text-lagoon'
  return 'bg-dusk/40 text-ink'
}

export function AdminWithdrawalsPage() {
  return (
    <RequireOps>
      <AdminWithdrawalsInner />
    </RequireOps>
  )
}

function AdminWithdrawalsInner() {
  const [tab, setTab] = useState<Tab>('pending')
  const [pending, setPending] = useState<OpsWithdrawalRequest[]>([])
  const [history, setHistory] = useState<OpsWithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionOk, setActionOk] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [pendingResult, historyResult] = await Promise.all([
      fetchOpsPendingWithdrawals(),
      fetchOpsResolvedWithdrawals(),
    ])

    if (!pendingResult.ok) {
      setError(pendingResult.reason)
      setPending([])
    } else {
      setPending(pendingResult.requests)
    }

    if (!historyResult.ok) {
      setError((prev) => prev ?? historyResult.reason)
      setHistory([])
    } else {
      setHistory(historyResult.requests)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function onApprove(req: OpsWithdrawalRequest) {
    const ok = window.confirm(
      `Approve Paystack payout of ${formatNaira(req.amount)} to ${req.vendorName}?\n\nThis initiates a real transfer. Final Paid comes from the Paystack webhook.`,
    )
    if (!ok) return

    setBusyId(req.id)
    setActionError(null)
    setActionOk(null)
    const result = await initiateWithdrawalPayout({ withdrawalId: req.id })
    setBusyId(null)

    if (!result.ok) {
      setActionError(result.reason)
      await refresh()
      return
    }

    if (result.payout.needsOtp) {
      setActionOk(
        `Transfer needs OTP in Paystack for ${req.vendorName}. Complete Finalize Transfer there; webhook will mark Paid.`,
      )
    } else {
      setActionOk(
        `Paystack transfer initiated for ${req.vendorName}. Waiting for webhook to mark Paid.`,
      )
    }
    await refresh()
  }

  async function onManualPaid(req: OpsWithdrawalRequest) {
    const note = window.prompt(
      `MANUAL OVERRIDE — mark ${formatNaira(req.amount)} paid for ${req.vendorName} without Paystack?\n\nUse only for emergencies (e.g. Paystack outage) after you already sent money yourself.\n\nOptional note:`,
      'Manual override — paid outside Paystack',
    )
    if (note === null) return

    const confirmed = window.confirm(
      `Confirm manual mark paid for ${req.vendorName} (${formatNaira(req.amount)})?\n\nThis does not call Paystack.`,
    )
    if (!confirmed) return

    setBusyId(req.id)
    setActionError(null)
    setActionOk(null)
    const result = await markWithdrawalPaid(req.id, note)
    setBusyId(null)

    if (!result.ok) {
      setActionError(result.reason)
      return
    }
    setActionOk(`Marked paid manually for ${req.vendorName}.`)
    await refresh()
  }

  async function onReject(req: OpsWithdrawalRequest) {
    const note = window.prompt(
      `Reject ${formatNaira(req.amount)} for ${req.vendorName}?\n\nOptional reason:`,
      '',
    )
    if (note === null) return

    setBusyId(req.id)
    setActionError(null)
    setActionOk(null)
    const result = await rejectWithdrawal(req.id, note)
    setBusyId(null)

    if (!result.ok) {
      setActionError(result.reason)
      return
    }
    await refresh()
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lagoon">
            Payouts
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em]">
            Withdrawal requests
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
            Approve starts a real Paystack transfer. Paid is set by webhook.
            Use Manual override only if you paid outside Paystack (e.g. outage).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink-soft"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div
        className="mt-5 flex gap-1 rounded-full bg-mist/80 p-1"
        role="tablist"
        aria-label="Withdrawal views"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'pending'}
          onClick={() => setTab('pending')}
          className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition ${
            tab === 'pending' ? 'bg-ink text-white' : 'text-muted hover:text-ink'
          }`}
        >
          Pending / in flight
          {pending.length > 0 ? (
            <span className="ml-1.5 tabular-nums opacity-80">({pending.length})</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          onClick={() => setTab('history')}
          className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition ${
            tab === 'history' ? 'bg-ink text-white' : 'text-muted hover:text-ink'
          }`}
        >
          History
          {history.length > 0 ? (
            <span className="ml-1.5 tabular-nums opacity-80">({history.length})</span>
          ) : null}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
          {error}
        </p>
      )}
      {actionError && (
        <p className="mt-3 rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
          {actionError}
        </p>
      )}
      {actionOk && (
        <p className="mt-3 rounded-xl bg-ok/15 px-3 py-2 text-sm font-semibold text-ok">
          {actionOk}
        </p>
      )}

      {tab === 'pending' && (
        <>
          {!loading && !pending.length && !error && (
            <div className="mt-8 rounded-2xl border border-dashed border-line bg-paper px-5 py-10 text-center">
              <p className="font-display text-lg font-semibold">No pending requests</p>
              <p className="mt-2 text-sm text-muted">
                Large withdrawals (≥ threshold) wait here for your Approve.
              </p>
            </div>
          )}

          <ul className="mt-6 space-y-3">
            {pending.map((req) => {
              const isPending = req.status === 'pending'
              const needsOtp = req.status === 'needs_otp'
              const isProcessing = req.status === 'processing'
              return (
              <li
                key={req.id}
                className="rounded-2xl border border-line/80 bg-paper px-4 py-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-semibold tracking-[-0.02em]">
                        {req.vendorName}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${statusTone(req.status)}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                      {formatNaira(req.amount)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted">
                      Requested {formatWhen(req.requestedAt)}
                    </p>
                    {needsOtp && (
                      <p className="mt-2 text-xs font-semibold text-mango-deep">
                        Complete OTP in the Paystack dashboard (Finalize Transfer).
                        Webhook will mark Paid.
                      </p>
                    )}
                    {isProcessing && (
                      <p className="mt-2 text-xs font-semibold text-lagoon">
                        Paystack transfer in flight — waiting for webhook.
                      </p>
                    )}
                    {req.note && (
                      <p className="mt-1 text-xs text-ink-soft">{req.note}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          disabled={busyId === req.id}
                          onClick={() => void onApprove(req)}
                          className="rounded-full bg-ink px-4 py-2 text-xs font-bold text-dusk disabled:opacity-60"
                        >
                          {busyId === req.id ? 'Starting payout…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === req.id}
                          onClick={() => void onReject(req)}
                          className="rounded-full bg-mist px-4 py-2 text-xs font-bold text-ink-soft ring-1 ring-line disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => void onManualPaid(req)}
                      className="rounded-full px-4 py-2 text-[11px] font-bold text-mango-deep underline-offset-2 hover:underline disabled:opacity-60"
                    >
                      Mark paid manually
                    </button>
                  </div>
                </div>
              </li>
              )
            })}
          </ul>
        </>
      )}

      {tab === 'history' && (
        <>
          {!loading && !history.length && !error && (
            <div className="mt-8 rounded-2xl border border-dashed border-line bg-paper px-5 py-10 text-center">
              <p className="font-display text-lg font-semibold">No history yet</p>
              <p className="mt-2 text-sm text-muted">
                Paid and rejected withdrawals will appear here.
              </p>
            </div>
          )}

          <ul className="mt-6 space-y-3">
            {history.map((req) => (
              <li
                key={req.id}
                className="rounded-2xl border border-line/80 bg-paper px-4 py-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-semibold tracking-[-0.02em]">
                        {req.vendorName}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${statusTone(req.status)}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xl font-bold tabular-nums text-ink">
                      {formatNaira(req.amount)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted">
                      Requested {formatWhen(req.requestedAt)}
                      {req.resolvedAt
                        ? ` · Resolved ${formatWhen(req.resolvedAt)}`
                        : ''}
                    </p>
                    {req.note && (
                      <p className="mt-2 rounded-xl bg-mist/80 px-3 py-2 text-xs font-semibold text-ink-soft">
                        {req.note}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
