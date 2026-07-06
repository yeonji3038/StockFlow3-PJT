import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { api } from '../lib/api'
import { getRole, getStoreId } from '../lib/auth'
import { STOCK_EDIT_REASONS, canEditStoreStock } from '../lib/storeStockEdit'
import ErpPageFrame from '../components/ui/ErpPageFrame'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import {
  ErpChevronBack,
  ErpFooterPrimary,
  ErpFormCell,
  ErpFormLabel,
  ErpFormRow,
  ErpFormTable,
  ErpPrimaryButton,
  ErpSecondaryButton,
  ErpToolbar,
} from '../components/ui/erp/ErpLayout'
import { erpInputClass, erpSelectClass, erpToolbarBtnClass } from '../lib/erpUi'
import type { StoreStock } from '../types/models'

function buildReasonPayload(preset: string, other: string): string | undefined {
  if (!preset) return undefined
  if (preset === '기타') {
    const t = other.trim()
    return t === '' ? '기타' : t
  }
  return preset
}

export default function StoreStockDetailPage() {
  const navigate = useNavigate()
  const { storeId: storeIdParam, stockId: stockIdParam } = useParams()
  const role = getRole()
  const myStoreId = getStoreId()
  const storeId = storeIdParam != null ? Number(storeIdParam) : NaN
  const stockId = stockIdParam != null ? Number(stockIdParam) : NaN

  const [row, setRow] = useState<StoreStock | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editQty, setEditQty] = useState(0)
  const [reasonPreset, setReasonPreset] = useState('')
  const [reasonOther, setReasonOther] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const canEdit = canEditStoreStock(role, myStoreId, storeId)

  const load = useCallback(async () => {
    if (!Number.isFinite(storeId) || storeId < 1 || !Number.isFinite(stockId) || stockId < 1) {
      setError('잘못된 경로입니다.')
      setRow(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<StoreStock[]>(`/api/stores/${storeId}/stocks`)
      const list = data ?? []
      const found = list.find((s) => s.id === stockId) ?? null
      setRow(found)
      if (found) {
        setEditQty(found.quantity)
        setReasonPreset('')
        setReasonOther('')
      } else {
        setError('해당 재고 행을 찾을 수 없습니다.')
      }
    } catch {
      setError('재고 정보를 불러오지 못했습니다.')
      setRow(null)
    } finally {
      setLoading(false)
    }
  }, [storeId, stockId])

  useEffect(() => {
    void load()
  }, [load])

  const bumpQty = (delta: number) => {
    setEditQty((prev) => Math.max(0, Math.floor(prev) + delta))
  }

  const save = async () => {
    if (!row || !canEdit || saving) return
    if (role === 'STORE_MANAGER' && (myStoreId == null || storeId !== myStoreId)) {
      setSaveError('본인 매장 재고만 수정할 수 있습니다.')
      return
    }
    const q = Math.floor(Number(editQty))
    if (!Number.isFinite(q) || q < 0) {
      setSaveError('수량은 0 이상의 정수로 입력하세요.')
      return
    }
    setSaveError(null)
    setSaving(true)
    try {
      const body: { quantity: number; reason?: string } = { quantity: q }
      const r = buildReasonPayload(reasonPreset, reasonOther)
      if (r) body.reason = r
      await api.put(`/api/stores/${storeId}/stocks/${row.id}`, body)
      await load()
    } catch (err) {
      if (isAxiosError(err)) {
        const d = err.response?.data as { message?: string } | string | undefined
        if (typeof d === 'string') setSaveError(d)
        else if (d && typeof d === 'object' && typeof d.message === 'string') setSaveError(d.message)
        else setSaveError('재고 수정에 실패했습니다.')
      } else {
        setSaveError('재고 수정에 실패했습니다.')
      }
    } finally {
      setSaving(false)
    }
  }

  const backLink = <ErpChevronBack to="/store-stock" label="매장 재고" />

  if (loading) {
    return (
      <ErpPageFrame title="매장 재고" actions={backLink}>
        <div className="px-3 py-12">
          <LoadingSpinner />
        </div>
      </ErpPageFrame>
    )
  }

  if (error || !row) {
    return (
      <ErpPageFrame title="매장 재고" actions={backLink}>
        <div className="px-3 py-8 text-center text-sm text-rose-600">{error ?? '재고를 찾을 수 없습니다.'}</div>
      </ErpPageFrame>
    )
  }

  return (
    <ErpPageFrame
      title={row.productName}
      actions={backLink}
      footer={
        canEdit ? (
          <>
            {saveError ? <span className="mr-auto text-xs text-rose-600">{saveError}</span> : null}
            <ErpSecondaryButton type="button" onClick={() => navigate('/store-stock')}>
              취소
            </ErpSecondaryButton>
            <ErpFooterPrimary>
              <ErpPrimaryButton type="button" disabled={saving} onClick={() => void save()}>
                {saving ? '저장 중…' : '저장'}
              </ErpPrimaryButton>
            </ErpFooterPrimary>
          </>
        ) : undefined
      }
    >
      <div className="border-b border-slate-300 px-3 py-1 text-[11px] text-slate-500">
        {row.storeName} · SKU {row.skuCode}
      </div>

      <ErpToolbar>
        <span className="text-xs font-semibold text-slate-700">상품 정보</span>
      </ErpToolbar>

      <ErpFormTable>
        <ErpFormRow>
          <ErpFormLabel>상품명</ErpFormLabel>
          <ErpFormCell colSpan={3}>
            <span className="px-1 text-xs font-medium text-slate-900">{row.productName}</span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>SKU</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 font-mono text-xs text-slate-800">{row.skuCode}</span>
          </ErpFormCell>
          <ErpFormLabel>색상</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">{row.color}</span>
          </ErpFormCell>
        </ErpFormRow>
        <ErpFormRow>
          <ErpFormLabel>사이즈</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs text-slate-800">{row.size}</span>
          </ErpFormCell>
          <ErpFormLabel>현재 수량</ErpFormLabel>
          <ErpFormCell>
            <span className="px-1 text-xs font-medium tabular-nums text-slate-900">{row.quantity}</span>
          </ErpFormCell>
        </ErpFormRow>
      </ErpFormTable>

      {canEdit ? (
        <>
          <ErpToolbar>
            <span className="text-xs font-semibold text-slate-700">수량 수정</span>
          </ErpToolbar>

          <ErpFormTable>
            <ErpFormRow>
              <ErpFormLabel required>새 수량</ErpFormLabel>
              <ErpFormCell>
                <div className="flex items-center gap-1 px-1">
                  <button
                    type="button"
                    onClick={() => bumpQty(-1)}
                    disabled={saving}
                    className={[erpToolbarBtnClass(), 'w-7 px-0 text-base'].join(' ')}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={editQty}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '') {
                        setEditQty(0)
                        return
                      }
                      const n = Number.parseInt(v, 10)
                      setEditQty(Number.isFinite(n) && n >= 0 ? n : 0)
                    }}
                    disabled={saving}
                    className={[erpInputClass(), 'w-20 text-center tabular-nums'].join(' ')}
                  />
                  <button
                    type="button"
                    onClick={() => bumpQty(1)}
                    disabled={saving}
                    className={[erpToolbarBtnClass(), 'w-7 px-0 text-base'].join(' ')}
                  >
                    +
                  </button>
                </div>
              </ErpFormCell>
              <ErpFormLabel>수정 사유</ErpFormLabel>
              <ErpFormCell>
                <select
                  value={reasonPreset}
                  onChange={(e) => {
                    setReasonPreset(e.target.value)
                    if (e.target.value !== '기타') setReasonOther('')
                  }}
                  disabled={saving}
                  className={erpSelectClass()}
                >
                  {STOCK_EDIT_REASONS.map((o) => (
                    <option key={o.value === '' ? '_none' : o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </ErpFormCell>
            </ErpFormRow>
            {reasonPreset === '기타' ? (
              <ErpFormRow>
                <ErpFormLabel>기타 사유</ErpFormLabel>
                <ErpFormCell colSpan={3}>
                  <input
                    value={reasonOther}
                    onChange={(e) => setReasonOther(e.target.value)}
                    disabled={saving}
                    placeholder="사유를 입력하세요"
                    className={erpInputClass()}
                  />
                </ErpFormCell>
              </ErpFormRow>
            ) : null}
          </ErpFormTable>
        </>
      ) : (
        <>
          <ErpToolbar>
            <span className="text-xs font-semibold text-slate-700">수량</span>
          </ErpToolbar>
          <ErpFormTable>
            <ErpFormRow>
              <ErpFormLabel>안내</ErpFormLabel>
              <ErpFormCell colSpan={3}>
                <span className="px-1 text-xs text-slate-600">
                  이 매장 재고는 조회만 가능합니다. 수량 수정은 본사(HQ) 또는 해당 매장 관리자만 할 수 있습니다.
                </span>
              </ErpFormCell>
            </ErpFormRow>
            <ErpFormRow>
              <ErpFormLabel>수량</ErpFormLabel>
              <ErpFormCell colSpan={3}>
                <span className="px-1 text-xs font-semibold tabular-nums text-slate-900">{row.quantity}</span>
              </ErpFormCell>
            </ErpFormRow>
          </ErpFormTable>
        </>
      )}
    </ErpPageFrame>
  )
}
