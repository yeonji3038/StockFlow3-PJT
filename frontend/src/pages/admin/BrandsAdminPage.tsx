import { getRole } from '../../lib/auth'
import BrandManagePanel from '../../components/admin/BrandManagePanel'
import ErpPageFrame, { ErpAccessDenied } from '../../components/ui/ErpPageFrame'

export default function BrandsAdminPage() {
  const isHq = getRole() === 'HQ_STAFF'

  if (!isHq) {
    return (
      <ErpAccessDenied title="브랜드 관리" message="본사(HQ) 권한에서만 접근할 수 있습니다." />
    )
  }

  return (
    <ErpPageFrame title="브랜드 관리">
      <BrandManagePanel />
    </ErpPageFrame>
  )
}
