import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateEggProductionMetrics,
  calculateLiveBirdsAtDate,
  getFlockProductionEligibility,
  getExpectedLayingRate,
} from "./egg-production-metrics.ts";

test("uses the rounded average laying rate for each production age", () => {
  assert.deepEqual(
    [17, 18, 22, 25, 35, 60, 75, 90, 91].map(getExpectedLayingRate),
    [0, 28, 70, 96, 93, 88, 80, 80, 68],
  );
});

test("calculates live birds through the selected production date", () => {
  const flock = { id: "flock-1", birdCount: 800, arrivalAgeWeeks: 40, arrivalDate: "2026-07-01" };
  const mortalities = [
    { flockId: flock.id, date: "2026-07-10", deadBirds: 10 },
    { flockId: flock.id, date: "2026-07-20", deadBirds: 5 },
    { flockId: flock.id, date: "2026-07-21", deadBirds: 20 },
  ];

  assert.equal(calculateLiveBirdsAtDate([flock], mortalities, "2026-07-20"), 785);
  assert.equal(calculateLiveBirdsAtDate([flock], mortalities, "2026-07-21"), 765);
});

test("allows production only for productive flocks with live birds", () => {
  const productiveFlock = { id: "flock-1", birdCount: 100, arrivalAgeWeeks: 18, arrivalDate: "2026-07-01" };
  const youngFlock = { ...productiveFlock, id: "flock-2", arrivalAgeWeeks: 17 };

  assert.equal(getFlockProductionEligibility(productiveFlock, [], "2026-07-01", false).isEligible, true);
  assert.equal(getFlockProductionEligibility(youngFlock, [], "2026-07-01", false).isEligible, false);
  assert.equal(getFlockProductionEligibility(productiveFlock, [], "2026-06-30", false).isEligible, false);
  assert.equal(getFlockProductionEligibility(productiveFlock, [], "2026-07-01", true).isEligible, false);
  assert.equal(getFlockProductionEligibility(
    productiveFlock,
    [{ flockId: productiveFlock.id, date: "2026-07-01", deadBirds: 100 }],
    "2026-07-01",
    false,
  ).isEligible, false);
});

test("calculates the daily goal and laying rate from eligible live birds", () => {
  const metrics = calculateEggProductionMetrics({
    flocks: [{ id: "flock-1", birdCount: 1_000, arrivalAgeWeeks: 40, arrivalDate: "2026-07-31" }],
    mortalities: [],
    startDate: "2026-07-31",
    endDate: "2026-07-31",
    totalEggs: 233,
  });

  assert.equal(metrics.eggGoal, 930);
  assert.equal(metrics.layingRateGoal, 93);
  assert.equal(metrics.layingRate, 23.3);
  assert.equal(metrics.eligibleBirdDays, 1_000);
  assert.deepEqual(metrics.dailyTargets, [
    { date: "2026-07-31", eggGoal: 930, layingRateGoal: 93, eligibleBirds: 1_000 },
  ]);
});

test("accumulates goals and eligible birds for the whole period", () => {
  const metrics = calculateEggProductionMetrics({
    flocks: [{ id: "flock-1", birdCount: 1_000, arrivalAgeWeeks: 40, arrivalDate: "2026-07-01" }],
    mortalities: [],
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    totalEggs: 233,
  });

  assert.equal(metrics.eggGoal, 28_830);
  assert.equal(metrics.eligibleBirdDays, 31_000);
  assert.equal(metrics.dailyTargets.length, 31);
  assert.ok(Math.abs(metrics.layingRate - 0.7516129032258064) < Number.EPSILON);
});

test("subtracts deaths accumulated before and during the selected period", () => {
  const metrics = calculateEggProductionMetrics({
    flocks: [{ id: "flock-1", birdCount: 1_000, arrivalAgeWeeks: 40, arrivalDate: "2026-07-01" }],
    mortalities: [
      { flockId: "flock-1", date: "2026-07-15", deadBirds: 10 },
      { flockId: "flock-1", date: "2026-07-31", deadBirds: 5 },
    ],
    startDate: "2026-07-31",
    endDate: "2026-07-31",
    totalEggs: 233,
  });

  assert.equal(metrics.eligibleBirdDays, 985);
  assert.equal(metrics.eggGoal, 916);
  assert.equal(metrics.dailyTargets[0].eligibleBirds, 985);
});

test("changes the goal when a flock enters a new production phase", () => {
  const metrics = calculateEggProductionMetrics({
    flocks: [{ id: "flock-1", birdCount: 100, arrivalAgeWeeks: 21, arrivalDate: "2026-07-01" }],
    mortalities: [],
    startDate: "2026-07-01",
    endDate: "2026-07-08",
    totalEggs: 0,
  });

  assert.equal(metrics.eggGoal, 266);
  assert.equal(metrics.dailyTargets[0].eggGoal, 28);
  assert.equal(metrics.dailyTargets[7].eggGoal, 70);
});
