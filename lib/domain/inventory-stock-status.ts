export const DEFAULT_LOW_STOCK_THRESHOLD = 25;
export const LOW_STOCK_THRESHOLD_STORAGE_KEY = "inventoryLowStockThreshold";

export type InventoryStockStatus = "normal" | "alerta" | "baixo";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function getInventoryLowStockThresholdStorageKey(farmId: string): string {
  return `${LOW_STOCK_THRESHOLD_STORAGE_KEY}:${farmId}`;
}

export function parseInventoryLowStockThreshold(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}

export function calculateInventoryStockPercent(
  quantity: number,
  minimumQuantity: number,
): number {
  if (minimumQuantity <= 0) return quantity > 0 ? 100 : 0;
  return Math.min(100, Math.round((quantity / minimumQuantity) * 100));
}

export function resolveInventoryStockStatus(
  status: InventoryStockStatus,
  quantity: number,
  minimumQuantity: number,
  thresholdPercent: number,
  arrivalDate?: string | null,
  currentDate = new Date(),
): InventoryStockStatus {
  const stockPercent = calculateInventoryStockPercent(quantity, minimumQuantity);
  const quantityStatus = stockPercent <= thresholdPercent ? "baixo" : status;
  if (quantityStatus === "baixo") return quantityStatus;
  return isInventoryStockOld(arrivalDate, currentDate) ? "alerta" : quantityStatus;
}

export function isInventoryStockOld(
  arrivalDate?: string | null,
  currentDate = new Date(),
): boolean {
  if (!arrivalDate) return false;
  const normalizedDate = arrivalDate.includes("T") ? arrivalDate : `${arrivalDate}T00:00:00`;
  const arrival = new Date(normalizedDate);
  if (Number.isNaN(arrival.getTime())) return false;
  return currentDate.getTime() - arrival.getTime() > 14 * MILLISECONDS_PER_DAY;
}
