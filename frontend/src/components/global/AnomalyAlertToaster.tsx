import { useEffect, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'
import { getRole } from '../../lib/auth'
import { anomalyReasonLabel } from '../../lib/anomalyLabels'
import { useAnomalyAlertSync } from '../../hooks/useAnomalyAlertSync'
import { useAnomalyAlertStore, type AnomalyToastItem } from '../../stores/anomalyAlertStore'

const AUTO_DISMISS_MS = 10_000

function AnomalyToastItem({
  toastId,
  alertId,
  storeName,
  skuCode,
  productName,
  reason,
  anomalyScore,
}: AnomalyToastItem) {
  const navigate = useNavigate()
  const removeToast = useAnomalyAlertStore((s) => s.removeToast)
  const resolveAlert = useAnomalyAlertStore((s) => s.resolveAlert)
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => removeToast(toastId), AUTO_DISMISS_MS)
    return () => window.clearTimeout(t)
  }, [toastId, removeToast])

  const goToDetail = () => {
    removeToast(toastId)
    navigate(`/anomaly-alerts/${alertId}`)
  }

  const handleResolve = async (e: MouseEvent) => {
    e.stopPropagation()
    setResolveError(null)
    setResolving(true)
    try {
      await resolveAlert(alertId)
    } catch {
      setResolveError('확인 처리에 실패했습니다.')
    } finally {
      setResolving(false)
    }
  }

  return (
    <div
      role="alert"
      className="pointer-events-auto w-[min(100vw-2rem,22rem)] overflow-hidden rounded-lg border border-rose-200 bg-white shadow-xl ring-1 ring-black/5"
    >
      <div className="flex items-start gap-2 border-b border-rose-100 bg-rose-50 px-3 py-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-rose-950">이상탐지 알림</p>
          <p className="mt-0.5 truncate text-xs text-rose-800/90">{storeName}</p>
        </div>
        <button
          type="button"
          onClick={() => removeToast(toastId)}
          className="shrink-0 rounded p-0.5 text-rose-400 hover:bg-rose-100 hover:text-rose-700"
          aria-label="알림 닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={goToDetail}
        className="block w-full space-y-1 px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"
      >
        <p className="truncate">
          <span className="font-mono text-[11px] text-slate-600">{skuCode ?? '—'}</span>
          {productName ? (
            <>
              <span className="mx-1 text-slate-300">·</span>
              <span>{productName}</span>
            </>
          ) : null}
        </p>
        <p>
          사유 <span className="font-medium text-slate-900">{anomalyReasonLabel(reason)}</span>
          <span className="mx-1.5 text-slate-300">|</span>
          점수{' '}
          <span className="font-semibold tabular-nums text-rose-700">{anomalyScore.toFixed(2)}</span>
        </p>
      </button>
      {resolveError ? (
        <p className="border-t border-rose-100 px-3 py-1.5 text-[11px] text-rose-600">{resolveError}</p>
      ) : null}
      <div className="flex items-center gap-3 border-t border-slate-100 px-3 py-2">
        <button
          type="button"
          onClick={(e) => void handleResolve(e)}
          disabled={resolving}
          className="text-[11px] font-medium text-rose-700 hover:text-rose-900 disabled:opacity-50"
        >
          {resolving ? '처리 중…' : '확인 처리'}
        </button>
        <button
          type="button"
          onClick={() => {
            removeToast(toastId)
            navigate('/anomaly-alerts')
          }}
          className="text-[11px] font-medium text-blue-600 hover:text-blue-800"
        >
          목록 보기
        </button>
      </div>
    </div>
  )
}

function AnomalyToastList() {
  const toasts = useAnomalyAlertStore((s) => s.toasts)
  return (
    <>
      {toasts.map((t) => (
        <AnomalyToastItem key={t.toastId} {...t} />
      ))}
    </>
  )
}

/** HQ 이상탐지 알림을 WebSocket·폴링으로 수신해 우측 상단 토스트로 표시합니다. */
export default function AnomalyAlertToaster() {
  const enabled = getRole() === 'HQ_STAFF'
  useAnomalyAlertSync(enabled)

  if (!enabled) return null

  return <AnomalyToastList />
}
