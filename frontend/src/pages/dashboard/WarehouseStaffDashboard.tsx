import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { allocationStatusLabel } from '../../lib/allocationLabels'
import { getWarehouseId } from '../../lib/auth'
import { resolveDefaultWarehouseId } from '../../lib/warehouseContext'
import StatCard from '../../components/ui/StatCard'
import SectionCard from '../../components/ui/SectionCard'
import ErpPageFrame from '../../components/ui/ErpPageFrame'
import { ErpChevronNav } from '../../components/ui/erp/ErpLayout'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import type { Allocation, Order, StoreStockHistory, WarehouseStock } from '../../types/models'
import { filterApprovedOrders } from '../../lib/orderLabels'
import {
  isWarehouseLowStock,
  warehouseAvailableQty,
  WAREHOUSE_LOW_STOCK_MAX,
} from '../../lib/warehouseStock'

function formatHistoryDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ko-KR')
}

function historyInOutLabel(row: StoreStockHistory): string {
  if (row.typeDescription) return row.typeDescription
  const t = row.type
  if (t === 'IN') return '입고'
  if (t === 'OUT') return '출고'
  return row.type || '—'
}

export default function WarehouseStaffDashboard() {
  const navigate = useNavigate()
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [stocks, setStocks] = useState<WarehouseStock[]>([])
  const [history, setHistory] = useState<StoreStockHistory[]>([])
  const [historyFail, setHistoryFail] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      setHistoryFail(false)
      try {
        const fromAuth = getWarehouseId()
        const wid = fromAuth ?? (await resolveDefaultWarehouseId())
        if (cancelled) return
        setWarehouseId(wid)

        const allocP = api.get<Allocation[]>('/api/allocations').catch(() => ({ data: [] as Allocation[] }))
        const ordersP = api.get<Order[]>('/api/orders').catch(() => ({ data: [] as Order[] }))
        const stocksP =
          wid != null
            ? api.get<WarehouseStock[]>(`/api/warehouses/${wid}/stocks`).catch(() => ({ data: [] as WarehouseStock[] }))
            : Promise.resolve({ data: [] as WarehouseStock[] })
        const histP =
          wid != null
            ? api
                .get<StoreStockHistory[]>(`/api/stock-history/warehouse/${wid}`)
                .catch(() => ({ data: null as StoreStockHistory[] | null }))
            : Promise.resolve({ data: [] as StoreStockHistory[] })

        const [allocRes, ordersRes, stocksRes, histRes] = await Promise.all([allocP, ordersP, stocksP, histP])
        if (cancelled) return

        let allAlloc = Array.isArray(allocRes.data) ? allocRes.data : []
        if (wid != null) {
          allAlloc = allAlloc.filter((a) => a.warehouseId === wid)
        }
        setAllocations(allAlloc)
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : [])

        setStocks(Array.isArray(stocksRes.data) ? stocksRes.data : [])

        if (histRes.data === null) {
          setHistory([])
          setHistoryFail(true)
        } else {
          setHistory(Array.isArray(histRes.data) ? histRes.data : [])
        }
      } catch {
        if (!cancelled) setError('데이터를 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const totalSkuRows = stocks.length

  const lowStocks = useMemo(
    () =>
      stocks
        .filter((s) => isWarehouseLowStock(s))
        .sort((a, b) => warehouseAvailableQty(a) - warehouseAvailableQty(b)),
    [stocks],
  )
  const lowStockCount = lowStocks.length
  const lowWarehousePreview = useMemo(() => lowStocks.slice(0, 12), [lowStocks])

  const approvedAllocations = useMemo(
    () => allocations.filter((a) => a.status === 'APPROVED'),
    [allocations],
  )
  const approvedPreview = useMemo(() => approvedAllocations.slice(0, 10), [approvedAllocations])

  const approvedOrders = useMemo(() => filterApprovedOrders(orders), [orders])
  const approvedOrdersPreview = useMemo(() => approvedOrders.slice(0, 10), [approvedOrders])

  const recentHistory = useMemo(() => {
    return [...history]
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })
      .slice(0, 5)
  }, [history])

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>
  }

  return (
    <ErpPageFrame title="창고 대시보드">
      <div className="grid gap-0 border-b border-slate-300 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="창고 재고 현황"
          value={warehouseId == null ? '—' : totalSkuRows}
          hint={warehouseId == null ? '창고 미지정' : '등록된 옵션(SKU) 행 수'}
          onClick={() => navigate('/warehouse-stock')}
        />
        <StatCard
          title="저재고 SKU"
          value={warehouseId == null ? '—' : lowStockCount}
          hint={`가용재고 ${WAREHOUSE_LOW_STOCK_MAX} 이하`}
          tone={lowStockCount > 0 ? 'rose' : 'default'}
          onClick={() => navigate('/warehouse-stock')}
        />
        <StatCard
          title="출고 대기 배분"
          value={warehouseId == null ? '—' : approvedAllocations.length}
          hint="APPROVED"
          tone="amber"
          onClick={() => navigate('/allocations')}
        />
        <StatCard
          title="출고 대기 발주"
          value={approvedOrders.length}
          hint="APPROVED"
          tone={approvedOrders.length > 0 ? 'amber' : 'default'}
          onClick={() => navigate('/warehouse-orders')}
        />
      </div>

      <div className="grid gap-0 lg:grid-cols-3">
        <SectionCard
          embedded
          title="저재고 SKU"
          description={`가용재고 ${WAREHOUSE_LOW_STOCK_MAX} 이하 품목입니다.`}
          headerRight={
            <Link to="/warehouse-stock" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              창고 재고
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2">상품</th>
                  <th className="px-2 py-2 text-right">가용재고</th>
                </tr>
              </thead>
              <tbody>
                {warehouseId == null ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-6 text-center text-slate-400">
                      창고를 확인할 수 없습니다.
                    </td>
                  </tr>
                ) : lowWarehousePreview.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-6 text-center text-slate-400">
                      저재고 품목이 없습니다.
                    </td>
                  </tr>
                ) : (
                  lowWarehousePreview.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-blue-50/40"
                    >
                      <td className="px-2 py-2 font-mono text-xs text-slate-600">{s.skuCode}</td>
                      <td className="px-2 py-2 text-slate-800">
                        {s.productName}
                        <span className="text-slate-400">
                          {' '}
                          / {s.color} / {s.size}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-medium tabular-nums text-rose-700">
                        {warehouseAvailableQty(s)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          embedded
          title="출고 대기 배분"
          description="승인(APPROVED)된 배분만 표시합니다."
          headerRight={
            <Link to="/allocations" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              배분 관리
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">번호</th>
                  <th className="px-2 py-2">매장</th>
                  <th className="px-2 py-2">상태</th>
                  <th className="px-2 py-2">품목 수</th>
                </tr>
              </thead>
              <tbody>
                {approvedPreview.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-8 text-center text-slate-400">
                      출고 대기 건이 없습니다.
                    </td>
                  </tr>
                ) : (
                  approvedPreview.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-blue-50/40"
                    >
                      <td className="px-2 py-2 font-mono text-xs text-slate-600">{a.id}</td>
                      <td className="px-2 py-2 text-slate-800">{a.storeName}</td>
                      <td className="px-2 py-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {allocationStatusLabel(a.status)}
                        </span>
                      </td>
                      <td className="px-2 py-2 tabular-nums text-slate-700">{a.items?.length ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          embedded
          title="출고 대기 발주"
          description="본사 승인(APPROVED)된 발주입니다."
          headerRight={
            <Link to="/warehouse-orders" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              발주 출고
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">번호</th>
                  <th className="px-2 py-2">매장</th>
                  <th className="px-2 py-2 text-right">품목 수</th>
                </tr>
              </thead>
              <tbody>
                {approvedOrdersPreview.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-8 text-center text-slate-400">
                      출고 대기 발주가 없습니다.
                    </td>
                  </tr>
                ) : (
                  approvedOrdersPreview.map((o) => (
                    <tr
                      key={o.id}
                      className="cursor-pointer border-b border-slate-100 even:bg-slate-50/50 hover:bg-blue-50/40"
                      onClick={() => navigate('/warehouse-orders')}
                    >
                      <td className="px-2 py-2 font-mono text-xs text-slate-600">{o.id}</td>
                      <td className="px-2 py-2 text-slate-800">{o.storeName}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                        {o.items?.length ?? 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        embedded
        title="최근 입출고 이력"
        description="창고 기준 최근 5건입니다."
        headerRight={<ErpChevronNav to="/movements" />}
      >
        {warehouseId == null ? (
          <p className="text-sm text-slate-500">창고 ID가 없어 이력을 불러올 수 없습니다.</p>
        ) : historyFail ? (
          <p className="text-sm text-slate-500">입출고 이력을 불러오지 못했습니다.</p>
        ) : recentHistory.length === 0 ? (
          <p className="text-sm text-slate-500">표시할 이력이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">날짜</th>
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2">상품명</th>
                  <th className="px-2 py-2">입고/출고</th>
                  <th className="px-2 py-2 text-right">수량</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.map((h) => (
                  <tr key={h.id} className="border-b border-slate-100 even:bg-slate-50/50">
                    <td className="px-2 py-2 text-xs text-slate-600">{formatHistoryDate(h.createdAt)}</td>
                    <td className="px-2 py-2 font-mono text-xs text-slate-700">{h.skuCode}</td>
                    <td className="px-2 py-2 text-slate-800">{h.productName}</td>
                    <td className="px-2 py-2 text-slate-700">{historyInOutLabel(h)}</td>
                    <td className="px-2 py-2 text-right font-medium tabular-nums text-slate-900">
                      {h.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </ErpPageFrame>
  )
}
