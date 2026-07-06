import { useCallback, useEffect, useMemo, useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { api } from '../../../lib/api'
import LoadingSpinner from '../../ui/LoadingSpinner'
import TablePaginationBar from '../../ui/TablePaginationBar'
import Modal from '../../ui/Modal'
import {
  ErpDataTable,
  ErpFooterBar,
  ErpFooterPrimary,
  ErpFormCell,
  ErpFormLabel,
  ErpFormRow,
  ErpFormTable,
  ErpGridWrap,
  ErpPrimaryButton,
  ErpSecondaryButton,
  ErpStatusBar,
  ErpToolbar,
  ErpToolbarButton,
} from '../../ui/erp/ErpLayout'
import { erpGridCellClass, erpGridHeadClass, erpInputClass, erpSelectClass } from '../../../lib/erpUi'
import { useTablePagination } from '../../../hooks/useTablePagination'
import { defaultSizeId, useSizes } from '../../../hooks/useSizes'
import type { ProductListItem } from '../types'
import OptionFormFields from './OptionFormFields'
import {
  OPTION_STATUS_OPTIONS,
  emptyOptionForm,
  optionRequestBody,
  optionStatusLabel,
  parseApiErrorMessage,
  validateOptionForm,
  type OptionFormState,
  type ProductOption,
  type ProductOptionStatus,
} from '../../../lib/productOption'

type Props = {
  canMutate: boolean
  brandId: number
  brandName: string
  refreshKey?: number | string
}

type CreateFormState = OptionFormState & {
  productId: string
}

const emptyCreateForm = (): CreateFormState => ({
  ...emptyOptionForm(),
  productId: '',
})

export default function ProductOptionListPanel({
  canMutate,
  brandId,
  brandName,
  refreshKey = 0,
}: Props) {
  const navigate = useNavigate()
  const { sizes } = useSizes()
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [options, setOptions] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [productFilter, setProductFilter] = useState<number | 'ALL'>('ALL')
  const [sizeFilter, setSizeFilter] = useState<number | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<ProductOptionStatus | 'ALL'>('ALL')
  const [colorFilter, setColorFilter] = useState<string>('ALL')

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: productData } = await api.get<ProductListItem[]>('/api/products')
      const productList = (productData ?? []).filter((p) => p.brandId === brandId)
      setProducts(productList)

      const lists = await Promise.all(
        productList.map(async (p) => {
          try {
            const { data } = await api.get<ProductOption[]>(`/api/products/${p.id}/options`)
            return data ?? []
          } catch {
            return [] as ProductOption[]
          }
        }),
      )
      setOptions(lists.flat())
    } catch {
      setError('옵션 목록을 불러오지 못했습니다.')
      setProducts([])
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  useEffect(() => {
    setQ('')
    setProductFilter('ALL')
    setColorFilter('ALL')
    setSizeFilter('ALL')
    setStatusFilter('ALL')
    setCreateForm(emptyCreateForm())
    setCreateOpen(false)
  }, [brandId])

  const productFilterOptions = useMemo(
    () =>
      products
        .map((p) => ({ id: p.id, name: p.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR')),
    [products],
  )

  const colorOptions = useMemo(() => {
    const s = new Set<string>()
    for (const o of options) {
      if (o.color.trim()) s.add(o.color.trim())
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'ko-KR'))
  }, [options])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return options
      .filter((o) => {
        if (productFilter !== 'ALL' && o.productId !== productFilter) return false
        if (sizeFilter !== 'ALL' && o.sizeId !== sizeFilter) return false
        if (statusFilter !== 'ALL' && o.status !== statusFilter) return false
        if (colorFilter !== 'ALL' && o.color !== colorFilter) return false
        if (!needle) return true
        const hay = [o.productName, o.skuCode, o.color, o.colorCode, o.sizeName, optionStatusLabel(o.status)]
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
      .sort((a, b) => {
        const nameCmp = a.productName.localeCompare(b.productName, 'ko-KR')
        if (nameCmp !== 0) return nameCmp
        const colorCmp = a.color.localeCompare(b.color, 'ko-KR')
        if (colorCmp !== 0) return colorCmp
        return a.sizeName.localeCompare(b.sizeName, 'ko-KR')
      })
  }, [options, q, productFilter, sizeFilter, statusFilter, colorFilter])

  const pagination = useTablePagination(filtered)

  const openCreate = () => {
    setCreateForm({
      ...emptyCreateForm(),
      productId: productFilter !== 'ALL' ? String(productFilter) : '',
      sizeId: defaultSizeId(sizes),
    })
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!canMutate || creating) return
    if (!createForm.productId) {
      setError('어느 상품의 옵션인지 선택하세요.')
      return
    }
    const validation = validateOptionForm(createForm)
    if (validation) {
      setError(validation)
      return
    }
    setCreating(true)
    setError(null)
    try {
      const productId = Number(createForm.productId)
      await api.post(`/api/products/${productId}/options`, optionRequestBody(createForm))
      setCreateOpen(false)
      setCreateForm(emptyCreateForm())
      await load()
    } catch (err) {
      setError(parseApiErrorMessage(err, '옵션 등록에 실패했습니다.'))
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error && options.length === 0 && products.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-rose-600">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <>
      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel>검색</ErpFormLabel>
          <ErpFormCell>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="상품명 · 색상 · SKU"
              className={erpInputClass()}
            />
          </ErpFormCell>
          <ErpFormLabel>상품</ErpFormLabel>
          <ErpFormCell>
            <select
              value={productFilter === 'ALL' ? 'ALL' : String(productFilter)}
              onChange={(e) => {
                const v = e.target.value
                setProductFilter(v === 'ALL' ? 'ALL' : Number(v))
              }}
              className={erpSelectClass()}
            >
              <option value="ALL">전체</option>
              {productFilterOptions.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </ErpFormCell>
          <ErpFormLabel>색상</ErpFormLabel>
          <ErpFormCell>
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className={erpSelectClass()}
            >
              <option value="ALL">전체</option>
              {colorOptions.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </ErpFormCell>
          <ErpFormLabel>사이즈</ErpFormLabel>
          <ErpFormCell>
            <select
              value={sizeFilter === 'ALL' ? 'ALL' : String(sizeFilter)}
              onChange={(e) => {
                const v = e.target.value
                setSizeFilter(v === 'ALL' ? 'ALL' : Number(v))
              }}
              className={erpSelectClass()}
            >
              <option value="ALL">전체</option>
              {sizes.map((size) => (
                <option key={size.id} value={size.id}>
                  {size.name}
                </option>
              ))}
            </select>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>상태</ErpFormLabel>
          <ErpFormCell>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value === 'ALL' ? 'ALL' : (e.target.value as ProductOptionStatus),
                )
              }
              className={erpSelectClass()}
            >
              <option value="ALL">전체</option>
              {OPTION_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </ErpFormCell>
          <ErpFormLabel>조회건수</ErpFormLabel>
          <ErpFormCell colSpan={5}>
            <span className="px-1 text-xs text-slate-600">
              {brandName} · {filtered.length.toLocaleString('ko-KR')}건
            </span>
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>

      <ErpToolbar>
        <ErpToolbarButton
          onClick={() => {
            setQ('')
            setProductFilter('ALL')
            setColorFilter('ALL')
            setSizeFilter('ALL')
            setStatusFilter('ALL')
          }}
        >
          초기화
        </ErpToolbarButton>
        <ErpToolbarButton onClick={() => void load()}>새로고침</ErpToolbarButton>
      </ErpToolbar>

      {error ? (
        <div className="border-b border-slate-300 px-2 py-1.5 text-xs text-rose-600">{error}</div>
      ) : null}

      <ErpGridWrap maxHeight="max-h-[min(28rem,calc(100vh-22rem))]">
        <ErpDataTable minWidth="640px">
          <thead>
            <tr>
              <th className={erpGridHeadClass()}>색상</th>
              <th className={erpGridHeadClass()}>색상코드</th>
              <th className={erpGridHeadClass()}>사이즈</th>
              <th className={erpGridHeadClass()}>SKU</th>
              <th className={erpGridHeadClass()}>상태</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.length === 0 ? (
              <tr>
                <td colSpan={5} className={erpGridCellClass('py-12 text-center text-slate-400')}>
                  등록된 옵션이 없습니다.
                </td>
              </tr>
            ) : (
              pagination.pageItems.map((o, idx, arr) => {
                const showProductHeader = idx === 0 || o.productId !== arr[idx - 1].productId
                return (
                  <Fragment key={o.id}>
                    {showProductHeader ? (
                      <tr className="bg-slate-100">
                        <td
                          colSpan={5}
                          className="border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-800"
                        >
                          {o.productName}
                        </td>
                      </tr>
                    ) : null}
                    <tr
                      onClick={() => navigate(`/admin/product-options/${o.productId}`)}
                      className="cursor-pointer hover:bg-blue-50/60"
                    >
                      <td className={erpGridCellClass('font-medium')}>{o.color}</td>
                      <td className={erpGridCellClass('font-mono text-[11px]')}>{o.colorCode}</td>
                      <td className={erpGridCellClass('font-medium')}>{o.sizeName}</td>
                      <td className={erpGridCellClass('font-mono text-[11px]')}>{o.skuCode}</td>
                      <td className={erpGridCellClass()}>{optionStatusLabel(o.status)}</td>
                    </tr>
                  </Fragment>
                )
              })
            )}
          </tbody>
        </ErpDataTable>
      </ErpGridWrap>

      <ErpStatusBar>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {pagination.total > 0
              ? `${pagination.fromIdx}-${pagination.toIdx} / ${pagination.total}건`
              : '0건'}
          </span>
          <TablePaginationBar
            page={pagination.page}
            pageCount={pagination.pageCount}
            total={pagination.total}
            setPage={pagination.setPage}
            fromIdx={pagination.fromIdx}
            toIdx={pagination.toIdx}
          />
        </div>
      </ErpStatusBar>

      <ErpFooterBar>
        <ErpSecondaryButton onClick={() => void load()}>조회</ErpSecondaryButton>
        {canMutate ? (
          <ErpFooterPrimary>
            <ErpPrimaryButton onClick={openCreate}>
              <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              옵션 등록
            </ErpPrimaryButton>
          </ErpFooterPrimary>
        ) : null}
      </ErpFooterBar>

      <Modal
        title="옵션 등록"
        description={`${brandName} 상품에 SKU 옵션을 추가합니다.`}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">상품</span>
            <select
              value={createForm.productId}
              onChange={(e) => setCreateForm((f) => ({ ...f, productId: e.target.value }))}
              className={erpSelectClass()}
            >
              <option value="">상품 선택</option>
              {productFilterOptions.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {sizes.length === 0 ? (
            <p className="text-xs text-amber-700">사이즈 탭에서 사이즈를 먼저 등록하세요.</p>
          ) : (
            <ErpFormTable>
              <OptionFormFields
                form={createForm}
                onChange={(next) => setCreateForm((f) => ({ ...f, ...next }))}
                sizes={sizes}
              />
            </ErpFormTable>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating || sizes.length === 0}
              className="inline-flex min-w-[4.5rem] items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
            >
              {creating ? <LoadingSpinner compact variant="light" hideLabel /> : '등록'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
