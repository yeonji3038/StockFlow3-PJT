import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Boxes } from 'lucide-react'

type Props = {
  children: ReactNode
}

export const signupInputClass =
  'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'

export const signupSelectClass =
  'h-11 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100'

export const signupPrimaryButtonClass =
  'h-12 w-full rounded-lg bg-[#879bb3] text-sm font-semibold text-white transition hover:bg-[#7589a3] disabled:cursor-not-allowed disabled:opacity-50'

export default function SignupPageShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-[520px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Boxes className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">StockFlow</h1>
          <p className="mt-1 text-sm text-slate-500">회원가입</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-800">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
