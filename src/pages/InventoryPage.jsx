import { useMemo, useState } from 'react'

const STALE_DAYS = 60

export default function InventoryPage({
  sections, inventory, listItems, lists, activeListId, onSwitchList, activeList,
  onAddToList, onAddInventoryItem, onUpdateInventoryItem, onDeleteInventoryItem,
  onAddSection, onUpdateSection, onDeleteSection,
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
    () => new Set(listItems.map((i) => i.inventory_item_id).filter(Boolean)),
    [listItems]
  )

  const sectionById = useMemo(() => {
    const map = new Map()
    sections.forEach((s) => map.set(s.id, s))
    return map
  }, [sections])

  const itemsBySection = useMemo(() => {
    const map = new Map()
    inventory.forEach((item) => {
      const key = item.section_id || 'none'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    })
    return map
  }, [inventory])

  const staples = useMemo(() => inventory.filter((i) => i.is_staple), [inventory])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return inventory.filter((item) => {
      if (staplesOnly && !item.is_staple) return false
      if (sectionFilter && item.section_id !== sectionFilter) return false
      if (!q) return true
      const sectionName = sectionById.get(item.section_id)?.name?.toLowerCase() || ''
      return item.name.toLowerCase().includes(q) || sectionName.includes(q)
    })
  }, [inventory, query, sectionFilter, staplesOnly, sectionById])

  const groupedFiltered = useMemo(() => {
    const map = new Map()
    for (const item of filtered) {
      const key = item.section_id || 'none'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }
    const groups = Array.from(map.entries()).map(([sectionId, items]) => ({
      section: sectionById.get(sectionId) || { id: 'none', name: 'Other', sort_order: 9999 },
      items,
    }))
    groups.sort((a, b) => a.section.sort_order - b.section.sort_order)
    return groups
  }, [filtered, sectionById])

  const isFiltering = query || sectionFilter || staplesOnly
  const hasMultipleLists = lists && lists.length > 1

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>Inventory</h1>
          <div style={styles.headerActions}>
            <button style={styles.secondaryBtn} onClick={() => setShowAisles(true)}>Aisles</button>
            <button style={styles.primaryBtn} onClick={() => setShowNewItem(true)}>+ Item</button>
          </div>
        </div>

        {/* List switcher — same pattern as List tab */}
        {hasMultipleLists && (
          <div style={styles.listSwitcher}>
            <span style={styles.addingToLabel}>Adding to:</span>
            <div style={styles.switcherBtns}>
              {lists.map((list) => {
                const isActive = list.id === activeListId
                return (
                  <button
                    key={list.id}
                    onClick={() => onSwitchList(list.id)}
                    style={{
                      ...styles.switcherBtn,
                      background: isActive ? 'var(--charcoal)' : 'var(--chalk-dim)',
                      color: isActive ? 'var(--chalk)' : 'var(--charcoal-soft)',
                    }}
                  >
                    {list.kind === 'shared' ? '🛒 ' : '👤 '}{list.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {!hasMultipleLists && (
          <p style={styles.addingTo}>
            Adding to <strong>{activeList?.kind === 'shared' ? '🛒 ' : '👤 '}{activeList?.name || 'list'}</strong>
          </p>
        )}

        <input
          type="text"
          placeholder="Search items..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.search}
        />

        <div style={styles.filterRow}>
          <select
            style={styles.dropdown}
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
          >
            <option value="">All aisles</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <button
            style={{ ...styles.stapleToggle, background: staplesOnly ? 'var(--mustard)' : 'var(--chalk-dim)', color: staplesOnly ? '#fff' : 'var(--charcoal-soft)' }}
            onClick={() => setStaplesOnly(!staplesOnly)}
          >
            ★ Staples
          </button>

          {isFiltering && (
            <button
              style={styles.clearFilter}
              onClick={() => { setQuery(''); setSectionFilter(''); setStaplesOnly(false) }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div style={styles.scroll}>
        {!isFiltering && staples.length > 0 && (
          <div style={styles.sectionGroup}>
            <div style={{ ...styles.sectionHeader, background: 'var(--terracotta)' }}>★ Staples</div>
            {staples.map((item) => (
              <InventoryRow key={item.id} item={item} inList={listedIds.has(item.id)} onAdd={onAddToList} onEdit={() => setEditingItem(item)} />
            ))}
          </div>
        )}

        {groupedFiltered.map(({ section, items }) => (
          <div key={section.id} style={styles.sectionGroup}>
            <div style={styles.sectionHeader}>{section.name}</div>
            {items.map((item) => (
              <InventoryRow key={item.id} item={item} inList={listedIds.has(item.id)} onAdd={onAddToList} onEdit={() => setEditingItem(item)} />
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={styles.empty}>
            <p style={styles.emptyTitle}>No matches</p>
            <p style={styles.emptyBody}>Try a different search, or tap "+ Item" to add it.</p>
          </div>
        )}
      </div>

      {editingItem && (
        <Modal onClose={() => setEditingItem(null)}>
          <ItemForm
            item={editingItem}
            sections={sections}
            onSave={async (updates) => { await onUpdateInventoryItem(editingItem.id, updates); setEditingItem(null) }}
            onDelete={async () => { await onDeleteInventoryItem(editingItem.id); setEditingItem(null) }}
            onCancel={() => setEditingItem(null)}
          />
        </Modal>
      )}

      {showNewItem && (
        <Modal onClose={() => setShowNewItem(false)}>
          <ItemForm
            sections={sections}
            onSave={async (item) => { await onAddInventoryItem(item); setShowNewItem(false) }}
            onCancel={() => setShowNewItem(false)}
          />
        </Modal>
      )}

      {showAisles && (
        <Modal onClose={() => { setShowAisles(false); setEditingSection(null) }}>
          <div style={styles.form}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={styles.formTitle}>Aisles</p>
              <button style={styles.primaryBtn} onClick={() => setShowNewSection(true)}>+ Aisle</button>
            </div>
            {[...sections].sort((a, b) => a.sort_order - b.sort_order).map((section) =>
              editingSection?.id === section.id ? (
                <EditSectionForm
                  key={section.id}
                  section={section}
                  itemCount={(itemsBySection.get(section.id) || []).length}
                  onSave={async (updates) => { await onUpdateSection(section.id, updates); setEditingSection(null) }}
                  onCancel={() => setEditingSection(null)}
                  onDelete={async () => { await onDeleteSection(section.id); setEditingSection(null) }}
                />
              ) : (
                <button key={section.id} style={styles.aisleRow} onClick={() => setEditingSection(section)}>
                  <span style={styles.aisleName}>{section.name}</span>
                  <span style={styles.aisleMeta}>{(itemsBySection.get(section.id) || []).length} items · #{section.sort_order}</span>
                </button>
              )
            )}
          </div>
        </Modal>
      )}

      {showNewSection && (
        <Modal onClose={() => setShowNewSection(false)}>
          <div style={styles.form}>
            <p style={styles.formTitle}>New aisle</p>
            <NewSectionForm
              sections={sections}
              onSave={async (name, sortOrder) => { await onAddSection(name, sortOrder); setShowNewSection(false) }}
              onCancel={() => setShowNewSection(false)}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}

function InventoryRow({ item, inList, onAdd, onEdit }) {
  return (
    <div style={styles.row}>
      <button style={styles.rowMain} onClick={() => onAdd(item)}>
        <span style={styles.rowName}>
          {item.is_staple && <span style={styles.staplemark}>★ </span>}
          {item.name}
        </span>
        {item.est_price != null && (
          <span style={styles.rowPrice} className="mono">
            ${Number(item.est_price).toFixed(2)}
            {item.price_is_estimate && <span style={styles.estTag}> est.</span>}
          </span>
        )}
      </button>
      <button style={{ ...styles.addBtn, background: inList ? 'var(--sage)' : 'var(--terracotta)' }} onClick={() => onAdd(item)}>
        {inList ? '✓' : '+'}
      </button>
      <button style={styles.editIconBtn} onClick={onEdit} aria-label={'Edit ' + item.name}>✎</button>
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
    await onSave({
      name: name.trim(),
      section_id: sectionId || null,
      est_price: price ? Number(price) : null,
      price_updated_at: price ? new Date().toISOString() : (item?.price_updated_at || null),
      price_is_estimate: priceChanged ? true : (item?.price_is_estimate ?? true),
      is_staple: isStaple,
    })
    setSaving(false)
  }

  return (
    <div style={styles.form}>
      <p style={styles.formTitle}>{isEdit ? 'Edit item' : 'New item'}</p>
      <label style={styles.fieldLabel}>
        Name
        <input autoFocus style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sourdough Bread" />
      </label>
      <label style={styles.fieldLabel}>
        Aisle
        <select style={styles.input} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          <option value="">No aisle</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label style={styles.fieldLabel}>
        Estimated price
        <input style={styles.input} type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
      </label>
      {isEdit && item.price_updated_at && (
        <p style={styles.priceMeta}>Last updated {new Date(item.price_updated_at).toLocaleDateString()}{item.price_is_estimate ? ' · estimate' : ' · receipt-verified'}</p>
      )}
      <label style={styles.checkboxRow}>
        <input type="checkbox" checked={isStaple} onChange={(e) => setIsStaple(e.target.checked)} />
        Weekly staple
      </label>
      {confirmDelete ? (
        <div style={styles.deleteConfirm}>
          <p style={{ fontSize: 14, margin: '0 0 12px' }}>Delete "{item?.name}" from inventory?</p>
          <div style={styles.formActions}>
            <button style={styles.modalCancel} onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button style={styles.modalConfirm} onClick={onDelete}>Delete</button>
          </div>
        </div>
      ) : (
        <>
          <div style={styles.formActions}>
            <button style={styles.modalCancel} onClick={onCancel}>Cancel</button>
            <button style={styles.modalConfirm} onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : isEdit ? 'Save' : 'Add item'}
            </button>
          </div>
          {isEdit && <button style={styles.deleteLink} onClick={() => setConfirmDelete(true)}>Delete item</button>}
        </>
      )}
    </div>
  )
}

function EditSectionForm({ section, itemCount, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(section.name)
  const [sortOrder, setSortOrder] = useState(String(section.sort_order))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({ name: name.trim(), sort_order: parseInt(sortOrder) || section.sort_order })
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={styles.fieldLabel}>Name<input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label style={styles.fieldLabel}>Walking order<input style={styles.input} type="number" min="1" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></label>
      {confirmDelete ? (
        <div style={styles.deleteConfirm}>
          <p style={{ fontSize: 14, margin: '0 0 12px' }}>
            {itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? 's' : ''} still in this aisle. Reassign them first.` : 'Delete this aisle?'}
          </p>
          <div style={styles.formActions}>
            <button style={styles.modalCancel} onClick={() => setConfirmDelete(false)}>Cancel</button>
            {itemCount === 0 && <button style={styles.modalConfirm} onClick={onDelete}>Delete</button>}
          </div>
        </div>
      ) : (
        <>
          <div style={styles.formActions}>
            <button style={styles.modalCancel} onClick={onCancel}>Cancel</button>
            <button style={styles.modalConfirm} onClick={handleSave} disabled={saving || !name.trim()}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
          <button style={styles.deleteLink} onClick={() => setConfirmDelete(true)}>Delete aisle</button>
        </>
      )}
    </div>
  )
}

function NewSectionForm({ sections, onSave, onCancel }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const maxOrder = sections.reduce((max, s) => Math.max(max, s.sort_order), 0)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave(name.trim(), maxOrder + 1)
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={styles.fieldLabel}>Name<input autoFocus style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. International Foods" /></label>
      <div style={styles.formActions}>
        <button style={styles.modalCancel} onClick={onCancel}>Cancel</button>
        <button style={styles.modalConfirm} onClick={handleSave} disabled={saving || !name.trim()}>{saving ? 'Saving...' : 'Add aisle'}</button>
      </div>
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0 },
  header: { padding: '16px 16px 10px', borderBottom: '1px solid var(--line)', background: 'var(--chalk)' },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, margin: 0, color: 'var(--charcoal)' },
  headerActions: { display: 'flex', gap: 8 },
  secondaryBtn: { border: '1px solid var(--line)', background: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' },
  primaryBtn: { border: 'none', background: 'var(--terracotta)', color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 600 },
  listSwitcher: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  addingToLabel: { fontSize: 13, color: 'var(--charcoal-soft)', whiteSpace: 'nowrap' },
  switcherBtns: { display: 'flex', gap: 6, flex: 1 },
  switcherBtn: { flex: 1, border: 'none', borderRadius: 8, padding: '7px 8px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  addingTo: { fontSize: 13, color: 'var(--charcoal-soft)', margin: '0 0 10px' },
  search: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 15, background: '#fff', marginBottom: 8 },
  filterRow: { display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 4 },
  dropdown: { flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13, background: '#fff', color: 'var(--charcoal)' },
  stapleToggle: { border: 'none', borderRadius: 20, padding: '7px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 },
  clearFilter: { border: '1px solid var(--line)', background: 'none', borderRadius: 20, padding: '7px 12px', fontSize: 12, color: 'var(--charcoal-soft)', whiteSpace: 'nowrap', flexShrink: 0 },
  scroll: { flex: 1, overflowY: 'auto', paddingBottom: 16 },
  sectionGroup: { marginBottom: 4 },
  sectionHeader: { position: 'sticky', top: 0, background: 'var(--charcoal)', color: 'var(--chalk)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '8px 16px', zIndex: 1 },
  row: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line)', background: 'var(--chalk)' },
  rowMain: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, background: 'none', border: 'none', textAlign: 'left', padding: 0 },
  rowName: { fontSize: 16, color: 'var(--charcoal)' },
  staplemark: { color: 'var(--mustard)' },
  rowPrice: { fontSize: 13, color: 'var(--charcoal-soft)' },
  estTag: { fontSize: 11, fontFamily: 'var(--font-body)', opacity: 0.7 },
  addBtn: { border: 'none', borderRadius: 8, width: 36, height: 36, color: '#fff', fontSize: 18, fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  editIconBtn: { border: 'none', background: 'none', color: 'var(--charcoal-soft)', fontSize: 18, padding: '0 4px', flexShrink: 0 },
  empty: { padding: '40px 20px', textAlign: 'center' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '0 0 6px' },
  emptyBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: 0 },
  aisleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--line)', background: 'none', border: 'none', width: '100%', textAlign: 'left', borderBottom: '1px solid var(--line)', cursor: 'pointer' },
  aisleName: { fontSize: 15, color: 'var(--charcoal)', fontWeight: 500 },
  aisleMeta: { fontSize: 12, color: 'var(--charcoal-soft)' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 10 },
  modalCard: { background: 'var(--chalk)', borderRadius: '16px 16px 0 0', padding: '24px 0 32px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' },
  form: { display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 20px 8px' },
  formTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: 0 },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--charcoal-soft)' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 15, background: '#fff', color: 'var(--charcoal)' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--charcoal)' },
  priceMeta: { fontSize: 12, color: 'var(--charcoal-soft)', margin: 0 },
  formActions: { display: 'flex', gap: 10, marginTop: 6 },
  modalCancel: { flex: 1, padding: '11px', borderRadius: 8, border: '1px solid var(--line)', background: 'none', color: 'var(--charcoal)', fontWeight: 600 },
  modalConfirm: { flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: 'var(--terracotta)', color: '#fff', fontWeight: 600 },
  deleteConfirm: { background: 'var(--chalk-dim)', borderRadius: 10, padding: 14 },
  deleteLink: { border: 'none', background: 'none', color: 'var(--danger)', fontSize: 13, textAlign: 'center', textDecoration: 'underline', marginTop: 4 },
}
