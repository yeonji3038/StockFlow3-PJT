import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { getRole, getStoreId } from '../lib/auth'
import {
  canStoreReceiveOrder,
  orderStatusDisplayText,
  orderStatusLabel,
  sortOrdersByStatusPriority,
} from '../lib/orderLabels'
import SectionCard from '../components/ui/SectionCard'
import ErpPageFrame from '../components/ui/ErpPageFrame'
import TablePaginationBar from '../components/ui/TablePaginationBar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useTablePagination } from '../hooks/useTablePagination'
import type { Order } from '../types/models'
import { useStockStore } from '../stores/stockStore'

const ORDER_STATUS_QUERY = ['REQUESTED', 'APPROVED', 'SHIPPED', 'RECEIVED'] as const

export default function OrdersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const role = getRole()
  const myStoreId = getStoreId()
  const isStoreManager = role === 'STORE_MANAGER'
  const orderRefreshTrigger = useStockStore((s) => s.orderRefreshTrigger)
  const hasFetchedOnce = useRef(false)
  const selectAllRef = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [store, setStore] = useState<number | 'ALL'>(() => {
    if (role === 'STORE_MANAGER' && myStoreId != null) return myStoreId
    return 'ALL'
  })
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [receivingIds, setReceivingIds] = useState<number[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionInfo, setActionInfo] = useState<string | null>(null)

  useEffect(() => {
    const s = searchParams.get('status')
    if (s && (ORDER_STATUS_QUERY as readonly string[]).includes(s)) {
      setStatus(s)
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    const silent = hasFetchedOnce.current && orderRefreshTrigger > 0
    ;(async () => {
      if (!silent) {
        setLoading(true)
        setUnavailable(false)
      }
      try {
        const { data } = await api.get<Order[]>('/api/orders')
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) {
          setUnavailable(true)
          setRows([])
        }
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
  }, [orderRefreshTrigger, isStoreManager, myStoreId])

  const filterOptions = useMemo(() => {
    const stores = new Map<number, string>()
    const statuses = new Set<string>()
    for (const o of rows) {
      if (typeof o.storeId === 'number') stores.set(o.storeId, o.storeName ?? String(o.storeId))
      if (o.status) statuses.add(o.status)
    }
    return {
      stores: Array.from(stores.entries()).sort((a, b) => a[1].localeCompare(b[1], 'ko-KR')),
      statuses: Array.from(statuses).sort((a, b) => a.localeCompare(b, 'ko-KR')),
    }
  }, [rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = rows.filter((o) => {
      if (status !== 'ALL' && o.status !== status) return false
      if (store !== 'ALL' && o.storeId !== store) return false
      if (!needle) return true

      const hay = [
        o.storeName,
        o.status,
        o.statusDescription,
        o.requestedByName,
        o.approvedByName,
        o.note,
        ...(o.items ?? []).flatMap((it) => [it.skuCode, it.productName, it.color, it.size]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return hay.includes(needle)
    })
    return sortOrdersByStatusPriority(list)
  }, [rows, q, status, store])

  const receivableInFiltered = useMemo(
    () => filtered.filter((o) => canStoreReceiveOrder(o, role, myStoreId)),
    [filtered, role, myStoreId],
  )
  const receivableIds = useMemo(
    () => receivableInFiltered.map((o) => o.id),
    [receivableInFiltered],
  )

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => receivableIds.includes(id)))
  }, [receivableIds])

  const allReceivableSelected =
    receivableIds.length > 0 && receivableIds.every((id) => selectedIds.includes(id))
  const someReceivableSelected = selectedIds.length > 0 && !allReceivableSelected
  const isBusy = receivingIds.length > 0
  const showReceiveUi = isStoreManager && receivableIds.length > 0

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someReceivableSelected
    }
  }, [someReceivableSelected])

  const toggleAllReceivable = () => {
    if (allReceivableSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds([...receivableIds])
    }
  }

  const toggleOne = (orderId: number) => {
    setSelectedIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId],
    )
  }

  const applyReceived = (orders: Order[]) => {
    const byId = new Map(orders.map((o) => [o.id, o]))
    setRows((prev) =>
      prev.map((o) => {
        const updated = byId.get(o.id)
        return updated ?? o
      }),
    )
  }

  const receiveOrders = async (ids: number[], confirmMessage: string) => {
    if (isBusy || ids.length === 0) return
    if (!window.confirm(confirmMessage)) return

    setActionError(null)
    setActionInfo(null)
    setReceivingIds(ids)
    const succeeded: Order[] = []
    const failed: number[] = []

    for (const id of ids) {
      try {
        const { data } = await api.patch<Order>(`/api/orders/${id}/receive`)
        const existing = rows.find((row) => row.id === id)
        if (data) succeeded.push(data)
        else if (existing) succeeded.push({ ...existing, status: 'RECEIVED' })
      } catch {
        failed.push(id)
      }
    }

    if (succeeded.length > 0) {
      applyReceived(succeeded)
      const doneIds = new Set(succeeded.map((o) => o.id))
      setSelectedIds((prev) => prev.filter((id) => !doneIds.has(id)))
    }

    if (failed.length === 0) {
      if (succeeded.length > 1) {
        setActionInfo(`${succeeded.length}건 입고 완료 처리했습니다.`)
      }
    } else if (succeeded.length === 0) {
      setActionError(
        failed.length === 1
          ? `발주 #${failed[0]} 입고 처리에 실패했습니다.`
          : `${failed.length}건 입고 처리에 실패했습니다.`,
      )
    } else {
      setActionInfo(`${succeeded.length}건 성공 · ${failed.length}건 실패`)
    }

    setReceivingIds([])
  }

  const receiveOne = (orderId: number) => {
    void receiveOrders([orderId], `발주 #${orderId} 입고를 완료 처리할까요?`)
  }

  const receiveSelected = () => {
    void receiveOrders(selectedIds, `선택한 ${selectedIds.length}건을 입고 완료 처리할까요?`)
  }

  const orderPagination = useTablePagination(filtered)

  return (
    <ErpPageFrame
      title="발주 관리"
      actions={
        isStoreManager ? (
          <Link
            to="/orders/new"
            className="ml-auto rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
          >
            발주 요청
          </Link>
        ) : null
      }
    >
      <SectionCard
        embedded
        title="발주 목록"
        headerRight={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {selectedIds.length > 0 ? (
              <button
                type="button"
                onClick={() => receiveSelected()}
                disabled={isBusy}
                className="h-9 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
              >
                {isBusy ? '처리 중…' : `선택한 ${selectedIds.length}건 입고완료`}
              </button>
            ) : null}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="매장/상태/SKU/상품명/메모 검색"
              className="h-9 w-64 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">상태</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">전체</option>
                {filterOptions.statuses.map((s) => (
                  <option key={s} value={s}>
                    {orderStatusLabel(s)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">매장</span>
              <select
                value={store === 'ALL' ? 'ALL' : String(store)}
                onChange={(e) => {
                  const v = e.target.value
                  setStore(v === 'ALL' ? 'ALL' : Number(v))
                }}
                disabled={role === 'STORE_MANAGER' && myStoreId != null}
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="ALL">전체</option>
                {filterOptions.stores.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                setQ('')
                setStatus('ALL')
                setStore(role === 'STORE_MANAGER' && myStoreId != null ? myStoreId : 'ALL')
                setSelectedIds([])
              }}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              초기화
            </button>
          </div>
        }
      >
        {actionError ? <p className="mb-2 text-sm text-rose-600">{actionError}</p> : null}
        {actionInfo ? <p className="mb-2 text-sm text-emerald-700">{actionInfo}</p> : null}
        {loading ? (
          <LoadingSpinner />
        ) : unavailable ? (
          <p className="text-sm text-slate-600">
            발주 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">등록된 발주가 없습니다.</p>
        ) : (
          <div>
            {showReceiveUi ? (
              <div className="mb-2 flex items-center border-b border-slate-100 px-1 pb-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allReceivableSelected}
                    onChange={toggleAllReceivable}
                    disabled={isBusy}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  전체 선택
                </label>
              </div>
            ) : null}
            <div className="overflow-x-auto rounded-md border border-slate-100">
              <div className="max-h-[min(28rem,calc(100vh-14rem))] overflow-y-auto">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead>
                    <tr className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {showReceiveUi ? <th className="w-10 px-3 py-2.5" aria-hidden /> : null}
                      <th className="px-3 py-2.5">ID</th>
                      <th className="px-3 py-2.5">매장</th>
                      <th className="px-3 py-2.5">상태</th>
                      <th className="px-3 py-2.5">요청자</th>
                      <th className="px-3 py-2.5">승인자</th>
                      <th className="px-3 py-2.5 text-right">품목 수</th>
                      <th className="px-3 py-2.5">등록일</th>
                      {showReceiveUi ? <th className="px-3 py-2.5 text-right">처리</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {orderPagination.pageItems.map((o) => {
                      const receivable = canStoreReceiveOrder(o, role, myStoreId)
                      const checked = selectedIds.includes(o.id)
                      const rowReceiving = receivingIds.includes(o.id)

                      return (
                        <tr
                          key={o.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/orders/${o.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') navigate(`/orders/${o.id}`)
                          }}
                          className={[
                            'cursor-pointer border-b border-slate-100 even:bg-slate-50/40 hover:bg-blue-50/50',
                            checked ? 'bg-blue-50/40' : '',
                          ].join(' ')}
                        >
                          {showReceiveUi ? (
                            <td
                              className="px-3 py-2"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              {receivable ? (
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleOne(o.id)}
                                  disabled={isBusy}
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  aria-label={`발주 ${o.id} 선택`}
                                />
                              ) : null}
                            </td>
                          ) : null}
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{o.id}</td>
                          <td className="px-3 py-2 text-slate-800">{o.storeName}</td>
                          <td className="px-3 py-2">
                            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                              {orderStatusDisplayText(o)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{o.requestedByName ?? '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{o.approvedByName ?? '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-800">
                            {o.items?.length ?? 0}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {o.createdAt ? new Date(o.createdAt).toLocaleString('ko-KR') : '—'}
                          </td>
                          {showReceiveUi ? (
                            <td
                              className="px-3 py-2 text-right"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              {receivable ? (
                                <button
                                  type="button"
                                  onClick={() => receiveOne(o.id)}
                                  disabled={isBusy}
                                  className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
                                >
                                  {rowReceiving ? '처리 중…' : '입고완료'}
                                </button>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                전체 <span className="font-semibold tabular-nums text-slate-700">{rows.length}</span>건 ·
                결과 <span className="font-semibold tabular-nums text-slate-700">{filtered.length}</span>건
                {receivableInFiltered.length > 0 ? (
                  <>
                    {' '}
                    · 입고 대기{' '}
                    <span className="font-semibold tabular-nums text-amber-700">
                      {receivableInFiltered.length}
                    </span>
                    건
                  </>
                ) : null}
              </p>
              <TablePaginationBar
                page={orderPagination.page}
                pageCount={orderPagination.pageCount}
                total={orderPagination.total}
                setPage={orderPagination.setPage}
                fromIdx={orderPagination.fromIdx}
                toIdx={orderPagination.toIdx}
              />
            </div>
          </div>
        )}
      </SectionCard>
    </ErpPageFrame>
  )
}
