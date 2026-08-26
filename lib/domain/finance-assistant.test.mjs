import assert from "node:assert/strict";
import test from "node:test";

import { generateFinanceInsights } from "./finance-assistant.ts";

const neutral = { label: "0,0%", direction: "neutral" };

function snapshot(overrides = {}) {
  return {
    status: "ready",
    periodLabel: "Período selecionado",
    hasData: true,
    revenue: 1000,
    expenses: 800,
    profit: 200,
    margin: 20,
    profitPerBird: 2,
    revenueVariation: neutral,
    expenseVariation: neutral,
    profitVariation: neutral,
    topExpense: null,
    topCustomer: null,
    ...overrides,
  };
}

test("keeps loading, error and no-data states exclusive", () => {
  assert.deepEqual(generateFinanceInsights(snapshot({ status: "loading" })).map((item) => item.id), ["finance-loading"]);
  assert.deepEqual(generateFinanceInsights(snapshot({ status: "error" })).map((item) => item.id), ["finance-error"]);
  assert.deepEqual(generateFinanceInsights(snapshot({ hasData: false })).map((item) => item.id), ["finance-no-data"]);
});

test("reports supported financial risks with explicit destinations", () => {
  const result = generateFinanceInsights(snapshot({
    profit: -100,
    margin: -10,
    revenueVariation: { label: "-12,0%", direction: "down" },
    expenseVariation: { label: "+15,0%", direction: "up" },
    profitVariation: { label: "-30,0%", direction: "down" },
    topExpense: { label: "Ração", share: 60 },
    topCustomer: { name: "Cliente A", share: 40 },
  }));

  assert.equal(result[0].id, "finance-negative-profit");
  assert.ok(result.some((item) => item.id === "finance-expenses-up" && item.href === "/dashboard/finances"));
  assert.ok(result.some((item) => item.id === "finance-revenue-down" && item.href === "/dashboard/sales"));
  assert.ok(result.some((item) => item.id === "finance-customer-concentration" && item.href === "/dashboard/customers"));
});

test("uses exact approved margin and concentration boundaries", () => {
  const boundary = generateFinanceInsights(snapshot({ margin: 10, topCustomer: { name: "Cliente A", share: 30 } }));
  assert.ok(!boundary.some((item) => item.id === "finance-low-margin"));
  assert.ok(!boundary.some((item) => item.id === "finance-customer-concentration"));
  assert.ok(boundary.some((item) => item.id === "finance-healthy-margin"));
});

test("reports positive trends without forecasts or unsupported causes", () => {
  const result = generateFinanceInsights(snapshot({
    expenseVariation: { label: "-5,0%", direction: "down" },
    profitVariation: { label: "+10,0%", direction: "up" },
  }));

  assert.ok(result.some((item) => item.id === "finance-expenses-down"));
  assert.ok(result.some((item) => item.id === "finance-profit-growing"));
  assert.ok(result.every((item) => !/previs|causa|garant/i.test(`${item.title} ${item.action}`)));
});
