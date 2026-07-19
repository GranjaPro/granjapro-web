import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

export type FeedbackRow = Database["public"]["Tables"]["feedbacks"]["Row"];
export type FeedbackInsert = Database["public"]["Tables"]["feedbacks"]["Insert"];

export async function createFeedback(record: FeedbackInsert): Promise<FeedbackRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feedbacks")
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
}
