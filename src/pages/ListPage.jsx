import { useMemo, useState } from 'react'

export default function ListPage({
  sections, listItems, lists, activeListId, activeList,
  onSwitchList, onToggle, onRemove, onClear, onUpdateQuantity,
  onCreateList, onDeleteList, onAddFreetext,
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListShared, setNewListShared] = useState(false)
  const [creatingList, setCreatingList] = useState(false)
  const [freetextInput, setFreetextInput] = useState('')
  const [showFreetext, setShowFreetext] = useState(false)

  const sectionById = useMemo(() => {
    const map = new Map(); sections.forEach(s => map.set(s.id, s)); return map
  }, [sections])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const item of listItems) {
      const key = item.section_id || 'none'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }
    return Array.from(map.entries())
      .map(([sid, items]) => ({
        section: sectionById.get(sid) || { id: 'none', name: 'Other', sort_order: 9999 },
        items,
      }))
      .sort((a, b) => a.section.sort_order - b.section.sort_order)
  }, [listItems, sectionById])

  const total = useMemo(() =>
    listItems.reduce((sum, i) => sum + (i.est_price ? Number(i.est_price) * (i.quantity || 1) : 0), 0),
    [listItems]
  )
  const checkedCount = listItems.filter(i => i.is_checked).length

  async function handleCreateList() {
    if (!newListName.trim()) return
    setCreatingList(true)
    try {
      const list = await onCreateList(newListName.trim(), newListShared)
      onSwitchList(list.id)
      setNewListName(''); setNewListShared(false); setShowPicker(false)
    } finally { setCreatingList(false) }
  }

  async function handleAddFreetext(e) {
    e.preventDefault()
    if (!freetextInput.trim()) return
    await onAddFreetext(freetextInput.trim())
    setFreetextInput(''); setShowFreetext(false)
  }

  return (
    <div style={s.page}>
      {/* List selector bar */}
      <div style={s.selectorBar}>
        <button style={s.selectorBtn} onClick={() => setShowPicker(true)}>
          <div>
            <p style={s.selectorLabel}>Shopping at</p>
            <p style={s.selectorName}>{activeList?.name || 'No list selected'}</p>
          </div>
          <div style={s.selectorRight}>
            {activeList?.is_shared && <span style={s.sharedBadge}>Shared</span>}
            <span style={s.chevron}>⌄</span>
          </div>
        </button>
      </div>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>TheStore</h1>
          {listItems.length > 0 && (
            <p style={s.subtitle}>{checkedCount} of {listItems.length} checked</p>
          )}
        </div>
        <div style={s.headerRight}>
          <div style={s.totalWrap}>
            <span style={s.totalLabel}>Est. total</span>
            <span style={s.totalValue} className="mono">${total.toFixed(2)}</span>
          </div>
          {listItems.length > 0 && (
            <button style={s.clearBtn} onClick={() => setConfirmClear(true)}>Clear</button>
          )}
        </div>
      </div>

      {/* Quick add freetext */}
      {showFreetext ? (
        <form onSubmit={handleAddFreetext} style={s.freetextBar}>
          <input
            autoFocus
            style={s.freetextInput}
            value={freetextInput}
            onChange={e => setFreetextInput(e.target.value)}
            placeholder="Item name…"
          />
          <button type="submit" style={s.freetextAdd}>Add</button>
          <button type="button" style={s.freetextCancel} onClick={() => setShowFreetext(false)}>×</button>
        </form>
      ) : (
        activeList && (
          <button style={s.freetextToggle} onClick={() => setShowFreetext(true)}>
            + Quick add item
          </button>
        )
      )}

      {/* List content */}
      {listItems.length === 0 ? (
        <div style={s.empty}>
          <p style={s.emptyTitle}>This list is empty</p>
          <p style={s.emptyBody}>Head to Inventory and tap + to add items, or use Quick add above for one-off things.</p>
        </div>
      ) : (
        <div style={s.scroll}>
          {grouped.map(({ section, items }) => (
            <div key={section.id}>
              <div style={s.aisleHeader}>{section.name}</div>
              {items.map(item => (
                <ListRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} onUpdateQuantity={onUpdateQuantity} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* List picker sheet */}
      {showPicker && (
        <Sheet onClose={() => setShowPicker(false)}>
          <div style={s.pickerHeader}>
            <p style={s.pickerTitle}>Your lists</p>
            <button style={s.newListBtn} onClick={() => {}}>+ New list</button>
          </div>

          <div style={s.pickerList}>
            {lists.map(list => (
              <button
                key={list.id}
                style={{ ...s.pickerItem, background: list.id === activeListId ? 'var(--cream)' : '#fff', border: list.id === activeListId ? '1.5px solid var(--teal)' : '1px solid var(--cream-border)' }}
                onClick={() => { onSwitchList(list.id); setShowPicker(false) }}
              >
                <div>
                  <p style={s.pickerItemName}>{list.name}</p>
                  <p style={s.pickerItemMeta}>
                    {list.is_shared ? 'Shared' : 'Private'} · {listItems.filter(i => i.list_id === list.id).length} items
                  </p>
                </div>
                {list.id === activeListId
                  ? <span style={{ color: 'var(--sage)', fontSize: 18 }}>✓</span>
                  : <span style={{ color: 'var(--tan)', fontSize: 16 }}>›</span>
                }
              </button>
            ))}
          </div>

          {/* New list form */}
          <div style={s.newListForm}>
            <p style={s.newListFormTitle}>New list</p>
            <input
              style={s.input}
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              placeholder="🧺 Name your list e.g. 🏪 Costco"
            />
            <div style={s.newListFormRow}>
              <label style={s.checkLabel}>
                <input type="checkbox" checked={newListShared} onChange={e => setNewListShared(e.target.checked)} style={{ accentColor: 'var(--teal)' }} />
                Share with household
              </label>
              <button style={s.createBtn} onClick={handleCreateList} disabled={creatingList || !newListName.trim()}>
                {creatingList ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {/* Confirm clear */}
      {confirmClear && (
        <div style={s.overlay} onClick={() => setConfirmClear(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <p style={s.modalTitle}>Clear this list?</p>
            <p style={s.modalBody}>Removes all {listItems.length} items. Can't be undone.</p>
            <div style={s.modalActions}>
              <button style={s.modalCancel} onClick={() => setConfirmClear(false)}>Cancel</button>
              <button style={s.modalConfirm} onClick={() => { onClear(); setConfirmClear(false) }}>Clear</button>
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
      <button
        style={{ ...s.checkbox, background: item.is_checked ? 'var(--sage)' : 'transparent', borderColor: item.is_checked ? 'var(--sage)' : 'var(--teal-light)' }}
        onClick={() => onToggle(item)}
      >
        {item.is_checked && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
      </button>

      <button
        style={{ ...s.rowLabel, color: item.is_checked ? 'var(--teal-light)' : 'var(--charcoal)', textDecoration: item.is_checked ? 'line-through' : 'none' }}
        onClick={() => onToggle(item)}
      >
        {item.name}
        {item.item_type === 'freetext' && <span style={s.freetextTag}> ·note</span>}
      </button>

      <div style={s.rowRight}>
        <div style={s.qtyRow}>
          <button style={s.qtyBtn} onClick={() => onUpdateQuantity(item, qty - 1)}>−</button>
          <span style={{ ...s.qtyNum, color: item.is_checked ? 'var(--teal-light)' : 'var(--charcoal)' }}>{qty}</span>
          <button style={s.qtyBtn} onClick={() => onUpdateQuantity(item, qty + 1)}>+</button>
        </div>
        {lineTotal != null && (
          <span style={{ ...s.rowPrice, color: item.is_checked ? 'var(--teal-light)' : 'var(--tan)', textDecoration: item.is_checked ? 'line-through' : 'none' }}>
            ${lineTotal.toFixed(2)}
            {qty > 1 && <span style={s.unitPrice}> (${Number(item.est_price).toFixed(2)})</span>}
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
  selectorBar: { background: '#fff', padding: '10px 14px', borderBottom: '0.5px solid var(--cream-border)' },
  selectorBtn: { width: '100%', background: 'var(--cream)', border: '1px solid var(--steel-light)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' },
  selectorLabel: { margin: 0, fontSize: 10, color: 'var(--teal-dark)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 },
  selectorName: { margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', fontFamily: 'var(--font-body)' },
  selectorRight: { display: 'flex', alignItems: 'center', gap: 8 },
  sharedBadge: { fontSize: 11, color: 'var(--steel)', background: 'var(--steel-light)', padding: '3px 8px', borderRadius: 20, fontWeight: 600 },
  chevron: { fontSize: 18, color: 'var(--charcoal-soft)' },
  header: { background: '#fff', padding: '14px 14px 10px', borderBottom: '0.5px solid var(--cream-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, margin: 0, color: 'var(--charcoal)', letterSpacing: '-0.02em' },
  subtitle: { margin: '3px 0 0', fontSize: 12, color: 'var(--charcoal-soft)' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  totalWrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  totalLabel: { fontSize: 10, color: 'var(--charcoal-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  totalValue: { fontSize: 20, fontWeight: 500, color: 'var(--tan)', fontFamily: 'var(--font-mono)' },
  clearBtn: { border: 'none', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 20, padding: '5px 10px', fontSize: 11, fontWeight: 600 },
  freetextBar: { background: '#fff', padding: '8px 14px', borderBottom: '0.5px solid var(--cream-border)', display: 'flex', gap: 8 },
  freetextInput: { flex: 1, border: '1px solid var(--cream-border)', borderRadius: 8, padding: '8px 12px', fontSize: 14 },
  freetextAdd: { border: 'none', background: 'var(--teal)', color: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13 },
  freetextCancel: { border: 'none', background: 'none', color: 'var(--charcoal-soft)', fontSize: 20, padding: '0 4px' },
  freetextToggle: { background: 'none', border: 'none', color: 'var(--steel)', fontSize: 13, padding: '8px 14px', textAlign: 'left', textDecoration: 'underline' },
  scroll: { flex: 1, overflowY: 'auto', paddingBottom: 16 },
  aisleHeader: { background: 'var(--steel)', padding: '6px 14px', position: 'sticky', top: 0, zIndex: 1, fontSize: 10, fontWeight: 600, color: 'var(--steel-light)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '0.5px solid var(--cream)' },
  checkbox: { width: 22, height: 22, borderRadius: 6, border: '1.5px solid', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  rowLabel: { flex: 1, background: 'none', border: 'none', textAlign: 'left', fontSize: 15, padding: 0, fontFamily: 'var(--font-body)' },
  freetextTag: { fontSize: 11, color: 'var(--charcoal-soft)', fontStyle: 'italic' },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 25, height: 25, borderRadius: 6, border: '1px solid var(--cream-border)', background: 'var(--cream)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: 'var(--steel)' },
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
  pickerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 14px' },
  pickerTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: 0, color: 'var(--charcoal)' },
  newListBtn: { border: 'none', background: 'var(--teal)', color: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600 },
  pickerList: { display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 16px' },
  pickerItem: { borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', width: '100%', textAlign: 'left' },
  pickerItemName: { margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--charcoal)' },
  pickerItemMeta: { margin: '2px 0 0', fontSize: 11, color: 'var(--charcoal-soft)' },
  newListForm: { margin: '0 16px', background: 'var(--cream)', borderRadius: 12, padding: 14, border: '1px solid var(--steel-light)' },
  newListFormTitle: { margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--steel)' },
  input: { width: '100%', border: '1px solid var(--steel-light)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fff', color: 'var(--charcoal)', boxSizing: 'border-box', marginBottom: 10 },
  newListFormRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--steel)' },
  createBtn: { border: 'none', background: 'var(--steel)', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 20 },
  modal: { background: '#fff', borderRadius: 14, padding: '24px 20px', maxWidth: 320, width: '100%' },
  modalTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 6px', color: 'var(--charcoal)' },
  modalBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: '0 0 20px', lineHeight: 1.5 },
  modalActions: { display: 'flex', gap: 10 },
  modalCancel: { flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--cream-border)', background: 'none', color: 'var(--charcoal)', fontWeight: 600 },
  modalConfirm: { flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'var(--danger)', color: '#fff', fontWeight: 600 },
}
