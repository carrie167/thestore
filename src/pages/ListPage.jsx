import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import MemberPicker from '../components/MemberPicker'

export default function ListPage({
  sections, listItems, lists, listMembers, activeListId, activeList,
  onSwitchList, onToggle, onRemove, onClear, onUpdateQuantity,
  onCreateList, onDeleteList, onUpdateList, onAddFreetext,
  otherMembers, onMenuOpen,
}) {
  const [expandedIds, setExpandedIds] = useState(new Set([activeListId].filter(Boolean)))
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListMembers, setNewListMembers] = useState([])
  const [creatingList, setCreatingList] = useState(false)
  const [editingList, setEditingList] = useState(null)
  const [editName, setEditName] = useState('')
  const [editMembers, setEditMembers] = useState([])
  const [freetextByList, setFreetextByList] = useState({})
  const [freetextPriceByList, setFreetextPriceByList] = useState({})
  const [showFreetextByList, setShowFreetextByList] = useState({})
  const [confirmClearId, setConfirmClearId] = useState(null)

  const sectionById = useMemo(() => {
    const m = new Map(); sections.forEach(s => m.set(s.id, s)); return m
  }, [sections])

  function toggleExpand(id) {
    setExpandedIds(cur => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function getListItems(listId) {
    return listItems.filter ? listItems : []
  }

  function getListSharedWith(listId) {
    return listMembers.filter(m => m.list_id === listId).map(m => m.user_id)
  }

  function groupItems(items) {
    const map = new Map()
    for (const item of items) {
      const key = item.section_id || 'none'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }
    return Array.from(map.entries())
      .map(([sid, items]) => ({ section: sectionById.get(sid) || { id: 'none', name: 'Other', sort_order: 9999 }, items }))
      .sort((a, b) => a.section.sort_order - b.section.sort_order)
  }

  async function handleCreate() {
    if (!newListName.trim()) return
    setCreatingList(true)
    try {
      const list = await onCreateList(newListName.trim(), newListMembers)
      onSwitchList(list.id)
      setExpandedIds(cur => new Set([...cur, list.id]))
      setNewListName(''); setNewListMembers([]); setShowNewList(false)
    } finally { setCreatingList(false) }
  }

  async function handleAddFreetext(listId) {
    const name = (freetextByList[listId] || '').trim()
    const price = freetextPriceByList[listId]
    if (!name) return
    try {
      await onAddFreetext(name, price || null, listId)
      setFreetextByList(cur => ({ ...cur, [listId]: '' }))
      setFreetextPriceByList(cur => ({ ...cur, [listId]: '' }))
      setShowFreetextByList(cur => ({ ...cur, [listId]: false }))
    } catch (err) {
      console.error('Quick add failed:', err)
      alert('Could not add item: ' + err.message)
    }
  }

  function startEdit(list) {
    setEditingList(list)
    setEditName(list.name)
    setEditMembers(getListSharedWith(list.id))
  }

  return (
    <div style={s.page}>
      <PageHeader
        title="TheStore"
        onMenuOpen={onMenuOpen}
        right={
          <button style={s.newListBtn} onClick={() => setShowNewList(true)}>+ List</button>
        }
      />

      {activeList && (
        <div style={s.activeBanner}>
          🛒 Adding to <strong style={{ color: '#fff' }}>{activeList.name}</strong>
        </div>
      )}

      <div style={s.scroll}>
        {lists.length === 0 && (
          <div style={s.empty}>
            <p style={s.emptyTitle}>No lists yet</p>
            <p style={s.emptyBody}>Tap "+ List" to create your first one.</p>
          </div>
        )}

        {lists.map(list => {
          const allItems = listItems.filter ? listItems.filter(i => i.list_id === list.id) : []
          // For non-active lists we need all items, not just active ones
          const isActive = list.id === activeListId
          const isExpanded = expandedIds.has(list.id)
          const total = allItems.reduce((s, i) => s + (i.est_price ? Number(i.est_price) * (i.quantity || 1) : 0), 0)
          const checkedCount = allItems.filter(i => i.is_checked).length
          const grouped = groupItems(allItems)
          const showFreetext = showFreetextByList[list.id]

          return (
            <div key={list.id} style={{
              ...s.card,
              border: isActive ? '2px solid var(--primary)' : '1px solid var(--cream-border)',
              boxShadow: isActive ? '0 2px 16px rgba(76,118,131,0.15)' : 'none',
            }}>
              {/* Card header */}
              <div style={s.cardHeader}>
                <div style={s.cardTop}>
                  <div style={{ flex: 1 }}>
                    <p style={s.listName}>
                      {isActive ? '🛒 ' : ''}{list.name}
                    </p>
                    <p style={s.listMeta}>
                      {getListSharedWith(list.id).length > 0 ? 'Shared' : 'Private'}
                      {' · '}{allItems.length} item{allItems.length !== 1 ? 's' : ''}
                      {total > 0 ? ` · $${total.toFixed(2)}` : ''}
                      {allItems.length > 0 ? ` · ${checkedCount}/${allItems.length} checked` : ''}
                    </p>
                  </div>
                  <button style={s.expandBtn} onClick={() => toggleExpand(list.id)}>
                    {isExpanded ? '∧' : '∨'}
                  </button>
                </div>

                {/* Active cart toggle + edit */}
                <div style={s.cardActions}>
                  {isActive ? (
                    <div style={s.activeCartPill}>
                      <span style={s.goldDot} />
                      Active Cart
                    </div>
                  ) : (
                    <button style={s.setCartBtn} onClick={() => {
                      onSwitchList(list.id)
                      setExpandedIds(cur => new Set([...cur, list.id]))
                    }}>
                      Set as Cart
                    </button>
                  )}
                  <button style={s.editBtn} onClick={() => startEdit(list)}>Edit</button>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ borderTop: '0.5px solid var(--cream-border)' }}>
                  {/* Grouped items */}
                  {grouped.map(({ section, items }) => (
                    <div key={section.id}>
                      <div style={s.aisleHeader}>{section.name}</div>
                      {items.map(item => (
                        <ListRow key={item.id} item={item} onToggle={onToggle} onRemove={onRemove} onUpdateQuantity={onUpdateQuantity} />
                      ))}
                    </div>
                  ))}

                  {allItems.length === 0 && (
                    <p style={s.emptyItems}>No items yet — head to Inventory to add some.</p>
                  )}

                  {/* Quick add inside card */}
                  {showFreetext ? (
                    <div style={s.freetextBar}>
                      <input
                        autoFocus
                        style={{ ...s.freetextInput, flex: 2 }}
                        value={freetextByList[list.id] || ''}
                        onChange={e => setFreetextByList(cur => ({ ...cur, [list.id]: e.target.value }))}
                        placeholder="Item name…"
                        onKeyDown={e => e.key === 'Enter' && handleAddFreetext(list.id)}
                      />
                      <input
                        style={{ ...s.freetextInput, flex: 1 }}
                        type="number" step="0.01" min="0"
                        value={freetextPriceByList[list.id] || ''}
                        onChange={e => setFreetextPriceByList(cur => ({ ...cur, [list.id]: e.target.value }))}
                        placeholder="$0.00"
                      />
                      <button style={s.freetextAdd} onClick={() => handleAddFreetext(list.id)}>Add</button>
                      <button style={s.freetextCancel} onClick={() => setShowFreetextByList(cur => ({ ...cur, [list.id]: false }))}>×</button>
                    </div>
                  ) : (
                    <button style={s.quickAddBtn} onClick={() => setShowFreetextByList(cur => ({ ...cur, [list.id]: true }))}>
                      + Quick add item
                    </button>
                  )}

                  {/* Clear button */}
                  {allItems.length > 0 && (
                    <div style={s.clearRow}>
                      <button style={s.clearBtn} onClick={() => setConfirmClearId(list.id)}>
                        Clear list
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* New list sheet */}
      {showNewList && (
        <Sheet onClose={() => setShowNewList(false)}>
          <p style={s.sheetTitle}>New list</p>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={s.fieldLabel}>
              Name
              <input
                autoFocus style={s.input}
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="🧺 e.g. 🏪 Costco"
              />
            </label>
            <MemberPicker members={otherMembers} selected={newListMembers} onChange={setNewListMembers} label="Share with" />
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={s.cancelBtn} onClick={() => setShowNewList(false)}>Cancel</button>
              <button style={s.confirmBtn} onClick={handleCreate} disabled={creatingList || !newListName.trim()}>
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
            <label style={s.fieldLabel}>
              Name
              <input style={s.input} value={editName} onChange={e => setEditName(e.target.value)} />
            </label>
            <MemberPicker members={otherMembers} selected={editMembers} onChange={setEditMembers} label="Share with" />
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={s.cancelBtn} onClick={() => setEditingList(null)}>Cancel</button>
              <button style={s.confirmBtn} onClick={async () => {
                await onUpdateList(editingList.id, editName, editMembers)
                setEditingList(null)
              }}>Save</button>
            </div>
            <button style={s.deleteLink} onClick={async () => {
              await onDeleteList(editingList.id)
              setEditingList(null)
            }}>Delete this list</button>
          </div>
        </Sheet>
      )}

      {/* Confirm clear */}
      {confirmClearId && (
        <div style={s.overlay} onClick={() => setConfirmClearId(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <p style={s.modalTitle}>Clear this list?</p>
            <p style={s.modalBody}>Removes all items. Can't be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={s.cancelBtn} onClick={() => setConfirmClearId(null)}>Cancel</button>
              <button style={{ ...s.confirmBtn, background: 'var(--danger)' }} onClick={() => {
                onClear(confirmClearId)
                setConfirmClearId(null)
              }}>Clear</button>
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
        style={{ ...s.checkbox, background: item.is_checked ? 'var(--sage)' : 'transparent', borderColor: item.is_checked ? 'var(--sage)' : 'var(--primary-light)' }}
        onClick={() => onToggle(item)}
      >
        {item.is_checked && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
      </button>
      <button
        style={{ ...s.rowLabel, color: item.is_checked ? 'var(--charcoal-soft)' : 'var(--charcoal)', textDecoration: item.is_checked ? 'line-through' : 'none' }}
        onClick={() => onToggle(item)}
      >
        {item.name}
        {item.item_type === 'freetext' && <span style={{ fontSize: 11, color: 'var(--charcoal-soft)', fontStyle: 'italic' }}> · note</span>}
      </button>
      <div style={s.rowRight}>
        <div style={s.qtyRow}>
          <button style={s.qtyBtn} onClick={() => onUpdateQuantity(item, qty - 1)}>−</button>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', minWidth: 14, textAlign: 'center', color: item.is_checked ? 'var(--charcoal-soft)' : 'var(--charcoal)' }}>{qty}</span>
          <button style={s.qtyBtn} onClick={() => onUpdateQuantity(item, qty + 1)}>+</button>
        </div>
        {lineTotal != null && (
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: item.is_checked ? 'var(--charcoal-soft)' : 'var(--tan)', textDecoration: item.is_checked ? 'line-through' : 'none' }}>
            ${lineTotal.toFixed(2)}
            {qty > 1 && <span style={{ fontSize: 10, opacity: 0.7 }}> (${Number(item.est_price).toFixed(2)})</span>}
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
  newListBtn: { border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600 },
  activeBanner: { background: 'var(--primary-dark)', padding: '7px 14px', fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  scroll: { flex: 1, overflowY: 'auto', padding: '12px 14px 24px', display: 'flex', flexDirection: 'column', gap: 10 },
  empty: { padding: '60px 20px', textAlign: 'center' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: '0 0 8px', color: 'var(--charcoal)' },
  emptyBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: 0 },
  card: { background: '#fff', borderRadius: 14, overflow: 'hidden', transition: 'box-shadow 0.2s' },
  cardHeader: { padding: '13px 14px' },
  cardTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  listName: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', fontFamily: 'var(--font-body)' },
  listMeta: { margin: '3px 0 0', fontSize: 11, color: 'var(--charcoal-soft)' },
  expandBtn: { border: 'none', background: 'none', color: 'var(--charcoal-soft)', fontSize: 18, padding: '0 4px', lineHeight: 1, cursor: 'pointer', flexShrink: 0 },
  cardActions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  activeCartPill: { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary)', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#fff' },
  goldDot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--tan)', flexShrink: 0 },
  setCartBtn: { border: '1.5px solid var(--cream-border)', background: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--charcoal-soft)', cursor: 'pointer' },
  editBtn: { border: '1px solid var(--cream-border)', background: 'none', color: 'var(--charcoal-soft)', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  aisleHeader: { background: 'var(--aisle-bg)', padding: '5px 14px', fontSize: 10, fontWeight: 600, color: 'var(--aisle-text)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '0.5px solid var(--cream)' },
  checkbox: { width: 22, height: 22, borderRadius: 6, border: '1.5px solid', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' },
  rowLabel: { flex: 1, background: 'none', border: 'none', textAlign: 'left', fontSize: 15, padding: 0, fontFamily: 'var(--font-body)', cursor: 'pointer' },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 25, height: 25, borderRadius: 6, border: '1px solid var(--cream-border)', background: 'var(--cream)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: 'var(--accent)', cursor: 'pointer' },
  removeBtn: { border: 'none', background: 'none', color: 'var(--cream-border)', fontSize: 19, lineHeight: 1, padding: '0 2px', cursor: 'pointer' },
  emptyItems: { padding: '14px', fontSize: 13, color: 'var(--charcoal-soft)', fontStyle: 'italic', textAlign: 'center', margin: 0 },
  freetextBar: { display: 'flex', gap: 6, padding: '8px 14px', borderTop: '0.5px solid var(--cream-border)', background: 'var(--cream-light)' },
  freetextInput: { border: '1px solid var(--cream-border)', borderRadius: 8, padding: '8px 10px', fontSize: 14 },
  freetextAdd: { border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  freetextCancel: { border: 'none', background: 'none', color: 'var(--charcoal-soft)', fontSize: 20, padding: '0 4px', cursor: 'pointer' },
  quickAddBtn: { display: 'block', width: '100%', border: 'none', background: 'none', color: 'var(--accent)', fontSize: 13, padding: '10px 14px', textAlign: 'left', textDecoration: 'underline', cursor: 'pointer', borderTop: '0.5px solid var(--cream-border)' },
  clearRow: { padding: '8px 14px', display: 'flex', justifyContent: 'flex-end', borderTop: '0.5px solid var(--cream-border)' },
  clearBtn: { border: 'none', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  sheetOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20 },
  sheet: { background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto', padding: '0 0 32px' },
  sheetHandle: { width: 36, height: 4, background: 'var(--cream-border)', borderRadius: 2, margin: '12px auto 16px' },
  sheetTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: '0 0 16px', color: 'var(--charcoal)', padding: '0 16px' },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--charcoal-soft)' },
  input: { width: '100%', border: '1px solid var(--cream-border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fff', color: 'var(--charcoal)', boxSizing: 'border-box' },
  cancelBtn: { flex: 1, padding: 11, borderRadius: 8, border: '1px solid var(--cream-border)', background: 'none', color: 'var(--charcoal)', fontWeight: 600, cursor: 'pointer' },
  confirmBtn: { flex: 1, padding: 11, borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  deleteLink: { border: 'none', background: 'none', color: 'var(--danger)', fontSize: 13, textAlign: 'center', textDecoration: 'underline', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 20 },
  modal: { background: '#fff', borderRadius: 14, padding: '24px 20px', maxWidth: 320, width: '100%' },
  modalTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 6px', color: 'var(--charcoal)' },
  modalBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: '0 0 20px', lineHeight: 1.5 },
}
