import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/config";

/**
 * Returns the Stripe customer id for a user, reusing the one from a previous
 * subscription if it exists, otherwise creating a new customer.
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string | undefined
): Promise<string> {
  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data } = await admin
    .from("billing_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const existing = (data as { stripe_customer_id: string } | null)?.stripe_customer_id;
  if (existing) return existing;

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });
  return customer.id;
}
