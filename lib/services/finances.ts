import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import { transactionCategories, type TransactionCategoryKey } from "@/lib/constants/transaction-categories";
import { parsePositiveAmount } from "@/lib/domain/financial-transaction";
import { calculateCommercialFinancialMetrics, type CommercialFinancialMetrics } from "@/lib/domain/commercial-financial";
import { getSalesByDateRange } from "@/lib/services/sales";

export type FinancialTransaction = Tables<"financial_transactions">;
export type FinancialTransactionInsert = TablesInsert<"financial_transactions">;
export type FinancialTransactionUpdate = TablesUpdate<"financial_transactions">;

export interface FinancialSummaryData {
  revenue: number;
  expenses: number;
  profit: number;
  categoryTotals: Record<TransactionCategoryKey, number>;
}

export interface IntegratedFinancialSummary extends CommercialFinancialMetrics {
  expenses: number;
  cashResult: number;
}

export async function getMonthlyFinancials(farmId: string, year?: number, month?: number) {
  const supabase = createClient();
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = new Date(y, m, 0).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getFinancialSummary(farmId: string, year?: number, month?: number) {
  const transactions = await getMonthlyFinancials(farmId, year, month);

  const revenue = transactions
    .filter((t: FinancialTransaction) => t.type === "revenue")
    .reduce((sum: number, t: FinancialTransaction) => sum + Number(t.amount), 0);

  const expenses = transactions
    .filter((t: FinancialTransaction) => t.type === "expense")
    .reduce((sum: number, t: FinancialTransaction) => sum + Number(t.amount), 0);

  const feedCost = transactions
    .filter((t: FinancialTransaction) => t.type === "expense" && t.category === "feed")
    .reduce((sum: number, t: FinancialTransaction) => sum + Number(t.amount), 0);

  const laborCost = transactions
    .filter((t: FinancialTransaction) => t.type === "expense" && t.category === "labor")
    .reduce((sum: number, t: FinancialTransaction) => sum + Number(t.amount), 0);

  return {
    revenue,
    expenses,
    profit: revenue - expenses,
    feedCost,
    laborCost,
    otherExpenses: expenses - feedCost - laborCost,
  };
}

export async function getFinancialSummaryInRange(
  farmId: string,
  startDate: string,
  endDate: string
): Promise<FinancialSummaryData> {
  const transactions = await getTransactionsByDateRange(farmId, startDate, endDate);

  const revenue = transactions
    .filter((t) => t.type === "revenue")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Initialize category totals with 0 for all keys
  const categoryTotals = Object.keys(transactionCategories).reduce((acc, key) => {
    acc[key as TransactionCategoryKey] = 0;
    return acc;
  }, {} as Record<TransactionCategoryKey, number>);

  // Populate totals from transactions
  transactions.forEach((t) => {
    if (t.type === "expense" && t.category in categoryTotals) {
      categoryTotals[t.category as TransactionCategoryKey] += Number(t.amount);
    }
  });

  return {
    revenue,
    expenses,
    profit: revenue - expenses,
    categoryTotals,
  };
}

export async function getIntegratedFinancialSummary(
  farmId: string,
  startDate: string,
  endDate: string,
  today: string,
): Promise<IntegratedFinancialSummary> {
  const [summary, sales] = await Promise.all([
    getFinancialSummaryInRange(farmId, startDate, endDate),
    getSalesByDateRange(farmId, startDate, endDate),
  ]);
  const commercial = calculateCommercialFinancialMetrics(sales.map((sale) => ({
    customerId: sale.customer_id,
    date: sale.date,
    dueDate: sale.due_date,
    paidAt: sale.paid_at,
    paymentStatus: sale.payment_status,
    total: Number(sale.total),
  })), startDate, endDate, today);

  return {
    ...commercial,
    received: summary.revenue,
    expenses: summary.expenses,
    cashResult: summary.revenue - summary.expenses,
  };
}

export async function getTransactionsByDateRange(
  farmId: string,
  startDate: string,
  endDate: string
): Promise<FinancialTransaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function assertValidAmount(amount: number): void {
  const result = parsePositiveAmount(String(amount));
  if (!result.valid) throw new Error(result.message);
}

export async function createTransaction(record: FinancialTransactionInsert) {
  assertValidAmount(record.amount);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("financial_transactions")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(recordId: string, updates: FinancialTransactionUpdate) {
  if (updates.amount !== undefined) assertValidAmount(updates.amount);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("financial_transactions")
    .update(updates)
    .eq("id", recordId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(recordId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("financial_transactions")
    .delete()
    .eq("id", recordId);
  if (error) throw error;
}
