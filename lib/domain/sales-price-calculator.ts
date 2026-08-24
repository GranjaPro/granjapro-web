export type SalesPriceUnit = "duzia" | "unidade" | "bandeja";

export interface SalesPriceTransaction {
  date: string;
  type: "revenue" | "expense";
  category: string;
  amount: number;
}

export interface SalesPriceProductionRecord {
  date: string;
  eggsProduced: number;
}

export interface SalesPriceSaleRecord {
  date: string;
  quantity: number;
  total: number;
}

export type InsufficientDataReason =
  | "missing-production"
  | "zero-production"
  | "missing-expenses";

interface SalesPriceCalculatorInput {
  transactions: SalesPriceTransaction[];
  productionRecords: SalesPriceProductionRecord[];
  sales: SalesPriceSaleRecord[];
  startDate: string;
  endDate: string;
  desiredMarginPercentage: number;
  unit: SalesPriceUnit;
}

export interface UnavailableSalesPriceCalculatorResult {
  status: "unavailable";
  reasons: InsufficientDataReason[];
}

export interface ReadySalesPriceCalculatorResult {
  status: "ready";
  eggsProduced: number;
  producedDozens: number;
  totalExpenses: number;
  feedExpenses: number;
  costPerDozen: number;
  costPerUnit: number;
  costPerTray: number;
  feedCostPerEgg: number | undefined;
  selectedCost: number;
  currentPrice: number | undefined;
  currentMarginPercentage: number | undefined;
  suggestedPrice: number;
  suggestedProfit: number;
  requiredAdjustment: number | undefined;
  revenueImpact: number | undefined;
}

export type SalesPriceCalculatorResult =
  | UnavailableSalesPriceCalculatorResult
  | ReadySalesPriceCalculatorResult;

function isInsidePeriod(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

function convertFromDozen(value: number, unit: SalesPriceUnit): number {
  if (unit === "unidade") return value / 12;
  if (unit === "bandeja") return (value / 12) * 30;
  return value;
}

export function calculateSalesPriceCalculator({
  transactions,
  productionRecords,
  sales,
  startDate,
  endDate,
  desiredMarginPercentage,
  unit,
}: SalesPriceCalculatorInput): SalesPriceCalculatorResult {
  if (endDate < startDate) {
    throw new Error("A data final deve ser igual ou posterior à data inicial.");
  }
  if (desiredMarginPercentage < 0 || desiredMarginPercentage >= 100) {
    throw new Error("A margem desejada deve estar entre 0% e menos de 100%.");
  }

  const periodProduction = productionRecords.filter((record) =>
    isInsidePeriod(record.date, startDate, endDate),
  );
  const eggsProduced = periodProduction.reduce(
    (sum, record) => sum + record.eggsProduced,
    0,
  );
  const periodExpenses = transactions.filter(
    (transaction) =>
      transaction.type === "expense" &&
      isInsidePeriod(transaction.date, startDate, endDate),
  );
  const totalExpenses = periodExpenses.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  const reasons: InsufficientDataReason[] = [];
  if (periodProduction.length === 0) reasons.push("missing-production");
  else if (eggsProduced <= 0) reasons.push("zero-production");
  if (totalExpenses <= 0) reasons.push("missing-expenses");
  if (reasons.length > 0) return { status: "unavailable", reasons };

  const producedDozens = eggsProduced / 12;
  const costPerDozen = totalExpenses / producedDozens;
  const costPerUnit = costPerDozen / 12;
  const costPerTray = costPerUnit * 30;
  const feedTransactions = periodExpenses.filter(
    (transaction) => transaction.category === "feed",
  );
  const feedExpenses = feedTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );
  const feedCostPerEgg = feedTransactions.length > 0
    ? feedExpenses / eggsProduced
    : undefined;

  const periodSales = sales.filter((sale) =>
    isInsidePeriod(sale.date, startDate, endDate),
  );
  const dozensSold = periodSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const salesRevenue = periodSales.reduce((sum, sale) => sum + sale.total, 0);
  const currentPricePerDozen = dozensSold > 0 ? salesRevenue / dozensSold : undefined;
  const currentPrice = currentPricePerDozen !== undefined
    ? convertFromDozen(currentPricePerDozen, unit)
    : undefined;
  const selectedCost = convertFromDozen(costPerDozen, unit);
  const suggestedPrice = selectedCost / (1 - desiredMarginPercentage / 100);
  const suggestedProfit = suggestedPrice - selectedCost;
  const currentMarginPercentage = currentPrice !== undefined && currentPrice > 0
    ? ((currentPrice - selectedCost) / currentPrice) * 100
    : undefined;
  const requiredAdjustment = currentPrice !== undefined
    ? suggestedPrice - currentPrice
    : undefined;
  const suggestedPricePerDozen = costPerDozen / (1 - desiredMarginPercentage / 100);
  const revenueImpact = currentPricePerDozen !== undefined
    ? (suggestedPricePerDozen - currentPricePerDozen) * dozensSold
    : undefined;

  return {
    status: "ready",
    eggsProduced,
    producedDozens,
    totalExpenses,
    feedExpenses,
    costPerDozen,
    costPerUnit,
    costPerTray,
    feedCostPerEgg,
    selectedCost,
    currentPrice,
    currentMarginPercentage,
    suggestedPrice,
    suggestedProfit,
    requiredAdjustment,
    revenueImpact,
  };
}
