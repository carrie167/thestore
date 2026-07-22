import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'

export default function SettingsPage({ myProfile, householdMembers, onUpdateDisplayName, onGenerateInvite, onUseInviteCode, onMenuOpen, signOut, onLeaveHousehold, onRemoveMember }) {
  const { user } = useAuth()
  const { themeId, setThemeId, themes } = useTheme()
  const [displayName, setDisplayName] = useState(myProfile?.display_name || '')
  const [savingName, setSavingName] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(null) // user_id of member to remove
  const [leaving, setLeaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)
  const [invite, setInvite] = useState(null)
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joiningHousehold, setJoiningHousehold] = useState(false)
  const [joinResult, setJoinResult] = useState(null)
  const [copied, setCopied] = useState(false)

  async function handleSaveName() {
    if (!displayName.trim()) return
    setSavingName(true)
    try {
      await onUpdateDisplayName(displayName.trim())
      setNameSuccess(true)
      setTimeout(() => setNameSuccess(false), 2000)
    } finally { setSavingName(false) }
  }

  async function handleGenerateInvite() {
    setGeneratingInvite(true)
    try { setInvite(await onGenerateInvite()) }
    finally { setGeneratingInvite(false) }
  }

  async function handleCopyCode() {
    if (!invite?.code) return
    await navigator.clipboard.writeText(invite.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return
    setJoiningHousehold(true)
    try {
      await onUseInviteCode(inviteCode.trim().toUpperCase())
      setJoinResult({ success: true })
    } catch (e) {
      setJoinResult({ error: e.message })
    } finally { setJoiningHousehold(false) }
  }

  return (
    <div style={s.page}>
      <PageHeader title="Settings" onMenuOpen={onMenuOpen} />

      <div style={s.scroll}>

        {/* Account */}
        <Section title="Account">
          <p style={s.email}>{user?.email}</p>
          <label style={s.fieldLabel}>
            Display name
            <div style={s.inputRow}>
              <input style={s.input} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="How you appear to others" />
              <button style={s.saveBtn} onClick={handleSaveName} disabled={savingName}>
                {nameSuccess ? '✓' : savingName ? '…' : 'Save'}
              </button>
            </div>
          </label>
          <button style={s.signOutBtn} onClick={signOut}>Sign out</button>
        </Section>

        {/* Theme */}
        <Section title="Theme">
          <div style={s.themeGrid}>
            {Object.values(themes).map(theme => (
              <button
                key={theme.id}
                style={{ ...s.themeCard, border: themeId === theme.id ? '2px solid var(--primary)' : '2px solid var(--cream-border)', background: themeId === theme.id ? 'var(--cream)' : '#fff' }}
                onClick={() => setThemeId(theme.id)}
              >
                <div style={s.swatchRow}>
                  {theme.swatch.map((color, i) => <div key={i} style={{ ...s.swatch, background: color }} />)}
                </div>
                <span style={s.themeName}>{theme.name}</span>
                {themeId === theme.id && <span style={s.themeCheck}>✓</span>}
              </button>
            ))}
          </div>
        </Section>

        {/* Household members */}
        <Section title="Household">
          <div style={s.memberList}>
            {householdMembers.map(m => (
              <div key={m.user_id} style={s.memberRow}>
                <div style={s.memberAvatar}>{(m.display_name || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <p style={s.memberName}>{m.display_name}{m.user_id === user?.id ? ' (you)' : ''}</p>
                </div>
                {m.user_id !== user?.id && (
                  confirmRemove === m.user_id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--charcoal-soft)' }}>Remove?</p>
                      <button style={s.confirmSmallBtn} onClick={async () => {
                        setRemoving(true)
                        try { await onRemoveMember(m.user_id) } finally { setRemoving(false); setConfirmRemove(null) }
                      }} disabled={removing}>{removing ? '…' : 'Yes'}</button>
                      <button style={s.cancelSmallBtn} onClick={() => setConfirmRemove(null)}>No</button>
                    </div>
                  ) : (
                    <button style={s.removeSmallBtn} onClick={() => setConfirmRemove(m.user_id)}>Remove</button>
                  )
                )}
              </div>
            ))}
          </div>

          {/* Leave household */}
          {householdMembers.length > 1 && (
            confirmLeave ? (
              <div style={s.leaveBox}>
                <p style={s.leaveText}>Are you sure? Your shared lists and meals will transfer to other members. Your private ones stay with you.</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={s.cancelBtn} onClick={() => setConfirmLeave(false)}>Cancel</button>
                  <button style={{ ...s.saveBtn, background: 'var(--danger)' }} onClick={async () => {
                    setLeaving(true)
                    try { await onLeaveHousehold() } finally { setLeaving(false) }
                  }} disabled={leaving}>{leaving ? 'Leaving…' : 'Leave household'}</button>
                </div>
              </div>
            ) : (
              <button style={s.leaveBtn} onClick={() => setConfirmLeave(true)}>
                Leave this household
              </button>
            )
          )}
        </Section>

        {/* Invite someone */}
        <Section title="Invite to household">
          <p style={s.sectionBody}>Generate a 6-letter code and send it to someone. The code expires in 48 hours.</p>

          {invite ? (
            <div style={s.inviteBox}>
              <p style={s.inviteCode}>{invite.code}</p>
              <p style={s.inviteExpiry}>Expires {new Date(invite.expires_at).toLocaleString()}</p>
              <button style={s.copyBtn} onClick={handleCopyCode}>
                {copied ? '✓ Copied!' : 'Copy code'}
              </button>
              <button style={s.newCodeBtn} onClick={handleGenerateInvite}>Generate new code</button>
            </div>
          ) : (
            <button style={s.generateBtn} onClick={handleGenerateInvite} disabled={generatingInvite}>
              {generatingInvite ? 'Generating…' : 'Generate invite code'}
            </button>
          )}
        </Section>

        {/* Join a household */}
        <Section title="Join a household">
          <p style={s.sectionBody}>Have an invite code? Enter it below to join someone's household.</p>
          <div style={s.inputRow}>
            <input
              style={{ ...s.input, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', fontSize: 18 }}
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
            />
            <button style={s.saveBtn} onClick={handleJoin} disabled={joiningHousehold || !inviteCode.trim()}>
              {joiningHousehold ? '…' : 'Join'}
            </button>
          </div>
          {joinResult?.success && <p style={s.success}>Joined! Reload the app to see the shared household.</p>}
          {joinResult?.error && <p style={s.errorMsg}>{joinResult.error}</p>}
        </Section>

      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={s.section}>
      <p style={s.sectionTitle}>{title}</p>
      <div style={s.sectionContent}>{children}</div>
    </div>
  )
}

const s = {
  page: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--cream)' },
  scroll: { flex: 1, overflowY: 'auto', padding: '16px 0 32px' },
  section: { margin: '0 16px 16px', background: '#fff', borderRadius: 12, border: '1px solid var(--cream-border)', overflow: 'hidden' },
  sectionTitle: { margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--charcoal-soft)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 14px 8px', borderBottom: '0.5px solid var(--cream-border)' },
  sectionContent: { padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 },
  sectionBody: { margin: 0, fontSize: 13, color: 'var(--charcoal-soft)', lineHeight: 1.5 },
  email: { margin: 0, fontSize: 14, color: 'var(--charcoal)', fontFamily: 'var(--font-mono)', fontWeight: 500 },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--charcoal-soft)' },
  inputRow: { display: 'flex', gap: 8 },
  input: { flex: 1, border: '1px solid var(--cream-border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: 'var(--cream-light)', color: 'var(--charcoal)' },
  saveBtn: { border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, flexShrink: 0 },
  signOutBtn: { border: '1px solid var(--cream-border)', background: 'none', color: 'var(--charcoal-soft)', borderRadius: 8, padding: '9px 14px', fontSize: 13, alignSelf: 'flex-start', textDecoration: 'underline' },
  themeGrid: { display: 'flex', gap: 10 },
  themeCard: { flex: 1, borderRadius: 12, padding: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  swatchRow: { display: 'flex', gap: 3 },
  swatch: { width: 18, height: 18, borderRadius: 4 },
  themeName: { fontSize: 12, color: 'var(--charcoal-soft)', fontWeight: 500 },
  themeCheck: { fontSize: 14, color: 'var(--primary)', fontWeight: 700 },
  memberList: { display: 'flex', flexDirection: 'column', gap: 10 },
  memberRow: { display: 'flex', alignItems: 'center', gap: 10 },
  memberAvatar: { width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  memberName: { margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' },
  removeSmallBtn: { border: '1px solid var(--cream-border)', background: 'none', color: 'var(--charcoal-soft)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', flexShrink: 0 },
  confirmSmallBtn: { border: 'none', background: 'var(--danger)', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  cancelSmallBtn: { border: '1px solid var(--cream-border)', background: 'none', color: 'var(--charcoal-soft)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
  leaveBox: { marginTop: 12, background: 'var(--danger-light)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 },
  leaveText: { margin: 0, fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.5 },
  leaveBtn: { marginTop: 8, border: 'none', background: 'none', color: 'var(--danger)', fontSize: 13, textDecoration: 'underline', textAlign: 'left', cursor: 'pointer', padding: 0 },
  inviteBox: { background: 'var(--cream)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: '1px solid var(--accent-light)' },
  inviteCode: { margin: 0, fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.15em' },
  inviteExpiry: { margin: 0, fontSize: 11, color: 'var(--charcoal-soft)' },
  copyBtn: { border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, width: '100%' },
  newCodeBtn: { border: 'none', background: 'none', color: 'var(--charcoal-soft)', fontSize: 12, textDecoration: 'underline' },
  generateBtn: { border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, width: '100%' },
  success: { margin: 0, fontSize: 13, color: 'var(--sage-dark)', fontWeight: 500 },
  errorMsg: { margin: 0, fontSize: 13, color: 'var(--danger)' },
}
