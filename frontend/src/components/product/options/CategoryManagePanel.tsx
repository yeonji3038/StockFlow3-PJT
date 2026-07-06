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

type CategoryNode = {
  id: number
  name: string
  code: string
  children?: CategoryNode[]
}

type CategoryRow = {
  id: number
  name: string
  code: string
  path: string
  parentId: number | null
  depth: number
}

type CategoryForm = {
  name: string
  code: string
  parentId: string
}

const emptyForm: CategoryForm = { name: '', code: '', parentId: '' }

function flattenCategories(nodes: CategoryNode[], parentLabel = '', parentId: number | null = null, depth = 0): CategoryRow[] {
  const rows: CategoryRow[] = []
  for (const n of nodes) {
    const path = parentLabel ? `${parentLabel} › ${n.name}` : n.name
    rows.push({ id: n.id, name: n.name, code: n.code, path, parentId, depth })
    if (n.children?.length) {
      rows.push(...flattenCategories(n.children, path, n.id, depth + 1))
    }
  }
  return rows
}

type Props = {
  brandId: number
  brandName: string
}

export default function CategoryManagePanel({ brandName }: Props) {
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
    return rows.filter((r) => {
      const hay = [r.path, r.code].join(' ').toLowerCase()
      return hay.includes(needle)
    })
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
      code: row.code,
      parentId: row.parentId != null ? String(row.parentId) : '',
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.code.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
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
      <ErpToolbar>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="카테고리명 검색"
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
            <ErpDataTable minWidth="480px">
              <thead>
                <tr>
                  <th className={erpGridHeadClass()}>카테고리</th>
                  <th className={erpGridHeadClass()}>코드</th>
                  <th className={[erpGridHeadClass(), 'w-10 text-center'].join(' ')}>
                    <span className="sr-only">삭제</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={erpGridCellClass('py-10 text-center text-slate-400')}>
                      등록된 카테고리가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => openEdit(row)}
                      className="cursor-pointer hover:bg-blue-50/60"
                    >
                      <td
                        className={erpGridCellClass()}
                        style={{ paddingLeft: `${8 + row.depth * 14}px` }}
                      >
                        {row.path}
                      </td>
                      <td className={erpGridCellClass('font-mono text-[11px]')}>{row.code}</td>
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
                카테고리 등록
              </ErpPrimaryButton>
            </ErpFooterPrimary>
          </ErpFooterBar>
        </>
      )}

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
              className={erpInputClass()}
              placeholder="예: 바지, 바람막이, 상의"
              maxLength={100}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">카테고리 코드</span>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              className={erpInputClass()}
              placeholder="예: TS"
              maxLength={20}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">상위 카테고리</span>
            <select
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              className={erpInputClass()}
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
