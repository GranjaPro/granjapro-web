import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

export type EquipmentRow = Database["public"]["Tables"]["equipment"]["Row"];
export type EquipmentInsert = Database["public"]["Tables"]["equipment"]["Insert"];
export type EquipmentUpdate = Database["public"]["Tables"]["equipment"]["Update"];

export async function getEquipmentByFarm(farmId: string): Promise<EquipmentRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("farm_id", farmId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createEquipment(record: EquipmentInsert): Promise<EquipmentRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEquipment(id: string, updates: EquipmentUpdate): Promise<EquipmentRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEquipment(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("equipment")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
