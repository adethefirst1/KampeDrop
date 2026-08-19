import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createMenuItem,
  createVendor,
  useCatalog,
} from '../../context/CatalogContext'
import {
  ACCENT_OPTIONS,
  categoryLabel,
  formatNaira,
  type Category,
  type MenuItem,
  type Vendor,
} from '../../data/vendors'
import {
  fetchOpsVendors,
  listVendorApplicationPhotoUrls,
  updateVendorVerification,
  type VendorRow,
} from '../../lib/vendorsApi'
import { RequireOps } from './AdminShell'

type CloudApp = VendorRow & { photos: string[] }

type ReviewAction = 'needs_info' | 'reject' | null

function CloudApplicationCard({
  app,
  busy,
  onApprove,
  onNeedsInfo,
  onReject,
}: {
  app: CloudApp
  busy: boolean
  onApprove: () => void
  onNeedsInfo: (note: string) => void
  onReject: (note: string | null) => void
}) {
  const [action, setAction] = useState<ReviewAction>(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)

  function resetNoteUi() {
    setAction(null)
    setNote('')
    setNoteError(null)
  }

  function submitNeedsInfo() {
    const trimmed = note.trim()
    if (!trimmed) {
      setNoteError('A note is required — tell them what’s missing.')
      return
    }
    onNeedsInfo(trimmed)
    resetNoteUi()
  }

  function submitReject() {
    onReject(note.trim() || null)
    resetNoteUi()
  }

  return (
    <li className="rounded-[1.35rem] border-[2px] border-dusk bg-paper p-4 shadow-[3px_3px_0_#06181C]">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-lagoon">
        {app.category} · {app.area} ·{' '}
        {app.verification_status === 'needs_info' ? 'Needs info' : 'Pending'}
      </p>
      <p className="mt-1 font-semibold">{app.name}</p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-bold text-muted">Phone</dt>
          <dd className="text-ink">{app.phone}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-bold text-muted">Hours</dt>
          <dd className="text-ink">{app.hours?.trim() || '—'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-bold text-muted">About</dt>
          <dd className="whitespace-pre-wrap text-ink-soft">
            {app.about?.trim() || '—'}
          </dd>
        </div>
      </dl>

      {app.photos.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {app.photos.map((src) => (
            <a key={src} href={src} target="_blank" rel="noreferrer">
              <img
                src={src}
                alt=""
                className="h-20 w-20 shrink-0 rounded-lg object-cover ring-1 ring-line"
              />
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs font-semibold text-muted">No photos uploaded yet.</p>
      )}

      {app.review_note && (
        <p className="mt-2 rounded-lg bg-mist px-2.5 py-1.5 text-sm text-mango-deep">
          Last note: {app.review_note}
        </p>
      )}

      <p className="mt-2 text-[11px] font-semibold text-muted">
        Ref · {app.id.slice(0, 8)} · submitted{' '}
        {new Date(app.submitted_at).toLocaleString()}
      </p>

      {action === null ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-lagoon px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            disabled={busy}
            onClick={onApprove}
          >
            Approve
          </button>
          <button
            type="button"
            className="rounded-full bg-mist px-3 py-1.5 text-xs font-bold disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              setAction('needs_info')
              setNote(app.review_note ?? '')
              setNoteError(null)
            }}
          >
            Needs info
          </button>
          <button
            type="button"
            className="rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-mango-deep disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              setAction('reject')
              setNote('')
              setNoteError(null)
            }}
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2 rounded-xl bg-mist/80 p-3">
          <label className="block text-xs font-bold uppercase tracking-wide text-muted">
            {action === 'needs_info'
              ? 'What’s missing? (required)'
              : 'Rejection note (optional)'}
          </label>
          <textarea
            className="field min-h-[4.5rem] text-sm"
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              setNoteError(null)
            }}
            placeholder={
              action === 'needs_info'
                ? 'e.g. Clearer storefront photo + outdoor sign'
                : 'Optional note for the vendor'
            }
            disabled={busy}
          />
          {noteError && (
            <p className="text-xs font-semibold text-mango-deep">{noteError}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              disabled={busy}
              onClick={() =>
                action === 'needs_info' ? submitNeedsInfo() : submitReject()
              }
            >
              {busy
                ? 'Saving…'
                : action === 'needs_info'
                  ? 'Send needs info'
                  : 'Confirm reject'}
            </button>
            <button
              type="button"
              className="rounded-full bg-paper px-3 py-1.5 text-xs font-bold ring-1 ring-line disabled:opacity-50"
              disabled={busy}
              onClick={resetNoteUi}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

export function AdminVendorsPage() {
  const {
    vendors,
    saveVendor,
    setVendorActive,
    resetCatalog,
  } = useCatalog()
  const navigate = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)
  const [cloudApps, setCloudApps] = useState<CloudApp[]>([])
  const [cloudLoading, setCloudLoading] = useState(true)
  const [cloudError, setCloudError] = useState<string | null>(null)
  const [cloudBusyId, setCloudBusyId] = useState<string | null>(null)

  const refreshCloud = useCallback(async () => {
    setCloudLoading(true)
    setCloudError(null)
    const result = await fetchOpsVendors()
    if (!result.ok) {
      setCloudError(result.reason)
      setCloudApps([])
      setCloudLoading(false)
      return
    }
    const withPhotos = await Promise.all(
      result.vendors.map(async (row) => ({
        ...row,
        photos: await listVendorApplicationPhotoUrls(row.id),
      })),
    )
    setCloudApps(withPhotos)
    setCloudLoading(false)
  }, [])

  useEffect(() => {
    void refreshCloud()
  }, [refreshCloud])

  async function setCloudVerification(
    id: string,
    status: 'approved' | 'needs_info' | 'rejected',
    reviewNote: string | null = null,
  ) {
    setCloudBusyId(id)
    const result = await updateVendorVerification(id, status, reviewNote)
    setCloudBusyId(null)
    if (!result.ok) {
      window.alert(result.reason)
      return
    }
    await refreshCloud()
  }

  function addVendor() {
    const draft = createVendor('New business')
    draft.id = `vendor-${Date.now().toString(36)}`
    draft.verificationStatus = 'approved'
    draft.active = true
    draft.acceptingOrders = true
    draft.vettedNote = 'Added by KampeDrop ops.'
    saveVendor(draft)
    navigate(`/admin/vendors/${draft.id}`)
  }

  const pendingQueue = cloudApps.filter((v) => v.verification_status === 'pending')
  const needsInfoQueue = cloudApps.filter(
    (v) => v.verification_status === 'needs_info',
  )
  const cloudLive = cloudApps.filter((v) => v.verification_status === 'approved')
  const cloudRejected = cloudApps.filter(
    (v) => v.verification_status === 'rejected',
  )

  const liveLocal = vendors.filter((v) => v.verificationStatus === 'approved')

  return (
    <RequireOps>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">
            Vendor applications
          </h1>
          <p className="mt-1 text-sm text-muted">
            Live Supabase queue — same ops session as the order inbox.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-mist px-4 py-2 text-sm font-bold"
          onClick={() => void refreshCloud()}
          disabled={cloudLoading}
        >
          {cloudLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {cloudError && (
        <p className="mt-4 rounded-xl bg-mango/15 px-3 py-2.5 text-sm font-semibold text-mango-deep">
          {cloudError}
          {cloudError.toLowerCase().includes('ops') ||
          cloudError.toLowerCase().includes('policy') ||
          cloudError.toLowerCase().includes('permission')
            ? ' — sign in with an ops account (app_metadata.role = ops).'
            : ''}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-mango-deep">
          Pending · {pendingQueue.length}
        </h2>
        {cloudLoading && cloudApps.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-muted">Loading…</p>
        ) : pendingQueue.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-muted">
            No pending applications.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pendingQueue.map((v) => (
              <CloudApplicationCard
                key={v.id}
                app={v}
                busy={cloudBusyId === v.id}
                onApprove={() => void setCloudVerification(v.id, 'approved')}
                onNeedsInfo={(n) => void setCloudVerification(v.id, 'needs_info', n)}
                onReject={(n) => void setCloudVerification(v.id, 'rejected', n)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-dusk">
          Needs info · {needsInfoQueue.length}
        </h2>
        {needsInfoQueue.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-muted">
            None waiting on more information.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {needsInfoQueue.map((v) => (
              <CloudApplicationCard
                key={v.id}
                app={v}
                busy={cloudBusyId === v.id}
                onApprove={() => void setCloudVerification(v.id, 'approved')}
                onNeedsInfo={(n) => void setCloudVerification(v.id, 'needs_info', n)}
                onReject={(n) => void setCloudVerification(v.id, 'rejected', n)}
              />
            ))}
          </ul>
        )}
      </section>

      {cloudLive.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-lagoon">
            Approved · live · {cloudLive.length}
          </h2>
          <ul className="mt-3 space-y-3">
            {cloudLive.map((v) => (
              <li
                key={v.id}
                className="rounded-[1.35rem] bg-paper p-4 ring-1 ring-line"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-lagoon">
                  {v.category} · {v.area}
                  {!v.active && ' · Inactive'}
                </p>
                <p className="mt-1 font-semibold">{v.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {v.phone}
                  {v.hours ? ` · ${v.hours}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cloudRejected.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted">
            Rejected · {cloudRejected.length}
          </h2>
          <ul className="mt-3 space-y-3">
            {cloudRejected.map((v) => (
              <li
                key={v.id}
                className="rounded-[1.35rem] bg-paper p-4 ring-1 ring-line"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                  {v.category} · {v.area}
                </p>
                <p className="mt-1 font-semibold">{v.name}</p>
                <p className="mt-0.5 text-sm text-muted">{v.phone}</p>
                {v.review_note && (
                  <p className="mt-1 text-sm text-mango-deep">{v.review_note}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12 border-t border-line pt-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted">
              Local pilot catalog · {liveLocal.length}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Seed / device-only businesses (not the Supabase queue).
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={addVendor}>
            Add local business
          </button>
        </div>
        <ul className="mt-3 space-y-3">
          {liveLocal.map((v) => (
            <li key={v.id}>
              <div className="flex items-center gap-3 rounded-[1.35rem] bg-paper p-4 ring-1 ring-line">
                <Link to={`/admin/vendors/${v.id}`} className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-lagoon">
                    {categoryLabel[v.category]} · {v.area}
                    {!v.active && ' · Hidden'}
                  </p>
                  <p className="mt-1 font-semibold">{v.name}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {v.items.length} items · {v.phone || 'No phone'}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => setVendorActive(v.id, !v.active)}
                  className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold"
                >
                  {v.active ? 'Hide' : 'Show'}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {!confirmReset ? (
            <button
              type="button"
              className="text-sm font-semibold text-muted hover:text-ink"
              onClick={() => setConfirmReset(true)}
            >
              Reset local catalog to seed…
            </button>
          ) : (
            <div className="rounded-2xl bg-mist p-4">
              <p className="text-sm font-semibold">
                Replaces local businesses with the original pilot list. Supabase
                applications are not affected.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
                  onClick={() => {
                    resetCatalog()
                    setConfirmReset(false)
                  }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-paper px-4 py-2 text-sm font-bold ring-1 ring-line"
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </RequireOps>
  )
}

export function AdminVendorEditPage() {
  const { vendorId } = useParams()
  const { getVendor, saveVendor, deleteVendor, upsertItem, deleteItem } =
    useCatalog()
  const navigate = useNavigate()
  const vendor = vendorId ? getVendor(vendorId) : undefined

  if (!vendor) {
    return (
      <RequireOps>
        <p className="font-display text-2xl font-semibold">Vendor not found</p>
        <Link to="/admin/vendors" className="mt-4 inline-block font-semibold text-lagoon">
          ← Catalog
        </Link>
      </RequireOps>
    )
  }

  return (
    <RequireOps>
      <VendorEditor
        key={vendor.id}
        vendor={vendor}
        onSave={(next) => saveVendor(next)}
        onDelete={() => {
          deleteVendor(vendor.id)
          navigate('/admin/vendors', { replace: true })
        }}
        onUpsertItem={(item) => upsertItem(vendor.id, item)}
        onDeleteItem={(itemId) => deleteItem(vendor.id, itemId)}
      />
    </RequireOps>
  )
}

function VendorEditor({
  vendor,
  onSave,
  onDelete,
  onUpsertItem,
  onDeleteItem,
}: {
  vendor: Vendor
  onSave: (v: Vendor) => void
  onDelete: () => void
  onUpsertItem: (item: MenuItem) => void
  onDeleteItem: (itemId: string) => void
}) {
  const [form, setForm] = useState(vendor)
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  function patch<K extends keyof Vendor>(key: K, value: Vendor[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    onSave({ ...form, id: vendor.id, items: vendor.items })
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1500)
  }

  return (
    <>
      <Link to="/admin/vendors" className="text-sm font-semibold text-muted hover:text-ink">
        ← Catalog
      </Link>

      <form onSubmit={onSubmit} className="mt-3 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">
            {form.name || 'Vendor'}
          </h1>
          <div className="flex items-center gap-2">
            {savedFlash && (
              <span className="text-xs font-bold text-lagoon">Saved</span>
            )}
            <button type="submit" className="btn-primary">
              Save vendor
            </button>
          </div>
        </div>

        <section className="space-y-3 rounded-[1.5rem] bg-paper p-4 ring-1 ring-line">
          <Field label="Name">
            <input
              className="field"
              value={form.name}
              onChange={(e) => patch('name', e.target.value)}
              required
            />
          </Field>
          <Field label="Phone (for Call vendor)">
            <input
              className="field"
              value={form.phone}
              onChange={(e) => patch('phone', e.target.value)}
              inputMode="tel"
              placeholder="0803…"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">
              <select
                className="field"
                value={form.category}
                onChange={(e) => patch('category', e.target.value as Category)}
              >
                {(Object.keys(categoryLabel) as Category[]).map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Area">
              <input
                className="field"
                value={form.area}
                onChange={(e) => patch('area', e.target.value)}
                required
              />
            </Field>
            <Field label="Pickup spot">
              <input
                className="field"
                value={form.pickupSpot}
                onChange={(e) => patch('pickupSpot', e.target.value)}
                placeholder="Street / landmark for self-pickup"
                required
              />
            </Field>
          </div>
          <Field label="Tagline">
            <textarea
              className="field min-h-20"
              value={form.tagline}
              onChange={(e) => patch('tagline', e.target.value)}
            />
          </Field>
          <Field label="Vetted note">
            <textarea
              className="field min-h-20"
              value={form.vettedNote}
              onChange={(e) => patch('vettedNote', e.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="ETA (mins)">
              <input
                className="field"
                type="number"
                min={10}
                max={120}
                value={form.etaMins}
                onChange={(e) => patch('etaMins', Number(e.target.value) || 35)}
              />
            </Field>
            <Field label="Rating">
              <input
                className="field"
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={form.rating}
                onChange={(e) => patch('rating', Number(e.target.value) || 5)}
              />
            </Field>
            <Field label="Orders label">
              <input
                className="field"
                value={form.orders}
                onChange={(e) => patch('orders', e.target.value)}
                placeholder="120+"
              />
            </Field>
          </div>
          <Field label="Accent">
            <div className="flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => patch('accent', c)}
                  className={`h-9 w-9 rounded-full ring-2 ${
                    form.accent === c ? 'ring-ink' : 'ring-transparent'
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => patch('active', e.target.checked)}
            />
            Visible in buyer app
          </label>
        </section>
      </form>

      <section className="mt-6 rounded-[1.5rem] bg-paper p-4 ring-1 ring-line">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-lagoon">
            Menu · {vendor.items.length} items
          </p>
          <button
            type="button"
            className="btn-ink !px-3 !py-2 text-xs"
            onClick={() =>
              setEditingItem(
                createMenuItem({
                  name: 'New item',
                  price: 1000,
                  description: '',
                  id: `item-${Date.now().toString(36)}`,
                }),
              )
            }
          >
            Add item
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {vendor.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-mist px-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {item.name}
                  {item.popular ? (
                    <span className="ml-2 text-[10px] font-bold uppercase text-mango-deep">
                      Popular
                    </span>
                  ) : null}
                </p>
                <p className="line-clamp-1 text-sm text-muted">{item.description}</p>
                <p className="mt-1 text-sm font-semibold">{formatNaira(item.price)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="text-xs font-bold text-lagoon"
                  onClick={() => setEditingItem(item)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-xs font-bold text-red-600"
                  onClick={() => onDeleteItem(item.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {vendor.items.length === 0 && (
            <li className="py-6 text-center text-sm text-muted">No items yet.</li>
          )}
        </ul>
      </section>

      {editingItem && (
        <ItemEditorModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(item) => {
            onUpsertItem(item)
            setEditingItem(null)
          }}
        />
      )}

      <div className="mt-8 border-t border-line pt-6">
        {!confirmDelete ? (
          <button
            type="button"
            className="text-sm font-semibold text-red-600"
            onClick={() => setConfirmDelete(true)}
          >
            Delete vendor…
          </button>
        ) : (
          <div className="rounded-2xl bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">
              Remove {vendor.name} from the catalog?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
                onClick={onDelete}
              >
                Delete
              </button>
              <button
                type="button"
                className="rounded-xl bg-paper px-4 py-2 text-sm font-bold ring-1 ring-line"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function ItemEditorModal({
  item,
  onClose,
  onSave,
}: {
  item: MenuItem
  onClose: () => void
  onSave: (item: MenuItem) => void
}) {
  const [form, setForm] = useState(item)

  function submit(e: FormEvent) {
    e.preventDefault()
    onSave({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      price: Math.max(0, Math.round(form.price)),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-[1.5rem] bg-paper p-5 shadow-xl"
      >
        <h2 className="font-display text-2xl font-semibold">
          {item.name === 'New item' ? 'Add item' : 'Edit item'}
        </h2>
        <div className="mt-4 space-y-3">
          <Field label="Name">
            <input
              className="field"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
          <Field label="Description">
            <textarea
              className="field min-h-20"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </Field>
          <Field label="Price (₦)">
            <input
              className="field"
              type="number"
              min={0}
              step={50}
              value={form.price}
              onChange={(e) =>
                setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))
              }
              required
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={!!form.popular}
              onChange={(e) =>
                setForm((f) => ({ ...f, popular: e.target.checked }))
              }
            />
            Mark as popular
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="submit" className="btn-primary flex-1">
            Save item
          </button>
          <button type="button" className="btn-ink flex-1" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  )
}
