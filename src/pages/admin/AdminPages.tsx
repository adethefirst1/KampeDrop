import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useCatalog } from '../../context/CatalogContext'
import { useOps } from '../../context/OpsContext'
import {
  canCancelOrder,
  getRider,
  labelForStatus,
  pipelineFor,
  statusRank,
  timeAgo,
  type OpsOrder,
} from '../../data/ops'
import { formatNaira } from '../../data/vendors'
import { easeOut, springSoft, tapPress } from '../../motion/tokens'
import { RequireOps } from './AdminShell'
import { AvailableRidersPanel } from './AvailableRidersPanel'

type Filter =
  | 'all'
  | 'finding_rider'
  | 'preparing'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled'
  | 'problem'

export function AdminLoginPage() {
  const { authenticated, authReady, login } = useOps()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  if (!authReady) {
    return (
      <div className="flex min-h-svh items-center justify-center mist-wash px-4">
        <p className="text-sm font-semibold text-muted">Checking session…</p>
      </div>
    )
  }

  if (authenticated) return <Navigate to="/admin" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const result = await login(email, password)
    setBusy(false)
    if (result.ok) navigate('/admin', { replace: true })
    else setError(result.reason)
  }

  return (
    <div className="flex min-h-svh items-center justify-center mist-wash px-4">
      <motion.form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-[1.75rem] bg-paper p-6 ring-1 ring-line"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-lagoon">
          KampeDrop Ops
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em]">
          Badagry control room
        </h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with your Supabase ops account (email + password). The user
          needs <span className="font-semibold text-ink">app_metadata.role = ops</span>{' '}
          for order updates.
        </p>
        <label className="mt-6 block text-sm font-bold" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError(null)
          }}
          className="field mt-2"
          autoComplete="username"
          required
        />
        <label className="mt-4 block text-sm font-bold" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError(null)
          }}
          className="field mt-2"
          autoComplete="current-password"
          required
        />
        {error && (
          <p className="mt-2 text-sm font-semibold text-mango-deep">{error}</p>
        )}
        <button type="submit" disabled={busy} className="btn-ink mt-5 w-full disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </motion.form>
    </div>
  )
}

export function AdminInboxPage() {
  const { orders, ordersLoading, ordersError, refreshOrders } = useOps()
  const [filter, setFilter] = useState<Filter>('all')

  const counts = useMemo(() => {
    const newCount = orders.filter(
      (o) =>
        !o.hasProblem &&
        (o.status === 'finding_rider' || o.status === 'confirmed'),
    ).length
    const active = orders.filter(
      (o) =>
        !o.hasProblem &&
        (o.status === 'rider_assigned' ||
          o.status === 'preparing' ||
          o.status === 'ready_for_pickup' ||
          o.status === 'picked_up' ||
          o.status === 'on_the_way'),
    ).length
    const done = orders.filter((o) => o.status === 'delivered').length
    const problems = orders.filter((o) => o.hasProblem).length
    return { newCount, active, done, problems }
  }, [orders])

  const list = useMemo(() => {
    let rows = [...orders]
    if (filter === 'problem') rows = rows.filter((o) => o.hasProblem)
    else if (filter === 'finding_rider') {
      rows = rows.filter(
        (o) =>
          !o.hasProblem &&
          (o.status === 'finding_rider' || o.status === 'confirmed'),
      )
    } else if (filter === 'preparing') {
      rows = rows.filter(
        (o) =>
          !o.hasProblem &&
          (o.status === 'rider_assigned' ||
            o.status === 'preparing' ||
            o.status === 'ready_for_pickup'),
      )
    } else if (filter === 'on_the_way') {
      rows = rows.filter(
        (o) =>
          !o.hasProblem &&
          (o.status === 'picked_up' || o.status === 'on_the_way'),
      )
    } else if (filter !== 'all') {
      rows = rows.filter((o) => o.status === filter && !o.hasProblem)
    }
    return rows.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [orders, filter])

  return (
    <RequireOps>
      <div className="flex flex-wrap gap-2">
        <Stat label="New" value={counts.newCount} hot={counts.newCount > 0} />
        <Stat label="Active" value={counts.active} />
        <Stat label="Done" value={counts.done} />
        <Stat label="Problem" value={counts.problems} hot={counts.problems > 0} />
      </div>

      <div className="mt-5">
        <AvailableRidersPanel />
      </div>

      {ordersError && (
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Cloud orders error: {ordersError}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void refreshOrders()}
          >
            Retry
          </button>
        </div>
      )}
      {ordersLoading && orders.length === 0 && (
        <p className="mt-4 text-sm font-semibold text-muted">Loading orders…</p>
      )}

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ['all', 'All'],
            ['finding_rider', 'New'],
            ['preparing', 'Kitchen'],
            ['on_the_way', 'En route'],
            ['delivered', 'Done'],
            ['cancelled', 'Cancelled'],
            ['problem', 'Problem'],
          ] as const
        ).map(([key, label]) => {
          const active = filter === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold ${
                active ? 'bg-ink text-white' : 'bg-paper text-muted ring-1 ring-line'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {list.length === 0 ? (
        <div className="mt-10 rounded-[1.5rem] bg-paper px-5 py-10 text-center ring-1 ring-line">
          <p className="font-display text-xl font-semibold">No orders here</p>
          <p className="mt-2 text-sm text-muted">
            When a guest checks out in the app, it lands in this inbox.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {list.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </RequireOps>
  )
}

function Stat({
  label,
  value,
  hot = false,
}: {
  label: string
  value: number
  hot?: boolean
}) {
  return (
    <div
      className={`min-w-[4.5rem] flex-1 rounded-2xl px-3 py-3 ring-1 ${
        hot ? 'bg-mango/10 ring-mango/30' : 'bg-paper ring-line'
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  )
}

function OrderRow({ order }: { order: OpsOrder }) {
  const { getVendor } = useCatalog()
  const vendor = getVendor(order.lines[0]?.vendorId ?? '')
  const fulfillment = order.fulfillment ?? 'delivery'
  const statusKey = order.hasProblem ? 'problem' : order.status

  return (
    <li>
      <Link
        to={`/admin/orders/${order.id}`}
        className="block rounded-[1.35rem] bg-paper p-4 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(6,24,28,0.08)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-muted">
              {order.id} · {timeAgo(order.createdAt)} ·{' '}
              {fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}
            </p>
            <p className="mt-1 font-semibold">{vendor?.name ?? 'Vendor'}</p>
            <p className="mt-0.5 text-sm text-muted">
              {order.customerName.split(' ')[0]} · {order.phone}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              statusKey === 'finding_rider' || statusKey === 'confirmed'
                ? 'bg-mango/15 text-mango-deep'
                : statusKey === 'problem' || statusKey === 'cancelled'
                  ? 'bg-red-100 text-red-700'
                  : statusKey === 'delivered' || statusKey === 'ready_for_pickup'
                    ? 'bg-lagoon/15 text-lagoon-deep'
                    : 'bg-mist text-ink-soft'
            }`}
          >
            {labelForStatus(statusKey, fulfillment)}
          </span>
        </div>
        <p className="mt-3 line-clamp-1 text-sm text-ink-soft">{order.address}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-muted">
          <span>{order.lines.reduce((s, l) => s + l.qty, 0)} items</span>
          <span>·</span>
          <span>{formatNaira(order.total)}</span>
          <span>·</span>
          <span>
            {order.escrowState === 'held'
              ? 'Escrow held'
              : order.escrowState === 'released'
                ? 'Vendor paid'
                : order.escrowState === 'refunded'
                  ? 'Refunded'
                  : fulfillment === 'pickup'
                    ? 'Pay at pickup'
                    : 'COD'}
          </span>
        </div>
      </Link>
    </li>
  )
}

export function AdminOrderPage() {
  const { orderId } = useParams()
  const { getVendor } = useCatalog()
  const {
    getOrder,
    setVendorConfirmed,
    assignRider,
    markPreparing,
    markReadyForPickup,
    validatePickup,
    markOnTheWay,
    markDelivered,
    cancelOrder,
    confirmTransfer,
    flagProblem,
    clearProblem,
    addNote,
    riders,
  } = useOps()
  const order = orderId ? getOrder(orderId) : undefined
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState('late')
  const [passInput, setPassInput] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  if (!order) {
    return (
      <RequireOps>
        <p className="font-display text-2xl font-semibold tracking-[-0.03em]">
          Order not found
        </p>
        <p className="mt-2 text-sm text-muted">
          It may have been cleared from this device’s ops inbox.
        </p>
        <Link to="/admin" className="mt-4 inline-block font-semibold text-lagoon">
          ← Inbox
        </Link>
      </RequireOps>
    )
  }

  const fulfillment = order.fulfillment ?? 'delivery'
  const pickup = fulfillment === 'pickup'
  const pipe = pipelineFor(fulfillment)
  const vendor = getVendor(order.lines[0]?.vendorId ?? '')
  const vPhone = vendor?.phone || ''
  const rider = getRider(order.riderId)
  const cancelled = order.status === 'cancelled'
  const rank = statusRank(order.status, fulfillment)

  function run(result: { ok: true } | { ok: false; reason: string }) {
    setActionError(result.ok ? null : result.reason)
  }

  async function runAsync(
    promise: Promise<{ ok: true } | { ok: false; reason: string }>,
  ) {
    const result = await promise
    setActionError(result.ok ? null : result.reason)
  }

  return (
    <RequireOps>
      <Link to="/admin" className="text-sm font-semibold text-muted hover:text-ink">
        ← Inbox
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
            {order.id} · {timeAgo(order.createdAt)} ·{' '}
            {pickup ? 'Pickup' : 'Delivery'}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-0.03em]">
            {vendor?.name}
          </h1>
          {order.hasProblem && (
            <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              Problem: {order.problemReason}
            </p>
          )}
          {cancelled && (
            <p className="mt-2 rounded-xl bg-mist px-3 py-2 text-sm font-semibold">
              Cancelled: {order.cancelReason}
            </p>
          )}
        </div>
        <span className="rounded-full bg-mist px-3 py-1.5 text-xs font-bold">
          {labelForStatus(order.hasProblem ? 'problem' : order.status, fulfillment)}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {vPhone ? (
          <a href={`tel:${vPhone}`} className="btn-ink !px-2 !py-3 text-center text-xs">
            Call vendor
          </a>
        ) : (
          <span className="rounded-2xl bg-mist px-2 py-3 text-center text-xs font-bold text-muted">
            No vendor #
          </span>
        )}
        {order.phone ? (
          <a
            href={`tel:${order.phone}`}
            className="btn-primary !px-2 !py-3 text-center text-xs"
          >
            Call buyer
          </a>
        ) : (
          <span className="rounded-2xl bg-mist px-2 py-3 text-center text-xs font-bold text-muted">
            No buyer #
          </span>
        )}
        {pickup ? (
          <span className="rounded-2xl bg-mist px-2 py-3 text-center text-xs font-bold text-muted">
            Self-pickup
          </span>
        ) : (
          <a
            href={rider ? `tel:${rider.phone}` : undefined}
            className={`rounded-2xl px-2 py-3 text-center text-xs font-bold ring-1 ${
              rider
                ? 'bg-paper text-ink ring-line'
                : 'pointer-events-none bg-mist text-muted ring-transparent'
            }`}
          >
            {rider ? 'Call rider' : 'No rider'}
          </a>
        )}
      </div>

      {/* Pipeline */}
      <section className="mt-6 rounded-[1.5rem] bg-ink p-4 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
          Logistics
        </p>
        <p className="mt-2 text-sm text-white/60">
          {pickup
            ? 'No rider. Kitchen can start after confirm. Passkey unlocks collection + vendor payout.'
            : 'No kitchen start until a rider is assigned. Passkey unlocks pickup + vendor payout.'}
        </p>
        <ol className="mt-3 space-y-2">
          {pipe.map((step, i) => {
            const done = !cancelled && rank >= i
            const current = order.status === step
            return (
              <li key={step} className="flex items-center gap-3 text-sm">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
                    done ? 'bg-lagoon' : 'bg-white/10 text-white/40'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span
                  className={
                    current ? 'font-bold text-dusk' : done ? 'text-white' : 'text-white/40'
                  }
                >
                  {labelForStatus(step, fulfillment)}
                </span>
              </li>
            )
          })}
        </ol>

        {actionError && (
          <p className="mt-3 rounded-xl bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-100">
            {actionError}
          </p>
        )}

        {!cancelled && !pickup && order.status === 'finding_rider' && (
          <p className="mt-4 text-sm text-mango">
            Assign a rider below — then tell the kitchen to start.
          </p>
        )}

        {!cancelled && pickup && order.status === 'confirmed' && (
          <motion.button
            type="button"
            whileTap={tapPress}
            transition={springSoft}
            onClick={() => run(markPreparing(order.id))}
            className="btn-primary mt-4 w-full"
          >
            Tell kitchen to start
          </motion.button>
        )}

        {!cancelled && !pickup && order.status === 'rider_assigned' && (
          <motion.button
            type="button"
            whileTap={tapPress}
            transition={springSoft}
            onClick={() => run(markPreparing(order.id))}
            className="btn-primary mt-4 w-full"
          >
            Tell kitchen to start
          </motion.button>
        )}

        {!cancelled && pickup && order.status === 'preparing' && (
          <motion.button
            type="button"
            whileTap={tapPress}
            transition={springSoft}
            onClick={() => run(markReadyForPickup(order.id))}
            className="btn-primary mt-4 w-full"
          >
            Mark ready for pickup
          </motion.button>
        )}

        {!cancelled &&
          !pickup &&
          (order.status === 'preparing' || order.status === 'rider_assigned') && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-white/45">
                Validate pickup passkey
              </p>
              <p className="text-sm text-white/70">
                Ask the buyer for their 4-digit code
              </p>
              <div className="flex gap-2">
                <input
                  value={passInput}
                  onChange={(e) =>
                    setPassInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  placeholder="4-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="field flex-1 !bg-white/10 !text-white !ring-white/20 placeholder:!text-white/35"
                />
                <button
                  type="button"
                  onClick={() => void runAsync(validatePickup(order.id, passInput))}
                  className="btn-primary !px-4"
                >
                  Confirm pickup
                </button>
              </div>
            </div>
          )}

        {!cancelled &&
          pickup &&
          (order.status === 'ready_for_pickup' || order.status === 'preparing') && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-white/45">
                Validate collection passkey
              </p>
              <p className="text-sm text-white/70">
                Ask the buyer for their 4-digit code
              </p>
              <div className="flex gap-2">
                <input
                  value={passInput}
                  onChange={(e) =>
                    setPassInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  placeholder="4-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="field flex-1 !bg-white/10 !text-white !ring-white/20 placeholder:!text-white/35"
                />
                <button
                  type="button"
                  onClick={() => void runAsync(validatePickup(order.id, passInput))}
                  className="btn-primary !px-4"
                >
                  Confirm collected
                </button>
              </div>
            </div>
          )}

        {!cancelled && !pickup && order.status === 'picked_up' && (
          <motion.button
            type="button"
            whileTap={tapPress}
            onClick={() => markOnTheWay(order.id)}
            className="btn-primary mt-4 w-full"
          >
            Mark on the way
          </motion.button>
        )}

        {!cancelled && !pickup && order.status === 'on_the_way' && (
          <motion.button
            type="button"
            whileTap={tapPress}
            onClick={() => markDelivered(order.id)}
            className="btn-primary mt-4 w-full"
          >
            Mark delivered
          </motion.button>
        )}
      </section>

      {/* Escrow / transfer */}
      <section className="mt-4 rounded-[1.5rem] bg-paper p-4 ring-1 ring-line">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-lagoon">
          Escrow / payout
        </p>
        <p className="mt-2 text-sm font-semibold capitalize">
          {order.escrowState === 'held' && 'Held — vendor not paid yet'}
          {order.escrowState === 'released' && 'Released to vendor (on pickup)'}
          {order.escrowState === 'refunded' && 'Refunded to buyer'}
          {order.escrowState === 'cod' &&
            (pickup ? 'COD — collect at pickup' : 'COD — collect on delivery')}
        </p>
        {order.payment === 'transfer' && (
          <div className="mt-3">
            <p className="text-xs font-bold text-muted">
              Transfer (Paystack) ·{' '}
              {order.paymentState === 'transfer_pending' && 'Awaiting Paystack VA payment'}
              {order.paymentState === 'transfer_seen' && 'Legacy: buyer claimed paid'}
              {order.paymentState === 'transfer_confirmed' && 'Confirmed via Paystack'}
              {order.paymentState === 'released' && 'Released'}
              {order.paymentState === 'refunded' && 'Refunded'}
              {order.paymentState === 'held' && 'Held'}
            </p>
            {order.paymentState === 'transfer_pending' && (
              <p className="mt-2 text-sm text-muted">
                Waiting for Paystack webhook — no manual confirm needed.
              </p>
            )}
            {order.paymentState === 'transfer_seen' && (
              <p className="mt-2 text-sm text-muted">
                Legacy claim — prefer waiting for Paystack, or confirm below only if you
                already see the credit.
              </p>
            )}
            {order.paymentState === 'transfer_seen' && (
              <button
                type="button"
                className="btn-primary mt-2 !px-4 !py-2 text-sm"
                onClick={() => void runAsync(confirmTransfer(order.id))}
              >
                Confirm transfer received (legacy)
              </button>
            )}
            {actionError && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {actionError}
              </p>
            )}
          </div>
        )}
        {order.payment === 'card' && (
          <p className="mt-3 text-xs font-bold text-muted">
            Card (Paystack) ·{' '}
            {order.paymentState === 'card_pending' && 'Awaiting payment'}
            {order.paymentState === 'card_paid' && 'Paid'}
            {order.paymentState === 'card_failed' && 'Failed — buyer can retry'}
            {order.paymentState === 'released' && 'Released'}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          Paystack confirms card and bank-transfer payments via webhook. Escrow still
          releases at passkey handoff.
        </p>
      </section>

      {/* Rider */}
      {!pickup && (
        <section className="mt-4 rounded-[1.5rem] bg-paper p-4 ring-1 ring-line">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-lagoon">Rider</p>
          <p className="mt-2 text-sm text-muted">
            {rider
              ? `${rider.name} · ${rider.phone} · ${rider.area}`
              : 'No rider — kitchen must wait'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {riders.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={cancelled || rank >= statusRank('picked_up', fulfillment)}
                onClick={() => {
                  setActionError(null)
                  assignRider(order.id, r.id)
                }}
                className={`rounded-full px-3 py-2 text-xs font-bold disabled:opacity-40 ${
                  order.riderId === r.id ? 'bg-lagoon text-white' : 'bg-mist text-ink-soft'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {pickup && (
        <section className="mt-4 rounded-[1.5rem] bg-paper p-4 ring-1 ring-line">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-lagoon">
            Pickup spot
          </p>
          <p className="mt-2 font-semibold">{vendor?.name}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {vendor?.pickupSpot || order.address}
          </p>
        </section>
      )}

      {/* Vendor */}
      <section className="mt-4 rounded-[1.5rem] bg-paper p-4 ring-1 ring-line">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-lagoon">Vendor</p>
        <p className="mt-2 font-semibold">{vendor?.name}</p>
        <p className="text-sm text-muted">
          {vendor?.area} · {vPhone}
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={order.vendorConfirmed}
            onChange={(e) => setVendorConfirmed(order.id, e.target.checked)}
          />
          Vendor confirmed / packing
        </label>
      </section>

      {/* Buyer */}
      <section className="mt-4 rounded-[1.5rem] bg-paper p-4 ring-1 ring-line">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-lagoon">Buyer</p>
        <p className="mt-2 font-semibold">{order.customerName}</p>
        <p className="text-sm text-muted">{order.phone}</p>
        {order.placeName && (
          <p className="mt-2 text-sm font-semibold text-lagoon">{order.placeName}</p>
        )}
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{order.address}</p>
        {order.placeLat != null && order.placeLng != null && (
          <p className="mt-1 text-xs text-muted">
            Pin · {order.placeLat.toFixed(4)}, {order.placeLng.toFixed(4)}
          </p>
        )}
        {order.note && (
          <p className="mt-2 rounded-xl bg-mist px-3 py-2 text-sm">Note: {order.note}</p>
        )}
      </section>

      {/* Items */}
      <section className="mt-4 rounded-[1.5rem] bg-paper p-4 ring-1 ring-line">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-lagoon">Items</p>
        <ul className="mt-3 space-y-2 text-sm">
          {order.lines.map((l) => (
            <li key={l.item.id} className="flex justify-between gap-3">
              <span>
                {l.qty}× {l.item.name}
              </span>
              <span className="font-semibold">{formatNaira(l.item.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
          <span className="font-bold">Total</span>
          <span className="font-display text-xl font-semibold">
            {formatNaira(order.total)}
          </span>
        </div>
      </section>

      {/* Cancel / problem */}
      <section className="mt-4 rounded-[1.5rem] bg-paper p-4 ring-1 ring-line">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-lagoon">
          Cancel / guarantee
        </p>
        {canCancelOrder(order.status, fulfillment) && (
          <button
            type="button"
            className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
            onClick={() =>
              run(cancelOrder(order.id, 'Cancelled by ops — no logistics / buyer request'))
            }
          >
            {pickup
              ? 'Cancel & refund (before kitchen only)'
              : 'Cancel & refund (finding rider only)'}
          </button>
        )}
        {!canCancelOrder(order.status, fulfillment) && !cancelled && (
          <p className="mt-2 text-sm text-muted">
            {pickup
              ? 'Kitchen started — cancel locked. Use problem flag / guarantee.'
              : 'Rider accepted — cancel locked. Use problem flag / guarantee.'}
          </p>
        )}
        {!order.hasProblem ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="field !w-auto !py-2 text-sm"
            >
              <option value="late">Late</option>
              <option value="wrong item">Wrong item</option>
              <option value="missing item">Missing item</option>
              <option value="no rider">No rider</option>
              <option value="other">Other</option>
            </select>
            <button
              type="button"
              onClick={() => flagProblem(order.id, problem)}
              className="rounded-xl bg-mist px-4 py-2 text-sm font-bold ring-1 ring-line"
            >
              Flag problem
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => clearProblem(order.id)}
            className="btn-ink mt-3"
          >
            Clear problem
          </button>
        )}
      </section>

      {/* Notes */}
      <section className="mt-4 rounded-[1.5rem] bg-paper p-4 ring-1 ring-line">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-lagoon">
          Internal notes
        </p>
        <ul className="mt-3 space-y-2">
          {[...order.notes].reverse().map((n) => (
            <li key={n.id} className="rounded-xl bg-mist px-3 py-2 text-sm">
              <span className="text-xs font-semibold text-muted">{timeAgo(n.at)}</span>
              <p className="mt-0.5 text-ink-soft">{n.text}</p>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            addNote(order.id, note)
            setNote('')
          }}
        >
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
            className="field flex-1 !py-2.5"
          />
          <button type="submit" className="btn-ink !px-4 !py-2.5 text-sm">
            Add
          </button>
        </form>
      </section>
    </RequireOps>
  )
}
