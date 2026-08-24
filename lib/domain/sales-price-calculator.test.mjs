import assert from "node:assert/strict";
import test from "node:test";

import { calculateSalesPriceCalculator } from "./sales-price-calculator.ts";

const baseInput = {
  transactions: [
    { date: "2026-08-01", type: "expense", category: "feed", amount: 120 },
    { date: "2026-08-02", type: "expense", category: "labor", amount: 180 },
  ],
  productionRecords: [
    { date: "2026-08-01", eggsProduced: 600 },
    { date: "2026-08-02", eggsProduced: 600 },
  ],
  sales: [
    { date: "2026-08-01", quantity: 10, total: 100 },
    { date: "2026-08-02", quantity: 20, total: 260 },
  ],
  startDate: "2026-08-01",
  endDate: "2026-08-02",
  desiredMarginPercentage: 25,
  unit: "duzia",
};

test("calculates total expense per produced dozen", () => {
  const result = calculateSalesPriceCalculator(baseInput);

  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.eggsProduced, 1200);
  assert.equal(result.producedDozens, 100);
  assert.equal(result.totalExpenses, 300);
  assert.equal(result.costPerDozen, 3);
});

test("converts the canonical dozen cost to unit and 30-egg tray", () => {
  const unitResult = calculateSalesPriceCalculator({ ...baseInput, unit: "unidade" });
  const trayResult = calculateSalesPriceCalculator({ ...baseInput, unit: "bandeja" });

  assert.equal(unitResult.status, "ready");
  assert.equal(trayResult.status, "ready");
  if (unitResult.status !== "ready" || trayResult.status !== "ready") return;
  assert.equal(unitResult.selectedCost, 0.25);
  assert.equal(trayResult.selectedCost, 7.5);
  assert.equal(unitResult.costPerUnit, 0.25);
  assert.equal(trayResult.costPerTray, 7.5);
});

test("calculates feed cost per egg only from Finance feed expenses", () => {
  const result = calculateSalesPriceCalculator(baseInput);

  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.feedExpenses, 120);
  assert.equal(result.feedCostPerEgg, 0.1);
});

test("uses only records inside the selected period", () => {
  const result = calculateSalesPriceCalculator({
    ...baseInput,
    transactions: [
      ...baseInput.transactions,
      { date: "2026-07-31", type: "expense", category: "feed", amount: 900 },
    ],
    productionRecords: [
      ...baseInput.productionRecords,
      { date: "2026-08-03", eggsProduced: 3600 },
    ],
    sales: [
      ...baseInput.sales,
      { date: "2026-08-03", quantity: 100, total: 5000 },
    ],
  });

  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.totalExpenses, 300);
  assert.equal(result.eggsProduced, 1200);
  assert.equal(result.currentPrice, 12);
});

test("reports missing expenses instead of calculating with zero cost", () => {
  const result = calculateSalesPriceCalculator({ ...baseInput, transactions: [] });

  assert.deepEqual(result, { status: "unavailable", reasons: ["missing-expenses"] });
});

test("distinguishes missing production from production totaling zero", () => {
  const missing = calculateSalesPriceCalculator({ ...baseInput, productionRecords: [] });
  const zero = calculateSalesPriceCalculator({
    ...baseInput,
    productionRecords: [{ date: "2026-08-01", eggsProduced: 0 }],
  });

  assert.deepEqual(missing, { status: "unavailable", reasons: ["missing-production"] });
  assert.deepEqual(zero, { status: "unavailable", reasons: ["zero-production"] });
});

test("uses the margin formula consistently for price, profit and current margin", () => {
  const result = calculateSalesPriceCalculator(baseInput);

  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.currentPrice, 12);
  assert.equal(result.currentMarginPercentage, 75);
  assert.equal(result.suggestedPrice, 4);
  assert.equal(result.suggestedProfit, 1);
  assert.equal(result.requiredAdjustment, -8);
  assert.equal(result.revenueImpact, -240);
});

test("keeps current-price metrics unavailable when there are no sales", () => {
  const result = calculateSalesPriceCalculator({ ...baseInput, sales: [] });

  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.currentPrice, undefined);
  assert.equal(result.currentMarginPercentage, undefined);
  assert.equal(result.requiredAdjustment, undefined);
  assert.equal(result.revenueImpact, undefined);
});

test("does not silently report zero when no feed expense was recorded", () => {
  const result = calculateSalesPriceCalculator({
    ...baseInput,
    transactions: [
      { date: "2026-08-01", type: "expense", category: "labor", amount: 300 },
    ],
  });

  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.feedCostPerEgg, undefined);
});
