import { isAxiosError } from 'axios'
import { api } from './api'
import type { WeeklyReportSummary } from '../types/models'

export function formatWeeklyReportPeriod(start: string, end: string): string {
  const startDate = parseIsoDate(start)
  const endDate = parseIsoDate(end)
  if (!startDate || !endDate) return `${start} ~ ${end}`
  const inclusiveEnd = new Date(endDate)
  inclusiveEnd.setDate(inclusiveEnd.getDate() - 1)
  return `${formatMd(startDate)} ~ ${formatMd(inclusiveEnd)}`
}

export function formatWeeklyReportCreatedAt(value: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function weeklyReportErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const status = err.response?.status
    if (status === 401) return '로그인이 필요합니다.'
    if (status === 403) return '권한이 없습니다.'
    if (status === 404) return '리포트를 찾을 수 없습니다.'
  }
  return '요청에 실패했습니다.'
}

export async function fetchWeeklyReports(): Promise<WeeklyReportSummary[]> {
  const { data } = await api.get<WeeklyReportSummary[]>('/api/reports/weekly')
  return Array.isArray(data) ? data : []
}

export async function triggerWeeklyReport(): Promise<string> {
  const { data } = await api.post<string>('/api/reports/weekly/trigger', null, {
    responseType: 'text',
  })
  return typeof data === 'string' ? data : ''
}

export async function downloadWeeklyReport(report: WeeklyReportSummary): Promise<void> {
  const { data } = await api.get<Blob>(`/api/reports/weekly/${report.id}/download`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = report.fileName || `weekly-report-${report.id}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}

function parseIsoDate(value: string): Date | null {
  const parts = value.split('-').map((p) => Number(p))
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null
  const [y, m, d] = parts
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatMd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}
