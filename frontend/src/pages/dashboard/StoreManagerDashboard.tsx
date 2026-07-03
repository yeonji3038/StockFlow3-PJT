import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Package,
  Plus,
  Truck,
} from 'lucide-react'
import { api } from '../../lib/api'
import { getStoreId } from '../../lib/auth'
import { orderStatusDisplayText } from '../../lib/orderLabels'
import type { ProductListItem } from '../../components/product/types'
import type { StoreListItem } from '../../lib/store'
import ErpPageFrame from '../../components/ui/ErpPageFrame'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import {
  ErpDataTable,
  ErpFormCell,
  ErpFormLabel,
  ErpFormRow,
  ErpFormTable,
  ErpGridWrap,
  ErpPrimaryButton,
  ErpSecondaryButton,
  ErpChevronNav,
  ErpToolbar,
} from '../../components/ui/erp/ErpLayout'
import { erpGridCellClass, erpGridHeadClass } from '../../lib/erpUi'
import type { Order, StoreStock, StoreStockHistory } from '../../types/models'

const LOW_STOCK_MAX = 5
const SALES_TREND_DAYS = 7

function lowStockBarColor(quantity: number, minQ: number, maxQ: number): string {
  const t = maxQ === minQ ? 1 : (maxQ - quantity) / (maxQ - minQ)
  const r1 = 254
  const g1 = 202
  const b1 = 202
  const r2 = 185
  const g2 = 28
  const b2 = 28
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r},${g},${b})`
}

function isSaleHistory(row: StoreStockHistory): boolean {
  const type = (row.type ?? '').toUpperCase()
  if (type !== 'OUT') return false
  const reason = (row.reason ?? '').toUpperCase()
  if (reason === 'SALE') return true
  const desc = row.reasonDescription ?? row.typeDescription ?? ''
  return desc.includes('판매')
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function lastNDayKeys(n: number): { key: string; label: string }[] {
  const days: { key: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = localDateKey(d)
    days.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}` })
  }
  return days
}

function formatWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`
}

function formatHistoryDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ko-KR')
}

function historyInOutLabel(row: StoreStockHistory): string {
  if (row.typeDescription) return row.typeDescription
  if (row.type === 'IN') return '입고'
  if (row.type === 'OUT') return '출고'
  return row.type
}

function orderStatusTone(status: string | undefined): string {
  switch (status) {
    case 'REQUESTED':
      return 'font-medium text-blue-700'
    case 'APPROVED':
      return 'font-medium text-amber-800'
    case 'SHIPPED':
      return 'font-medium text-violet-700'
    case 'RECEIVED':
      return 'font-medium text-emerald-700'
    default:
      return 'text-slate-700'
  }
}

type KpiItem = {
  key: string
  label: string
  sub: string
  value: number | string
  tone: 'blue' | 'amber' | 'violet' | 'emerald' | 'slate'
  icon: typeof ClipboardList
  href: string
}

const toneClass: Record<KpiItem['tone'], string> = {
  blue: 'border-blue-300 bg-blue-100/80 text-blue-950',
  amber: 'border-amber-300 bg-amber-100/80 text-amber-950',
  violet: 'border-violet-300 bg-violet-100/80 text-violet-950',
  emerald: 'border-emerald-300 bg-emerald-100/80 text-emerald-950',
  slate: 'border-slate-300 bg-slate-100 text-slate-900',
}

function DashboardKpi({ item, onClick }: { item: KpiItem; onClick: () => void }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex min-h-[5.5rem] w-full flex-col justify-between border p-3 text-left transition hover:brightness-[0.98]',
        toneClass[item.tone],
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">{item.label}</p>
          <p className="mt-0.5 text-[10px] opacity-70">{item.sub}</p>
        </div>
        <Icon className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums leading-none">{item.value}</p>
    </button>
  )
}

export default function StoreManagerDashboard() {
  const navigate = useNavigate()
  const storeId = getStoreId()
  const [storeName, setStoreName] = useState<string | null>(null)
  const [storeNameLoading, setStoreNameLoading] = useState(storeId != null)
  const [stocks, setStocks] = useState<StoreStock[]>([])
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [history, setHistory] = useState<StoreStockHistory[]>([])
  const [ordersUnavailable, setOrdersUnavailable] = useState(false)
  const [historyUnavailable, setHistoryUnavailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (storeId == null) {
      setStoreName(null)
      setStoreNameLoading(false)
      return
    }

    let cancelled = false
    setStoreNameLoading(true)
    ;(async () => {
      try {
        const { data } = await api.get<StoreListItem>(`/api/stores/${storeId}`)
        if (!cancelled) setStoreName(data?.name?.trim() ? data.name.trim() : null)
      } catch {
        if (!cancelled) setStoreName(null)
      } finally {
        if (!cancelled) setStoreNameLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [storeId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        let stocksData: StoreStock[] = []
        if (storeId != null) {
          try {
            const st = await api.get<StoreStock[]>(`/api/stores/${storeId}/stocks`)
            stocksData = Array.isArray(st.data) ? st.data : []
          } catch {
            stocksData = []
          }
        }
        if (cancelled) return
        setStocks(stocksData)

        try {
          const pr = await api.get<ProductListItem[]>('/api/products')
          if (!cancelled) setProducts(Array.isArray(pr.data) ? pr.data : [])
        } catch {
          if (!cancelled) setProducts([])
        }

        let ordList: Order[] = []
        let ordFail = false
        try {
          const ordRes = await api.get<Order[]>('/api/orders')
          ordList = Array.isArray(ordRes.data) ? ordRes.data : []
        } catch {
          ordFail = true
          ordList = []
        }
        if (cancelled) return
        setOrders(ordList)
        setOrdersUnavailable(ordFail)

        let hList: StoreStockHistory[] = []
        let histFail = false
        if (storeId != null) {
          try {
            const hiRes = await api.get<StoreStockHistory[]>(`/api/stock-history/store/${storeId}`)
            hList = Array.isArray(hiRes.data) ? hiRes.data : []
          } catch {
            histFail = true
            hList = []
          }
        }
        if (cancelled) return
        setHistory(hList)
        setHistoryUnavailable(histFail)
      } catch {
        if (!cancelled) setError('데이터를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [storeId])

  const myOrders = useMemo(() => {
    if (storeId == null) return orders
    return orders.filter((o) => o.storeId === storeId)
  }, [orders, storeId])

  const statusCounts = useMemo(() => {
    const c = { REQUESTED: 0, APPROVED: 0, SHIPPED: 0, RECEIVED: 0, REJECTED: 0, CANCELLED: 0 }
    for (const o of myOrders) {
      if (o.status in c) c[o.status as keyof typeof c] += 1
    }
    return c
  }, [myOrders])

  const recentOrders = useMemo(
    () =>
      [...myOrders]
        .sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return tb - ta
        })
        .slice(0, 5),
    [myOrders],
  )

  const lowStoreStock = useMemo(
    () =>
      stocks
        .filter((s) => s.quantity <= LOW_STOCK_MAX)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 8),
    [stocks],
  )

  const lowStockForChart = useMemo(
    () =>
      stocks
        .filter((s) => s.quantity <= LOW_STOCK_MAX)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 12),
    [stocks],
  )

  const salesTrendData = useMemo(() => {
    const days = lastNDayKeys(SALES_TREND_DAYS)
    const totals = new Map(days.map((d) => [d.key, 0]))
    const priceByProductName = new Map(products.map((p) => [p.name, p.price]))

    for (const row of history) {
      if (!isSaleHistory(row)) continue
      if (!row.createdAt) continue
      const parsed = new Date(row.createdAt)
      if (Number.isNaN(parsed.getTime())) continue
      const dateKey = localDateKey(parsed)
      if (!totals.has(dateKey)) continue
      const unitPrice = priceByProductName.get(row.productName) ?? 0
      totals.set(dateKey, (totals.get(dateKey) ?? 0) + row.quantity * unitPrice)
    }

    return days.map((d) => ({
      label: d.label,
      amount: totals.get(d.key) ?? 0,
    }))
  }, [history, products])

  const salesTrendTotal = useMemo(
    () => salesTrendData.reduce((sum, d) => sum + d.amount, 0),
    [salesTrendData],
  )

  const lowStockChartData = useMemo(() => {
    const skuCounts = new Map<string, number>()
    for (const s of lowStockForChart) {
      skuCounts.set(s.skuCode, (skuCounts.get(s.skuCode) ?? 0) + 1)
    }
    return lowStockForChart.map((s) => ({
      skuCode: s.skuCode,
      quantity: s.quantity,
      xLabel: (skuCounts.get(s.skuCode) ?? 0) > 1 ? `${s.skuCode} (${s.productName})` : s.skuCode,
    }))
  }, [lowStockForChart])

  const lowStockQtyRange = useMemo(() => {
    if (lowStockChartData.length === 0) return { minQ: 0, maxQ: 0 }
    const qs = lowStockChartData.map((d) => d.quantity)
    return { minQ: Math.min(...qs), maxQ: Math.max(...qs) }
  }, [lowStockChartData])

  const recentHistory = useMemo(
    () =>
      [...history]
        .sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return tb - ta
        })
        .slice(0, 5),
    [history],
  )

  const storeSubtitle = useMemo(() => {
    if (storeId == null) return '로그인에 매장 정보가 없습니다. 본사에 문의하세요.'
    if (storeName) return storeName
    return `매장 ID ${storeId}`
  }, [storeId, storeName])

  const dashValue = (n: number) => (ordersUnavailable ? '—' : n)

  const kpis: KpiItem[] = [
    {
      key: 'requested',
      label: '발주 요청',
      sub: '본사 승인 대기',
      value: dashValue(statusCounts.REQUESTED),
      tone: 'blue',
      icon: ClipboardList,
      href: '/orders?status=REQUESTED',
    },
    {
      key: 'approved',
      label: '승인됨',
      sub: '출고 대기',
      value: dashValue(statusCounts.APPROVED),
      tone: 'amber',
      icon: CheckCircle2,
      href: '/orders?status=APPROVED',
    },
    {
      key: 'shipped',
      label: '출고됨',
      sub: '매장 입고 대기',
      value: dashValue(statusCounts.SHIPPED),
      tone: 'violet',
      icon: Truck,
      href: '/orders?status=SHIPPED',
    },
    {
      key: 'received',
      label: '입고 완료',
      sub: '처리 완료',
      value: dashValue(statusCounts.RECEIVED),
      tone: 'emerald',
      icon: Package,
      href: '/orders?status=RECEIVED',
    },
  ]

  const pendingCount = statusCounts.REQUESTED + statusCounts.APPROVED + statusCounts.SHIPPED
  const lowStockCount = lowStoreStock.length

  if (error) {
    return (
      <ErpPageFrame title="매장 대시보드">
        <div className="px-3 py-8 text-center text-sm text-rose-600">{error}</div>
      </ErpPageFrame>
    )
  }

  return (
    <ErpPageFrame
      title="매장 대시보드"
      actions={
        <div className="flex w-full flex-wrap items-center gap-1">
          <ErpSecondaryButton onClick={() => navigate('/orders')}>발주 관리</ErpSecondaryButton>
          <ErpSecondaryButton onClick={() => navigate('/store-stock')}>매장 재고</ErpSecondaryButton>
          <ErpPrimaryButton className="ml-auto" onClick={() => navigate('/orders/new')}>
            <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            발주 요청
          </ErpPrimaryButton>
        </div>
      }
    >
      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel>매장</ErpFormLabel>
          <ErpFormCell className="min-w-[12rem]">
            {storeNameLoading ? (
              <LoadingSpinner compact hideLabel />
            ) : (
              <span className="px-1 text-xs font-semibold text-slate-800">{storeSubtitle}</span>
            )}
          </ErpFormCell>
          <ErpFormLabel>처리 필요</ErpFormLabel>
          <ErpFormCell>
            <span
              className={[
                'px-1 text-xs font-medium',
                !ordersUnavailable && pendingCount > 0 ? 'text-amber-800' : 'text-slate-700',
              ].join(' ')}
            >
              {ordersUnavailable ? '—' : `${pendingCount}건`}
            </span>
          </ErpFormCell>
          <ErpFormLabel>저재고</ErpFormLabel>
          <ErpFormCell>
            <span
              className={[
                'px-1 text-xs font-medium',
                storeId != null && lowStockCount > 0 ? 'text-rose-700' : 'text-slate-700',
              ].join(' ')}
            >
              {storeId == null ? '—' : `${lowStockCount} SKU`}
            </span>
          </ErpFormCell>
          <ErpFormLabel>재고 SKU</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-700">
              {storeId == null ? '—' : `${stocks.length}건`}
            </span>
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>

      {loading ? (
        <div className="py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 border-b border-slate-300 lg:grid-cols-4">
            {kpis.map((item) => (
              <DashboardKpi key={item.key} item={item} onClick={() => navigate(item.href)} />
            ))}
          </div>

          {pendingCount > 0 && !ordersUnavailable ? (
            <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                처리가 필요한 발주가 <strong>{pendingCount}건</strong> 있습니다. 승인·출고·입고 상태를
                확인하세요.
              </span>
              <Link to="/orders" className="ml-auto font-medium text-amber-950 underline-offset-2 hover:underline">
                발주 관리
              </Link>
            </div>
          ) : null}

          {storeId != null && lowStockCount > 0 ? (
            <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                수량 {LOW_STOCK_MAX}개 이하 저재고 SKU가 <strong>{lowStockCount}건</strong> 있습니다.
              </span>
              <Link
                to="/store-stock"
                className="ml-auto font-medium text-rose-950 underline-offset-2 hover:underline"
              >
                매장 재고
              </Link>
            </div>
          ) : null}

          <div className="grid border-b border-slate-300 lg:grid-cols-2">
            <div className="border-b border-slate-300 lg:border-b-0 lg:border-r">
              <ErpToolbar>
                <span className="text-xs font-semibold text-slate-700">최근 발주</span>
                <ErpChevronNav className="ml-auto" to="/orders" />
              </ErpToolbar>
              <ErpGridWrap>
                <ErpDataTable minWidth="420px">
                  <thead>
                    <tr>
                      <th className={erpGridHeadClass()}>ID</th>
                      <th className={erpGridHeadClass()}>상태</th>
                      <th className={erpGridHeadClass()}>품목</th>
                      <th className={erpGridHeadClass()}>등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersUnavailable ? (
                      <tr>
                        <td colSpan={4} className={erpGridCellClass('py-8 text-center text-slate-400')}>
                          발주 데이터를 불러오지 못했습니다.
                        </td>
                      </tr>
                    ) : recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={erpGridCellClass('py-8 text-center text-slate-400')}>
                          <p>등록된 발주가 없습니다.</p>
                          <button
                            type="button"
                            onClick={() => navigate('/orders/new')}
                            className="mt-2 text-blue-700 hover:underline"
                          >
                            첫 발주 요청하기
                          </button>
                        </td>
                      </tr>
                    ) : (
                      recentOrders.map((o) => (
                        <tr
                          key={o.id}
                          onClick={() => navigate(`/orders/${o.id}`)}
                          className="cursor-pointer hover:bg-blue-50/60"
                        >
                          <td className={erpGridCellClass('font-mono text-[11px]')}>#{o.id}</td>
                          <td className={erpGridCellClass(orderStatusTone(o.status))}>
                            {orderStatusDisplayText(o)}
                          </td>
                          <td className={erpGridCellClass('tabular-nums')}>{o.items?.length ?? 0}품목</td>
                          <td className={erpGridCellClass('text-[11px] text-slate-500')}>
                            {o.createdAt ? new Date(o.createdAt).toLocaleDateString('ko-KR') : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </ErpDataTable>
              </ErpGridWrap>
            </div>

            <div>
              <ErpToolbar>
                <span className="text-xs font-semibold text-slate-700">저재고 SKU (수량 {LOW_STOCK_MAX} 이하)</span>
                <ErpChevronNav className="ml-auto" to="/store-stock" label="매장 재고" />
              </ErpToolbar>
              <ErpGridWrap>
                <ErpDataTable minWidth="420px">
                  <thead>
                    <tr>
                      <th className={erpGridHeadClass()}>SKU</th>
                      <th className={erpGridHeadClass()}>상품</th>
                      <th className={[erpGridHeadClass(), 'text-right'].join(' ')}>수량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!storeId ? (
                      <tr>
                        <td colSpan={3} className={erpGridCellClass('py-8 text-center text-slate-400')}>
                          매장 정보가 없어 재고를 표시할 수 없습니다.
                        </td>
                      </tr>
                    ) : lowStoreStock.length === 0 ? (
                      <tr>
                        <td colSpan={3} className={erpGridCellClass('py-8 text-center text-slate-400')}>
                          저재고 품목이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      lowStoreStock.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() => navigate(`/store-stock/${storeId}/${s.id}`)}
                          className="cursor-pointer hover:bg-amber-50/60"
                        >
                          <td className={erpGridCellClass('font-mono text-[11px]')}>{s.skuCode}</td>
                          <td className={erpGridCellClass()}>
                            {s.productName}
                            <span className="text-slate-400">
                              {' '}
                              / {s.color} / {s.size}
                            </span>
                          </td>
                          <td className={erpGridCellClass('text-right font-semibold tabular-nums text-amber-800')}>
                            {s.quantity}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </ErpDataTable>
              </ErpGridWrap>
            </div>
          </div>

          <div className="grid border-b border-slate-300 lg:grid-cols-2">
            <div className="border-b border-slate-300 lg:border-b-0 lg:border-r">
              <ErpToolbar>
                <span className="text-xs font-semibold text-slate-700">매출 추이 (최근 {SALES_TREND_DAYS}일)</span>
                <span className="ml-2 text-[11px] text-slate-500">
                  합계 {formatWon(salesTrendTotal)}
                </span>
              </ErpToolbar>
              {storeId == null ? (
                <p className="py-16 text-center text-xs text-slate-400">매장 정보가 없어 매출을 표시할 수 없습니다.</p>
              ) : historyUnavailable ? (
                <p className="py-16 text-center text-xs text-slate-400">입출고 이력을 불러오지 못했습니다.</p>
              ) : (
                <div className="h-52 w-full min-w-0 px-2 py-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesTrendData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                        width={52}
                        tickFormatter={(v) =>
                          typeof v === 'number' && v >= 10000 ? `${Math.round(v / 10000)}만` : String(v)
                        }
                      />
                      <Tooltip
                        formatter={(value) => [formatWon(typeof value === 'number' ? value : 0), '매출']}
                        labelFormatter={(label) => String(label ?? '')}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        name="매출"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ fill: '#2563eb', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div>
              <ErpToolbar>
                <span className="text-xs font-semibold text-slate-700">저재고 SKU 수량</span>
                <ErpChevronNav className="ml-auto" to="/store-stock" label="매장 재고" />
              </ErpToolbar>
              {lowStockChartData.length === 0 ? (
                <p className="py-16 text-center text-xs text-slate-400">표시할 저재고 SKU가 없습니다.</p>
              ) : (
                <div className="h-52 w-full min-w-0 px-2 py-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lowStockChartData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                      <XAxis
                        dataKey="xLabel"
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-28}
                        textAnchor="end"
                        height={48}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                      <Tooltip
                        formatter={(value) => [typeof value === 'number' ? value : 0, '수량']}
                        labelFormatter={(label) => `SKU: ${label}`}
                      />
                      <Bar dataKey="quantity" name="수량" radius={[4, 4, 0, 0]} maxBarSize={36}>
                        {lowStockChartData.map((entry, index) => (
                          <Cell
                            key={`${entry.xLabel}-${index}`}
                            fill={lowStockBarColor(entry.quantity, lowStockQtyRange.minQ, lowStockQtyRange.maxQ)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <ErpToolbar>
            <span className="text-xs font-semibold text-slate-700">최근 입출고 이력</span>
            <ErpChevronNav className="ml-auto" to="/movements" />
          </ErpToolbar>
          <ErpGridWrap maxHeight="max-h-[14rem]">
            <ErpDataTable minWidth="640px">
              <thead>
                <tr>
                  <th className={erpGridHeadClass()}>일시</th>
                  <th className={erpGridHeadClass()}>SKU</th>
                  <th className={erpGridHeadClass()}>상품</th>
                  <th className={erpGridHeadClass()}>구분</th>
                  <th className={[erpGridHeadClass(), 'text-right'].join(' ')}>수량</th>
                </tr>
              </thead>
              <tbody>
                {!storeId ? (
                  <tr>
                    <td colSpan={5} className={erpGridCellClass('py-8 text-center text-slate-400')}>
                      매장 정보가 없어 이력을 표시할 수 없습니다.
                    </td>
                  </tr>
                ) : historyUnavailable ? (
                  <tr>
                    <td colSpan={5} className={erpGridCellClass('py-8 text-center text-slate-400')}>
                      입출고 이력을 불러오지 못했습니다.
                    </td>
                  </tr>
                ) : recentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={erpGridCellClass('py-8 text-center text-slate-400')}>
                      표시할 이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  recentHistory.map((h) => {
                    const inOut = historyInOutLabel(h)
                    return (
                    <tr key={h.id}>
                      <td className={erpGridCellClass('text-[11px] text-slate-500')}>
                        {formatHistoryDate(h.createdAt)}
                      </td>
                      <td className={erpGridCellClass('font-mono text-[11px]')}>{h.skuCode}</td>
                      <td className={erpGridCellClass()}>{h.productName}</td>
                      <td className={erpGridCellClass()}>
                        <span
                          className={
                            inOut === '입고'
                              ? 'font-medium text-emerald-700'
                              : inOut === '출고'
                                ? 'font-medium text-violet-700'
                                : 'text-slate-700'
                          }
                        >
                          {inOut}
                        </span>
                      </td>
                      <td className={erpGridCellClass('text-right tabular-nums font-medium')}>{h.quantity}</td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </ErpDataTable>
          </ErpGridWrap>
        </>
      )}
    </ErpPageFrame>
  )
}
