type Props = {
  title: string
  value: string | number
  hint?: string
  tone?: 'default' | 'amber' | 'rose'
  onClick?: () => void
}

const toneClass: Record<NonNullable<Props['tone']>, string> = {
  default: 'border-slate-300 bg-white',
  amber: 'border-amber-300 bg-amber-50/80',
  rose: 'border-rose-300 bg-rose-50/80',
}

const interactiveClass =
  'cursor-pointer text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500'

export default function StatCard({ title, value, hint, tone = 'default', onClick }: Props) {
  const cls = `border p-3 shadow-sm ${toneClass[tone]}${onClick ? ` ${interactiveClass}` : ''}`

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`block w-full ${cls}`}>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </button>
    )
  }

  return (
    <div className={cls}>
      <p className="text-[11px] font-semibold text-slate-600">{title}</p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  )
}
