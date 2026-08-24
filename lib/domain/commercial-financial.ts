const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type StoredPaymentStatus = "pending" | "paid";
export type SalePaymentState = "paid" | "pending" | "overdue" | "delinquent";

export interface SaleFinancialRecord {
  customerId: string | null;
  date: string;
  dueDate: string;
  paidAt: string | null;
  paymentStatus: StoredPaymentStatus;
  total: number;
}

export interface CommercialFinancialMetrics {
  billed: number;
  received: number;
  receivable: number;
  overdue: number;
  delinquent: number;
}

export interface CustomerCommercialMetrics extends CommercialFinancialMetrics {
  status: SalePaymentState | "inactive";
  lastSaleDate: string | null;
  totalSales: number;
  averageTicket: number;
}

function isInsidePeriod(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

function differenceInCalendarDays(laterDate: string, earlierDate: string): number {
  const later = new Date(`${laterDate}T00:00:00Z`).getTime();
  const earlier = new Date(`${earlierDate}T00:00:00Z`).getTime();
  return Math.floor((later - earlier) / DAY_IN_MILLISECONDS);
}

export function getSalePaymentState(
  sale: SaleFinancialRecord,
  today: string,
  delinquencyDays = 30,
): SalePaymentState {
  if (sale.paymentStatus === "paid") return "paid";
  if (sale.dueDate >= today) return "pending";
  return differenceInCalendarDays(today, sale.dueDate) >= delinquencyDays ? "delinquent" : "overdue";
}

export function calculateCommercialFinancialMetrics(
  sales: SaleFinancialRecord[],
  startDate: string,
  endDate: string,
  today: string,
): CommercialFinancialMetrics {
  return sales.reduce<CommercialFinancialMetrics>((metrics, sale) => {
    if (isInsidePeriod(sale.date, startDate, endDate)) {
      metrics.billed += sale.total;
      const state = getSalePaymentState(sale, today);
      if (state === "pending") metrics.receivable += sale.total;
      if (state === "overdue") metrics.overdue += sale.total;
      if (state === "delinquent") metrics.delinquent += sale.total;
    }
    if (sale.paidAt && isInsidePeriod(sale.paidAt, startDate, endDate)) {
      metrics.received += sale.total;
    }
    return metrics;
  }, { billed: 0, received: 0, receivable: 0, overdue: 0, delinquent: 0 });
}

export function calculateCustomerCommercialMetrics(
  sales: SaleFinancialRecord[],
  startDate: string,
  endDate: string,
  today: string,
): CustomerCommercialMetrics {
  const periodMetrics = calculateCommercialFinancialMetrics(sales, startDate, endDate, today);
  const total = sales.reduce((sum, sale) => sum + sale.total, 0);
  const states = sales.map((sale) => getSalePaymentState(sale, today));
  const status: CustomerCommercialMetrics["status"] = states.includes("delinquent")
    ? "delinquent"
    : states.includes("overdue")
      ? "overdue"
      : states.includes("pending")
        ? "pending"
        : states.length > 0
          ? "paid"
          : "inactive";

  return {
    ...periodMetrics,
    status,
    lastSaleDate: sales.reduce<string | null>((latest, sale) => !latest || sale.date > latest ? sale.date : latest, null),
    totalSales: sales.length,
    averageTicket: sales.length > 0 ? total / sales.length : 0,
  };
}
