import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { api } from '../../../lib/api'
import { getRole } from '../../../lib/auth'
import ErpPageFrame from '../../../components/ui/ErpPageFrame'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import {
  ErpChevronBack,
  ErpFooterPrimary,
  ErpFormCell,
  ErpFormLabel,
  ErpFormRow,
  ErpFormTable,
  ErpPrimaryButton,
} from '../../../components/ui/erp/ErpLayout'
import { erpInputClass } from '../../../lib/erpUi'
import {
  parseWarehouseApiError,
  type WarehouseListItem,
  type WarehouseStaffUser,
} from '../../../lib/warehouse'
import type { UserSummary } from '../../../types/models'

export default function WarehouseDetailPage() {
  const navigate = useNavigate()
  const { id: idParam } = useParams()
  const isHq = getRole() === 'HQ_STAFF'
  const id = idParam != null ? Number(idParam) : NaN

  const [warehouse, setWarehouse] = useState<WarehouseListItem | null>(null)
  const [staff, setStaff] = useState<WarehouseStaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [staffLoading, setStaffLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editName, setEditName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editManagerId, setEditManagerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const applyWarehouseToForm = (data: WarehouseListItem) => {
    setEditName(data.name)
    setEditLocation(data.location ?? '')
    setEditManagerId(data.managerId != null ? String(data.managerId) : '')
  }

  const loadWarehouse = useCallback(async () => {
    if (!Number.isFinite(id) || id < 1) {
      setError('잘못된 창고 번호입니다.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<WarehouseListItem>(`/api/warehouses/${id}`)
      const row = data ?? null
      setWarehouse(row)
      if (row) applyWarehouseToForm(row)
    } catch {
      setError('창고 정보를 불러오지 못했습니다.')
      setWarehouse(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadStaff = useCallback(async () => {
    setStaffLoading(true)
    try {
      const { data } = await api.get<UserSummary[]>('/api/users')
      const list = (data ?? [])
        .filter((u) => u.role === 'WAREHOUSE_STAFF')
        .map((u) => ({ id: u.id, name: u.name, email: u.email }))
      setStaff(list)
    } catch {
      setStaff([])
    } finally {
      setStaffLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWarehouse()
  }, [loadWarehouse])

  useEffect(() => {
    if (isHq) void loadStaff()
  }, [isHq, loadStaff])

  const save = async () => {
    if (!warehouse || !isHq || saving) return
    setSaveError(null)

    if (!editName.trim()) {
      setSaveError('창고명을 입력하세요.')
      return
    }
    if (!editLocation.trim()) {
      setSaveError('위치를 입력하세요.')
      return
    }

    const body: { name: string; location: string; managerId?: number | null } = {
      name: editName.trim(),
      location: editLocation.trim(),
    }
    if (editManagerId) {
      const mid = Number(editManagerId)
      if (Number.isFinite(mid) && mid > 0) body.managerId = mid
    } else {
      body.managerId = null
    }

    setSaving(true)
    try {
      await api.put(`/api/warehouses/${warehouse.id}`, body)
      await loadWarehouse()
    } catch (err) {
      setSaveError(parseWarehouseApiError(err, '저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!warehouse || !isHq || deleting) return
    if (!confirm(`「${warehouse.name}」 창고를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    setDeleting(true)
    setSaveError(null)
    try {
      await api.delete(`/api/warehouses/${warehouse.id}`)
      navigate('/admin/warehouses', { replace: true })
    } catch (err) {
      setSaveError(parseWarehouseApiError(err, '삭제에 실패했습니다.'))
    } finally {
      setDeleting(false)
    }
  }

  if (!isHq) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">창고 상세</h1>
        <p className="text-sm text-slate-500">본사(HQ) 권한에서만 접근할 수 있습니다.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <ErpPageFrame title="창고 상세" actions={<ErpChevronBack to="/admin/warehouses" label="창고 목록" />}>
        <div className="px-3 py-12">
          <LoadingSpinner />
        </div>
      </ErpPageFrame>
    )
  }

  if (error || !warehouse) {
    return (
      <ErpPageFrame title="창고 상세" actions={<ErpChevronBack to="/admin/warehouses" label="창고 목록" />}>
        <div className="px-3 py-8 text-center text-sm text-rose-600">{error ?? '창고를 찾을 수 없습니다.'}</div>
      </ErpPageFrame>
    )
  }

  return (
    <ErpPageFrame
      title={`창고 · ${warehouse.name}`}
      actions={
        <>
          <ErpChevronBack to="/admin/warehouses" label="창고 목록" />
          <button
            type="button"
            onClick={() => void remove()}
            disabled={deleting}
            className="ml-auto inline-flex items-center justify-center text-rose-600 hover:text-rose-800 disabled:opacity-60"
            aria-label={deleting ? '삭제 중…' : '삭제'}
            title={deleting ? '삭제 중…' : '삭제'}
          >
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        </>
      }
      footer={
        <>
          {saveError ? <span className="mr-auto text-xs text-rose-600">{saveError}</span> : null}
          <ErpFooterPrimary>
            <ErpPrimaryButton onClick={() => void save()} disabled={saving || staffLoading}>
              {saving ? '저장 중…' : '변경 저장'}
            </ErpPrimaryButton>
          </ErpFooterPrimary>
        </>
      }
    >
      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel>창고 ID</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            <span className="px-1 font-mono text-xs text-slate-700">{warehouse.id}</span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel required>창고명</ErpFormLabel>
          <ErpFormCell>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={erpInputClass()}
              maxLength={100}
            />
          </ErpFormCell>
          <ErpFormLabel required>위치</ErpFormLabel>
          <ErpFormCell>
            <input
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className={erpInputClass()}
              placeholder="도로명 또는 지번 주소"
            />
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>담당자</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            {staffLoading ? (
              <LoadingSpinner compact hideLabel />
            ) : (
              <select
                value={editManagerId}
                onChange={(e) => setEditManagerId(e.target.value)}
                className={erpInputClass()}
              >
                <option value="">담당자 미지정</option>
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            )}
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>
    </ErpPageFrame>
  )
}
