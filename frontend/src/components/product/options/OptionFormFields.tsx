import {
  ErpFormCell,
  ErpFormLabel,
  ErpFormRow,
} from '../../ui/erp/ErpLayout'
import { erpInputClass, erpSelectClass } from '../../../lib/erpUi'
import {
  OPTION_STATUS_OPTIONS,
  type OptionFormState,
} from '../../../lib/productOption'
import type { Size } from '../../../types/models'

type Props = {
  form: OptionFormState
  onChange: (next: OptionFormState) => void
  sizes: Size[]
}

export default function OptionFormFields({ form, onChange, sizes }: Props) {
  return (
    <>
      <ErpFormRow>
        <ErpFormLabel required>색상</ErpFormLabel>
        <ErpFormCell>
          <input
            value={form.color}
            onChange={(e) => onChange({ ...form, color: e.target.value })}
            className={erpInputClass()}
            placeholder="예: 다크 네이비"
            maxLength={50}
          />
        </ErpFormCell>
        <ErpFormLabel required>색상 코드</ErpFormLabel>
        <ErpFormCell>
          <input
            value={form.colorCode}
            onChange={(e) => onChange({ ...form, colorCode: e.target.value.toUpperCase() })}
            className={erpInputClass()}
            placeholder="예: NA"
            maxLength={10}
          />
        </ErpFormCell>
      </ErpFormRow>
      <ErpFormRow>
        <ErpFormLabel required>사이즈</ErpFormLabel>
        <ErpFormCell>
          <select
            value={form.sizeId}
            onChange={(e) => onChange({ ...form, sizeId: e.target.value })}
            className={erpSelectClass()}
          >
            <option value="">선택</option>
            {sizes.map((size) => (
              <option key={size.id} value={size.id}>
                {size.name}
              </option>
            ))}
          </select>
        </ErpFormCell>
        <ErpFormLabel required>상태</ErpFormLabel>
        <ErpFormCell>
          <select
            value={form.status}
            onChange={(e) =>
              onChange({ ...form, status: e.target.value as OptionFormState['status'] })
            }
            className={erpSelectClass()}
          >
            {OPTION_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </ErpFormCell>
      </ErpFormRow>
    </>
  )
}
