import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

export function useStoreData() {
  const { user } = useAuth()
  const [sections, setSections] = useState([])
  const [inventory, setInventory] = useState([])
  const [lists, setLists] = useState([])
  const [listItems, setListItems] = useState([])
  const [activeListId, setActiveListId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [sectionsRes, inventoryRes, listsRes] = await Promise.all([
      supabase.from('store_sections').select('*').order('sort_order'),
      supabase.from('inventory_items').select('*').order('name'),
      supabase.from('lists').select('*').order('created_at'),
    ])

    if (sectionsRes.error || inventoryRes.error || listsRes.error) {
      setError(sectionsRes.error || inventoryRes.error || listsRes.error)
      setLoading(false)
      return
    }

    setSections(sectionsRes.data)
    setInventory(inventoryRes.data)
    setLists(listsRes.data)

    // Default to the shared list if we don't have an active selection yet.
    setActiveListId((current) => {
      if (current && listsRes.data.some((l) => l.id === current)) return current
      const shared = listsRes.data.find((l) => l.kind === 'shared')
      return shared?.id || listsRes.data[0]?.id || null
    })

    // Load items across every list we can access (shared + personal),
    // so switching tabs is instant with no extra round-trip.
    const accessibleListIds = listsRes.data.map((l) => l.id)
    if (accessibleListIds.length > 0) {
      const itemsRes = await supabase
        .from('list_items')
        .select('*')
        .in('list_id', accessibleListIds)
        .order('added_at')
      if (itemsRes.error) {
        setError(itemsRes.error)
      } else {
        setListItems(itemsRes.data)
      }
    } else {
      setListItems([])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user, loadAll])

  // Real-time sync on list_items — this is what makes checks/adds
  // show up live between you and your daughter, across both the shared
  // list and (if you ever view each other's) personal lists.
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('list_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' }, (payload) => {
        setListItems((current) => {
          if (payload.eventType === 'INSERT') {
            if (current.some((i) => i.id === payload.new.id)) return current
            return [...current, payload.new].sort((a, b) => a.added_at.localeCompare(b.added_at))
          }
          if (payload.eventType === 'UPDATE') {
            return current.map((i) => (i.id === payload.new.id ? payload.new : i))
          }
          if (payload.eventType === 'DELETE') {
            return current.filter((i) => i.id !== payload.old.id)
          }
          return current
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // ── Mutations ──

  async function getHouseholdId() {
    const { data, error } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()
    if (error) throw error
    return data.household_id
  }

  async function addToList(inventoryItem, listId = activeListId) {
    if (!listId) throw new Error('No active list selected')
    const { data, error } = await supabase
      .from('list_items')
      .insert({
        list_id: listId,
        inventory_item_id: inventoryItem.id,
        name: inventoryItem.name,
        section_id: inventoryItem.section_id,
        est_price: inventoryItem.est_price,
        added_by: user.id,
      })
      .select()
      .single()
    if (error) throw error
    setListItems((current) => [...current, data])
  }

  async function toggleChecked(listItem) {
    const { data, error } = await supabase
      .from('list_items')
      .update({ is_checked: !listItem.is_checked })
      .eq('id', listItem.id)
      .select()
      .single()
    if (error) throw error
    setListItems((current) => current.map((i) => (i.id === data.id ? data : i)))
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
    const { data, error } = await supabase
      .from('inventory_items')
      .insert({ household_id, ...item })
      .select()
      .single()
    if (error) throw error
    setInventory((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  async function updateInventoryItem(id, updates) {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setInventory((current) =>
      current.map((i) => (i.id === id ? data : i)).sort((a, b) => a.name.localeCompare(b.name))
    )
    return data
  }

  async function deleteInventoryItem(id) {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id)
    if (error) throw error
    setInventory((current) => current.filter((i) => i.id !== id))
  }

  async function addSection(name) {
    const household_id = await getHouseholdId()
    const maxOrder = sections.reduce((max, s) => Math.max(max, s.sort_order), 0)
    const { data, error } = await supabase
      .from('store_sections')
      .insert({ household_id, name, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (error) throw error
    setSections((current) => [...current, data].sort((a, b) => a.sort_order - b.sort_order))
    return data
  }

  // Items belonging to the currently active list (what ListPage renders).
  const activeListItems = listItems.filter((i) => i.list_id === activeListId)

  return {
    sections,
    inventory,
    lists,
    activeListId,
    setActiveListId,
    listItems: activeListItems,
    allListItemsByInventoryId: listItems, // used by Inventory page to know "is this in ANY of my lists"
    loading,
    error,
    reload: loadAll,
    addToList,
    toggleChecked,
    removeFromList,
    clearList,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    addSection,
  }
}
