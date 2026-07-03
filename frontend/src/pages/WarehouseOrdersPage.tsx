import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { getRole } from '../lib/auth'
import SectionCard from '../components/ui/SectionCard'
import ErpPageFrame, { ErpAccessDenied } from '../components/ui/ErpPageFrame'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { filterApprovedOrders, formatOrderApprovedAt } from '../lib/orderLabels'
import { useStockStore } from '../stores/stockStore'
import type { Order } from '../types/models'

export default function WarehouseOrdersPage() {
  const role = getRole()
  const orderRefreshTrigger = useStockStore((s) => s.orderRefreshTrigger)
  const hasFetchedOnce = useRef(false)
  const selectAllRef = useRef<HTMLInputElement>(null)

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [shippingIds, setShippingIds] = useState<number[]>([])

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const { data } = await api.get<Order[]>('/api/orders')
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      if (!silent) setError('발주 목록을 불러오지 못했습니다.')
    } finally {
      if (!silent) setLoading(false)
      hasFetchedOnce.current = true
    }
  }, [])

  useEffect(() => {
    void load(false)
  }, [load])

  useEffect(() => {
    if (orderRefreshTrigger === 0 || !hasFetchedOnce.current) return
    void load(true)
  }, [orderRefreshTrigger, load])

  const approvedOrders = useMemo(() => filterApprovedOrders(orders), [orders])
  const approvedOrderIds = useMemo(() => approvedOrders.map((o) => o.id), [approvedOrders])

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => approvedOrderIds.includes(id)))
  }, [approvedOrderIds])

  const allSelected =
    approvedOrderIds.length > 0 && approvedOrderIds.every((id) => selectedIds.includes(id))
  const someSelected = selectedIds.length > 0 && !allSelected
  const isBusy = shippingIds.length > 0

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds([...approvedOrderIds])
    }
  }

  const toggleOne = (orderId: number) => {
    setSelectedIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    )
  }

  const removeShipped = (ids: number[]) => {
    const idSet = new Set(ids)
    setOrders((prev) => prev.filter((o) => !idSet.has(o.id)))
    setSelectedIds((prev) => prev.filter((id) => !idSet.has(id)))
  }

  const shipOrders = async (ids: number[], confirmMessage: string) => {
    if (isBusy || ids.length === 0) return
    if (!window.confirm(confirmMessage)) return

    setActionError(null)
    setShippingIds(ids)
    const succeeded: number[] = []
    const failed: number[] = []

    for (const id of ids) {
      try {
        await api.patch<Order>(`/api/orders/${id}/ship`)
        succeeded.push(id)
      } catch {
        failed.push(id)
      }
    }

    if (succeeded.length > 0) removeShipped(succeeded)
    if (failed.length > 0) {
      setActionError(
        failed.length === 1
          ? `발주 #${failed[0]} 출고 처리에 실패했습니다.`
          : `${failed.length}건 출고 처리에 실패했습니다.`,
      )
    }
    setShippingIds([])
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  const shipSelected = () => {
    void shipOrders(selectedIds, `선택한 ${selectedIds.length}건을 출고 완료 처리할까요?`)
  }

  const shipButtonLabel =
    isBusy && selectedIds.some((id) => shippingIds.includes(id)) ? '처리 중…' : '출고 완료'

  if (role !== 'WAREHOUSE_STAFF' && role !== 'HQ_STAFF') {
    return (
      <ErpAccessDenied
        title="발주 출고"
        message="창고 담당 또는 본사(HQ) 권한에서만 접근할 수 있습니다."
      />
    )
  }

  return (
    <ErpPageFrame title="발주 출고">
      <SectionCard embedded title="출고 대기 발주">
        {actionError ? <p className="mb-3 text-sm text-rose-600">{actionError}</p> : null}
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : approvedOrders.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">출고 대기 중인 발주가 없습니다.</p>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 px-2 py-1.5">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={isBusy}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                전체 선택
              </label>
              <button
                type="button"
                onClick={clearSelection}
                disabled={isBusy || selectedIds.length === 0}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                선택 삭제
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="w-10 px-3 py-2.5" aria-hidden />
                    <th className="px-3 py-2.5">발주번호</th>
                    <th className="px-3 py-2.5">매장명</th>
                    <th className="px-3 py-2.5">SKU</th>
                    <th className="px-3 py-2.5">상품명</th>
                    <th className="px-3 py-2.5">색상/사이즈</th>
                    <th className="px-3 py-2.5 text-right">수량</th>
                    <th className="px-3 py-2.5">승인일</th>
                  </tr>
                </thead>
              <tbody>
                {approvedOrders.map((order) => {
                  const items = order.items ?? []
                  const checked = selectedIds.includes(order.id)

                  if (items.length === 0) {
                    return (
                      <tr key={order.id} className="border-b border-slate-100 even:bg-slate-50/40">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOne(order.id)}
                            disabled={isBusy}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            aria-label={`발주 ${order.id} 선택`}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{order.id}</td>
                        <td className="px-3 py-2 text-slate-800">{order.storeName}</td>
                        <td colSpan={3} className="px-3 py-2 text-slate-400">
                          품목 없음
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">—</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{formatOrderApprovedAt(order)}</td>
                      </tr>
                    )
                  }

                  return items.map((item, idx) => (
                    <tr
                      key={`${order.id}-${item.id}`}
                      className={[
                        'border-b border-slate-100 even:bg-slate-50/40 hover:bg-blue-50/30',
                        checked ? 'bg-blue-50/40' : '',
                      ].join(' ')}
                    >
                      {idx === 0 ? (
                        <>
                          <td rowSpan={items.length} className="border-r border-slate-100 px-3 py-2 align-top">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOne(order.id)}
                              disabled={isBusy}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              aria-label={`발주 ${order.id} 선택`}
                            />
                          </td>
                          <td
                            rowSpan={items.length}
                            className="border-r border-slate-100 px-3 py-2 align-top font-mono text-xs text-slate-600"
                          >
                            {order.id}
                          </td>
                          <td
                            rowSpan={items.length}
                            className="border-r border-slate-100 px-3 py-2 align-top text-slate-800"
                          >
                            {order.storeName}
                          </td>
                        </>
                      ) : null}
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{item.skuCode}</td>
                      <td className="px-3 py-2 text-slate-800">{item.productName}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {item.color} / {item.size}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">
                        {item.quantity}
                      </td>
                      {idx === 0 ? (
                        <td
                          rowSpan={items.length}
                          className="border-l border-slate-100 px-3 py-2 align-top text-xs text-slate-500"
                        >
                          {formatOrderApprovedAt(order)}
                        </td>
                      ) : null}
                    </tr>
                  ))
                })}
              </tbody>
            </table>
            </div>
            <div className="flex justify-end border-t border-slate-200 px-3 py-2.5">
              <button
                type="button"
                onClick={() => shipSelected()}
                disabled={isBusy || selectedIds.length === 0}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {shipButtonLabel}
              </button>
            </div>
          </>
        )}
      </SectionCard>
    </ErpPageFrame>
  )
}
