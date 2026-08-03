import type { Tables } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";

export interface FeedConsumptionStockInput {
  farmId: string;
  date: string;
  barnId: string | null;
  flockId: string | null;
  feedInventoryId: string;
  quantityKg: number;
}

export type FeedConsumptionRow = Tables<"feed_consumption">;

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

export async function createFeedRecord(input: FeedConsumptionStockInput): Promise<FeedConsumptionRow> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_feed_consumption_with_stock", {
    p_farm_id: input.farmId,
    p_date: input.date,
    p_barn_id: input.barnId,
    p_flock_id: input.flockId,
    p_feed_inventory_id: input.feedInventoryId,
    p_quantity_kg: input.quantityKg,
  });
  if (error) throw error;
  return data;
}

export async function updateFeedRecord(recordId: string, input: FeedConsumptionStockInput): Promise<FeedConsumptionRow> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("update_feed_consumption_with_stock", {
    p_record_id: recordId,
    p_date: input.date,
    p_barn_id: input.barnId,
    p_flock_id: input.flockId,
    p_feed_inventory_id: input.feedInventoryId,
    p_quantity_kg: input.quantityKg,
  });
  if (error) throw error;
  return data;
}

export async function deleteFeedRecord(recordId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_feed_consumption_with_stock", { p_record_id: recordId });
  if (error) throw error;
}
