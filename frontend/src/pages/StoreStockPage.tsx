import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { getRole, getStoreId } from '../lib/auth'
import ErpPageFrame from '../components/ui/ErpPageFrame'
import TablePaginationBar from '../components/ui/TablePaginationBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import {
  ErpDataTable,
  ErpFormCell,
  ErpFormLabel,
  ErpFormRow,
  ErpFormTable,
  ErpGridWrap,
  ErpStatusBar,
  ErpToolbarButton,
} from '../components/ui/erp/ErpLayout'
import { erpGridCellClass, erpGridHeadClass, erpInputClass, erpSelectClass } from '../lib/erpUi'
import { useTablePagination } from '../hooks/useTablePagination'
import type { StoreStock, StoreSummary } from '../types/models'

export default function StoreStockPage() {
  const navigate = useNavigate()
  const role = getRole()
  const myStoreId = getStoreId()
  const [stores, setStores] = useState<StoreSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [stocks, setStocks] = useState<StoreStock[]>([])
  const [itemQ, setItemQ] = useState('')
  const [sku, setSku] = useState<string>('ALL')
  const [productName, setProductName] = useState<string>('ALL')
  const [color, setColor] = useState<string>('ALL')
  const [size, setSize] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStocks = useCallback(async () => {
    if (selectedId === '') {
      setStocks([])
      return
    }
    try {
      const { data } = await api.get<StoreStock[]>(`/api/stores/${selectedId}/stocks`)
      setStocks(data ?? [])
    } catch {
      setStocks([])
    }
  }, [selectedId])

  useEffect(() => {
    if (stores.length === 0) {
      setSelectedId((prev) => (prev !== '' ? '' : prev))
      return
    }
    setSelectedId((prev) => (stores.some((s) => s.id === prev) ? prev : stores[0].id))
  }, [stores])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await api.get<StoreSummary[]>('/api/stores')
        if (cancelled) return
        const list = (data ?? []).filter((s) => {
          const kind = s.storeType ?? s.store_type
          return kind !== 'HQ'
        })
        setStores(list)
        if (role === 'STORE_MANAGER' && myStoreId != null) {
          setSelectedId((prev) => {
            if (prev !== '' && list.some((s) => s.id === prev)) return prev
            if (list.some((s) => s.id === myStoreId)) return myStoreId
            return list[0]?.id ?? ''
          })
        } else {
          setSelectedId((prev) => {
            if (prev !== '' && list.some((s) => s.id === prev)) return prev
            if (myStoreId != null && list.some((s) => s.id === myStoreId)) return myStoreId
            return list[0]?.id ?? ''
          })
        }
      } catch {
        if (!cancelled) setError('매장 목록을 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [role, myStoreId])

  useEffect(() => {
    void loadStocks()
  }, [loadStocks])

  useEffect(() => {
    setItemQ('')
    setSku('ALL')
    setProductName('ALL')
    setColor('ALL')
    setSize('ALL')
  }, [selectedId])

  const stockFilterOptions = useMemo(() => {
    const skus = new Set<string>()
    const names = new Set<string>()
    const colors = new Set<string>()
    const sizes = new Set<string>()
    for (const s of stocks) {
      if (s.skuCode) skus.add(s.skuCode)
      if (s.productName) names.add(s.productName)
      if (s.color) colors.add(s.color)
      if (s.size) sizes.add(s.size)
    }
    return {
      skus: Array.from(skus).sort((a, b) => a.localeCompare(b, 'ko-KR')),
      productNames: Array.from(names).sort((a, b) => a.localeCompare(b, 'ko-KR')),
      colors: Array.from(colors).sort((a, b) => a.localeCompare(b, 'ko-KR')),
      sizes: Array.from(sizes).sort((a, b) => a.localeCompare(b, 'ko-KR')),
    }
  }, [stocks])

  useEffect(() => {
    setSku((prev) => (prev === 'ALL' || stocks.some((s) => s.skuCode === prev) ? prev : 'ALL'))
    setProductName((prev) =>
      prev === 'ALL' || stocks.some((s) => s.productName === prev) ? prev : 'ALL',
    )
    setColor((prev) => (prev === 'ALL' || stocks.some((s) => s.color === prev) ? prev : 'ALL'))
    setSize((prev) => (prev === 'ALL' || stocks.some((s) => s.size === prev) ? prev : 'ALL'))
  }, [stocks])

  const filteredStocks = useMemo(() => {
    const needle = itemQ.trim().toLowerCase()
    return stocks.filter((s) => {
      if (sku !== 'ALL' && s.skuCode !== sku) return false
      if (productName !== 'ALL' && s.productName !== productName) return false
      if (color !== 'ALL' && s.color !== color) return false
      if (size !== 'ALL' && s.size !== size) return false
      if (needle) {
        const storeName = (s.storeName ?? '').toLowerCase()
        const code = (s.skuCode ?? '').toLowerCase()
        const name = (s.productName ?? '').toLowerCase()
        if (!storeName.includes(needle) && !code.includes(needle) && !name.includes(needle)) {
          return false
        }
      }
      return true
    })
  }, [stocks, itemQ, sku, productName, color, size])

  const storeStockPagination = useTablePagination(filteredStocks)

  const resetFilters = () => {
    setItemQ('')
    setSku('ALL')
    setProductName('ALL')
    setColor('ALL')
    setSize('ALL')
  }

  const goDetail = (s: StoreStock) => {
    if (selectedId === '') return
    navigate(`/store-stock/${selectedId}/${s.id}`)
  }

  const filtersDisabled = selectedId === '' || loading

  return (
    <ErpPageFrame
      title="매장 재고"
      actions={
        <ErpToolbarButton className="ml-auto" onClick={resetFilters} disabled={filtersDisabled}>
          초기화
        </ErpToolbarButton>
      }
    >
      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel>매장</ErpFormLabel>
          <ErpFormCell className="w-[220px]">
            {loading && stores.length === 0 ? (
              <div className="px-1 py-1">
                <LoadingSpinner compact hideLabel />
              </div>
            ) : stores.length === 0 ? (
              <span className="px-1 text-xs text-slate-500">매장 없음</span>
            ) : (
              <select
                value={selectedId === '' ? '' : String(selectedId)}
                onChange={(e) => {
                  const v = e.target.value
                  setSelectedId(v === '' ? '' : Number(v))
                }}
                disabled={role === 'STORE_MANAGER' && stores.length <= 1}
                className={erpSelectClass()}
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </ErpFormCell>
          <ErpFormLabel>조회건수</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            <span className="px-1 text-xs text-slate-600">
              {selectedId === '' ? '—' : `${filteredStocks.length.toLocaleString('ko-KR')}건`}
            </span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>검색</ErpFormLabel>
          <ErpFormCell>
            <input
              type="search"
              value={itemQ}
              onChange={(e) => setItemQ(e.target.value)}
              placeholder="매장명 · SKU · 상품명"
              disabled={filtersDisabled}
              className={erpInputClass()}
            />
          </ErpFormCell>
          <ErpFormLabel>SKU</ErpFormLabel>
          <ErpFormCell>
            <select
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              disabled={filtersDisabled}
              className={erpSelectClass()}
            >
              <option value="ALL">전체</option>
              {stockFilterOptions.skus.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </ErpFormCell>
          <ErpFormLabel>상품명</ErpFormLabel>
          <ErpFormCell>
            <select
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              disabled={filtersDisabled}
              className={erpSelectClass()}
            >
              <option value="ALL">전체</option>
              {stockFilterOptions.productNames.map((n, i) => (
                <option key={`${n}-${i}`} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>색상</ErpFormLabel>
          <ErpFormCell>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={filtersDisabled}
              className={erpSelectClass()}
            >
              <option value="ALL">전체</option>
              {stockFilterOptions.colors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </ErpFormCell>
          <ErpFormLabel>사이즈</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              disabled={filtersDisabled}
              className={erpSelectClass()}
            >
              <option value="ALL">전체</option>
              {stockFilterOptions.sizes.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>

      {error ? (
        <div className="border-b border-slate-300 px-2 py-1.5 text-xs text-rose-600">{error}</div>
      ) : null}

      {loading ? (
        <div className="py-8">
          <LoadingSpinner />
        </div>
      ) : selectedId === '' ? (
        <div className="border-b border-slate-300 px-3 py-16 text-center text-xs text-slate-400">
          매장을 선택할 수 없습니다.
        </div>
      ) : (
        <>
          <ErpGridWrap maxHeight="max-h-[min(28rem,calc(100vh-18rem))]">
            <ErpDataTable minWidth="640px">
              <thead>
                <tr>
                  <th className={erpGridHeadClass()}>SKU</th>
                  <th className={erpGridHeadClass()}>상품명</th>
                  <th className={erpGridHeadClass()}>색상</th>
                  <th className={erpGridHeadClass()}>사이즈</th>
                  <th className={[erpGridHeadClass(), 'text-right'].join(' ')}>수량</th>
                </tr>
              </thead>
              <tbody>
                {stocks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={erpGridCellClass('py-12 text-center text-slate-400')}>
                      재고 데이터가 없습니다.
                    </td>
                  </tr>
                ) : filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={erpGridCellClass('py-12 text-center text-slate-400')}>
                      조건에 맞는 재고가 없습니다.
                    </td>
                  </tr>
                ) : (
                  storeStockPagination.pageItems.map((s) => (
                    <tr
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => goDetail(s)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          goDetail(s)
                        }
                      }}
                      className="cursor-pointer hover:bg-blue-50/50"
                    >
                      <td className={erpGridCellClass('font-mono text-[11px]')}>{s.skuCode}</td>
                      <td className={erpGridCellClass()}>{s.productName}</td>
                      <td className={erpGridCellClass()}>{s.color}</td>
                      <td className={erpGridCellClass()}>{s.size}</td>
                      <td className={erpGridCellClass('text-right font-medium tabular-nums')}>
                        {s.quantity}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </ErpDataTable>
          </ErpGridWrap>

          <ErpStatusBar>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <span>
                전체{' '}
                <span className="font-semibold tabular-nums text-slate-700">
                  {stocks.length.toLocaleString('ko-KR')}
                </span>
                건 · 결과{' '}
                <span className="font-semibold tabular-nums text-slate-700">
                  {filteredStocks.length.toLocaleString('ko-KR')}
                </span>
                건
              </span>
              {filteredStocks.length > 0 ? (
                <TablePaginationBar
                  page={storeStockPagination.page}
                  pageCount={storeStockPagination.pageCount}
                  total={storeStockPagination.total}
                  setPage={storeStockPagination.setPage}
                  fromIdx={storeStockPagination.fromIdx}
                  toIdx={storeStockPagination.toIdx}
                />
              ) : null}
            </div>
          </ErpStatusBar>
        </>
      )}
    </ErpPageFrame>
  )
}
