import { createClient } from "@/lib/supabase/client";

function isMissingFeedInventoryTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.includes("Could not find the table 'public.feed_inventory'") === true
  );
}

export async function getFeedInventory(farmId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feed_inventory")
    .select("*")
    .eq("farm_id", farmId)
    .order("name", { ascending: true });
  if (error) {
    if (isMissingFeedInventoryTable(error)) return [];
    throw error;
  }
  return data;
}

export async function createInventoryItem(record: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feed_inventory")
    .insert(record)
    .select()
    .single();
  if (error) {
    if (isMissingFeedInventoryTable(error)) {
      throw new Error("O estoque de ração ainda não está disponível no banco deste projeto.");
    }
    throw error;
  }
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
  if (error) {
    if (isMissingFeedInventoryTable(error)) {
      throw new Error("O estoque de ração ainda não está disponível no banco deste projeto.");
    }
    throw error;
  }
  return data;
}

export async function deleteInventoryItem(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("feed_inventory")
    .delete()
    .eq("id", id);
  if (error) {
    if (isMissingFeedInventoryTable(error)) {
      throw new Error("O estoque de ração ainda não está disponível no banco deste projeto.");
    }
    throw error;
  }
}
