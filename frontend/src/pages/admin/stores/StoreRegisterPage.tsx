import { getRole } from '../../../lib/auth'
import SectionCard from '../../../components/ui/SectionCard'
import ErpPageFrame, { ErpAccessDenied } from '../../../components/ui/ErpPageFrame'
import StoreRegisterForm from '../../../components/store/register/StoreRegisterForm'

export default function StoreRegisterPage() {
  const isHq = getRole() === 'HQ_STAFF'

  if (!isHq) {
    return (
      <ErpAccessDenied title="매장 등록" message="본사(HQ) 권한에서만 접근할 수 있습니다." />
    )
  }

  return (
    <ErpPageFrame title="매장 등록">
      <SectionCard embedded title="신규 매장">
        <StoreRegisterForm />
      </SectionCard>
    </ErpPageFrame>
  )
}
