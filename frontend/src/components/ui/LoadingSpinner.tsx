type Props = {
  label?: string
}

export default function LoadingSpinner({ label = '불러오는 중…' }: Props) {
  return (
    <div className="flex h-40 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          className="size-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"
          role="status"
          aria-label={label}
        />
        {label ? <span className="text-sm text-slate-500">{label}</span> : null}
      </div>
    </div>
  )
}
