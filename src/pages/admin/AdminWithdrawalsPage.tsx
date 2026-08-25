import { useCallback, useEffect, useState } from 'react'
import { RequireOps } from './AdminShell'
import { formatNaira } from '../../data/vendors'
import {
  fetchOpsPendingWithdrawals,
  fetchOpsResolvedWithdrawals,
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
  if (status === 'rejected') return 'bg-mango/15 text-mango-deep'
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

  async function onMarkPaid(req: OpsWithdrawalRequest) {
    const note = window.prompt(
      `Mark ${formatNaira(req.amount)} paid for ${req.vendorName}?\n\nOptional note (e.g. transfer reference):`,
      '',
    )
    if (note === null) return

    setBusyId(req.id)
    setActionError(null)
    const result = await markWithdrawalPaid(req.id, note)
    setBusyId(null)

    if (!result.ok) {
      setActionError(result.reason)
      return
    }
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
            Pending: send the bank transfer, then mark paid. History keeps paid
            and rejected requests for your records.
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
          Pending
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
          Paid / Rejected
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

      {tab === 'pending' && (
        <>
          {!loading && !pending.length && !error && (
            <div className="mt-8 rounded-2xl border border-dashed border-line bg-paper px-5 py-10 text-center">
              <p className="font-display text-lg font-semibold">No pending requests</p>
              <p className="mt-2 text-sm text-muted">
                When a vendor requests a withdrawal, it shows up here.
              </p>
            </div>
          )}

          <ul className="mt-6 space-y-3">
            {pending.map((req) => (
              <li
                key={req.id}
                className="rounded-2xl border border-line/80 bg-paper px-4 py-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold tracking-[-0.02em]">
                      {req.vendorName}
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                      {formatNaira(req.amount)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted">
                      Requested {formatWhen(req.requestedAt)}
                    </p>
                    {req.note && (
                      <p className="mt-1 text-xs text-ink-soft">{req.note}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => void onMarkPaid(req)}
                      className="rounded-full bg-ink px-4 py-2 text-xs font-bold text-dusk disabled:opacity-60"
                    >
                      {busyId === req.id ? 'Working…' : 'Mark as paid'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => void onReject(req)}
                      className="rounded-full bg-mist px-4 py-2 text-xs font-bold text-ink-soft ring-1 ring-line disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
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
