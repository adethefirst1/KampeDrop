import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  listVendorPayoutBanks,
  maskAccountNumber,
  resolveVendorBankAccount,
  saveVendorBankDetails,
  type PaystackBankOption,
  type VendorBankDetails,
} from '../../lib/vendorsApi'

type Props = {
  accessToken: string
  bank: VendorBankDetails
  onSaved: () => void | Promise<void>
}

type Step = 'form' | 'confirm'

export function VendorBankDetailsSection({ accessToken, bank, onSaved }: Props) {
  const hasBank = bank.hasRecipient && Boolean(bank.accountNumber)
  const [editing, setEditing] = useState(!hasBank)

  const [banks, setBanks] = useState<PaystackBankOption[]>([])
  const [banksLoading, setBanksLoading] = useState(false)
  const [banksError, setBanksError] = useState<string | null>(null)

  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [resolvedName, setResolvedName] = useState<string | null>(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedBank = banks.find((b) => b.code === bankCode)

  const loadBanks = useCallback(async () => {
    setBanksLoading(true)
    setBanksError(null)
    const result = await listVendorPayoutBanks(accessToken)
    setBanksLoading(false)
    if (!result.ok) {
      setBanksError(result.reason)
      setBanks([])
      return
    }
    setBanks(result.banks)
  }, [accessToken])

  useEffect(() => {
    if (!editing) return
    void loadBanks()
  }, [editing, loadBanks])

  function resetForm(prefill?: VendorBankDetails) {
    setBankCode(prefill?.bankCode ?? '')
    setAccountNumber(prefill?.accountNumber ?? '')
    setStep('form')
    setResolvedName(null)
    setError(null)
  }

  function startUpdate() {
    resetForm(bank)
    setEditing(true)
  }

  function cancelUpdate() {
    if (!hasBank) return
    setEditing(false)
    resetForm()
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const result = await resolveVendorBankAccount(accessToken, {
      bankCode,
      accountNumber,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.reason)
      setStep('form')
      setResolvedName(null)
      return
    }
    setAccountNumber(result.accountNumber)
    setResolvedName(result.accountName)
    setStep('confirm')
  }

  async function onSave() {
    if (!resolvedName || !selectedBank) {
      setError('Verify the account before saving.')
      return
    }
    setError(null)
    setBusy(true)
    const result = await saveVendorBankDetails(accessToken, {
      bankCode,
      bankName: selectedBank.name,
      accountNumber,
      accountName: resolvedName,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setEditing(false)
    resetForm()
    await onSaved()
  }

  if (!editing && hasBank) {
    return (
      <section className="mt-5 rounded-[1.25rem] border border-ink/10 bg-paper/80 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-dusk">
              Bank details
            </p>
            <p className="mt-1.5 text-xs font-semibold text-muted">
              Withdrawals pay out to this verified account.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full bg-ink/8 px-3 py-1.5 text-xs font-bold text-ink-soft ring-1 ring-ink/10"
            onClick={startUpdate}
          >
            Update
          </button>
        </div>
        <dl className="mt-4 space-y-2.5">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Bank
            </dt>
            <dd className="mt-0.5 text-sm font-bold text-ink">
              {bank.bankName ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Account number
            </dt>
            <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-ink">
              {maskAccountNumber(bank.accountNumber)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Account name
            </dt>
            <dd className="mt-0.5 text-sm font-bold text-ink">
              {bank.accountName ?? '—'}
            </dd>
          </div>
        </dl>
      </section>
    )
  }

  return (
    <section className="mt-5 rounded-[1.25rem] border border-lagoon/25 bg-paper/90 px-4 py-4 ring-1 ring-lagoon/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-dusk">
            {hasBank ? 'Update bank details' : 'Add bank details'}
          </p>
          <p className="mt-1.5 text-xs font-semibold text-muted">
            Required before you can request a withdrawal. We verify the account
            with Paystack — you confirm the name matches.
          </p>
        </div>
        {hasBank && (
          <button
            type="button"
            className="shrink-0 text-xs font-bold text-ink-soft underline-offset-2 hover:underline"
            onClick={cancelUpdate}
            disabled={busy}
          >
            Cancel
          </button>
        )}
      </div>

      {banksError && (
        <div className="mt-3 rounded-xl bg-mango/15 px-3 py-2">
          <p className="text-sm font-semibold text-mango-deep">{banksError}</p>
          <button
            type="button"
            className="mt-1 text-xs font-bold text-mango-deep underline"
            onClick={() => void loadBanks()}
          >
            Retry loading banks
          </button>
        </div>
      )}

      {step === 'form' ? (
        <form onSubmit={onVerify} className="mt-3 space-y-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              Bank
            </span>
            <select
              className="field mt-1.5"
              value={bankCode}
              onChange={(e) => {
                setBankCode(e.target.value)
                setResolvedName(null)
                setError(null)
              }}
              disabled={busy || banksLoading || !banks.length}
              required
            >
              <option value="">
                {banksLoading ? 'Loading banks…' : 'Select your bank'}
              </option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              Account number
            </span>
            <input
              className="field mt-1.5 font-mono tabular-nums"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              placeholder="10-digit NUBAN"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                setResolvedName(null)
                setError(null)
              }}
              disabled={busy}
              required
            />
          </label>

          {error && (
            <p className="rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-ink w-full disabled:opacity-60"
            disabled={
              busy ||
              banksLoading ||
              !bankCode ||
              accountNumber.length !== 10
            }
          >
            {busy ? 'Verifying with Paystack…' : 'Verify account'}
          </button>
        </form>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="rounded-2xl bg-lagoon/10 px-3.5 py-3 ring-1 ring-lagoon/20">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-lagoon">
              Paystack account name
            </p>
            <p className="mt-1.5 font-display text-lg font-bold tracking-[-0.02em] text-ink">
              {resolvedName}
            </p>
            <p className="mt-2 text-xs font-semibold text-ink-soft">
              {selectedBank?.name ?? 'Bank'} · {accountNumber}
            </p>
            <p className="mt-2 text-xs font-semibold text-muted">
              Confirm this is your business account before saving. If the name
              is wrong, go back and check the number.
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="btn-ink flex-1 disabled:opacity-60"
              onClick={() => void onSave()}
              disabled={busy}
            >
              {busy ? 'Saving…' : 'Yes, save this account'}
            </button>
            <button
              type="button"
              className="rounded-full bg-ink/8 px-4 py-2.5 text-sm font-bold text-ink-soft ring-1 ring-ink/10 disabled:opacity-60"
              onClick={() => {
                setStep('form')
                setResolvedName(null)
                setError(null)
              }}
              disabled={busy}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
