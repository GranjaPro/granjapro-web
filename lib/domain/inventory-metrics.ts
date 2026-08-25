export type InventoryLocationCapacity = {
  id: string;
  capacityQuantity: number;
  capacityUnit: string;
};

export type InventoryOccupancyItem = {
  locationId: string;
  quantity: number;
  unit: string;
};

const unitFactors: Record<string, { dimension: "mass" | "volume" | "unit"; factor: number }> = {
  kg: { dimension: "mass", factor: 1 },
  g: { dimension: "mass", factor: 0.001 },
  mg: { dimension: "mass", factor: 0.000001 },
  l: { dimension: "volume", factor: 1 },
  ml: { dimension: "volume", factor: 0.001 },
  un: { dimension: "unit", factor: 1 },
};

export function convertInventoryMeasurement(
  quantity: number,
  sourceUnit: string,
  targetUnit: string,
): number | null {
  if (!Number.isFinite(quantity)) return null;

  const source = unitFactors[sourceUnit.toLowerCase()];
  const target = unitFactors[targetUnit.toLowerCase()];
  if (!source || !target || source.dimension !== target.dimension) return null;

  return (quantity * source.factor) / target.factor;
}

export function calculateAverageInventoryOccupancy(
  locations: InventoryLocationCapacity[],
  items: InventoryOccupancyItem[],
): number | null {
  const occupancyPercentages = locations.flatMap((location) => {
    if (!Number.isFinite(location.capacityQuantity) || location.capacityQuantity <= 0) return [];

    const convertedQuantities = items
      .filter((item) => item.locationId === location.id)
      .map((item) => convertInventoryMeasurement(item.quantity, item.unit, location.capacityUnit));

    if (convertedQuantities.some((quantity) => quantity === null)) return [];

    const occupiedQuantity = convertedQuantities.reduce<number>(
      (sum, quantity) => sum + (quantity ?? 0),
      0,
    );

    return [(occupiedQuantity / location.capacityQuantity) * 100];
  });

  if (occupancyPercentages.length === 0) return null;

  return Math.round(
    occupancyPercentages.reduce((sum, percentage) => sum + percentage, 0) /
      occupancyPercentages.length,
  );
}

export function calculateCurrentInventoryValue(quantity: number, unitCost: number | null): number {
  if (!Number.isFinite(quantity) || unitCost === null || !Number.isFinite(unitCost)) return 0;
  return quantity * unitCost;
}

export function formatInventoryExpirationAlert(days: number): string {
  if (days < 0) {
    const overdueDays = Math.abs(days);
    return `Vencido há ${overdueDays} dia${overdueDays === 1 ? "" : "s"}`;
  }
  if (days === 0) return "Vence hoje";
  return `Vence em ${days} dia${days === 1 ? "" : "s"}`;
}

export function parseInventoryCapacity(value: string): number | null | undefined {
  if (value.trim() === "") return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
