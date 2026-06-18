import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
export type TaskExceptionRow = Database["public"]["Tables"]["task_exceptions"]["Row"];
export type TaskExceptionInsert = Database["public"]["Tables"]["task_exceptions"]["Insert"];
export type TaskExceptionStatus = TaskExceptionRow["status"];

interface TaskOccurrenceStatusParams {
  farmId: string;
  taskId: string;
  occurrenceDate: string;
  status: TaskExceptionStatus;
  notes?: string | null;
}

export async function getTodayTasks(farmId: string): Promise<TaskRow[]> {
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

export async function getTasksByDate(farmId: string, date: string): Promise<TaskRow[]> {
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

export async function getTaskSchedule(farmId: string, endDate: string, flockId?: string): Promise<TaskRow[]> {
  const supabase = createClient();
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("farm_id", farmId)
    .lte("date", endDate)
    .order("scheduled_time", { ascending: true });

  if (flockId) {
    query = query.eq("flock_id", flockId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getTaskExceptions(
  farmId: string,
  occurrenceDate: string,
  taskIds: string[]
): Promise<TaskExceptionRow[]> {
  if (taskIds.length === 0) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("task_exceptions")
    .select("*")
    .eq("farm_id", farmId)
    .eq("occurrence_date", occurrenceDate)
    .in("task_id", taskIds);

  if (error) throw error;
  return data;
}

export async function createTask(task: TaskInsert): Promise<TaskRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert(task)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(taskId: string, updates: TaskUpdate): Promise<TaskRow> {
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

export async function setTaskOccurrenceStatus({
  farmId,
  taskId,
  occurrenceDate,
  status,
  notes,
}: TaskOccurrenceStatusParams): Promise<TaskExceptionRow> {
  const supabase = createClient();
  const payload: TaskExceptionInsert = {
    farm_id: farmId,
    task_id: taskId,
    occurrence_date: occurrenceDate,
    status,
    completed_at: status === "done" ? new Date().toISOString() : null,
    notes,
  };

  const { data, error } = await supabase
    .from("task_exceptions")
    .upsert(payload, { onConflict: "task_id,occurrence_date" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleTask(
  farmId: string,
  taskId: string,
  occurrenceDate: string,
  done: boolean
): Promise<TaskExceptionRow> {
  return setTaskOccurrenceStatus({
    farmId,
    taskId,
    occurrenceDate,
    status: done ? "done" : "skipped",
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);
  if (error) throw error;
}
