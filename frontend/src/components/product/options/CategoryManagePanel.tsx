import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../../lib/api'
import SectionCard from '../../ui/SectionCard'
import LoadingSpinner from '../../ui/LoadingSpinner'
import Modal from '../../ui/Modal'
import { parseApiErrorMessage, productOptionInputClass } from '../../../lib/productOption'

type CategoryNode = {
  id: number
  name: string
  children?: CategoryNode[]
}

type CategoryRow = {
  id: number
  name: string
  path: string
  parentId: number | null
  depth: number
}

type CategoryForm = {
  name: string
  parentId: string
}

const emptyForm: CategoryForm = { name: '', parentId: '' }

function flattenCategories(nodes: CategoryNode[], parentLabel = '', parentId: number | null = null, depth = 0): CategoryRow[] {
  const rows: CategoryRow[] = []
  for (const n of nodes) {
    const path = parentLabel ? `${parentLabel} › ${n.name}` : n.name
    rows.push({ id: n.id, name: n.name, path, parentId, depth })
    if (n.children?.length) {
      rows.push(...flattenCategories(n.children, path, n.id, depth + 1))
    }
  }
  return rows
}

function inputClass() {
  return productOptionInputClass()
}

export default function CategoryManagePanel() {
  const [tree, setTree] = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CategoryForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<CategoryNode[]>('/api/categories')
      setTree(data ?? [])
    } catch {
      setError('카테고리 목록을 불러오지 못했습니다.')
      setTree([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => flattenCategories(tree), [tree])
  const topLevel = useMemo(() => tree.map((n) => ({ id: n.id, name: n.name })), [tree])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) => r.path.toLowerCase().includes(needle))
  }, [rows, q])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (row: CategoryRow) => {
    setEditingId(row.id)
    setForm({
      name: row.name,
      parentId: row.parentId != null ? String(row.parentId) : '',
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        name: form.name.trim(),
        parentId: form.parentId ? Number(form.parentId) : null,
      }
      if (editingId != null) {
        await api.put(`/api/categories/${editingId}`, body)
      } else {
        await api.post('/api/categories', body)
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(parseApiErrorMessage(err, '카테고리 저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: CategoryRow) => {
    if (deletingId != null) return
    if (!confirm(`「${row.path}」 카테고리를 삭제할까요?`)) return
    setDeletingId(row.id)
    setError(null)
    try {
      await api.delete(`/api/categories/${row.id}`)
      await load()
    } catch (err) {
      setError(parseApiErrorMessage(err, '카테고리 삭제에 실패했습니다.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <SectionCard
        title="카테고리"
        headerRight={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="카테고리명 검색"
              className="h-9 min-w-[10rem] rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              카테고리 등록
            </button>
          </div>
        }
      >
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-3">
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <p className="text-xs text-slate-500">
              상의, 바지, 바람막이 등 상품 분류를 만듭니다. 소분류는 상위 카테고리를 선택해 등록합니다.
            </p>
            <div className="overflow-x-auto rounded-md border border-slate-100">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2.5">카테고리</th>
                    <th className="px-3 py-2.5 text-right">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-10 text-center text-slate-400">
                        등록된 카테고리가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 even:bg-slate-50/40 hover:bg-blue-50/50"
                      >
                        <td className="px-3 py-2 text-slate-800" style={{ paddingLeft: `${12 + row.depth * 16}px` }}>
                          {row.path}
                        </td>
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
        title={editingId != null ? '카테고리 수정' : '카테고리 등록'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">카테고리명</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass()}
              placeholder="예: 바지, 바람막이, 상의"
              maxLength={100}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">상위 카테고리</span>
            <select
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              className={inputClass()}
            >
              <option value="">없음 (대분류)</option>
              {topLevel
                .filter((c) => c.id !== editingId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
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
