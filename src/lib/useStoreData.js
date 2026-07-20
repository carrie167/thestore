import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

export function useStoreData() {
  const { user } = useAuth()
  const [sections, setSections] = useState([])
  const [inventory, setInventory] = useState([])
  const [lists, setLists] = useState([])
  const [listItems, setListItems] = useState([])
  const [meals, setMeals] = useState([])
  const [mealIngredients, setMealIngredients] = useState([])
  const [activeListId, setActiveListId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [sectionsRes, inventoryRes, listsRes, mealsRes, ingredientsRes] = await Promise.all([
      supabase.from('store_sections').select('*').order('sort_order'),
      supabase.from('inventory_items').select('*').order('name'),
      supabase.from('lists').select('*').order('created_at'),
      supabase.from('meals').select('*').order('name'),
      supabase.from('meal_ingredients').select('*'),
    ])
    if (sectionsRes.error || inventoryRes.error || listsRes.error || mealsRes.error || ingredientsRes.error) {
      setError(sectionsRes.error || inventoryRes.error || listsRes.error || mealsRes.error || ingredientsRes.error)
      setLoading(false)
      return
    }
    setSections(sectionsRes.data)
    setInventory(inventoryRes.data)
    setLists(listsRes.data)
    setMeals(mealsRes.data)
    setMealIngredients(ingredientsRes.data)
    setActiveListId((current) => {
      if (current && listsRes.data.some((l) => l.id === current)) return current
      const shared = listsRes.data.find((l) => l.kind === 'shared')
      return shared?.id || listsRes.data[0]?.id || null
    })
    const accessibleListIds = listsRes.data.map((l) => l.id)
    if (accessibleListIds.length > 0) {
      const itemsRes = await supabase.from('list_items').select('*').in('list_id', accessibleListIds).order('added_at')
      if (itemsRes.error) { setError(itemsRes.error) } else { setListItems(itemsRes.data) }
    } else {
      setListItems([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { if (!user) return; loadAll() }, [user, loadAll])

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('list_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' }, (payload) => {
        setListItems((current) => {
          if (payload.eventType === 'INSERT') {
            if (current.some((i) => i.id === payload.new.id)) return current
            return [...current, payload.new].sort((a, b) => a.added_at.localeCompare(b.added_at))
          }
          if (payload.eventType === 'UPDATE') return current.map((i) => i.id === payload.new.id ? payload.new : i)
          if (payload.eventType === 'DELETE') return current.filter((i) => i.id !== payload.old.id)
          return current
        })
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  async function getHouseholdId() {
    const { data, error } = await supabase.from('household_members').select('household_id').eq('user_id', user.id).limit(1).single()
    if (error) throw error
    return data.household_id
  }

  async function addToList(inventoryItem, listId = activeListId) {
    if (!listId) throw new Error('No active list selected')
    const existing = listItems.find((i) => i.list_id === listId && i.inventory_item_id === inventoryItem.id)
    if (existing) return updateQuantity(existing, existing.quantity + 1)
    const { data, error } = await supabase.from('list_items').insert({ list_id: listId, inventory_item_id: inventoryItem.id, name: inventoryItem.name, section_id: inventoryItem.section_id, est_price: inventoryItem.est_price, quantity: 1, added_by: user.id }).select().single()
    if (error) throw error
    setListItems((current) => [...current, data])
  }

  async function addMealToList(meal, listId = activeListId) {
    if (!listId) throw new Error('No active list selected')
    const ingredients = mealIngredients.filter((i) => i.meal_id === meal.id)
    const inventoryMap = new Map(inventory.map((i) => [i.id, i]))
    for (const ing of ingredients) {
      const invItem = ing.inventory_item_id ? inventoryMap.get(ing.inventory_item_id) : null
      const existing = listItems.find((i) => i.list_id === listId && i.inventory_item_id === ing.inventory_item_id)
      if (existing) {
        await updateQuantity(existing, existing.quantity + ing.quantity)
      } else {
        const { data, error } = await supabase.from('list_items').insert({ list_id: listId, inventory_item_id: ing.inventory_item_id || null, name: invItem?.name || ing.name, section_id: invItem?.section_id || null, est_price: invItem?.est_price || null, quantity: ing.quantity, added_by: user.id }).select().single()
        if (error) throw error
        setListItems((current) => [...current, data])
      }
    }
  }

  async function updateQuantity(listItem, newQty) {
    if (newQty < 1) return removeFromList(listItem.id)
    const { data, error } = await supabase.from('list_items').update({ quantity: newQty }).eq('id', listItem.id).select().single()
    if (error) throw error
    setListItems((current) => current.map((i) => i.id === data.id ? data : i))
  }

  async function toggleChecked(listItem) {
    const { data, error } = await supabase.from('list_items').update({ is_checked: !listItem.is_checked }).eq('id', listItem.id).select().single()
    if (error) throw error
    setListItems((current) => current.map((i) => i.id === data.id ? data : i))
  }

  async function removeFromList(listItemId) {
    const { error } = await supabase.from('list_items').delete().eq('id', listItemId)
    if (error) throw error
    setListItems((current) => current.filter((i) => i.id !== listItemId))
  }

  async function clearList(listId = activeListId) {
    const ids = listItems.filter((i) => i.list_id === listId).map((i) => i.id)
    if (ids.length === 0) return
    const { error } = await supabase.from('list_items').delete().in('id', ids)
    if (error) throw error
    setListItems((current) => current.filter((i) => !ids.includes(i.id)))
  }

  async function addInventoryItem(item) {
    const household_id = await getHouseholdId()
    const { data, error } = await supabase.from('inventory_items').insert({ household_id, ...item }).select().single()
    if (error) throw error
    setInventory((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  async function updateInventoryItem(id, updates) {
    const { data, error } = await supabase.from('inventory_items').update(updates).eq('id', id).select().single()
    if (error) throw error
    setInventory((current) => current.map((i) => i.id === id ? data : i).sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  async function deleteInventoryItem(id) {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id)
    if (error) throw error
    setInventory((current) => current.filter((i) => i.id !== id))
  }

  async function addSection(name, sortOrder) {
    const household_id = await getHouseholdId()
    const order = sortOrder ?? (sections.reduce((max, s) => Math.max(max, s.sort_order), 0) + 1)
    const { data, error } = await supabase.from('store_sections').insert({ household_id, name, sort_order: order }).select().single()
    if (error) throw error
    setSections((current) => [...current, data].sort((a, b) => a.sort_order - b.sort_order))
    return data
  }

  async function updateSection(id, updates) {
    const { data, error } = await supabase.from('store_sections').update(updates).eq('id', id).select().single()
    if (error) throw error
    setSections((current) => current.map((s) => s.id === id ? data : s).sort((a, b) => a.sort_order - b.sort_order))
    return data
  }

  async function deleteSection(id) {
    const { error } = await supabase.from('store_sections').delete().eq('id', id)
    if (error) throw error
    setSections((current) => current.filter((s) => s.id !== id))
  }

  async function addMeal(name, notes, ingredients) {
    const household_id = await getHouseholdId()
    const { data: meal, error: mealError } = await supabase.from('meals').insert({ household_id, name, notes }).select().single()
    if (mealError) throw mealError
    if (ingredients.length > 0) {
      const rows = ingredients.map((ing) => ({ meal_id: meal.id, ...ing }))
      const { data: ings, error: ingError } = await supabase.from('meal_ingredients').insert(rows).select()
      if (ingError) throw ingError
      setMealIngredients((current) => [...current, ...ings])
    }
    setMeals((current) => [...current, meal].sort((a, b) => a.name.localeCompare(b.name)))
    return meal
  }

  async function updateMeal(id, name, notes, ingredients) {
    const { data: meal, error: mealError } = await supabase.from('meals').update({ name, notes }).eq('id', id).select().single()
    if (mealError) throw mealError
    await supabase.from('meal_ingredients').delete().eq('meal_id', id)
    let newIngs = []
    if (ingredients.length > 0) {
      const rows = ingredients.map((ing) => ({ meal_id: id, ...ing }))
      const { data, error } = await supabase.from('meal_ingredients').insert(rows).select()
      if (error) throw error
      newIngs = data
    }
    setMeals((current) => current.map((m) => m.id === id ? meal : m).sort((a, b) => a.name.localeCompare(b.name)))
    setMealIngredients((current) => [...current.filter((i) => i.meal_id !== id), ...newIngs])
    return meal
  }

  async function deleteMeal(id) {
    const { error } = await supabase.from('meals').delete().eq('id', id)
    if (error) throw error
    setMeals((current) => current.filter((m) => m.id !== id))
    setMealIngredients((current) => current.filter((i) => i.meal_id !== id))
  }

  const activeListItems = listItems.filter((i) => i.list_id === activeListId)

  return {
    sections, inventory, lists, activeListId, setActiveListId,
    listItems: activeListItems, meals, mealIngredients, loading, error, reload: loadAll,
    addToList, addMealToList, updateQuantity, toggleChecked, removeFromList, clearList,
    addInventoryItem, updateInventoryItem, deleteInventoryItem,
    addSection, updateSection, deleteSection,
    addMeal, updateMeal, deleteMeal,
  }
}
