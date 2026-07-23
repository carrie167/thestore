import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import MemberPicker from '../components/MemberPicker'

export default function MealsPage({
  meals, mealIngredients, mealMembers, inventory, sections, activeList,
  otherMembers, onAddMealToList, onAddMeal, onUpdateMeal, onDeleteMeal,
  onAddInventoryItem, onMenuOpen,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [notesExpandedId, setNotesExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [addingId, setAddingId] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // all | weeknight | sunday
  const [sortBy, setSortBy] = useState('name') // name | price

  const inventoryById = useMemo(() => new Map(inventory.map(i => [i.id, i])), [inventory])

  const ingredientsByMeal = useMemo(() => {
    const map = new Map()
    mealIngredients.forEach(ing => {
      if (!map.has(ing.meal_id)) map.set(ing.meal_id, [])
      map.get(ing.meal_id).push(ing)
    })
    return map
  }, [mealIngredients])

  const membersByMeal = useMemo(() => {
    const map = new Map()
    mealMembers.forEach(m => {
      if (!map.has(m.meal_id)) map.set(m.meal_id, [])
      map.get(m.meal_id).push(m.user_id)
    })
    return map
  }, [mealMembers])

  function mealCost(mealId) {
    return (ingredientsByMeal.get(mealId) || []).reduce((sum, ing) => {
      const item = ing.inventory_item_id ? inventoryById.get(ing.inventory_item_id) : null
      return sum + (item?.est_price ? Number(item.est_price) * ing.quantity : 0)
    }, 0)
  }

  const filteredMeals = useMemo(() => {
    const q = search.trim().toLowerCase()
    let result = meals.filter(meal => {
      // Type filter
      if (typeFilter !== 'all' && meal.meal_type !== typeFilter) return false
      // Search: meal name OR ingredient names
      if (!q) return true
      if (meal.name.toLowerCase().includes(q)) return true
      const ings = ingredientsByMeal.get(meal.id) || []
      return ings.some(ing => {
        const item = ing.inventory_item_id ? inventoryById.get(ing.inventory_item_id) : null
        return (item?.name || ing.name || '').toLowerCase().includes(q)
      })
    })
    // Sort
    if (sortBy === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === 'price') result = [...result].sort((a, b) => mealCost(b.id) - mealCost(a.id))
    return result
  }, [meals, search, typeFilter, sortBy, ingredientsByMeal, inventoryById])

  async function handleAdd(meal) {
    setAddingId(meal.id)
    try { await onAddMealToList(meal) } finally { setAddingId(null) }
  }

  return (
    <div style={s.page}>
      <PageHeader
        title="Meals"
        onMenuOpen={onMenuOpen}
        right={<button style={s.newMealBtn} onClick={() => setShowNew(true)}>+ Meal</button>}
      />

      {/* Search + filter bar */}
      <div style={s.filterBar}>
        <input
          style={s.searchInput}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search meals or ingredients…"
        />
        <div style={s.filterRow}>
          <div style={s.typePills}>
            {['all', 'weeknight', 'sunday'].map(t => (
              <button
                key={t}
                style={{ ...s.typePill, background: typeFilter === t ? 'var(--primary)' : 'var(--cream)', color: typeFilter === t ? '#fff' : 'var(--charcoal-soft)', border: typeFilter === t ? 'none' : '1px solid var(--cream-border)' }}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all' ? 'All' : t === 'weeknight' ? '🌙 Weeknight' : '☀️ Sunday'}
              </button>
            ))}
          </div>
          <select style={s.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="name">A–Z</option>
            <option value="price">Price ↓</option>
          </select>
        </div>
      </div>

      <div style={s.scroll}>
        {meals.length === 0 && (
          <div style={s.empty}>
            <p style={s.emptyTitle}>No meals yet</p>
            <p style={s.emptyBody}>Tap "+ Meal" to add a recipe. Tap "Add to list" and all ingredients go straight to your active cart.</p>
          </div>
        )}

        {filteredMeals.length === 0 && meals.length > 0 && (
          <div style={s.empty}>
            <p style={s.emptyTitle}>No matches</p>
            <p style={s.emptyBody}>Try a different search or filter.</p>
          </div>
        )}

        {filteredMeals.map(meal => {
          const ings = ingredientsByMeal.get(meal.id) || []
          const cost = mealCost(meal.id)
          const isExpanded = expandedId === meal.id
          const notesExpanded = notesExpandedId === meal.id
          const isAdding = addingId === meal.id
          const sharedWith = membersByMeal.get(meal.id) || []

          if (editingId === meal.id) {
            return (
              <div key={meal.id} style={s.card}>
                <MealForm
                  meal={meal}
                  existingIngredients={ings}
                  existingMembers={sharedWith}
                  inventory={inventory}
                  sections={sections}
                  otherMembers={otherMembers}
                  onAddInventoryItem={onAddInventoryItem}
                  onSave={async (name, notes, mealType, ingredients, members) => {
                    await onUpdateMeal(meal.id, name, notes, mealType, ingredients, members)
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                  onDelete={async () => { await onDeleteMeal(meal.id); setEditingId(null) }}
                />
              </div>
            )
          }

          return (
            <div key={meal.id} style={s.card}>
              {/* Collapsed header */}
              <button style={s.cardHeader} onClick={() => setExpandedId(isExpanded ? null : meal.id)}>
                <div style={{ flex: 1 }}>
                  <div style={s.cardTitleRow}>
                    <p style={s.mealName}>{meal.name}</p>
                    {meal.meal_type && (
                      <span style={{ ...s.typeBadge, background: meal.meal_type === 'weeknight' ? 'var(--accent-light)' : 'var(--tan-light)', color: meal.meal_type === 'weeknight' ? 'var(--accent)' : 'var(--tan)' }}>
                        {meal.meal_type === 'weeknight' ? '🌙 Weeknight' : '☀️ Sunday'}
                      </span>
                    )}
                  </div>
                  {!isExpanded && (
                    <p style={s.mealMeta}>
                      {ings.length} ingredient{ings.length !== 1 ? 's' : ''}
                      {cost > 0 ? ` · $${cost.toFixed(2)}` : ''}
                      {sharedWith.length > 0 ? ' · Shared' : ''}
                    </p>
                  )}
                </div>
                <div style={s.cardHeaderRight}>
                  {isExpanded && cost > 0 && <span style={s.mealCost}>${cost.toFixed(2)}</span>}
                  <span style={s.chevron}>{isExpanded ? '∧' : '∨'}</span>
                </div>
              </button>

              {isExpanded && (
                <>
                  {/* Ingredient list — always shown first */}
                  <div style={s.ingSection}>
                    {ings.map(ing => {
                      const item = ing.inventory_item_id ? inventoryById.get(ing.inventory_item_id) : null
                      const price = item?.est_price ? Number(item.est_price) * ing.quantity : null
                      return (
                        <div key={ing.id} style={s.ingRow}>
                          <span style={s.ingName}>
                            {ing.quantity > 1 && <span style={s.ingQty}>{ing.quantity}× </span>}
                            {item?.name || ing.name}
                          </span>
                          {price != null && <span style={s.ingPrice}>${price.toFixed(2)}</span>}
                        </div>
                      )
                    })}
                    {ings.length === 0 && <p style={{ fontSize: 13, color: 'var(--charcoal-soft)', margin: '8px 0', fontStyle: 'italic' }}>No ingredients yet</p>}
                  </div>

                  {/* Recipe notes — collapsible, below ingredients */}
                  {meal.notes && (
                    <div style={s.notesSection}>
                      <button style={s.notesToggle} onClick={() => setNotesExpandedId(notesExpanded ? null : meal.id)}>
                        <span style={s.notesLabel}>📋 Recipe notes</span>
                        <span style={{ fontSize: 14, color: 'var(--charcoal-soft)' }}>{notesExpanded ? '∧' : '∨'}</span>
                      </button>
                      {notesExpanded && (
                        <div style={s.notesScrollBox}>
                          <p style={s.notesText}>{meal.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card actions */}
                  <div style={s.cardActions}>
                    <button style={s.editBtn} onClick={() => setEditingId(meal.id)}>Edit</button>
                    <button
                      style={{ ...s.addToListBtn, opacity: isAdding ? 0.6 : 1 }}
                      onClick={() => handleAdd(meal)}
                      disabled={isAdding}
                    >
                      {isAdding ? 'Adding…' : `Add to ${activeList?.name || 'cart'} →`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {showNew && (
        <Sheet onClose={() => setShowNew(false)}>
          <MealForm
            inventory={inventory} sections={sections} otherMembers={otherMembers}
            onAddInventoryItem={onAddInventoryItem}
            onSave={async (name, notes, mealType, ingredients, members) => {
              await onAddMeal(name, notes, ingredients, members, mealType)
              setShowNew(false)
            }}
            onCancel={() => setShowNew(false)}
          />
        </Sheet>
      )}
    </div>
  )
}

function MealForm({ meal, existingIngredients = [], existingMembers = [], inventory, sections, otherMembers = [], onAddInventoryItem, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(meal?.name || '')
  const [notes, setNotes] = useState(meal?.notes || '')
  const [mealType, setMealType] = useState(meal?.meal_type || '')
  const [ingredients, setIngredients] = useState(() => existingIngredients.map(ing => ({ inventory_item_id: ing.inventory_item_id, name: ing.name, quantity: ing.quantity })))
  const [selectedMembers, setSelectedMembers] = useState(existingMembers)
  const [ingSearch, setIngSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddInventory, setShowAddInventory] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemSection, setNewItemSection] = useState(sections[0]?.id || '')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  const inventoryById = useMemo(() => new Map(inventory.map(i => [i.id, i])), [inventory])
  const filtered = useMemo(() => {
    const q = ingSearch.trim().toLowerCase()
    if (!q) return []
    return inventory.filter(i => i.name.toLowerCase().includes(q)).slice(0, 8)
  }, [ingSearch, inventory])
  const noResults = ingSearch.trim().length > 1 && filtered.length === 0

  function addIngredient(item) {
    const exists = ingredients.find(i => i.inventory_item_id === item.id)
    if (exists) setIngredients(cur => cur.map(i => i.inventory_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
    else setIngredients(cur => [...cur, { inventory_item_id: item.id, name: item.name, quantity: 1 }])
    setIngSearch('')
  }

  function updateIngQty(idx, qty) {
    if (qty < 1) setIngredients(cur => cur.filter((_, i) => i !== idx))
    else setIngredients(cur => cur.map((ing, i) => i === idx ? { ...ing, quantity: qty } : ing))
  }

  async function handleAddNewItem() {
    if (!newItemName.trim()) return
    setAddingItem(true)
    try {
      const item = await onAddInventoryItem({
        name: newItemName.trim(),
        section_id: newItemSection || null,
        est_price: newItemPrice ? Number(newItemPrice) : null,
        price_updated_at: newItemPrice ? new Date().toISOString() : null,
        price_is_estimate: true,
        is_staple: false,
      })
      addIngredient(item)
      setShowAddInventory(false); setNewItemName(''); setNewItemPrice('')
    } finally { setAddingItem(false) }
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave(name.trim(), notes.trim(), mealType || null, ingredients, selectedMembers)
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Sticky header with Done button — always visible above keyboard */}
      <div style={s.formDoneBar}>
        <button style={s.formCancelBtn} onClick={onCancel}>Cancel</button>
        <p style={s.formDoneTitle}>{meal ? 'Edit meal' : 'New meal'}</p>
        <button style={s.formDoneBtn} onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? '…' : 'Done'}
        </button>
      </div>
      <div style={s.formWrap}>

      <label style={s.fieldLabel}>Meal name
        <input autoFocus style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicken Stir Fry" />
      </label>

      {/* Meal type toggle */}
      <div>
        <p style={{ ...s.fieldLabel, marginBottom: 8 }}>Type</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['', 'None'], ['weeknight', '🌙 Weeknight'], ['sunday', '☀️ Sunday']].map(([val, label]) => (
            <button
              key={val}
              style={{ ...s.typePill, background: mealType === val ? 'var(--primary)' : 'var(--cream)', color: mealType === val ? '#fff' : 'var(--charcoal-soft)', border: mealType === val ? 'none' : '1px solid var(--cream-border)', padding: '7px 14px' }}
              onClick={() => setMealType(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredient search */}
      <div>
        <label style={s.fieldLabel}>Add ingredients
          <input style={s.input} value={ingSearch} onChange={e => { setIngSearch(e.target.value); setShowAddInventory(false) }} placeholder="Search inventory…" />
        </label>
        {filtered.length > 0 && (
          <div style={s.dropdown}>
            {filtered.map(item => <button key={item.id} style={s.dropdownItem} onClick={() => addIngredient(item)}>{item.name}</button>)}
          </div>
        )}
        {noResults && !showAddInventory && (
          <div style={s.dropdown}>
            <div style={s.noResults}>No match for "{ingSearch.trim()}"</div>
            <button style={s.dropdownAddBtn} onClick={() => { setNewItemName(ingSearch.trim()); setShowAddInventory(true); setIngSearch('') }}>+ Add "{ingSearch.trim()}" to inventory</button>
          </div>
        )}
      </div>

      {showAddInventory && (
        <div style={s.addItemBox}>
          <p style={s.addItemTitle}>New inventory item</p>
          <label style={s.fieldLabel}>Name<input autoFocus style={s.input} value={newItemName} onChange={e => setNewItemName(e.target.value)} /></label>
          <label style={s.fieldLabel}>Aisle
            <select style={s.input} value={newItemSection} onChange={e => setNewItemSection(e.target.value)}>
              <option value="">No aisle</option>
              {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
            </select>
          </label>
          <label style={s.fieldLabel}>Estimated price
            <input style={s.input} type="number" step="0.01" min="0" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0.00" />
          </label>
          <div style={s.formActions}>
            <button style={s.cancelBtn} onClick={() => setShowAddInventory(false)}>Cancel</button>
            <button style={s.confirmBtn} onClick={handleAddNewItem} disabled={addingItem || !newItemName.trim()}>{addingItem ? 'Adding…' : 'Add & use'}</button>
          </div>
        </div>
      )}

      {ingredients.length > 0 && (
        <div style={s.ingEditList}>
          {ingredients.map((ing, idx) => {
            const item = ing.inventory_item_id ? inventoryById.get(ing.inventory_item_id) : null
            return (
              <div key={idx} style={s.ingEditRow}>
                <span style={s.ingEditName}>{item?.name || ing.name}</span>
                <div style={s.qtyRow}>
                  <button style={s.qtyBtn} onClick={() => updateIngQty(idx, ing.quantity - 1)}>−</button>
                  <span style={s.qtyNum}>{ing.quantity}</span>
                  <button style={s.qtyBtn} onClick={() => updateIngQty(idx, ing.quantity + 1)}>+</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recipe notes */}
      <label style={s.fieldLabel}>
        Recipe notes
        <textarea style={s.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Steps, tips, reminders… anything goes" rows={5} />
      </label>

      {/* Share with members */}
      {otherMembers.length > 0 && (
        <MemberPicker members={otherMembers} selected={selectedMembers} onChange={setSelectedMembers} label="Share meal with" />
      )}

      {confirmDelete ? (
        <div style={s.deleteBox}>
          <p style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--charcoal)' }}>Delete "{meal?.name}"?</p>
          <div style={s.formActions}>
            <button style={s.cancelBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button style={s.confirmBtn} onClick={onDelete}>Delete</button>
          </div>
        </div>
      ) : (
        meal && <button style={s.deleteLink} onClick={() => setConfirmDelete(true)}>Delete meal</button>
      )}
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
  newMealBtn: { border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600 },
  filterBar: { background: '#fff', padding: '10px 14px', borderBottom: '0.5px solid var(--cream-border)', display: 'flex', flexDirection: 'column', gap: 8 },
  searchInput: { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--cream-border)', fontSize: 14, background: 'var(--cream)', boxSizing: 'border-box' },
  filterRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  typePills: { display: 'flex', gap: 6 },
  typePill: { borderRadius: 20, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  sortSelect: { border: '1px solid var(--cream-border)', borderRadius: 8, padding: '6px 8px', fontSize: 12, background: '#fff', color: 'var(--charcoal)', flexShrink: 0 },
  scroll: { flex: 1, overflowY: 'auto', padding: '12px 14px 24px', display: 'flex', flexDirection: 'column', gap: 10 },
  empty: { padding: '40px 0', textAlign: 'center' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 8px', color: 'var(--charcoal)' },
  emptyBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: 0, lineHeight: 1.6 },
  card: { background: '#fff', borderRadius: 12, border: '1px solid var(--cream-border)', overflow: 'hidden' },
  cardHeader: { width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '13px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' },
  cardTitleRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  mealName: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', fontFamily: 'var(--font-display)' },
  typeBadge: { fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' },
  mealMeta: { margin: '3px 0 0', fontSize: 11, color: 'var(--charcoal-soft)' },
  cardHeaderRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 10 },
  mealCost: { fontSize: 14, fontWeight: 600, color: 'var(--tan)', fontFamily: 'var(--font-mono)' },
  chevron: { fontSize: 16, color: 'var(--primary-light)' },
  ingSection: { background: 'var(--tan-light)', borderTop: '0.5px solid var(--tan-border)', padding: '0 14px' },
  ingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--tan-border)' },
  ingName: { fontSize: 13, color: 'var(--charcoal)' },
  ingQty: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' },
  ingPrice: { fontSize: 12, color: 'var(--tan)', fontFamily: 'var(--font-mono)' },
  notesSection: { borderTop: '0.5px solid var(--cream-border)', background: '#fff' },
  notesToggle: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' },
  notesLabel: { fontSize: 13, fontWeight: 600, color: 'var(--charcoal-soft)' },
  notesScrollBox: { maxHeight: '42vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', borderTop: '0.5px solid var(--cream-border)', background: 'var(--cream)' },
  notesText: { margin: 0, fontSize: 14, color: 'var(--charcoal-soft)', lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '12px 14px 14px' },
  cardActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: '0.5px solid var(--cream-border)' },
  editBtn: { border: '1px solid var(--cream-border)', background: '#fff', color: 'var(--charcoal-soft)', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
  addToListBtn: { border: 'none', background: 'var(--primary)', color: '#fff', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  sheetOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20 },
  sheet: { background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, background: 'var(--cream-border)', borderRadius: 2, margin: '12px auto 16px' },
  formDoneBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderBottom: '0.5px solid var(--cream-border)' },
  formDoneTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0, color: 'var(--charcoal)' },
  formDoneBtn: { border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '7px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  formCancelBtn: { border: 'none', background: 'none', color: 'var(--charcoal-soft)', fontSize: 14, padding: '7px 4px', cursor: 'pointer' },
  formWrap: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 },
  formTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: 0, color: 'var(--charcoal)' },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--charcoal-soft)', margin: 0 },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-border)', fontSize: 15, background: '#fff', color: 'var(--charcoal)', boxSizing: 'border-box' },
  textarea: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-border)', fontSize: 14, background: '#fff', color: 'var(--charcoal)', resize: 'vertical', lineHeight: 1.6, fontFamily: 'var(--font-body)', minHeight: 160, overflowY: 'auto' },
  dropdown: { background: '#fff', border: '1px solid var(--cream-border)', borderRadius: 8, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' },
  dropdownItem: { width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'none', fontSize: 14, borderBottom: '0.5px solid var(--cream-border)', color: 'var(--charcoal)', cursor: 'pointer' },
  noResults: { padding: '10px 12px', fontSize: 13, color: 'var(--charcoal-soft)', borderBottom: '0.5px solid var(--cream-border)' },
  dropdownAddBtn: { width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'none', fontSize: 14, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' },
  addItemBox: { background: 'var(--cream)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--accent-light)' },
  addItemTitle: { margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--accent)', fontFamily: 'var(--font-display)' },
  ingEditList: { display: 'flex', flexDirection: 'column', gap: 6 },
  ingEditRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cream)', borderRadius: 8, padding: '8px 12px' },
  ingEditName: { fontSize: 14, color: 'var(--charcoal)', flex: 1 },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 6, border: '1px solid var(--cream-border)', background: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: 'var(--accent)', cursor: 'pointer' },
  qtyNum: { fontSize: 14, fontFamily: 'var(--font-mono)', minWidth: 16, textAlign: 'center', color: 'var(--charcoal)' },
  deleteBox: { background: 'var(--cream)', borderRadius: 10, padding: 14 },
  formActions: { display: 'flex', gap: 10 },
  cancelBtn: { flex: 1, padding: 11, borderRadius: 8, border: '1px solid var(--cream-border)', background: 'none', color: 'var(--charcoal)', fontWeight: 600, cursor: 'pointer' },
  confirmBtn: { flex: 1, padding: 11, borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  deleteLink: { border: 'none', background: 'none', color: 'var(--danger)', fontSize: 13, textAlign: 'center', textDecoration: 'underline', cursor: 'pointer' },
}
