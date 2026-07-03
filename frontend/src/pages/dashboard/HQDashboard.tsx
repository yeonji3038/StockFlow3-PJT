import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Cell,
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
  Truck,
} from 'lucide-react'
import { api } from '../../lib/api'
import { allocationStatusLabel } from '../../lib/allocationLabels'
import { anomalyReasonLabel } from '../../lib/anomalyLabels'
import { orderStatusDisplayText } from '../../lib/orderLabels'
import ErpPageFrame from '../../components/ui/ErpPageFrame'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import {
  ErpChevronNav,
  ErpDataTable,
  ErpFormCell,
  ErpFormLabel,
  ErpFormRow,
  ErpFormTable,
  ErpGridWrap,
  ErpSecondaryButton,
  ErpToolbar,
} from '../../components/ui/erp/ErpLayout'
import { erpGridCellClass, erpGridHeadClass } from '../../lib/erpUi'
import type { AnomalyAlert, Allocation, Order, WarehouseStock, WarehouseSummary } from '../../types/models'
import { useStockStore } from '../../stores/stockStore'
import {
  isWarehouseLowStock,
  warehouseAvailableQty,
  WAREHOUSE_LOW_STOCK_MAX,
} from '../../lib/warehouseStock'

const LOW_STOCK_MAX = WAREHOUSE_LOW_STOCK_MAX

const ALLOCATION_STATUS_ORDER = [
  'REQUESTED',
  'APPROVED',
  'SHIPPED',
  'RECEIVED',
  'CANCELLED',
] as const

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

export default function HQDashboard() {
  const navigate = useNavigate()
  const dashboardRefreshTrigger = useStockStore((s) => s.dashboardRefreshTrigger)
  const hasFetchedOnce = useRef(false)
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [lowStock, setLowStock] = useState<WarehouseStock[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [orderCount, setOrderCount] = useState<number | null>(null)
  const [ordersUnavailable, setOrdersUnavailable] = useState(false)
  const [anomalyAlerts, setAnomalyAlerts] = useState<AnomalyAlert[]>([])
  const [anomalyUnavailable, setAnomalyUnavailable] = useState(false)
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const silent = hasFetchedOnce.current && dashboardRefreshTrigger > 0
    ;(async () => {
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const [allocRes, whRes] = await Promise.all([
          api.get<Allocation[]>('/api/allocations'),
          api.get<WarehouseSummary[]>('/api/warehouses'),
        ])
        if (cancelled) return
        setAllocations(allocRes.data ?? [])

        const warehouses = whRes.data ?? []
        const stockLists = await Promise.all(
          warehouses.map((w) =>
            api
              .get<WarehouseStock[]>(`/api/warehouses/${w.id}/stocks`)
              .then((r) => r.data ?? [])
              .catch(() => [] as WarehouseStock[]),
          ),
        )
        if (cancelled) return
        const merged = stockLists.flat()
        const low = merged
          .filter((s) => isWarehouseLowStock(s))
          .sort((a, b) => warehouseAvailableQty(a) - warehouseAvailableQty(b))
          .slice(0, 12)
        setLowStock(low)

        try {
          const ord = await api.get<Order[]>('/api/orders')
          const list = Array.isArray(ord.data) ? ord.data : []
          if (!cancelled) {
            setOrders(list)
            setOrderCount(list.length)
            setOrdersUnavailable(false)
          }
        } catch {
          if (!cancelled) {
            setOrders([])
            setOrdersUnavailable(true)
            setOrderCount(null)
          }
        }

        try {
          const anomalyRes = await api.get<AnomalyAlert[]>('/api/anomaly-alerts', {
            params: { unresolvedOnly: true },
          })
          if (!cancelled) {
            setAnomalyAlerts(Array.isArray(anomalyRes.data) ? anomalyRes.data : [])
            setAnomalyUnavailable(false)
          }
        } catch {
          if (!cancelled) {
            setAnomalyAlerts([])
            setAnomalyUnavailable(true)
          }
        }
      } catch {
        if (!cancelled) setError('데이터를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) {
          if (!silent) setLoading(false)
          hasFetchedOnce.current = true
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dashboardRefreshTrigger])

  const statusCounts = useMemo(() => {
    const counts = { REQUESTED: 0, APPROVED: 0, SHIPPED: 0, RECEIVED: 0 }
    for (const a of allocations) {
      if (a.status in counts) counts[a.status as keyof typeof counts] += 1
    }
    return counts
  }, [allocations])

  const statusSummary = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of allocations) {
      map.set(a.status, (map.get(a.status) ?? 0) + 1)
    }
    return map
  }, [allocations])

  const statusChartData = useMemo(
    () =>
      ALLOCATION_STATUS_ORDER.map((status) => ({
        status,
        label: allocationStatusLabel(status),
        count: statusSummary.get(status) ?? 0,
      })),
    [statusSummary],
  )

  const lowStockChartData = useMemo(() => {
    const skuCounts = new Map<string, number>()
    for (const s of lowStock) {
      skuCounts.set(s.skuCode, (skuCounts.get(s.skuCode) ?? 0) + 1)
    }
    return lowStock.map((s) => ({
      skuCode: s.skuCode,
      quantity: warehouseAvailableQty(s),
      xLabel: (skuCounts.get(s.skuCode) ?? 0) > 1 ? `${s.skuCode} (${s.warehouseName})` : s.skuCode,
    }))
  }, [lowStock])

  const lowStockQtyRange = useMemo(() => {
    if (lowStockChartData.length === 0) return { minQ: 0, maxQ: 0 }
    const qs = lowStockChartData.map((d) => d.quantity)
    return { minQ: Math.min(...qs), maxQ: Math.max(...qs) }
  }, [lowStockChartData])

  const pendingAllocations = useMemo(
    () =>
      allocations.filter((a) => a.status === 'REQUESTED' || a.status === 'APPROVED').slice(0, 8),
    [allocations],
  )

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return tb - ta
        })
        .slice(0, 8),
    [orders],
  )

  const pendingAllocationCount = statusCounts.REQUESTED + statusCounts.APPROVED

  const kpis: KpiItem[] = [
    {
      key: 'REQUESTED',
      label: '요청',
      sub: '배분 요청',
      value: statusCounts.REQUESTED,
      tone: 'blue',
      icon: ClipboardList,
      href: '/allocations?status=REQUESTED',
    },
    {
      key: 'APPROVED',
      label: '승인',
      sub: '승인 완료',
      value: statusCounts.APPROVED,
      tone: 'amber',
      icon: CheckCircle2,
      href: '/allocations?status=APPROVED',
    },
    {
      key: 'SHIPPED',
      label: '출고',
      sub: '출고 처리',
      value: statusCounts.SHIPPED,
      tone: 'violet',
      icon: Truck,
      href: '/allocations?status=SHIPPED',
    },
    {
      key: 'RECEIVED',
      label: '입고완료',
      sub: '매장 입고',
      value: statusCounts.RECEIVED,
      tone: 'emerald',
      icon: Package,
      href: '/allocations?status=RECEIVED',
    },
  ]

  const handleResolveAlert = async (id: number) => {
    setResolvingId(id)
    try {
      await api.patch(`/api/anomaly-alerts/${id}/resolve`)
      setAnomalyAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch {
      // 다음 새로고침 때 재시도
    } finally {
      setResolvingId(null)
    }
  }

  if (error) {
    return (
      <ErpPageFrame title="본사 대시보드">
        <div className="px-3 py-8 text-center text-sm text-rose-600">{error}</div>
      </ErpPageFrame>
    )
  }

  return (
    <ErpPageFrame
      title="본사 대시보드"
      actions={
        <div className="flex w-full flex-wrap items-center gap-1">
          <ErpSecondaryButton onClick={() => navigate('/allocations')}>배분 관리</ErpSecondaryButton>
          <ErpSecondaryButton onClick={() => navigate('/orders')}>발주 관리</ErpSecondaryButton>
          <ErpSecondaryButton className="ml-auto" onClick={() => navigate('/warehouse-stock')}>
            창고 재고
          </ErpSecondaryButton>
        </div>
      }
    >
      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel>배분</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-700">{allocations.length}건</span>
          </ErpFormCell>
          <ErpFormLabel>처리 대기</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-700">{pendingAllocationCount}건</span>
          </ErpFormCell>
          <ErpFormLabel>발주 요청</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-700">
              {ordersUnavailable ? '—' : `${orderCount ?? 0}건`}
            </span>
          </ErpFormCell>
          <ErpFormLabel>저재고</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-700">{lowStock.length} SKU</span>
          </ErpFormCell>
          <ErpFormLabel>이상탐지</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-700">
              {anomalyUnavailable ? '—' : `${anomalyAlerts.length}건`}
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

          {pendingAllocationCount > 0 ? (
            <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                처리가 필요한 배분이 <strong>{pendingAllocationCount}건</strong> 있습니다.
              </span>
              <Link
                to="/allocations?status=REQUESTED,APPROVED"
                className="ml-auto font-medium text-amber-950 underline-offset-2 hover:underline"
              >
                배분 관리
              </Link>
            </div>
          ) : null}

          {anomalyAlerts.length > 0 ? (
            <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                미확인 이상탐지 알림이 <strong>{anomalyAlerts.length}건</strong> 있습니다.
              </span>
            </div>
          ) : null}

          <div className="grid border-b border-slate-300 lg:grid-cols-2">
            <div className="border-b border-slate-300 lg:border-b-0 lg:border-r">
              <ErpToolbar>
                <span className="text-xs font-semibold text-slate-700">처리 대기 배분</span>
                <ErpChevronNav className="ml-auto" to="/allocations" />
              </ErpToolbar>
              <ErpGridWrap>
                <ErpDataTable minWidth="420px">
                  <thead>
                    <tr>
                      <th className={erpGridHeadClass()}>번호</th>
                      <th className={erpGridHeadClass()}>창고</th>
                      <th className={erpGridHeadClass()}>매장</th>
                      <th className={erpGridHeadClass()}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAllocations.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={erpGridCellClass('py-8 text-center text-slate-400')}>
                          대기 중인 배분이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      pendingAllocations.map((a) => (
                        <tr
                          key={a.id}
                          onClick={() => navigate(`/allocations/${a.id}`)}
                          className="cursor-pointer hover:bg-blue-50/60"
                        >
                          <td className={erpGridCellClass('font-mono text-[11px]')}>#{a.id}</td>
                          <td className={erpGridCellClass()}>{a.warehouseName}</td>
                          <td className={erpGridCellClass()}>{a.storeName}</td>
                          <td className={erpGridCellClass()}>{allocationStatusLabel(a.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </ErpDataTable>
              </ErpGridWrap>
            </div>

            <div>
              <ErpToolbar>
                <span className="text-xs font-semibold text-slate-700">
                  창고 저재고 (가용재고 {LOW_STOCK_MAX} 이하)
                </span>
                <ErpChevronNav className="ml-auto" to="/warehouse-stock" label="창고 재고" />
              </ErpToolbar>
              <ErpGridWrap>
                <ErpDataTable minWidth="420px">
                  <thead>
                    <tr>
                      <th className={erpGridHeadClass()}>창고</th>
                      <th className={erpGridHeadClass()}>SKU</th>
                      <th className={erpGridHeadClass()}>상품</th>
                      <th className={[erpGridHeadClass(), 'text-right'].join(' ')}>가용재고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={erpGridCellClass('py-8 text-center text-slate-400')}>
                          저재고 품목이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      lowStock.slice(0, 8).map((s) => (
                        <tr
                          key={`${s.warehouseId}-${s.id}`}
                          onClick={() => navigate('/warehouse-stock')}
                          className="cursor-pointer hover:bg-amber-50/60"
                        >
                          <td className={erpGridCellClass()}>{s.warehouseName}</td>
                          <td className={erpGridCellClass('font-mono text-[11px]')}>{s.skuCode}</td>
                          <td className={erpGridCellClass()}>
                            {s.productName}
                            <span className="text-slate-400">
                              {' '}
                              / {s.color} / {s.size}
                            </span>
                          </td>
                          <td className={erpGridCellClass('text-right font-semibold tabular-nums text-rose-700')}>
                            {warehouseAvailableQty(s)}
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
                <span className="text-xs font-semibold text-slate-700">배분 상태별 현황</span>
              </ErpToolbar>
              <div className="h-52 w-full min-w-0 px-2 py-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                    <Tooltip
                      formatter={(value) => [`${typeof value === 'number' ? value : 0}건`, '건수']}
                      labelFormatter={(label) => String(label ?? '')}
                    />
                    <Bar dataKey="count" name="건수" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <ErpToolbar>
                <span className="text-xs font-semibold text-slate-700">저재고 SKU 가용재고</span>
                <ErpChevronNav className="ml-auto" to="/warehouse-stock" label="창고 재고" />
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
                      <Bar dataKey="quantity" name="가용재고" radius={[4, 4, 0, 0]} maxBarSize={36}>
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

          <div className="grid lg:grid-cols-2">
            <div className="border-b border-slate-300 lg:border-b-0 lg:border-r">
              <ErpToolbar>
                <span className="text-xs font-semibold text-slate-700">최근 발주</span>
                <ErpChevronNav className="ml-auto" to="/orders" />
              </ErpToolbar>
              <ErpGridWrap>
                <ErpDataTable minWidth="480px">
                  <thead>
                    <tr>
                      <th className={erpGridHeadClass()}>ID</th>
                      <th className={erpGridHeadClass()}>매장</th>
                      <th className={erpGridHeadClass()}>상태</th>
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
                          등록된 발주가 없습니다.
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
                          <td className={erpGridCellClass()}>{o.storeName}</td>
                          <td className={erpGridCellClass()}>{orderStatusDisplayText(o)}</td>
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
                <span className="text-xs font-semibold text-slate-700">이상탐지 알림</span>
                <ErpChevronNav className="ml-auto" to="/anomaly-alerts" label="전체 보기" />
              </ErpToolbar>
              <ErpGridWrap maxHeight="max-h-72">
                <ErpDataTable minWidth="480px">
                  <thead>
                    <tr>
                      <th className={erpGridHeadClass()}>매장</th>
                      <th className={erpGridHeadClass()}>SKU</th>
                      <th className={erpGridHeadClass()}>사유</th>
                      <th className={[erpGridHeadClass(), 'text-right'].join(' ')}>점수</th>
                      <th className={erpGridHeadClass()} />
                    </tr>
                  </thead>
                  <tbody>
                    {anomalyUnavailable ? (
                      <tr>
                        <td colSpan={5} className={erpGridCellClass('py-8 text-center text-slate-400')}>
                          이상탐지 알림을 불러오지 못했습니다.
                        </td>
                      </tr>
                    ) : anomalyAlerts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={erpGridCellClass('py-8 text-center text-slate-400')}>
                          미확인 알림이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      anomalyAlerts.slice(0, 8).map((a) => (
                        <tr key={a.id} className="hover:bg-rose-50/40">
                          <td className={erpGridCellClass()}>{a.storeName ?? `매장 #${a.storeId}`}</td>
                          <td className={erpGridCellClass('font-mono text-[11px]')}>{a.skuCode ?? '—'}</td>
                          <td className={erpGridCellClass()}>{anomalyReasonLabel(a.reason)}</td>
                          <td className={erpGridCellClass('text-right font-semibold tabular-nums text-rose-700')}>
                            {a.anomalyScore.toFixed(1)}
                          </td>
                          <td className={erpGridCellClass('text-right')}>
                            <button
                              type="button"
                              onClick={() => void handleResolveAlert(a.id)}
                              disabled={resolvingId === a.id}
                              className="text-[11px] text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              {resolvingId === a.id ? '처리 중…' : '확인'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </ErpDataTable>
              </ErpGridWrap>
            </div>
          </div>
        </>
      )}
    </ErpPageFrame>
  )
}
