import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getSupabaseAdminConfig } from "./config";

let adminClient: SupabaseClient<Database> | null = null;

export function createAdminClient() {
  if (adminClient) return adminClient;

  const config = getSupabaseAdminConfig();
  adminClient = createClient<Database>(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
