import { useLocation } from 'react-router-dom'
import { getRole } from '../../../lib/auth'
import CategoryManagePanel from '../../../components/product/options/CategoryManagePanel'
import SeasonManagePanel from '../../../components/product/options/SeasonManagePanel'
import ProductOptionListPanel from '../../../components/product/options/ProductOptionListPanel'

export default function ProductOptionsPage() {
  const { key } = useLocation()
  const isHq = getRole() === 'HQ_STAFF'

  if (!isHq) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">상품 옵션 관리</h1>
        <p className="text-sm text-slate-500">본사(HQ) 권한에서만 접근할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">상품 옵션 관리</h1>
        <p className="mt-1 text-sm text-slate-600">
          카테고리·시즌·SKU(색상·사이즈·상품코드) 기준 데이터를 등록·관리합니다. 브랜드·매장은
          각각 「브랜드 관리」「매장 관리」 메뉴에서 다룹니다.
        </p>
      </div>

      <CategoryManagePanel />
      <SeasonManagePanel />
      <ProductOptionListPanel canMutate={isHq} refreshKey={key} />
    </div>
  )
}
