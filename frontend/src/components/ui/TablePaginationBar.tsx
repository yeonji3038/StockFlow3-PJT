import { erpToolbarBtnClass } from '../../lib/erpUi'

type Props = {
  page: number
  pageCount: number
  total: number
  setPage: (n: number) => void
  fromIdx: number
  toIdx: number
}

export default function TablePaginationBar({
  page,
  pageCount,
  total,
  setPage,
  fromIdx,
  toIdx,
}: Props) {
  if (total === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] text-slate-600">
      <p className="tabular-nums">
        <span className="font-medium text-slate-800">
          {fromIdx}–{toIdx}
        </span>
        <span className="text-slate-400"> / </span>
        총 <span className="font-semibold text-slate-800">{total}</span>건
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className={[erpToolbarBtnClass(), 'disabled:cursor-not-allowed disabled:opacity-40'].join(' ')}
        >
          이전
        </button>
        <span className="min-w-[3.5rem] text-center tabular-nums text-slate-500">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => setPage(page + 1)}
          className={[erpToolbarBtnClass(), 'disabled:cursor-not-allowed disabled:opacity-40'].join(' ')}
        >
          다음
        </button>
      </div>
    </div>
  )
}
