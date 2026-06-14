import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig, hasSupabaseConfig } from "./config";

let client: SupabaseClient | null = null;

export { hasSupabaseConfig };

export function createClient() {
  if (client) return client;
  const config = getSupabaseConfig();
  client = createBrowserClient(config.url, config.publishableKey);
  return client;
}
