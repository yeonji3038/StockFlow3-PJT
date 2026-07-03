import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getRole } from '../../../lib/auth'
import { api } from '../../../lib/api'
import type { BrandListItem } from '../../../lib/store'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import {
  ErpFormCell,
  ErpFormLabel,
  ErpFormRow,
  ErpFormTable,
  ErpTabBar,
  ErpWorkScreen,
} from '../../../components/ui/erp/ErpLayout'
import { erpSelectClass } from '../../../lib/erpUi'
import CategoryManagePanel from '../../../components/product/options/CategoryManagePanel'
import SeasonManagePanel from '../../../components/product/options/SeasonManagePanel'
import SizeManagePanel from '../../../components/product/options/SizeManagePanel'
import ProductOptionListPanel from '../../../components/product/options/ProductOptionListPanel'

type TabId = 'options' | 'categories' | 'seasons' | 'sizes'

export default function ProductOptionsPage() {
  const { key } = useLocation()
  const isHq = getRole() === 'HQ_STAFF'

  const [brands, setBrands] = useState<BrandListItem[]>([])
  const [brandsLoading, setBrandsLoading] = useState(true)
  const [selectedBrandId, setSelectedBrandId] = useState<number | ''>('')
  const [brandTouched, setBrandTouched] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('options')

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true)
    try {
      const { data } = await api.get<BrandListItem[]>('/api/brands')
      setBrands(data ?? [])
    } catch {
      setBrands([])
    } finally {
      setBrandsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isHq) void loadBrands()
  }, [isHq, loadBrands])

  const selectedBrand = useMemo(
    () =>
      selectedBrandId === '' ? null : brands.find((b) => b.id === selectedBrandId) ?? null,
    [brands, selectedBrandId],
  )

  if (!isHq) {
    return (
      <div className="border border-slate-300 bg-white px-4 py-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">본사(HQ) 권한에서만 접근할 수 있습니다.</p>
      </div>
    )
  }

  const brandInvalid = brandTouched && selectedBrandId === ''

  return (
    <ErpWorkScreen title="상품 옵션 관리">
      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel required>브랜드</ErpFormLabel>
          <ErpFormCell className="w-[220px]">
            {brandsLoading ? (
              <div className="px-1 py-1">
                <LoadingSpinner compact hideLabel />
              </div>
            ) : (
              <select
                value={selectedBrandId === '' ? '' : String(selectedBrandId)}
                onChange={(e) => {
                  setBrandTouched(true)
                  const v = e.target.value
                  setSelectedBrandId(v === '' ? '' : Number(v))
                }}
                onBlur={() => setBrandTouched(true)}
                className={erpSelectClass(brandInvalid)}
              >
                <option value="">브랜드 선택</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>

      <ErpTabBar
        tabs={[
          { id: 'options', label: 'SKU 옵션' },
          { id: 'categories', label: '카테고리' },
          { id: 'seasons', label: '시즌' },
          { id: 'sizes', label: '사이즈' },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />

      {selectedBrandId !== '' && selectedBrand ? (
        <>
          {activeTab === 'options' ? (
            <ProductOptionListPanel
              canMutate={isHq}
              brandId={selectedBrandId}
              brandName={selectedBrand.name}
              refreshKey={key}
            />
          ) : null}
          {activeTab === 'categories' ? (
            <CategoryManagePanel brandId={selectedBrandId} brandName={selectedBrand.name} />
          ) : null}
          {activeTab === 'seasons' ? (
            <SeasonManagePanel brandId={selectedBrandId} brandName={selectedBrand.name} />
          ) : null}
          {activeTab === 'sizes' ? (
            <SizeManagePanel brandName={selectedBrand.name} />
          ) : null}
        </>
      ) : (
        <div className="px-3 py-16 text-center text-xs text-slate-400">
          브랜드를 선택하면{' '}
          {activeTab === 'options'
            ? 'SKU 옵션'
            : activeTab === 'categories'
              ? '카테고리'
              : activeTab === 'seasons'
                ? '시즌'
                : '사이즈'}{' '}
          관리 화면이 표시됩니다.
        </div>
      )}
    </ErpWorkScreen>
  )
}
