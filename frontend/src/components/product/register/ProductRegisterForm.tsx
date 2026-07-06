import { useCallback, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { Check, Copy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../lib/api'
import { PRODUCT_STATUS_OPTIONS, type ProductStatusValue } from '../../../lib/productStatus'
import { erpInputClass, erpSelectClass } from '../../../lib/erpUi'
import type { ProductListItem } from '../types'
import LoadingSpinner from '../../ui/LoadingSpinner'
import {
  ErpFooterBar,
  ErpFooterPrimary,
  ErpFormCell,
  ErpFormLabel,
  ErpFormRow,
  ErpFormTable,
  ErpPrimaryButton,
  ErpSecondaryButton,
  ErpStatusBar,
} from '../../ui/erp/ErpLayout'

type BrandRow = { id: number; name: string; code?: string }
type CategoryNode = { id: number; name: string; code?: string; children?: CategoryNode[] }
type SeasonRow = {
  id: number
  name: string
  year?: number
}

export type { ProductStatusValue }

type Props = {
  formId?: string
  onGoToOptions?: (productId: number) => void
  defaultBrandId?: number
}

function flattenCategories(nodes: CategoryNode[], parentLabel = ''): { id: number; label: string }[] {
  const rows: { id: number; label: string }[] = []
  for (const n of nodes) {
    const label = parentLabel ? `${parentLabel} › ${n.name}` : n.name
    rows.push({ id: n.id, label })
    if (n.children?.length) {
      rows.push(...flattenCategories(n.children, label))
    }
  }
  return rows
}

export default function ProductRegisterForm({ formId = 'product-register-form', onGoToOptions, defaultBrandId }: Props) {
  const navigate = useNavigate()
  const [brands, setBrands] = useState<BrandRow[]>([])
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaError, setMetaError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [brandId, setBrandId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [seasonId, setSeasonId] = useState<string>('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProductStatusValue>('ON_SALE')

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [registered, setRegistered] = useState<ProductListItem | null>(null)
  const [copied, setCopied] = useState(false)

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories])

  const loadMeta = useCallback(async () => {
    setMetaLoading(true)
    setMetaError(null)
    try {
      const [b, c, s] = await Promise.all([
        api.get<BrandRow[]>('/api/brands'),
        api.get<CategoryNode[]>('/api/categories'),
        api.get<SeasonRow[]>('/api/seasons'),
      ])
      setBrands(b.data ?? [])
      setCategories(c.data ?? [])
      setSeasons(s.data ?? [])
    } catch {
      setMetaError('브랜드·카테고리·시즌 목록을 불러오지 못했습니다.')
    } finally {
      setMetaLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
    if (defaultBrandId != null && defaultBrandId > 0) {
      setBrandId(String(defaultBrandId))
    }
  }, [defaultBrandId])

  const resetForm = () => {
    setName('')
    setBrandId(defaultBrandId != null && defaultBrandId > 0 ? String(defaultBrandId) : '')
    setCategoryId('')
    setSeasonId('')
    setPrice('')
    setCost('')
    setDescription('')
    setStatus('ON_SALE')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setRegistered(null)

    const b = Number(brandId)
    const cat = Number(categoryId)
    const sea = Number(seasonId)
    const p = Number.parseInt(price.replace(/,/g, ''), 10)
    const co = Number.parseInt(cost.replace(/,/g, ''), 10)

    if (!name.trim()) {
      setFormError('상품명을 입력하세요.')
      return
    }
    if (!Number.isFinite(b) || b <= 0) {
      setFormError('브랜드를 선택하세요.')
      return
    }
    if (!Number.isFinite(cat) || cat <= 0) {
      setFormError('카테고리를 선택하세요.')
      return
    }
    if (!Number.isFinite(sea) || sea <= 0) {
      setFormError('시즌을 선택하세요.')
      return
    }
    if (!Number.isFinite(p) || p < 0) {
      setFormError('판매가를 올바르게 입력하세요.')
      return
    }
    if (!Number.isFinite(co) || co < 0) {
      setFormError('원가를 올바르게 입력하세요.')
      return
    }

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        brandId: b,
        categoryId: cat,
        seasonId: sea,
        price: p,
        cost: co,
        status,
      }
      const desc = description.trim()
      if (desc) body.description = desc

      const { data } = await api.post<ProductListItem>('/api/products', body)
      setRegistered(data)
    } catch (err) {
      if (isAxiosError(err)) {
        const d = err.response?.data as { message?: string } | string | undefined
        if (typeof d === 'string') setFormError(d)
        else if (d && typeof d === 'object' && typeof d.message === 'string') setFormError(d.message)
        else setFormError('등록에 실패했습니다.')
      } else {
        setFormError('등록에 실패했습니다.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const copyProductCode = async () => {
    if (!registered?.productCode) return
    try {
      await navigator.clipboard.writeText(registered.productCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setFormError('클립보드 복사에 실패했습니다.')
    }
  }

  if (registered) {
    return (
      <div className="space-y-4 px-3 py-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-6 py-8 text-center">
          <p className="text-sm font-medium text-emerald-800">상품이 등록되었습니다</p>
          <p className="mt-1 text-xs text-emerald-700">{registered.name}</p>
          {registered.productCode ? (
            <>
              <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500">
                발급된 상품 코드
              </p>
              <p className="mt-2 font-mono text-2xl font-bold tracking-wider text-slate-900 sm:text-3xl">
                {registered.productCode}
              </p>
              <button
                type="button"
                onClick={() => void copyProductCode()}
                className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden />
                    코드 복사
                  </>
                )}
              </button>
            </>
          ) : null}
        </div>
        <ErpFooterBar>
          <ErpSecondaryButton
            onClick={() => {
              resetForm()
            }}
          >
            추가 등록
          </ErpSecondaryButton>
          <ErpFooterPrimary>
            <ErpPrimaryButton
              onClick={() => {
                if (onGoToOptions) onGoToOptions(registered.id)
                else navigate(`/admin/product-options/${registered.id}`)
              }}
            >
              SKU 옵션 등록
            </ErpPrimaryButton>
          </ErpFooterPrimary>
        </ErpFooterBar>
      </div>
    )
  }

  if (metaLoading) {
    return (
      <div className="py-12">
        <LoadingSpinner label="선택 목록을 불러오는 중…" />
      </div>
    )
  }

  if (metaError) {
    return (
      <div className="space-y-2 px-3 py-8 text-center">
        <p className="text-sm text-rose-600">{metaError}</p>
        <ErpSecondaryButton onClick={() => void loadMeta()}>다시 시도</ErpSecondaryButton>
      </div>
    )
  }

  return (
    <form id={formId} onSubmit={(e) => void handleSubmit(e)}>
      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel required>상품명</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={erpInputClass()}
              placeholder="예: 린넨 셔츠"
              maxLength={200}
            />
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel required>브랜드</ErpFormLabel>
          <ErpFormCell>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className={erpSelectClass()}
              required
            >
              <option value="">선택</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </ErpFormCell>
          <ErpFormLabel required>카테고리</ErpFormLabel>
          <ErpFormCell>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={erpSelectClass()}
              required
            >
              <option value="">선택</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel required>시즌</ErpFormLabel>
          <ErpFormCell>
            <select
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              className={erpSelectClass()}
              required
            >
              <option value="">선택</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.year != null ? `${s.name} (${s.year})` : s.name}
                </option>
              ))}
            </select>
          </ErpFormCell>
          <ErpFormLabel required>상태</ErpFormLabel>
          <ErpFormCell>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatusValue)}
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
          <ErpFormLabel required>판매가</ErpFormLabel>
          <ErpFormCell>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={erpInputClass()}
              inputMode="numeric"
              placeholder="원"
            />
          </ErpFormCell>
          <ErpFormLabel required>원가</ErpFormLabel>
          <ErpFormCell>
            <input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className={erpInputClass()}
              inputMode="numeric"
              placeholder="원"
            />
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>설명</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[4.5rem] w-full border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
              placeholder="소재, 핏 등 간단 메모 (선택)"
              rows={3}
            />
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>

      {formError ? (
        <ErpStatusBar>
          <span className="text-rose-600">{formError}</span>
        </ErpStatusBar>
      ) : null}

      <ErpFooterBar>
        <ErpSecondaryButton
          type="button"
          onClick={() => {
            resetForm()
          }}
        >
          입력 초기화
        </ErpSecondaryButton>
        <ErpFooterPrimary>
          <ErpPrimaryButton type="submit" disabled={submitting}>
            {submitting ? '등록 중…' : '상품 등록'}
          </ErpPrimaryButton>
        </ErpFooterPrimary>
      </ErpFooterBar>
    </form>
  )
}
