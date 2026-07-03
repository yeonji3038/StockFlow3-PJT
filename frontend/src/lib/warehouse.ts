import { isAxiosError } from 'axios'
import { erpInputClass } from './erpUi'

export type WarehouseListItem = {
  id: number
  name: string
  location: string | null
  managerId: number | null
  managerName: string | null
}

export type WarehouseStaffUser = {
  id: number
  name: string
  email: string
}

export function warehouseInputClass(invalid = false) {
  return erpInputClass(invalid)
}

export function parseWarehouseApiError(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const d = err.response?.data as { message?: string } | string | undefined
    if (typeof d === 'string') return d
    if (d && typeof d === 'object' && typeof d.message === 'string') return d.message
  }
  return fallback
}
