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
import type { Size } from '../../../types/models'

type SizeForm = {
  name: string
  skuCode: string
  sortOrder: string
}

const emptyForm: SizeForm = { name: '', skuCode: '', sortOrder: '' }

type Props = {
  brandName: string
}

export default function SizeManagePanel({ brandName }: Props) {
  const [sizes, setSizes] = useState<Size[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<SizeForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<Size[]>('/api/sizes')
      setSizes(data ?? [])
    } catch {
      setError('사이즈 목록을 불러오지 못했습니다.')
      setSizes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return sizes
      .filter((s) => {
        if (!needle) return true
        const hay = [s.name, s.skuCode, s.sortOrder != null ? String(s.sortOrder) : ''].join(' ')
        return hay.toLowerCase().includes(needle)
      })
      .sort((a, b) => {
        const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER
        const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER
        if (ao !== bo) return ao - bo
        return a.name.localeCompare(b.name, 'ko-KR')
      })
  }, [sizes, q])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (row: Size) => {
    setEditingId(row.id)
    setForm({
      name: row.name,
      skuCode: row.skuCode,
      sortOrder: row.sortOrder != null ? String(row.sortOrder) : '',
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.skuCode.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const sortOrderRaw = form.sortOrder.trim()
      const sortOrder = sortOrderRaw ? Number.parseInt(sortOrderRaw, 10) : undefined
      if (sortOrderRaw && !Number.isFinite(sortOrder)) {
        setError('정렬순서를 올바르게 입력하세요.')
        setSaving(false)
        return
      }
      const body = {
        name: form.name.trim(),
        skuCode: form.skuCode.trim(),
        ...(sortOrder != null ? { sortOrder } : {}),
      }
      if (editingId != null) {
        await api.put(`/api/sizes/${editingId}`, body)
      } else {
        await api.post('/api/sizes', body)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(parseApiErrorMessage(err, '사이즈 저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: Size) => {
    if (deletingId != null) return
    if (!confirm(`「${row.name}」 사이즈를 삭제할까요?`)) return
    setDeletingId(row.id)
    setError(null)
    try {
      await api.delete(`/api/sizes/${row.id}`)
      await load()
    } catch (err) {
      setError(parseApiErrorMessage(err, '사이즈 삭제에 실패했습니다.'))
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
          placeholder="사이즈명 · SKU코드"
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
            <ErpDataTable minWidth="520px">
              <thead>
                <tr>
                  <th className={erpGridHeadClass()}>사이즈명</th>
                  <th className={erpGridHeadClass()}>SKU 코드</th>
                  <th className={[erpGridHeadClass(), 'text-right'].join(' ')}>정렬순서</th>
                  <th className={[erpGridHeadClass(), 'w-10 text-center'].join(' ')}>
                    <span className="sr-only">삭제</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={erpGridCellClass('py-10 text-center text-slate-400')}>
                      등록된 사이즈가 없습니다.
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
                      <td className={erpGridCellClass('font-mono text-[11px]')}>{row.skuCode}</td>
                      <td className={erpGridCellClass('text-right tabular-nums')}>
                        {row.sortOrder ?? '—'}
                      </td>
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
                사이즈 등록
              </ErpPrimaryButton>
            </ErpFooterPrimary>
          </ErpFooterBar>
        </>
      )}

      <Modal
        title={editingId != null ? '사이즈 수정' : '사이즈 등록'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">사이즈명</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={erpInputClass()}
              placeholder="예: XXL"
              maxLength={20}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">SKU 코드</span>
            <input
              value={form.skuCode}
              onChange={(e) => setForm((f) => ({ ...f, skuCode: e.target.value.toUpperCase() }))}
              className={erpInputClass()}
              placeholder="예: 2X"
              maxLength={10}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">정렬순서 (선택)</span>
            <input
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              className={erpInputClass()}
              inputMode="numeric"
              placeholder="예: 3"
            />
          </label>
          <div className="flex justify-end gap-2">
            <ErpSecondaryButton onClick={() => setModalOpen(false)}>취소</ErpSecondaryButton>
            <ErpPrimaryButton onClick={() => void save()} disabled={saving}>
              {saving ? '저장 중…' : '저장'}
            </ErpPrimaryButton>
          </div>
        </div>
      </Modal>
    </>
  )
}
