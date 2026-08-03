import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateKpiVariation,
  calculateRelativePercentageDifference,
  getComparisonPeriod,
} from "./kpi-comparison.ts";

test("compares a day with the immediately previous day", () => {
  assert.deepEqual(
    getComparisonPeriod({ mode: "dia", startDate: "2026-07-31", endDate: "2026-07-31", todayDate: "2026-07-31" }),
    { currentEndDate: "2026-07-31", previousStartDate: "2026-07-30", previousEndDate: "2026-07-30" },
  );
});

test("compares an interval with the immediately previous interval of equal duration", () => {
  assert.deepEqual(
    getComparisonPeriod({ mode: "intervalo", startDate: "2026-07-29", endDate: "2026-07-31", todayDate: "2026-07-31" }),
    { currentEndDate: "2026-07-31", previousStartDate: "2026-07-26", previousEndDate: "2026-07-28" },
  );
});

test("compares a closed month with the full previous calendar month", () => {
  assert.deepEqual(
    getComparisonPeriod({ mode: "mes", startDate: "2026-07-01", endDate: "2026-07-31", todayDate: "2026-08-10" }),
    { currentEndDate: "2026-07-31", previousStartDate: "2026-06-01", previousEndDate: "2026-06-30" },
  );
});

test("compares an ongoing month with the same available days from the previous month", () => {
  assert.deepEqual(
    getComparisonPeriod({ mode: "mes", startDate: "2026-03-01", endDate: "2026-03-31", todayDate: "2026-03-15" }),
    { currentEndDate: "2026-03-15", previousStartDate: "2026-02-01", previousEndDate: "2026-02-15" },
  );
});

test("formats zero, new, increase, reduction and recovery from a loss", () => {
  assert.deepEqual(calculateKpiVariation(0, 0), { label: "0,0%", direction: "neutral" });
  assert.deepEqual(calculateKpiVariation(10, 0), { label: "Novo", direction: "neutral" });
  assert.deepEqual(calculateKpiVariation(120, 100), { label: "+20,0%", direction: "up" });
  assert.deepEqual(calculateKpiVariation(80, 100), { label: "-20,0%", direction: "down" });
  assert.deepEqual(calculateKpiVariation(0, -100), { label: "+100,0%", direction: "up" });
});

test("calculates relative performance against a target", () => {
  assert.equal(calculateRelativePercentageDifference(1.2, 93), -98.70967741935483);
  assert.equal(calculateRelativePercentageDifference(82.6, 95), -13.052631578947373);
  assert.equal(calculateRelativePercentageDifference(10, 0), 0);
});
