export const ANOMALY_REASON_LABEL: Record<string, string> = {
  ALLOCATION: '배분',
  ORDER: '발주',
  SALE: '판매',
  RETURN: '반품',
  DAMAGE: '불량',
  SEASON_END: '시즌종료',
  LOST: '분실',
  ETC: '기타',
}

export function anomalyReasonLabel(reason: string | null | undefined): string {
  if (!reason) return '—'
  return ANOMALY_REASON_LABEL[reason] ?? reason
}
