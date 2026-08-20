import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useVendor } from '../../context/VendorContext'
import { formatNaira, type MenuItem } from '../../data/vendors'
import {
  addMenuItem,
  deleteMenuItem,
  getVendorMenuItems,
  updateMenuItem,
} from '../../lib/vendorsApi'

type Draft = {
  id?: string
  name: string
  description: string
  price: number
  available: boolean
}

const emptyDraft = (): Draft => ({
  name: '',
  description: '',
  price: 1000,
  available: true,
})

export function VendorMenuPage() {
  const { accessToken } = useVendor()
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editor, setEditor] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    const result = await getVendorMenuItems(accessToken)
    setLoading(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setItems(result.items)
  }, [accessToken])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function toggleAvailable(item: MenuItem) {
    if (!accessToken) return
    setBusyId(item.id)
    setError(null)
    const result = await updateMenuItem(accessToken, item.id, {
      name: item.name,
      price: item.price,
      description: item.description,
      available: item.available === false,
    })
    setBusyId(null)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setItems((prev) => prev.map((it) => (it.id === result.item.id ? result.item : it)))
  }

  async function onDelete(item: MenuItem) {
    if (!accessToken) return
    if (!window.confirm(`Remove “${item.name}” from your menu?`)) return
    setBusyId(item.id)
    setError(null)
    const result = await deleteMenuItem(accessToken, item.id)
    setBusyId(null)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setItems((prev) => prev.filter((it) => it.id !== item.id))
  }

  async function onSaveEditor(e: FormEvent) {
    e.preventDefault()
    if (!accessToken || !editor) return
    if (!editor.name.trim()) {
      setError('Item name is required.')
      return
    }
    if (editor.price < 0 || Number.isNaN(editor.price)) {
      setError('Enter a valid price in naira.')
      return
    }

    setSaving(true)
    setError(null)

    if (editor.id) {
      const result = await updateMenuItem(accessToken, editor.id, {
        name: editor.name.trim(),
        price: Math.round(editor.price),
        description: editor.description.trim(),
        available: editor.available,
      })
      setSaving(false)
      if (!result.ok) {
        setError(result.reason)
        return
      }
      setItems((prev) => prev.map((it) => (it.id === result.item.id ? result.item : it)))
    } else {
      const result = await addMenuItem(accessToken, {
        name: editor.name.trim(),
        price: Math.round(editor.price),
        description: editor.description.trim(),
      })
      setSaving(false)
      if (!result.ok) {
        setError(result.reason)
        return
      }
      setItems((prev) => [...prev, result.item])
    }

    setEditor(null)
  }

  if (!accessToken) {
    return (
      <p className="text-sm font-semibold text-muted">
        Sign in again to manage your menu.
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">Menu</h1>
          <p className="mt-1 text-sm text-muted">
            Prices and availability sync live to buyers.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="rounded-full bg-mist px-3 py-2 text-xs font-extrabold"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? '…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="rounded-full bg-ink px-3 py-2 text-xs font-extrabold text-white"
            onClick={() => setEditor(emptyDraft())}
          >
            Add item
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-mango/15 px-3 py-2 text-sm font-semibold text-mango-deep">
          {error}
        </p>
      )}

      {loading && items.length === 0 ? (
        <p className="mt-8 text-sm font-semibold text-muted">Loading menu…</p>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-[1.5rem] border-[3px] border-dashed border-ink/20 bg-paper px-5 py-10 text-center">
          <p className="font-display text-xl font-semibold">No items yet</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            Add your first dish or product — buyers will see it once you’re approved
            and live.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2.5">
          {items.map((item) => {
            const hidden = item.available === false
            const busy = busyId === item.id
            return (
              <li
                key={item.id}
                className={`rounded-2xl bg-paper p-4 ring-1 ring-line ${
                  hidden ? 'opacity-55' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{item.name}</p>
                    {item.description && (
                      <p className="mt-0.5 text-sm text-muted">{item.description}</p>
                    )}
                    <p className="mt-1.5 text-sm font-extrabold">{formatNaira(item.price)}</p>
                    {hidden && (
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-mango-deep">
                        Hidden
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <button
                      type="button"
                      className="rounded-full bg-mist px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                      disabled={busy}
                      onClick={() =>
                        setEditor({
                          id: item.id,
                          name: item.name,
                          description: item.description,
                          price: item.price,
                          available: item.available !== false,
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-mist px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void toggleAvailable(item)}
                    >
                      {hidden ? 'Show' : 'Hide'}
                    </button>
                    <button
                      type="button"
                      className="rounded-full px-3 py-1.5 text-xs font-bold text-mango-deep disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void onDelete(item)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editor && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 sm:items-center sm:p-4">
          <form
            onSubmit={onSaveEditor}
            className="w-full max-w-md rounded-t-[1.5rem] bg-paper p-5 shadow-xl sm:rounded-[1.5rem]"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">
                {editor.id ? 'Edit item' : 'New item'}
              </h2>
              <button
                type="button"
                className="text-xs font-bold text-muted"
                onClick={() => setEditor(null)}
                disabled={saving}
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-bold text-muted">Name</span>
                <input
                  className="field mt-1"
                  value={editor.name}
                  onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                  required
                  disabled={saving}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-muted">Description</span>
                <textarea
                  className="field mt-1 min-h-[4.5rem]"
                  value={editor.description}
                  onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                  disabled={saving}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-muted">Price (₦)</span>
                <input
                  className="field mt-1"
                  type="number"
                  min={0}
                  step={1}
                  value={editor.price}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      price: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  required
                  disabled={saving}
                />
              </label>
              {editor.id && (
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={editor.available}
                    onChange={(e) =>
                      setEditor({ ...editor, available: e.target.checked })
                    }
                    disabled={saving}
                  />
                  Available (uncheck = hidden from buyers)
                </label>
              )}
            </div>
            <button type="submit" className="btn-primary mt-5 w-full" disabled={saving}>
              {saving ? 'Saving…' : editor.id ? 'Save changes' : 'Add to menu'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
