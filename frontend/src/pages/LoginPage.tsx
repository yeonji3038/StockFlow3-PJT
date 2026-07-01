import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, User } from 'lucide-react'
import { api } from '../lib/api'
import { hasUserSession } from '../lib/auth'
import AuthPageShell, {
  authFieldClass,
  authInputRowClass,
  authPrimaryButtonClass,
  authSecondaryLinkClass,
} from '../components/auth/AuthPageShell'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (hasUserSession()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (submitting || !email.trim() || !password.trim()) return

    setSubmitting(true)
    setError('')
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
        rememberMe,
      })
      localStorage.setItem('role', response.data.role)
      localStorage.setItem('name', response.data.name)
      if (response.data.email) {
        localStorage.setItem('userEmail', String(response.data.email))
      } else {
        localStorage.removeItem('userEmail')
      }
      if (response.data.userId != null) {
        localStorage.setItem('userId', String(response.data.userId))
      } else {
        localStorage.removeItem('userId')
      }
      if (response.data.storeId != null) {
        localStorage.setItem('storeId', String(response.data.storeId))
      } else {
        localStorage.removeItem('storeId')
      }
      if (response.data.warehouseId != null) {
        localStorage.setItem('warehouseId', String(response.data.warehouseId))
      } else {
        localStorage.removeItem('warehouseId')
      }
      navigate('/dashboard')
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageShell>
      <form
        onSubmit={(e) => void handleLogin(e)}
        className="mt-10 w-full max-w-[340px] space-y-[14px]"
      >
        <label className={authInputRowClass}>
          <User className="h-[18px] w-[18px] shrink-0 text-white" strokeWidth={1.75} aria-hidden />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoCapitalize="off"
            placeholder="EMAIL"
            className={authFieldClass}
          />
        </label>

        <label className={authInputRowClass}>
          <Lock className="h-[18px] w-[18px] shrink-0 text-white" strokeWidth={1.75} aria-hidden />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoCapitalize="off"
            placeholder="PASSWORD"
            className={authFieldClass}
          />
        </label>

        {error ? <p className="text-center text-xs text-red-200">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className={authPrimaryButtonClass}
        >
          {submitting ? '…' : 'LOGIN'}
        </button>

        <Link to="/signup" className={authSecondaryLinkClass}>
          SIGN UP
        </Link>

        <div className="pt-1 text-center">
          <button type="button" className="text-[11px] text-white/95 transition hover:text-white">
            Forgot password?
          </button>
        </div>
      </form>
    </AuthPageShell>
  )
}
