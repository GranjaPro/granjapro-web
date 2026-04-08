import { createClient } from "@/lib/supabase/client";

export async function getTodayFeed(farmId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("feed_consumption")
    .select("*, barns(name)")
    .eq("farm_id", farmId)
    .eq("date", today)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getFeedByDateRange(farmId: string, startDate: string, endDate: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feed_consumption")
    .select("*, barns(name)")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createFeedRecord(record: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feed_consumption")
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFeedRecord(recordId: string, updates: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feed_consumption")
    .update(updates)
    .eq("id", recordId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFeedRecord(recordId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("feed_consumption")
    .delete()
    .eq("id", recordId);
  if (error) throw error;
}
