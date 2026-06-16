import { createClient } from "@/lib/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";

type HealthRecordInsert = TablesInsert<"health_records">;
type HealthRecordUpdate = TablesUpdate<"health_records">;
type DailyInspectionInsert = TablesInsert<"daily_inspections">;
type DailyInspectionUpdate = TablesUpdate<"daily_inspections">;

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

export async function getDailyInspections(farmId: string, startDate: string, endDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_inspections")
    .select("*, flocks(code)")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createDailyInspection(inspection: DailyInspectionInsert) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_inspections")
    .insert(inspection)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDailyInspection(id: string, updates: DailyInspectionUpdate) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_inspections")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDailyInspection(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("daily_inspections")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function createHealthRecord(record: HealthRecordInsert) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("health_records")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateHealthRecord(recordId: string, updates: HealthRecordUpdate) {
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
