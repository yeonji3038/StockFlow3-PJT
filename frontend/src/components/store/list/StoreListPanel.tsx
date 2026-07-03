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
import { erpGridCellClass, erpGridHeadClass, erpInputClass, erpSelectClass } from '../../../lib/erpUi'
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
    <ErpWorkScreen title="매장 목록">
      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel>검색</ErpFormLabel>
          <ErpFormCell>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="매장명 · 위치 · 매장코드 · 전화"
              className={erpInputClass()}
            />
          </ErpFormCell>
          <ErpFormLabel>유형</ErpFormLabel>
          <ErpFormCell>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className={erpSelectClass()}
            >
              <option value="ALL">전체</option>
              <option value="HQ">본사</option>
              <option value="DEPARTMENT">백화점</option>
              <option value="OUTLET">아울렛</option>
            </select>
          </ErpFormCell>
          <ErpFormLabel>조회건수</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            <span className="px-1 text-xs text-slate-600">{filtered.length.toLocaleString('ko-KR')}건</span>
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>

      <ErpToolbar>
        <ErpToolbarButton
          onClick={() => {
            setQ('')
            setTypeFilter('ALL')
          }}
        >
          초기화
        </ErpToolbarButton>
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
            <ErpDataTable minWidth="880px">
              <thead>
                <tr>
                  <th className={erpGridHeadClass()}>매장명</th>
                  <th className={erpGridHeadClass()}>위치</th>
                  <th className={erpGridHeadClass()}>유형</th>
                  <th className={erpGridHeadClass()}>매장코드</th>
                  <th className={erpGridHeadClass()}>전화번호</th>
                  <th className={erpGridHeadClass()}>등록일</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={erpGridCellClass('py-12 text-center text-slate-400')}>
                      조건에 맞는 매장이 없습니다.
                    </td>
                  </tr>
                ) : (
                  pagination.pageItems.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/admin/stores/${r.id}`)}
                      className="cursor-pointer hover:bg-blue-50/60"
                    >
                      <td className={erpGridCellClass('font-medium')}>{r.name}</td>
                      <td className={erpGridCellClass()}>{r.location ?? '—'}</td>
                      <td className={erpGridCellClass()}>{storeTypeLabel(r.storeType)}</td>
                      <td className={erpGridCellClass('font-mono text-[11px]')}>{r.storeCode ?? '—'}</td>
                      <td className={erpGridCellClass()}>{r.phone ?? '—'}</td>
                      <td className={erpGridCellClass('text-[11px] text-slate-500')}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('ko-KR') : '—'}
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
          <ErpPrimaryButton onClick={() => navigate('/admin/stores/new')}>
            <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            매장 생성
          </ErpPrimaryButton>
        </ErpFooterPrimary>
      </ErpFooterBar>
    </ErpWorkScreen>
  )
}

export function StoreListPageContent() {
  const { key } = useLocation()
  const isHq = getRole() === 'HQ_STAFF'

  if (!isHq) {
    return (
      <div className="border border-slate-300 bg-white px-4 py-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">본사(HQ) 권한에서만 접근할 수 있습니다.</p>
      </div>
    )
  }

  return <StoreListPanel refreshKey={key} />
}
