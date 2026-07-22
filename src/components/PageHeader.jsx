export default function PageHeader({ title, onMenuOpen, right }) {
  return (
    <div style={s.header}>
      <button style={s.menuBtn} onClick={onMenuOpen} aria-label="Open menu">
        <span style={s.bar} />
        <span style={s.bar} />
        <span style={s.bar} />
      </button>
      <h1 style={s.title}>{title}</h1>
      <div style={s.right}>{right}</div>
    </div>
  )
}

const s = {
  header: { background: 'var(--nav-bg)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  menuBtn: { border: 'none', background: 'none', padding: 4, display: 'flex', flexDirection: 'column', gap: 5, cursor: 'pointer', flexShrink: 0 },
  bar: { display: 'block', width: 22, height: 2, background: 'rgba(255,255,255,0.8)', borderRadius: 1 },
  title: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: 0, color: '#fff', flex: 1, letterSpacing: '-0.01em' },
  right: { flexShrink: 0 },
}
