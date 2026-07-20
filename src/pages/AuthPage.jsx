import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)

    const { error } =
      mode === 'signin' ? await signIn(email, password) : await signUp(email, password)

    setBusy(false)

    if (error) {
      setError(error.message || error.msg || JSON.stringify(error))
      return
    }

    if (mode === 'signup') {
      setInfo('Check your email to confirm your account, then sign in.')
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.logo}>The Store</h1>
        <p style={styles.tagline}>Your shared list, aisle by aisle.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              autoComplete="email"
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <p style={styles.error}>{error}</p>}
          {info && <p style={styles.info}>{info}</p>}

          <button type="submit" disabled={busy} style={styles.submitBtn}>
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
            setInfo('')
          }}
          style={styles.switchBtn}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--charcoal)',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: 'var(--chalk)',
    borderRadius: 16,
    padding: '40px 32px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 32,
    margin: 0,
    color: 'var(--charcoal)',
    letterSpacing: '-0.01em',
  },
  tagline: {
    margin: '8px 0 28px',
    color: 'var(--charcoal-soft)',
    fontSize: 14,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--charcoal-soft)',
  },
  input: {
    padding: '11px 12px',
    borderRadius: 8,
    border: '1px solid var(--line)',
    fontSize: 16,
    background: '#fff',
    color: 'var(--charcoal)',
  },
  submitBtn: {
    marginTop: 8,
    padding: '12px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--terracotta)',
    color: '#fff',
    fontWeight: 600,
    fontSize: 15,
  },
  switchBtn: {
    marginTop: 20,
    background: 'none',
    border: 'none',
    color: 'var(--terracotta-dark)',
    fontSize: 13,
    textDecoration: 'underline',
    padding: 0,
    width: '100%',
    textAlign: 'center',
  },
  error: {
    color: 'var(--danger)',
    fontSize: 13,
    margin: 0,
  },
  info: {
    color: 'var(--sage-dark)',
    fontSize: 13,
    margin: 0,
  },
}
