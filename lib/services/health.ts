import { createClient } from "@/lib/supabase/client";

export async function getHealthRecords(farmId: string, startDate: string, endDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("health_records")
    .select("*, flocks(code)")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getVaccineSchedule(farmId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("health_records")
    .select("*, flocks(code)")
    .eq("farm_id", farmId)
    .eq("type", "vaccination")
    .in("status", ["scheduled", "upcoming"])
    .order("date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createHealthRecord(record: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("health_records")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateHealthRecord(recordId: string, updates: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("health_records")
    .update(updates)
    .eq("id", recordId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHealthRecord(recordId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("health_records")
    .delete()
    .eq("id", recordId);
  if (error) throw error;
}
