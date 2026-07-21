import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { useStoreData } from './lib/useStoreData'
import AuthPage from './pages/AuthPage'
import ListPage from './pages/ListPage'
import InventoryPage from './pages/InventoryPage'
import MealsPage from './pages/MealsPage'
import NavBar from './components/NavBar'

function AppShell() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [tab, setTab] = useState('list')

  const {
    sections, inventory, lists, activeListId, setActiveListId, listItems,
    meals, mealIngredients, loading: dataLoading, error,
    addToList, addMealToList, updateQuantity, toggleChecked, removeFromList, clearList,
    addInventoryItem, updateInventoryItem, deleteInventoryItem,
    addSection, updateSection, deleteSection,
    addMeal, updateMeal, deleteMeal,
  } = useStoreData()

  if (authLoading) return <FullScreenMessage text="Loading..." />
  if (!user) return <AuthPage />
  if (dataLoading) return <FullScreenMessage text="Loading your store..." />
  if (error) return <FullScreenMessage text={'Something went wrong: ' + error.message} />

  const activeList = lists.find((l) => l.id === activeListId) || null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'list' && (
          <ListPage
            sections={sections} listItems={listItems} lists={lists}
            activeListId={activeListId} onSwitchList={setActiveListId}
            onToggle={toggleChecked} onRemove={removeFromList}
            onClear={clearList} onUpdateQuantity={updateQuantity}
          />
        )}
        {tab === 'inventory' && (
          <InventoryPage
            sections={sections} inventory={inventory} listItems={listItems}
            lists={lists} activeListId={activeListId} onSwitchList={setActiveListId}
            activeList={activeList} onAddToList={addToList}
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
            inventory={inventory} sections={sections} activeList={activeList}
            onAddMealToList={addMealToList} onAddMeal={addMeal}
            onUpdateMeal={updateMeal} onDeleteMeal={deleteMeal}
            onAddInventoryItem={addInventoryItem}
          />
        )}
      </div>

      {/* Sign out tucked into the nav bar area — can't overlap page content */}
      <div style={styles.footer}>
        <NavBar active={tab} onChange={setTab} />
        <button onClick={signOut} style={styles.signOut}>Sign out</button>
      </div>
    </div>
  )
}

function FullScreenMessage({ text }) {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--chalk)', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', padding: 24, textAlign: 'center' }}>
      {text}
    </div>
  )
}

const styles = {
  footer: {
    borderTop: '1px solid var(--line)',
    background: 'var(--chalk)',
    display: 'flex',
    flexDirection: 'column',
  },
  signOut: {
    border: 'none',
    background: 'none',
    color: 'var(--charcoal-soft)',
    fontSize: 11,
    padding: '6px 0 8px',
    textAlign: 'center',
    textDecoration: 'underline',
    paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
  },
}

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>
}
