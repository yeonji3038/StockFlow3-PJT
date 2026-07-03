import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy, MapPin, Search } from 'lucide-react'
import { api } from '../../../lib/api'
import LoadingSpinner from '../../ui/LoadingSpinner'
import {
  parseStoreApiError,
  storeInputClass,
  STORE_TYPE_OPTIONS,
  type BrandListItem,
  type StoreListItem,
  type StoreType,
} from '../../../lib/store'
import { buildOsmMapEmbedUrl, resolveDaumPostcode } from '../../../lib/daumPostcode'

type Props = {
  onRegistered?: (store: StoreListItem) => void
}

function AddressSection({
  zonecode,
  baseAddress,
  detailAddress,
  latitude,
  longitude,
  onDetailAddressChange,
  onSearch,
  detailAddressRef,
}: {
  zonecode: string
  baseAddress: string
  detailAddress: string
  latitude: number | null
  longitude: number | null
  onDetailAddressChange: (value: string) => void
  onSearch: () => void
  detailAddressRef: React.RefObject<HTMLInputElement | null>
}) {
  const hasAddress = Boolean(baseAddress.trim())
  const mapUrl =
    latitude != null && longitude != null ? buildOsmMapEmbedUrl(latitude, longitude) : null

  if (!hasAddress) {
    return (
      <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/80">
          <MapPin className="h-5 w-5 text-slate-400" aria-hidden />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-700">매장 주소를 검색해 등록하세요</p>
        <p className="mt-1 text-xs text-slate-500">다음 우편번호 서비스로 주소를 찾을 수 있습니다</p>
        <button
          type="button"
          onClick={onSearch}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Search className="h-4 w-4" aria-hidden />
          주소 검색
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {zonecode ? (
              <>
                <span className="inline-flex rounded-md bg-white px-2.5 py-1 font-mono text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {zonecode}
                </span>
                <span className="text-[11px] font-medium text-slate-500">우편번호</span>
              </>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-800">{baseAddress}</p>
        </div>
        <button
          type="button"
          onClick={onSearch}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          주소 변경
        </button>
      </div>
      {mapUrl ? (
        <div className="border-b border-slate-100">
          <iframe
            title="선택한 매장 위치"
            src={mapUrl}
            className="h-48 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : null}
      <div className="p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">상세 주소</span>
          <input
            ref={detailAddressRef}
            value={detailAddress}
            onChange={(e) => onDetailAddressChange(e.target.value)}
            className={storeInputClass()}
            placeholder="동·호수 등 (예: 2층 201호)"
          />
        </label>
      </div>
    </div>
  )
}

export default function StoreRegisterForm({ onRegistered }: Props) {
  const detailAddressRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [zonecode, setZonecode] = useState('')
  const [baseAddress, setBaseAddress] = useState('')
  const [detailAddress, setDetailAddress] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [storeType, setStoreType] = useState<StoreType>('DEPARTMENT')
  const [brandId, setBrandId] = useState('')
  const [phone, setPhone] = useState('')

  const [brands, setBrands] = useState<BrandListItem[]>([])
  const [brandsLoading, setBrandsLoading] = useState(true)
  const [brandsError, setBrandsError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [registered, setRegistered] = useState<StoreListItem | null>(null)
  const [copied, setCopied] = useState(false)

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true)
    setBrandsError(null)
    try {
      const { data } = await api.get<BrandListItem[]>('/api/brands')
      setBrands(data ?? [])
    } catch {
      setBrands([])
      setBrandsError('브랜드 목록을 불러오지 못했습니다.')
    } finally {
      setBrandsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBrands()
  }, [loadBrands])

  const resetForm = () => {
    setName('')
    setZonecode('')
    setBaseAddress('')
    setDetailAddress('')
    setLatitude(null)
    setLongitude(null)
    setStoreType('DEPARTMENT')
    setBrandId('')
    setPhone('')
    setFormError(null)
    setRegistered(null)
    setCopied(false)
  }

  const handleAddressSearch = () => {
    if (!window.daum?.Postcode) {
      setFormError('주소 검색 서비스를 불러오지 못했습니다.')
      return
    }

    new window.daum.Postcode({
      oncomplete(data) {
        const resolved = resolveDaumPostcode(data)
        if (!resolved.baseAddress) {
          setFormError('선택한 주소를 불러오지 못했습니다. 다시 검색해 주세요.')
          return
        }
        setFormError(null)
        setZonecode(resolved.zonecode)
        setBaseAddress(resolved.baseAddress)
        setLatitude(resolved.latitude)
        setLongitude(resolved.longitude)
        window.setTimeout(() => detailAddressRef.current?.focus(), 0)
      },
    }).open({ popupKey: 'store-register-postcode' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!name.trim()) {
      setFormError('매장명을 입력하세요.')
      return
    }
    const selectedBrandId = Number(brandId)
    if (!Number.isFinite(selectedBrandId) || selectedBrandId < 1) {
      setFormError('브랜드를 선택하세요.')
      return
    }

    const locationParts = [baseAddress.trim(), detailAddress.trim()].filter(Boolean)
    const location = locationParts.join(' ')
    if (!location) {
      setFormError('위치(주소)를 입력하세요.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      const { data } = await api.post<StoreListItem>('/api/stores', {
        brandId: selectedBrandId,
        name: name.trim(),
        location,
        storeType,
        phone: phone.trim() || undefined,
      })
      if (data) {
        setRegistered(data)
        onRegistered?.(data)
      }
    } catch (err) {
      setFormError(parseStoreApiError(err, '매장 등록에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  const copyCode = async () => {
    if (!registered?.storeCode) return
    try {
      await navigator.clipboard.writeText(registered.storeCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setFormError('클립보드 복사에 실패했습니다.')
    }
  }

  if (registered) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-6 py-8 text-center">
          <p className="text-sm font-medium text-emerald-800">매장이 등록되었습니다</p>
          <p className="mt-1 text-xs text-emerald-700">{registered.name}</p>
          {registered.brandName ? (
            <p className="mt-1 text-xs text-emerald-600">{registered.brandName}</p>
          ) : null}
          <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500">
            발급된 매장 코드
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-widest text-slate-900 sm:text-4xl">
            {registered.storeCode}
          </p>
          <button
            type="button"
            onClick={() => void copyCode()}
            className="mt-6 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
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
          <p className="mt-4 text-xs text-slate-500">
            매장 직원 회원가입 시 이 코드를 입력하면 해당 매장에 연결됩니다.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            추가 등록
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {brandsLoading ? (
        <LoadingSpinner label="브랜드 목록을 불러오는 중…" />
      ) : (
        <>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">브랜드</span>
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className={storeInputClass()}
          required
        >
          <option value="">브랜드 선택</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">매장명</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={storeInputClass()}
          placeholder="예: 강남점"
          maxLength={100}
          required
        />
      </label>

      <div className="block">
        <span className="mb-2 block text-xs font-medium text-slate-600">위치</span>
        <AddressSection
          zonecode={zonecode}
          baseAddress={baseAddress}
          detailAddress={detailAddress}
          latitude={latitude}
          longitude={longitude}
          onDetailAddressChange={setDetailAddress}
          onSearch={handleAddressSearch}
          detailAddressRef={detailAddressRef}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">유형</span>
          <select
            value={storeType}
            onChange={(e) => setStoreType(e.target.value as StoreType)}
            className={storeInputClass()}
          >
            {STORE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">전화번호</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={storeInputClass()}
            placeholder="02-0000-0000"
          />
        </label>
      </div>
      {brandsError ? <p className="text-sm text-amber-600">{brandsError}</p> : null}
      {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || brands.length === 0}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
        >
          {submitting ? '등록 중…' : '매장 등록'}
        </button>
      </div>
        </>
      )}
    </form>
  )
}
