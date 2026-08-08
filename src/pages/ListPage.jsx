import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import MemberPicker from '../components/MemberPicker'

// Cycled per meal group in a cart so different meals are visually distinct
const MEAL_COLORS = [
  { bg: 'var(--accent-light)', text: 'var(--accent)' },
  { bg: 'var(--tan-light)', text: 'var(--tan)' },
  { bg: 'var(--sage)', text: 'var(--sage-dark)' },
  { bg: 'var(--danger-light)', text: 'var(--danger)' },
]

function tagLabel(tags) {
  if (!tags?.length) return ''
  return ` (${tags.map(t => t === 'optional' ? 'opt' : 'side').join(', ')})`
}

export default function ListPage({
  sections, listItems, lists, listMembers, activeListId, activeList,
  onSwitchList, onToggle, onRemove, onClear, onUpdateQuantity, onRemoveMeal,
  onCreateList, onDeleteList, onUpdateList, onAddFreetext,
  otherMembers, onMenuOpen, inventory, onAddFromInventory, onSetStoreTag,
}) {
  const [expandedIds, setExpandedIds] = useState(new Set([activeListId].filter(Boolean)))
  const [expandedMealGroups, setExpandedMealGroups] = useState(new Set())
  const [removeModeGroups, setRemoveModeGroups] = useState(new Set())
  const [showInvSearchByList, setShowInvSearchByList] = useState({})
  const [invSearchByList, setInvSearchByList] = useState({})
  const [storeFilterByList, setStoreFilterByList] = useState({})
  const [tagPickerFor, setTagPickerFor] = useState(null) // { itemId, listId } | null
  const [newTagText, setNewTagText] = useState('')
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

  function getListSharedWith(listId) {
    return listMembers.filter(m => m.list_id === listId).map(m => m.user_id)
  }

  function groupBySection(items) {
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

  function toggleMealGroup(key) {
    setExpandedMealGroups(cur => {
      const next = new Set(cur)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleRemoveMode(key) {
    setRemoveModeGroups(cur => {
      const next = new Set(cur)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Split a list's items into per-meal groups (in first-appearance order) plus standalone items
  function splitByMeal(items) {
    const mealMap = new Map()
    const standalone = []
    for (const item of items) {
      if (item.source_meal_id) {
        if (!mealMap.has(item.source_meal_id)) mealMap.set(item.source_meal_id, { id: item.source_meal_id, name: item.source_meal_name, items: [] })
        mealMap.get(item.source_meal_id).items.push(item)
      } else {
        standalone.push(item)
      }
    }
    return { mealGroups: Array.from(mealMap.values()), standalone }
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
      setTimeout(() => {
        const el = document.querySelector(`[data-freetext-input="${listId}"]`)
        if (el) el.focus()
      }, 50)
    } catch (err) {
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
        right={<button style={s.newListBtn} onClick={() => setShowNewList(true)}>+ List</button>}
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
          const allItems = listItems.filter(i => i.list_id === list.id)
          const isActive = list.id === activeListId
          const isExpanded = expandedIds.has(list.id)
          const total = allItems.reduce((s, i) => s + (i.est_price ? Number(i.est_price) * (i.quantity || 1) : 0), 0)
          const checkedCount = allItems.filter(i => i.is_checked).length
          const checkedTotal = allItems.filter(i => i.is_checked).reduce((s, i) => s + (i.est_price ? Number(i.est_price) * (i.quantity || 1) : 0), 0)
          const remainingTotal = total - checkedTotal
          const { mealGroups } = splitByMeal(allItems)
          const storeTags = Array.from(new Set(allItems.filter(i => i.store_tag).map(i => i.store_tag)))
          const activeStoreFilter = storeFilterByList[list.id] || 'all'
          const displayItems = activeStoreFilter === 'all' ? allItems : allItems.filter(i => i.store_tag === activeStoreFilter)
          const grouped = groupBySection(displayItems)
          const storeTotals = {}
          let unassignedTotal = 0
          for (const it of allItems) {
            const line = it.est_price ? Number(it.est_price) * (it.quantity || 1) : 0
            if (it.store_tag) storeTotals[it.store_tag] = (storeTotals[it.store_tag] || 0) + line
            else unassignedTotal += line
          }
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
                    <p style={s.listName}>{isActive ? '🛒 ' : ''}{list.name}</p>
                    <p style={s.listMeta}>
                      {getListSharedWith(list.id).length > 0 ? 'Shared' : 'Private'}
                      {' · '}{allItems.length} item{allItems.length !== 1 ? 's' : ''}
                      {total > 0 ? ` · $${total.toFixed(2)}` : ''}
                    </p>
                    {allItems.length > 0 && (
                      <div style={s.progressCols}>
                        <div style={s.progressCol}>
                          <p style={s.progressLabel}>Checked</p>
                          <p style={s.progressValue}>{checkedCount} / ${checkedTotal.toFixed(2)}</p>
                        </div>
                        <div style={s.progressDivider} />
                        <div style={s.progressCol}>
                          <p style={s.progressLabel}>Remaining</p>
                          <p style={s.progressValue}>{allItems.length - checkedCount} / ${remainingTotal.toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <button style={s.expandBtn} onClick={() => toggleExpand(list.id)}>
                    {isExpanded ? '∧' : '∨'}
                  </button>
                </div>

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
                  {/* Meals in this cart — thin collapsible banner, just a quick sanity check */}
                  {mealGroups.map((mg, idx) => {
                    const color = MEAL_COLORS[idx % MEAL_COLORS.length]
                    const key = `${list.id}:${mg.id}`
                    const mgExpanded = expandedMealGroups.has(key)
                    return (
                      <div key={mg.id}>
                        <button style={{ ...s.mealBanner, background: color.bg, color: color.text }} onClick={() => toggleMealGroup(key)}>
                          <span style={s.mealBannerText}>🍽️ {mg.name} · {mg.items.length} item{mg.items.length !== 1 ? 's' : ''}</span>
                          <span>{mgExpanded ? '∧' : '∨'}</span>
                        </button>
                        {mgExpanded && (
                          <div style={{ ...s.mealBannerBody, background: color.bg }}>
                            {removeModeGroups.has(key) ? (
                              <div style={s.mealBannerRemovableList}>
                                {mg.items.map(item => (
                                  <button key={item.id} style={{ ...s.mealBannerItemRemovable, color: color.text }} onClick={() => onRemove(item.id)}>
                                    <span style={s.mealBannerX}>✕</span>
                                    {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}{tagLabel(item.tags)}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              mg.items.map(item => (
                                <span key={item.id} style={{ ...s.mealBannerItem, fontStyle: item.tags?.length ? 'italic' : 'normal', textDecoration: item.is_checked ? 'line-through' : 'none', opacity: item.is_checked ? 0.55 : 0.85 }}>
                                  {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}{tagLabel(item.tags)}
                                </span>
                              ))
                            )}
                            <div style={s.mealBannerActions}>
                              <button
                                style={{ ...s.mealBannerAction, color: color.text }}
                                onClick={() => {
                                  if (window.confirm(`Remove all ${mg.items.length} ${mg.name} ingredients from this cart?`)) onRemoveMeal(list.id, mg.id)
                                }}
                              >
                                Remove meal
                              </button>
                              <button style={{ ...s.mealBannerAction, color: color.text }} onClick={() => toggleRemoveMode(key)}>
                                {removeModeGroups.has(key) ? 'Done' : 'Remove ingredients'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Store filter + totals — only shown once at least one item is tagged */}
                  {storeTags.length > 0 && (
                    <div style={s.storeFilterWrap}>
                      <div style={s.storeFilterRow}>
                        <button
                          style={{ ...s.storePill, ...(activeStoreFilter === 'all' ? s.storePillActive : {}) }}
                          onClick={() => setStoreFilterByList(cur => ({ ...cur, [list.id]: 'all' }))}
                        >
                          All
                        </button>
                        {storeTags.map((tag, idx) => {
                          const color = MEAL_COLORS[idx % MEAL_COLORS.length]
                          const active = activeStoreFilter === tag
                          return (
                            <button
                              key={tag}
                              style={{ ...s.storePill, ...(active ? { background: color.text, color: '#fff', border: 'none' } : {}) }}
                              onClick={() => setStoreFilterByList(cur => ({ ...cur, [list.id]: tag }))}
                            >
                              <span style={{ ...s.storePillDot, background: active ? '#fff' : color.text }} />
                              {tag}
                            </button>
                          )
                        })}
                      </div>
                      <div style={s.storeTotalsRow}>
                        {storeTags.map((tag, idx) => {
                          const color = MEAL_COLORS[idx % MEAL_COLORS.length]
                          return (
                            <div key={tag} style={s.storeTotalChip}>
                              <span style={{ ...s.storeTotalDot, background: color.text }} />
                              <span style={s.storeTotalLabel}>{tag}</span>
                              <span style={s.storeTotalValue}>${(storeTotals[tag] || 0).toFixed(2)}</span>
                            </div>
                          )
                        })}
                        <div style={s.storeTotalChip}>
                          <span style={{ ...s.storeTotalDot, background: 'var(--charcoal-soft)' }} />
                          <span style={s.storeTotalLabel}>Unassigned</span>
                          <span style={s.storeTotalValue}>${unassignedTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* All items grouped by aisle — the actual shopping list */}
                  {grouped.map(({ section, items }) => (
                    <div key={section.id}>
                      <div style={s.aisleHeader}>{section.name}</div>
                      {items.map(item => (
                        <ListRow
                          key={item.id}
                          item={item}
                          onToggle={onToggle}
                          onRemove={onRemove}
                          onUpdateQuantity={onUpdateQuantity}
                          onOpenTagPicker={() => setTagPickerFor({ itemId: item.id, listId: list.id })}
                        />
                      ))}
                    </div>
                  ))}

                  {allItems.length === 0 && (
                    <p style={s.emptyItems}>No items yet — head to Inventory to add some.</p>
                  )}
                  {allItems.length > 0 && displayItems.length === 0 && (
                    <p style={s.emptyItems}>No items tagged "{activeStoreFilter}" yet.</p>
                  )}

                  {/* Add from inventory — search-only, no create/edit */}
                  {showInvSearchByList[list.id] ? (
                    <div style={s.freetextBar}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          autoFocus
                          style={{ ...s.freetextInput, flex: 1 }}
                          value={invSearchByList[list.id] || ''}
                          onChange={e => setInvSearchByList(cur => ({ ...cur, [list.id]: e.target.value }))}
                          placeholder="Search inventory…"
                          autoComplete="off" autoCorrect="off"
                        />
                        <button
                          style={s.freetextCancel}
                          onClick={() => {
                            setShowInvSearchByList(cur => ({ ...cur, [list.id]: false }))
                            setInvSearchByList(cur => ({ ...cur, [list.id]: '' }))
                          }}
                        >×</button>
                      </div>
                      {(() => {
                        const q = (invSearchByList[list.id] || '').trim().toLowerCase()
                        if (!q) return null
                        const matches = inventory.filter(i => i.name.toLowerCase().includes(q)).slice(0, 8)
                        if (matches.length === 0) return <div style={s.noResults}>No match for "{q}"</div>
                        return (
                          <div style={s.dropdown}>
                            {matches.map(item => (
                              <button
                                key={item.id}
                                style={s.dropdownItem}
                                onClick={() => {
                                  onAddFromInventory(item, list.id)
                                  setInvSearchByList(cur => ({ ...cur, [list.id]: '' }))
                                }}
                              >
                                {item.name}
                              </button>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  ) : (
                    <button style={s.quickAddBtn} onClick={() => setShowInvSearchByList(cur => ({ ...cur, [list.id]: true }))}>
                      + Add from inventory
                    </button>
                  )}

                  {/* Add non-inventory item */}
                  {showFreetext ? (
                    <div style={s.freetextBar}>
                      <input
                        autoFocus
                        data-freetext-input={list.id}
                        style={s.freetextInput}
                        value={freetextByList[list.id] || ''}
                        onChange={e => setFreetextByList(cur => ({ ...cur, [list.id]: e.target.value }))}
                        placeholder="Item name…"
                        onKeyDown={e => e.key === 'Enter' && handleAddFreetext(list.id)}
                      />
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          style={{ ...s.freetextInput, flex: 1 }}
                          type="number" step="0.01" min="0"
                          value={freetextPriceByList[list.id] || ''}
                          onChange={e => setFreetextPriceByList(cur => ({ ...cur, [list.id]: e.target.value }))}
                          placeholder="Est. price (optional)"
                        />
                        <button style={s.freetextAdd} onClick={() => handleAddFreetext(list.id)}>Add</button>
                        <button style={s.freetextCancel} onClick={() => setShowFreetextByList(cur => ({ ...cur, [list.id]: false }))}>×</button>
                      </div>
                    </div>
                  ) : (
                    <button style={s.quickAddBtn} onClick={() => setShowFreetextByList(cur => ({ ...cur, [list.id]: true }))}>
                      + Add non-inventory item
                    </button>
                  )}

                  {allItems.length > 0 && (
                    <div style={s.clearRow}>
                      <button style={s.clearBtn} onClick={() => setConfirmClearId(list.id)}>Clear list</button>
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
          <div style={s.sheetBody}>
            <label style={s.fieldLabel}>
              Name
              <input autoFocus style={s.input} value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="🧺 e.g. 🏪 Costco" />
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
          <div style={s.sheetDoneBar}>
            <p style={s.sheetTitle2}>Edit list</p>
            <button style={s.doneBtn} onClick={async () => {
              await onUpdateList(editingList.id, editName, editMembers)
              setEditingList(null)
            }}>Done</button>
          </div>
          <div style={s.sheetBody}>
            <label style={s.fieldLabel}>
              Name
              <input style={s.input} value={editName} onChange={e => setEditName(e.target.value)} />
            </label>
            <MemberPicker members={otherMembers} selected={editMembers} onChange={setEditMembers} label="Share with" />
            <button style={s.deleteLink} onClick={async () => {
              await onDeleteList(editingList.id)
              setEditingList(null)
            }}>Delete this list</button>
          </div>
        </Sheet>
      )}

      {/* Store tag picker */}
      {tagPickerFor && (() => {
        const pickerItem = listItems.find(i => i.id === tagPickerFor.itemId)
        if (!pickerItem) return null
        const listTags = Array.from(new Set(
          listItems.filter(i => i.list_id === tagPickerFor.listId && i.store_tag).map(i => i.store_tag)
        ))
        function close() { setTagPickerFor(null); setNewTagText('') }
        function pick(tag) {
          onSetStoreTag(pickerItem.id, tag)
          close()
        }
        return (
          <Sheet onClose={close}>
            <p style={s.sheetTitle}>Which store for "{pickerItem.name}"?</p>
            {listTags.length > 0 && (
              <div style={s.storeOptionRow}>
                {listTags.map(tag => (
                  <button
                    key={tag}
                    style={{ ...s.storeOption, ...(pickerItem.store_tag === tag ? s.storeOptionActive : {}) }}
                    onClick={() => pick(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
            {pickerItem.store_tag && (
              <button style={s.storeOptionClear} onClick={() => pick(null)}>No store (clear)</button>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, padding: '0 16px' }}>
              <input
                autoFocus
                style={{ ...s.input, flex: 1 }}
                placeholder="Or type a new store…"
                value={newTagText}
                onChange={e => setNewTagText(e.target.value)}
              />
              <button
                style={s.confirmBtn}
                disabled={!newTagText.trim()}
                onClick={() => pick(newTagText.trim())}
              >
                Set
              </button>
            </div>
          </Sheet>
        )
      })()}

      {/* Confirm clear */}
      {confirmClearId && (
        <div style={s.overlay} onClick={() => setConfirmClearId(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <p style={s.modalTitle}>Clear this list?</p>
            <p style={s.modalBody}>Removes all items. Can't be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={s.cancelBtn} onClick={() => setConfirmClearId(null)}>Cancel</button>
              <button style={{ ...s.confirmBtn, background: 'var(--danger)' }} onClick={() => {
                onClear(confirmClearId); setConfirmClearId(null)
              }}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ListRow({ item, onToggle, onRemove, onUpdateQuantity, onOpenTagPicker }) {
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
        style={{ ...s.rowLabel, color: item.is_checked ? 'var(--charcoal-soft)' : 'var(--charcoal)', textDecoration: item.is_checked ? 'line-through' : 'none', fontStyle: item.tags?.length ? 'italic' : 'normal' }}
        onClick={() => onToggle(item)}
      >
        {item.name}
        {item.tags?.length > 0 && <span style={s.optTag}>{tagLabel(item.tags)}</span>}
      </button>

      {onOpenTagPicker && (
        item.store_tag ? (
          <button style={s.storeTagChip} onClick={onOpenTagPicker}>{item.store_tag}</button>
        ) : (
          <button style={s.storeTagAdd} onClick={onOpenTagPicker}>+ store</button>
        )
      )}

      <div style={s.rowRight}>
        <div style={s.qtyRow}>
          <button style={s.qtyBtn} onClick={() => onUpdateQuantity(item, qty - 1)}>−</button>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', minWidth: 14, textAlign: 'center', color: item.is_checked ? 'var(--charcoal-soft)' : 'var(--charcoal)' }}>{qty}</span>
          <button style={s.qtyBtn} onClick={() => onUpdateQuantity(item, qty + 1)}>+</button>
        </div>
        {lineTotal != null && (
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: item.is_checked ? 'var(--charcoal-soft)' : 'var(--tan)', textDecoration: item.is_checked ? 'line-through' : 'none' }}>
            ${lineTotal.toFixed(2)}
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
  page: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--cream)', overflow: 'hidden' },
  newListBtn: { border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600 },
  activeBanner: { background: 'var(--primary-dark)', padding: '7px 14px', fontSize: 12, color: 'rgba(255,255,255,0.8)', flexShrink: 0 },
  scroll: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '12px 14px 80px', display: 'flex', flexDirection: 'column', gap: 10 },
  empty: { padding: '60px 20px', textAlign: 'center' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: '0 0 8px', color: 'var(--charcoal)' },
  emptyBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: 0 },
  card: { background: '#fff', borderRadius: 14, overflow: 'hidden', flexShrink: 0 },
  cardHeader: { padding: '13px 14px' },
  cardTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  listName: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--charcoal)' },
  listMeta: { margin: '3px 0 0', fontSize: 11, color: 'var(--charcoal-soft)' },
  progressCols: { display: 'flex', alignItems: 'stretch', marginTop: 6, border: '1px solid var(--cream-border)', borderRadius: 8, overflow: 'hidden' },
  progressCol: { flex: 1, padding: '5px 10px', textAlign: 'center' },
  progressDivider: { width: 1, background: 'var(--cream-border)' },
  progressLabel: { margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--charcoal-soft)' },
  progressValue: { margin: '1px 0 0', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--charcoal)' },
  expandBtn: { border: 'none', background: 'none', color: 'var(--charcoal-soft)', fontSize: 18, padding: '0 4px', lineHeight: 1, cursor: 'pointer', flexShrink: 0 },
  cardActions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  activeCartPill: { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary)', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#fff' },
  goldDot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--tan)', flexShrink: 0 },
  setCartBtn: { border: '1.5px solid var(--cream-border)', background: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--charcoal-soft)', cursor: 'pointer' },
  editBtn: { border: '1px solid var(--cream-border)', background: 'none', color: 'var(--charcoal-soft)', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  mealBanner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', border: 'none', padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.06)' },
  mealBannerText: { lineHeight: 1.4 },
  mealBannerBody: { padding: '2px 14px 9px', display: 'flex', flexWrap: 'wrap', gap: '4px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.06)' },
  mealBannerItem: { fontSize: 12, opacity: 0.85 },
  mealBannerRemovableList: { display: 'flex', flexDirection: 'column', gap: 2, width: '100%' },
  mealBannerItemRemovable: { display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', padding: '4px 0', fontSize: 12, textAlign: 'left', cursor: 'pointer', width: '100%' },
  mealBannerX: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', border: '1px solid currentColor', fontSize: 9, flexShrink: 0 },
  mealBannerActions: { display: 'flex', gap: 16, marginTop: 4, width: '100%' },
  mealBannerAction: { border: 'none', background: 'none', padding: 0, fontSize: 12, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' },
  aisleHeader: { background: 'var(--aisle-bg)', padding: '5px 14px', fontSize: 10, fontWeight: 600, color: 'var(--aisle-text)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  row: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '0.5px solid var(--cream)' },
  checkbox: { width: 22, height: 22, borderRadius: 6, border: '1.5px solid', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' },
  rowLabel: { flex: 1, background: 'none', border: 'none', textAlign: 'left', fontSize: 15, padding: 0, fontFamily: 'var(--font-body)', cursor: 'pointer' },
  optTag: { fontSize: 12, fontStyle: 'normal', color: 'var(--charcoal-soft)' },
  storeTagChip: { flexShrink: 0, border: 'none', background: 'var(--tan-light)', color: 'var(--tan)', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8, cursor: 'pointer', marginRight: 4 },
  storeTagAdd: { flexShrink: 0, border: 'none', background: 'none', color: 'var(--charcoal-soft)', fontSize: 11, padding: '3px 6px', cursor: 'pointer', marginRight: 4, textDecoration: 'underline' },
  storeFilterWrap: { padding: '10px 14px 4px', borderBottom: '0.5px solid var(--cream-border)' },
  storeFilterRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  storePill: { display: 'flex', alignItems: 'center', gap: 5, border: '1px solid var(--cream-border)', background: '#fff', color: 'var(--charcoal-soft)', fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 20, cursor: 'pointer' },
  storePillActive: { background: 'var(--primary)', color: '#fff', border: 'none' },
  storePillDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  storeTotalsRow: { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 },
  storeTotalChip: { display: 'flex', alignItems: 'center', gap: 5, border: '1px solid var(--cream-border)', borderRadius: 8, padding: '5px 9px', flexShrink: 0 },
  storeTotalDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  storeTotalLabel: { fontSize: 11, color: 'var(--charcoal-soft)', fontWeight: 600 },
  storeTotalValue: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--charcoal)' },
  storeOptionRow: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 16px' },
  storeOption: { padding: '8px 14px', borderRadius: 10, border: '1px solid var(--cream-border)', background: '#fff', color: 'var(--charcoal)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  storeOptionActive: { background: 'var(--primary)', color: '#fff', border: 'none' },
  storeOptionClear: { display: 'block', margin: '10px 16px 0', border: 'none', background: 'none', color: 'var(--danger)', fontSize: 12, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', padding: 0 },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 25, height: 25, borderRadius: 6, border: '1px solid var(--cream-border)', background: 'var(--cream)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: 'var(--accent)', cursor: 'pointer' },
  removeBtn: { border: 'none', background: 'none', color: 'var(--cream-border)', fontSize: 19, lineHeight: 1, padding: '0 2px', cursor: 'pointer', flexShrink: 0 },
  emptyItems: { padding: '14px', fontSize: 13, color: 'var(--charcoal-soft)', fontStyle: 'italic', textAlign: 'center', margin: 0 },
  freetextBar: { display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 14px', borderTop: '0.5px solid var(--cream-border)', background: 'var(--cream-light)' },
  freetextInput: { border: '1px solid var(--cream-border)', borderRadius: 8, padding: '8px 10px', fontSize: 16, width: '100%', boxSizing: 'border-box' },
  freetextAdd: { border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer', flexShrink: 0 },
  freetextCancel: { border: 'none', background: 'none', color: 'var(--charcoal-soft)', fontSize: 20, padding: '0 4px', cursor: 'pointer', flexShrink: 0 },
  quickAddBtn: { display: 'block', width: '100%', border: 'none', background: 'none', color: 'var(--accent)', fontSize: 13, padding: '10px 14px', textAlign: 'left', textDecoration: 'underline', cursor: 'pointer', borderTop: '0.5px solid var(--cream-border)' },
  dropdown: { border: '1px solid var(--cream-border)', borderRadius: 8, marginTop: 6, overflow: 'hidden', background: '#fff' },
  dropdownItem: { display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '10px 12px', fontSize: 14, color: 'var(--charcoal)', cursor: 'pointer', borderBottom: '0.5px solid var(--cream-border)' },
  noResults: { padding: '8px 12px', fontSize: 13, color: 'var(--charcoal-soft)' },
  clearRow: { padding: '8px 14px', display: 'flex', justifyContent: 'flex-end', borderTop: '0.5px solid var(--cream-border)' },
  clearBtn: { border: 'none', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  sheetOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20 },
  sheet: { background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto', paddingBottom: 32 },
  sheetHandle: { width: 36, height: 4, background: 'var(--cream-border)', borderRadius: 2, margin: '12px auto 0' },
  sheetDoneBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 8px', position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderBottom: '0.5px solid var(--cream-border)' },
  sheetTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: '14px 0 14px', color: 'var(--charcoal)', padding: '0 16px' },
  sheetTitle2: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: 0, color: 'var(--charcoal)' },
  doneBtn: { border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '7px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  sheetBody: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--charcoal-soft)' },
  input: { width: '100%', border: '1px solid var(--cream-border)', borderRadius: 10, padding: '10px 12px', fontSize: 16, background: '#fff', color: 'var(--charcoal)', boxSizing: 'border-box' },
  cancelBtn: { flex: 1, padding: 11, borderRadius: 8, border: '1px solid var(--cream-border)', background: 'none', color: 'var(--charcoal)', fontWeight: 600, cursor: 'pointer' },
  confirmBtn: { flex: 1, padding: 11, borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  deleteLink: { border: 'none', background: 'none', color: 'var(--danger)', fontSize: 13, textAlign: 'center', textDecoration: 'underline', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 20 },
  modal: { background: '#fff', borderRadius: 14, padding: '24px 20px', maxWidth: 320, width: '100%' },
  modalTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 6px', color: 'var(--charcoal)' },
  modalBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: '0 0 20px', lineHeight: 1.5 },
}
