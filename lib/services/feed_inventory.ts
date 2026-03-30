import { createClient } from "@/lib/supabase/client";

export async function getFeedInventory(farmId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feed_inventory")
    .select("*")
    .eq("farm_id", farmId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createInventoryItem(record: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feed_inventory")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInventoryItem(id: string, updates: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feed_inventory")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInventoryItem(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("feed_inventory")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
