import type { ReactNode } from 'react'

function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-[#4a72f5] via-[#3b63e8] to-[#3258d4]" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#2a4fc7"
          fillOpacity="0.55"
          d="M-120 620 C 180 520, 320 780, 520 720 C 720 660, 640 900, 420 900 L -120 900 Z"
        />
        <path
          fill="#1e3fa8"
          fillOpacity="0.45"
          d="M980 80 C 1120 40, 1320 120, 1500 0 L 1500 900 L 1080 900 C 920 720, 820 180, 980 80 Z"
        />
        <path
          fill="#254eb8"
          fillOpacity="0.35"
          d="M1180 520 C 1280 460, 1380 560, 1500 480 L 1500 900 L 1040 900 C 1080 760, 1120 580, 1180 520 Z"
        />
      </svg>
    </div>
  )
}

function AuthBrandIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-[100px] w-[100px] text-white sm:h-[112px] sm:w-[112px]"
      aria-hidden
    >
      <path
        d="M11 30L19 17"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M19 17H47L43 43H17L11 30H47"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M32 22V36"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M28 26L32 22L36 26"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="47" r="3" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="37" cy="47" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

type Props = {
  children: ReactNode
}

export default function AuthPageShell({ children }: Props) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden py-10">
      <AuthBackground />
      <div className="relative z-10 flex w-full flex-col items-center px-6">
        <AuthBrandIcon />
        <p className="mt-3 text-lg font-semibold tracking-[0.08em] text-white">StockFlow</p>
        {children}
      </div>
    </div>
  )
}

export const authFieldClass =
  'w-full bg-transparent text-[13px] font-normal tracking-wide text-white placeholder:text-white/90 placeholder:uppercase focus:outline-none'

export const authCodeFieldClass =
  'w-full bg-transparent font-mono text-[13px] font-normal tracking-wider text-white placeholder:text-white/90 placeholder:uppercase focus:outline-none'

export const authInputRowClass =
  'flex h-[46px] items-center gap-3 border border-white bg-transparent px-4'

export const authPrimaryButtonClass =
  'h-[46px] w-full bg-white text-[13px] font-bold uppercase tracking-[0.18em] text-[#3b63e8] transition hover:bg-white/95 disabled:opacity-70'

export const authSecondaryLinkClass =
  'flex h-[46px] w-full items-center justify-center border border-white bg-transparent text-[13px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/10'
