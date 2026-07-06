export function erpInputClass(invalid = false) {
  return [
    'h-7 w-full border bg-white px-2 text-xs text-slate-800 outline-none',
    invalid ? 'border-rose-500 ring-1 ring-rose-200' : 'border-slate-300 focus:border-blue-500',
  ].join(' ')
}

export function erpSelectClass(invalid = false) {
  return erpInputClass(invalid)
}

export function erpToolbarBtnClass(active = false) {
  return [
    'h-7 shrink-0 border px-2 text-xs text-slate-700',
    active
      ? 'border-blue-400 bg-blue-50 font-medium text-blue-800'
      : 'border-slate-300 bg-white hover:bg-slate-100',
  ].join(' ')
}

export function erpPrimaryBtnClass() {
  return 'inline-flex h-8 min-w-[4.5rem] items-center justify-center border border-blue-600 bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50'
}

export function erpSecondaryBtnClass() {
  return 'inline-flex h-8 min-w-[4.5rem] items-center justify-center border border-slate-300 bg-white px-3 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50'
}

export function erpGridHeadClass() {
  return 'border border-slate-300 bg-slate-100 px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 whitespace-nowrap'
}

export function erpGridCellClass(extra = '') {
  return ['border border-slate-300 px-2 py-1 text-xs text-slate-800', extra].filter(Boolean).join(' ')
}
