export default function Sidebar({ isOpen, onClose, activeTab, onNavigate, myProfile, householdMembers }) {
  const NAV = [
    { id: 'list', label: 'List', icon: '🛒' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'meals', label: 'Meals', icon: '🍽️' },
  ]

  return (
    <>
      {isOpen && <div style={s.overlay} onClick={onClose} />}

      <div style={{ ...s.sidebar, transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
        <div style={s.inner}>
          {/* Logo */}
          <div style={s.logoWrap}>
            <h1 style={s.logo}>TheStore</h1>
            <button style={s.closeBtn} onClick={onClose}>×</button>
          </div>

          {/* Profile */}
          {myProfile && (
            <div style={s.profileRow}>
              <div style={s.avatar}>{(myProfile.display_name || '?')[0].toUpperCase()}</div>
              <div>
                <p style={s.profileName}>{myProfile.display_name}</p>
                <p style={s.profileSub}>{householdMembers.length} in household</p>
              </div>
            </div>
          )}

          <div style={s.divider} />

          {/* Nav */}
          <nav style={s.nav}>
            {NAV.map(item => (
              <button
                key={item.id}
                style={{
                  ...s.navItem,
                  background: activeTab === item.id ? 'rgba(255,255,255,0.5)' : 'transparent',
                  fontWeight: activeTab === item.id ? 700 : 500,
                }}
                onClick={() => { onNavigate(item.id); onClose() }}
              >
                <span style={s.navIcon}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div style={s.divider} />

          <button
            style={{
              ...s.navItem,
              background: activeTab === 'settings' ? 'rgba(255,255,255,0.5)' : 'transparent',
              fontWeight: activeTab === 'settings' ? 700 : 500,
            }}
            onClick={() => { onNavigate('settings'); onClose() }}
          >
            <span style={s.navIcon}>⚙️</span>
            Settings
          </button>
        </div>
      </div>
    </>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 30 },
  sidebar: {
    position: 'fixed', top: 0, left: 0, bottom: 0, width: 260,
    background: 'var(--sidebar-bg)',
    zIndex: 40, boxShadow: '4px 0 20px rgba(0,0,0,0.12)',
    transition: 'transform 0.25s ease',
    display: 'flex', flexDirection: 'column',
  },
  inner: { flex: 1, overflowY: 'auto', padding: '0 0 24px' },
  logoWrap: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px 12px' },
  logo: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, margin: 0, color: 'var(--primary-dark)', letterSpacing: '-0.02em' },
  closeBtn: { border: 'none', background: 'none', fontSize: 24, color: 'var(--charcoal-soft)', padding: 4, lineHeight: 1 },
  profileRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 16px 12px' },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 },
  profileName: { margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' },
  profileSub: { margin: '2px 0 0', fontSize: 11, color: 'var(--charcoal-soft)' },
  divider: { height: '0.5px', background: 'rgba(74,82,84,0.15)', margin: '8px 16px' },
  nav: { display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 8px' },
  navItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px', borderRadius: 10, border: 'none', textAlign: 'left', fontSize: 15, cursor: 'pointer', width: '100%', color: 'var(--charcoal)' },
  navIcon: { fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 },
}
