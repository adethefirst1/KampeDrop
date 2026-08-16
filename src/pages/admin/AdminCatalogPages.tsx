import { useState, type FormEvent, type ReactNode } from 'react'
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
import { RequireOps } from './AdminShell'

export function AdminVendorsPage() {
  const { vendors, saveVendor, setVendorActive, resetCatalog } = useCatalog()
  const navigate = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)

  function addVendor() {
    const draft = createVendor('New vendor')
    draft.id = `vendor-${Date.now().toString(36)}`
    saveVendor(draft)
    navigate(`/admin/vendors/${draft.id}`)
  }

  return (
    <RequireOps>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">
            Vendor catalog
          </h1>
          <p className="mt-1 text-sm text-muted">
            Add and edit menus here — changes show in the buyer app immediately.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={addVendor}>
          Add vendor
        </button>
      </div>

      <ul className="mt-6 space-y-3">
        {vendors.map((v) => (
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

      <div className="mt-10 border-t border-line pt-6">
        {!confirmReset ? (
          <button
            type="button"
            className="text-sm font-semibold text-muted hover:text-ink"
            onClick={() => setConfirmReset(true)}
          >
            Reset catalog to seed…
          </button>
        ) : (
          <div className="rounded-2xl bg-mist p-4">
            <p className="text-sm font-semibold">
              This replaces all vendors with the original pilot list.
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
