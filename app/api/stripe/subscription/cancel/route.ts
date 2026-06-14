import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/config";
import { syncStripeSubscription } from "@/lib/stripe/subscription-sync";

const CANCELLABLE_STATUSES = new Set(["active", "trialing", "past_due"]);

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
        { error: "Entre novamente para cancelar a assinatura." },
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
      console.error("Stripe cancel lookup error:", lookupError);
      return Response.json(
        { error: "Não foi possível localizar sua assinatura." },
        { status: 500 }
      );
    }

    if (!subscriptionRow) {
      return Response.json(
        { error: "Nenhuma assinatura ativa encontrada." },
        { status: 404 }
      );
    }

    if (!CANCELLABLE_STATUSES.has(subscriptionRow.status)) {
      return Response.json(
        { error: "Esta assinatura não pode ser cancelada." },
        { status: 409 }
      );
    }

    const stripe = getStripeClient();

    if (subscriptionRow.cancel_at_period_end) {
      const existing = await stripe.subscriptions.retrieve(
        subscriptionRow.stripe_subscription_id
      );
      const snapshot = await syncStripeSubscription(existing);
      return Response.json({
        alreadyCancelled: true,
        cancelled: true,
        currentPeriodEnd: snapshot.currentPeriodEnd,
      });
    }

    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionRow.stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    const snapshot = await syncStripeSubscription(updatedSubscription);

    return Response.json({
      cancelled: true,
      currentPeriodEnd: snapshot.currentPeriodEnd,
    });
  } catch (error) {
    console.error("Stripe cancel error:", error);
    return Response.json(
      { error: "Não foi possível cancelar a assinatura agora." },
      { status: 500 }
    );
  }
}
