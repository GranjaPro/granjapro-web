export type PositiveAmountResult =
  | { valid: true; amount: number }
  | { valid: false; message: string };

export type InventoryTable = "feed" | "medicine" | "packaging" | "equipment";

export interface InventoryLinkSelection {
  table: InventoryTable;
  id: string;
}

export interface FinancialInventoryLink {
  feed_inventory_id: string | null;
  medicine_inventory_id: string | null;
  packaging_inventory_id: string | null;
  equipment_inventory_id: string | null;
}

export function parsePositiveAmount(rawValue: string): PositiveAmountResult {
  const amount = Number(rawValue);

  if (!rawValue.trim() || !Number.isFinite(amount) || amount <= 0) {
    return { valid: false, message: "Informe um valor maior que zero." };
  }

  return { valid: true, amount };
}

export function inventoryLinkFromSelection(
  selection: InventoryLinkSelection | null,
): FinancialInventoryLink {
  return {
    feed_inventory_id: selection?.table === "feed" ? selection.id : null,
    medicine_inventory_id: selection?.table === "medicine" ? selection.id : null,
    packaging_inventory_id: selection?.table === "packaging" ? selection.id : null,
    equipment_inventory_id: selection?.table === "equipment" ? selection.id : null,
  };
}

export function inventorySelectionKey(selection: InventoryLinkSelection): string {
  return `${selection.table}:${selection.id}`;
}

export function parseInventorySelectionKey(value: string): InventoryLinkSelection | null {
  const separatorIndex = value.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) return null;

  const table = value.slice(0, separatorIndex);
  const id = value.slice(separatorIndex + 1);
  if (table !== "feed" && table !== "medicine" && table !== "packaging" && table !== "equipment") {
    return null;
  }

  return { table, id };
}
