import { createClient } from "@/lib/supabase/client";

export async function getFarm(farmId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("farms")
    .select("*")
    .eq("id", farmId)
    .single();
  if (error) throw error;
  return data;
}

export async function getUserFarm() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("farm_id")
    .eq("id", user.id)
    .single();

  if (profile?.farm_id) {
    return getFarm(profile.farm_id);
  }

  const { data, error } = await supabase
    .from("farms")
    .select("*")
    .eq("owner_id", user.id)
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

export async function createFarm(farm: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("farms")
    .insert(farm)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getFarmBirdCount(farmId: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("barns")
    .select("current_birds")
    .eq("farm_id", farmId);

  if (error) throw error;
  return data?.reduce((sum, barn) => sum + (barn.current_birds ?? 0), 0) ?? 0;
}

export async function updateFarm(farmId: string, updates: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("farms")
    .update(updates)
    .eq("id", farmId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
