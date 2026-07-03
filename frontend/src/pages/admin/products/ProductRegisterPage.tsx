import { useNavigate, useSearchParams } from 'react-router-dom'
import { getRole } from '../../../lib/auth'
import ErpPageFrame, { ErpAccessDenied } from '../../../components/ui/ErpPageFrame'
import ProductRegisterForm from '../../../components/product/register/ProductRegisterForm'

export default function ProductRegisterPage() {
  const role = getRole()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isHq = role === 'HQ_STAFF'
  const defaultBrandId = Number(searchParams.get('brandId'))
  const presetBrandId = Number.isFinite(defaultBrandId) && defaultBrandId > 0 ? defaultBrandId : undefined

  if (!isHq) {
    return (
      <ErpAccessDenied title="상품 등록" message="본사(HQ) 권한에서만 접근할 수 있습니다." />
    )
  }

  return (
    <ErpPageFrame title="상품 등록">
      <ProductRegisterForm
        defaultBrandId={presetBrandId}
        onGoToOptions={(productId) =>
          navigate(`/admin/product-options/${productId}`, { replace: true })
        }
      />
    </ErpPageFrame>
  )
}
