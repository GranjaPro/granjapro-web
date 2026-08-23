import assert from "node:assert/strict";
import test from "node:test";

import {
  inventoryLinkFromSelection,
  inventorySelectionKey,
  parseInventorySelectionKey,
  parsePositiveAmount,
} from "./financial-transaction.ts";

test("accepts only finite amounts greater than zero", () => {
  for (const invalid of ["", " ", "0", "-0.01", "NaN", "Infinity"]) {
    assert.equal(parsePositiveAmount(invalid).valid, false);
  }

  assert.deepEqual(parsePositiveAmount("12.50"), { valid: true, amount: 12.5 });
});

test("maps one inventory selection to exactly one foreign key", () => {
  assert.deepEqual(inventoryLinkFromSelection({ table: "medicine", id: "item-1" }), {
    feed_inventory_id: null,
    medicine_inventory_id: "item-1",
    packaging_inventory_id: null,
    equipment_inventory_id: null,
  });
});

test("round-trips inventory selection keys", () => {
  const selection = { table: "equipment", id: "item-2" };
  assert.deepEqual(parseInventorySelectionKey(inventorySelectionKey(selection)), selection);
  assert.equal(parseInventorySelectionKey("invalid"), null);
});
