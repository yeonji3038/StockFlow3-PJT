import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '../../../lib/api'
import LoadingSpinner from '../../ui/LoadingSpinner'
import Modal from '../../ui/Modal'
import {
  ErpDataTable,
  ErpFooterBar,
  ErpFooterPrimary,
  ErpFormTable,
  ErpGridWrap,
  ErpPrimaryButton,
  ErpSecondaryButton,
  ErpToolbar,
} from '../../ui/erp/ErpLayout'
import { erpGridCellClass, erpGridHeadClass } from '../../../lib/erpUi'
import { defaultSizeId, useSizes } from '../../../hooks/useSizes'
import {
  emptyOptionForm,
  optionFormFromItem,
  optionRequestBody,
  optionStatusLabel,
  parseApiErrorMessage,
  validateOptionForm,
  type OptionFormState,
  type ProductOption,
} from '../../../lib/productOption'
import OptionFormFields from './OptionFormFields'

type Props = {
  productId: number
  canMutate: boolean
}

export default function ProductOptionManagePanel({ productId, canMutate }: Props) {
  const { sizes, loading: sizesLoading, error: sizesError, reload: reloadSizes } = useSizes()
  const [options, setOptions] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addForm, setAddForm] = useState<OptionFormState>(emptyOptionForm())
  const [adding, setAdding] = useState(false)

  const [editing, setEditing] = useState<ProductOption | null>(null)
  const [editForm, setEditForm] = useState<OptionFormState>(emptyOptionForm())
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

  useEffect(() => {
    if (sizes.length > 0 && !addForm.sizeId) {
      setAddForm((prev) => ({ ...prev, sizeId: defaultSizeId(sizes) }))
    }
  }, [sizes, addForm.sizeId])

  const addOption = async () => {
    if (!canMutate || adding) return
    const validation = validateOptionForm(addForm)
    if (validation) {
      setError(validation)
      return
    }
    setAdding(true)
    setError(null)
    try {
      await api.post(`/api/products/${productId}/options`, optionRequestBody(addForm))
      setAddForm({ ...emptyOptionForm(), sizeId: defaultSizeId(sizes) })
      await loadOptions()
    } catch (err) {
      setError(parseApiErrorMessage(err, '옵션 추가에 실패했습니다.'))
    } finally {
      setAdding(false)
    }
  }

  const openEdit = (option: ProductOption) => {
    setEditing(option)
    setEditForm(optionFormFromItem(option))
  }

  const saveEdit = async () => {
    if (!canMutate || !editing || saving) return
    const validation = validateOptionForm(editForm)
    if (validation) {
      setError(validation)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.put(`/api/products/${productId}/options/${editing.id}`, optionRequestBody(editForm))
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

  if (loading || sizesLoading) {
    return (
      <div className="py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      <ErpToolbar>
        <span className="text-xs font-semibold text-slate-700">옵션 목록</span>
      </ErpToolbar>

      {error || sizesError ? (
        <div className="border-b border-slate-300 px-2 py-1.5 text-xs text-rose-600">
          {error ?? sizesError}
        </div>
      ) : null}

      <ErpGridWrap maxHeight="max-h-[min(20rem,calc(100vh-24rem))]">
        <ErpDataTable minWidth="640px">
          <thead>
            <tr>
              <th className={erpGridHeadClass()}>색상</th>
              <th className={erpGridHeadClass()}>색상코드</th>
              <th className={erpGridHeadClass()}>사이즈</th>
              <th className={erpGridHeadClass()}>SKU</th>
              <th className={erpGridHeadClass()}>상태</th>
              {canMutate ? (
                <th className={[erpGridHeadClass(), 'w-10 text-center'].join(' ')}>
                  <span className="sr-only">삭제</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {options.length === 0 ? (
              <tr>
                <td
                  colSpan={canMutate ? 6 : 5}
                  className={erpGridCellClass('py-12 text-center text-slate-400')}
                >
                  등록된 옵션이 없습니다.
                </td>
              </tr>
            ) : (
              options.map((option) => (
                <tr
                  key={option.id}
                  onClick={() => canMutate && openEdit(option)}
                  className={canMutate ? 'cursor-pointer hover:bg-blue-50/60' : undefined}
                >
                  <td className={erpGridCellClass('font-medium')}>{option.color}</td>
                  <td className={erpGridCellClass('font-mono text-[11px]')}>{option.colorCode}</td>
                  <td className={erpGridCellClass('font-medium')}>{option.sizeName}</td>
                  <td className={erpGridCellClass('font-mono text-[11px]')}>{option.skuCode}</td>
                  <td className={erpGridCellClass()}>{optionStatusLabel(option.status)}</td>
                  {canMutate ? (
                    <td className={erpGridCellClass('text-center')}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void deleteOption(option)
                        }}
                        disabled={deletingId === option.id}
                        className="inline-flex items-center justify-center text-rose-600 hover:text-rose-800 disabled:opacity-60"
                        aria-label={deletingId === option.id ? '삭제 중…' : '삭제'}
                        title={deletingId === option.id ? '삭제 중…' : '삭제'}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </ErpDataTable>
      </ErpGridWrap>

      {canMutate ? (
        <>
          <ErpToolbar>
            <span className="text-xs font-semibold text-slate-700">새 옵션 추가</span>
            <button
              type="button"
              onClick={() => void reloadSizes()}
              className="ml-auto text-[11px] text-blue-600 hover:text-blue-800"
            >
              사이즈 목록 새로고침
            </button>
          </ErpToolbar>
          {sizes.length === 0 ? (
            <div className="border-b border-slate-300 px-3 py-6 text-center text-xs text-slate-500">
              등록된 사이즈가 없습니다. 사이즈 탭에서 먼저 사이즈를 등록하세요.
            </div>
          ) : (
            <>
              <ErpFormTable>
                <OptionFormFields form={addForm} onChange={setAddForm} sizes={sizes} />
              </ErpFormTable>
              <ErpFooterBar>
                <ErpFooterPrimary>
                  <ErpPrimaryButton onClick={() => void addOption()} disabled={adding}>
                    {adding ? '추가 중…' : '옵션 추가'}
                  </ErpPrimaryButton>
                </ErpFooterPrimary>
              </ErpFooterBar>
            </>
          )}
        </>
      ) : null}

      <Modal
        title="옵션 수정"
        description={editing ? `SKU: ${editing.skuCode}` : undefined}
        open={editing != null}
        onClose={() => setEditing(null)}
      >
        <ErpFormTable>
          <OptionFormFields form={editForm} onChange={setEditForm} sizes={sizes} />
        </ErpFormTable>
        <div className="mt-3 flex justify-end gap-1 border-t border-slate-200 pt-3">
          <ErpSecondaryButton onClick={() => setEditing(null)}>취소</ErpSecondaryButton>
          <ErpPrimaryButton onClick={() => void saveEdit()} disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </ErpPrimaryButton>
        </div>
      </Modal>
    </>
  )
}
