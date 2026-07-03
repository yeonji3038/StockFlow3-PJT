import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../../lib/api'
import { getRole } from '../../../lib/auth'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import ErpPageFrame, { ErpAccessDenied } from '../../../components/ui/ErpPageFrame'
import ProductOptionManagePanel from '../../../components/product/options/ProductOptionManagePanel'
import type { ProductListItem } from '../../../components/product/types'

export default function ProductOptionDetailPage() {
  const { productId: productIdParam } = useParams()
  const isHq = getRole() === 'HQ_STAFF'
  const productId = productIdParam != null ? Number(productIdParam) : NaN

  const [product, setProduct] = useState<ProductListItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!Number.isFinite(productId) || productId < 1) {
      setError('잘못된 상품 번호입니다.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<ProductListItem>(`/api/products/${productId}`)
      setProduct(data ?? null)
    } catch {
      setError('상품 정보를 불러오지 못했습니다.')
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    void load()
  }, [load])

  if (!isHq) {
    return (
      <ErpAccessDenied title="상품 옵션 관리" message="본사(HQ) 권한에서만 접근할 수 있습니다." />
    )
  }

  const listLink = (
    <Link
      to="/admin/product-options"
      className="inline-flex h-7 items-center border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:bg-slate-100"
    >
      ← 옵션 목록
    </Link>
  )

  if (loading) {
    return (
      <ErpPageFrame title="상품 옵션 관리" actions={listLink}>
        <LoadingSpinner />
      </ErpPageFrame>
    )
  }

  if (error || !product) {
    return (
      <ErpPageFrame title="상품 옵션 관리" actions={listLink}>
        <p className="px-3 py-4 text-sm text-rose-600">{error ?? '상품을 찾을 수 없습니다.'}</p>
      </ErpPageFrame>
    )
  }

  return (
    <ErpPageFrame title={`옵션 · ${product.name}`} actions={listLink}>
      <div className="border-b border-slate-300 px-3 py-1 text-[11px] text-slate-500">
        색상 · 사이즈 · 상품코드 옵션만 관리합니다.
      </div>

      <ProductOptionManagePanel productId={productId} canMutate={isHq} />
    </ErpPageFrame>
  )
}
