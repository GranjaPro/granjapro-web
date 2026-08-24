import { createClient } from "@/lib/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";

export async function getCustomers(farmId: string, includeArchived = false) {
  const supabase = createClient();
  let query = supabase
    .from("customers")
    .select("*")
    .eq("farm_id", farmId)
    .order("name", { ascending: true });
  if (!includeArchived) query = query.is("archived_at", null);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getCustomer(customerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();
  if (error) throw error;
  return data;
}

export async function createCustomer(customer: TablesInsert<"customers">) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert(customer)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(customerId: string, updates: TablesUpdate<"customers">) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", customerId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveCustomer(customerId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("customers")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", customerId);
  if (error) throw error;
}

export async function restoreCustomer(customerId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("customers")
    .update({ archived_at: null })
    .eq("id", customerId);
  if (error) throw error;
}
