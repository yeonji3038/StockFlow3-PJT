import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Check, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { api } from '../lib/api'
import { hasUserSession } from '../lib/auth'
import { parseStoreApiError } from '../lib/store'
import {
  isEmailFormatValid,
  isPasswordValid,
  PASSWORD_RULES,
} from '../lib/signupValidation'
import SignupPageShell, {
  signupInputClass,
  signupPrimaryButtonClass,
  signupSelectClass,
} from '../components/auth/SignupPageShell'
import LoadingSpinner from '../components/ui/LoadingSpinner'

type Role = 'HQ_STAFF' | 'STORE_MANAGER' | 'WAREHOUSE_STAFF' | 'STAFF'

type StorePreview = {
  id: number
  name: string
  storeCode: string
}

const STORE_ROLES: Role[] = ['STORE_MANAGER', 'STAFF']

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'HQ_STAFF', label: '본사(HQ)' },
  { value: 'STORE_MANAGER', label: '매장 관리자' },
  { value: 'STAFF', label: '매장 직원' },
  { value: 'WAREHOUSE_STAFF', label: '창고 담당자' },
]

function needsStoreCode(role: Role): boolean {
  return STORE_ROLES.includes(role)
}

function SignupField({
  label,
  required,
  children,
  className = '',
}: {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={['space-y-2', className].filter(Boolean).join(' ')}>
      <span className="text-sm font-semibold text-slate-900">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </span>
      {children}
    </div>
  )
}

function ValidationChip({ label, met }: { label: string; met: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
        met ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400',
      ].join(' ')}
    >
      {met ? <Check className="h-3 w-3 shrink-0" aria-hidden /> : null}
      {label}
    </span>
  )
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  autoComplete: string
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={[signupInputClass, 'pr-10'].join(' ')}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function AgreementRow({
  checked,
  onChange,
  label,
  showChevron = false,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  showChevron?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-sky-200"
      />
      <span className="min-w-0 flex-1 text-sm text-slate-700">{label}</span>
      {showChevron ? <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden /> : null}
    </label>
  )
}

export default function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('STORE_MANAGER')
  const [storeCode, setStoreCode] = useState('')
  const [storePreview, setStorePreview] = useState<StorePreview | null>(null)
  const [storeLookupLoading, setStoreLookupLoading] = useState(false)
  const [storeLookupError, setStoreLookupError] = useState<string | null>(null)
  const [agreeAll, setAgreeAll] = useState(false)
  const [agreeAge, setAgreeAge] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const passwordsMatch = password.length > 0 && password === confirmPassword
  const passwordReady = isPasswordValid(password)
  const emailReady = isEmailFormatValid(email)

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
            setStoreLookupError('매장 코드를 찾을 수 없습니다.')
          } else {
            setStoreLookupError('매장 코드를 확인하지 못했습니다.')
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

  useEffect(() => {
    setAgreeAll(agreeAge && agreeTerms)
  }, [agreeAge, agreeTerms])

  const canSubmit = useMemo(() => {
    if (!emailReady || !passwordReady || !passwordsMatch || !name.trim()) return false
    if (!agreeAge || !agreeTerms) return false
    if (needsStoreCode(role)) {
      if (!storeCode.trim()) return false
      if (storeLookupLoading || storeLookupError || !storePreview) return false
    }
    return true
  }, [
    emailReady,
    passwordReady,
    passwordsMatch,
    name,
    agreeAge,
    agreeTerms,
    role,
    storeCode,
    storeLookupLoading,
    storeLookupError,
    storePreview,
  ])

  const handleAgreeAll = (checked: boolean) => {
    setAgreeAll(checked)
    setAgreeAge(checked)
    setAgreeTerms(checked)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await api.post('/api/auth/signup', {
        email: email.trim(),
        password,
        name: name.trim(),
        role,
        storeCode: needsStoreCode(role) ? storeCode.trim() : null,
      })
      navigate('/login', { replace: true })
    } catch (err) {
      setError(parseStoreApiError(err, '회원가입에 실패했습니다. 입력값을 확인해 주세요.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SignupPageShell>
      <form onSubmit={(e) => void handleSignup(e)} className="space-y-6">
        <SignupField label="이메일 주소" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="off"
            placeholder="example@email.com"
            className={signupInputClass}
          />
          {email && !emailReady ? (
            <p className="text-xs text-rose-600">올바른 이메일 형식을 입력해 주세요.</p>
          ) : null}
        </SignupField>

        <SignupField label="비밀번호" required>
          <PasswordInput
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="비밀번호를 입력하세요"
          />
          <div className="flex flex-wrap gap-1.5">
            {PASSWORD_RULES.map((rule) => (
              <ValidationChip
                key={rule.id}
                label={rule.label}
                met={password.length > 0 && rule.test(password)}
              />
            ))}
          </div>
        </SignupField>

        <SignupField label="비밀번호 확인" required>
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            placeholder="비밀번호를 다시 입력하세요"
          />
          {confirmPassword ? (
            <span
              className={[
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
                passwordsMatch ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
              ].join(' ')}
            >
              {passwordsMatch ? <Check className="h-3 w-3 shrink-0" aria-hidden /> : null}
              {passwordsMatch ? '비밀번호 일치' : '비밀번호가 일치하지 않습니다'}
            </span>
          ) : null}
        </SignupField>

        <SignupField label="이름 (실명)" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="실명을 입력하세요"
            className={signupInputClass}
          />
        </SignupField>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-slate-900">
            계정 정보<span className="ml-0.5 text-rose-500">*</span>
          </span>
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
            <div
              className={[
                'grid gap-4',
                needsStoreCode(role) ? 'sm:grid-cols-2' : 'grid-cols-1',
              ].join(' ')}
            >
              <SignupField label="역할" required>
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value as Role)
                    setStoreCode('')
                    setStorePreview(null)
                    setStoreLookupError(null)
                  }}
                  className={signupSelectClass}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </SignupField>

              {needsStoreCode(role) ? (
                <SignupField label="매장 코드" required>
                  <input
                    value={storeCode}
                    onChange={(e) => setStoreCode(e.target.value)}
                    placeholder="본사에서 발급한 코드"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className={[signupInputClass, 'font-mono'].join(' ')}
                  />
                </SignupField>
              ) : null}
            </div>

            {needsStoreCode(role) ? (
              <div className="mt-3 text-xs">
                {storeLookupLoading ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <LoadingSpinner compact hideLabel />
                    매장 확인 중…
                  </div>
                ) : storePreview ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                    <Check className="h-3 w-3" aria-hidden />
                    {storePreview.name}
                  </span>
                ) : storeLookupError ? (
                  <p className="text-rose-600">{storeLookupError}</p>
                ) : (
                  <p className="text-slate-500">매장 관리자 가입 시 본사에서 발급한 매장 코드를 입력하세요.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-1 border-t border-slate-100 pt-2">
          <AgreementRow
            checked={agreeAll}
            onChange={handleAgreeAll}
            label="필수 이용약관 모두 동의"
          />
          <AgreementRow checked={agreeAge} onChange={setAgreeAge} label="만 14세 이상 확인" />
          <AgreementRow
            checked={agreeTerms}
            onChange={setAgreeTerms}
            label="StockFlow 이용약관 동의"
            showChevron
          />
          <p className="pt-2 text-[11px] leading-relaxed text-slate-400">
            회원가입 시 개인정보는 관련 법령에 따라 안전하게 관리됩니다.
          </p>
        </div>

        {error ? <p className="text-center text-sm text-rose-600">{error}</p> : null}

        <button type="submit" disabled={!canSubmit || submitting} className={signupPrimaryButtonClass}>
          {submitting ? '가입 처리 중…' : '가입 완료'}
        </button>
      </form>
    </SignupPageShell>
  )
}
