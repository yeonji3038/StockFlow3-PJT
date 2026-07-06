import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { getRole } from '../../../lib/auth'
import { api } from '../../../lib/api'
import LoadingSpinner from '../../ui/LoadingSpinner'
import TablePaginationBar from '../../ui/TablePaginationBar'
import {
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
  ErpStatusBar,
  ErpToolbar,
  ErpToolbarButton,
  ErpWorkScreen,
} from '../../ui/erp/ErpLayout'
import { erpGridCellClass, erpGridHeadClass, erpInputClass } from '../../../lib/erpUi'
import { useTablePagination } from '../../../hooks/useTablePagination'
import type { WarehouseListItem } from '../../../lib/warehouse'

type Props = {
  refreshKey?: number | string
}

export default function WarehouseListPanel({ refreshKey = 0 }: Props) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<WarehouseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<WarehouseListItem[]>('/api/warehouses')
      setRows(data ?? [])
    } catch {
      setError('창고 목록을 불러오지 못했습니다.')
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
        if (!needle) return true
        const hay = [r.name, r.location ?? '', r.managerName ?? ''].join(' ').toLowerCase()
        return hay.includes(needle)
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
  }, [rows, q])

  const pagination = useTablePagination(filtered)

  return (
    <ErpWorkScreen title="창고 목록">
      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel>검색</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="창고명 · 위치 · 담당자"
              className={erpInputClass()}
            />
          </ErpFormCell>
          <ErpFormLabel>조회건수</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-600">{filtered.length.toLocaleString('ko-KR')}건</span>
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>

      <ErpToolbar>
        <ErpToolbarButton onClick={() => setQ('')}>초기화</ErpToolbarButton>
        <ErpToolbarButton onClick={() => void load()}>새로고침</ErpToolbarButton>
      </ErpToolbar>

      {error ? (
        <div className="border-b border-slate-300 px-2 py-1.5 text-xs text-rose-600">{error}</div>
      ) : null}

      {loading ? (
        <div className="py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <ErpGridWrap maxHeight="max-h-[min(28rem,calc(100vh-18rem))]">
            <ErpDataTable minWidth="720px">
              <thead>
                <tr>
                  <th className={erpGridHeadClass()}>창고명</th>
                  <th className={erpGridHeadClass()}>위치</th>
                  <th className={erpGridHeadClass()}>담당자</th>
                  <th className={`${erpGridHeadClass()} w-24 text-center`}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={erpGridCellClass('py-12 text-center text-slate-400')}>
                      조건에 맞는 창고가 없습니다.
                    </td>
                  </tr>
                ) : (
                  pagination.pageItems.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/admin/warehouses/${r.id}`)}
                      className="cursor-pointer hover:bg-blue-50/60"
                    >
                      <td className={erpGridCellClass('font-medium')}>{r.name}</td>
                      <td className={erpGridCellClass()}>{r.location ?? '—'}</td>
                      <td className={erpGridCellClass()}>{r.managerName ?? '—'}</td>
                      <td className={erpGridCellClass('text-center')}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/admin/warehouses/${r.id}`)
                          }}
                          className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          관리
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </ErpDataTable>
          </ErpGridWrap>

          <ErpStatusBar>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {pagination.total > 0
                  ? `${pagination.fromIdx}-${pagination.toIdx} / ${pagination.total}건`
                  : '0건'}
              </span>
              <TablePaginationBar
                page={pagination.page}
                pageCount={pagination.pageCount}
                total={pagination.total}
                setPage={pagination.setPage}
                fromIdx={pagination.fromIdx}
                toIdx={pagination.toIdx}
              />
            </div>
          </ErpStatusBar>
        </>
      )}

      <ErpFooterBar>
        <ErpSecondaryButton onClick={() => void load()}>조회</ErpSecondaryButton>
        <ErpFooterPrimary>
          <ErpPrimaryButton onClick={() => navigate('/admin/warehouses/new')}>
            <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            창고 생성
          </ErpPrimaryButton>
        </ErpFooterPrimary>
      </ErpFooterBar>
    </ErpWorkScreen>
  )
}

export function WarehouseListPageContent() {
  const { key } = useLocation()
  const isHq = getRole() === 'HQ_STAFF'

  if (!isHq) {
    return (
      <div className="border border-slate-300 bg-white px-4 py-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">본사(HQ) 권한에서만 접근할 수 있습니다.</p>
      </div>
    )
  }

  return <WarehouseListPanel refreshKey={key} />
}
