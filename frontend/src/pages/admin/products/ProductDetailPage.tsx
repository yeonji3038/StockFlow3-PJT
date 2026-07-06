import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { api } from '../../../lib/api'
import { getRole } from '../../../lib/auth'
import ErpPageFrame from '../../../components/ui/ErpPageFrame'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import {
  ErpChevronBack,
  ErpFooterPrimary,
  ErpFormCell,
  ErpFormLabel,
  ErpFormRow,
  ErpFormTable,
  ErpPrimaryButton,
} from '../../../components/ui/erp/ErpLayout'
import { erpInputClass, erpSelectClass } from '../../../lib/erpUi'
import type { ProductListItem } from '../../../components/product/types'
import { PRODUCT_STATUS_OPTIONS, productStatusLabel, type ProductStatusValue } from '../../../lib/productStatus'
import { parseApiErrorMessage } from '../../../lib/productOption'

function formatWon(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

export default function ProductDetailPage() {
  const { id: idParam } = useParams()
  const navigate = useNavigate()
  const role = getRole()
  const isHq = role === 'HQ_STAFF'
  const id = idParam != null ? Number(idParam) : NaN

  const [product, setProduct] = useState<ProductListItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editCost, setEditCost] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState<ProductStatusValue>('ON_SALE')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(id) || id < 1) {
      setError('잘못된 상품 번호입니다.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<ProductListItem>(`/api/products/${id}`)
      const p = data ?? null
      setProduct(p)
      if (p) {
        setEditName(p.name)
        setEditPrice(String(p.price))
        setEditCost(String(p.cost))
        setEditDescription(p.description ?? '')
        setEditStatus(p.status)
      }
    } catch {
      setError('상품 정보를 불러오지 못했습니다.')
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    if (!product || !isHq || saving) return
    setSaveError(null)
    const p = Number.parseInt(editPrice.replace(/,/g, ''), 10)
    const c = Number.parseInt(editCost.replace(/,/g, ''), 10)
    if (!editName.trim()) {
      setSaveError('상품명을 입력하세요.')
      return
    }
    if (!Number.isFinite(p) || p < 0) {
      setSaveError('판매가를 올바르게 입력하세요.')
      return
    }
    if (!Number.isFinite(c) || c < 0) {
      setSaveError('원가를 올바르게 입력하세요.')
      return
    }
    setSaving(true)
    try {
      const desc = editDescription.trim()
      await api.put(`/api/products/${product.id}`, {
        name: editName.trim(),
        brandId: product.brandId,
        categoryId: product.categoryId,
        seasonId: product.seasonId,
        price: p,
        cost: c,
        status: editStatus,
        description: desc === '' ? null : desc,
      })
      await load()
    } catch (err) {
      setSaveError(parseApiErrorMessage(err, '저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!product || !isHq || deleting) return
    if (!confirm(`「${product.name}」 상품을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    setDeleting(true)
    try {
      await api.delete(`/api/products/${product.id}`)
      navigate('/admin/products', { replace: true })
    } catch {
      setSaveError('삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <ErpPageFrame title="상품 상세" actions={<ErpChevronBack to="/admin/products" label="상품 목록" />}>
        <div className="px-3 py-12">
          <LoadingSpinner />
        </div>
      </ErpPageFrame>
    )
  }

  if (error || !product) {
    return (
      <ErpPageFrame title="상품 상세" actions={<ErpChevronBack to="/admin/products" label="상품 목록" />}>
        <div className="px-3 py-8 text-center text-sm text-rose-600">{error ?? '상품을 찾을 수 없습니다.'}</div>
      </ErpPageFrame>
    )
  }

  return (
    <ErpPageFrame
      title={`상품 · ${product.name}`}
      actions={
        <>
          <ErpChevronBack to="/admin/products" label="상품 목록" />
          {isHq ? (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={deleting}
              className="ml-auto inline-flex items-center justify-center text-rose-600 hover:text-rose-800 disabled:opacity-60"
              aria-label={deleting ? '삭제 중…' : '삭제'}
              title={deleting ? '삭제 중…' : '삭제'}
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          ) : null}
        </>
      }
      footer={
        isHq ? (
          <>
            {saveError ? <span className="mr-auto text-xs text-rose-600">{saveError}</span> : null}
            <ErpFooterPrimary>
              <ErpPrimaryButton onClick={() => void save()} disabled={saving}>
                {saving ? '저장 중…' : '변경 저장'}
              </ErpPrimaryButton>
            </ErpFooterPrimary>
          </>
        ) : null
      }
    >
      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel>상품코드</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 font-mono text-xs font-semibold text-slate-800">
              {product.productCode ?? '—'}
            </span>
          </ErpFormCell>
          <ErpFormLabel>등록일</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-700">
              {product.createdAt ? new Date(product.createdAt).toLocaleString('ko-KR') : '—'}
            </span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>브랜드</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">{product.brandName}</span>
          </ErpFormCell>
          <ErpFormLabel>카테고리</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">{product.categoryName}</span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>시즌</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            <span className="px-1 text-xs text-slate-800">{product.seasonName}</span>
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>

      {isHq ? (
        <ErpFormTable>
            <ErpFormRow>
              <ErpFormLabel required>상품명</ErpFormLabel>
              <ErpFormCell colSpan={3}>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={erpInputClass()}
                  maxLength={200}
                />
              </ErpFormCell>
            </ErpFormRow>
            <ErpFormRow>
              <ErpFormLabel required>판매가</ErpFormLabel>
              <ErpFormCell>
                <input
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className={erpInputClass()}
                  inputMode="numeric"
                  placeholder="원"
                />
              </ErpFormCell>
              <ErpFormLabel required>원가</ErpFormLabel>
              <ErpFormCell>
                <input
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                  className={erpInputClass()}
                  inputMode="numeric"
                  placeholder="원"
                />
              </ErpFormCell>
            </ErpFormRow>
            <ErpFormRow>
              <ErpFormLabel required>상태</ErpFormLabel>
              <ErpFormCell colSpan={3}>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ProductStatusValue)}
                  className={erpSelectClass()}
                >
                  {PRODUCT_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </ErpFormCell>
            </ErpFormRow>
            <ErpFormRow>
              <ErpFormLabel>설명</ErpFormLabel>
              <ErpFormCell colSpan={3}>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="min-h-[4.5rem] w-full border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  rows={3}
                />
              </ErpFormCell>
            </ErpFormRow>
          </ErpFormTable>
      ) : (
        <ErpFormTable>
          <ErpFormRow>
            <ErpFormLabel>판매가</ErpFormLabel>
            <ErpFormCell>
              <span className="px-1 text-xs text-slate-800">{formatWon(product.price)}</span>
            </ErpFormCell>
            <ErpFormLabel>원가</ErpFormLabel>
            <ErpFormCell>
              <span className="px-1 text-xs text-slate-800">{formatWon(product.cost)}</span>
            </ErpFormCell>
          </ErpFormRow>
          <ErpFormRow>
            <ErpFormLabel>상태</ErpFormLabel>
            <ErpFormCell colSpan={3}>
              <span className="px-1 text-xs text-slate-800">{productStatusLabel(product.status)}</span>
            </ErpFormCell>
          </ErpFormRow>
          {product.description ? (
            <ErpFormRow>
              <ErpFormLabel>설명</ErpFormLabel>
              <ErpFormCell colSpan={3}>
                <span className="whitespace-pre-wrap px-1 text-xs text-slate-800">{product.description}</span>
              </ErpFormCell>
            </ErpFormRow>
          ) : null}
        </ErpFormTable>
      )}
    </ErpPageFrame>
  )
}
