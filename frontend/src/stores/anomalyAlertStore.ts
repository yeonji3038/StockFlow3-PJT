import { create } from 'zustand'
import { api } from '../lib/api'
import type { AnomalyAlert } from '../types/models'

export interface AnomalyToastItem {
  toastId: string
  alertId: number
  storeName: string
  skuCode: string | null
  productName: string | null
  reason: string | null
  anomalyScore: number
}

type AnomalyAlertState = {
  unresolvedCount: number
  toasts: AnomalyToastItem[]
  seenAlertIds: Set<number> | null
  pushToast: (item: Omit<AnomalyToastItem, 'toastId'>) => void
  removeToast: (toastId: string) => void
  reset: () => void
  pollUnresolved: (options?: { emitToasts?: boolean }) => Promise<void>
}

export const useAnomalyAlertStore = create<AnomalyAlertState>((set, get) => ({
  unresolvedCount: 0,
  toasts: [],
  seenAlertIds: null,

  pushToast: (item) =>
    set((s) => ({
      toasts: [...s.toasts, { ...item, toastId: crypto.randomUUID() }],
    })),

  removeToast: (toastId) =>
    set((s) => ({
      toasts: s.toasts.filter((t) => t.toastId !== toastId),
    })),

  reset: () =>
    set({
      unresolvedCount: 0,
      toasts: [],
      seenAlertIds: null,
    }),

  pollUnresolved: async (options = {}) => {
    const { emitToasts = true } = options
    try {
      const { data } = await api.get<AnomalyAlert[]>('/api/anomaly-alerts', {
        params: { unresolvedOnly: true },
      })
      const alerts = Array.isArray(data) ? data : []
      set({ unresolvedCount: alerts.length })

      if (!emitToasts) return

      const { seenAlertIds, pushToast } = get()
      if (seenAlertIds === null) {
        set({ seenAlertIds: new Set(alerts.map((a) => a.id)) })
        return
      }

      const nextSeen = new Set(seenAlertIds)
      for (const alert of alerts) {
        if (nextSeen.has(alert.id)) continue
        nextSeen.add(alert.id)
        pushToast({
          alertId: alert.id,
          storeName: alert.storeName ?? `매장 #${alert.storeId}`,
          skuCode: alert.skuCode,
          productName: alert.productName,
          reason: alert.reason,
          anomalyScore: alert.anomalyScore,
        })
      }
      set({ seenAlertIds: nextSeen })
    } catch {
      set({ unresolvedCount: 0 })
    }
  },
}))
