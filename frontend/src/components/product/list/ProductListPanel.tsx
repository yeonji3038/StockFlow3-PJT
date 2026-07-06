import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { getRole } from '../../../lib/auth'
import { api } from '../../../lib/api'
import type { BrandListItem } from '../../../lib/store'
import LoadingSpinner from '../../ui/LoadingSpinner'
import TablePaginationBar from '../../ui/TablePaginationBar'
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
  ErpWorkScreen,
} from '../../ui/erp/ErpLayout'
import { erpGridCellClass, erpGridHeadClass, erpInputClass, erpSelectClass } from '../../../lib/erpUi'
import { useTablePagination } from '../../../hooks/useTablePagination'
import { PRODUCT_STATUS_OPTIONS, productStatusLabel, type ProductStatusValue } from '../../../lib/productStatus'
import type { ProductListItem } from '../types'

function formatWon(n: number) {
  return n.toLocaleString('ko-KR')
}

type Props = {
  canMutate: boolean
  refreshKey?: number | string
}

export default function ProductListPanel({ canMutate, refreshKey = 0 }: Props) {
  const navigate = useNavigate()
  const [brands, setBrands] = useState<BrandListItem[]>([])
  const [brandsLoading, setBrandsLoading] = useState(true)
  const [brandId, setBrandId] = useState<number | ''>('')
  const [brandTouched, setBrandTouched] = useState(false)

  const [rows, setRows] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProductStatusValue>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL')
  const [statusSavingId, setStatusSavingId] = useState<number | null>(null)

  const selectedBrand = useMemo(
    () => (brandId === '' ? null : brands.find((b) => b.id === brandId) ?? null),
    [brands, brandId],
  )

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true)
    try {
      const { data } = await api.get<BrandListItem[]>('/api/brands')
      setBrands(data ?? [])
    } catch {
      setBrands([])
    } finally {
      setBrandsLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<ProductListItem[]>('/api/products')
      setRows(data ?? [])
    } catch {
      setError('상품 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBrands()
    void load()
  }, [loadBrands, load, refreshKey])

  useEffect(() => {
    setQ('')
    setStatusFilter('ALL')
    setCategoryFilter('ALL')
    setSeasonFilter('ALL')
  }, [brandId])

  const brandRows = useMemo(
    () => (brandId === '' ? [] : rows.filter((r) => r.brandId === brandId)),
    [rows, brandId],
  )

  const categoryOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of brandRows) s.add(r.categoryName)
    return [...s].sort((a, b) => a.localeCompare(b, 'ko-KR'))
  }, [brandRows])

  const seasonOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of brandRows) s.add(r.seasonName)
    return [...s].sort((a, b) => a.localeCompare(b, 'ko-KR'))
  }, [brandRows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return brandRows
      .filter((r) => {
        if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
        if (categoryFilter !== 'ALL' && r.categoryName !== categoryFilter) return false
        if (seasonFilter !== 'ALL' && r.seasonName !== seasonFilter) return false
        if (!needle) return true
        const hay = [r.name, r.categoryName, r.seasonName].join(' ').toLowerCase()
        return hay.includes(needle)
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [brandRows, q, statusFilter, categoryFilter, seasonFilter])

  const pagination = useTablePagination(filtered)

  const putProduct = async (id: number, body: Record<string, unknown>) => {
    await api.put(`/api/products/${id}`, body)
    await load()
  }

  const handleStatusChange = async (row: ProductListItem, next: ProductStatusValue) => {
    if (!canMutate || next === row.status) return
    setError(null)
    setStatusSavingId(row.id)
    try {
      await putProduct(row.id, {
        name: row.name,
        brandId: row.brandId,
        categoryId: row.categoryId,
        seasonId: row.seasonId,
        price: row.price,
        cost: row.cost,
        description: row.description ?? undefined,
        status: next,
      })
    } catch (err) {
      if (isAxiosError(err)) {
        const d = err.response?.data as { message?: string } | string | undefined
        if (typeof d === 'string') setError(d)
        else if (d && typeof d === 'object' && typeof d.message === 'string') setError(d.message)
        else setError('상태 변경에 실패했습니다.')
      } else {
        setError('상태 변경에 실패했습니다.')
      }
    } finally {
      setStatusSavingId(null)
    }
  }

  const resetFilters = () => {
    setQ('')
    setStatusFilter('ALL')
    setCategoryFilter('ALL')
    setSeasonFilter('ALL')
  }

  const brandInvalid = brandTouched && brandId === ''

  return (
    <ErpWorkScreen title="상품 목록">
      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel required>브랜드</ErpFormLabel>
          <ErpFormCell className="w-[220px]">
            {brandsLoading ? (
              <div className="px-1 py-1">
                <LoadingSpinner compact hideLabel />
              </div>
            ) : (
              <select
                value={brandId === '' ? '' : String(brandId)}
                onChange={(e) => {
                  setBrandTouched(true)
                  const v = e.target.value
                  setBrandId(v === '' ? '' : Number(v))
                }}
                onBlur={() => setBrandTouched(true)}
                className={erpSelectClass(brandInvalid)}
              >
                <option value="">브랜드 선택</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </ErpFormCell>
          <ErpFormLabel>조회건수</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            <span className="px-1 text-xs text-slate-600">
              {brandId === '' ? '—' : `${filtered.length.toLocaleString('ko-KR')}건`}
            </span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>검색</ErpFormLabel>
          <ErpFormCell>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="상품명 · 카테고리 · 시즌"
              disabled={brandId === ''}
              className={erpInputClass()}
            />
          </ErpFormCell>
          <ErpFormLabel>카테고리</ErpFormLabel>
          <ErpFormCell>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              disabled={brandId === ''}
              className={erpSelectClass()}
            >
              <option value="ALL">전체</option>
              {categoryOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </ErpFormCell>
          <ErpFormLabel>시즌</ErpFormLabel>
          <ErpFormCell>
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              disabled={brandId === ''}
              className={erpSelectClass()}
            >
              <option value="ALL">전체</option>
              {seasonOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </ErpFormCell>
          <ErpFormLabel>상태</ErpFormLabel>
          <ErpFormCell>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              disabled={brandId === ''}
              className={erpSelectClass()}
            >
              <option value="ALL">전체</option>
              {PRODUCT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>

      <ErpToolbar>
        <ErpToolbarButton onClick={resetFilters} disabled={brandId === ''}>
          초기화
        </ErpToolbarButton>
        <ErpToolbarButton onClick={() => void load()}>새로고침</ErpToolbarButton>
      </ErpToolbar>

      {error ? (
        <div className="border-b border-slate-300 px-2 py-1.5 text-xs text-rose-600">{error}</div>
      ) : null}

      {loading ? (
        <div className="py-8">
          <LoadingSpinner />
        </div>
      ) : brandId === '' ? (
        <div className="border-b border-slate-300 px-3 py-16 text-center text-xs text-slate-400">
          브랜드를 선택하면 상품 목록이 표시됩니다.
        </div>
      ) : (
        <>
          <ErpGridWrap maxHeight="max-h-[min(28rem,calc(100vh-18rem))]">
            <ErpDataTable minWidth="860px">
              <thead>
                <tr>
                  <th className={erpGridHeadClass()}>상품명</th>
                  <th className={erpGridHeadClass()}>카테고리</th>
                  <th className={erpGridHeadClass()}>시즌</th>
                  <th className={[erpGridHeadClass(), 'text-right'].join(' ')}>판매가</th>
                  <th className={[erpGridHeadClass(), 'text-right'].join(' ')}>원가</th>
                  <th className={erpGridHeadClass()}>상태</th>
                  <th className={erpGridHeadClass()}>등록일</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={erpGridCellClass('py-12 text-center text-slate-400')}>
                      {brandRows.length === 0
                        ? '이 브랜드에 등록된 상품이 없습니다.'
                        : '조건에 맞는 상품이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  pagination.pageItems.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/admin/products/${r.id}`)}
                      className="cursor-pointer hover:bg-blue-50/60"
                    >
                      <td className={erpGridCellClass('font-medium')}>{r.name}</td>
                      <td className={erpGridCellClass()}>{r.categoryName}</td>
                      <td className={erpGridCellClass()}>{r.seasonName}</td>
                      <td className={erpGridCellClass('text-right tabular-nums')}>{formatWon(r.price)}</td>
                      <td className={erpGridCellClass('text-right tabular-nums')}>{formatWon(r.cost)}</td>
                      <td className={erpGridCellClass()} onClick={(e) => e.stopPropagation()}>
                        {canMutate ? (
                          <select
                            value={r.status}
                            disabled={statusSavingId === r.id}
                            onChange={(e) =>
                              void handleStatusChange(r, e.target.value as ProductStatusValue)
                            }
                            className={erpSelectClass()}
                          >
                            {PRODUCT_STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          productStatusLabel(r.status)
                        )}
                      </td>
                      <td className={erpGridCellClass('text-[11px] text-slate-500')}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('ko-KR') : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </ErpDataTable>
          </ErpGridWrap>

          <ErpStatusBar>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {selectedBrand ? `${selectedBrand.name} · ` : ''}
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
        </>
      )}

      <ErpFooterBar>
        <ErpSecondaryButton onClick={() => navigate('/admin/product-options')}>옵션 관리</ErpSecondaryButton>
        <ErpSecondaryButton onClick={() => void load()}>조회</ErpSecondaryButton>
        {canMutate ? (
          <ErpFooterPrimary>
            <ErpPrimaryButton
              onClick={() =>
                navigate(brandId === '' ? '/admin/products/new' : `/admin/products/new?brandId=${brandId}`)
              }
            >
              상품 등록
            </ErpPrimaryButton>
          </ErpFooterPrimary>
        ) : null}
      </ErpFooterBar>
    </ErpWorkScreen>
  )
}

export function ProductListPageContent() {
  const { key } = useLocation()
  const isHq = getRole() === 'HQ_STAFF'

  if (!isHq) {
    return (
      <div className="border border-slate-300 bg-white px-4 py-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">본사(HQ) 권한에서만 접근할 수 있습니다.</p>
      </div>
    )
  }

  return <ProductListPanel canMutate={isHq} refreshKey={key} />
}
