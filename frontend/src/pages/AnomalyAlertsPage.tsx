import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { getRole } from '../lib/auth'
import { anomalyReasonLabel } from '../lib/anomalyLabels'
import ErpPageFrame, { ErpAccessDenied } from '../components/ui/ErpPageFrame'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import {
  ErpDataTable,
  ErpGridWrap,
  ErpSecondaryButton,
  ErpStatusBar,
  ErpToolbar,
} from '../components/ui/erp/ErpLayout'
import { erpGridCellClass, erpGridHeadClass } from '../lib/erpUi'
import { useUnresolvedAnomalyCount } from '../hooks/useUnresolvedAnomalyCount'
import type { AnomalyAlert } from '../types/models'

export default function AnomalyAlertsPage() {
  const role = getRole()
  const isHq = role === 'HQ_STAFF'
  const { refresh: refreshBadgeCount } = useUnresolvedAnomalyCount(isHq)

  const [alerts, setAlerts] = useState<AnomalyAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<AnomalyAlert[]>('/api/anomaly-alerts')
      setAlerts(Array.isArray(data) ? data : [])
    } catch {
      setError('이상탐지 알림을 불러오지 못했습니다.')
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isHq) void load()
  }, [isHq, load])

  const unresolvedCount = useMemo(() => alerts.filter((a) => !a.resolved).length, [alerts])

  const handleResolve = async (id: number) => {
    setResolvingId(id)
    try {
      await api.patch(`/api/anomaly-alerts/${id}/resolve`)
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)))
      await refreshBadgeCount()
    } catch {
      setError('확인 처리에 실패했습니다.')
    } finally {
      setResolvingId(null)
    }
  }

  if (!isHq) {
    return (
      <ErpAccessDenied title="이상탐지 알림" message="본사(HQ) 권한에서만 접근할 수 있습니다." />
    )
  }

  return (
    <ErpPageFrame
      title="이상탐지 알림"
      actions={
        <ErpSecondaryButton className="ml-auto" onClick={() => void load()}>
          조회
        </ErpSecondaryButton>
      }
    >
      <ErpToolbar>
        <span className="text-xs text-slate-600">
          전체 {alerts.length}건 · 미확인 {unresolvedCount}건
        </span>
      </ErpToolbar>

      {loading ? (
        <div className="py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="px-3 py-8 text-center text-sm text-rose-600">{error}</div>
      ) : (
        <>
          <ErpGridWrap maxHeight="max-h-[min(32rem,calc(100vh-14rem))]">
            <ErpDataTable minWidth="960px">
              <thead>
                <tr>
                  <th className={erpGridHeadClass()}>매장</th>
                  <th className={erpGridHeadClass()}>SKU</th>
                  <th className={erpGridHeadClass()}>상품</th>
                  <th className={erpGridHeadClass()}>사유</th>
                  <th className={[erpGridHeadClass(), 'text-right'].join(' ')}>변동량</th>
                  <th className={[erpGridHeadClass(), 'text-right'].join(' ')}>이상점수</th>
                  <th className={erpGridHeadClass()}>발생일</th>
                  <th className={erpGridHeadClass()}>상태</th>
                  <th className={erpGridHeadClass()} />
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={erpGridCellClass('py-12 text-center text-slate-400')}>
                      등록된 이상탐지 알림이 없습니다.
                    </td>
                  </tr>
                ) : (
                  alerts.map((a) => (
                    <tr
                      key={a.id}
                      className={a.resolved ? 'text-slate-500' : 'hover:bg-rose-50/40'}
                    >
                      <td className={erpGridCellClass()}>{a.storeName ?? `매장 #${a.storeId}`}</td>
                      <td className={erpGridCellClass('font-mono text-[11px]')}>{a.skuCode ?? '—'}</td>
                      <td className={erpGridCellClass()}>{a.productName ?? '—'}</td>
                      <td className={erpGridCellClass()}>{anomalyReasonLabel(a.reason)}</td>
                      <td className={erpGridCellClass('text-right tabular-nums')}>{a.quantity}</td>
                      <td
                        className={erpGridCellClass(
                          [
                            'text-right font-semibold tabular-nums',
                            a.resolved ? '' : 'text-rose-700',
                          ].join(' '),
                        )}
                      >
                        {a.anomalyScore.toFixed(2)}
                      </td>
                      <td className={erpGridCellClass('text-[11px]')}>{a.eventDate}</td>
                      <td className={erpGridCellClass()}>
                        {a.resolved ? (
                          <span className="text-slate-500">확인됨</span>
                        ) : (
                          <span className="font-medium text-rose-700">미확인</span>
                        )}
                      </td>
                      <td className={erpGridCellClass('text-right')}>
                        {!a.resolved ? (
                          <button
                            type="button"
                            onClick={() => void handleResolve(a.id)}
                            disabled={resolvingId === a.id}
                            className="text-[11px] font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >
                            {resolvingId === a.id ? '처리 중…' : '확인 처리'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </ErpDataTable>
          </ErpGridWrap>

          <ErpStatusBar>
            {alerts.length > 0
              ? `최근 등록 ${alerts[0]?.createdAt ? new Date(alerts[0].createdAt).toLocaleString('ko-KR') : '—'} 기준`
              : '0건'}
          </ErpStatusBar>
        </>
      )}
    </ErpPageFrame>
  )
}
