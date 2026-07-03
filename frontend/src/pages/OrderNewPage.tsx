import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { getRole, getStoreId } from '../lib/auth'
import ErpPageFrame, { ErpAccessDenied } from '../components/ui/ErpPageFrame'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import {
  ErpChevronBack,
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
  ErpToolbar,
} from '../components/ui/erp/ErpLayout'
import { erpGridCellClass, erpGridHeadClass, erpInputClass, erpSelectClass } from '../lib/erpUi'
import type { Order } from '../types/models'
import type { ProductListItem } from '../components/product/types'
import type { ProductStatusValue } from '../lib/productStatus'

type ApiProductOption = {
  id: number
  productId: number
  productName: string
  color: string
  sizeName?: string | null
  size?: unknown
  skuCode: string
  status: string
}

type OrderCatalogOption = {
  productOptionId: number
  productId: number
  productName: string
  categoryName: string
  brandName: string
  skuCode: string
  color: string
  sizeLabel: string
}

type CartLine = OrderCatalogOption & { quantity: number }

const MAX_PRODUCTS_TO_SCAN = 28
const QTY_OPTIONS = Array.from({ length: 99 }, (_, i) => i + 1)

function formatSize(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v !== null && 'name' in v) {
    const n = (v as { name?: unknown }).name
    return n != null ? String(n) : JSON.stringify(v)
  }
  return String(v)
}

function appearanceLabel(o: OrderCatalogOption): string {
  const c = (o.color ?? '').trim()
  const s = (o.sizeLabel ?? '').trim()
  if (c && s) return `${c} / ${s}`
  return c || s || '—'
}

function optionRowLabel(o: OrderCatalogOption): string {
  return `${o.skuCode} · ${o.productName} (${o.color} / ${o.sizeLabel})`
}

function colorKey(o: OrderCatalogOption): string {
  const c = (o.color ?? '').trim()
  return c || '—'
}

export default function OrderNewPage() {
  const navigate = useNavigate()
  const role = getRole()
  const storeId = getStoreId()

  const [note, setNote] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [products, setProducts] = useState<ProductListItem[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)

  /** 선택한 카테고리 안의 옵션만 (다른 카테고리로 나가지 않음) */
  const [categoryName, setCategoryName] = useState<string>('')
  const [optionPool, setOptionPool] = useState<OrderCatalogOption[]>([])
  const [poolLoading, setPoolLoading] = useState(false)
  const [poolMessage, setPoolMessage] = useState<string | null>(null)

  const [filterProductName, setFilterProductName] = useState<string>('ALL')
  const [filterColor, setFilterColor] = useState<string>('ALL')
  const [filterSize, setFilterSize] = useState<string>('ALL')
  const [filterSku, setFilterSku] = useState<string>('ALL')
  /** 드롭다운으로 좁힌 뒤, 상품명·SKU·색·사이즈 등 자유 검색 */
  const [searchQ, setSearchQ] = useState('')

  const [pickQty, setPickQty] = useState<Record<number, number>>({})

  // AI 추천 발주량: productOptionId -> 추천 수량('loading'/'error' 상태 포함)
  const [aiRecommend, setAiRecommend] = useState<Record<number, number | 'loading' | 'error'>>({})

  // 발주는 보통 다음날 입고를 기준으로 하므로 내일 날짜로 예측 요청
  const tomorrow = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }, [])

  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    setProductsError(null)
    try {
      const { data } = await api.get<ProductListItem[]>('/api/products')
      setProducts(Array.isArray(data) ? data : [])
    } catch {
      setProductsError('상품 목록을 불러오지 못했습니다.')
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const onSaleProducts = useMemo(
    () => products.filter((p) => (p.status as ProductStatusValue) === 'ON_SALE'),
    [products],
  )

  const categoryNames = useMemo(() => {
    const s = new Set<string>()
    for (const p of onSaleProducts) {
      if (p.categoryName) s.add(p.categoryName)
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'ko-KR'))
  }, [onSaleProducts])

  useEffect(() => {
    setFilterProductName('ALL')
    setFilterColor('ALL')
    setFilterSize('ALL')
    setFilterSku('ALL')
    setSearchQ('')
  }, [categoryName])

  useEffect(() => {
    if (!categoryName) {
      setOptionPool([])
      setPoolMessage(null)
      return
    }

    let cancelled = false
    const candidates = onSaleProducts.filter((p) => p.categoryName === categoryName)
    setOptionPool([])
    if (candidates.length === 0) {
      setPoolMessage('이 카테고리에 판매 중인 상품이 없습니다.')
      return
    }

    const capped = candidates.slice(0, MAX_PRODUCTS_TO_SCAN)
    const warnMany =
      candidates.length > MAX_PRODUCTS_TO_SCAN
        ? `상품이 많아 같은 카테고리에서 최대 ${MAX_PRODUCTS_TO_SCAN}개 상품의 옵션만 불러왔습니다.`
        : null

    setPoolLoading(true)
    setPoolMessage(warnMany)
    ;(async () => {
      try {
        const results = await Promise.all(
          capped.map(async (p) => {
            const { data } = await api.get<ApiProductOption[]>(`/api/products/${p.id}/options`)
            const list = Array.isArray(data) ? data : []
            return list
              .filter((o) => o.status === 'ON_SALE')
              .map(
                (o): OrderCatalogOption => ({
                  productOptionId: o.id,
                  productId: o.productId,
                  productName: o.productName,
                  categoryName: p.categoryName,
                  brandName: p.brandName,
                  skuCode: o.skuCode ?? '',
                  color: o.color ?? '',
                  sizeLabel: (o.sizeName ?? formatSize(o.size)) || '',
                }),
              )
          }),
        )
        if (cancelled) return
        const flat = results.flat()
        setOptionPool(flat)
        setPickQty((prev) => {
          const next = { ...prev }
          for (const o of flat) {
            if (next[o.productOptionId] == null) next[o.productOptionId] = 1
          }
          return next
        })
        if (flat.length === 0) {
          setPoolMessage('판매 중인 옵션이 없습니다.')
        }
      } catch {
        if (!cancelled) {
          setOptionPool([])
          setPoolMessage('옵션 정보를 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) setPoolLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [categoryName, onSaleProducts])

  const afterProduct = useMemo(() => {
    if (filterProductName === 'ALL') return optionPool
    return optionPool.filter((o) => o.productName === filterProductName)
  }, [optionPool, filterProductName])

  const afterColor = useMemo(() => {
    if (filterColor === 'ALL') return afterProduct
    return afterProduct.filter((o) => colorKey(o) === filterColor)
  }, [afterProduct, filterColor])

  const afterSize = useMemo(() => {
    if (filterSize === 'ALL') return afterColor
    const s = filterSize.trim()
    return afterColor.filter((o) => (o.sizeLabel ?? '').trim() === s || (s === '—' && !(o.sizeLabel ?? '').trim()))
  }, [afterColor, filterSize])

  const afterDropdowns = useMemo(() => {
    if (filterSku === 'ALL') return afterSize
    return afterSize.filter((o) => (o.skuCode?.trim() ? o.skuCode : '—') === filterSku)
  }, [afterSize, filterSku])

  const displayedOptions = useMemo(() => {
    const needle = searchQ.trim().toLowerCase()
    if (!needle) return afterDropdowns
    return afterDropdowns.filter((o) => {
      const hay = [
        o.productName,
        o.skuCode,
        o.color,
        o.sizeLabel,
        o.brandName,
        o.categoryName,
        appearanceLabel(o),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [afterDropdowns, searchQ])

  useEffect(() => {
    if (storeId == null || displayedOptions.length === 0) return

    const targets = displayedOptions.filter((o) => aiRecommend[o.productOptionId] == null)
    if (targets.length === 0) return

    targets.forEach((o) => {
      setAiRecommend((prev) => ({ ...prev, [o.productOptionId]: 'loading' }))
      api
        .get('/api/ai/demand-forecast', {
          params: { storeId, productOptionId: o.productOptionId, targetDate: tomorrow },
        })
        .then(({ data }) => {
          const recommended = (data as { recommendedOrderQuantity?: number })?.recommendedOrderQuantity
          setAiRecommend((prev) => ({
            ...prev,
            [o.productOptionId]: typeof recommended === 'number' ? recommended : 'error',
          }))
        })
        .catch(() => {
          setAiRecommend((prev) => ({ ...prev, [o.productOptionId]: 'error' }))
        })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedOptions, storeId, tomorrow])

  const productChoices = useMemo(() => {
    const s = new Set<string>()
    for (const o of optionPool) s.add(o.productName)
    return [...s].sort((a, b) => a.localeCompare(b, 'ko-KR'))
  }, [optionPool])

  const colorChoices = useMemo(() => {
    const s = new Set<string>()
    for (const o of afterProduct) s.add(colorKey(o))
    return [...s].sort((a, b) => a.localeCompare(b, 'ko-KR'))
  }, [afterProduct])

  const sizeChoices = useMemo(() => {
    const s = new Set<string>()
    for (const o of afterColor) {
      const z = (o.sizeLabel ?? '').trim()
      s.add(z || '—')
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'ko-KR'))
  }, [afterColor])

  const skuChoices = useMemo(() => {
    const s = new Set<string>()
    for (const o of afterSize) {
      s.add(o.skuCode?.trim() ? o.skuCode : '—')
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'ko-KR'))
  }, [afterSize])

  useEffect(() => {
    if (filterProductName !== 'ALL' && !productChoices.includes(filterProductName)) {
      setFilterProductName('ALL')
    }
  }, [filterProductName, productChoices])

  useEffect(() => {
    if (filterColor !== 'ALL' && !colorChoices.includes(filterColor)) {
      setFilterColor('ALL')
    }
  }, [filterColor, colorChoices])

  useEffect(() => {
    if (filterSize !== 'ALL' && !sizeChoices.includes(filterSize)) {
      setFilterSize('ALL')
    }
  }, [filterSize, sizeChoices])

  useEffect(() => {
    if (filterSku !== 'ALL' && !skuChoices.includes(filterSku)) {
      setFilterSku('ALL')
    }
  }, [filterSku, skuChoices])

  const addToCart = (o: OrderCatalogOption) => {
    const qty = pickQty[o.productOptionId] ?? 1
    if (!Number.isFinite(qty) || qty < 1) return
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.productOptionId === o.productOptionId)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + qty }
        return copy
      }
      return [...prev, { ...o, quantity: qty }]
    })
    setPickQty((p) => ({ ...p, [o.productOptionId]: 1 }))
  }

  const setCartLineQty = (productOptionId: number, quantity: number) => {
    const q = Math.min(99, Math.max(1, Math.floor(quantity)))
    setCart((prev) => prev.map((l) => (l.productOptionId === productOptionId ? { ...l, quantity: q } : l)))
  }

  const removeCartLine = (productOptionId: number) => {
    setCart((prev) => prev.filter((l) => l.productOptionId !== productOptionId))
  }

  if (role !== 'STORE_MANAGER') {
    return (
      <ErpAccessDenied
        title="발주 요청"
        message="발주 요청은 매장 관리자(STORE_MANAGER) 계정으로만 등록할 수 있습니다."
      />
    )
  }

  if (storeId == null) {
    return (
      <ErpPageFrame
        title="발주 요청"
        actions={<ErpChevronBack to="/orders" label="발주 목록" />}
      >
        <p className="px-3 py-4 text-sm text-amber-800">
          로그인 정보에 매장이 없습니다. 본사에 문의한 뒤 다시 로그인해 주세요.
        </p>
      </ErpPageFrame>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (cart.length === 0) {
      setError('담은 품목이 없습니다. 품목을 담아 주세요.')
      return
    }
    const merged = new Map<number, number>()
    for (const line of cart) {
      merged.set(line.productOptionId, (merged.get(line.productOptionId) ?? 0) + line.quantity)
    }
    const items = [...merged.entries()].map(([productOptionId, quantity]) => ({
      productOptionId,
      quantity,
    }))
    setSubmitting(true)
    try {
      const { data } = await api.post<Order>('/api/orders', {
        storeId,
        note: note.trim() || undefined,
        items,
      })
      const newId = data?.id
      if (newId != null) {
        navigate(`/orders/${newId}`, { replace: true })
      } else {
        navigate('/orders', { replace: true })
      }
    } catch {
      setError('등록에 실패했습니다. 권한·입력값을 확인해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ErpPageFrame title="발주 요청" actions={<ErpChevronBack to="/orders" label="발주 목록" />}>
      <ErpToolbar>
        <span className="text-xs font-semibold text-slate-700">상품·옵션 찾기</span>
      </ErpToolbar>

      {productsLoading ? (
        <div className="py-12">
          <LoadingSpinner />
        </div>
      ) : productsError ? (
        <div className="px-3 py-4 text-sm text-rose-600">{productsError}</div>
      ) : (
        <>
          <ErpFormTable>
            <ErpFormRow>
              <ErpFormLabel required>카테고리</ErpFormLabel>
              <ErpFormCell>
                <select
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className={erpSelectClass()}
                >
                  <option value="">선택</option>
                  {categoryNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </ErpFormCell>
              <ErpFormLabel>상품명</ErpFormLabel>
              <ErpFormCell>
                <select
                  value={filterProductName}
                  onChange={(e) => {
                    setFilterProductName(e.target.value)
                    setFilterColor('ALL')
                    setFilterSize('ALL')
                    setFilterSku('ALL')
                  }}
                  disabled={!categoryName || poolLoading}
                  className={erpSelectClass()}
                >
                  <option value="ALL">전체</option>
                  {productChoices.map((n) => (
                    <option key={n} value={n}>
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
                  value={filterColor}
                  onChange={(e) => {
                    setFilterColor(e.target.value)
                    setFilterSize('ALL')
                    setFilterSku('ALL')
                  }}
                  disabled={!categoryName || poolLoading}
                  className={erpSelectClass()}
                >
                  <option value="ALL">전체</option>
                  {colorChoices.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </ErpFormCell>
              <ErpFormLabel>사이즈</ErpFormLabel>
              <ErpFormCell>
                <select
                  value={filterSize}
                  onChange={(e) => {
                    setFilterSize(e.target.value)
                    setFilterSku('ALL')
                  }}
                  disabled={!categoryName || poolLoading}
                  className={erpSelectClass()}
                >
                  <option value="ALL">전체</option>
                  {sizeChoices.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </ErpFormCell>
            </ErpFormRow>
            <ErpFormRow>
              <ErpFormLabel>SKU</ErpFormLabel>
              <ErpFormCell>
                <select
                  value={filterSku}
                  onChange={(e) => setFilterSku(e.target.value)}
                  disabled={!categoryName || poolLoading}
                  className={[erpSelectClass(), 'font-mono'].join(' ')}
                >
                  <option value="ALL">전체</option>
                  {skuChoices.map((sku) => (
                    <option key={sku} value={sku}>
                      {sku}
                    </option>
                  ))}
                </select>
              </ErpFormCell>
              <ErpFormLabel>검색</ErpFormLabel>
              <ErpFormCell>
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  disabled={!categoryName || poolLoading}
                  placeholder="상품명, SKU, 색상, 사이즈…"
                  className={erpInputClass()}
                />
              </ErpFormCell>
            </ErpFormRow>
          </ErpFormTable>

          {poolMessage ? (
            <div className="border-b border-slate-300 px-2 py-1.5 text-xs text-amber-800">{poolMessage}</div>
          ) : null}

          {!categoryName ? (
            <div className="px-3 py-10 text-center text-xs text-slate-400">카테고리를 선택하세요.</div>
          ) : poolLoading ? (
            <div className="py-10">
              <LoadingSpinner />
            </div>
          ) : displayedOptions.length > 0 ? (
            <ErpGridWrap maxHeight="max-h-[min(20rem,calc(100vh-24rem))]">
              <ErpDataTable minWidth="720px">
                <thead>
                  <tr>
                    <th className={erpGridHeadClass()}>카테고리</th>
                    <th className={erpGridHeadClass()}>SKU</th>
                    <th className={erpGridHeadClass()}>상품명</th>
                    <th className={erpGridHeadClass()}>색 / 사이즈</th>
                    <th className={erpGridHeadClass()}>수량</th>
                    <th className={erpGridHeadClass()}>AI 추천</th>
                    <th className={[erpGridHeadClass(), 'text-right'].join(' ')}>담기</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedOptions.map((o) => (
                    <tr key={o.productOptionId}>
                      <td className={erpGridCellClass()}>{o.categoryName}</td>
                      <td className={erpGridCellClass('font-mono text-[11px]')}>{o.skuCode || '—'}</td>
                      <td className={erpGridCellClass()}>{o.productName}</td>
                      <td className={erpGridCellClass()}>{appearanceLabel(o)}</td>
                      <td className={erpGridCellClass()}>
                        <select
                          value={pickQty[o.productOptionId] ?? 1}
                          onChange={(e) =>
                            setPickQty((p) => ({
                              ...p,
                              [o.productOptionId]: Number(e.target.value),
                            }))
                          }
                          className={erpSelectClass()}
                        >
                          {QTY_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={erpGridCellClass()}>
                        {(() => {
                          const rec = aiRecommend[o.productOptionId]
                          if (rec === 'loading') {
                            return <LoadingSpinner compact hideLabel />
                          }
                          if (rec === 'error' || rec == null) {
                            return <span className="text-slate-300">—</span>
                          }
                          return (
                            <button
                              type="button"
                              onClick={() =>
                                setPickQty((p) => ({ ...p, [o.productOptionId]: rec }))
                              }
                              title="AI가 예측한 수요 기반 추천 발주량입니다. 클릭하면 수량에 적용됩니다."
                              className="border border-blue-300 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                            >
                              {rec}개 적용
                            </button>
                          )
                        })()}
                      </td>
                      <td className={erpGridCellClass('text-right')}>
                        <ErpPrimaryButton
                          type="button"
                          onClick={() => addToCart(o)}
                          className="h-7 min-w-0 px-2"
                        >
                          담기
                        </ErpPrimaryButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ErpDataTable>
            </ErpGridWrap>
          ) : optionPool.length > 0 ? (
            <div className="px-3 py-8 text-center text-xs text-slate-500">
              {searchQ.trim()
                ? '검색어·드롭다운 조건에 맞는 옵션이 없습니다.'
                : '선택한 조건에 맞는 옵션이 없습니다.'}
            </div>
          ) : null}
        </>
      )}

      <ErpToolbar>
        <span className="text-xs font-semibold text-slate-700">담은 품목</span>
        {cart.length > 0 ? (
          <span className="ml-auto text-[11px] text-slate-500">{cart.length}건</span>
        ) : null}
      </ErpToolbar>

      <form onSubmit={(e) => void handleSubmit(e)}>
        {error ? (
          <div className="border-b border-slate-300 px-2 py-1.5 text-xs text-rose-600">{error}</div>
        ) : null}

        {cart.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-400">담은 품목이 없습니다.</div>
        ) : (
          <ErpGridWrap>
            <ErpDataTable minWidth="640px">
              <thead>
                <tr>
                  <th className={erpGridHeadClass()}>옵션</th>
                  <th className={erpGridHeadClass()}>수량</th>
                  <th className={[erpGridHeadClass(), 'w-10 text-center'].join(' ')}>
                    <span className="sr-only">삭제</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cart.map((line) => (
                  <tr key={line.productOptionId}>
                    <td className={erpGridCellClass()}>{optionRowLabel(line)}</td>
                    <td className={erpGridCellClass()}>
                      <select
                        value={line.quantity}
                        onChange={(e) =>
                          setCartLineQty(line.productOptionId, Number(e.target.value))
                        }
                        className={erpSelectClass()}
                      >
                        {QTY_OPTIONS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={erpGridCellClass('text-center')}>
                      <button
                        type="button"
                        onClick={() => removeCartLine(line.productOptionId)}
                        className="inline-flex items-center justify-center text-rose-600 hover:text-rose-800"
                        aria-label="삭제"
                        title="삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ErpDataTable>
          </ErpGridWrap>
        )}

        <ErpFormTable>
          <ErpFormRow>
            <ErpFormLabel>메모</ErpFormLabel>
            <ErpFormCell colSpan={3}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="선택"
                className="min-h-[3rem] w-full border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
              />
            </ErpFormCell>
          </ErpFormRow>
        </ErpFormTable>

        <ErpFooterBar>
          <ErpSecondaryButton type="button" onClick={() => navigate('/orders')}>
            취소
          </ErpSecondaryButton>
          <ErpFooterPrimary>
            <ErpPrimaryButton type="submit" disabled={submitting || cart.length === 0}>
              {submitting ? '요청 중…' : '요청하기'}
            </ErpPrimaryButton>
          </ErpFooterPrimary>
        </ErpFooterBar>
      </form>
    </ErpPageFrame>
  )
}
