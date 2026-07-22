import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

export function useStoreData() {
  const { user } = useAuth()
  const [sections, setSections] = useState([])
  const [inventory, setInventory] = useState([])
  const [lists, setLists] = useState([])
  const [listMembers, setListMembers] = useState([]) // { list_id, user_id }
  const [listItems, setListItems] = useState([])
  const [meals, setMeals] = useState([])
  const [mealMembers, setMealMembers] = useState([])
  const [mealIngredients, setMealIngredients] = useState([])
  const [householdMembers, setHouseholdMembers] = useState([]) // { user_id, display_name }
  const [activeListId, setActiveListId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [sectionsRes, inventoryRes, listsRes, listMembersRes, mealsRes, mealMembersRes, ingredientsRes] = await Promise.all([
      supabase.from('store_sections').select('*').order('sort_order'),
      supabase.from('inventory_items').select('*').order('name'),
      supabase.from('lists').select('*').order('created_at'),
      supabase.from('list_members').select('*'),
      supabase.from('meals').select('*').order('name'),
      supabase.from('meal_members').select('*'),
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
    setListMembers(listMembersRes.data || [])
    setMeals(mealsRes.data)
    setMealMembers(mealMembersRes.data || [])
    setMealIngredients(ingredientsRes.data)

    setActiveListId(cur => {
      if (cur && listsRes.data.some(l => l.id === cur)) return cur
      return listsRes.data[0]?.id || null
    })

    if (listsRes.data.length > 0) {
      const ids = listsRes.data.map(l => l.id)
      const { data, error } = await supabase.from('list_items').select('*').in('list_id', ids).order('added_at')
      if (error) setError(error)
      else setListItems(data)
    } else {
      setListItems([])
    }

    // Load household members with display names
    const { data: hmData } = await supabase
      .from('household_members')
      .select('user_id, profiles(display_name, theme)')
    if (hmData) {
      setHouseholdMembers(hmData.map(hm => ({
        user_id: hm.user_id,
        display_name: hm.profiles?.display_name || 'Unknown',
          theme: hm.profiles?.theme || 'teal',
      })))
    }

    setLoading(false)
  }, [])

  useEffect(() => { if (user) loadAll() }, [user, loadAll])

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('list_items_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' }, payload => {
        setListItems(cur => {
          if (payload.eventType === 'INSERT') {
            if (cur.some(i => i.id === payload.new.id)) return cur
            return [...cur, payload.new].sort((a, b) => a.added_at.localeCompare(b.added_at))
          }
          if (payload.eventType === 'UPDATE') return cur.map(i => i.id === payload.new.id ? payload.new : i)
          if (payload.eventType === 'DELETE') return cur.filter(i => i.id !== payload.old.id)
          return cur
        })
      }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  async function getHouseholdId() {
    const { data, error } = await supabase.from('household_members').select('household_id').eq('user_id', user.id).limit(1).single()
    if (error) throw error
    return data.household_id
  }

  // ── List mutations ──
  async function createList(name, sharedWithUserIds = []) {
    const household_id = await getHouseholdId()
    const { data: list, error } = await supabase.from('lists').insert({ household_id, name, created_by: user.id }).select().single()
    if (error) throw error
    setLists(cur => [...cur, list])

    if (sharedWithUserIds.length > 0) {
      const rows = sharedWithUserIds.map(uid => ({ list_id: list.id, user_id: uid }))
      const { data: members, error: mErr } = await supabase.from('list_members').insert(rows).select()
      if (!mErr && members) setListMembers(cur => [...cur, ...members])
    }
    return list
  }

  async function updateList(id, name, sharedWithUserIds = []) {
    const { data, error } = await supabase.from('lists').update({ name }).eq('id', id).select().single()
    if (error) throw error
    setLists(cur => cur.map(l => l.id === id ? data : l))

    // Replace members
    await supabase.from('list_members').delete().eq('list_id', id)
    let newMembers = []
    if (sharedWithUserIds.length > 0) {
      const rows = sharedWithUserIds.map(uid => ({ list_id: id, user_id: uid }))
      const { data: members } = await supabase.from('list_members').insert(rows).select()
      if (members) newMembers = members
    }
    setListMembers(cur => [...cur.filter(m => m.list_id !== id), ...newMembers])
  }

  async function deleteList(id) {
    const { error } = await supabase.from('lists').delete().eq('id', id)
    if (error) throw error
    setLists(cur => cur.filter(l => l.id !== id))
    setListItems(cur => cur.filter(i => i.list_id !== id))
    setListMembers(cur => cur.filter(m => m.list_id !== id))
    if (activeListId === id) {
      const remaining = lists.filter(l => l.id !== id)
      setActiveListId(remaining[0]?.id || null)
    }
  }

  // ── List item mutations ──
  async function addInventoryItemToList(inventoryItem, listId = activeListId) {
    if (!listId) throw new Error('No active list')
    const existing = listItems.find(i => i.list_id === listId && i.inventory_item_id === inventoryItem.id)
    if (existing) return updateQuantity(existing, existing.quantity + 1)
    const { data, error } = await supabase.from('list_items').insert({
      list_id: listId, item_type: 'inventory', inventory_item_id: inventoryItem.id,
      name: inventoryItem.name, section_id: inventoryItem.section_id,
      est_price: inventoryItem.est_price, quantity: 1, added_by: user.id,
    }).select().single()
    if (error) throw error
    setListItems(cur => [...cur, data])
  }

  async function addFreetextItemToList(name, estPrice, listId = activeListId) {
    if (!listId || !name.trim()) throw new Error('No active list or empty name')
    const { data, error } = await supabase.from('list_items').insert({
      list_id: listId, item_type: 'freetext', name: name.trim(),
      est_price: estPrice ? Number(estPrice) : null, quantity: 1, added_by: user.id,
    }).select().single()
    if (error) throw error
    setListItems(cur => [...cur, data])
  }

  async function addMealToList(meal, listId = activeListId) {
    if (!listId) throw new Error('No active list')
    const ings = mealIngredients.filter(i => i.meal_id === meal.id)
    const invMap = new Map(inventory.map(i => [i.id, i]))
    for (const ing of ings) {
      const invItem = ing.inventory_item_id ? invMap.get(ing.inventory_item_id) : null
      const existing = listItems.find(i => i.list_id === listId && i.inventory_item_id === ing.inventory_item_id && ing.inventory_item_id)
      if (existing) {
        await updateQuantity(existing, existing.quantity + ing.quantity)
      } else {
        const { data, error } = await supabase.from('list_items').insert({
          list_id: listId, item_type: 'inventory',
          inventory_item_id: ing.inventory_item_id || null,
          name: invItem?.name || ing.name,
          section_id: invItem?.section_id || null,
          est_price: invItem?.est_price || null,
          quantity: ing.quantity, added_by: user.id,
        }).select().single()
        if (error) throw error
        setListItems(cur => [...cur, data])
      }
    }
  }

  async function updateQuantity(listItem, newQty) {
    if (newQty < 1) return removeFromList(listItem.id)
    const { data, error } = await supabase.from('list_items').update({ quantity: newQty }).eq('id', listItem.id).select().single()
    if (error) throw error
    setListItems(cur => cur.map(i => i.id === data.id ? data : i))
  }

  async function toggleChecked(listItem) {
    const { data, error } = await supabase.from('list_items').update({ is_checked: !listItem.is_checked }).eq('id', listItem.id).select().single()
    if (error) throw error
    setListItems(cur => cur.map(i => i.id === data.id ? data : i))
  }

  async function removeFromList(id) {
    const { error } = await supabase.from('list_items').delete().eq('id', id)
    if (error) throw error
    setListItems(cur => cur.filter(i => i.id !== id))
  }

  async function clearList(listId = activeListId) {
    const ids = listItems.filter(i => i.list_id === listId).map(i => i.id)
    if (!ids.length) return
    const { error } = await supabase.from('list_items').delete().in('id', ids)
    if (error) throw error
    setListItems(cur => cur.filter(i => !ids.includes(i.id)))
  }

  // ── Inventory mutations ──
  async function addInventoryItem(item) {
    const household_id = await getHouseholdId()
    const { data, error } = await supabase.from('inventory_items').insert({ household_id, ...item }).select().single()
    if (error) throw error
    setInventory(cur => [...cur, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  async function updateInventoryItem(id, updates) {
    const { data, error } = await supabase.from('inventory_items').update(updates).eq('id', id).select().single()
    if (error) throw error
    setInventory(cur => cur.map(i => i.id === id ? data : i).sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  async function deleteInventoryItem(id) {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id)
    if (error) throw error
    setInventory(cur => cur.filter(i => i.id !== id))
  }

  async function addSection(name, sortOrder) {
    const household_id = await getHouseholdId()
    const order = sortOrder ?? (sections.reduce((m, s) => Math.max(m, s.sort_order), 0) + 1)
    const { data, error } = await supabase.from('store_sections').insert({ household_id, name, sort_order: order }).select().single()
    if (error) throw error
    setSections(cur => [...cur, data].sort((a, b) => a.sort_order - b.sort_order))
    return data
  }

  async function updateSection(id, updates) {
    const { data, error } = await supabase.from('store_sections').update(updates).eq('id', id).select().single()
    if (error) throw error
    setSections(cur => cur.map(s => s.id === id ? data : s).sort((a, b) => a.sort_order - b.sort_order))
  }

  async function deleteSection(id) {
    const { error } = await supabase.from('store_sections').delete().eq('id', id)
    if (error) throw error
    setSections(cur => cur.filter(s => s.id !== id))
  }

  // ── Meal mutations ──
  async function addMeal(name, notes, ingredients, sharedWithUserIds = []) {
    const household_id = await getHouseholdId()
    const { data: meal, error: mealErr } = await supabase.from('meals').insert({ household_id, name, notes, created_by: user.id }).select().single()
    if (mealErr) throw mealErr
    if (ingredients.length > 0) {
      const { data: ings, error: ingErr } = await supabase.from('meal_ingredients').insert(ingredients.map(ing => ({ meal_id: meal.id, ...ing }))).select()
      if (ingErr) throw ingErr
      setMealIngredients(cur => [...cur, ...ings])
    }
    if (sharedWithUserIds.length > 0) {
      const rows = sharedWithUserIds.map(uid => ({ meal_id: meal.id, user_id: uid }))
      const { data: members } = await supabase.from('meal_members').insert(rows).select()
      if (members) setMealMembers(cur => [...cur, ...members])
    }
    setMeals(cur => [...cur, meal].sort((a, b) => a.name.localeCompare(b.name)))
    return meal
  }

  async function updateMeal(id, name, notes, ingredients, sharedWithUserIds = []) {
    const { data: meal, error: mealErr } = await supabase.from('meals').update({ name, notes }).eq('id', id).select().single()
    if (mealErr) throw mealErr
    await supabase.from('meal_ingredients').delete().eq('meal_id', id)
    let newIngs = []
    if (ingredients.length > 0) {
      const { data, error } = await supabase.from('meal_ingredients').insert(ingredients.map(ing => ({ meal_id: id, ...ing }))).select()
      if (error) throw error
      newIngs = data
    }
    await supabase.from('meal_members').delete().eq('meal_id', id)
    let newMembers = []
    if (sharedWithUserIds.length > 0) {
      const rows = sharedWithUserIds.map(uid => ({ meal_id: id, user_id: uid }))
      const { data } = await supabase.from('meal_members').insert(rows).select()
      if (data) newMembers = data
    }
    setMeals(cur => cur.map(m => m.id === id ? meal : m).sort((a, b) => a.name.localeCompare(b.name)))
    setMealIngredients(cur => [...cur.filter(i => i.meal_id !== id), ...newIngs])
    setMealMembers(cur => [...cur.filter(m => m.meal_id !== id), ...newMembers])
  }

  async function deleteMeal(id) {
    const { error } = await supabase.from('meals').delete().eq('id', id)
    if (error) throw error
    setMeals(cur => cur.filter(m => m.id !== id))
    setMealIngredients(cur => cur.filter(i => i.meal_id !== id))
    setMealMembers(cur => cur.filter(m => m.meal_id !== id))
  }

  // ── Household invites ──
  async function generateInviteCode() {
    const household_id = await getHouseholdId()
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase.from('household_invites').insert({
      household_id, code, created_by: user.id,
    }).select().single()
    if (error) throw error
    return data
  }

  async function useInviteCode(code) {
    const { data, error } = await supabase.rpc('use_invite_code', { invite_code: code })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    await loadAll()
    return data
  }

  // ── Profile ──
  async function leaveHousehold() {
    const household_id = await getHouseholdId()

    // Transfer ownership of shared lists created by this user to the first other member
    const otherMember = otherMembers[0]
    if (otherMember) {
      await supabase.from('lists')
        .update({ created_by: otherMember.user_id })
        .eq('created_by', user.id)
        .eq('household_id', household_id)
        .neq('created_by', user.id) // only shared ones (those visible to others)

      // Transfer shared meals too
      await supabase.from('meals')
        .update({ created_by: otherMember.user_id })
        .eq('created_by', user.id)
        .eq('household_id', household_id)
        .in('id', (await supabase.from('meal_members').select('meal_id').then(r => r.data?.map(m => m.meal_id) || [])))
    }

    // Remove from household
    const { error } = await supabase.from('household_members')
      .delete()
      .eq('user_id', user.id)
      .eq('household_id', household_id)
    if (error) throw error

    // Sign out so they land on a fresh state
    await supabase.auth.signOut()
  }

  async function removeMember(memberUserId) {
    const household_id = await getHouseholdId()

    // Transfer their shared lists/meals to current user
    await supabase.from('lists')
      .update({ created_by: user.id })
      .eq('created_by', memberUserId)
      .eq('household_id', household_id)

    await supabase.from('meals')
      .update({ created_by: user.id })
      .eq('created_by', memberUserId)
      .eq('household_id', household_id)

    // Remove from household
    const { error } = await supabase.from('household_members')
      .delete()
      .eq('user_id', memberUserId)
      .eq('household_id', household_id)
    if (error) throw error

    // Update local state
    setHouseholdMembers(cur => cur.filter(m => m.user_id !== memberUserId))
  }

  async function updateDisplayName(displayName) {
    const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', user.id)
    if (error) throw error
    setHouseholdMembers(cur => cur.map(m => m.user_id === user.id ? { ...m, display_name: displayName } : m))
  }

  async function updateTheme(themeId) {
    await supabase.from('profiles').update({ theme: themeId }).eq('id', user.id)
  }

  const activeList = lists.find(l => l.id === activeListId) || null
  const activeListItems = listItems.filter(i => i.list_id === activeListId)
  const myProfile = householdMembers.find(m => m.user_id === user?.id)
  const otherMembers = householdMembers.filter(m => m.user_id !== user?.id)

  return {
    sections, inventory, lists, listMembers, activeListId, activeList, setActiveListId,
    listItems: activeListItems, allListItems: listItems, meals, mealMembers, mealIngredients,
    householdMembers, myProfile, otherMembers,
    loading, error, reload: loadAll,
    createList, updateList, deleteList,
    addInventoryItemToList, addFreetextItemToList, addMealToList,
    updateQuantity, toggleChecked, removeFromList, clearList,
    addInventoryItem, updateInventoryItem, deleteInventoryItem,
    addSection, updateSection, deleteSection,
    addMeal, updateMeal, deleteMeal,
    generateInviteCode, useInviteCode,
    updateDisplayName, updateTheme,
    leaveHousehold, removeMember,
  }
}
