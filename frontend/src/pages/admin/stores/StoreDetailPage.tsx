import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { api } from '../../../lib/api'
import { getRole } from '../../../lib/auth'
import ErpPageFrame from '../../../components/ui/ErpPageFrame'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import {
  ErpChevronBack,
  ErpDataTable,
  ErpFooterPrimary,
  ErpFormCell,
  ErpFormLabel,
  ErpFormRow,
  ErpFormTable,
  ErpGridWrap,
  ErpPrimaryButton,
  ErpSectionCaption,
} from '../../../components/ui/erp/ErpLayout'
import { erpGridCellClass, erpGridHeadClass, erpInputClass } from '../../../lib/erpUi'
import {
  parseStoreApiError,
  STORE_TYPE_OPTIONS,
  userRoleLabel,
  type BrandListItem,
  type StoreListItem,
  type StoreType,
  type StoreUserItem,
} from '../../../lib/store'

export default function StoreDetailPage() {
  const navigate = useNavigate()
  const { id: idParam } = useParams()
  const isHq = getRole() === 'HQ_STAFF'
  const id = idParam != null ? Number(idParam) : NaN

  const [store, setStore] = useState<StoreListItem | null>(null)
  const [users, setUsers] = useState<StoreUserItem[]>([])
  const [brands, setBrands] = useState<BrandListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true)
  const [brandsLoading, setBrandsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usersError, setUsersError] = useState<string | null>(null)

  const [editBrandId, setEditBrandId] = useState('')
  const [editName, setEditName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editStoreType, setEditStoreType] = useState<StoreType>('DEPARTMENT')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const applyStoreToForm = (data: StoreListItem) => {
    setEditBrandId(data.brandId != null ? String(data.brandId) : '')
    setEditName(data.name)
    setEditLocation(data.location ?? '')
    setEditStoreType(data.storeType)
    setEditPhone(data.phone ?? '')
  }

  const loadStore = useCallback(async () => {
    if (!Number.isFinite(id) || id < 1) {
      setError('잘못된 매장 번호입니다.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<StoreListItem>(`/api/stores/${id}`)
      const row = data ?? null
      setStore(row)
      if (row) applyStoreToForm(row)
    } catch {
      setError('매장 정보를 불러오지 못했습니다.')
      setStore(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadUsers = useCallback(async () => {
    if (!Number.isFinite(id) || id < 1) {
      setUsersLoading(false)
      return
    }
    setUsersLoading(true)
    setUsersError(null)
    try {
      const { data } = await api.get<StoreUserItem[]>(`/api/stores/${id}/users`)
      setUsers(data ?? [])
    } catch {
      setUsersError('담당자 목록을 불러오지 못했습니다.')
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [id])

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true)
    try {
      const { data } = await api.get<BrandListItem[]>('/api/brands')
      setBrands(data ?? [])
    } catch {
      setBrands([])
    } finally {
      setBrandsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStore()
  }, [loadStore])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  useEffect(() => {
    if (isHq) void loadBrands()
  }, [isHq, loadBrands])

  const save = async () => {
    if (!store || !isHq || saving) return
    setSaveError(null)

    const brandId = Number(editBrandId)
    if (!Number.isFinite(brandId) || brandId < 1) {
      setSaveError('브랜드를 선택하세요.')
      return
    }
    if (!editName.trim()) {
      setSaveError('매장명을 입력하세요.')
      return
    }
    if (!editLocation.trim()) {
      setSaveError('위치를 입력하세요.')
      return
    }

    setSaving(true)
    try {
      await api.put(`/api/stores/${store.id}`, {
        brandId,
        name: editName.trim(),
        location: editLocation.trim(),
        storeType: editStoreType,
        phone: editPhone.trim() || undefined,
      })
      await loadStore()
    } catch (err) {
      setSaveError(parseStoreApiError(err, '저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!store || !isHq || deleting) return
    if (!confirm(`「${store.name}」 매장을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    setDeleting(true)
    setSaveError(null)
    try {
      await api.delete(`/api/stores/${store.id}`)
      navigate('/admin/stores', { replace: true })
    } catch (err) {
      setSaveError(parseStoreApiError(err, '삭제에 실패했습니다.'))
    } finally {
      setDeleting(false)
    }
  }

  if (!isHq) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">매장 상세</h1>
        <p className="text-sm text-slate-500">본사(HQ) 권한에서만 접근할 수 있습니다.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <ErpPageFrame title="매장 상세" actions={<ErpChevronBack to="/admin/stores" label="매장 목록" />}>
        <div className="px-3 py-12">
          <LoadingSpinner />
        </div>
      </ErpPageFrame>
    )
  }

  if (error || !store) {
    return (
      <ErpPageFrame title="매장 상세" actions={<ErpChevronBack to="/admin/stores" label="매장 목록" />}>
        <div className="px-3 py-8 text-center text-sm text-rose-600">{error ?? '매장을 찾을 수 없습니다.'}</div>
      </ErpPageFrame>
    )
  }

  return (
    <ErpPageFrame
      title={`매장 · ${store.name}`}
      actions={
        <>
          <ErpChevronBack to="/admin/stores" label="매장 목록" />
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
            <ErpPrimaryButton onClick={() => void save()} disabled={saving || brandsLoading}>
              {saving ? '저장 중…' : '변경 저장'}
            </ErpPrimaryButton>
          </ErpFooterPrimary>
        </>
      }
    >
      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel>매장 ID</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 font-mono text-xs text-slate-700">{store.id}</span>
          </ErpFormCell>
          <ErpFormLabel>매장코드</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 font-mono text-xs text-slate-700">{store.storeCode ?? '—'}</span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel required>브랜드</ErpFormLabel>
          <ErpFormCell>
            {brandsLoading ? (
              <LoadingSpinner compact hideLabel />
            ) : (
              <select
                value={editBrandId}
                onChange={(e) => setEditBrandId(e.target.value)}
                className={erpInputClass()}
              >
                <option value="">선택</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </ErpFormCell>
          <ErpFormLabel required>매장명</ErpFormLabel>
          <ErpFormCell>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={erpInputClass()}
              maxLength={100}
            />
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel required>위치</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            <input
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className={erpInputClass()}
              placeholder="도로명 또는 지번 주소"
            />
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel required>유형</ErpFormLabel>
          <ErpFormCell>
            <select
              value={editStoreType}
              onChange={(e) => setEditStoreType(e.target.value as StoreType)}
              className={erpInputClass()}
            >
              {STORE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </ErpFormCell>
          <ErpFormLabel>전화번호</ErpFormLabel>
          <ErpFormCell>
            <input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className={erpInputClass()}
              placeholder="02-0000-0000"
            />
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>등록일</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            <span className="px-1 text-xs text-slate-700">
              {store.createdAt ? new Date(store.createdAt).toLocaleString('ko-KR') : '—'}
            </span>
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>

      <ErpSectionCaption>담당자 목록</ErpSectionCaption>
      {usersLoading ? (
        <div className="px-3 py-8">
          <LoadingSpinner />
        </div>
      ) : usersError ? (
        <div className="space-y-2 px-3 py-4">
          <p className="text-sm text-rose-600">{usersError}</p>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <ErpGridWrap maxHeight="max-h-64">
          <ErpDataTable minWidth="480px">
            <thead>
              <tr>
                <th className={erpGridHeadClass()}>이름</th>
                <th className={erpGridHeadClass()}>이메일</th>
                <th className={erpGridHeadClass()}>역할</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={3} className={erpGridCellClass('py-8 text-center text-slate-400')}>
                    등록된 담당자가 없습니다.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-blue-50/40">
                    <td className={erpGridCellClass('font-medium')}>{u.name}</td>
                    <td className={erpGridCellClass()}>{u.email}</td>
                    <td className={erpGridCellClass()}>{userRoleLabel(u.role)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </ErpDataTable>
        </ErpGridWrap>
      )}
    </ErpPageFrame>
  )
}
