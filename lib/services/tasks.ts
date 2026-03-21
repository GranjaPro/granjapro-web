import { createClient } from "@/lib/supabase/client";

export async function getTodayTasks(farmId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("farm_id", farmId)
    .eq("date", today)
    .order("scheduled_time", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getTasksByDate(farmId: string, date: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("farm_id", farmId)
    .eq("date", date)
    .order("scheduled_time", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createTask(task: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert(task)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(taskId: string, updates: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleTask(taskId: string, done: boolean) {
  return updateTask(taskId, { done });
}

export async function deleteTask(taskId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);
  if (error) throw error;
}
