import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { erpPrimaryBtnClass, erpSecondaryBtnClass, erpToolbarBtnClass } from '../../../lib/erpUi'

type ScreenProps = {
  title: string
  children: ReactNode
}

export function ErpWorkScreen({ title, children }: ScreenProps) {
  return (
    <div className="border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-300 bg-gradient-to-b from-slate-50 to-slate-100 px-3 py-2">
        <h1 className="text-sm font-bold tracking-tight text-slate-800">{title}</h1>
      </div>
      {children}
    </div>
  )
}

export function ErpFormTable({ children }: { children: ReactNode }) {
  return (
    <table className="w-full border-collapse text-xs">
      <tbody>{children}</tbody>
    </table>
  )
}

export function ErpFormRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-slate-300">{children}</tr>
}

type LabelProps = { children: ReactNode; required?: boolean; className?: string }

export function ErpFormLabel({ children, required, className = '' }: LabelProps) {
  return (
    <th
      className={[
        'w-20 border-r border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-normal text-slate-700 whitespace-nowrap',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </th>
  )
}

export function ErpFormCell({
  children,
  colSpan,
  className = '',
}: {
  children: ReactNode
  colSpan?: number
  className?: string
}) {
  return (
    <td
      colSpan={colSpan}
      className={['border-r border-slate-300 bg-white px-1 py-0.5 last:border-r-0', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </td>
  )
}

export function ErpToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-300 bg-slate-50 px-2 py-1">
      {children}
    </div>
  )
}

export function ErpToolbarButton({
  children,
  active,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button type="button" className={[erpToolbarBtnClass(active), className].join(' ')} {...props}>
      {children}
    </button>
  )
}

export function ErpTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex border-b border-slate-300 bg-slate-100">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={[
            'border-r border-slate-300 px-4 py-1.5 text-xs font-medium',
            active === tab.id
              ? 'bg-white text-blue-700 shadow-[inset_0_2px_0_0_#2563eb]'
              : 'text-slate-600 hover:bg-slate-50',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function ErpGridWrap({ children, maxHeight }: { children: ReactNode; maxHeight?: string }) {
  return (
    <div className="overflow-x-auto">
      <div className={maxHeight ? `overflow-y-auto ${maxHeight}` : undefined}>{children}</div>
    </div>
  )
}

export function ErpDataTable({ children, minWidth }: { children: ReactNode; minWidth?: string }) {
  return (
    <table
      className={['w-full border-collapse text-xs', minWidth ? `min-w-[${minWidth}]` : 'min-w-full']
        .filter(Boolean)
        .join(' ')}
      style={minWidth ? { minWidth } : undefined}
    >
      {children}
    </table>
  )
}

export function ErpSectionCaption({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
      {children}
    </div>
  )
}

export function ErpFooterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-1 border-t border-slate-300 bg-slate-50 px-2 py-2">
      {children}
    </div>
  )
}

/** 푸터에서 생성·요청 등 주요 액션을 오른쪽 끝에 배치 */
export function ErpFooterPrimary({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={['ml-auto flex flex-wrap items-center gap-1', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

export function ErpPrimaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={[erpPrimaryBtnClass(), className].join(' ')} {...props}>
      {children}
    </button>
  )
}

export function ErpSecondaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={[erpSecondaryBtnClass(), className].join(' ')} {...props}>
      {children}
    </button>
  )
}

export function ErpStatusBar({ children }: { children: ReactNode }) {
  return (
    <div className="border-t border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-500">{children}</div>
  )
}

const chevronNavClass =
  'inline-flex shrink-0 items-center justify-center text-blue-600 transition hover:text-blue-800'

/** 섹션 헤더·툴바용 아이콘-only 이동 버튼 (전체 보기) */
export function ErpChevronNav({
  to,
  onClick,
  label = '전체 보기',
  className = '',
}: {
  to?: string
  onClick?: () => void
  label?: string
  className?: string
}) {
  const cls = [chevronNavClass, className].filter(Boolean).join(' ')
  const icon = <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />

  if (to) {
    return (
      <Link to={to} className={cls} aria-label={label} title={label}>
        {icon}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={cls} aria-label={label} title={label}>
      {icon}
    </button>
  )
}

/** 상세 화면용 아이콘-only 뒤로가기 */
export function ErpChevronBack({
  to,
  label = '목록',
  className = '',
}: {
  to: string
  label?: string
  className?: string
}) {
  return (
    <Link
      to={to}
      className={[chevronNavClass, className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
    >
      <ChevronLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden />
    </Link>
  )
}
