import { createClient } from "@/lib/supabase/client";

export async function getFlocks(farmId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("flocks")
    .select("*, barns(name)")
    .eq("farm_id", farmId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getFlock(flockId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("flocks")
    .select("*, barns(name)")
    .eq("id", flockId)
    .single();
  if (error) throw error;
  return data;
}

export async function createFlock(flock: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("flocks")
    .insert(flock)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFlock(flockId: string, updates: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("flocks")
    .update(updates)
    .eq("id", flockId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFlock(flockId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("flocks")
    .delete()
    .eq("id", flockId);
  if (error) throw error;
}
