import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const GRACE_PERIOD_DAYS = 2;

// The generated Database types resolve these write ops to `never` in this
// project, so we use an untyped client (matching the pattern in
// subscription-sync.ts) and keep the row shapes explicit below.
function untypedAdmin(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

type GracePeriodStart = {
  started: boolean;
  email: string | null;
  gracePeriodEndsAt: string | null;
};

/**
 * Starts the dunning grace period for a subscription after a failed renewal.
 * The deadline is only set once (not extended on repeated retry failures), so
 * the customer always gets exactly GRACE_PERIOD_DAYS from the first failure.
 */
export async function startGracePeriod(
  stripeSubscriptionId: string
): Promise<GracePeriodStart> {
  const admin = untypedAdmin();

  const { data } = await admin
    .from("billing_subscriptions")
    .select("user_id, grace_period_ends_at")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  const row = data as { user_id: string; grace_period_ends_at: string | null } | null;

  if (!row) {
    return { started: false, email: null, gracePeriodEndsAt: null };
  }

  const alreadySet = Boolean(row.grace_period_ends_at);
  const gracePeriodEndsAt = alreadySet
    ? row.grace_period_ends_at
    : new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  if (!alreadySet) {
    await admin
      .from("billing_subscriptions")
      .update({ grace_period_ends_at: gracePeriodEndsAt })
      .eq("stripe_subscription_id", stripeSubscriptionId);
  }

  const { data: profileData } = await admin
    .from("profiles")
    .select("email")
    .eq("id", row.user_id)
    .maybeSingle();
  const email = (profileData as { email: string | null } | null)?.email ?? null;

  // Only signal "started" (send email) on the first failure, not on retries.
  return { started: !alreadySet, email, gracePeriodEndsAt };
}

/** Clears the grace period once payment succeeds. */
export async function clearGracePeriod(stripeSubscriptionId: string): Promise<void> {
  const admin = untypedAdmin();
  await admin
    .from("billing_subscriptions")
    .update({ grace_period_ends_at: null })
    .eq("stripe_subscription_id", stripeSubscriptionId);
}
