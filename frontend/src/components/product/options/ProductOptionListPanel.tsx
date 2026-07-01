import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { api } from '../../../lib/api'
import SectionCard from '../../ui/SectionCard'
import LoadingSpinner from '../../ui/LoadingSpinner'
import TablePaginationBar from '../../ui/TablePaginationBar'
import Modal from '../../ui/Modal'
import { useTablePagination } from '../../../hooks/useTablePagination'
import type { ProductListItem } from '../types'
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

type Props = {
  canMutate: boolean
  refreshKey?: number | string
}

type OptionFormState = {
  productId: string
  color: string
  size: ProductOptionSize
  skuCode: string
  status: ProductOptionStatus
}

const emptyForm: OptionFormState = {
  productId: '',
  color: '',
  size: 'M',
  skuCode: '',
  status: 'ON_SALE',
}

function inputClass() {
  return productOptionInputClass()
}

export default function ProductOptionListPanel({ canMutate, refreshKey = 0 }: Props) {
  const navigate = useNavigate()
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [options, setOptions] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [productFilter, setProductFilter] = useState<number | 'ALL'>('ALL')
  const [sizeFilter, setSizeFilter] = useState<ProductOptionSize | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<ProductOptionStatus | 'ALL'>('ALL')
  const [colorFilter, setColorFilter] = useState<string>('ALL')

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<OptionFormState>(emptyForm)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: productData } = await api.get<ProductListItem[]>('/api/products')
      const productList = productData ?? []
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
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const productFilterOptions = useMemo(() => {
    return products
      .map((p) => ({ id: p.id, name: p.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
  }, [products])

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
        if (sizeFilter !== 'ALL' && o.size !== sizeFilter) return false
        if (statusFilter !== 'ALL' && o.status !== statusFilter) return false
        if (colorFilter !== 'ALL' && o.color !== colorFilter) return false
        if (!needle) return true
        const hay = [o.productName, o.skuCode, o.color, o.size, optionStatusLabel(o.status)]
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
      .sort((a, b) => {
        const nameCmp = a.productName.localeCompare(b.productName, 'ko-KR')
        if (nameCmp !== 0) return nameCmp
        const colorCmp = a.color.localeCompare(b.color, 'ko-KR')
        if (colorCmp !== 0) return colorCmp
        return a.size.localeCompare(b.size, 'ko-KR')
      })
  }, [options, q, productFilter, sizeFilter, statusFilter, colorFilter])

  const pagination = useTablePagination(filtered)

  const openCreate = () => {
    setCreateForm({
      ...emptyForm,
      productId: productFilter !== 'ALL' ? String(productFilter) : '',
    })
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!canMutate || creating) return
    if (!createForm.productId) {
      setError('어느 상품의 옵션인지 선택하세요.')
      return
    }
    if (!createForm.color.trim()) {
      setError('색상을 입력하세요.')
      return
    }
    if (!createForm.skuCode.trim()) {
      setError('상품코드를 입력하세요.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const productId = Number(createForm.productId)
      await api.post(`/api/products/${productId}/options`, {
        color: createForm.color.trim(),
        size: createForm.size,
        skuCode: createForm.skuCode.trim(),
        status: createForm.status,
      })
      setCreateOpen(false)
      setCreateForm(emptyForm)
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
      <p className="text-sm text-slate-600">
        등록된 상품별로 색상·사이즈·상품코드(SKU)를 관리합니다. 행을 클릭하면 해당 상품의 SKU
        옵션을 수정·삭제할 수 있습니다.
      </p>

      <SectionCard
        title="SKU 옵션 (색상 · 사이즈 · 상품코드)"
        headerRight={
          <div className="flex max-w-full flex-1 flex-wrap items-center justify-end gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="상품명 · 색상 · 상품코드"
              className="h-9 min-w-[12rem] flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:max-w-xs"
            />
            <label className="flex items-center gap-2 text-sm">
              <span className="shrink-0 text-slate-500">상품</span>
              <select
                value={productFilter === 'ALL' ? 'ALL' : String(productFilter)}
                onChange={(e) => {
                  const v = e.target.value
                  setProductFilter(v === 'ALL' ? 'ALL' : Number(v))
                }}
                className="h-9 max-w-[10rem] rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">전체</option>
                {productFilterOptions.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="shrink-0 text-slate-500">색상</span>
              <select
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
                className="h-9 max-w-[8rem] rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">전체</option>
                {colorOptions.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="shrink-0 text-slate-500">사이즈</span>
              <select
                value={sizeFilter}
                onChange={(e) =>
                  setSizeFilter(e.target.value === 'ALL' ? 'ALL' : (e.target.value as ProductOptionSize))
                }
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">전체</option>
                {OPTION_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="shrink-0 text-slate-500">상태</span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value === 'ALL' ? 'ALL' : (e.target.value as ProductOptionStatus),
                  )
                }
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">전체</option>
                {OPTION_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setQ('')
                setProductFilter('ALL')
                setColorFilter('ALL')
                setSizeFilter('ALL')
                setStatusFilter('ALL')
              }}
              className="h-9 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              초기화
            </button>
            {canMutate ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" aria-hidden />
                옵션 등록
              </button>
            ) : null}
          </div>
        }
      >
        {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
        <div className="overflow-x-auto rounded-md border border-slate-100">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <th className="px-3 py-2.5">상품</th>
                <th className="px-3 py-2.5">색상</th>
                <th className="px-3 py-2.5">사이즈</th>
                <th className="px-3 py-2.5">상품코드</th>
                <th className="px-3 py-2.5">상태</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-slate-400">
                    등록된 옵션이 없습니다.
                  </td>
                </tr>
              ) : (
                pagination.pageItems.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/admin/product-options/${o.productId}`)}
                    className="cursor-pointer border-b border-slate-100 even:bg-slate-50/40 hover:bg-blue-50/50"
                  >
                    <td className="px-3 py-2 text-slate-700">{o.productName}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{o.color}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{o.size}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-800">{o.skuCode}</td>
                    <td className="px-3 py-2 text-slate-700">{optionStatusLabel(o.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end">
          <TablePaginationBar
            page={pagination.page}
            pageCount={pagination.pageCount}
            total={pagination.total}
            setPage={pagination.setPage}
            fromIdx={pagination.fromIdx}
            toIdx={pagination.toIdx}
          />
        </div>
      </SectionCard>

      <Modal
        title="옵션 등록"
        description="색상·사이즈·상품코드를 등록합니다."
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">상품</span>
            <select
              value={createForm.productId}
              onChange={(e) => setCreateForm((f) => ({ ...f, productId: e.target.value }))}
              className={inputClass()}
            >
              <option value="">상품 선택</option>
              {productFilterOptions.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">색상</span>
              <input
                value={createForm.color}
                onChange={(e) => setCreateForm((f) => ({ ...f, color: e.target.value }))}
                className={inputClass()}
                placeholder="예: RED"
                maxLength={50}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">사이즈</span>
              <select
                value={createForm.size}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, size: e.target.value as ProductOptionSize }))
                }
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
                value={createForm.skuCode}
                onChange={(e) => setCreateForm((f) => ({ ...f, skuCode: e.target.value }))}
                className={inputClass()}
                placeholder="예: SKU-001"
                maxLength={100}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">상태</span>
              <select
                value={createForm.status}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, status: e.target.value as ProductOptionStatus }))
                }
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
              disabled={creating}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
            >
              {creating ? '등록 중…' : '등록'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
