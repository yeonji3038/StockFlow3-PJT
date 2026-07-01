type Props = {
  label?: string
  /** 인라인·헤더 등 좁은 영역용 */
  compact?: boolean
  /** 로그인/회원가입 등 파란 배경 위 */
  variant?: 'default' | 'light'
  hideLabel?: boolean
}

export default function LoadingSpinner({
  label = '불러오는 중…',
  compact = false,
  variant = 'default',
  hideLabel = false,
}: Props) {
  const ringClass =
    variant === 'light'
      ? 'border-white/30 border-t-white'
      : 'border-slate-200 border-t-blue-600'
  const textClass = variant === 'light' ? 'text-white/80' : 'text-slate-500'
  const sizeClass = compact ? 'size-4 border-2' : 'size-10 border-4'

  const spinner = (
    <div
      className={`${sizeClass} shrink-0 animate-spin rounded-full ${ringClass}`}
      role="status"
      aria-label={label}
    />
  )

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {spinner}
        {!hideLabel && label ? <span className={`text-sm ${textClass}`}>{label}</span> : null}
      </div>
    )
  }

  return (
    <div className="flex h-40 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        {spinner}
        {!hideLabel && label ? <span className={`text-sm ${textClass}`}>{label}</span> : null}
      </div>
    </div>
  )
}
