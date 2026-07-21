import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { useStoreData } from './lib/useStoreData'
import AuthPage from './pages/AuthPage'
import ListPage from './pages/ListPage'
import InventoryPage from './pages/InventoryPage'
import MealsPage from './pages/MealsPage'
import TopNav from './components/TopNav'

function AppShell() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [tab, setTab] = useState('list')

  const {
    sections, inventory, lists, activeListId, activeList, setActiveListId,
    listItems, meals, mealIngredients, loading, error,
    createList, deleteList, updateList,
    addInventoryItemToList, addFreetextItemToList, addMealToList,
    updateQuantity, toggleChecked, removeFromList, clearList,
    addInventoryItem, updateInventoryItem, deleteInventoryItem,
    addSection, updateSection, deleteSection,
    addMeal, updateMeal, deleteMeal,
  } = useStoreData()

  if (authLoading) return <Splash text="Loading…" />
  if (!user) return <AuthPage />
  if (loading) return <Splash text="Loading your store…" />
  if (error) return <Splash text={`Something went wrong: ${error.message}`} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopNav active={tab} onChange={setTab} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: tab === 'list' || tab === 'meals' ? 'hidden' : 'hidden' }}>
        {tab === 'list' && (
          <ListPage
            sections={sections} listItems={listItems} lists={lists}
            activeListId={activeListId} activeList={activeList}
            onSwitchList={setActiveListId}
            onToggle={toggleChecked} onRemove={removeFromList}
            onClear={clearList} onUpdateQuantity={updateQuantity}
            onCreateList={createList} onDeleteList={deleteList}
            onAddFreetext={addFreetextItemToList}
          />
        )}
        {tab === 'inventory' && (
          <InventoryPage
            sections={sections} inventory={inventory} listItems={listItems}
            activeList={activeList}
            onAddToList={addInventoryItemToList}
            onAddInventoryItem={addInventoryItem}
            onUpdateInventoryItem={updateInventoryItem}
            onDeleteInventoryItem={deleteInventoryItem}
            onAddSection={addSection}
            onUpdateSection={updateSection}
            onDeleteSection={deleteSection}
          />
        )}
        {tab === 'meals' && (
          <MealsPage
            meals={meals} mealIngredients={mealIngredients}
            inventory={inventory} sections={sections}
            activeList={activeList}
            onAddMealToList={addMealToList}
            onAddMeal={addMeal} onUpdateMeal={updateMeal} onDeleteMeal={deleteMeal}
            onAddInventoryItem={addInventoryItem}
          />
        )}
      </div>
      <div style={signOutWrap}>
        <button onClick={signOut} style={signOutBtn}>Sign out</button>
      </div>
    </div>
  )
}

function Splash({ text }) {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', padding: 24, textAlign: 'center' }}>
      {text}
    </div>
  )
}

const signOutWrap = { background: '#fff', borderTop: '0.5px solid var(--cream-border)', padding: '6px 0 calc(6px + env(safe-area-inset-bottom))', textAlign: 'center' }
const signOutBtn = { border: 'none', background: 'none', color: 'var(--charcoal-soft)', fontSize: 11, textDecoration: 'underline' }

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>
}
