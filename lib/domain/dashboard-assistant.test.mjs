import assert from "node:assert/strict";
import test from "node:test";

import { generateDashboardInsights } from "./dashboard-assistant.ts";

const neutral = { label: "0,0%", direction: "neutral" };

function snapshot(overrides = {}) {
  return {
    status: "ready",
    periodLabel: "Período selecionado",
    hasData: true,
    production: { total: 100, goal: 100, variation: neutral },
    layingRate: { current: 90, goal: 90 },
    costPerEgg: { current: 0.2, variation: neutral },
    finances: { profit: 100, margin: 12, profitVariation: neutral },
    underperformingFlocks: [],
    ...overrides,
  };
}

test("keeps loading, error and no-data states exclusive", () => {
  assert.deepEqual(generateDashboardInsights(snapshot({ status: "loading" })).map((item) => item.id), ["dashboard-loading"]);
  assert.deepEqual(generateDashboardInsights(snapshot({ status: "error" })).map((item) => item.id), ["dashboard-error"]);
  const noData = generateDashboardInsights(snapshot({ hasData: false, periodLabel: "Mês selecionado" }));
  assert.deepEqual(noData.map((item) => item.id), ["dashboard-no-data"]);
  assert.match(noData[0].title, /mês selecionado/i);
});

test("derives warnings and destinations from supplied dashboard data", () => {
  const result = generateDashboardInsights(snapshot({
    production: { total: 80, goal: 100, variation: { label: "-20,0%", direction: "down" } },
    layingRate: { current: 80, goal: 90 },
    costPerEgg: { current: 0.3, variation: { label: "+15,0%", direction: "up" } },
    finances: { profit: -50, margin: -5, profitVariation: { label: "-120,0%", direction: "down" } },
    underperformingFlocks: ["Lote 1"],
  }));

  assert.equal(result.length, 5);
  assert.equal(result[0].id, "dashboard-negative-profit");
  assert.ok(result.some((item) => item.id === "dashboard-production-below-goal" && item.href === "/dashboard/production"));
  assert.ok(result.some((item) => item.id === "dashboard-underperforming-flocks" && item.href === "/dashboard/flocks"));
  assert.ok(result.some((item) => item.id === "dashboard-cost-per-egg-up" && item.href === "/dashboard/racao"));
});

test("returns positive insights for supported improving metrics", () => {
  const result = generateDashboardInsights(snapshot({
    production: { total: 110, goal: 100, variation: { label: "+10,0%", direction: "up" } },
    costPerEgg: { current: 0.18, variation: { label: "-8,0%", direction: "down" } },
    finances: { profit: 200, margin: 20, profitVariation: { label: "+30,0%", direction: "up" } },
  }));

  assert.ok(result.some((item) => item.id === "dashboard-production-on-goal"));
  assert.ok(result.some((item) => item.id === "dashboard-laying-rate-on-goal"));
  assert.ok(result.some((item) => item.id === "dashboard-cost-per-egg-down"));
  assert.ok(result.some((item) => item.id === "dashboard-profit-growing" && item.href === "/dashboard/finances"));
  assert.ok(result.every((item) => !item.title.includes("2.2%") && !item.title.includes("8.5%")));
});
