import type { ReactNode } from 'react'
import {
  ErpFooterBar,
  ErpWorkScreen,
} from './erp/ErpLayout'

type Props = {
  title: string
  actions?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

/** 페이지 단위 ERP 작업 화면 — 본사·매장·창고 공통 레이아웃 */
export default function ErpPageFrame({ title, actions, footer, children }: Props) {
  return (
    <ErpWorkScreen title={title}>
      {actions ? (
        <div className="erp-page-actions flex w-full flex-wrap items-center gap-1 border-b border-slate-300 bg-slate-50 px-2 py-1">
          {actions}
        </div>
      ) : null}
      <div className="erp-page-body">{children}</div>
      {footer ? <ErpFooterBar>{footer}</ErpFooterBar> : null}
    </ErpWorkScreen>
  )
}

export function ErpAccessDenied({ title, message }: { title: string; message: string }) {
  return (
    <ErpWorkScreen title={title}>
      <div className="px-3 py-12 text-center text-xs text-slate-500">{message}</div>
    </ErpWorkScreen>
  )
}
