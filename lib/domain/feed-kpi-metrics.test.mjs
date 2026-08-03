import assert from "node:assert/strict";
import test from "node:test";

import { calculateFeedKpiMetrics, calculateFeedStockMetrics } from "./feed-kpi-metrics.ts";

const flock = {
  id: "flock-1",
  birdCount: 1_000,
  arrivalAgeWeeks: 40,
  arrivalDate: "2026-07-01",
};

test("calculates production goals only for registered flock-days", () => {
  const metrics = calculateFeedKpiMetrics({
    flocks: [flock],
    mortalities: [],
    feedRecords: [],
    productionRecords: [{ date: "2026-07-31", flockId: flock.id, eggsProduced: 900 }],
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    targetFeedGramsPerBird: 130,
  });

  assert.equal(metrics.productionAverage, 900);
  assert.equal(metrics.productionGoalAverage, 930);
  assert.equal(metrics.registeredProductionDays, 1);
  assert.equal(metrics.productionPairCount, 1);
  assert.equal(metrics.totalPeriodDays, 31);
});

test("calculates efficiency only from matching flock-days", () => {
  const metrics = calculateFeedKpiMetrics({
    flocks: [flock],
    mortalities: [],
    feedRecords: [
      { date: "2026-07-30", flockId: flock.id, quantityKg: 999 },
      { date: "2026-07-31", flockId: flock.id, quantityKg: 130 },
    ],
    productionRecords: [{ date: "2026-07-31", flockId: flock.id, eggsProduced: 900 }],
    startDate: "2026-07-30",
    endDate: "2026-07-31",
    targetFeedGramsPerBird: 130,
  });

  assert.ok(Math.abs(metrics.efficiencyKgPerEgg - (130 / 900)) < Number.EPSILON);
  assert.ok(Math.abs(metrics.idealEfficiencyKgPerEgg - (130 / 930)) < Number.EPSILON);
  assert.equal(metrics.comparableDays, 1);
  assert.equal(metrics.comparablePairCount, 1);
});

test("uses only feed inventory and normalizes grams to kilograms", () => {
  const metrics = calculateFeedStockMetrics({
    activeFlocks: [flock],
    mortalities: [{ flockId: flock.id, date: "2026-07-30", deadBirds: 100 }],
    inventory: [
      { inventoryTable: "feed", quantity: 1_000, unit: "kg" },
      { inventoryTable: "feed", quantity: 130_000, unit: "g" },
      { inventoryTable: "medicine", quantity: 5_000, unit: "kg" },
      { inventoryTable: "feed", quantity: 100, unit: "un" },
    ],
    currentDate: "2026-07-31",
    targetFeedGramsPerBird: 130,
  });

  assert.equal(metrics.stockKg, 1_130);
  assert.equal(metrics.liveBirds, 900);
  assert.equal(metrics.dailyNeedKg, 117);
  assert.equal(metrics.coverageDays, 9);
});
