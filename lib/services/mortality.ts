import { createClient } from "@/lib/supabase/client";

export async function getTodayMortality(farmId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("mortality")
    .select("*")
    .eq("farm_id", farmId)
    .eq("date", today)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMortalityByDateRange(farmId: string, startDate: string, endDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mortality")
    .select("*")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createMortalityRecord(record: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mortality")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMortalityRecord(recordId: string, updates: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("mortality")
    .update(updates)
    .eq("id", recordId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMortalityRecord(recordId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("mortality")
    .delete()
    .eq("id", recordId);
  if (error) throw error;
}
