import { useState } from 'react'
import { createMenuItem, useCatalog } from '../../context/CatalogContext'
import { useVendor } from '../../context/VendorContext'
import { formatNaira, type MenuItem } from '../../data/vendors'

export function VendorMenuPage() {
  const { vendorId } = useVendor()
  const { getVendor, upsertItem, deleteItem } = useCatalog()
  const vendor = getVendor(vendorId ?? '')
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [creating, setCreating] = useState(false)

  if (!vendor) return null

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">Menu</h1>
          <p className="mt-1 text-sm text-muted">Prices, names, sold-out — you control this.</p>
        </div>
        <button
          type="button"
          className="rounded-full bg-ink px-3 py-2 text-xs font-extrabold text-white"
          onClick={() => {
            setCreating(true)
            setEditing(
              createMenuItem({ name: 'New item', description: '', price: 1000 }),
            )
          }}
        >
          Add item
        </button>
      </div>

      <ul className="mt-6 space-y-2.5">
        {vendor.items.map((item) => (
          <li
            key={item.id}
            className={`rounded-2xl bg-paper p-4 ring-1 ring-line ${
              item.available === false ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-ink">{item.name}</p>
                {item.description && (
                  <p className="mt-0.5 text-sm text-muted">{item.description}</p>
                )}
                <p className="mt-1.5 text-sm font-extrabold">{formatNaira(item.price)}</p>
                {item.available === false && (
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-mango-deep">
                    Sold out
                  </p>
                )}
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full bg-mist px-3 py-1.5 text-xs font-bold"
                onClick={() => {
                  setCreating(false)
                  setEditing({ ...item })
                }}
              >
                Edit
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <ItemEditor
          item={editing}
          isNew={creating}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSave={(item) => {
            upsertItem(vendor.id, item)
            setEditing(null)
            setCreating(false)
          }}
          onDelete={
            creating
              ? undefined
              : () => {
                  if (window.confirm(`Remove “${editing.name}” from the menu?`)) {
                    deleteItem(vendor.id, editing.id)
                    setEditing(null)
                  }
                }
          }
        />
      )}
    </div>
  )
}

function ItemEditor({
  item,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  item: MenuItem
  isNew: boolean
  onClose: () => void
  onSave: (item: MenuItem) => void
  onDelete?: () => void
}) {
  const [draft, setDraft] = useState(item)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-[1.5rem] bg-paper p-5 shadow-xl sm:rounded-[1.5rem]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">
            {isNew ? 'New item' : 'Edit item'}
          </h2>
          <button type="button" className="text-xs font-bold text-muted" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-bold text-muted">Name</span>
            <input
              className="field mt-1"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-muted">Description</span>
            <textarea
              className="field mt-1 min-h-[4.5rem]"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-muted">Price (₦)</span>
            <input
              className="field mt-1"
              type="number"
              min={0}
              value={draft.price}
              onChange={(e) =>
                setDraft({ ...draft, price: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={draft.available !== false}
              onChange={(e) => setDraft({ ...draft, available: e.target.checked })}
            />
            Available (uncheck = sold out)
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={Boolean(draft.popular)}
              onChange={(e) => setDraft({ ...draft, popular: e.target.checked })}
            />
            Mark popular
          </label>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => {
              if (!draft.name.trim()) return
              onSave({ ...draft, name: draft.name.trim() })
            }}
          >
            Save
          </button>
          {onDelete && (
            <button
              type="button"
              className="w-full rounded-full py-3 text-sm font-bold text-mango-deep"
              onClick={onDelete}
            >
              Remove item
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
