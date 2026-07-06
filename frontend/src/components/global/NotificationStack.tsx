import LowStockToaster from './LowStockToaster'
import AnomalyAlertToaster from './AnomalyAlertToaster'

/** 실시간 알림 스택 — 이상탐지(우측 상단) · 저재고(우측 하단) */
export default function NotificationStack() {
  return (
    <>
      <div
        className="pointer-events-none fixed top-4 right-4 z-[100] flex max-h-[calc(100vh-2rem)] flex-col gap-2 overflow-y-auto"
        aria-live="polite"
      >
        <AnomalyAlertToaster />
      </div>
      <LowStockToaster />
    </>
  )
}
