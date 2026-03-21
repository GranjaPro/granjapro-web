import { createClient } from "@/lib/supabase/client";

export async function getCustomers(farmId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("farm_id", farmId)
    .order("name", { ascending: true });
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

export async function createCustomer(customer: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert(customer)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(customerId: string, updates: Record<string, any>) {
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

export async function deleteCustomer(customerId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId);
  if (error) throw error;
}
