import { isAxiosError } from 'axios'

export type StoreType = 'HQ' | 'DEPARTMENT' | 'OUTLET'

export type StoreListItem = {
  id: number
  name: string
  location: string | null
  storeType: StoreType
  storeCode: string
  phone: string | null
  createdAt: string | null
}

export type StoreUserItem = {
  id: number
  name: string
  email: string
  role: string
}

export const STORE_TYPE_OPTIONS: { value: StoreType; label: string }[] = [
  { value: 'HQ', label: '본사' },
  { value: 'DEPARTMENT', label: '백화점' },
  { value: 'OUTLET', label: '아울렛' },
]

export function storeTypeLabel(type: StoreType | string): string {
  return STORE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

export function userRoleLabel(role: string): string {
  switch (role) {
    case 'HQ_STAFF':
      return '본사'
    case 'STORE_MANAGER':
      return '매장 관리자'
    case 'WAREHOUSE_STAFF':
      return '창고 담당'
    case 'STAFF':
      return '직원'
    default:
      return role
  }
}

export function storeInputClass() {
  return 'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
}

export function parseStoreApiError(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const d = err.response?.data as { message?: string } | string | undefined
    if (typeof d === 'string') return d
    if (d && typeof d === 'object' && typeof d.message === 'string') return d.message
  }
  return fallback
}
