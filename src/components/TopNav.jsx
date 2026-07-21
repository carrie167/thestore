const TABS = [
  { id: 'list', label: 'List' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'meals', label: 'Meals' },
]

export default function TopNav({ active, onChange }) {
  return (
    <nav style={s.nav}>
      {TABS.map(tab => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              ...s.tab,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
              fontWeight: isActive ? 700 : 400,
              borderBottom: isActive ? '3px solid var(--teal)' : '3px solid transparent',
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}

const s = {
  nav: { background: 'var(--charcoal)', display: 'flex', flexShrink: 0 },
  tab: { flex: 1, border: 'none', background: 'none', padding: '14px 0 11px', fontSize: 13, textAlign: 'center', cursor: 'pointer', transition: 'color 0.15s' },
}
