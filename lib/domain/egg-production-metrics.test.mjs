import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateEggProductionMetrics,
  calculateLiveBirdsAtDate,
  calculateRecordedFlockProductionMetrics,
  getFlockProductionEligibility,
  getExpectedLayingRate,
  getProductionPhase,
  getProductionPhaseLabel,
  requiresHighLayingRateConfirmation,
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

test("calculates flock posture using only dates with production records", () => {
  const metrics = calculateRecordedFlockProductionMetrics({
    flock: { id: "flock-1", birdCount: 1_000, arrivalAgeWeeks: 40, arrivalDate: "2026-07-01" },
    mortalities: [{ flockId: "flock-1", date: "2026-07-02", deadBirds: 10 }],
    productionRecords: [
      { flockId: "flock-1", date: "2026-07-01", eggsProduced: 930 },
      { flockId: "flock-1", date: "2026-07-03", eggsProduced: 900 },
      { flockId: "flock-2", date: "2026-07-03", eggsProduced: 500 },
    ],
    startDate: "2026-07-01",
    endDate: "2026-07-03",
  });

  assert.equal(metrics.recordedDays, 2);
  assert.equal(metrics.eligibleBirdDays, 1_990);
  assert.equal(metrics.liveBirds, 990);
  assert.equal(metrics.eggGoal, 1_851);
  assert.ok(Math.abs(metrics.layingRate - (1_830 / 1_990) * 100) < Number.EPSILON);
  assert.equal(metrics.layingRateGoal, 93);
});

test("returns live birds and no posture when a flock has no records in the period", () => {
  const metrics = calculateRecordedFlockProductionMetrics({
    flock: { id: "flock-1", birdCount: 100, arrivalAgeWeeks: 40, arrivalDate: "2026-07-01" },
    mortalities: [],
    productionRecords: [],
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  });

  assert.equal(metrics.liveBirds, 100);
  assert.equal(metrics.recordedDays, 0);
  assert.equal(metrics.eligibleBirdDays, 0);
  assert.equal(metrics.layingRate, 0);
  assert.equal(metrics.layingRateGoal, 0);
});

test("ignores production records from dates when the flock was not eligible", () => {
  const metrics = calculateRecordedFlockProductionMetrics({
    flock: { id: "flock-1", birdCount: 1_000, arrivalAgeWeeks: 17, arrivalDate: "2026-07-01" },
    mortalities: [],
    productionRecords: [
      { flockId: "flock-1", date: "2026-07-01", eggsProduced: 500 },
      { flockId: "flock-1", date: "2026-07-08", eggsProduced: 280 },
    ],
    startDate: "2026-07-01",
    endDate: "2026-07-08",
  });

  assert.equal(metrics.recordedDays, 1);
  assert.ok(Math.abs(metrics.layingRate - 28) < Number.EPSILON * 100);
});

test("calculates accumulated posture across every productive day", () => {
  const flock = { id: "flock-1", birdCount: 1_000, arrivalAgeWeeks: 18, arrivalDate: "2026-07-01" };
  const recordedMetrics = calculateRecordedFlockProductionMetrics({
    flock,
    mortalities: [],
    productionRecords: [{ flockId: "flock-1", date: "2026-07-01", eggsProduced: 280 }],
    startDate: "2026-07-01",
    endDate: "2026-07-02",
  });
  const stayMetrics = calculateEggProductionMetrics({
    flocks: [flock],
    mortalities: [],
    startDate: "2026-07-01",
    endDate: "2026-07-02",
    totalEggs: recordedMetrics.totalEggs,
  });

  assert.equal(recordedMetrics.totalEggs, 280);
  assert.ok(Math.abs(stayMetrics.layingRate - 14) < Number.EPSILON * 100);
});

test("labels the approved production phases at their boundaries", () => {
  assert.equal(getProductionPhase(18), "inicio-producao");
  assert.equal(getProductionPhase(22), "subida-producao");
  assert.equal(getProductionPhase(25), "pico");
  assert.equal(getProductionPhase(35), "producao-estavel");
  assert.equal(getProductionPhase(60), "declinio-inicial");
  assert.equal(getProductionPhase(75), "declinio-acentuado");
  assert.equal(getProductionPhase(91), "final-ciclo");
  assert.equal(getProductionPhaseLabel(18), "Início da produção");
  assert.equal(getProductionPhaseLabel(22), "Subida da produção");
  assert.equal(getProductionPhaseLabel(25), "Pico");
  assert.equal(getProductionPhaseLabel(35), "Produção estável");
  assert.equal(getProductionPhaseLabel(60), "Declínio inicial");
  assert.equal(getProductionPhaseLabel(75), "Declínio acentuado");
  assert.equal(getProductionPhaseLabel(91), "Final de ciclo");
});

test("requires confirmation from 150 percent laying rate", () => {
  assert.equal(requiresHighLayingRateConfirmation(149.99), false);
  assert.equal(requiresHighLayingRateConfirmation(150), true);
  assert.equal(requiresHighLayingRateConfirmation(5_065.3), true);
});
