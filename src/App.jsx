import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ThemeProvider } from './lib/ThemeContext'
import { useStoreData } from './lib/useStoreData'
import AuthPage from './pages/AuthPage'
import ListPage from './pages/ListPage'
import InventoryPage from './pages/InventoryPage'
import MealsPage from './pages/MealsPage'
import SettingsPage from './pages/SettingsPage'
import Sidebar from './components/Sidebar'

function AppShell() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [tab, setTab] = useState('list')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const {
    sections, inventory, lists, listMembers, activeListId, activeList, setActiveListId,
    listItems, allListItems, meals, mealMembers, mealIngredients,
    householdMembers, myProfile, otherMembers,
    loading, error,
    createList, updateList, deleteList,
    addInventoryItemToList, addFreetextItemToList, addMealToList,
    updateQuantity, toggleChecked, removeFromList, clearList,
    addInventoryItem, updateInventoryItem, deleteInventoryItem,
    addSection, updateSection, deleteSection,
    addMeal, updateMeal, deleteMeal,
    generateInviteCode, useInviteCode,
    updateDisplayName, updateTheme, leaveHousehold, removeMember,
  } = useStoreData()

  if (authLoading) return <Splash text="Loading…" />
  if (!user) return <AuthPage />
  if (loading) return <ThemeProvider><Splash text="Loading TheStore…" /></ThemeProvider>
  if (error) return <ThemeProvider><Splash text={`Something went wrong: ${error.message}`} /></ThemeProvider>

  return (
    <ThemeProvider serverTheme={myProfile?.theme} onSaveTheme={updateTheme}>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={tab}
        onNavigate={setTab}
        myProfile={myProfile}
        householdMembers={householdMembers}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tab === 'list' && (
          <ListPage
            sections={sections} listItems={allListItems} lists={lists} listMembers={listMembers}
            activeListId={activeListId} activeList={activeList} onSwitchList={setActiveListId}
            onToggle={toggleChecked} onRemove={removeFromList} onClear={clearList}
            onUpdateQuantity={updateQuantity} onCreateList={createList}
            onUpdateList={updateList} onDeleteList={deleteList}
            onAddFreetext={addFreetextItemToList} otherMembers={otherMembers}
            onMenuOpen={() => setSidebarOpen(true)}
          />
        )}
        {tab === 'inventory' && (
          <InventoryPage
            sections={sections} inventory={inventory} listItems={listItems} activeList={activeList}
            onAddToList={addInventoryItemToList} onAddInventoryItem={addInventoryItem}
            onUpdateInventoryItem={updateInventoryItem} onDeleteInventoryItem={deleteInventoryItem}
            onAddSection={addSection} onUpdateSection={updateSection} onDeleteSection={deleteSection}
            onMenuOpen={() => setSidebarOpen(true)}
          />
        )}
        {tab === 'meals' && (
          <MealsPage
            meals={meals} mealIngredients={mealIngredients} mealMembers={mealMembers}
            inventory={inventory} sections={sections} activeList={activeList}
            otherMembers={otherMembers} onAddMealToList={addMealToList}
            onAddMeal={addMeal} onUpdateMeal={updateMeal} onDeleteMeal={deleteMeal}
            onAddInventoryItem={addInventoryItem} onMenuOpen={() => setSidebarOpen(true)}
          />
        )}
        {tab === 'settings' && (
          <SettingsPage
            myProfile={myProfile} householdMembers={householdMembers}
            onUpdateDisplayName={updateDisplayName}
            onGenerateInvite={generateInviteCode}
            onUseInviteCode={useInviteCode}
            onMenuOpen={() => setSidebarOpen(true)}
            onLeaveHousehold={leaveHousehold}
            onRemoveMember={removeMember}
            signOut={signOut}
          />
        )}
      </div>
    </div>
    </ThemeProvider>
  )
}

function Splash({ text }) {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)', color: 'var(--charcoal-soft)', fontFamily: 'var(--font-body)', padding: 24, textAlign: 'center' }}>
      {text}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
