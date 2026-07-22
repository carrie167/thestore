import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import MemberPicker from '../components/MemberPicker'

export default function ListPage({
  sections, listItems, lists, listMembers, activeListId, activeList,
  onSwitchList, onToggle, onRemove, onClear, onUpdateQuantity,
  onCreateList, onDeleteList, onUpdateList, onAddFreetext,
  otherMembers, onMenuOpen,
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListMembers, setNewListMembers] = useState([])
  const [creatingList, setCreatingList] = useState(false)
  const [freetextName, setFreetextName] = useState('')
  const [freetextPrice, setFreetextPrice] = useState('')
  const [showFreetext, setShowFreetext] = useState(false)
  const [editingList, setEditingList] = useState(null)
  const [editName, setEditName] = useState('')
  const [editMembers, setEditMembers] = useState([])

  const sectionById = useMemo(() => { const m = new Map(); sections.forEach(s => m.set(s.id, s)); return m }, [sections])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const item of listItems) {
      const key = item.section_id || 'none'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }
    return Array.from(map.entries())
      .map(([sid, items]) => ({ section: sectionById.get(sid) || { id: 'none', name: 'Other', sort_order: 9999 }, items }))
      .sort((a, b) => a.section.sort_order - b.section.sort_order)
  }, [listItems, sectionById])

  const total = useMemo(() => listItems.reduce((sum, i) => sum + (i.est_price ? Number(i.est_price) * (i.quantity || 1) : 0), 0), [listItems])
  const checkedCount = listItems.filter(i => i.is_checked).length

  function getListSharedWith(listId) {
    return listMembers.filter(m => m.list_id === listId).map(m => m.user_id)
  }

  async function handleCreate() {
    if (!newListName.trim()) return
    setCreatingList(true)
    try {
      const list = await onCreateList(newListName.trim(), newListMembers)
      onSwitchList(list.id)
      setNewListName(''); setNewListMembers([]); setShowPicker(false)
    } finally { setCreatingList(false) }
  }

  async function handleAddFreetext(e) {
    e.preventDefault()
    if (!freetextName.trim()) return
    await onAddFreetext(freetextName.trim(), freetextPrice)
    setFreetextName(''); setFreetextPrice(''); setShowFreetext(false)
  }

  function startEditList(list) {
    setEditingList(list)
    setEditName(list.name)
    setEditMembers(getListSharedWith(list.id))
  }

  async function handleUpdateList() {
    await onUpdateList(editingList.id, editName, editMembers)
    setEditingList(null)
  }

  const sharedWith = activeList ? getListSharedWith(activeList.id) : []

  return (
    <div style={s.page}>
      <PageHeader
        title="TheStore"
        onMenuOpen={onMenuOpen}
        right={
          <div style={s.headerTotals}>
            <span style={s.totalValue}>${total.toFixed(2)}</span>
            {listItems.length > 0 && <button style={s.clearBtn} onClick={() => setConfirmClear(true)}>Clear</button>}
          </div>
        }
      />

      {/* Active list selector */}
      <div style={s.listSelectorBar}>
        <button style={s.selectorBtn} onClick={() => setShowPicker(true)}>
          <div>
            <p style={s.selectorLabel}>Shopping at</p>
            <p style={s.selectorName}>{activeList?.name || 'No list — tap to create one'}</p>
          </div>
          <div style={s.selectorRight}>
            {sharedWith.length > 0 && <span style={s.sharedBadge}>Shared</span>}
            <span style={s.chevron}>⌄</span>
          </div>
        </button>
        {activeList && <button style={s.editListBtn} onClick={() => startEditList(activeList)}>Edit</button>}
      </div>

      {listItems.length > 0 && (
        <div style={s.meta}>
          <span style={s.metaText}>{checkedCount} of {listItems.length} checked</span>
          <span style={s.totalLabel}>Est. total <span style={s.totalMono}>${total.toFixed(2)}</span></span>
        </div>
      )}

      {/* Quick-add freetext */}
      {showFreetext ? (
        <form onSubmit={handleAddFreetext} style={s.freetextBar}>
          <input autoFocus style={{ ...s.freetextInput, flex: 2 }} value={freetextName} onChange={e => setFreetextName(e.target.value)} placeholder="Item name…" />
          <input style={{ ...s.freetextInput, flex: 1 }} type="number" step="0.01" min="0" value={freetextPrice} onChange={e => setFreetextPrice(e.target.value)} placeholder="$0.00" />
          <button type="submit" style={s.freetextAdd}>Add</button>
          <button type="button" style={s.freetextCancel} onClick={() => setShowFreetext(false)}>×</button>
        </form>
      ) : (
        activeList && <button style={s.freetextToggle} onClick={() => setShowFreetext(true)}>+ Quick add item</button>
      )}

      {listItems.length === 0 ? (
        <div style={s.empty}>
          <p style={s.emptyTitle}>{activeList ? 'List is empty' : 'No list selected'}</p>
          <p style={s.emptyBody}>{activeList ? 'Head to Inventory to add items, or use Quick add above.' : 'Tap "Shopping at" above to create or select a list.'}</p>
        </div>
      ) : (
        <div style={s.scroll}>
          {grouped.map(({ section, items }) => (
            <div key={section.id}>
              <div style={s.aisleHeader}>{section.name}</div>
              {items.map(item => <ListRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} onUpdateQuantity={onUpdateQuantity} />)}
            </div>
          ))}
        </div>
      )}

      {/* List picker sheet */}
      {showPicker && (
        <Sheet onClose={() => setShowPicker(false)}>
          <p style={s.sheetTitle}>Your lists</p>
          <div style={s.pickerList}>
            {lists.map(list => {
              const sharedCount = getListSharedWith(list.id).length
              return (
                <button key={list.id} style={{ ...s.pickerItem, background: list.id === activeListId ? 'var(--accent-light)' : '#fff', border: list.id === activeListId ? '1.5px solid var(--primary)' : '1px solid var(--cream-border)' }}
                  onClick={() => { onSwitchList(list.id); setShowPicker(false) }}>
                  <div>
                    <p style={s.pickerName}>{list.name}</p>
                    <p style={s.pickerMeta}>{sharedCount > 0 ? `Shared with ${sharedCount}` : 'Private'} · {listItems.filter(i => i.list_id === list.id).length} items</p>
                  </div>
                  {list.id === activeListId ? <span style={{ color: 'var(--sage)', fontSize: 18 }}>✓</span> : <span style={{ color: 'var(--tan)', fontSize: 16 }}>›</span>}
                </button>
              )
            })}
          </div>
          <div style={s.newListForm}>
            <p style={s.newListLabel}>New list</p>
            <input style={s.input} value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="🧺 Name your list e.g. 🏪 Costco" />
            {otherMembers.length > 0 && (
              <MemberPicker members={otherMembers} selected={newListMembers} onChange={setNewListMembers} label="Share with" />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button style={s.createBtn} onClick={handleCreate} disabled={creatingList || !newListName.trim()}>
                {creatingList ? 'Creating…' : 'Create list'}
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {/* Edit list sheet */}
      {editingList && (
        <Sheet onClose={() => setEditingList(null)}>
          <p style={s.sheetTitle}>Edit list</p>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={s.fieldLabel}>Name<input style={s.input} value={editName} onChange={e => setEditName(e.target.value)} /></label>
            {otherMembers.length > 0 && <MemberPicker members={otherMembers} selected={editMembers} onChange={setEditMembers} label="Share with" />}
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={s.cancelBtn} onClick={() => setEditingList(null)}>Cancel</button>
              <button style={s.confirmBtn} onClick={handleUpdateList}>Save</button>
            </div>
            <button style={s.deleteLink} onClick={async () => { await onDeleteList(editingList.id); setEditingList(null) }}>Delete this list</button>
          </div>
        </Sheet>
      )}

      {confirmClear && (
        <div style={s.overlay} onClick={() => setConfirmClear(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <p style={s.modalTitle}>Clear this list?</p>
            <p style={s.modalBody}>Removes all {listItems.length} items. Can't be undone.</p>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setConfirmClear(false)}>Cancel</button>
              <button style={{ ...s.confirmBtn, background: 'var(--danger)' }} onClick={() => { onClear(); setConfirmClear(false) }}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ListRow({ item, onToggle, onRemove, onUpdateQuantity }) {
  const qty = item.quantity || 1
  const lineTotal = item.est_price ? Number(item.est_price) * qty : null
  return (
    <div style={{ ...s.row, background: item.is_checked ? 'var(--cream-light)' : '#fff' }}>
      <button style={{ ...s.checkbox, background: item.is_checked ? 'var(--sage)' : 'transparent', borderColor: item.is_checked ? 'var(--sage)' : 'var(--primary-light)' }} onClick={() => onToggle(item)}>
        {item.is_checked && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
      </button>
      <button style={{ ...s.rowLabel, color: item.is_checked ? 'var(--primary-light)' : 'var(--charcoal)', textDecoration: item.is_checked ? 'line-through' : 'none' }} onClick={() => onToggle(item)}>
        {item.name}
        {item.item_type === 'freetext' && <span style={s.freetextTag}> · note</span>}
      </button>
      <div style={s.rowRight}>
        <div style={s.qtyRow}>
          <button style={s.qtyBtn} onClick={() => onUpdateQuantity(item, qty - 1)}>−</button>
          <span style={{ ...s.qtyNum, color: item.is_checked ? 'var(--primary-light)' : 'var(--charcoal)' }}>{qty}</span>
          <button style={s.qtyBtn} onClick={() => onUpdateQuantity(item, qty + 1)}>+</button>
        </div>
        {lineTotal != null && (
          <span style={{ ...s.rowPrice, color: item.is_checked ? 'var(--primary-light)' : 'var(--tan)', textDecoration: item.is_checked ? 'line-through' : 'none' }}>
            ${lineTotal.toFixed(2)}{qty > 1 && <span style={s.unitPrice}> (${Number(item.est_price).toFixed(2)})</span>}
          </span>
        )}
      </div>
      <button style={s.removeBtn} onClick={() => onRemove(item.id)}>×</button>
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
  headerTotals: { display: 'flex', alignItems: 'center', gap: 8 },
  totalValue: { fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.9)' },
  clearBtn: { border: 'none', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600 },
  listSelectorBar: { background: '#fff', padding: '10px 14px', borderBottom: '0.5px solid var(--cream-border)', display: 'flex', gap: 8, alignItems: 'center' },
  selectorBtn: { flex: 1, background: 'var(--selector-bg)', border: '1px solid var(--primary-light)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' },
  selectorLabel: { margin: 0, fontSize: 10, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 },
  selectorName: { margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', fontFamily: 'var(--font-body)' },
  selectorRight: { display: 'flex', alignItems: 'center', gap: 8 },
  sharedBadge: { fontSize: 11, color: 'var(--accent)', background: 'var(--accent-light)', padding: '3px 8px', borderRadius: 20, fontWeight: 600 },
  chevron: { fontSize: 18, color: 'var(--charcoal-soft)' },
  editListBtn: { border: '1px solid var(--cream-border)', background: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--charcoal-soft)' },
  meta: { padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 12, color: 'var(--charcoal-soft)' },
  totalLabel: { fontSize: 12, color: 'var(--charcoal-soft)' },
  totalMono: { fontFamily: 'var(--font-mono)', color: 'var(--tan)', fontWeight: 600 },
  freetextBar: { background: '#fff', padding: '8px 14px', borderBottom: '0.5px solid var(--cream-border)', display: 'flex', gap: 8 },
  freetextInput: { border: '1px solid var(--cream-border)', borderRadius: 8, padding: '8px 10px', fontSize: 14 },
  freetextAdd: { border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13 },
  freetextCancel: { border: 'none', background: 'none', color: 'var(--charcoal-soft)', fontSize: 20, padding: '0 4px' },
  freetextToggle: { background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, padding: '8px 14px', textAlign: 'left', textDecoration: 'underline' },
  scroll: { flex: 1, overflowY: 'auto', paddingBottom: 16 },
  aisleHeader: { background: 'var(--aisle-bg)', padding: '6px 14px', position: 'sticky', top: 0, zIndex: 1, fontSize: 10, fontWeight: 600, color: 'var(--aisle-text)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '0.5px solid var(--cream)' },
  checkbox: { width: 22, height: 22, borderRadius: 6, border: '1.5px solid', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  rowLabel: { flex: 1, background: 'none', border: 'none', textAlign: 'left', fontSize: 15, padding: 0, fontFamily: 'var(--font-body)' },
  freetextTag: { fontSize: 11, color: 'var(--charcoal-soft)', fontStyle: 'italic' },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 25, height: 25, borderRadius: 6, border: '1px solid var(--cream-border)', background: 'var(--cream)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: 'var(--accent)' },
  qtyNum: { fontSize: 12, fontFamily: 'var(--font-mono)', minWidth: 14, textAlign: 'center' },
  rowPrice: { fontSize: 12, fontFamily: 'var(--font-mono)' },
  unitPrice: { fontSize: 10, opacity: 0.7 },
  removeBtn: { border: 'none', background: 'none', color: 'var(--cream-border)', fontSize: 19, lineHeight: 1, padding: '0 2px' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 40px', textAlign: 'center' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: '0 0 8px', color: 'var(--charcoal)' },
  emptyBody: { fontSize: 14, color: 'var(--charcoal-soft)', lineHeight: 1.5, margin: 0 },
  sheetOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20 },
  sheet: { background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto', padding: '0 0 32px' },
  sheetHandle: { width: 36, height: 4, background: 'var(--cream-border)', borderRadius: 2, margin: '12px auto 16px' },
  sheetTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: '0 0 14px', color: 'var(--charcoal)', padding: '0 16px' },
  pickerList: { display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 16px' },
  pickerItem: { borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', width: '100%', textAlign: 'left' },
  pickerName: { margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--charcoal)' },
  pickerMeta: { margin: '2px 0 0', fontSize: 11, color: 'var(--charcoal-soft)' },
  newListForm: { margin: '0 16px', background: 'var(--cream)', borderRadius: 12, padding: 14, border: '1px solid var(--accent-light)', display: 'flex', flexDirection: 'column', gap: 12 },
  newListLabel: { margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--accent)' },
  input: { width: '100%', border: '1px solid var(--cream-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fff', color: 'var(--charcoal)', boxSizing: 'border-box' },
  createBtn: { border: 'none', background: 'var(--accent)', color: '#fff', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600 },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--charcoal-soft)' },
  cancelBtn: { flex: 1, padding: 11, borderRadius: 8, border: '1px solid var(--cream-border)', background: 'none', color: 'var(--charcoal)', fontWeight: 600 },
  confirmBtn: { flex: 1, padding: 11, borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600 },
  deleteLink: { border: 'none', background: 'none', color: 'var(--danger)', fontSize: 13, textAlign: 'center', textDecoration: 'underline' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 20 },
  modal: { background: '#fff', borderRadius: 14, padding: '24px 20px', maxWidth: 320, width: '100%' },
  modalTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 6px', color: 'var(--charcoal)' },
  modalBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: '0 0 20px', lineHeight: 1.5 },
  modalActions: { display: 'flex', gap: 10 },
}
