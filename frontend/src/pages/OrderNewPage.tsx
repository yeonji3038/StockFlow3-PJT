import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { getRole, getStoreId } from '../lib/auth'
import SectionCard from '../components/ui/SectionCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import type { Order } from '../types/models'
import type { ProductListItem } from '../components/product/types'
import type { ProductStatusValue } from '../lib/productStatus'

type ApiProductOption = {
  id: number
  productId: number
  productName: string
  color: string
  size: unknown
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
                  sizeLabel: formatSize(o.size),
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
      <div className="space-y-4">
        <Link to="/orders" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← 발주 목록
        </Link>
        <p className="text-sm text-slate-600">발주 요청은 매장 관리자(STORE_MANAGER) 계정으로만 등록할 수 있습니다.</p>
      </div>
    )
  }

  if (storeId == null) {
    return (
      <div className="space-y-4">
        <Link to="/orders" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← 발주 목록
        </Link>
        <p className="text-sm text-amber-800">
          로그인 정보에 매장이 없습니다. 본사에 문의한 뒤 다시 로그인해 주세요.
        </p>
      </div>
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link to="/orders" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← 발주 목록
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">발주 요청</h1>
      </div>

      <SectionCard title="상품·옵션 찾기">
        {productsLoading ? (
          <LoadingSpinner />
        ) : productsError ? (
          <p className="text-sm text-rose-600">{productsError}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="block text-sm font-medium text-slate-700">
                카테고리
                <select
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="mt-1 h-10 min-w-[11rem] rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">카테고리 선택</option>
                  {categoryNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-[9rem] flex-1 text-sm font-medium text-slate-700">
                상품명
                <select
                  value={filterProductName}
                  onChange={(e) => {
                    setFilterProductName(e.target.value)
                    setFilterColor('ALL')
                    setFilterSize('ALL')
                    setFilterSku('ALL')
                  }}
                  disabled={!categoryName || poolLoading}
                  className="mt-1 h-10 w-full min-w-[9rem] rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="ALL">전체</option>
                  {productChoices.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-[8rem] text-sm font-medium text-slate-700">
                색상
                <select
                  value={filterColor}
                  onChange={(e) => {
                    setFilterColor(e.target.value)
                    setFilterSize('ALL')
                    setFilterSku('ALL')
                  }}
                  disabled={!categoryName || poolLoading}
                  className="mt-1 h-10 w-full min-w-[8rem] rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="ALL">전체</option>
                  {colorChoices.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-[8rem] text-sm font-medium text-slate-700">
                사이즈
                <select
                  value={filterSize}
                  onChange={(e) => {
                    setFilterSize(e.target.value)
                    setFilterSku('ALL')
                  }}
                  disabled={!categoryName || poolLoading}
                  className="mt-1 h-10 w-full min-w-[8rem] rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="ALL">전체</option>
                  {sizeChoices.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-[9rem] flex-1 text-sm font-medium text-slate-700">
                SKU
                <select
                  value={filterSku}
                  onChange={(e) => setFilterSku(e.target.value)}
                  disabled={!categoryName || poolLoading}
                  className="mt-1 h-10 w-full min-w-[9rem] rounded-md border border-slate-200 bg-white px-2 text-sm font-mono shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="ALL">전체</option>
                  {skuChoices.map((sku) => (
                    <option key={sku} value={sku}>
                      {sku}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              검색
              <input
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                disabled={!categoryName || poolLoading}
                placeholder="상품명, SKU, 색상, 사이즈…"
                className="mt-1 h-10 w-full max-w-md rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>

            {poolMessage ? <p className="text-sm text-amber-800">{poolMessage}</p> : null}
            {!categoryName ? null : poolLoading ? (
              <LoadingSpinner />
            ) : displayedOptions.length > 0 ? (
              <div className="overflow-x-auto rounded-md border border-slate-100">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2.5">카테고리</th>
                      <th className="px-3 py-2.5">SKU</th>
                      <th className="px-3 py-2.5">상품명</th>
                      <th className="px-3 py-2.5">색 / 사이즈</th>
                      <th className="px-3 py-2.5">수량</th>
                      <th className="px-3 py-2.5 text-right">담기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedOptions.map((o) => (
                      <tr key={o.productOptionId} className="border-b border-slate-100 even:bg-slate-50/40">
                        <td className="px-3 py-2 text-slate-700">{o.categoryName}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-800">{o.skuCode || '—'}</td>
                        <td className="px-3 py-2 text-slate-900">{o.productName}</td>
                        <td className="px-3 py-2 text-slate-700">{appearanceLabel(o)}</td>
                        <td className="px-3 py-2">
                          <select
                            value={pickQty[o.productOptionId] ?? 1}
                            onChange={(e) =>
                              setPickQty((p) => ({
                                ...p,
                                [o.productOptionId]: Number(e.target.value),
                              }))
                            }
                            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {QTY_OPTIONS.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => addToCart(o)}
                            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
                          >
                            담기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : optionPool.length > 0 ? (
              <p className="text-sm text-slate-500">
                {searchQ.trim()
                  ? '검색어·드롭다운 조건에 맞는 옵션이 없습니다.'
                  : '선택한 조건에 맞는 옵션이 없습니다.'}
              </p>
            ) : null}
          </div>
        )}
      </SectionCard>

      <SectionCard title="담은 품목">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error && <p className="text-sm text-rose-600">{error}</p>}

          {cart.length === 0 ? null : (
            <div className="overflow-x-auto rounded-md border border-slate-100">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2.5">옵션</th>
                    <th className="px-3 py-2.5">수량</th>
                    <th className="px-3 py-2.5 text-right">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line) => (
                    <tr key={line.productOptionId} className="border-b border-slate-100 even:bg-slate-50/40">
                      <td className="px-3 py-2 text-slate-800">{optionRowLabel(line)}</td>
                      <td className="px-3 py-2">
                        <select
                          value={line.quantity}
                          onChange={(e) =>
                            setCartLineQty(line.productOptionId, Number(e.target.value))
                          }
                          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {QTY_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeCartLine(line.productOptionId)}
                          className="text-xs font-medium text-rose-600 hover:underline"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <label className="block text-sm font-medium text-slate-700">
            메모 (선택)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
            >
              요청하기
            </button>
            <Link
              to="/orders"
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              취소
            </Link>
          </div>
        </form>
      </SectionCard>
    </div>
  )
}
