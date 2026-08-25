export interface EquipmentFormInput {
  name: string;
  equipmentValue: string;
  usageHours: string;
  lifespanHours: string;
  installationDate: string;
  nextMaintenanceDate: string;
}

export interface ValidatedEquipmentValues {
  name: string;
  equipmentValue: number;
  usageHours: number;
  lifespanHours: number;
}

export type EquipmentValidationResult =
  | { valid: true; values: ValidatedEquipmentValues }
  | { valid: false; message: string };

export interface EquipmentRiskItem {
  id: string;
  equipmentValue: number;
}

export interface EquipmentRiskSummary {
  count: number;
  totalValue: number;
}

function parseNonNegativeNumber(rawValue: string, label: string): number | string {
  if (!rawValue.trim()) return 0;

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0) {
    return `${label} deve ser um número maior ou igual a zero.`;
  }

  return value;
}

export function validateEquipmentForm(input: EquipmentFormInput): EquipmentValidationResult {
  const name = input.name.trim();
  if (!name) {
    return { valid: false, message: "Informe o nome do equipamento." };
  }

  const equipmentValue = parseNonNegativeNumber(input.equipmentValue, "O valor");
  if (typeof equipmentValue === "string") return { valid: false, message: equipmentValue };

  const usageHours = parseNonNegativeNumber(input.usageHours, "As horas de uso");
  if (typeof usageHours === "string") return { valid: false, message: usageHours };

  const lifespanHours = parseNonNegativeNumber(input.lifespanHours, "A vida útil");
  if (typeof lifespanHours === "string") return { valid: false, message: lifespanHours };

  if (
    input.installationDate
    && input.nextMaintenanceDate
    && input.nextMaintenanceDate < input.installationDate
  ) {
    return {
      valid: false,
      message: "A próxima manutenção não pode ser anterior à data de instalação.",
    };
  }

  return {
    valid: true,
    values: { name, equipmentValue, usageHours, lifespanHours },
  };
}

export function calculateLifeUsagePercent(usageHours: number, lifespanHours: number): number {
  if (lifespanHours <= 0) return 0;
  return Math.max(0, Math.round((usageHours / lifespanHours) * 100));
}

export function summarizeUniqueEquipmentRisk(
  groups: ReadonlyArray<ReadonlyArray<EquipmentRiskItem>>,
): EquipmentRiskSummary {
  const equipmentById = new Map<string, number>();

  for (const group of groups) {
    for (const item of group) {
      if (!equipmentById.has(item.id)) {
        equipmentById.set(item.id, item.equipmentValue);
      }
    }
  }

  return {
    count: equipmentById.size,
    totalValue: Array.from(equipmentById.values()).reduce((sum, value) => sum + value, 0),
  };
}
