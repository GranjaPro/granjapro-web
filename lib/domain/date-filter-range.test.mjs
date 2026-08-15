import assert from "node:assert/strict";
import test from "node:test";

import { getMonthDateRange } from "./date-filter-range.ts";

test("limits the current month to today", () => {
  const range = getMonthDateRange(new Date(2026, 7, 1), new Date(2026, 7, 4));

  assert.deepEqual(range, {
    startDate: "2026-08-01",
    endDate: "2026-08-04",
  });
});

test("uses the full interval for a previous month", () => {
  const range = getMonthDateRange(new Date(2026, 6, 1), new Date(2026, 7, 4));

  assert.deepEqual(range, {
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  });
});
