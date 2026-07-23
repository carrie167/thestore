import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'

export default function InventoryPage({
  sections, inventory, listItems, activeList,
  onAddToList, onAddInventoryItem, onUpdateInventoryItem, onDeleteInventoryItem,
  onAddSection, onUpdateSection, onDeleteSection, onMenuOpen,
}) {
  const [query, setQuery] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [staplesOnly, setStaplesOnly] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showNewItem, setShowNewItem] = useState(false)
  const [showAisles, setShowAisles] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [showNewSection, setShowNewSection] = useState(false)

  const listedIds = useMemo(
    () => new Set(listItems.map(i => i.inventory_item_id).filter(Boolean)),
    [listItems]
  )

  const sectionById = useMemo(() => {
    const map = new Map(); sections.forEach(s => map.set(s.id, s)); return map
  }, [sections])

  const itemsBySection = useMemo(() => {
    const map = new Map()
    inventory.forEach(item => {
      const key = item.section_id || 'none'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    })
    return map
  }, [inventory])

  const staples = useMemo(() => inventory.filter(i => i.is_staple), [inventory])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return inventory.filter(item => {
      if (staplesOnly && !item.is_staple) return false
      if (sectionFilter && item.section_id !== sectionFilter) return false
      if (!q) return true
      return item.name.toLowerCase().includes(q) || (sectionById.get(item.section_id)?.name || '').toLowerCase().includes(q)
    })
  }, [inventory, query, sectionFilter, staplesOnly, sectionById])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const item of filtered) {
      const key = item.section_id || 'none'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }
    return Array.from(map.entries())
      .map(([sid, items]) => ({ section: sectionById.get(sid) || { id: 'none', name: 'Other', sort_order: 9999 }, items }))
      .sort((a, b) => a.section.sort_order - b.section.sort_order)
  }, [filtered, sectionById])

  const isFiltering = query || sectionFilter || staplesOnly

  return (
    <div style={s.page}>
      <PageHeader
        title="Inventory"
        onMenuOpen={onMenuOpen}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.aislesBtn} onClick={() => setShowAisles(true)}>Aisles</button>
            <button style={s.addBtn} onClick={() => setShowNewItem(true)}>+ Item</button>
          </div>
        }
      />
      <div style={s.header}>
        <p style={s.addingTo}>Adding to <strong style={{ color: 'var(--charcoal)' }}>{activeList?.name || '—'}</strong></p>
        <input style={s.search} placeholder="Search items…" value={query} onChange={e => setQuery(e.target.value)} />
        <div style={s.filterRow}>
          <select style={s.dropdown} value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
            <option value="">All aisles</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button
            style={{ ...s.stapleBtn, background: staplesOnly ? 'var(--sage)' : 'var(--cream)', color: staplesOnly ? '#fff' : 'var(--charcoal-soft)' }}
            onClick={() => setStaplesOnly(!staplesOnly)}
          >★ Staples</button>
          {isFiltering && <button style={s.clearFilter} onClick={() => { setQuery(''); setSectionFilter(''); setStaplesOnly(false) }}>Clear</button>}
        </div>
      </div>

      <div style={s.scroll}>
        {!isFiltering && staples.length > 0 && (
          <div>
            <div style={{ ...s.aisleHeader, background: 'var(--primary-dark)' }}>★ Staples</div>
            {staples.map(item => <InventoryRow key={item.id} item={item} inList={listedIds.has(item.id)} onAdd={onAddToList} onEdit={() => setEditingItem(item)} />)}
          </div>
        )}
        {grouped.map(({ section, items }) => (
          <div key={section.id}>
            <div style={s.aisleHeader}>{section.name}</div>
            {items.map(item => <InventoryRow key={item.id} item={item} inList={listedIds.has(item.id)} onAdd={onAddToList} onEdit={() => setEditingItem(item)} />)}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={s.empty}>
            <p style={s.emptyTitle}>No matches</p>
            <p style={s.emptyBody}>Try a different search, or tap "+ Item".</p>
          </div>
        )}
      </div>

      {(editingItem || showNewItem) && (
        <Sheet onClose={() => { setEditingItem(null); setShowNewItem(false) }}>
          <ItemForm
            item={editingItem}
            sections={sections}
            onSave={async updates => {
              if (editingItem) await onUpdateInventoryItem(editingItem.id, updates)
              else await onAddInventoryItem(updates)
              setEditingItem(null); setShowNewItem(false)
            }}
            onDelete={editingItem ? async () => { await onDeleteInventoryItem(editingItem.id); setEditingItem(null) } : null}
            onCancel={() => { setEditingItem(null); setShowNewItem(false) }}
          />
        </Sheet>
      )}

      {showAisles && (
        <Sheet onClose={() => { setShowAisles(false); setEditingSection(null) }}>
          <div style={s.sheetInner}>
            <div style={s.sheetHeaderRow}>
              <p style={s.sheetTitle}>Aisles</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.addBtn} onClick={() => setShowNewSection(true)}>+ Aisle</button>
                <button style={s.doneBtn} onClick={() => { setShowAisles(false); setEditingSection(null) }}>Done</button>
              </div>
            </div>
            {[...sections].sort((a, b) => a.sort_order - b.sort_order).map(section =>
              editingSection?.id === section.id ? (
                <EditSectionForm
                  key={section.id}
                  section={section}
                  itemCount={(itemsBySection.get(section.id) || []).length}
                  onSave={async updates => { await onUpdateSection(section.id, updates); setEditingSection(null) }}
                  onCancel={() => setEditingSection(null)}
                  onDelete={async () => { await onDeleteSection(section.id); setEditingSection(null) }}
                />
              ) : (
                <button key={section.id} style={s.aisleRow} onClick={() => setEditingSection(section)}>
                  <span style={s.aisleRowName}>{section.name}</span>
                  <span style={s.aisleRowMeta}>{(itemsBySection.get(section.id) || []).length} items · #{section.sort_order}</span>
                </button>
              )
            )}
          </div>
        </Sheet>
      )}

      {showNewSection && (
        <Sheet onClose={() => setShowNewSection(false)}>
          <div style={s.sheetInner}>
            <p style={s.sheetTitle}>New aisle</p>
            <NewSectionForm sections={sections} onSave={async (name, order) => { await onAddSection(name, order); setShowNewSection(false) }} onCancel={() => setShowNewSection(false)} />
          </div>
        </Sheet>
      )}
    </div>
  )
}

function InventoryRow({ item, inList, onAdd, onEdit }) {
  return (
    <div style={s.row}>
      <button style={s.rowMain} onClick={() => onAdd(item)}>
        <span style={s.rowName}>{item.is_staple && <span style={{ color: 'var(--sage-dark)' }}>★ </span>}{item.name}</span>
        {item.est_price != null && (
          <span style={s.rowPrice}>${Number(item.est_price).toFixed(2)}{item.price_is_estimate && <span style={s.est}> est.</span>}</span>
        )}
      </button>
      <button style={{ ...s.addCircle, background: inList ? 'var(--sage-dark)' : 'var(--primary)' }} onClick={() => onAdd(item)}>
        {inList ? '✓' : '+'}
      </button>
      <button style={s.editIcon} onClick={onEdit}>✎</button>
    </div>
  )
}

function ItemForm({ item, sections, onSave, onDelete, onCancel }) {
  const [name, setName] = useState(item?.name || '')
  const [sectionId, setSectionId] = useState(item?.section_id || sections[0]?.id || '')
  const [price, setPrice] = useState(item?.est_price != null ? String(item.est_price) : '')
  const [isStaple, setIsStaple] = useState(item?.is_staple || false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const isEdit = !!item
  const priceChanged = isEdit && price !== (item.est_price != null ? String(item.est_price) : '')

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), section_id: sectionId || null, est_price: price ? Number(price) : null, price_updated_at: price ? new Date().toISOString() : (item?.price_updated_at || null), price_is_estimate: priceChanged ? true : (item?.price_is_estimate ?? true), is_staple: isStaple })
    setSaving(false)
  }

  return (
    <div style={s.sheetInner}>
      <p style={s.sheetTitle}>{isEdit ? 'Edit item' : 'New item'}</p>
      <label style={s.fieldLabel}>Name<input autoFocus style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sourdough Bread" /></label>
      <label style={s.fieldLabel}>Aisle
        <select style={s.input} value={sectionId} onChange={e => setSectionId(e.target.value)}>
          <option value="">No aisle</option>
          {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
        </select>
      </label>
      <label style={s.fieldLabel}>Estimated price<input style={s.input} type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" /></label>
      {isEdit && item.price_updated_at && <p style={s.priceMeta}>Last updated {new Date(item.price_updated_at).toLocaleDateString()}{item.price_is_estimate ? ' · estimate' : ' · receipt-verified'}</p>}
      <label style={s.checkLabel}><input type="checkbox" checked={isStaple} onChange={e => setIsStaple(e.target.checked)} style={{ accentColor: 'var(--sage)' }} />Weekly staple</label>
      {confirmDelete ? (
        <div style={s.deleteBox}>
          <p style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--charcoal)' }}>Delete "{item?.name}"?</p>
          <div style={s.formActions}>
            <button style={s.cancelBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button style={s.confirmBtn} onClick={onDelete}>Delete</button>
          </div>
        </div>
      ) : (
        <>
          <div style={s.formActions}>
            <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
            <button style={s.confirmBtn} onClick={handleSave} disabled={saving || !name.trim()}>{saving ? 'Saving…' : isEdit ? 'Save' : 'Add item'}</button>
          </div>
          {isEdit && onDelete && <button style={s.deleteLink} onClick={() => setConfirmDelete(true)}>Delete item</button>}
        </>
      )}
    </div>
  )
}

function EditSectionForm({ section, itemCount, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(section.name)
  const [order, setOrder] = useState(String(section.sort_order))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({ name: name.trim(), sort_order: parseInt(order) || section.sort_order })
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
      <label style={s.fieldLabel}>Name<input style={s.input} value={name} onChange={e => setName(e.target.value)} /></label>
      <label style={s.fieldLabel}>Walking order<input style={s.input} type="number" min="1" value={order} onChange={e => setOrder(e.target.value)} /></label>
      {confirmDelete ? (
        <div style={s.deleteBox}>
          <p style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--charcoal)' }}>
            {itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? 's' : ''} still assigned here. Reassign them first.` : 'Delete this aisle?'}
          </p>
          <div style={s.formActions}>
            <button style={s.cancelBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
            {itemCount === 0 && <button style={s.confirmBtn} onClick={onDelete}>Delete</button>}
          </div>
        </div>
      ) : (
        <>
          <div style={s.formActions}>
            <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
            <button style={s.confirmBtn} onClick={handleSave} disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
          <button style={s.deleteLink} onClick={() => setConfirmDelete(true)}>Delete aisle</button>
        </>
      )}
    </div>
  )
}

function NewSectionForm({ sections, onSave, onCancel }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const maxOrder = sections.reduce((m, s) => Math.max(m, s.sort_order), 0)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave(name.trim(), maxOrder + 1)
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={s.fieldLabel}>Name<input autoFocus style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. International Foods" /></label>
      <div style={s.formActions}>
        <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
        <button style={s.confirmBtn} onClick={handleSave} disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Add aisle'}</button>
      </div>
    </div>
  )
}

function Sheet({ children, onClose }) {
  return (
    <div style={s.sheetOverlay} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.sheetHandle} />
        {children}
      </div>
    </div>
  )
}

const s = {
  page: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--cream)' },
  header: { background: '#fff', padding: '10px 14px', borderBottom: '0.5px solid var(--cream-border)' },
  aislesBtn: { border: '1px solid rgba(255,255,255,0.4)', background: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, color: '#fff' },
  addBtn: { border: 'none', background: 'var(--sage)', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600 },
  doneBtn: { border: '1px solid var(--cream-border)', background: '#fff', color: 'var(--charcoal)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600 },
  addingTo: { fontSize: 13, color: 'var(--charcoal-soft)', margin: '0 0 10px' },
  search: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--cream-border)', fontSize: 15, background: 'var(--cream-light)', marginBottom: 8, boxSizing: 'border-box' },
  filterRow: { display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 2 },
  dropdown: { flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--cream-border)', fontSize: 13, background: '#fff', color: 'var(--charcoal)' },
  stapleBtn: { border: 'none', borderRadius: 20, padding: '7px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 },
  clearFilter: { border: '1px solid var(--cream-border)', background: 'none', borderRadius: 20, padding: '7px 12px', fontSize: 12, color: 'var(--charcoal-soft)', whiteSpace: 'nowrap' },
  scroll: { flex: 1, overflowY: 'auto', paddingBottom: 16 },
  aisleHeader: { background: 'var(--aisle-bg)', padding: '6px 14px', position: 'sticky', top: 0, zIndex: 10, fontSize: 10, fontWeight: 600, color: 'var(--aisle-text)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  row: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '0.5px solid var(--cream)', background: '#fff' },
  rowMain: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, background: 'none', border: 'none', textAlign: 'left', padding: 0 },
  rowName: { fontSize: 15, color: 'var(--charcoal)', fontFamily: 'var(--font-body)' },
  rowPrice: { fontSize: 12, color: 'var(--tan)', fontFamily: 'var(--font-mono)' },
  est: { fontSize: 10, fontFamily: 'var(--font-body)', opacity: 0.7 },
  addCircle: { width: 34, height: 34, borderRadius: 8, border: 'none', color: '#fff', fontSize: 18, fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  editIcon: { border: 'none', background: 'none', color: 'var(--charcoal-soft)', fontSize: 16, padding: '0 4px', flexShrink: 0 },
  empty: { padding: '40px 20px', textAlign: 'center' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 6px', color: 'var(--charcoal)' },
  emptyBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: 0 },
  aisleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', background: 'none', border: 'none', borderBottom: '0.5px solid var(--cream-border)', width: '100%', textAlign: 'left', cursor: 'pointer' },
  aisleRowName: { fontSize: 15, color: 'var(--charcoal)', fontWeight: 500 },
  aisleRowMeta: { fontSize: 12, color: 'var(--charcoal-soft)' },
  sheetOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20 },
  sheet: { background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', padding: '0 0 32px' },
  sheetHandle: { width: 36, height: 4, background: 'var(--cream-border)', borderRadius: 2, margin: '12px auto 16px' },
  sheetInner: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 },
  sheetHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: 0, color: 'var(--charcoal)' },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--charcoal-soft)' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-border)', fontSize: 15, background: '#fff', color: 'var(--charcoal)', boxSizing: 'border-box' },
  priceMeta: { fontSize: 12, color: 'var(--charcoal-soft)', margin: 0 },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--charcoal)' },
  deleteBox: { background: 'var(--cream)', borderRadius: 10, padding: 14 },
  formActions: { display: 'flex', gap: 10 },
  cancelBtn: { flex: 1, padding: 11, borderRadius: 8, border: '1px solid var(--cream-border)', background: 'none', color: 'var(--charcoal)', fontWeight: 600 },
  confirmBtn: { flex: 1, padding: 11, borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600 },
  deleteLink: { border: 'none', background: 'none', color: 'var(--danger)', fontSize: 13, textAlign: 'center', textDecoration: 'underline', marginTop: 4 },
}
