import { useCallback, useEffect, useState } from 'react'
import { getRole } from '../lib/auth'
import {
  downloadWeeklyReport,
  fetchWeeklyReports,
  formatWeeklyReportCreatedAt,
  formatWeeklyReportPeriod,
  triggerWeeklyReport,
  weeklyReportErrorMessage,
} from '../lib/weeklyReport'
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
import type { WeeklyReportSummary } from '../types/models'

export default function WeeklyReportsPage() {
  const role = getRole()
  const isHq = role === 'HQ_STAFF'

  const [reports, setReports] = useState<WeeklyReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const list = await fetchWeeklyReports()
      setReports(list)
    } catch (err) {
      if (!silent) {
        setError(weeklyReportErrorMessage(err))
        setReports([])
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isHq) void load(false)
  }, [isHq, load])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    setNotice(null)
    try {
      await triggerWeeklyReport()
      setNotice('리포트가 생성되었습니다. 목록이 갱신되었습니다.')
      try {
        const list = await fetchWeeklyReports()
        setReports(list)
      } catch (err) {
        setError(weeklyReportErrorMessage(err))
      }
    } catch (err) {
      setError(weeklyReportErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (report: WeeklyReportSummary) => {
    setDownloadingId(report.id)
    setError(null)
    try {
      await downloadWeeklyReport(report)
    } catch (err) {
      setError(weeklyReportErrorMessage(err))
    } finally {
      setDownloadingId(null)
    }
  }

  if (!isHq) {
    return (
      <ErpAccessDenied title="주간 리포트" message="본사(HQ) 권한에서만 접근할 수 있습니다." />
    )
  }

  return (
    <ErpPageFrame
      title="주간 리포트"
      actions={
        <ErpSecondaryButton className="ml-auto" disabled={creating} onClick={() => void handleCreate()}>
          {creating ? (
            <span className="inline-flex items-center gap-1.5">
              <LoadingSpinner compact hideLabel />
              생성 중…
            </span>
          ) : (
            '리포트 생성'
          )}
        </ErpSecondaryButton>
      }
    >
      <ErpToolbar>
        <span className="text-xs text-slate-600">생성된 리포트 {reports.length}건</span>
      </ErpToolbar>

      {notice ? (
        <div className="border-b border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="border-b border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>
      ) : null}

      {loading ? (
        <div className="py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <ErpGridWrap maxHeight="max-h-[min(32rem,calc(100vh-14rem))]">
            <ErpDataTable minWidth="640px">
              <thead>
                <tr>
                  <th className={erpGridHeadClass()}>기간</th>
                  <th className={erpGridHeadClass()}>생성일</th>
                  <th className={erpGridHeadClass()} />
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={erpGridCellClass('py-12 text-center text-slate-400')}>
                      아직 생성된 리포트가 없습니다.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/60">
                      <td className={erpGridCellClass('font-medium')}>
                        {formatWeeklyReportPeriod(report.periodStart, report.periodEnd)}
                      </td>
                      <td className={erpGridCellClass('text-[11px]')}>
                        {formatWeeklyReportCreatedAt(report.createdAt)} 발송
                      </td>
                      <td className={erpGridCellClass('text-right')}>
                        <button
                          type="button"
                          onClick={() => void handleDownload(report)}
                          disabled={downloadingId === report.id}
                          className="text-[11px] font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          {downloadingId === report.id ? '다운로드 중…' : '다운로드'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </ErpDataTable>
          </ErpGridWrap>

          {reports.length > 0 ? (
            <ErpStatusBar>
              최신 리포트 {formatWeeklyReportCreatedAt(reports[0].createdAt)} 기준
            </ErpStatusBar>
          ) : null}
        </>
      )}
    </ErpPageFrame>
  )
}
