import { createClient } from "@/lib/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";

export async function getSales(farmId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*, customers(name)")
    .eq("farm_id", farmId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getSalesByDateRange(farmId: string, startDate: string, endDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*, customers(name)")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createSale(sale: TablesInsert<"sales">) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .insert(sale)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSale(saleId: string, updates: TablesUpdate<"sales">) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sales")
    .update(updates)
    .eq("id", saleId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSale(saleId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("sales")
    .delete()
    .eq("id", saleId);
  if (error) throw error;
}
