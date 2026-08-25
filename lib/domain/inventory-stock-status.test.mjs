import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateInventoryStockPercent,
  getInventoryLowStockThresholdStorageKey,
  isInventoryStockOld,
  parseInventoryLowStockThreshold,
  resolveInventoryStockStatus,
} from "./inventory-stock-status.ts";

test("treats positive stock without a minimum quantity as full", () => {
  assert.equal(calculateInventoryStockPercent(10, 0), 100);
  assert.equal(resolveInventoryStockStatus("normal", 10, 0, 25), "normal");
});

test("treats empty stock without a minimum quantity as low", () => {
  assert.equal(calculateInventoryStockPercent(0, 0), 0);
  assert.equal(resolveInventoryStockStatus("normal", 0, 0, 25), "baixo");
});

test("marks stock at or below the configured threshold as low", () => {
  assert.equal(calculateInventoryStockPercent(20, 100), 20);
  assert.equal(resolveInventoryStockStatus("normal", 20, 100, 25), "baixo");
  assert.equal(resolveInventoryStockStatus("normal", 25, 100, 25), "baixo");
});

test("keeps the persisted status above the configured threshold", () => {
  assert.equal(resolveInventoryStockStatus("alerta", 30, 100, 25), "alerta");
});

test("caps stock percentage at one hundred", () => {
  assert.equal(calculateInventoryStockPercent(150, 100), 100);
});

test("supports a custom low-stock threshold", () => {
  assert.equal(resolveInventoryStockStatus("normal", 40, 100, 50), "baixo");
  assert.equal(resolveInventoryStockStatus("normal", 40, 100, 30), "normal");
});

test("marks inventory older than fourteen days as alert", () => {
  const currentDate = new Date("2026-08-23T00:00:00");
  assert.equal(isInventoryStockOld("2026-08-08", currentDate), true);
  assert.equal(resolveInventoryStockStatus("normal", 100, 100, 25, "2026-08-08", currentDate), "alerta");
});

test("keeps inventory from exactly fourteen days ago unchanged", () => {
  const currentDate = new Date("2026-08-23T00:00:00");
  assert.equal(isInventoryStockOld("2026-08-09", currentDate), false);
  assert.equal(resolveInventoryStockStatus("normal", 100, 100, 25, "2026-08-09", currentDate), "normal");
});

test("prioritizes low stock over an old arrival date", () => {
  const currentDate = new Date("2026-08-23T00:00:00");
  assert.equal(resolveInventoryStockStatus("normal", 10, 100, 25, "2026-08-01", currentDate), "baixo");
});

test("ignores invalid arrival dates", () => {
  const currentDate = new Date("2026-08-23T00:00:00");
  assert.equal(isInventoryStockOld("invalid-date", currentDate), false);
  assert.equal(resolveInventoryStockStatus("normal", 100, 100, 25, "invalid-date", currentDate), "normal");
});

test("scopes the low-stock threshold key by farm", () => {
  assert.equal(
    getInventoryLowStockThresholdStorageKey("farm-123"),
    "inventoryLowStockThreshold:farm-123",
  );
});

test("accepts low-stock thresholds from zero through one hundred", () => {
  assert.equal(parseInventoryLowStockThreshold("0"), 0);
  assert.equal(parseInventoryLowStockThreshold("25"), 25);
  assert.equal(parseInventoryLowStockThreshold("100"), 100);
});

test("rejects invalid low-stock thresholds", () => {
  assert.equal(parseInventoryLowStockThreshold(null), null);
  assert.equal(parseInventoryLowStockThreshold(""), null);
  assert.equal(parseInventoryLowStockThreshold("   "), null);
  assert.equal(parseInventoryLowStockThreshold("-1"), null);
  assert.equal(parseInventoryLowStockThreshold("101"), null);
  assert.equal(parseInventoryLowStockThreshold("invalid"), null);
  assert.equal(parseInventoryLowStockThreshold("Infinity"), null);
});
