import { isAxiosError } from 'axios'
import type { ProductOptionItem, ProductOptionStatus, Size } from '../types/models'
import { erpInputClass } from './erpUi'

export type ProductOption = ProductOptionItem

export type { ProductOptionStatus, Size }

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

export function productOptionInputClass(invalid = false) {
  return erpInputClass(invalid)
}

export type OptionFormState = {
  color: string
  colorCode: string
  sizeId: string
  status: ProductOptionStatus
}

export const emptyOptionForm = (): OptionFormState => ({
  color: '',
  colorCode: '',
  sizeId: '',
  status: 'ON_SALE',
})

export function validateOptionForm(form: OptionFormState): string | null {
  if (!form.color.trim()) return '색상을 입력하세요.'
  if (!form.colorCode.trim()) return '색상 코드를 입력하세요.'
  const sizeId = Number(form.sizeId)
  if (!Number.isFinite(sizeId) || sizeId < 1) return '사이즈를 선택하세요.'
  return null
}

export function optionFormFromItem(option: ProductOption): OptionFormState {
  return {
    color: option.color,
    colorCode: option.colorCode,
    sizeId: String(option.sizeId),
    status: option.status,
  }
}

export function optionRequestBody(form: OptionFormState) {
  return {
    color: form.color.trim(),
    colorCode: form.colorCode.trim(),
    sizeId: Number(form.sizeId),
    status: form.status,
  }
}
