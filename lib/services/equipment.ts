import { createClient } from "@/lib/supabase/client";

export async function getEquipmentByFarm(farmId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("farm_id", farmId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createEquipment(record: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEquipment(id: string, updates: Record<string, any>) {
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

export async function deleteEquipment(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("equipment")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
