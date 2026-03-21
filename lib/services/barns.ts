import { createClient } from "@/lib/supabase/client";

export async function getBarns(farmId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("barns")
    .select("*")
    .eq("farm_id", farmId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getBarn(barnId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("barns")
    .select("*")
    .eq("id", barnId)
    .single();
  if (error) throw error;
  return data;
}

export async function createBarn(barn: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("barns")
    .insert(barn)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBarn(barnId: string, updates: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("barns")
    .update(updates)
    .eq("id", barnId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBarn(barnId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("barns")
    .delete()
    .eq("id", barnId);
  if (error) throw error;
}
