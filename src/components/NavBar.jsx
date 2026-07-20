const TABS = [
  { id: 'list', label: 'List' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'meals', label: 'Meals' },
]

export default function NavBar({ active, onChange }) {
  return (
    <nav style={styles.nav}>
      {TABS.map((tab) => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              ...styles.tab,
              color: isActive ? 'var(--terracotta-dark)' : 'var(--charcoal-soft)',
              fontWeight: isActive ? 700 : 500,
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <span style={{ ...styles.dot, background: isActive ? 'var(--terracotta)' : 'transparent' }} />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}

const styles = {
  nav: {
    display: 'flex',
    borderTop: '1px solid var(--line)',
    background: 'var(--chalk)',
    position: 'sticky',
    bottom: 0,
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  tab: {
    flex: 1,
    border: 'none',
    background: 'none',
    padding: '12px 0 10px',
    fontSize: 13,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  dot: { width: 5, height: 5, borderRadius: '50%' },
}
