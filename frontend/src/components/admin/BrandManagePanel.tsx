import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import SectionCard from '../ui/SectionCard'
import LoadingSpinner from '../ui/LoadingSpinner'
import Modal from '../ui/Modal'
import { parseApiErrorMessage, productOptionInputClass } from '../../lib/productOption'

type BrandRow = {
  id: number
  name: string
  description: string | null
}

type BrandForm = {
  name: string
  description: string
}

const emptyForm: BrandForm = { name: '', description: '' }

function inputClass() {
  return productOptionInputClass()
}

export default function BrandManagePanel() {
  const [brands, setBrands] = useState<BrandRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<BrandForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<BrandRow[]>('/api/brands')
      setBrands(data ?? [])
    } catch {
      setError('브랜드 목록을 불러오지 못했습니다.')
      setBrands([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return brands
      .filter((b) => {
        if (!needle) return true
        const hay = [b.name, b.description ?? ''].join(' ').toLowerCase()
        return hay.includes(needle)
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
  }, [brands, q])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (row: BrandRow) => {
    setEditingId(row.id)
    setForm({ name: row.name, description: row.description ?? '' })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      }
      if (editingId != null) {
        await api.put(`/api/brands/${editingId}`, body)
      } else {
        await api.post('/api/brands', body)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(parseApiErrorMessage(err, '브랜드 저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: BrandRow) => {
    if (deletingId != null) return
    if (!confirm(`「${row.name}」 브랜드를 삭제할까요?`)) return
    setDeletingId(row.id)
    setError(null)
    try {
      await api.delete(`/api/brands/${row.id}`)
      await load()
    } catch (err) {
      setError(parseApiErrorMessage(err, '브랜드 삭제에 실패했습니다.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <SectionCard
        title="브랜드 목록"
        headerRight={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="브랜드명 검색"
              className="h-9 min-w-[10rem] rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              브랜드 등록
            </button>
          </div>
        }
      >
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-3">
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <div className="overflow-x-auto rounded-md border border-slate-100">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2.5">브랜드명</th>
                    <th className="px-3 py-2.5">설명</th>
                    <th className="px-3 py-2.5 text-right">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-10 text-center text-slate-400">
                        등록된 브랜드가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 even:bg-slate-50/40 hover:bg-blue-50/50"
                      >
                        <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                        <td className="px-3 py-2 text-slate-600">{row.description ?? '—'}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => void remove(row)}
                              disabled={deletingId === row.id}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 shadow-sm hover:bg-rose-100 disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      <Modal
        title={editingId != null ? '브랜드 수정' : '브랜드 등록'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">브랜드명</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass()}
              placeholder="예: 테스트브랜드"
              maxLength={100}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">설명 (선택)</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="min-h-[72px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={2}
            />
          </label>
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
