import { createClient } from "@/lib/supabase/client";

export async function getAlerts(farmId: string, onlyUnread = false) {
  const supabase = createClient();
  let query = supabase
    .from("alerts")
    .select("*")
    .eq("farm_id", farmId)
    .order("created_at", { ascending: false });

  if (onlyUnread) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getUnreadAlertCount(farmId: string) {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function createAlert(alert: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("alerts")
    .insert(alert)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markAlertAsRead(alertId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("alerts")
    .update({ read: true })
    .eq("id", alertId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markAllAlertsAsRead(farmId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("alerts")
    .update({ read: true })
    .eq("farm_id", farmId)
    .eq("read", false);
  if (error) throw error;
}

export async function resolveAlert(alertId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("alerts")
    .update({ resolved: true, read: true })
    .eq("id", alertId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
