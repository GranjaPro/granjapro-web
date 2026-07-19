import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/config";
import { syncStripeSubscription } from "@/lib/stripe/subscription-sync";

const RESUMABLE_STATUSES = new Set(["active", "trialing", "past_due"]);

type SubscriptionLookupRow = {
  cancel_at_period_end: boolean;
  status: string;
  stripe_subscription_id: string;
};

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "Entre novamente para retomar a assinatura." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const lookup = await admin
      .from("billing_subscriptions")
      .select("stripe_subscription_id, status, cancel_at_period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const subscriptionRow = lookup.data as SubscriptionLookupRow | null;
    const lookupError = lookup.error;

    if (lookupError) {
      console.error("Stripe resume lookup error:", lookupError);
      return Response.json(
        { error: "Não foi possível localizar sua assinatura." },
        { status: 500 }
      );
    }

    if (!subscriptionRow) {
      return Response.json(
        { error: "Nenhuma assinatura encontrada." },
        { status: 404 }
      );
    }

    if (!RESUMABLE_STATUSES.has(subscriptionRow.status)) {
      return Response.json(
        { error: "Esta assinatura não pode ser retomada." },
        { status: 409 }
      );
    }

    const stripe = getStripeClient();

    if (!subscriptionRow.cancel_at_period_end) {
      const existing = await stripe.subscriptions.retrieve(
        subscriptionRow.stripe_subscription_id
      );
      const snapshot = await syncStripeSubscription(existing);
      return Response.json({
        alreadyActive: true,
        resumed: true,
        currentPeriodEnd: snapshot.currentPeriodEnd,
      });
    }

    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionRow.stripe_subscription_id,
      { cancel_at_period_end: false }
    );

    const snapshot = await syncStripeSubscription(updatedSubscription);

    return Response.json({
      resumed: true,
      currentPeriodEnd: snapshot.currentPeriodEnd,
    });
  } catch (error) {
    console.error("Stripe resume error:", error);
    return Response.json(
      { error: "Não foi possível retomar a assinatura agora." },
      { status: 500 }
    );
  }
}
