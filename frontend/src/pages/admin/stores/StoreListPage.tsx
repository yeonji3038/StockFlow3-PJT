import { useLocation } from 'react-router-dom'
import { getRole } from '../../../lib/auth'
import StoreListPanel from '../../../components/store/list/StoreListPanel'

export default function StoreListPage() {
  const { key } = useLocation()
  const isHq = getRole() === 'HQ_STAFF'

  if (!isHq) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">매장 목록</h1>
        <p className="text-sm text-slate-500">본사(HQ) 권한에서만 접근할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">매장 목록</h1>
      <StoreListPanel refreshKey={key} />
    </div>
  )
}
