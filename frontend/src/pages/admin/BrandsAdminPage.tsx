import { getRole } from '../../lib/auth'
import BrandManagePanel from '../../components/admin/BrandManagePanel'

export default function BrandsAdminPage() {
  const isHq = getRole() === 'HQ_STAFF'

  if (!isHq) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">브랜드 관리</h1>
        <p className="text-sm text-slate-500">본사(HQ) 권한에서만 접근할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">브랜드 관리</h1>
        <p className="mt-1 text-sm text-slate-600">브랜드를 등록·수정·삭제합니다.</p>
      </div>
      <BrandManagePanel />
    </div>
  )
}
