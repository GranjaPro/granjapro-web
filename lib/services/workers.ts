import { createClient } from "@/lib/supabase/client";

export async function getWorkers(farmId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .eq("farm_id", farmId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createWorker(record: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workers")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorker(id: string, updates: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorker(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("workers")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
