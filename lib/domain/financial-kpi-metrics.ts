import {
  calculateEggProductionMetrics,
  type FlockMortality,
  type ProductiveFlock,
} from "./egg-production-metrics.ts";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export interface FinancialProductionRecord {
  date: string;
  eggsProduced: number;
  brokenEggs: number;
  dirtyEggs: number;
  discardedEggs: number;
}

export interface FinancialFeedRecord {
  date: string;
  flockId: string | null;
  quantityKg: number;
  cost: number;
}

export interface FinancialTransactionRecord {
  date: string;
  type: "revenue" | "expense";
  category: string;
  amount: number;
}

export interface FinancialEggRecord {
  date: string;
  flockId: string | null;
  eggsProduced: number;
}

export interface FinancialSaleRecord {
  date: string;
  quantity: number;
  total: number;
}

interface ProductionFinancialMetricInput {
  productionRecords: FinancialProductionRecord[];
  feedRecords: FinancialFeedRecord[];
  transactions: FinancialTransactionRecord[];
  startDate: string;
  endDate: string;
  productiveBirdDays: number;
  efficiencyKgPerEgg?: number;
  latestSalePricePerDozen?: number;
}

interface FeedFinancialMetricInput {
  flocks: ProductiveFlock[];
  mortalities: FlockMortality[];
  feedRecords: FinancialFeedRecord[];
  productionRecords: FinancialEggRecord[];
  startDate: string;
  endDate: string;
}

function isInsidePeriod(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

function countCalendarDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (end < start) throw new Error("A data final deve ser igual ou posterior à data inicial.");
  return Math.floor((end - start) / DAY_IN_MILLISECONDS) + 1;
}

function flockDateKey(flockId: string, date: string): string {
  return `${flockId}:${date}`;
}

export function calculateProductionFinancialMetrics({
  productionRecords,
  feedRecords,
  transactions,
  startDate,
  endDate,
  productiveBirdDays,
  efficiencyKgPerEgg,
  latestSalePricePerDozen,
}: ProductionFinancialMetricInput) {
  const periodProduction = productionRecords.filter((record) => isInsidePeriod(record.date, startDate, endDate));
  const periodFeed = feedRecords.filter((record) => isInsidePeriod(record.date, startDate, endDate));
  const periodTransactions = transactions.filter((record) => isInsidePeriod(record.date, startDate, endDate));
  const elapsedDays = countCalendarDays(startDate, endDate);

  const productionTotals = periodProduction.reduce((totals, record) => ({
    eggsProduced: totals.eggsProduced + record.eggsProduced,
    lostEggs: totals.lostEggs + record.brokenEggs + record.dirtyEggs + record.discardedEggs,
  }), { eggsProduced: 0, lostEggs: 0 });
  const commercialEggs = Math.max(productionTotals.eggsProduced - productionTotals.lostEggs, 0);
  const consumedFeedCost = periodFeed.reduce((sum, record) => sum + record.cost, 0);
  const nonFeedExpenses = periodTransactions
    .filter((transaction) => transaction.type === "expense" && transaction.category !== "feed")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const revenue = periodTransactions
    .filter((transaction) => transaction.type === "revenue")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const operatingCost = consumedFeedCost + nonFeedExpenses;
  const latestPricePerEgg = latestSalePricePerDozen !== undefined ? latestSalePricePerDozen / 12 : undefined;

  return {
    commercialEggs,
    operatingCost,
    revenue,
    costPerCommercialEgg: commercialEggs > 0 ? operatingCost / commercialEggs : undefined,
    operatingMarginPercent: revenue > 0 ? ((revenue - operatingCost) / revenue) * 100 : undefined,
    revenuePerDay: revenue / elapsedDays,
    efficiencyKgPerEgg,
    revenuePerProductiveBirdDay: productiveBirdDays > 0 ? revenue / productiveBirdDays : undefined,
    lostEggsPerDay: productionTotals.lostEggs / elapsedDays,
    lossValuePerDay: latestPricePerEgg !== undefined
      ? (productionTotals.lostEggs * latestPricePerEgg) / elapsedDays
      : undefined,
    lostEggs: productionTotals.lostEggs,
    elapsedDays,
  };
}

export function calculateFeedFinancialMetrics({
  flocks,
  mortalities,
  feedRecords,
  productionRecords,
  startDate,
  endDate,
}: FeedFinancialMetricInput) {
  const flocksById = new Map(flocks.map((flock) => [flock.id, flock]));
  const feedByFlockDate = new Map<string, { quantityKg: number; cost: number }>();
  const eggsByFlockDate = new Map<string, number>();

  feedRecords.forEach((record) => {
    if (!record.flockId || !isInsidePeriod(record.date, startDate, endDate)) return;
    const key = flockDateKey(record.flockId, record.date);
    const current = feedByFlockDate.get(key) ?? { quantityKg: 0, cost: 0 };
    feedByFlockDate.set(key, {
      quantityKg: current.quantityKg + record.quantityKg,
      cost: current.cost + record.cost,
    });
  });
  productionRecords.forEach((record) => {
    if (!record.flockId || !isInsidePeriod(record.date, startDate, endDate)) return;
    const key = flockDateKey(record.flockId, record.date);
    eggsByFlockDate.set(key, (eggsByFlockDate.get(key) ?? 0) + record.eggsProduced);
  });

  const periodFeed = feedRecords.filter((record) => isInsidePeriod(record.date, startDate, endDate));
  const totalFeedKg = periodFeed.reduce((sum, record) => sum + record.quantityKg, 0);
  const totalFeedCost = periodFeed.reduce((sum, record) => sum + record.cost, 0);
  let comparableFeedCost = 0;
  let comparableEggs = 0;
  let comparableBirdDays = 0;

  eggsByFlockDate.forEach((eggs, key) => {
    const feed = feedByFlockDate.get(key);
    if (!feed || eggs <= 0) return;
    const separatorIndex = key.lastIndexOf(":");
    const flockId = key.slice(0, separatorIndex);
    const date = key.slice(separatorIndex + 1);
    const flock = flocksById.get(flockId);
    if (!flock) return;
    const target = calculateEggProductionMetrics({
      flocks: [flock],
      mortalities,
      startDate: date,
      endDate: date,
      totalEggs: 0,
    }).dailyTargets[0];
    if (!target || target.eligibleBirds <= 0) return;

    comparableFeedCost += feed.cost;
    comparableEggs += eggs;
    comparableBirdDays += target.eligibleBirds;
  });

  const costPerEgg = comparableEggs > 0 ? comparableFeedCost / comparableEggs : undefined;
  return {
    totalFeedKg,
    totalFeedCost,
    costPerKg: totalFeedKg > 0 ? totalFeedCost / totalFeedKg : undefined,
    costPerEgg,
    costPerDozen: costPerEgg !== undefined ? costPerEgg * 12 : undefined,
    costPerBirdDay: comparableBirdDays > 0 ? comparableFeedCost / comparableBirdDays : undefined,
    comparableEggs,
    comparableBirdDays,
  };
}

export function calculateSalesFinancialMetrics(sales: FinancialSaleRecord[]) {
  const dozensSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const salesRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

  return {
    dozensSold,
    salesRevenue,
    averagePricePerDozen: dozensSold > 0 ? salesRevenue / dozensSold : undefined,
  };
}

export function groupMonthlySalesMetrics(sales: FinancialSaleRecord[]) {
  const monthly = new Map<string, FinancialSaleRecord[]>();

  sales.forEach((sale) => {
    const month = sale.date.slice(0, 7);
    const current = monthly.get(month) ?? [];
    current.push(sale);
    monthly.set(month, current);
  });

  return Array.from(monthly.entries())
    .map(([month, records]) => ({ month, ...calculateSalesFinancialMetrics(records) }))
    .sort((left, right) => left.month.localeCompare(right.month));
}

export function getSixMonthDateRange(endDate: string) {
  const end = new Date(`${endDate}T00:00:00Z`);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 5, 1));
  return { startDate: start.toISOString().slice(0, 10), endDate };
}
