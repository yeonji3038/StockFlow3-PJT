import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  children: ReactNode
  headerRight?: ReactNode
  /** ErpWorkScreen 내부에 중첩될 때 외곽 테두리 없이 섹션만 표시 */
  embedded?: boolean
}

export default function SectionCard({
  title,
  description,
  children,
  headerRight,
  embedded = false,
}: Props) {
  if (embedded) {
    return (
      <section className="border-b border-slate-300 last:border-b-0">
        {title ? (
          <div className="border-b border-slate-300 bg-slate-50 px-2 py-1">
            <h2 className="text-[11px] font-semibold text-slate-700">{title}</h2>
            {description ? <p className="mt-0.5 text-[11px] text-slate-500">{description}</p> : null}
          </div>
        ) : null}
        {headerRight ? (
          <div className="erp-section-toolbar flex flex-wrap items-center gap-1 border-b border-slate-300 bg-slate-50 px-2 py-1">
            {headerRight}
          </div>
        ) : null}
        <div className="erp-section-body">{children}</div>
      </section>
    )
  }

  return (
    <section className="erp-section border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-300 bg-gradient-to-b from-slate-50 to-slate-100 px-3 py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-800">{title}</h2>
            {description ? <p className="mt-0.5 text-[11px] text-slate-500">{description}</p> : null}
          </div>
        </div>
      </div>
      {headerRight ? (
        <div className="erp-section-toolbar flex flex-wrap items-center gap-1 border-b border-slate-300 bg-slate-50 px-2 py-1">
          {headerRight}
        </div>
      ) : null}
      <div className="erp-section-body">{children}</div>
    </section>
  )
}
