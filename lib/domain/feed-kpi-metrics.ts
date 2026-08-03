import {
  calculateEggProductionMetrics,
  calculateLiveBirdsAtDate,
  type FlockMortality,
  type ProductiveFlock,
} from "./egg-production-metrics.ts";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export interface FeedMetricRecord {
  date: string;
  flockId: string | null;
  quantityKg: number;
}

export interface ProductionMetricRecord {
  date: string;
  flockId: string | null;
  eggsProduced: number;
}

export interface FeedStockItem {
  inventoryTable: string;
  quantity: number;
  unit: string;
}

interface FeedKpiMetricInput {
  flocks: ProductiveFlock[];
  mortalities: FlockMortality[];
  feedRecords: FeedMetricRecord[];
  productionRecords: ProductionMetricRecord[];
  startDate: string;
  endDate: string;
  targetFeedGramsPerBird: number;
}

interface FeedStockMetricInput {
  activeFlocks: ProductiveFlock[];
  mortalities: FlockMortality[];
  inventory: FeedStockItem[];
  currentDate: string;
  targetFeedGramsPerBird: number;
}

function recordKey(flockId: string, date: string): string {
  return `${flockId}:${date}`;
}

function countCalendarDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (end < start) throw new Error("A data final deve ser igual ou posterior à data inicial.");
  return Math.floor((end - start) / DAY_IN_MILLISECONDS) + 1;
}

function aggregateByFlockDate<T>(
  records: T[],
  getFlockId: (record: T) => string | null,
  getDate: (record: T) => string,
  getValue: (record: T) => number,
): Map<string, number> {
  const totals = new Map<string, number>();
  records.forEach((record) => {
    const flockId = getFlockId(record);
    if (!flockId) return;
    const key = recordKey(flockId, getDate(record));
    totals.set(key, (totals.get(key) ?? 0) + getValue(record));
  });
  return totals;
}

function getTargetForFlockDate(
  flock: ProductiveFlock,
  mortalities: FlockMortality[],
  date: string,
) {
  return calculateEggProductionMetrics({
    flocks: [flock],
    mortalities,
    startDate: date,
    endDate: date,
    totalEggs: 0,
  }).dailyTargets[0];
}

export function calculateFeedKpiMetrics({
  flocks,
  mortalities,
  feedRecords,
  productionRecords,
  startDate,
  endDate,
  targetFeedGramsPerBird,
}: FeedKpiMetricInput) {
  const flocksById = new Map(flocks.map((flock) => [flock.id, flock]));
  const feedByPair = aggregateByFlockDate(feedRecords, (record) => record.flockId, (record) => record.date, (record) => record.quantityKg);
  const eggsByPair = aggregateByFlockDate(productionRecords, (record) => record.flockId, (record) => record.date, (record) => record.eggsProduced);
  const productionDates = new Set<string>();
  let totalEggs = 0;
  let totalEggGoal = 0;
  let productionPairCount = 0;
  let comparableFeedKg = 0;
  let comparableEggs = 0;
  let comparableExpectedFeedKg = 0;
  let comparableExpectedEggs = 0;
  let comparablePairCount = 0;
  const comparableDates = new Set<string>();

  eggsByPair.forEach((eggs, key) => {
    const separatorIndex = key.lastIndexOf(":");
    const flockId = key.slice(0, separatorIndex);
    const date = key.slice(separatorIndex + 1);
    const flock = flocksById.get(flockId);
    if (!flock) return;

    const target = getTargetForFlockDate(flock, mortalities, date);
    totalEggs += eggs;
    totalEggGoal += target.eggGoal;
    productionPairCount += 1;
    productionDates.add(date);

    const feedKg = feedByPair.get(key);
    if (feedKg === undefined || eggs <= 0 || target.eggGoal <= 0) return;
    comparableFeedKg += feedKg;
    comparableEggs += eggs;
    comparableExpectedFeedKg += target.eligibleBirds * (targetFeedGramsPerBird / 1000);
    comparableExpectedEggs += target.eggGoal;
    comparablePairCount += 1;
    comparableDates.add(date);
  });

  const registeredProductionDays = productionDates.size;
  const productionAverage = registeredProductionDays > 0 ? totalEggs / registeredProductionDays : 0;
  const productionGoalAverage = registeredProductionDays > 0 ? totalEggGoal / registeredProductionDays : 0;
  const efficiencyKgPerEgg = comparableEggs > 0 ? comparableFeedKg / comparableEggs : 0;
  const idealEfficiencyKgPerEgg = comparableExpectedEggs > 0 ? comparableExpectedFeedKg / comparableExpectedEggs : 0;

  return {
    productionAverage,
    productionGoalAverage,
    productionPerformancePercent: productionGoalAverage > 0 ? (productionAverage / productionGoalAverage) * 100 : 0,
    registeredProductionDays,
    productionPairCount,
    totalPeriodDays: countCalendarDays(startDate, endDate),
    efficiencyKgPerEgg,
    idealEfficiencyKgPerEgg,
    comparableDays: comparableDates.size,
    comparablePairCount,
  };
}

function convertStockToKg(item: FeedStockItem): number {
  const unit = item.unit.toLowerCase();
  if (unit === "kg") return item.quantity;
  if (unit === "g") return item.quantity / 1000;
  return 0;
}

export function calculateFeedStockMetrics({
  activeFlocks,
  mortalities,
  inventory,
  currentDate,
  targetFeedGramsPerBird,
}: FeedStockMetricInput) {
  const stockKg = inventory
    .filter((item) => item.inventoryTable === "feed")
    .reduce((total, item) => total + convertStockToKg(item), 0);
  const liveBirds = calculateLiveBirdsAtDate(activeFlocks, mortalities, currentDate);
  const dailyNeedKg = liveBirds * (targetFeedGramsPerBird / 1000);

  return {
    stockKg,
    liveBirds,
    dailyNeedKg,
    coverageDays: dailyNeedKg > 0 ? Math.floor(stockKg / dailyNeedKg) : 0,
  };
}
