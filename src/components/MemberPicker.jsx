export default function MemberPicker({ members, selected, onChange, label = 'Share with' }) {
  function toggle(userId) {
    if (selected.includes(userId)) onChange(selected.filter(id => id !== userId))
    else onChange([...selected, userId])
  }

  return (
    <div>
      <p style={s.label}>{label}</p>
      {members.length === 0 ? (
        <p style={s.empty}>No other household members yet. Invite someone from Settings.</p>
      ) : (
        <div style={s.chips}>
          {members.map(m => {
            const isOn = selected.includes(m.user_id)
            return (
              <button
                key={m.user_id}
                style={{
                  ...s.chip,
                  background: isOn ? 'var(--primary)' : 'var(--cream)',
                  color: isOn ? '#fff' : 'var(--charcoal)',
                  border: isOn ? '1.5px solid var(--primary)' : '1.5px solid var(--cream-border)',
                }}
                onClick={() => toggle(m.user_id)}
              >
                <span style={{ ...s.initial, background: isOn ? 'rgba(255,255,255,0.25)' : 'var(--primary-light)' }}>
                  {(m.display_name || '?')[0].toUpperCase()}
                </span>
                {m.display_name}
                {isOn && <span style={s.check}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const s = {
  label: { margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--charcoal-soft)' },
  empty: { margin: 0, fontSize: 12, color: 'var(--charcoal-soft)', fontStyle: 'italic', padding: '8px 0' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  initial: { width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--primary-dark)' },
  check: { fontSize: 12, marginLeft: 2 },
}
