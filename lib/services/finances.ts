import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";

type FinancialTransaction = Tables<"financial_transactions">;

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
