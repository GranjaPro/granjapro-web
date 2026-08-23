import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateFeedFinancialMetrics,
  calculateProductionFinancialMetrics,
  calculateSalesFinancialMetrics,
  getSixMonthDateRange,
  groupMonthlySalesMetrics,
} from "./financial-kpi-metrics.ts";

test("calculates production finances from consumed feed and non-feed expenses", () => {
  const metrics = calculateProductionFinancialMetrics({
    productionRecords: [
      { date: "2026-07-01", eggsProduced: 100, brokenEggs: 5, dirtyEggs: 3, discardedEggs: 2 },
      { date: "2026-07-02", eggsProduced: 100, brokenEggs: 5, dirtyEggs: 3, discardedEggs: 2 },
    ],
    feedRecords: [
      { date: "2026-07-01", flockId: "flock-1", quantityKg: 13, cost: 20 },
      { date: "2026-07-02", flockId: "flock-1", quantityKg: 12, cost: 30 },
    ],
    transactions: [
      { date: "2026-07-01", type: "revenue", category: "sales", amount: 300 },
      { date: "2026-07-01", type: "expense", category: "feed", amount: 100 },
      { date: "2026-07-01", type: "expense", category: "labor", amount: 50 },
    ],
    startDate: "2026-07-01",
    endDate: "2026-07-02",
    productiveBirdDays: 200,
    efficiencyKgPerEgg: 0.125,
    latestSalePricePerDozen: 12,
  });

  assert.equal(metrics.commercialEggs, 180);
  assert.equal(metrics.operatingCost, 100);
  assert.ok(Math.abs(metrics.costPerCommercialEgg - (100 / 180)) < Number.EPSILON);
  assert.ok(Math.abs(metrics.operatingMarginPercent - ((200 / 300) * 100)) < Number.EPSILON);
  assert.equal(metrics.revenuePerDay, 150);
  assert.equal(metrics.efficiencyKgPerEgg, 0.125);
  assert.equal(metrics.revenuePerProductiveBirdDay, 1.5);
  assert.equal(metrics.lostEggsPerDay, 10);
  assert.equal(metrics.lossValuePerDay, 10);
});

test("omits monetary loss when there is no sale price history", () => {
  const metrics = calculateProductionFinancialMetrics({
    productionRecords: [
      { date: "2026-07-01", eggsProduced: 10, brokenEggs: 1, dirtyEggs: 0, discardedEggs: 0 },
    ],
    feedRecords: [],
    transactions: [],
    startDate: "2026-07-01",
    endDate: "2026-07-01",
    productiveBirdDays: 100,
  });

  assert.equal(metrics.lostEggsPerDay, 1);
  assert.equal(metrics.lossValuePerDay, undefined);
});

test("calculates feed costs only from comparable flock-days where required", () => {
  const metrics = calculateFeedFinancialMetrics({
    flocks: [{ id: "flock-1", birdCount: 100, arrivalAgeWeeks: 40, arrivalDate: "2026-07-01" }],
    mortalities: [],
    feedRecords: [
      { date: "2026-07-01", flockId: "flock-1", quantityKg: 13, cost: 26 },
      { date: "2026-07-02", flockId: "flock-1", quantityKg: 12, cost: 24 },
      { date: "2026-07-02", flockId: null, quantityKg: 5, cost: 10 },
    ],
    productionRecords: [
      { date: "2026-07-01", flockId: "flock-1", eggsProduced: 100 },
      { date: "2026-07-02", flockId: "flock-1", eggsProduced: 100 },
    ],
    startDate: "2026-07-01",
    endDate: "2026-07-02",
  });

  assert.equal(metrics.totalFeedKg, 30);
  assert.equal(metrics.totalFeedCost, 60);
  assert.equal(metrics.costPerKg, 2);
  assert.equal(metrics.costPerEgg, 0.25);
  assert.equal(metrics.costPerDozen, 3);
  assert.equal(metrics.costPerBirdDay, 0.25);
});

test("calculates weighted price per dozen from sales", () => {
  const metrics = calculateSalesFinancialMetrics([
    { date: "2026-07-01", quantity: 10, total: 100 },
    { date: "2026-07-02", quantity: 30, total: 420 },
  ]);

  assert.equal(metrics.dozensSold, 40);
  assert.equal(metrics.salesRevenue, 520);
  assert.equal(metrics.averagePricePerDozen, 13);
});

test("groups weighted sales metrics by month", () => {
  const metrics = groupMonthlySalesMetrics([
    { date: "2026-06-15", quantity: 5, total: 50 },
    { date: "2026-07-01", quantity: 10, total: 120 },
    { date: "2026-07-02", quantity: 20, total: 300 },
  ]);

  assert.deepEqual(metrics, [
    { month: "2026-06", dozensSold: 5, salesRevenue: 50, averagePricePerDozen: 10 },
    { month: "2026-07", dozensSold: 30, salesRevenue: 420, averagePricePerDozen: 14 },
  ]);
});

test("calculates a six-month date range", () => {
  assert.deepEqual(getSixMonthDateRange("2026-08-23"), {
    startDate: "2026-03-01",
    endDate: "2026-08-23",
  });
});
