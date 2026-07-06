import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { getRole } from '../lib/auth'
import { anomalyReasonLabel } from '../lib/anomalyLabels'
import ErpPageFrame, { ErpAccessDenied } from '../components/ui/ErpPageFrame'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import {
  ErpChevronBack,
  ErpFooterBar,
  ErpFooterPrimary,
  ErpFormCell,
  ErpFormLabel,
  ErpFormRow,
  ErpFormTable,
  ErpPrimaryButton,
  ErpToolbar,
} from '../components/ui/erp/ErpLayout'
import { useUnresolvedAnomalyCount } from '../hooks/useUnresolvedAnomalyCount'
import { useAnomalyAlertStore } from '../stores/anomalyAlertStore'
import type { AnomalyAlert } from '../types/models'

function formatDateTime(value: string | undefined): string {
  return value ? new Date(value).toLocaleString('ko-KR') : '—'
}

export default function AnomalyAlertDetailPage() {
  const { id: idParam } = useParams()
  const role = getRole()
  const isHq = role === 'HQ_STAFF'
  const id = idParam != null ? Number(idParam) : NaN
  const { refresh: refreshBadgeCount } = useUnresolvedAnomalyCount(isHq)
  const anomalyRefreshTrigger = useAnomalyAlertStore((s) => s.anomalyRefreshTrigger)
  const resolveAlert = useAnomalyAlertStore((s) => s.resolveAlert)
  const hasFetchedOnce = useRef(false)

  const [alert, setAlert] = useState<AnomalyAlert | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)

  const load = useCallback(
    async (silent = false) => {
      if (!Number.isFinite(id) || id < 1) {
        setError('잘못된 알림 번호입니다.')
        if (!silent) setLoading(false)
        return
      }
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const { data } = await api.get<AnomalyAlert>(`/api/anomaly-alerts/${id}`)
        setAlert(data ?? null)
      } catch {
        if (!silent) {
          setError('이상탐지 알림을 불러오지 못했습니다.')
          setAlert(null)
        }
      } finally {
        if (!silent) setLoading(false)
        hasFetchedOnce.current = true
      }
    },
    [id],
  )

  useEffect(() => {
    hasFetchedOnce.current = false
    if (isHq) void load(false)
  }, [isHq, load])

  useEffect(() => {
    if (!isHq || anomalyRefreshTrigger === 0 || !hasFetchedOnce.current) return
    void load(true)
  }, [anomalyRefreshTrigger, isHq, load])

  const handleResolve = async () => {
    if (!alert || alert.resolved || resolving) return
    setActionError(null)
    setResolving(true)
    try {
      await resolveAlert(alert.id)
      setAlert((prev) => (prev ? { ...prev, resolved: true } : prev))
      await refreshBadgeCount()
    } catch {
      setActionError('확인 처리에 실패했습니다.')
    } finally {
      setResolving(false)
    }
  }

  const backLink = <ErpChevronBack to="/anomaly-alerts" label="이상탐지 목록" />

  if (!isHq) {
    return (
      <ErpAccessDenied title="이상탐지 알림" message="본사(HQ) 권한에서만 접근할 수 있습니다." />
    )
  }

  if (loading) {
    return (
      <ErpPageFrame title="이상탐지 알림" actions={backLink}>
        <div className="px-3 py-12">
          <LoadingSpinner />
        </div>
      </ErpPageFrame>
    )
  }

  if (error || !alert) {
    return (
      <ErpPageFrame title="이상탐지 알림" actions={backLink}>
        <div className="px-3 py-8 text-center text-sm text-rose-600">{error ?? '데이터가 없습니다.'}</div>
      </ErpPageFrame>
    )
  }

  return (
    <ErpPageFrame title={`이상탐지 #${alert.id}`} actions={backLink}>
      <div className="border-b border-slate-300 px-3 py-1 text-[11px] text-slate-500">
        {alert.storeName ?? `매장 #${alert.storeId}`} · {alert.skuCode ?? '—'}
      </div>

      {actionError ? (
        <div className="border-b border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{actionError}</div>
      ) : null}

      <ErpToolbar>
        <span className="text-xs font-semibold text-slate-700">알림 정보</span>
        <span
          className={[
            'ml-2 text-[11px] font-medium',
            alert.resolved ? 'text-slate-500' : 'text-rose-700',
          ].join(' ')}
        >
          {alert.resolved ? '확인됨' : '미확인'}
        </span>
      </ErpToolbar>

      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel>매장</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">
              {alert.storeName ?? `매장 #${alert.storeId}`}
            </span>
          </ErpFormCell>
          <ErpFormLabel>상태</ErpFormLabel>
          <ErpFormCell>
            <span
              className={[
                'px-1 text-xs font-medium',
                alert.resolved ? 'text-slate-500' : 'text-rose-700',
              ].join(' ')}
            >
              {alert.resolved ? '확인됨' : '미확인'}
            </span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>SKU</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 font-mono text-xs text-slate-800">{alert.skuCode ?? '—'}</span>
          </ErpFormCell>
          <ErpFormLabel>상품</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">{alert.productName ?? '—'}</span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>사유</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">{anomalyReasonLabel(alert.reason)}</span>
          </ErpFormCell>
          <ErpFormLabel>변동량</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs font-medium tabular-nums text-slate-900">{alert.quantity}</span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>이상점수</ErpFormLabel>
          <ErpFormCell>
            <span
              className={[
                'px-1 text-xs font-semibold tabular-nums',
                alert.resolved ? 'text-slate-800' : 'text-rose-700',
              ].join(' ')}
            >
              {alert.anomalyScore.toFixed(2)}
            </span>
          </ErpFormCell>
          <ErpFormLabel>발생일</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">{alert.eventDate}</span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>옵션 ID</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 font-mono text-xs text-slate-700">{alert.productOptionId}</span>
          </ErpFormCell>
          <ErpFormLabel>등록일</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">{formatDateTime(alert.createdAt)}</span>
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>

      {!alert.resolved ? (
        <ErpFooterBar>
          <ErpFooterPrimary>
            <ErpPrimaryButton type="button" disabled={resolving} onClick={() => void handleResolve()}>
              {resolving ? '처리 중…' : '확인 처리'}
            </ErpPrimaryButton>
          </ErpFooterPrimary>
        </ErpFooterBar>
      ) : null}
    </ErpPageFrame>
  )
}
