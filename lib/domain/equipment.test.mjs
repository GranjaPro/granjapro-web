import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateLifeUsagePercent,
  summarizeUniqueEquipmentRisk,
  validateEquipmentForm,
} from "./equipment.ts";

function validForm(overrides = {}) {
  return {
    name: "Comedouro",
    equipmentValue: "18500",
    usageHours: "14200",
    lifespanHours: "25000",
    installationDate: "2026-01-10",
    nextMaintenanceDate: "2026-09-10",
    ...overrides,
  };
}

test("requires a non-blank equipment name", () => {
  assert.deepEqual(validateEquipmentForm(validForm({ name: "   " })), {
    valid: false,
    message: "Informe o nome do equipamento.",
  });
});

test("normalizes optional blank numeric fields to zero", () => {
  const result = validateEquipmentForm(validForm({
    equipmentValue: "",
    usageHours: " ",
    lifespanHours: "",
  }));

  assert.deepEqual(result, {
    valid: true,
    values: {
      name: "Comedouro",
      equipmentValue: 0,
      usageHours: 0,
      lifespanHours: 0,
    },
  });
});

test("rejects negative, non-finite and invalid numeric values", () => {
  for (const [field, value] of [
    ["equipmentValue", "-0.01"],
    ["usageHours", "NaN"],
    ["lifespanHours", "Infinity"],
  ]) {
    assert.equal(validateEquipmentForm(validForm({ [field]: value })).valid, false);
  }
});

test("rejects maintenance before installation", () => {
  assert.deepEqual(
    validateEquipmentForm(validForm({ nextMaintenanceDate: "2026-01-09" })),
    {
      valid: false,
      message: "A próxima manutenção não pode ser anterior à data de instalação.",
    },
  );
});

test("reports actual life usage, including values over one hundred percent", () => {
  assert.equal(calculateLifeUsagePercent(10, 0), 0);
  assert.equal(calculateLifeUsagePercent(80, 100), 80);
  assert.equal(calculateLifeUsagePercent(100, 100), 100);
  assert.equal(calculateLifeUsagePercent(112, 100), 112);
});

test("allows usage hours to exceed lifespan so overdue equipment remains representable", () => {
  assert.equal(validateEquipmentForm(validForm({ usageHours: "112", lifespanHours: "100" })).valid, true);
});

test("deduplicates alert count and equipment value across risk groups", () => {
  const equipment = { id: "equipment-1", equipmentValue: 18000 };
  const result = summarizeUniqueEquipmentRisk([
    [equipment],
    [equipment, { id: "equipment-2", equipmentValue: 7000 }],
  ]);

  assert.deepEqual(result, { count: 2, totalValue: 25000 });
});
