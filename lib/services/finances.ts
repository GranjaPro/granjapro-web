import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { transactionCategories, type TransactionCategoryKey } from "@/lib/constants/transaction-categories";

export type FinancialTransaction = Tables<"financial_transactions">;

export interface FinancialSummaryData {
  revenue: number;
  expenses: number;
  profit: number;
  revenueGoal: number;
  categoryTotals: Record<TransactionCategoryKey, number>;
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
    revenueGoal: 20000, // Temporarily hardcoded as per dashboard Meta
    categoryTotals,
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

export async function createTransaction(record: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("financial_transactions")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(recordId: string, updates: Record<string, any>) {
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

export async function createRevenueFromSale(
  farmId: string,
  saleId: string,
  date: string,
  amount: number,
  description: string
): Promise<FinancialTransaction | null> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("financial_transactions")
    .select("id")
    .eq("farm_id", farmId)
    .eq("reference", `sale:${saleId}`)
    .maybeSingle();

  if (existing) return null;

  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      farm_id: farmId,
      date,
      type: "revenue",
      category: "sales",
      description,
      amount,
      reference: `sale:${saleId}`,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
