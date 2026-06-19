import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { hasUserSession, trySilentRefresh } from '../../lib/auth'
import LoadingSpinner from '../ui/LoadingSpinner'
import AppShell from './AppShell'

export default function AuthLayout() {
  const [checking, setChecking] = useState(!hasUserSession())
  const [allowed, setAllowed] = useState(hasUserSession())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const ok = await trySilentRefresh()
      if (!cancelled) {
        setAllowed(ok)
        setChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (checking) {
    return <LoadingSpinner />
  }
  if (!allowed) {
    return <Navigate to="/login" replace />
  }
  return <AppShell />
}
