import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  ShoppingCart,
  Warehouse,
  Store,
  History,
  Users,
  LogOut,
  Boxes,
  Layers,
  Award,
  Building2,
  Plus,
  Tag,
} from 'lucide-react'
import { getRole, getStoreId, logout, roleLabel } from '../../lib/auth'
import { api } from '../../lib/api'
import type { StoreListItem } from '../../lib/store'
import LoadingSpinner from '../ui/LoadingSpinner'

const baseNav = [
  { to: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { to: '/orders', label: '발주 관리', icon: ShoppingCart },
  { to: '/warehouse-stock', label: '창고 재고', icon: Warehouse },
  { to: '/store-stock', label: '매장 재고', icon: Store },
  { to: '/movements', label: '입출고 이력', icon: History },
] as const

export default function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const name = localStorage.getItem('name') ?? '사용자'
  const role = getRole()
  const storeId = getStoreId()
  const [storeName, setStoreName] = useState<string | null>(null)
  const [storeNameLoading, setStoreNameLoading] = useState(storeId != null)
  const isHq = role === 'HQ_STAFF'
  const isStoreManager = role === 'STORE_MANAGER'
  const isWarehouseStaff = role === 'WAREHOUSE_STAFF'

  /** HQ만 타 역할 메뉴에 창고 재고. 매장: 발주·매장재고·입출고. 창고: 대시보드·창고재고·입출고 */
  const nav = useMemo(() => {
    if (isWarehouseStaff) {
      return baseNav.filter((item) =>
        ['/dashboard', '/warehouse-stock', '/movements'].includes(item.to),
      )
    }
    if (isStoreManager) {
      return baseNav.filter((item) =>
        ['/dashboard', '/orders', '/store-stock', '/movements'].includes(item.to),
      )
    }
    return baseNav.filter((item) => {
      if (item.to === '/warehouse-stock') return isHq
      return true
    })
  }, [isHq, isStoreManager, isWarehouseStaff])

  const allocationsManageActive =
    pathname === '/allocations' || /^\/allocations\/\d+$/.test(pathname)
  const allocationNewActive = pathname === '/allocations/new'
  const allocationSectionActive = allocationsManageActive || allocationNewActive

  const [allocHover, setAllocHover] = useState(false)
  const [allocFocusInside, setAllocFocusInside] = useState(false)
  const showAllocSub = allocHover || allocationNewActive || allocFocusInside

  const productsNewActive = pathname === '/admin/products/new'
  const productsOptionsActive =
    pathname === '/admin/product-options' || /^\/admin\/product-options\/\d+$/.test(pathname)
  const productsDetailActive = /^\/admin\/products\/\d+$/.test(pathname)
  const productSectionActive =
    pathname === '/admin/products' ||
    productsNewActive ||
    productsOptionsActive ||
    productsDetailActive
  const [productHover, setProductHover] = useState(false)
  const [productFocusInside, setProductFocusInside] = useState(false)
  const showProductSub =
    productHover ||
    productsNewActive ||
    productsOptionsActive ||
    productFocusInside ||
    productsDetailActive

  const storesNewActive = pathname === '/admin/stores/new'
  const storesDetailActive = /^\/admin\/stores\/\d+$/.test(pathname)
  const storeSectionActive =
    pathname === '/admin/stores' || storesNewActive || storesDetailActive
  const [storeHover, setStoreHover] = useState(false)
  const [storeFocusInside, setStoreFocusInside] = useState(false)
  const showStoreSub = storeHover || storesNewActive || storeFocusInside || storesDetailActive

  useEffect(() => {
    if (storeId == null) {
      setStoreName(null)
      setStoreNameLoading(false)
      return
    }

    let cancelled = false
    setStoreNameLoading(true)
    ;(async () => {
      try {
        const { data } = await api.get<StoreListItem>(`/api/stores/${storeId}`)
        if (!cancelled) setStoreName(data?.name?.trim() ? data.name.trim() : null)
      } catch {
        if (!cancelled) setStoreName(null)
      } finally {
        if (!cancelled) setStoreNameLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [storeId])

  const storeAffiliationLabel = useMemo(() => {
    if (storeId == null) return null
    if (storeNameLoading) return null
    if (storeName) return storeName
    return `매장 ID ${storeId}`
  }, [storeId, storeName, storeNameLoading])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Boxes className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900">StockFlow</p>
            <p className="text-xs text-slate-500">재고관리</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-900',
              ].join(' ')
            }
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            {label}
          </NavLink>
        ))}

        {isHq ? (
          <div
            className={[
              'rounded-lg transition-colors',
              allocationSectionActive ? 'bg-white shadow-sm ring-1 ring-slate-200/80' : '',
            ].join(' ')}
            onMouseEnter={() => setAllocHover(true)}
            onMouseLeave={() => setAllocHover(false)}
            onFocusCapture={() => setAllocFocusInside(true)}
            onBlurCapture={(e) => {
              const next = e.relatedTarget as Node | null
              if (!e.currentTarget.contains(next)) setAllocFocusInside(false)
            }}
          >
            <NavLink
              to="/allocations"
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive || allocationNewActive
                    ? 'text-blue-700'
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900',
                ].join(' ')
              }
            >
              <Package className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              배분 관리
            </NavLink>
            {showAllocSub ? (
              <div className="space-y-0.5 pb-1 pl-3">
                <div className="ml-3 border-l border-slate-200 pl-2">
                  <NavLink
                    to="/allocations/new"
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 rounded-lg py-2 pl-2 pr-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-slate-50 text-blue-700 ring-1 ring-slate-200/80'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                      ].join(' ')
                    }
                  >
                    <PackagePlus className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    배분 생성
                  </NavLink>
                </div>
              </div>
            ) : null}
          </div>
        ) : isStoreManager || isWarehouseStaff ? (
          <NavLink
            to="/allocations"
            end
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive || allocationsManageActive
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-900',
              ].join(' ')
            }
          >
            <Package className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            배분 관리
          </NavLink>
        ) : null}

        {isHq ? (
          <>
            <div
              className={[
                'mt-2 rounded-lg transition-colors',
                productSectionActive ? 'bg-white shadow-sm ring-1 ring-slate-200/80' : '',
              ].join(' ')}
              onMouseEnter={() => setProductHover(true)}
              onMouseLeave={() => setProductHover(false)}
              onFocusCapture={() => setProductFocusInside(true)}
              onBlurCapture={(e) => {
                const next = e.relatedTarget as Node | null
                if (!e.currentTarget.contains(next)) setProductFocusInside(false)
              }}
            >
              <NavLink
                to="/admin/products"
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive || productsNewActive || productsOptionsActive || productsDetailActive
                      ? 'text-blue-700'
                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-900',
                  ].join(' ')
                }
              >
                <Tag className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                상품 관리
              </NavLink>
              {showProductSub ? (
                <div className="space-y-0.5 pb-1 pl-3">
                  <div className="ml-3 border-l border-slate-200 pl-2">
                    <NavLink
                      to="/admin/products/new"
                      className={({ isActive }) =>
                        [
                          'flex items-center gap-3 rounded-lg py-2 pl-2 pr-3 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-slate-50 text-blue-700 ring-1 ring-slate-200/80'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        ].join(' ')
                      }
                    >
                      <PackagePlus className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      상품 등록
                    </NavLink>
                    <NavLink
                      to="/admin/product-options"
                      className={({ isActive }) =>
                        [
                          'flex items-center gap-3 rounded-lg py-2 pl-2 pr-3 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-slate-50 text-blue-700 ring-1 ring-slate-200/80'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        ].join(' ')
                      }
                    >
                      <Layers className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      상품 옵션 관리
                    </NavLink>
                  </div>
                </div>
              ) : null}
            </div>
            <NavLink
              to="/admin/brands"
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80'
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900',
                ].join(' ')
              }
            >
              <Award className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              브랜드 관리
            </NavLink>
            <div
              className={[
                'rounded-lg transition-colors',
                storeSectionActive ? 'bg-white shadow-sm ring-1 ring-slate-200/80' : '',
              ].join(' ')}
              onMouseEnter={() => setStoreHover(true)}
              onMouseLeave={() => setStoreHover(false)}
              onFocusCapture={() => setStoreFocusInside(true)}
              onBlurCapture={(e) => {
                const next = e.relatedTarget as Node | null
                if (!e.currentTarget.contains(next)) setStoreFocusInside(false)
              }}
            >
              <NavLink
                to="/admin/stores"
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive || storesNewActive || storesDetailActive
                      ? 'text-blue-700'
                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-900',
                  ].join(' ')
                }
              >
                <Building2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                매장 관리
              </NavLink>
              {showStoreSub ? (
                <div className="space-y-0.5 pb-1 pl-3">
                  <div className="ml-3 border-l border-slate-200 pl-2">
                    <NavLink
                      to="/admin/stores/new"
                      className={({ isActive }) =>
                        [
                          'flex items-center gap-3 rounded-lg py-2 pl-2 pr-3 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-slate-50 text-blue-700 ring-1 ring-slate-200/80'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        ].join(' ')
                      }
                    >
                      <Plus className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      매장 등록
                    </NavLink>
                  </div>
                </div>
              ) : null}
            </div>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80'
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900',
                ].join(' ')
              }
            >
              <Users className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              사용자 관리
            </NavLink>
          </>
        ) : null}
      </nav>

      <div className="border-t border-slate-200 bg-slate-100/80 p-4">
        <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <p className="truncate text-sm font-medium text-slate-900">{name}</p>
          {storeId != null ? (
            storeNameLoading ? (
              <div className="mt-1">
                <LoadingSpinner compact hideLabel />
              </div>
            ) : storeAffiliationLabel ? (
              <p className="mt-0.5 truncate text-xs font-medium text-blue-700">{storeAffiliationLabel}</p>
            ) : null
          ) : null}
          <p className="mt-0.5 text-xs text-slate-500">
            {role ? roleLabel(role) : '역할 없음'}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            {new Date().toLocaleDateString('ko-KR', {
              weekday: 'short',
              month: 'numeric',
              day: 'numeric',
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
