import { getRole } from '../../../lib/auth'
import SectionCard from '../../../components/ui/SectionCard'
import StoreRegisterForm from '../../../components/store/register/StoreRegisterForm'

export default function StoreRegisterPage() {
  const isHq = getRole() === 'HQ_STAFF'

  if (!isHq) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">매장 등록</h1>
        <p className="text-sm text-slate-500">본사(HQ) 권한에서만 접근할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">매장 등록</h1>
      <SectionCard title="신규 매장">
        <StoreRegisterForm />
      </SectionCard>
    </div>
  )
}
