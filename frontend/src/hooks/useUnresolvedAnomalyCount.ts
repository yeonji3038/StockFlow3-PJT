import { useCallback } from 'react'
import { useAnomalyAlertStore } from '../stores/anomalyAlertStore'

export function useUnresolvedAnomalyCount(enabled: boolean) {
  const count = useAnomalyAlertStore((s) => s.unresolvedCount)
  const pollUnresolved = useAnomalyAlertStore((s) => s.pollUnresolved)

  const refresh = useCallback(async () => {
    if (!enabled) return
    await pollUnresolved({ emitToasts: false })
  }, [enabled, pollUnresolved])

  return { count: enabled ? count : 0, refresh }
}
