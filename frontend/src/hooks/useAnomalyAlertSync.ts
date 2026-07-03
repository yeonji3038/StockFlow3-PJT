import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAnomalyAlertStore } from '../stores/anomalyAlertStore'

const POLL_MS = 60_000

export function useAnomalyAlertSync(enabled: boolean) {
  const { pathname } = useLocation()
  const pollUnresolved = useAnomalyAlertStore((s) => s.pollUnresolved)
  const reset = useAnomalyAlertStore((s) => s.reset)

  useEffect(() => {
    if (!enabled) {
      reset()
      return
    }
    void pollUnresolved()
  }, [enabled, pollUnresolved, pathname, reset])

  useEffect(() => {
    if (!enabled) return undefined
    const id = window.setInterval(() => {
      void pollUnresolved()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [enabled, pollUnresolved])
}
