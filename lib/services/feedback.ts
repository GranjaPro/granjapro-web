import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

export type FeedbackInsert = Database["public"]["Tables"]["feedbacks"]["Insert"];

export async function createFeedback(record: FeedbackInsert): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("feedbacks").insert(record);

  if (error) throw error;
}
