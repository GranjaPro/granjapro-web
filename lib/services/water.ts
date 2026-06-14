import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

export type WaterConsumptionRow = Database["public"]["Tables"]["water_consumption"]["Row"];
export type WaterConsumptionInsert = Database["public"]["Tables"]["water_consumption"]["Insert"];
export type WaterConsumptionUpdate = Database["public"]["Tables"]["water_consumption"]["Update"];

export async function getWaterByDateRange(
  farmId: string,
  startDate: string,
  endDate: string
): Promise<WaterConsumptionRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("water_consumption")
    .select("*")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getWaterByFlock(farmId: string, flockId: string): Promise<WaterConsumptionRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("water_consumption")
    .select("*")
    .eq("farm_id", farmId)
    .eq("flock_id", flockId)
    .order("date", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createWaterRecord(record: WaterConsumptionInsert): Promise<WaterConsumptionRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("water_consumption")
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWaterRecord(
  id: string,
  updates: WaterConsumptionUpdate
): Promise<WaterConsumptionRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("water_consumption")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWaterRecord(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("water_consumption").delete().eq("id", id);

  if (error) throw error;
}
