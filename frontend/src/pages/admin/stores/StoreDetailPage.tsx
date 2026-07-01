import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../../lib/api'
import { getRole } from '../../../lib/auth'
import SectionCard from '../../../components/ui/SectionCard'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import {
  storeTypeLabel,
  userRoleLabel,
  type StoreListItem,
  type StoreUserItem,
} from '../../../lib/store'

export default function StoreDetailPage() {
  const { id: idParam } = useParams()
  const isHq = getRole() === 'HQ_STAFF'
  const id = idParam != null ? Number(idParam) : NaN

  const [store, setStore] = useState<StoreListItem | null>(null)
  const [users, setUsers] = useState<StoreUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usersError, setUsersError] = useState<string | null>(null)

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
      setStore(data ?? null)
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

  useEffect(() => {
    void loadStore()
  }, [loadStore])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

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
      <div className="space-y-4">
        <Link
          to="/admin/stores"
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← 매장 목록
        </Link>
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/stores"
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← 매장 목록
        </Link>
        <p className="text-sm text-rose-600">{error ?? '매장을 찾을 수 없습니다.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          to="/admin/stores"
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← 매장 목록
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">{store.name}</h1>
        <p className="mt-1 text-sm text-slate-500">매장 ID {store.id}</p>
      </div>

      <SectionCard title="기본 정보">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-500">매장명</dt>
            <dd className="mt-0.5 text-slate-900">{store.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">위치</dt>
            <dd className="mt-0.5 text-slate-900">{store.location ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">유형</dt>
            <dd className="mt-0.5 text-slate-900">{storeTypeLabel(store.storeType)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">전화번호</dt>
            <dd className="mt-0.5 text-slate-900">{store.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">매장코드</dt>
            <dd className="mt-0.5 font-mono text-slate-900">{store.storeCode ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">등록일</dt>
            <dd className="mt-0.5 text-slate-900">
              {store.createdAt ? new Date(store.createdAt).toLocaleString('ko-KR') : '—'}
            </dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="담당자 목록">
        {usersLoading ? (
          <LoadingSpinner />
        ) : usersError ? (
          <div className="space-y-2">
            <p className="text-sm text-rose-600">{usersError}</p>
            <button
              type="button"
              onClick={() => void loadUsers()}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-100">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-3 py-2.5">이름</th>
                  <th className="px-3 py-2.5">이메일</th>
                  <th className="px-3 py-2.5">역할</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-10 text-center text-slate-400">
                      등록된 담당자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-100 even:bg-slate-50/40"
                    >
                      <td className="px-3 py-2 font-medium text-slate-800">{u.name}</td>
                      <td className="px-3 py-2 text-slate-700">{u.email}</td>
                      <td className="px-3 py-2 text-slate-700">{userRoleLabel(u.role)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
