import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateAverageInventoryOccupancy,
  calculateCurrentInventoryValue,
  convertInventoryMeasurement,
  formatInventoryExpirationAlert,
  parseInventoryCapacity,
} from "./inventory-metrics.ts";

test("calculates current inventory value from remaining quantity", () => {
  assert.equal(calculateCurrentInventoryValue(10, 2.5), 25);
  assert.equal(calculateCurrentInventoryValue(4, 2.5), 10);
  assert.equal(calculateCurrentInventoryValue(10, null), 0);
});

test("converts compatible inventory measurements", () => {
  assert.equal(convertInventoryMeasurement(1000, "g", "kg"), 1);
  assert.equal(convertInventoryMeasurement(1_000_000, "mg", "kg"), 1);
  assert.equal(convertInventoryMeasurement(1000, "ml", "l"), 1);
  assert.equal(convertInventoryMeasurement(2, "kg", "g"), 2000);
});

test("rejects incompatible or unknown inventory measurements", () => {
  assert.equal(convertInventoryMeasurement(1, "kg", "l"), null);
  assert.equal(convertInventoryMeasurement(1, "caixa", "un"), null);
});

test("calculates average occupancy using measurable locations", () => {
  const occupancy = calculateAverageInventoryOccupancy(
    [
      { id: "mass", capacityQuantity: 100, capacityUnit: "kg" },
      { id: "volume", capacityQuantity: 10, capacityUnit: "l" },
    ],
    [
      { locationId: "mass", quantity: 50_000, unit: "g" },
      { locationId: "volume", quantity: 2_500, unit: "ml" },
    ],
  );

  assert.equal(occupancy, 38);
});

test("ignores locations without usable capacity or with incompatible items", () => {
  const occupancy = calculateAverageInventoryOccupancy(
    [
      { id: "valid", capacityQuantity: 10, capacityUnit: "un" },
      { id: "missing", capacityQuantity: 0, capacityUnit: "kg" },
      { id: "incompatible", capacityQuantity: 10, capacityUnit: "kg" },
    ],
    [
      { locationId: "valid", quantity: 5, unit: "un" },
      { locationId: "incompatible", quantity: 5, unit: "l" },
    ],
  );

  assert.equal(occupancy, 50);
});

test("returns null without measurable capacity and preserves over-capacity values", () => {
  assert.equal(calculateAverageInventoryOccupancy([], []), null);
  assert.equal(
    calculateAverageInventoryOccupancy(
      [{ id: "location", capacityQuantity: 10, capacityUnit: "kg" }],
      [{ locationId: "location", quantity: 15, unit: "kg" }],
    ),
    150,
  );
});

test("formats expiration alerts for overdue, today and upcoming inventory", () => {
  assert.equal(formatInventoryExpirationAlert(-25), "Vencido há 25 dias");
  assert.equal(formatInventoryExpirationAlert(-1), "Vencido há 1 dia");
  assert.equal(formatInventoryExpirationAlert(0), "Vence hoje");
  assert.equal(formatInventoryExpirationAlert(1), "Vence em 1 dia");
  assert.equal(formatInventoryExpirationAlert(15), "Vence em 15 dias");
});

test("accepts empty or positive capacity and rejects invalid capacity", () => {
  assert.equal(parseInventoryCapacity(""), undefined);
  assert.equal(parseInventoryCapacity("   "), undefined);
  assert.equal(parseInventoryCapacity("10"), 10);
  assert.equal(parseInventoryCapacity("0.5"), 0.5);
  assert.equal(parseInventoryCapacity("0"), null);
  assert.equal(parseInventoryCapacity("-1"), null);
  assert.equal(parseInventoryCapacity("invalid"), null);
  assert.equal(parseInventoryCapacity("Infinity"), null);
});
