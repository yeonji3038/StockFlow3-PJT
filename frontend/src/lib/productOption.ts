import { isAxiosError } from 'axios'

export type ProductOptionSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
export type ProductOptionStatus = 'ON_SALE' | 'DISCONTINUED'

export type ProductOption = {
  id: number
  productId: number
  productName: string
  color: string
  size: ProductOptionSize
  skuCode: string
  status: ProductOptionStatus
}

export const OPTION_SIZES: ProductOptionSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export const OPTION_STATUS_OPTIONS: { value: ProductOptionStatus; label: string }[] = [
  { value: 'ON_SALE', label: '판매중' },
  { value: 'DISCONTINUED', label: '단종' },
]

export function optionStatusLabel(status: ProductOptionStatus): string {
  return OPTION_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export function parseApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const d = err.response?.data as { message?: string } | string | undefined
    if (typeof d === 'string') return d
    if (d && typeof d === 'object' && typeof d.message === 'string') return d.message
  }
  return fallback
}

function inputClass() {
  return 'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
}

export { inputClass as productOptionInputClass }
