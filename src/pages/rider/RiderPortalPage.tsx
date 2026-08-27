import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AddToHomeScreenTip } from '../../components/AddToHomeScreenGuide'
import { useCatalog } from '../../context/CatalogContext'
import { labelForStatus, type OpsStatus } from '../../data/ops'
import type { Fulfillment } from '../../context/CartContext'
import { curatedLandmarks } from '../../data/places'
import { formatNaira } from '../../data/vendors'
import { SITE } from '../../data/site'
import { springSoft } from '../../motion/tokens'
import {
  getRiderMe,
  getRiderOrderHistory,
  getRiderOrders,
  getRiderWallet,
  riderUserFacingError,
  rotateRiderToken,
  setRiderAvailability,
  updateOrderStatusByRider,
  zoneLabel,
  type RiderMe,
  type RiderPortalOrder,
} from '../../lib/ridersApi'
import { RiderWalletPanel } from './RiderWalletPanel'

type BoardTab = 'active' | 'history' | 'wallet'

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function orderVendorBits(
  order: RiderPortalOrder,
  getVendor: (id: string) =>
    | { name: string; pickupSpot?: string; area?: string }
    | undefined,
) {
  const vendor = order.vendorId ? getVendor(order.vendorId) : undefined
  const lineVendorName =
    order.lines.find((l) => l.vendorName)?.vendorName ?? null
  const vendorName = vendor?.name ?? lineVendorName ?? 'Vendor'
  const pickupSpot = vendor?.pickupSpot || vendor?.area || 'Pickup at vendor'
  return { vendorName, pickupSpot }
}

/** Shared pickup / drop-off / customer / items block (active + history receipt). */
function RiderOrderDetails({
  order,
  vendorName,
  pickupSpot,
}: {
  order: RiderPortalOrder
  vendorName: string
  pickupSpot: string
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
          Pickup
        </p>
        <p className="mt-0.5 text-sm font-bold">{vendorName}</p>
        <p className="text-xs font-semibold text-ink-soft">{pickupSpot}</p>
      </div>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
          Drop-off
        </p>
        {order.placeName && (
          <p className="mt-0.5 text-sm font-bold text-lagoon">{order.placeName}</p>
        )}
        <p className="text-xs font-semibold text-ink-soft">{order.address}</p>
      </div>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
          Customer
        </p>
        <p className="mt-0.5 text-sm font-bold">{order.customerName}</p>
        <a
          href={`tel:${order.phone}`}
          className="text-xs font-bold text-lagoon underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {order.phone}
        </a>
      </div>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
          Items
        </p>
        <ul className="mt-1 space-y-0.5">
          {order.lines.map((line, i) => (
            <li
              key={`${order.id}-line-${i}`}
              className="text-xs font-semibold text-ink-soft"
            >
              {line.qty}× {line.name}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] font-bold tabular-nums text-muted">
          {formatNaira(order.total)} total
        </p>
      </div>
    </div>
  )
}

/** Bottom sheet — same pattern as vendor history receipt (read-only). */
function RiderHistorySheet({
  order,
  vendorName,
  pickupSpot,
  open,
  onClose,
}: {
  order: RiderPortalOrder | null
  vendorName: string
  pickupSpot: string
  open: boolean
  onClose: () => void
}) {
  const reduce = useReducedMotion()
  if (!order) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rider-history-title"
            className="relative z-10 flex max-h-[88svh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] border border-ink/15 bg-paper shadow-[0_-8px_40px_rgba(6,24,28,0.25)] sm:rounded-[1.75rem]"
            initial={reduce ? false : { y: 40, opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: 28, opacity: 0 }}
            transition={springSoft}
          >
            <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-dusk">
                  Delivery receipt
                </p>
                <p
                  id="rider-history-title"
                  className="mt-0.5 truncate font-mono text-[11px] font-bold text-muted"
                >
                  {order.id}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full bg-ink/8 px-3 py-1.5 text-xs font-bold text-ink-soft ring-1 ring-ink/10"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ok">
                  {labelForStatus(
                    order.status as OpsStatus,
                    order.fulfillment as Fulfillment,
                  )}
                </span>
                <span className="text-[11px] font-semibold text-muted">
                  {formatWhen(order.createdAt)}
                </span>
              </div>

              <div className="mt-4">
                <RiderOrderDetails
                  order={order}
                  vendorName={vendorName}
                  pickupSpot={pickupSpot}
                />
              </div>
            </div>

            <div className="border-t border-ink/10 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <p className="text-center text-[11px] font-semibold text-muted">
                {SITE.name} · Completed run · read-only
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function RiderPortalPage() {
  const [params] = useSearchParams()
  const token = (params.get('token') ?? '').trim()
  const { getVendor } = useCatalog()

  const [tab, setTab] = useState<BoardTab>('active')
  const [rider, setRider] = useState<RiderMe | null>(null)
  const [orders, setOrders] = useState<RiderPortalOrder[]>([])
  const [history, setHistory] = useState<RiderPortalOrder[]>([])
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [zoneDraft, setZoneDraft] = useState('')
  const [availBusy, setAvailBusy] = useState(false)
  const [availError, setAvailError] = useState<string | null>(null)
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<RiderPortalOrder | null>(
    null,
  )

  const onWalletBalanceChange = useCallback((balance: number) => {
    setWalletBalance(balance)
  }, [])

  const refresh = useCallback(async () => {
    if (!token) {
      setError('Missing rider link. Ask ops for your private KampeDrop rider URL.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const me = await getRiderMe(token)
      if (!me.ok) {
        setError(riderUserFacingError(me.reason))
        setRider(null)
        setOrders([])
        setHistory([])
        setWalletBalance(null)
        setLoading(false)
        return
      }

      setRider(me.rider)
      setZoneDraft(me.rider.currentZone ?? '')

      const [openResult, historyResult, walletResult] = await Promise.all([
        getRiderOrders(token),
        getRiderOrderHistory(token),
        getRiderWallet(token),
      ])

      if (!openResult.ok) {
        setError(riderUserFacingError(openResult.reason))
        setOrders([])
      } else {
        setOrders(openResult.orders)
      }

      if (!historyResult.ok) {
        setError((prev) => prev ?? riderUserFacingError(historyResult.reason))
        setHistory([])
      } else {
        setHistory(historyResult.orders)
      }

      if (walletResult.ok) {
        setWalletBalance(walletResult.wallet.walletBalance)
      }

      setLoading(false)
    } catch (err) {
      setError(riderUserFacingError(err))
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function saveAvailability(nextAvailable: boolean, zone: string) {
    if (!token) return
    setAvailBusy(true)
    setAvailError(null)
    const result = await setRiderAvailability(
      token,
      nextAvailable,
      nextAvailable ? zone : null,
    )
    setAvailBusy(false)
    if (!result.ok) {
      setAvailError(riderUserFacingError(result.reason))
      return
    }
    setRider((prev) =>
      prev
        ? {
            ...prev,
            available: result.rider.available,
            currentZone: result.rider.currentZone,
            zoneUpdatedAt: result.rider.zoneUpdatedAt,
          }
        : prev,
    )
    if (result.rider.currentZone) setZoneDraft(result.rider.currentZone)
  }

  async function onToggleAvailable() {
    if (!rider) return
    if (rider.available) {
      await saveAvailability(false, zoneDraft)
      return
    }
    if (!zoneDraft) {
      setAvailError('Pick your current area before going available.')
      return
    }
    await saveAvailability(true, zoneDraft)
  }

  async function onZoneChange(zoneId: string) {
    setZoneDraft(zoneId)
    setAvailError(null)
    if (rider?.available && zoneId) {
      await saveAvailability(true, zoneId)
    }
  }

  async function onStatus(
    orderId: string,
    status: 'on_the_way' | 'delivered',
  ) {
    if (!token) return
    setBusyId(orderId)
    setActionError(null)
    const result = await updateOrderStatusByRider(token, orderId, status)
    setBusyId(null)
    if (!result.ok) {
      setActionError(riderUserFacingError(result.reason))
      return
    }
    await refresh()
    if (status === 'delivered') {
      setTab('history')
    }
  }

  async function onLogoutEverywhere() {
    if (!token || logoutBusy) return
    setLogoutBusy(true)
    setActionError(null)
    const result = await rotateRiderToken(token)
    setLogoutBusy(false)
    if (!result.ok) {
      setActionError(riderUserFacingError(result.reason))
      return
    }
  }

  const landmarkOptions = useMemo(() => curatedLandmarks, [])

  if (!token) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#eef1f0] px-4 text-ink">
        <div className="max-w-sm rounded-[1.5rem] bg-paper px-5 py-8 text-center ring-1 ring-ink/10">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-dusk">
            {SITE.name} · Rider
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold">Private link required</h1>
          <p className="mt-2 text-sm font-semibold text-muted">
            Open the URL ops sent you (it includes your token), or sign in with
            your phone and PIN.
          </p>
          <Link
            to="/rider/login"
            className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-ink px-4 py-3 text-sm font-extrabold text-dusk"
          >
            Sign in with phone + PIN →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-[#eef1f0] text-ink">
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-[#e8eceb]/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-dusk">
              {SITE.name} · Rider
            </p>
            <p className="truncate font-display text-lg font-bold tracking-[-0.02em]">
              {rider?.name ?? 'Rider board'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTab('wallet')}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 shadow-[0_2px_0_rgba(6,24,28,0.35)] transition active:translate-y-px ${
              tab === 'wallet'
                ? 'bg-dusk text-ink ring-1 ring-ink/15'
                : 'bg-ink text-dusk hover:bg-ink-soft'
            }`}
            aria-label={
              walletBalance != null
                ? `Wallet ${formatNaira(walletBalance)}. Open wallet.`
                : 'Open wallet'
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="shrink-0 opacity-90"
            >
              <path
                d="M3.5 8.5A2.5 2.5 0 0 1 6 6h12.5A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20H6A2.5 2.5 0 0 1 3.5 17.5v-9Z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                d="M3.5 10H21"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              <circle cx="16.5" cy="14.5" r="1.25" fill="currentColor" />
            </svg>
            <span className="text-sm font-extrabold tabular-nums leading-none">
              {walletBalance != null ? formatNaira(walletBalance) : '₦—'}
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5 pb-20">
        {tab !== 'wallet' && (
          <AddToHomeScreenTip
            storageKey="kampedrop-rider-home-tip-hidden"
            title="Put your rider board on the home screen"
            body="One tap next time — Safari Share → Add to Home Screen, or Chrome ⋮ → Install app."
          />
        )}

        {error && (
          <p className="rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
            {error}
          </p>
        )}

        {tab !== 'wallet' && rider && (
          <section className="rounded-[1.25rem] border border-ink/10 bg-paper/90 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-dusk">
                  Availability
                </p>
                <p className="mt-1.5 text-xs font-semibold text-muted">
                  When you’re available, ops can see your zone and assign nearby
                  pickups.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="shrink-0 rounded-full bg-ink/8 px-3 py-1.5 text-xs font-bold text-ink-soft ring-1 ring-ink/10"
              >
                {loading ? '…' : 'Refresh'}
              </button>
            </div>

            <label className="mt-3 block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted">
                Current area
              </span>
              <select
                className="field mt-1.5"
                value={zoneDraft}
                onChange={(e) => void onZoneChange(e.target.value)}
                disabled={availBusy}
              >
                <option value="">Select landmark / area</option>
                {landmarkOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} · {l.area}
                  </option>
                ))}
              </select>
            </label>

            {availError && (
              <p className="mt-2 text-sm font-semibold text-mango-deep">{availError}</p>
            )}

            <button
              type="button"
              onClick={() => void onToggleAvailable()}
              disabled={availBusy || (!rider.available && !zoneDraft)}
              className={`mt-3 w-full rounded-full px-4 py-2.5 text-sm font-bold disabled:opacity-60 ${
                rider.available
                  ? 'bg-mist text-ink-soft ring-1 ring-ink/15'
                  : 'bg-ink text-dusk'
              }`}
            >
              {availBusy
                ? 'Updating…'
                : rider.available
                  ? 'I’m offline'
                  : 'I’m available'}
            </button>

            {rider.available && (
              <p className="mt-2 text-center text-[11px] font-semibold text-ok">
                On duty · {zoneLabel(rider.currentZone)}
              </p>
            )}
            {!rider.available && (
              <p className="mt-2 text-center text-[11px] font-semibold text-muted">
                Offline
                {rider.currentZone
                  ? ` · last zone ${zoneLabel(rider.currentZone)}`
                  : ''}
              </p>
            )}
          </section>
        )}

        <div
          className="mt-5 flex gap-1 rounded-full bg-ink/6 p-1"
          role="tablist"
          aria-label="Board"
        >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'active'}
                onClick={() => setTab('active')}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition ${
                  tab === 'active'
                    ? 'bg-ink text-white'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Active
                {orders.length > 0 ? (
                  <span className="ml-1 tabular-nums opacity-80">
                    ({orders.length})
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'history'}
                onClick={() => setTab('history')}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition ${
                  tab === 'history'
                    ? 'bg-ink text-white'
                    : 'text-muted hover:text-ink'
                }`}
              >
                History
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'wallet'}
                onClick={() => setTab('wallet')}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition ${
                  tab === 'wallet'
                    ? 'bg-ink text-white'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Wallet
              </button>
            </div>

            {tab !== 'wallet' && actionError && (
              <p className="mt-3 rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
                {actionError}
              </p>
            )}

            {tab === 'active' && (
              <div className="mt-4 space-y-3">
                {!loading && !orders.length && (
                  <div className="rounded-[1.25rem] border border-dashed border-ink/15 px-4 py-8 text-center">
                    <p className="font-display text-lg font-bold">No active runs</p>
                    <p className="mt-1 text-sm font-semibold text-muted">
                      When ops assigns you an order, it shows up here.
                    </p>
                  </div>
                )}

                {orders.map((order) => {
                  const { vendorName, pickupSpot } = orderVendorBits(
                    order,
                    getVendor,
                  )
                  const canOnTheWay = order.status === 'picked_up'
                  const canDelivered = order.status === 'on_the_way'

                  return (
                    <article
                      key={order.id}
                      className={`rounded-[1.25rem] border bg-paper/95 px-4 py-4 shadow-sm ${
                        order.kitchenReadyAt
                          ? 'border-ok/40 ring-2 ring-ok/20'
                          : 'border-ink/10'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-[11px] font-bold text-muted">
                          {order.id}
                        </p>
                    <span className="rounded-full bg-dusk/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                      {labelForStatus(
                        order.status as OpsStatus,
                        order.fulfillment as Fulfillment,
                      )}
                    </span>
                  </div>

                  {order.kitchenReadyAt && (
                    <p className="mt-3 rounded-xl bg-ok/15 px-3 py-2 text-sm font-extrabold text-ok ring-1 ring-ok/25">
                      Ready for pickup!
                    </p>
                  )}

                  <div className="mt-3">
                    <RiderOrderDetails
                      order={order}
                      vendorName={vendorName}
                      pickupSpot={pickupSpot}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={busyId === order.id || !canOnTheWay}
                      onClick={() => void onStatus(order.id, 'on_the_way')}
                      className="rounded-full bg-ink px-3 py-2.5 text-xs font-bold text-dusk disabled:opacity-40"
                    >
                      {busyId === order.id && canOnTheWay
                        ? 'Updating…'
                        : 'On the way'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === order.id || !canDelivered}
                      onClick={() => void onStatus(order.id, 'delivered')}
                      className="rounded-full bg-ok/20 px-3 py-2.5 text-xs font-bold text-ok ring-1 ring-ok/25 disabled:opacity-40"
                    >
                      {busyId === order.id && canDelivered
                        ? 'Updating…'
                        : 'Delivered'}
                    </button>
                  </div>
                </article>
              )
            })}
              </div>
            )}

            {tab === 'history' && (
              <div className="mt-4 space-y-3">
                {!loading && !history.length && (
                  <div className="rounded-[1.25rem] border border-dashed border-ink/15 px-4 py-8 text-center">
                    <p className="font-display text-lg font-bold">No deliveries yet</p>
                    <p className="mt-1 text-sm font-semibold text-muted">
                      Completed runs will list here.
                    </p>
                  </div>
                )}

                {history.map((order) => {
                  const { vendorName } = orderVendorBits(order, getVendor)
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setSelectedHistory(order)}
                      className="w-full rounded-[1.25rem] border border-ink/8 bg-paper/80 px-4 py-3 text-left transition hover:border-ink/20 hover:bg-paper active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {vendorName} → {order.customerName}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-muted">
                            {formatWhen(order.createdAt)} ·{' '}
                            {order.placeName || order.address}
                          </p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-lagoon">
                            Tap for receipt
                          </p>
                        </div>
                        <p className="shrink-0 text-xs font-extrabold tabular-nums text-ok">
                          {formatNaira(order.total)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {tab === 'wallet' && token && (
              <div className="mt-4">
                <RiderWalletPanel
                  accessToken={token}
                  onBalanceChange={onWalletBalanceChange}
                />
              </div>
            )}

        {loading && !rider && (
          <p className="mt-8 text-center text-sm font-semibold text-muted">
            Loading rider board…
          </p>
        )}

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => void onLogoutEverywhere()}
            disabled={logoutBusy}
            title="Invalidates this private link on every device"
            className="text-xs font-bold text-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
          >
            {logoutBusy ? 'Logging out…' : 'Log out everywhere'}
          </button>
        </div>
      </main>

      <RiderHistorySheet
        order={selectedHistory}
        vendorName={
          selectedHistory
            ? orderVendorBits(selectedHistory, getVendor).vendorName
            : ''
        }
        pickupSpot={
          selectedHistory
            ? orderVendorBits(selectedHistory, getVendor).pickupSpot
            : ''
        }
        open={Boolean(selectedHistory)}
        onClose={() => setSelectedHistory(null)}
      />
    </div>
  )
}
