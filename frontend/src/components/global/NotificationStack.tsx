import LowStockToaster from './LowStockToaster'
import AnomalyAlertToaster from './AnomalyAlertToaster'

/** 우측 하단 고정 알림 스택 (저재고 · 이상탐지) */
export default function NotificationStack() {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-h-[calc(100vh-2rem)] flex-col-reverse gap-2 overflow-y-auto"
      aria-live="polite"
    >
      <AnomalyAlertToaster />
      <LowStockToaster inline />
    </div>
  )
}
