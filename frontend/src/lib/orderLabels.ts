import type { Order } from '../types/models'

export function orderStatusLabel(status: string): string {
  switch (status) {
    case 'REQUESTED':
      return '요청'
    case 'APPROVED':
      return '승인'
    case 'REJECTED':
      return '반려'
    case 'SHIPPED':
      return '출고'
    case 'RECEIVED':
      return '입고완료'
    case 'CANCELLED':
      return '취소'
    case 'COMPLETED':
      return '완료'
    default:
      return status
  }
}

/** 상태 코드·API statusDescription(코드 문자열) 모두 한글로 통일해 표시합니다. */
export function orderStatusDisplayText(order: {
  status: string
  statusDescription?: string | null
}): string {
  const d = order.statusDescription?.trim()
  if (d) {
    const codeKey = d.toUpperCase().replace(/[\s-]+/g, '_')
    const fromDesc = orderStatusLabel(codeKey)
    if (fromDesc !== codeKey) return fromDesc
    return d
  }
  return orderStatusLabel(order.status)
}

export function formatOrderApprovedAt(order: Order): string {
  const raw = order.approvedAt ?? order.updatedAt
  if (!raw) return '—'
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ko-KR')
}

export function filterApprovedOrders(orders: Order[]): Order[] {
  return orders
    .filter((o) => o.status === 'APPROVED')
    .sort((a, b) => {
      const ta = new Date(a.approvedAt ?? a.updatedAt ?? a.createdAt ?? 0).getTime()
      const tb = new Date(b.approvedAt ?? b.updatedAt ?? b.createdAt ?? 0).getTime()
      return ta - tb
    })
}

const ORDER_STATUS_SORT: Record<string, number> = {
  REQUESTED: 0,
  APPROVED: 1,
  SHIPPED: 2,
  RECEIVED: 3,
  REJECTED: 4,
  CANCELLED: 5,
}

/** 발주 목록 정렬: 처리 필요 건(REQUESTED → APPROVED → SHIPPED)이 먼저 */
export function orderStatusSortKey(status: string): number {
  return ORDER_STATUS_SORT[status] ?? 99
}

export function sortOrdersByStatusPriority(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const sa = orderStatusSortKey(a.status)
    const sb = orderStatusSortKey(b.status)
    if (sa !== sb) return sa - sb
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0
    return tb - ta
  })
}

export function canStoreReceiveOrder(
  order: Order,
  role: string | null,
  myStoreId: number | null,
): boolean {
  if (role !== 'STORE_MANAGER' || order.status !== 'SHIPPED') return false
  if (myStoreId == null) return false
  return order.storeId === myStoreId
}

