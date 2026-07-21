import { useMemo, useState } from 'react'

export default function MealsPage({
  meals, mealIngredients, inventory, sections, activeList,
  onAddMealToList, onAddMeal, onUpdateMeal, onDeleteMeal, onAddInventoryItem,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [addingId, setAddingId] = useState(null)

  const inventoryById = useMemo(() => new Map(inventory.map(i => [i.id, i])), [inventory])

  const ingredientsByMeal = useMemo(() => {
    const map = new Map()
    mealIngredients.forEach(ing => {
      if (!map.has(ing.meal_id)) map.set(ing.meal_id, [])
      map.get(ing.meal_id).push(ing)
    })
    return map
  }, [mealIngredients])

  function mealCost(mealId) {
    return (ingredientsByMeal.get(mealId) || []).reduce((sum, ing) => {
      const item = ing.inventory_item_id ? inventoryById.get(ing.inventory_item_id) : null
      return sum + (item?.est_price ? Number(item.est_price) * ing.quantity : 0)
    }, 0)
  }

  async function handleAdd(meal) {
    setAddingId(meal.id)
    try { await onAddMealToList(meal) } finally { setAddingId(null) }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Meals</h1>
        <button style={s.newMealBtn} onClick={() => setShowNew(true)}>+ Meal</button>
      </div>

      <div style={s.addingTo}>
        Adding to <strong style={{ color: 'var(--charcoal)' }}>{activeList?.name || '—'}</strong>
      </div>

      <div style={s.scroll}>
        {meals.length === 0 && (
          <div style={s.empty}>
            <p style={s.emptyTitle}>No meals yet</p>
            <p style={s.emptyBody}>Tap "+ Meal" to add a recipe. When you're ready to cook, tap "Add to list" and all ingredients go straight to your active list.</p>
          </div>
        )}

        {meals.map(meal => {
          const ings = ingredientsByMeal.get(meal.id) || []
          const cost = mealCost(meal.id)
          const isExpanded = expandedId === meal.id
          const isAdding = addingId === meal.id

          if (editingId === meal.id) {
            return (
              <div key={meal.id} style={{ ...s.card, padding: 0 }}>
                <MealForm
                  meal={meal}
                  existingIngredients={ings}
                  inventory={inventory}
                  sections={sections}
                  onAddInventoryItem={onAddInventoryItem}
                  onSave={async (name, notes, ingredients) => { await onUpdateMeal(meal.id, name, notes, ingredients); setEditingId(null) }}
                  onCancel={() => setEditingId(null)}
                  onDelete={async () => { await onDeleteMeal(meal.id); setEditingId(null) }}
                />
              </div>
            )
          }

          return (
            <div key={meal.id} style={s.card}>
              {/* Header row — tap to expand/collapse */}
              <button style={s.cardHeader} onClick={() => setExpandedId(isExpanded ? null : meal.id)}>
                <div style={{ flex: 1 }}>
                  <p style={s.mealName}>{meal.name}</p>
                  {!isExpanded && (
                    <p style={s.mealMeta}>{ings.length} ingredient{ings.length !== 1 ? 's' : ''}{cost > 0 ? ` · $${cost.toFixed(2)}` : ''}</p>
                  )}
                  {isExpanded && meal.notes && <p style={s.mealMeta}>{meal.notes}</p>}
                </div>
                <div style={s.cardHeaderRight}>
                  {isExpanded && cost > 0 && <span style={s.mealCost}>${cost.toFixed(2)}</span>}
                  <span style={s.chevron}>{isExpanded ? '∧' : '∨'}</span>
                </div>
              </button>

              {/* Ingredient rows — warm tan background */}
              {isExpanded && (
                <>
                  <div style={s.ingSection}>
                    {ings.map(ing => {
                      const item = ing.inventory_item_id ? inventoryById.get(ing.inventory_item_id) : null
                      const name = item?.name || ing.name
                      const price = item?.est_price ? Number(item.est_price) * ing.quantity : null
                      return (
                        <div key={ing.id} style={s.ingRow}>
                          <span style={s.ingName}>
                            {ing.quantity > 1 && <span style={s.ingQty}>{ing.quantity}× </span>}
                            {name}
                          </span>
                          {price != null && <span style={s.ingPrice}>${price.toFixed(2)}</span>}
                        </div>
                      )
                    })}
                    {ings.length === 0 && <p style={{ fontSize: 13, color: 'var(--charcoal-soft)', margin: '8px 0', fontStyle: 'italic' }}>No ingredients added yet</p>}
                  </div>

                  <div style={s.cardActions}>
                    <button style={s.editBtn} onClick={() => setEditingId(meal.id)}>Edit</button>
                    <button
                      style={{ ...s.addToListBtn, opacity: isAdding ? 0.6 : 1 }}
                      onClick={() => handleAdd(meal)}
                      disabled={isAdding}
                    >
                      {isAdding ? 'Adding…' : `Add to ${activeList?.name || 'list'} →`}
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
            inventory={inventory}
            sections={sections}
            onAddInventoryItem={onAddInventoryItem}
            onSave={async (name, notes, ingredients) => { await onAddMeal(name, notes, ingredients); setShowNew(false) }}
            onCancel={() => setShowNew(false)}
          />
        </Sheet>
      )}
    </div>
  )
}

function MealForm({ meal, existingIngredients = [], inventory, sections, onAddInventoryItem, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(meal?.name || '')
  const [notes, setNotes] = useState(meal?.notes || '')
  const [ingredients, setIngredients] = useState(() =>
    existingIngredients.map(ing => ({ inventory_item_id: ing.inventory_item_id, name: ing.name, quantity: ing.quantity }))
  )
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddInventory, setShowAddInventory] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemSection, setNewItemSection] = useState(sections[0]?.id || '')
  const [addingItem, setAddingItem] = useState(false)

  const inventoryById = useMemo(() => new Map(inventory.map(i => [i.id, i])), [inventory])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return inventory.filter(i => i.name.toLowerCase().includes(q)).slice(0, 8)
  }, [search, inventory])

  const noResults = search.trim().length > 1 && filtered.length === 0

  function addIngredient(item) {
    const exists = ingredients.find(i => i.inventory_item_id === item.id)
    if (exists) {
      setIngredients(cur => cur.map(i => i.inventory_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setIngredients(cur => [...cur, { inventory_item_id: item.id, name: item.name, quantity: 1 }])
    }
    setSearch('')
  }

  function updateIngQty(idx, qty) {
    if (qty < 1) setIngredients(cur => cur.filter((_, i) => i !== idx))
    else setIngredients(cur => cur.map((ing, i) => i === idx ? { ...ing, quantity: qty } : ing))
  }

  async function handleAddNewItem() {
    if (!newItemName.trim()) return
    setAddingItem(true)
    try {
      const item = await onAddInventoryItem({ name: newItemName.trim(), section_id: newItemSection || null, est_price: null, price_updated_at: null, price_is_estimate: true, is_staple: false })
      addIngredient(item)
      setShowAddInventory(false); setNewItemName('')
    } finally { setAddingItem(false) }
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave(name.trim(), notes.trim(), ingredients)
    setSaving(false)
  }

  return (
    <div style={s.formWrap}>
      <p style={s.formTitle}>{meal ? 'Edit meal' : 'New meal'}</p>
      <label style={s.fieldLabel}>Meal name<input autoFocus style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicken Stir Fry" /></label>
      <label style={s.fieldLabel}>Notes (optional)<input style={s.input} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. serves 4, weeknight favorite" /></label>

      <div>
        <label style={s.fieldLabel}>
          Add ingredients
          <input style={s.input} value={search} onChange={e => { setSearch(e.target.value); setShowAddInventory(false) }} placeholder="Search inventory…" />
        </label>
        {filtered.length > 0 && (
          <div style={s.dropdown}>
            {filtered.map(item => <button key={item.id} style={s.dropdownItem} onClick={() => addIngredient(item)}>{item.name}</button>)}
          </div>
        )}
        {noResults && !showAddInventory && (
          <div style={s.dropdown}>
            <div style={s.noResults}>No match for "{search.trim()}"</div>
            <button style={s.dropdownAddBtn} onClick={() => { setNewItemName(search.trim()); setShowAddInventory(true); setSearch('') }}>
              + Add "{search.trim()}" to inventory
            </button>
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

      {confirmDelete ? (
        <div style={s.deleteBox}>
          <p style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--charcoal)' }}>Delete "{meal?.name}"?</p>
          <div style={s.formActions}>
            <button style={s.cancelBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button style={s.confirmBtn} onClick={onDelete}>Delete</button>
          </div>
        </div>
      ) : (
        <>
          <div style={s.formActions}>
            <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
            <button style={s.confirmBtn} onClick={handleSave} disabled={saving || !name.trim()}>{saving ? 'Saving…' : meal ? 'Save' : 'Add meal'}</button>
          </div>
          {meal && <button style={s.deleteLink} onClick={() => setConfirmDelete(true)}>Delete meal</button>}
        </>
      )}
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
  header: { background: '#fff', padding: '14px 14px 10px', borderBottom: '0.5px solid var(--cream-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, margin: 0, color: 'var(--charcoal)', letterSpacing: '-0.02em' },
  newMealBtn: { border: 'none', background: 'var(--sage)', color: '#fff', borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 700 },
  addingTo: { background: 'var(--steel-light)', padding: '7px 14px', borderBottom: '0.5px solid var(--teal-light)', fontSize: 12, color: 'var(--steel)' },
  scroll: { flex: 1, overflowY: 'auto', padding: '12px 14px 16px' },
  empty: { padding: '40px 0', textAlign: 'center' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 8px', color: 'var(--charcoal)' },
  emptyBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: 0, lineHeight: 1.6 },
  card: { background: '#fff', borderRadius: 12, border: '1px solid var(--cream-border)', marginBottom: 10, overflow: 'hidden' },
  cardHeader: { width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '13px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' },
  mealName: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', fontFamily: 'var(--font-display)' },
  mealMeta: { margin: '3px 0 0', fontSize: 11, color: 'var(--charcoal-soft)' },
  cardHeaderRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 10 },
  mealCost: { fontSize: 14, fontWeight: 600, color: 'var(--tan)', fontFamily: 'var(--font-mono)' },
  chevron: { fontSize: 16, color: 'var(--teal-light)' },
  ingSection: { background: 'var(--tan-light)', borderTop: '0.5px solid var(--tan-border)', padding: '0 14px' },
  ingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--tan-border)' },
  ingName: { fontSize: 13, color: 'var(--charcoal)', fontFamily: 'var(--font-body)' },
  ingQty: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--charcoal-soft)' },
  ingPrice: { fontSize: 12, color: 'var(--tan)', fontFamily: 'var(--font-mono)' },
  cardActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: '0.5px solid var(--cream-border)' },
  editBtn: { border: '1px solid var(--cream-border)', background: '#fff', color: 'var(--charcoal-soft)', padding: '6px 12px', borderRadius: 8, fontSize: 12 },
  addToListBtn: { border: 'none', background: 'var(--teal)', color: '#fff', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600 },
  sheetOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20 },
  sheet: { background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', padding: '0 0 32px' },
  sheetHandle: { width: 36, height: 4, background: 'var(--cream-border)', borderRadius: 2, margin: '12px auto 16px' },
  formWrap: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 },
  formTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, margin: 0, color: 'var(--charcoal)' },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--charcoal-soft)' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--cream-border)', fontSize: 15, background: '#fff', color: 'var(--charcoal)', boxSizing: 'border-box' },
  dropdown: { background: '#fff', border: '1px solid var(--cream-border)', borderRadius: 8, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' },
  dropdownItem: { width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'none', fontSize: 14, borderBottom: '0.5px solid var(--cream-border)', color: 'var(--charcoal)' },
  noResults: { padding: '10px 12px', fontSize: 13, color: 'var(--charcoal-soft)', borderBottom: '0.5px solid var(--cream-border)' },
  dropdownAddBtn: { width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'none', fontSize: 14, color: 'var(--steel)', fontWeight: 600 },
  addItemBox: { background: 'var(--cream)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--steel-light)' },
  addItemTitle: { margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--steel)', fontFamily: 'var(--font-display)' },
  ingEditList: { display: 'flex', flexDirection: 'column', gap: 6 },
  ingEditRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cream)', borderRadius: 8, padding: '8px 12px' },
  ingEditName: { fontSize: 14, color: 'var(--charcoal)', flex: 1 },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 6, border: '1px solid var(--cream-border)', background: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: 'var(--steel)' },
  qtyNum: { fontSize: 14, fontFamily: 'var(--font-mono)', minWidth: 16, textAlign: 'center', color: 'var(--charcoal)' },
  deleteBox: { background: 'var(--cream)', borderRadius: 10, padding: 14 },
  formActions: { display: 'flex', gap: 10 },
  cancelBtn: { flex: 1, padding: 11, borderRadius: 8, border: '1px solid var(--cream-border)', background: 'none', color: 'var(--charcoal)', fontWeight: 600 },
  confirmBtn: { flex: 1, padding: 11, borderRadius: 8, border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 600 },
  deleteLink: { border: 'none', background: 'none', color: 'var(--danger)', fontSize: 13, textAlign: 'center', textDecoration: 'underline', marginTop: 4 },
}
