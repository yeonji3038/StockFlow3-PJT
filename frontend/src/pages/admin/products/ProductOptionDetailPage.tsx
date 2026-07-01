import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../../lib/api'
import { getRole } from '../../../lib/auth'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
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
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">상품 옵션 관리</h1>
        <p className="text-sm text-slate-500">본사(HQ) 권한에서만 접근할 수 있습니다.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/product-options"
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← 옵션 목록
        </Link>
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/product-options"
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← 옵션 목록
        </Link>
        <p className="text-sm text-rose-600">{error ?? '상품을 찾을 수 없습니다.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          to="/admin/product-options"
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← 옵션 목록
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">{product.name} — 옵션 관리</h1>
        <p className="mt-1 text-sm text-slate-500">색상 · 사이즈 · 상품코드 옵션만 관리합니다.</p>
      </div>

      <ProductOptionManagePanel productId={productId} canMutate={isHq} />
    </div>
  )
}
