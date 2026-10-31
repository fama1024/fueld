import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { login } from './authApi'
import Button from '@/components/Button'
import Field from '@/components/Field'

export default function LoginPage() {
  const { login: setToken } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await login(email, password)
      setToken(res.data.token)
      navigate('/')
    } catch {
      setError('E-Mail oder Passwort stimmt nicht.')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div>
          <h1 className="text-hero font-semibold tracking-[-0.02em] text-ink">Fueld</h1>
          <p className="mt-1 text-body text-ink-muted">Anmelden</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="E-Mail" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Field label="Passwort" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="text-caption text-danger">{error}</p>}
          <Button type="submit" block>Anmelden</Button>
        </form>

        <p className="text-caption text-ink-muted">
          Noch kein Konto?{' '}
          <Link to="/register" className="font-semibold text-lime">Registrieren</Link>
        </p>
      </div>
    </main>
  )
}
