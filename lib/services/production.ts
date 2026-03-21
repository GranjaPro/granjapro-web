import { createClient } from "@/lib/supabase/client";

export async function getTodayProduction(farmId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("egg_production")
    .select("*")
    .eq("farm_id", farmId)
    .eq("date", today)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProductionByDateRange(farmId: string, startDate: string, endDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("egg_production")
    .select("*")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getProductionTrend(farmId: string, days: number = 7) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return getProductionByDateRange(farmId, startDate.toISOString().split("T")[0], endDate.toISOString().split("T")[0]);
}

export async function createProduction(record: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("egg_production")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduction(recordId: string, updates: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("egg_production")
    .update(updates)
    .eq("id", recordId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduction(recordId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("egg_production")
    .delete()
    .eq("id", recordId);
  if (error) throw error;
}
