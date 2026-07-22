import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setInfo(''); setBusy(true)
    const { error } = mode === 'signin' ? await signIn(email, password) : await signUp(email, password)
    setBusy(false)
    if (error) { setError(error.message || JSON.stringify(error)); return }
    if (mode === 'signup') setInfo('Account created! You can sign in now.')
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.logo}>TheStore</h1>
        <p style={s.tagline}>Your list, aisle by aisle.</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>
            Email
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              style={s.input} autoComplete="email"
            />
          </label>
          <label style={s.label}>
            Password
            <div style={s.passwordWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                required minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...s.input, flex: 1, borderRight: 'none', borderRadius: '8px 0 0 8px' }}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                style={s.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>
          {error && <p style={s.error}>{error}</p>}
          {info && <p style={s.info}>{info}</p>}
          <button type="submit" disabled={busy} style={s.submit}>
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}
          style={s.toggle}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--nav-bg)', padding: 24 },
  card: { width: '100%', maxWidth: 380, background: 'var(--cream)', borderRadius: 16, padding: '40px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' },
  logo: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 34, margin: 0, color: 'var(--charcoal)', letterSpacing: '-0.02em' },
  tagline: { margin: '6px 0 28px', color: 'var(--charcoal-soft)', fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--charcoal-soft)' },
  input: { padding: '11px 12px', borderRadius: 8, border: '1px solid var(--cream-border)', fontSize: 15, background: '#fff', color: 'var(--charcoal)' },
  passwordWrap: { display: 'flex', alignItems: 'stretch' },
  eyeBtn: { padding: '0 12px', border: '1px solid var(--cream-border)', borderLeft: 'none', borderRadius: '0 8px 8px 0', background: '#fff', fontSize: 16, cursor: 'pointer' },
  submit: { marginTop: 8, padding: 12, borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: 15 },
  toggle: { marginTop: 20, background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, textDecoration: 'underline', width: '100%', textAlign: 'center' },
  error: { color: 'var(--danger)', fontSize: 13, margin: 0 },
  info: { color: 'var(--sage-dark)', fontSize: 13, margin: 0 },
}
