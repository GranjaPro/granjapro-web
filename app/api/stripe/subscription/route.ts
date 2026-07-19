import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, getPlanByStripePriceId } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

type SubscriptionLookupRow = {
  status: string;
  stripe_subscription_id: string;
  grace_period_ends_at: string | null;
};

function toIso(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json({ hasSubscription: false }, { status: 200 });
    }

    const admin = createAdminClient();
    const lookup = await admin
      .from("billing_subscriptions")
      .select("stripe_subscription_id, status, grace_period_ends_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = lookup.data as SubscriptionLookupRow | null;

    if (lookup.error || !row || !ACTIVE_STATUSES.has(row.status)) {
      return Response.json({ hasSubscription: false }, { status: 200 });
    }

    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(
      row.stripe_subscription_id
    );

    const firstItem = subscription.items.data[0];
    const currentPlan = firstItem?.price.id
      ? getPlanByStripePriceId(firstItem.price.id)?.plan ?? null
      : null;

    let scheduledPlan: string | null = null;
    let scheduledChangeAt: string | null = null;

    const scheduleId =
      typeof subscription.schedule === "string"
        ? subscription.schedule
        : subscription.schedule?.id ?? null;

    // Schedule parsing is isolated so a hiccup here never wipes the base
    // subscription info (which drives the plan labels on the page).
    if (scheduleId) {
      try {
        const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
        const nowSeconds = Math.floor(Date.now() / 1000);
        const upcomingPhase = schedule.phases.find(
          (phase) => phase.start_date > nowSeconds
        );
        const upcomingPriceRef = upcomingPhase?.items[0]?.price;
        const upcomingPriceId =
          typeof upcomingPriceRef === "string"
            ? upcomingPriceRef
            : upcomingPriceRef?.id ?? null;
        const upcomingPlan = upcomingPriceId
          ? getPlanByStripePriceId(upcomingPriceId)?.plan ?? null
          : null;

        if (upcomingPlan && upcomingPlan !== currentPlan) {
          scheduledPlan = upcomingPlan;
          scheduledChangeAt = toIso(upcomingPhase?.start_date);
        }
      } catch (scheduleError) {
        console.error("Stripe schedule parse error:", scheduleError);
      }
    }

    return Response.json({
      hasSubscription: true,
      plan: currentPlan,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: toIso(firstItem?.current_period_end),
      scheduledPlan,
      scheduledChangeAt,
      pastDue: subscription.status === "past_due",
      gracePeriodEndsAt: row.grace_period_ends_at,
    });
  } catch (error) {
    console.error("Stripe subscription status error:", error);
    return Response.json({ hasSubscription: false }, { status: 200 });
  }
}
