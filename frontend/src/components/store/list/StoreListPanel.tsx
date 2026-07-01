import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { api } from '../../../lib/api'
import SectionCard from '../../ui/SectionCard'
import LoadingSpinner from '../../ui/LoadingSpinner'
import TablePaginationBar from '../../ui/TablePaginationBar'
import { useTablePagination } from '../../../hooks/useTablePagination'
import { storeTypeLabel, type StoreListItem, type StoreType } from '../../../lib/store'

type Props = {
  refreshKey?: number | string
}

export default function StoreListPanel({ refreshKey = 0 }: Props) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<StoreListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | StoreType>('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<StoreListItem[]>('/api/stores')
      setRows(data ?? [])
    } catch {
      setError('매장 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows
      .filter((r) => {
        if (typeFilter !== 'ALL' && r.storeType !== typeFilter) return false
        if (!needle) return true
        const hay = [r.name, r.location ?? '', r.storeCode, r.phone ?? '', storeTypeLabel(r.storeType)]
          .join(' ')
          .toLowerCase()
        return hay.includes(needle)
      })
      .sort((a, b) => (a.createdAt && b.createdAt && a.createdAt < b.createdAt ? 1 : -1))
  }, [rows, q, typeFilter])

  const pagination = useTablePagination(filtered)

  return (
    <SectionCard
      title="매장 목록"
      headerRight={
        <div className="flex max-w-full flex-1 flex-wrap items-center justify-end gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="매장명 · 위치 · 매장코드 · 전화"
            className="h-9 min-w-[12rem] flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:max-w-xs"
          />
          <label className="flex items-center gap-2 text-sm">
            <span className="shrink-0 text-slate-500">유형</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">전체</option>
              <option value="HQ">본사</option>
              <option value="DEPARTMENT">백화점</option>
              <option value="OUTLET">아울렛</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setQ('')
              setTypeFilter('ALL')
            }}
            className="h-9 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/stores/new')}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            매장 생성
          </button>
        </div>
      }
    >
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="space-y-2">
          <p className="text-sm text-rose-600">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <div>
          <div className="overflow-x-auto rounded-md border border-slate-100">
            <div className="max-h-[min(28rem,calc(100vh-14rem))] overflow-y-auto">
              <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                  <tr className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2.5">매장명</th>
                    <th className="px-3 py-2.5">위치</th>
                    <th className="px-3 py-2.5">유형</th>
                    <th className="px-3 py-2.5">매장코드</th>
                    <th className="px-3 py-2.5">전화번호</th>
                    <th className="px-3 py-2.5">등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-12 text-center text-slate-400">
                        조건에 맞는 매장이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    pagination.pageItems.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => navigate(`/admin/stores/${r.id}`)}
                        className="cursor-pointer border-b border-slate-100 even:bg-slate-50/40 hover:bg-blue-50/50"
                      >
                        <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
                        <td className="px-3 py-2 text-slate-700">{r.location ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{storeTypeLabel(r.storeType)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-800">{r.storeCode ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{r.phone ?? '—'}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">
                          {r.createdAt ? new Date(r.createdAt).toLocaleString('ko-KR') : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <TablePaginationBar
              page={pagination.page}
              pageCount={pagination.pageCount}
              total={pagination.total}
              setPage={pagination.setPage}
              fromIdx={pagination.fromIdx}
              toIdx={pagination.toIdx}
            />
          </div>
        </div>
      )}
    </SectionCard>
  )
}
