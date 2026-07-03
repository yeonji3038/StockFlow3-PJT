import type { WarehouseStock } from '../types/models'

/** 창고 저재고 판단 기준 (가용재고) */
export const WAREHOUSE_LOW_STOCK_MAX = 10

export function warehouseReservedQty(s: WarehouseStock): number {
  if (typeof s.reservedQuantity === 'number') return s.reservedQuantity
  const r = s as WarehouseStock & { reserved_quantity?: number }
  if (typeof r.reserved_quantity === 'number') return r.reserved_quantity
  return 0
}

export function warehouseAvailableQty(s: WarehouseStock): number {
  if (typeof s.availableQuantity === 'number') return s.availableQuantity
  const r = s as WarehouseStock & { available_quantity?: number }
  if (typeof r.available_quantity === 'number') return r.available_quantity
  return s.quantity - warehouseReservedQty(s)
}

export function isWarehouseLowStock(
  s: WarehouseStock,
  max = WAREHOUSE_LOW_STOCK_MAX,
): boolean {
  return warehouseAvailableQty(s) <= max
}
