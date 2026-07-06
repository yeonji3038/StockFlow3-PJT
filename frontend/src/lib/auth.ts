import { api } from './api'

export type UserRole = 'HQ_STAFF' | 'STORE_MANAGER' | 'WAREHOUSE_STAFF'

/** 로컬에 저장된 사용자 프로필로 세션 여부 추정 (실제 인증은 HttpOnly 쿠키) */
export function hasUserSession(): boolean {
  return getRole() != null
}

/** 쿠키 기반 세션 갱신 */
export async function trySilentRefresh(): Promise<boolean> {
  try {
    await api.post('/api/auth/refresh')
    return true
  } catch {
    clearUserSession()
    return false
  }
}

let refreshInFlight: Promise<boolean> | null = null

/** 동시 401 여러 건에서 리프레시 한 번만 호출 */
export function refreshAccessTokenSingleFlight(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = trySilentRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export function getRole(): UserRole | null {
  const r = localStorage.getItem('role')
  if (r === 'HQ_STAFF' || r === 'STORE_MANAGER' || r === 'WAREHOUSE_STAFF') {
    return r
  }
  return null
}

export function getStoreId(): number | null {
  const v = localStorage.getItem('storeId')
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function getWarehouseId(): number | null {
  const v = localStorage.getItem('warehouseId')
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** 로그인 시 저장한 이메일(승인 API용 본인 조회 등) */
export function getUserEmail(): string | null {
  const v = localStorage.getItem('userEmail')
  return v != null && v !== '' ? v : null
}

/** 백엔드가 로그인 응답에 userId를 내려줄 때만 사용 */
export function getUserId(): number | null {
  const v = localStorage.getItem('userId')
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function clearUserSession(): void {
  localStorage.removeItem('role')
  localStorage.removeItem('name')
  localStorage.removeItem('userEmail')
  localStorage.removeItem('userId')
  localStorage.removeItem('storeId')
  localStorage.removeItem('warehouseId')
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout')
  } catch {
    // ignore
  }
  clearUserSession()
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'HQ_STAFF':
      return '본사'
    case 'STORE_MANAGER':
      return '매장 관리자'
    case 'WAREHOUSE_STAFF':
      return '창고 담당'
    default:
      return role
  }
}
