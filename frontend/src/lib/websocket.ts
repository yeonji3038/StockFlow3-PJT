import { useEffect, useRef } from 'react'
import SockJS from 'sockjs-client'
import { Client, type IMessage } from '@stomp/stompjs'
import { useStockStore, type LowStockAlert } from '../stores/stockStore'
import { useAnomalyAlertStore } from '../stores/anomalyAlertStore'
import { getRole } from './auth'
import type { AnomalyAlert } from '../types/models'

const WS_URL = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}/ws`

const TOPICS = {
  allocations: '/topic/allocations',
  orders: '/topic/orders',
  lowStock: '/topic/low-stock',
  dashboard: '/topic/dashboard',
  anomalyAlerts: '/topic/anomaly-alerts',
} as const

function parseJsonMessage(message: IMessage): unknown {
  const body = message.body?.trim()
  if (!body) return null
  try {
    return JSON.parse(body) as unknown
  } catch {
    return null
  }
}

/** 백엔드 페이로드(camelCase / snake_case)에서 저재고 알림 항목 추출 */
function parseLowStockItems(raw: unknown): Omit<LowStockAlert, 'id'>[] {
  if (raw == null) return []
  let payload: unknown = raw
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o.alerts)) payload = o.alerts
    else if (Array.isArray(o.data)) payload = o.data
    else if (Array.isArray(o.items)) payload = o.items
  }
  const list = Array.isArray(payload) ? payload : [payload]
  const out: Omit<LowStockAlert, 'id'>[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const skuCode = String(o.skuCode ?? o.sku_code ?? o.sku ?? '').trim()
    const warehouseName = String(o.warehouseName ?? o.warehouse_name ?? '').trim()
    const q = o.quantity ?? o.qty
    const quantity = typeof q === 'number' ? q : Number(q)
    if (!skuCode || !warehouseName || Number.isNaN(quantity)) continue
    out.push({ skuCode, warehouseName, quantity })
  }
  return out
}

function numField(o: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const v = o[key]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

function strField(o: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = o[key]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
  }
  return null
}

function boolField(o: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const v = o[key]
    if (typeof v === 'boolean') return v
    if (v === 'true' || v === 1) return true
    if (v === 'false' || v === 0) return false
  }
  return false
}

/** 백엔드 페이로드(camelCase / snake_case)에서 이상탐지 알림 항목 추출 */
function parseOneAnomalyAlert(raw: unknown): AnomalyAlert | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = numField(o, 'id')
  const storeId = numField(o, 'storeId', 'store_id')
  const productOptionId = numField(o, 'productOptionId', 'product_option_id')
  const quantity = numField(o, 'quantity', 'qty')
  const anomalyScore = numField(o, 'anomalyScore', 'anomaly_score')
  if (id == null || storeId == null || productOptionId == null || quantity == null || anomalyScore == null) {
    return null
  }
  return {
    id,
    storeId,
    storeName: strField(o, 'storeName', 'store_name'),
    productOptionId,
    skuCode: strField(o, 'skuCode', 'sku_code', 'sku'),
    productName: strField(o, 'productName', 'product_name'),
    quantity,
    reason: strField(o, 'reason'),
    eventDate: strField(o, 'eventDate', 'event_date') ?? '',
    anomalyScore,
    resolved: boolField(o, 'resolved'),
    createdAt: strField(o, 'createdAt', 'created_at') ?? '',
  }
}

function parseAnomalyAlerts(raw: unknown): AnomalyAlert[] {
  if (raw == null) return []
  let payload: unknown = raw
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    if (Array.isArray(o.alerts)) payload = o.alerts
    else if (Array.isArray(o.data)) payload = o.data
    else if (Array.isArray(o.items)) payload = o.items
    else {
      const one = parseOneAnomalyAlert(o)
      return one ? [one] : []
    }
  }
  const list = Array.isArray(payload) ? payload : [payload]
  const out: AnomalyAlert[] = []
  for (const item of list) {
    const parsed = parseOneAnomalyAlert(item)
    if (parsed) out.push(parsed)
  }
  return out
}

/**
 * STOMP + SockJS 로 `/ws`에 연결하고 구독 토픽 메시지마다 스토어 콜백을 실행합니다.
 * 언마운트 시 연결을 끊습니다.
 */
export function useWebSocket(): void {
  const bumpDashboardRefresh = useStockStore((s) => s.bumpDashboardRefresh)
  const bumpAllocationRefresh = useStockStore((s) => s.bumpAllocationRefresh)
  const bumpOrderRefresh = useStockStore((s) => s.bumpOrderRefresh)
  const pushLowStockAlert = useStockStore((s) => s.pushLowStockAlert)
  const handleWsAnomalyAlert = useAnomalyAlertStore((s) => s.handleWsAnomalyAlert)

  const actionsRef = useRef({
    bumpDashboardRefresh,
    bumpAllocationRefresh,
    bumpOrderRefresh,
    pushLowStockAlert,
    handleWsAnomalyAlert,
  })
  actionsRef.current = {
    bumpDashboardRefresh,
    bumpAllocationRefresh,
    bumpOrderRefresh,
    pushLowStockAlert,
    handleWsAnomalyAlert,
  }

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL) as unknown as WebSocket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        const { bumpDashboardRefresh, bumpAllocationRefresh, bumpOrderRefresh, pushLowStockAlert, handleWsAnomalyAlert } =
          actionsRef.current

        client.subscribe(TOPICS.dashboard, () => {
          bumpDashboardRefresh()
        })

        client.subscribe(TOPICS.allocations, () => {
          bumpAllocationRefresh()
        })

        client.subscribe(TOPICS.orders, () => {
          bumpOrderRefresh()
        })

        client.subscribe(TOPICS.lowStock, (message: IMessage) => {
          const parsed = parseJsonMessage(message)
          const items = parseLowStockItems(parsed)
          for (const item of items) {
            pushLowStockAlert(item)
          }
        })

        client.subscribe(TOPICS.anomalyAlerts, (message: IMessage) => {
          if (getRole() !== 'HQ_STAFF') return
          const parsed = parseJsonMessage(message)
          const alerts = parseAnomalyAlerts(parsed)
          for (const alert of alerts) {
            handleWsAnomalyAlert(alert)
          }
          if (alerts.length > 0) {
            bumpDashboardRefresh()
          }
        })
      },
    })

    client.activate()

    return () => {
      client.deactivate()
    }
  }, [])
}
