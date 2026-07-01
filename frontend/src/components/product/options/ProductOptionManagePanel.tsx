import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { api } from '../../../lib/api'
import SectionCard from '../../ui/SectionCard'
import LoadingSpinner from '../../ui/LoadingSpinner'
import Modal from '../../ui/Modal'
import {
  OPTION_SIZES,
  OPTION_STATUS_OPTIONS,
  optionStatusLabel,
  parseApiErrorMessage,
  productOptionInputClass,
  type ProductOption,
  type ProductOptionSize,
  type ProductOptionStatus,
} from '../../../lib/productOption'

type OptionFormState = {
  color: string
  size: ProductOptionSize
  skuCode: string
  status: ProductOptionStatus
}

const emptyForm: OptionFormState = {
  color: '',
  size: 'M',
  skuCode: '',
  status: 'ON_SALE',
}

type Props = {
  productId: number
  canMutate: boolean
}

function inputClass() {
  return productOptionInputClass()
}

function OptionFormFields({
  form,
  onChange,
}: {
  form: OptionFormState
  onChange: (next: OptionFormState) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">색상</span>
        <input
          value={form.color}
          onChange={(e) => onChange({ ...form, color: e.target.value })}
          className={inputClass()}
          placeholder="예: RED"
          maxLength={50}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">사이즈</span>
        <select
          value={form.size}
          onChange={(e) => onChange({ ...form, size: e.target.value as ProductOptionSize })}
          className={inputClass()}
        >
          {OPTION_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">상품코드</span>
        <input
          value={form.skuCode}
          onChange={(e) => onChange({ ...form, skuCode: e.target.value })}
          className={inputClass()}
          placeholder="예: SKU-001"
          maxLength={100}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">상태</span>
        <select
          value={form.status}
          onChange={(e) => onChange({ ...form, status: e.target.value as ProductOptionStatus })}
          className={inputClass()}
        >
          {OPTION_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default function ProductOptionManagePanel({ productId, canMutate }: Props) {
  const [options, setOptions] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addForm, setAddForm] = useState<OptionFormState>(emptyForm)
  const [adding, setAdding] = useState(false)

  const [editing, setEditing] = useState<ProductOption | null>(null)
  const [editForm, setEditForm] = useState<OptionFormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadOptions = useCallback(async () => {
    if (!Number.isFinite(productId) || productId < 1) {
      setOptions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<ProductOption[]>(`/api/products/${productId}/options`)
      setOptions(Array.isArray(data) ? data : [])
    } catch {
      setError('옵션 목록을 불러오지 못했습니다.')
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  const validateForm = (form: OptionFormState): string | null => {
    if (!form.color.trim()) return '색상을 입력하세요.'
    if (!form.skuCode.trim()) return '상품코드를 입력하세요.'
    return null
  }

  const addOption = async () => {
    if (!canMutate || adding) return
    const validation = validateForm(addForm)
    if (validation) {
      setError(validation)
      return
    }
    setAdding(true)
    setError(null)
    try {
      await api.post(`/api/products/${productId}/options`, {
        color: addForm.color.trim(),
        size: addForm.size,
        skuCode: addForm.skuCode.trim(),
        status: addForm.status,
      })
      setAddForm(emptyForm)
      await loadOptions()
    } catch (err) {
      setError(parseApiErrorMessage(err, '옵션 추가에 실패했습니다.'))
    } finally {
      setAdding(false)
    }
  }

  const openEdit = (option: ProductOption) => {
    setEditing(option)
    setEditForm({
      color: option.color,
      size: option.size,
      skuCode: option.skuCode,
      status: option.status,
    })
  }

  const saveEdit = async () => {
    if (!canMutate || !editing || saving) return
    const validation = validateForm(editForm)
    if (validation) {
      setError(validation)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.put(`/api/products/${productId}/options/${editing.id}`, {
        color: editForm.color.trim(),
        size: editForm.size,
        skuCode: editForm.skuCode.trim(),
        status: editForm.status,
      })
      setEditing(null)
      await loadOptions()
    } catch (err) {
      setError(parseApiErrorMessage(err, '옵션 수정에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const deleteOption = async (option: ProductOption) => {
    if (!canMutate || deletingId != null) return
    if (!confirm(`SKU 「${option.skuCode}」 옵션을 삭제할까요?`)) return
    setError(null)
    setDeletingId(option.id)
    try {
      await api.delete(`/api/products/${productId}/options/${option.id}`)
      await loadOptions()
    } catch (err) {
      setError(parseApiErrorMessage(err, '옵션 삭제에 실패했습니다.'))
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <>
      <SectionCard title="옵션 목록">
        <div className="space-y-4">
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="overflow-x-auto rounded-md border border-slate-100">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-3 py-2.5">색상</th>
                  <th className="px-3 py-2.5">사이즈</th>
                  <th className="px-3 py-2.5">상품코드</th>
                  <th className="px-3 py-2.5">상태</th>
                  {canMutate ? <th className="px-3 py-2.5 text-right">관리</th> : null}
                </tr>
              </thead>
              <tbody>
                {options.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canMutate ? 5 : 4}
                      className="px-3 py-10 text-center text-slate-400"
                    >
                      등록된 옵션이 없습니다.
                    </td>
                  </tr>
                ) : (
                  options.map((option) => (
                    <tr
                      key={option.id}
                      className="border-b border-slate-100 even:bg-slate-50/40 hover:bg-blue-50/50"
                    >
                      <td className="px-3 py-2 font-medium text-slate-900">{option.color}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{option.size}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-800">{option.skuCode}</td>
                      <td className="px-3 py-2 text-slate-700">{optionStatusLabel(option.status)}</td>
                      {canMutate ? (
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(option)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteOption(option)}
                              disabled={deletingId === option.id}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 shadow-sm hover:bg-rose-100 disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              {deletingId === option.id ? '삭제 중…' : '삭제'}
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {canMutate ? (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-600">새 옵션 추가 (색상 · 사이즈 · 상품코드)</p>
              <OptionFormFields form={addForm} onChange={setAddForm} />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void addOption()}
                  disabled={adding}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {adding ? '추가 중…' : '옵션 추가'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <Modal
        title="옵션 수정"
        description={editing ? `SKU: ${editing.skuCode}` : undefined}
        open={editing != null}
        onClose={() => setEditing(null)}
      >
        <div className="space-y-4">
          <OptionFormFields form={editForm} onChange={setEditForm} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
