import { getRole } from '../../../lib/auth'
import SectionCard from '../../../components/ui/SectionCard'
import ErpPageFrame, { ErpAccessDenied } from '../../../components/ui/ErpPageFrame'
import WarehouseRegisterForm from '../../../components/warehouse/register/WarehouseRegisterForm'

export default function WarehouseRegisterPage() {
  const isHq = getRole() === 'HQ_STAFF'

  if (!isHq) {
    return (
      <ErpAccessDenied title="창고 등록" message="본사(HQ) 권한에서만 접근할 수 있습니다." />
    )
  }

  return (
    <ErpPageFrame title="창고 등록">
      <SectionCard embedded title="신규 창고">
        <WarehouseRegisterForm />
      </SectionCard>
    </ErpPageFrame>
  )
}
