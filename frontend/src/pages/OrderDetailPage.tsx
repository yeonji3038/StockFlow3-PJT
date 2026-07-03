import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { getOrResolveApprovedByUserId } from '../lib/resolveCurrentUserId'
import { getRole, getStoreId } from '../lib/auth'
import { orderStatusDisplayText } from '../lib/orderLabels'
import ErpPageFrame from '../components/ui/ErpPageFrame'
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
import { erpGridCellClass, erpGridHeadClass } from '../lib/erpUi'
import type { Order } from '../types/models'
import { useStockStore } from '../stores/stockStore'

function apiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const data = (err as { response?: { data?: { message?: string } } }).response?.data
    if (data?.message) return String(data.message)
  }
  return fallback
}

function formatDateTime(value: string | undefined): string {
  return value ? new Date(value).toLocaleString('ko-KR') : '—'
}

export default function OrderDetailPage() {
  const { id: idParam } = useParams()
  const role = getRole()
  const myStoreId = getStoreId()
  const id = idParam != null ? Number(idParam) : NaN
  const orderRefreshTrigger = useStockStore((s) => s.orderRefreshTrigger)
  const hasFetchedOnce = useRef(false)

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!Number.isFinite(id) || id < 1) {
      setError('잘못된 발주 번호입니다.')
      if (!silent) setLoading(false)
      return
    }
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const { data } = await api.get<Order>(`/api/orders/${id}`)
      setOrder(data ?? null)
    } catch {
      if (!silent) {
        setError('발주 정보를 불러오지 못했습니다.')
        setOrder(null)
      }
    } finally {
      if (!silent) setLoading(false)
      hasFetchedOnce.current = true
    }
  }, [id])

  useEffect(() => {
    hasFetchedOnce.current = false
    void load(false)
  }, [load])

  useEffect(() => {
    if (orderRefreshTrigger === 0 || !hasFetchedOnce.current) return
    void load(true)
  }, [orderRefreshTrigger, load])

  const runAction = async (fn: () => Promise<void>) => {
    setActionError(null)
    setActing(true)
    try {
      await fn()
      await load()
    } catch (e) {
      setActionError(apiErrorMessage(e, '처리에 실패했습니다.'))
    } finally {
      setActing(false)
    }
  }

  const handleApprove = () => {
    void runAction(async () => {
      const approvedById = await getOrResolveApprovedByUserId()
      if (approvedById == null) {
        throw new Error('로그인 사용자를 확인할 수 없습니다. 다시 로그인해 주세요.')
      }
      await api.patch<Order>(`/api/orders/${id}/approve`, null, {
        params: { approvedById },
      })
    })
  }

  const handleReject = () => {
    if (!window.confirm('이 발주를 반려할까요?')) return
    void runAction(async () => {
      const approvedById = await getOrResolveApprovedByUserId()
      if (approvedById == null) {
        throw new Error('로그인 사용자를 확인할 수 없습니다. 다시 로그인해 주세요.')
      }
      await api.patch<Order>(`/api/orders/${id}/reject`, null, {
        params: { approvedById },
      })
    })
  }

  const handleShip = () => {
    void runAction(async () => {
      await api.patch<Order>(`/api/orders/${id}/ship`)
    })
  }

  const handleReceive = () => {
    void runAction(async () => {
      await api.patch<Order>(`/api/orders/${id}/receive`)
    })
  }

  const isHq = role === 'HQ_STAFF'
  const isWarehouse = role === 'WAREHOUSE_STAFF'
  const isStore = role === 'STORE_MANAGER'

  const backLink = <ErpChevronBack to="/orders" label="발주 목록" />

  if (loading) {
    return (
      <ErpPageFrame title="발주" actions={backLink}>
        <div className="px-3 py-12">
          <LoadingSpinner />
        </div>
      </ErpPageFrame>
    )
  }

  if (error || !order) {
    return (
      <ErpPageFrame title="발주" actions={backLink}>
        <div className="px-3 py-8 text-center text-sm text-rose-600">{error ?? '데이터가 없습니다.'}</div>
      </ErpPageFrame>
    )
  }

  const st = order.status
  const showHqApproveReject = isHq && st === 'REQUESTED'
  const showWarehouseShip = isWarehouse && st === 'APPROVED'
  const showStoreReceive =
    isStore && st === 'SHIPPED' && myStoreId != null && order.storeId === myStoreId

  return (
    <ErpPageFrame title={`발주 #${order.id}`} actions={backLink}>
      <div className="border-b border-slate-300 px-3 py-1 text-[11px] text-slate-500">
        {order.storeName} · {orderStatusDisplayText(order)}
      </div>

      {actionError ? (
        <div className="border-b border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{actionError}</div>
      ) : null}

      <ErpToolbar>
        <span className="text-xs font-semibold text-slate-700">발주 정보</span>
      </ErpToolbar>

      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel>매장</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs font-medium text-slate-900">{order.storeName}</span>
          </ErpFormCell>
          <ErpFormLabel>상태</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">{orderStatusDisplayText(order)}</span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>요청자</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">{order.requestedByName ?? '—'}</span>
          </ErpFormCell>
          <ErpFormLabel>승인자</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">{order.approvedByName ?? '—'}</span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>등록일</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">{formatDateTime(order.createdAt)}</span>
          </ErpFormCell>
          <ErpFormLabel>수정일</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">{formatDateTime(order.updatedAt)}</span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>메모</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            <span className="whitespace-pre-wrap px-1 text-xs text-slate-800">
              {order.note?.trim() ? order.note : '—'}
            </span>
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>

      {showWarehouseShip ? (
        <>
          <ErpToolbar>
            <span className="text-xs font-semibold text-slate-700">출고</span>
            <span className="ml-2 text-[11px] text-slate-500">승인된 발주를 출고 처리합니다.</span>
          </ErpToolbar>
          <ErpFooterBar>
            <ErpFooterPrimary>
              <ErpPrimaryButton type="button" disabled={acting} onClick={() => void handleShip()}>
                출고
              </ErpPrimaryButton>
            </ErpFooterPrimary>
          </ErpFooterBar>
        </>
      ) : null}

      {showStoreReceive ? (
        <>
          <ErpToolbar>
            <span className="text-xs font-semibold text-slate-700">입고</span>
            <span className="ml-2 text-[11px] text-slate-500">매장 입고를 완료 처리합니다.</span>
          </ErpToolbar>
          <ErpFooterBar>
            <ErpFooterPrimary>
              <ErpPrimaryButton type="button" disabled={acting} onClick={() => void handleReceive()}>
                입고완료
              </ErpPrimaryButton>
            </ErpFooterPrimary>
          </ErpFooterBar>
        </>
      ) : null}

      <ErpToolbar>
        <span className="text-xs font-semibold text-slate-700">발주 품목</span>
        <span className="ml-auto text-[11px] text-slate-500">{(order.items ?? []).length}건</span>
      </ErpToolbar>

      <ErpGridWrap>
        <ErpDataTable minWidth="640px">
          <thead>
            <tr>
              <th className={erpGridHeadClass()}>SKU</th>
              <th className={erpGridHeadClass()}>상품</th>
              <th className={erpGridHeadClass()}>색상</th>
              <th className={erpGridHeadClass()}>사이즈</th>
              <th className={[erpGridHeadClass(), 'text-right'].join(' ')}>수량</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className={erpGridCellClass('py-10 text-center text-slate-400')}>
                  품목이 없습니다.
                </td>
              </tr>
            ) : (
              (order.items ?? []).map((it) => (
                <tr key={it.id}>
                  <td className={erpGridCellClass('font-mono text-[11px]')}>{it.skuCode}</td>
                  <td className={erpGridCellClass()}>{it.productName}</td>
                  <td className={erpGridCellClass()}>{it.color}</td>
                  <td className={erpGridCellClass()}>{it.size}</td>
                  <td className={erpGridCellClass('text-right font-medium tabular-nums')}>{it.quantity}</td>
                </tr>
              ))
            )}
          </tbody>
        </ErpDataTable>
      </ErpGridWrap>

      {showHqApproveReject ? (
        <ErpFooterBar>
          <ErpFooterPrimary>
            <ErpSecondaryButton type="button" disabled={acting} onClick={() => void handleReject()}>
              반려
            </ErpSecondaryButton>
            <ErpPrimaryButton type="button" disabled={acting} onClick={() => void handleApprove()}>
              승인
            </ErpPrimaryButton>
          </ErpFooterPrimary>
        </ErpFooterBar>
      ) : null}
    </ErpPageFrame>
  )
}
