import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Hash, Lock, Mail, User, Users } from 'lucide-react'
import { api } from '../lib/api'
import { hasUserSession } from '../lib/auth'
import { parseStoreApiError } from '../lib/store'
import AuthPageShell, {
  authCodeFieldClass,
  authFieldClass,
  authInputRowClass,
  authPrimaryButtonClass,
  authSecondaryLinkClass,
} from '../components/auth/AuthPageShell'
import LoadingSpinner from '../components/ui/LoadingSpinner'

type Role = 'HQ_STAFF' | 'STORE_MANAGER' | 'WAREHOUSE_STAFF' | 'STAFF'

type StorePreview = {
  id: number
  name: string
  storeCode: string
}

const STORE_ROLES: Role[] = ['STORE_MANAGER', 'STAFF']

function needsStoreCode(role: Role): boolean {
  return STORE_ROLES.includes(role)
}

export default function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('STORE_MANAGER')
  const [storeCode, setStoreCode] = useState('')
  const [storePreview, setStorePreview] = useState<StorePreview | null>(null)
  const [storeLookupLoading, setStoreLookupLoading] = useState(false)
  const [storeLookupError, setStoreLookupError] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (hasUserSession()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (!needsStoreCode(role)) {
      setStorePreview(null)
      setStoreLookupError(null)
      setStoreLookupLoading(false)
      return
    }

    const code = storeCode.trim()
    if (!code) {
      setStorePreview(null)
      setStoreLookupError(null)
      setStoreLookupLoading(false)
      return
    }

    setStoreLookupLoading(true)
    setStoreLookupError(null)

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { data } = await api.get<StorePreview>(`/api/stores/code/${encodeURIComponent(code)}`)
          setStorePreview(data ?? null)
          setStoreLookupError(null)
        } catch (err) {
          setStorePreview(null)
          if (isAxiosError(err) && err.response?.status === 404) {
            setStoreLookupError('Store code not found.')
          } else {
            setStoreLookupError('Could not verify store code.')
          }
        } finally {
          setStoreLookupLoading(false)
        }
      })()
    }, 400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [role, storeCode])

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim() || !name.trim()) return false
    if (needsStoreCode(role)) {
      if (!storeCode.trim()) return false
      if (storeLookupLoading || storeLookupError || !storePreview) return false
    }
    return true
  }, [email, password, name, role, storeCode, storeLookupLoading, storeLookupError, storePreview])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await api.post('/api/auth/signup', {
        email,
        password,
        name,
        role,
        storeCode: needsStoreCode(role) ? storeCode.trim() : null,
      })
      navigate('/login', { replace: true })
    } catch (err) {
      setError(parseStoreApiError(err, 'Sign up failed. Please check your input.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageShell>
      <form
        onSubmit={(e) => void handleSignup(e)}
        className="mt-10 w-full max-w-[340px] space-y-[14px]"
      >
        <label className={authInputRowClass}>
          <Mail className="h-[18px] w-[18px] shrink-0 text-white" strokeWidth={1.75} aria-hidden />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
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
            autoComplete="new-password"
            autoCapitalize="off"
            placeholder="PASSWORD"
            className={authFieldClass}
          />
        </label>

        <label className={authInputRowClass}>
          <User className="h-[18px] w-[18px] shrink-0 text-white" strokeWidth={1.75} aria-hidden />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="NAME"
            className={authFieldClass}
          />
        </label>

        <label className={authInputRowClass}>
          <Users className="h-[18px] w-[18px] shrink-0 text-white" strokeWidth={1.75} aria-hidden />
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role)
              setStoreCode('')
              setStorePreview(null)
              setStoreLookupError(null)
            }}
            className={`${authFieldClass} cursor-pointer appearance-none normal-case`}
          >
            <option value="HQ_STAFF" className="bg-[#3b63e8] text-white">
              HQ STAFF
            </option>
            <option value="STORE_MANAGER" className="bg-[#3b63e8] text-white">
              STORE MANAGER
            </option>
            <option value="STAFF" className="bg-[#3b63e8] text-white">
              STAFF
            </option>
            <option value="WAREHOUSE_STAFF" className="bg-[#3b63e8] text-white">
              WAREHOUSE STAFF
            </option>
          </select>
        </label>

        {needsStoreCode(role) ? (
          <div className="space-y-2">
            <label className={authInputRowClass}>
              <Hash className="h-[18px] w-[18px] shrink-0 text-white" strokeWidth={1.75} aria-hidden />
              <input
                value={storeCode}
                onChange={(e) => setStoreCode(e.target.value)}
                placeholder="STORE CODE"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className={authCodeFieldClass}
              />
            </label>
            {storeLookupLoading ? (
              <div className="flex justify-center py-1">
                <LoadingSpinner compact variant="light" label="매장 확인 중…" />
              </div>
            ) : storePreview ? (
              <p className="text-center text-[11px] text-emerald-200">
                Store: <span className="font-medium">{storePreview.name}</span>
              </p>
            ) : storeLookupError ? (
              <p className="text-center text-[11px] text-red-200">{storeLookupError}</p>
            ) : (
              <p className="text-center text-[11px] text-white/70">
                Enter the store code issued by HQ.
              </p>
            )}
          </div>
        ) : null}

        {error ? <p className="text-center text-xs text-red-200">{error}</p> : null}

        <button type="submit" disabled={!canSubmit || submitting} className={authPrimaryButtonClass}>
          {submitting ? '…' : 'SIGN UP'}
        </button>

        <Link to="/login" className={authSecondaryLinkClass}>
          LOG IN
        </Link>
      </form>
    </AuthPageShell>
  )
}
