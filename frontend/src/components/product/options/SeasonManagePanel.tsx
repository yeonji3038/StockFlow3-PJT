import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../../../lib/api'
import LoadingSpinner from '../../ui/LoadingSpinner'
import Modal from '../../ui/Modal'
import {
  ErpDataTable,
  ErpFooterBar,
  ErpFooterPrimary,
  ErpGridWrap,
  ErpPrimaryButton,
  ErpSecondaryButton,
  ErpToolbar,
  ErpToolbarButton,
} from '../../ui/erp/ErpLayout'
import { erpGridCellClass, erpGridHeadClass, erpInputClass } from '../../../lib/erpUi'
import { parseApiErrorMessage } from '../../../lib/productOption'

type SeasonType = 'SS' | 'FW'
type SeasonStatus = 'PLANNING' | 'IN_PROGRESS' | 'ENDED'

type SeasonRow = {
  id: number
  name: string
  type: SeasonType
  year: number
  startDate: string | null
  endDate: string | null
  status: SeasonStatus
}

type SeasonForm = {
  name: string
  type: SeasonType
  year: string
  startDate: string
  endDate: string
  status: SeasonStatus
}

const SEASON_TYPE_OPTIONS: { value: SeasonType; label: string }[] = [
  { value: 'SS', label: '봄여름 (SS)' },
  { value: 'FW', label: '가을겨울 (FW)' },
]

const SEASON_STATUS_OPTIONS: { value: SeasonStatus; label: string }[] = [
  { value: 'PLANNING', label: '기획중' },
  { value: 'IN_PROGRESS', label: '진행중' },
  { value: 'ENDED', label: '종료' },
]

const emptyForm: SeasonForm = {
  name: '',
  type: 'SS',
  year: String(new Date().getFullYear()),
  startDate: '',
  endDate: '',
  status: 'PLANNING',
}

function seasonTypeLabel(type: SeasonType): string {
  return SEASON_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

function seasonStatusLabel(status: SeasonStatus): string {
  return SEASON_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

type Props = {
  brandId: number
  brandName: string
}

export default function SeasonManagePanel({ brandName }: Props) {
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<SeasonForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<SeasonRow[]>('/api/seasons')
      setSeasons(data ?? [])
    } catch {
      setError('시즌 목록을 불러오지 못했습니다.')
      setSeasons([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return seasons
      .filter((s) => {
        if (!needle) return true
        const hay = [s.name, String(s.year), seasonTypeLabel(s.type), seasonStatusLabel(s.status)].join(' ')
        return hay.toLowerCase().includes(needle)
      })
      .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name, 'ko-KR'))
  }, [seasons, q])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (row: SeasonRow) => {
    setEditingId(row.id)
    setForm({
      name: row.name,
      type: row.type,
      year: String(row.year),
      startDate: row.startDate ?? '',
      endDate: row.endDate ?? '',
      status: row.status,
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.name.trim() || saving) return
    const year = Number.parseInt(form.year, 10)
    if (!Number.isFinite(year)) {
      setError('연도를 올바르게 입력하세요.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = {
        name: form.name.trim(),
        type: form.type,
        year,
        startDate: form.startDate.trim() || null,
        endDate: form.endDate.trim() || null,
        status: form.status,
      }
      if (editingId != null) {
        await api.put(`/api/seasons/${editingId}`, body)
      } else {
        await api.post('/api/seasons', body)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(parseApiErrorMessage(err, '시즌 저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: SeasonRow) => {
    if (deletingId != null) return
    if (!confirm(`「${row.name}」 시즌을 삭제할까요?`)) return
    setDeletingId(row.id)
    setError(null)
    try {
      await api.delete(`/api/seasons/${row.id}`)
      await load()
    } catch (err) {
      setError(parseApiErrorMessage(err, '시즌 삭제에 실패했습니다.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <ErpToolbar>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="시즌명 · 연도"
          className={[erpInputClass(), 'max-w-[12rem]'].join(' ')}
        />
        <ErpToolbarButton onClick={() => setQ('')}>초기화</ErpToolbarButton>
        <ErpToolbarButton onClick={() => void load()}>새로고침</ErpToolbarButton>
        <span className="ml-auto text-[11px] text-slate-500">{brandName}</span>
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
          <ErpGridWrap maxHeight="max-h-[min(24rem,calc(100vh-20rem))]">
            <ErpDataTable minWidth="640px">
              <thead>
                <tr>
                  <th className={erpGridHeadClass()}>시즌명</th>
                  <th className={erpGridHeadClass()}>유형</th>
                  <th className={erpGridHeadClass()}>연도</th>
                  <th className={erpGridHeadClass()}>기간</th>
                  <th className={erpGridHeadClass()}>상태</th>
                  <th className={[erpGridHeadClass(), 'w-10 text-center'].join(' ')}>
                    <span className="sr-only">삭제</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={erpGridCellClass('py-10 text-center text-slate-400')}>
                      등록된 시즌이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => openEdit(row)}
                      className="cursor-pointer hover:bg-blue-50/60"
                    >
                      <td className={erpGridCellClass('font-medium')}>{row.name}</td>
                      <td className={erpGridCellClass()}>{seasonTypeLabel(row.type)}</td>
                      <td className={erpGridCellClass()}>{row.year}</td>
                      <td className={erpGridCellClass('text-[11px]')}>
                        {row.startDate || row.endDate
                          ? `${row.startDate ?? '—'} ~ ${row.endDate ?? '—'}`
                          : '—'}
                      </td>
                      <td className={erpGridCellClass()}>{seasonStatusLabel(row.status)}</td>
                      <td className={erpGridCellClass('text-center')}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void remove(row)
                          }}
                          disabled={deletingId === row.id}
                          className="inline-flex items-center justify-center text-rose-600 hover:text-rose-800 disabled:opacity-60"
                          aria-label={deletingId === row.id ? '삭제 중…' : '삭제'}
                          title={deletingId === row.id ? '삭제 중…' : '삭제'}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </ErpDataTable>
          </ErpGridWrap>

          <ErpFooterBar>
            <ErpSecondaryButton onClick={() => void load()}>조회</ErpSecondaryButton>
            <ErpFooterPrimary>
              <ErpPrimaryButton onClick={openCreate}>
                <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                시즌 등록
              </ErpPrimaryButton>
            </ErpFooterPrimary>
          </ErpFooterBar>
        </>
      )}

      <Modal
        title={editingId != null ? '시즌 수정' : '시즌 등록'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">시즌명</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={erpInputClass()}
              placeholder="예: 2026 SS"
              maxLength={100}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">유형</span>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as SeasonType }))}
                className={erpInputClass()}
              >
                {SEASON_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">연도</span>
              <input
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                className={erpInputClass()}
                inputMode="numeric"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">시작일</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className={erpInputClass()}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">종료일</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className={erpInputClass()}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-slate-600">상태</span>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as SeasonStatus }))}
                className={erpInputClass()}
              >
                {SEASON_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
