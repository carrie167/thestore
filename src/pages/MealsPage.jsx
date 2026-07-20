import { useMemo, useState } from 'react'

export default function MealsPage({
  meals,
  mealIngredients,
  inventory,
  activeList,
  onAddMealToList,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal,
}) {
  const [editingId, setEditingId] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [addingId, setAddingId] = useState(null)

  const inventoryById = useMemo(() => new Map(inventory.map((i) => [i.id, i])), [inventory])

  const ingredientsByMeal = useMemo(() => {
    const map = new Map()
    for (const ing of mealIngredients) {
      if (!map.has(ing.meal_id)) map.set(ing.meal_id, [])
      map.get(ing.meal_id).push(ing)
    }
    return map
  }, [mealIngredients])

  function mealCost(mealId) {
    const ings = ingredientsByMeal.get(mealId) || []
    return ings.reduce((sum, ing) => {
      const item = ing.inventory_item_id ? inventoryById.get(ing.inventory_item_id) : null
      return sum + (item?.est_price ? Number(item.est_price) * ing.quantity : 0)
    }, 0)
  }

  async function handleAddToList(meal) {
    setAddingId(meal.id)
    try {
      await onAddMealToList(meal)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Meals</h1>
        <button style={styles.primaryBtn} onClick={() => setShowNew(true)}>+ Meal</button>
      </div>

      <div style={styles.scroll}>
        {meals.length === 0 && (
          <div style={styles.empty}>
            <p style={styles.emptyTitle}>No meals yet</p>
            <p style={styles.emptyBody}>Tap "+ Meal" to add your first recipe. When you're ready to cook, tap "Add to list" and all the ingredients go straight to your active list.</p>
          </div>
        )}

        {meals.map((meal) => {
          const ings = ingredientsByMeal.get(meal.id) || []
          const cost = mealCost(meal.id)
          const isAdding = addingId === meal.id

          if (editingId === meal.id) {
            return (
              <MealForm
                key={meal.id}
                meal={meal}
                existingIngredients={ings}
                inventory={inventory}
                onSave={async (name, notes, ingredients) => {
                  await onUpdateMeal(meal.id, name, notes, ingredients)
                  setEditingId(null)
                }}
                onCancel={() => setEditingId(null)}
                onDelete={async () => {
                  await onDeleteMeal(meal.id)
                  setEditingId(null)
                }}
              />
            )
          }

          return (
            <div key={meal.id} style={styles.mealCard}>
              <div style={styles.mealTop}>
                <div>
                  <p style={styles.mealName}>{meal.name}</p>
                  {meal.notes && <p style={styles.mealNotes}>{meal.notes}</p>}
                </div>
                <div style={styles.mealTopRight}>
                  {cost > 0 && (
                    <span style={styles.mealCost} className="mono">${cost.toFixed(2)}</span>
                  )}
                  <button style={styles.editBtn} onClick={() => setEditingId(meal.id)}>Edit</button>
                </div>
              </div>

              {ings.length > 0 && (
                <div style={styles.ingList}>
                  {ings.map((ing) => {
                    const item = ing.inventory_item_id ? inventoryById.get(ing.inventory_item_id) : null
                    return (
                      <span key={ing.id} style={styles.ingChip}>
                        {ing.quantity > 1 && <span style={styles.ingQty}>{ing.quantity}× </span>}
                        {item?.name || ing.name}
                      </span>
                    )
                  })}
                </div>
              )}

              <button
                style={{
                  ...styles.addToListBtn,
                  opacity: isAdding ? 0.6 : 1,
                }}
                onClick={() => handleAddToList(meal)}
                disabled={isAdding}
              >
                {isAdding ? 'Adding…' : `Add to ${activeList?.name || 'list'} →`}
              </button>
            </div>
          )
        })}
      </div>

      {showNew && (
        <Modal onClose={() => setShowNew(false)}>
          <MealForm
            inventory={inventory}
            onSave={async (name, notes, ingredients) => {
              await onAddMeal(name, notes, ingredients)
              setShowNew(false)
            }}
            onCancel={() => setShowNew(false)}
          />
        </Modal>
      )}
    </div>
  )
}

function MealForm({ meal, existingIngredients = [], inventory, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(meal?.name || '')
  const [notes, setNotes] = useState(meal?.notes || '')
  const [ingredients, setIngredients] = useState(() =>
    existingIngredients.map((ing) => ({
      inventory_item_id: ing.inventory_item_id,
      name: ing.name,
      quantity: ing.quantity,
    }))
  )
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return inventory.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 8)
  }, [search, inventory])

  function addIngredient(item) {
    const exists = ingredients.find((i) => i.inventory_item_id === item.id)
    if (exists) {
      setIngredients((current) =>
        current.map((i) => i.inventory_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      )
    } else {
      setIngredients((current) => [...current, { inventory_item_id: item.id, name: item.name, quantity: 1 }])
    }
    setSearch('')
  }

  function updateIngQty(idx, qty) {
    if (qty < 1) {
      setIngredients((current) => current.filter((_, i) => i !== idx))
    } else {
      setIngredients((current) => current.map((ing, i) => i === idx ? { ...ing, quantity: qty } : ing))
    }
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave(name.trim(), notes.trim(), ingredients)
    setSaving(false)
  }

  const inventoryById = useMemo(() => new Map(inventory.map((i) => [i.id, i])), [inventory])

  return (
    <div style={styles.form}>
      <p style={styles.formTitle}>{meal ? 'Edit meal' : 'New meal'}</p>

      <label style={styles.fieldLabel}>
        Meal name
        <input
          autoFocus
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chicken Stir Fry"
        />
      </label>

      <label style={styles.fieldLabel}>
        Notes (optional)
        <input
          style={styles.input}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. serves 4, weeknight favorite"
        />
      </label>

      <div style={styles.fieldLabel}>
        Ingredients
        <input
          style={styles.input}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search inventory to add…"
        />
        {filtered.length > 0 && (
          <div style={styles.dropdown}>
            {filtered.map((item) => (
              <button key={item.id} style={styles.dropdownItem} onClick={() => addIngredient(item)}>
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {ingredients.length > 0 && (
        <div style={styles.ingEditList}>
          {ingredients.map((ing, idx) => {
            const item = ing.inventory_item_id ? inventoryById.get(ing.inventory_item_id) : null
            return (
              <div key={idx} style={styles.ingEditRow}>
                <span style={styles.ingEditName}>{item?.name || ing.name}</span>
                <div style={styles.qtyRow}>
                  <button style={styles.qtyBtn} onClick={() => updateIngQty(idx, ing.quantity - 1)}>−</button>
                  <span style={styles.qtyNum} className="mono">{ing.quantity}</span>
                  <button style={styles.qtyBtn} onClick={() => updateIngQty(idx, ing.quantity + 1)}>+</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {confirmDelete ? (
        <div style={styles.deleteConfirm}>
          <p style={{ fontSize: 14, margin: '0 0 12px' }}>Delete "{meal?.name}"?</p>
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
              {saving ? 'Saving…' : meal ? 'Save' : 'Add meal'}
            </button>
          </div>
          {meal && (
            <button style={styles.deleteLink} onClick={() => setConfirmDelete(true)}>Delete meal</button>
          )}
        </>
      )}
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--line)', background: 'var(--chalk)' },
  title: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, margin: 0 },
  primaryBtn: { border: 'none', background: 'var(--terracotta)', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600 },
  scroll: { flex: 1, overflowY: 'auto', padding: '12px 0 16px' },
  empty: { padding: '40px 20px', textAlign: 'center' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, margin: '0 0 6px' },
  emptyBody: { fontSize: 14, color: 'var(--charcoal-soft)', margin: 0, lineHeight: 1.6 },
  mealCard: { margin: '0 16px 12px', background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid var(--line)' },
  mealTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  mealName: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, margin: 0 },
  mealNotes: { fontSize: 13, color: 'var(--charcoal-soft)', margin: '4px 0 0' },
  mealTopRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  mealCost: { fontSize: 16, fontWeight: 500, color: 'var(--terracotta-dark)' },
  editBtn: { border: '1px solid var(--line)', background: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--charcoal-soft)' },
  ingList: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  ingChip: { background: 'var(--chalk-dim)', borderRadius: 20, padding: '4px 10px', fontSize: 13, color: 'var(--charcoal)' },
  ingQty: { fontFamily: 'var(--font-mono)', fontWeight: 500 },
  addToListBtn: { width: '100%', border: 'none', background: 'var(--terracotta)', color: '#fff', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600 },
  form: { display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 20px 8px' },
  formTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: 0 },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--charcoal-soft)', position: 'relative' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 15, background: '#fff', color: 'var(--charcoal)' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--line)', borderRadius: 8, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: 4 },
  dropdownItem: { width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'none', fontSize: 14, borderBottom: '1px solid var(--line)', color: 'var(--charcoal)' },
  ingEditList: { display: 'flex', flexDirection: 'column', gap: 8 },
  ingEditRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--chalk-dim)', borderRadius: 8, padding: '8px 12px' },
  ingEditName: { fontSize: 14, color: 'var(--charcoal)' },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 6, border: '1px solid var(--line)', background: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  qtyNum: { fontSize: 14, fontWeight: 500, minWidth: 16, textAlign: 'center' },
  formActions: { display: 'flex', gap: 10, marginTop: 6 },
  modalCancel: { flex: 1, padding: '11px', borderRadius: 8, border: '1px solid var(--line)', background: 'none', color: 'var(--charcoal)', fontWeight: 600 },
  modalConfirm: { flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: 'var(--terracotta)', color: '#fff', fontWeight: 600 },
  deleteConfirm: { background: 'var(--chalk-dim)', borderRadius: 10, padding: 14 },
  deleteLink: { border: 'none', background: 'none', color: 'var(--danger)', fontSize: 13, textAlign: 'center', textDecoration: 'underline', marginTop: 4 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 10 },
  modalCard: { background: 'var(--chalk)', borderRadius: '16px 16px 0 0', padding: '24px 0 32px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' },
}
