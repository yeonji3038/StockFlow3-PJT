import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../lib/api'
import LoadingSpinner from '../../ui/LoadingSpinner'
import {
  parseWarehouseApiError,
  warehouseInputClass,
  type WarehouseListItem,
  type WarehouseStaffUser,
} from '../../../lib/warehouse'
import type { UserSummary } from '../../../types/models'

export default function WarehouseRegisterForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [managerId, setManagerId] = useState('')

  const [staff, setStaff] = useState<WarehouseStaffUser[]>([])
  const [staffLoading, setStaffLoading] = useState(true)
  const [staffError, setStaffError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadStaff = useCallback(async () => {
    setStaffLoading(true)
    setStaffError(null)
    try {
      const { data } = await api.get<UserSummary[]>('/api/users')
      const list = (data ?? [])
        .filter((u) => u.role === 'WAREHOUSE_STAFF')
        .map((u) => ({ id: u.id, name: u.name, email: u.email }))
      setStaff(list)
    } catch {
      setStaff([])
      setStaffError('창고 담당자 목록을 불러오지 못했습니다. 담당자 없이 등록할 수 있습니다.')
    } finally {
      setStaffLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStaff()
  }, [loadStaff])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!name.trim()) {
      setFormError('창고명을 입력하세요.')
      return
    }
    if (!location.trim()) {
      setFormError('위치를 입력하세요.')
      return
    }

    const body: { name: string; location: string; managerId?: number } = {
      name: name.trim(),
      location: location.trim(),
    }
    if (managerId) {
      const mid = Number(managerId)
      if (Number.isFinite(mid) && mid > 0) body.managerId = mid
    }

    setSubmitting(true)
    setFormError(null)
    try {
      await api.post<WarehouseListItem>('/api/warehouses', body)
      navigate('/admin/warehouses', { replace: true })
    } catch (err) {
      setFormError(parseWarehouseApiError(err, '창고 등록에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">창고명</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={warehouseInputClass()}
          placeholder="예: 수도권 물류센터"
          maxLength={100}
          required
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">위치</span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={warehouseInputClass()}
          placeholder="도로명 또는 지번 주소"
          required
        />
      </label>

      {staffLoading ? (
        <LoadingSpinner label="담당자 목록을 불러오는 중…" />
      ) : (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">담당자 (선택)</span>
          <select
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            className={warehouseInputClass()}
          >
            <option value="">담당자 미지정</option>
            {staff.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </label>
      )}

      {staffError ? <p className="text-sm text-amber-600">{staffError}</p> : null}
      {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => navigate('/admin/warehouses')}
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
        >
          {submitting ? '등록 중…' : '창고 등록'}
        </button>
      </div>
    </form>
  )
}
