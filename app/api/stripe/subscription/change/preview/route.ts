import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPlanByStripePriceId,
  getStripeClient,
  getStripePriceId,
  type BillingCycle,
} from "@/lib/stripe/config";
import { isValidPlan, PLAN_ORDER, type PlanType } from "@/lib/plans";

const CHANGEABLE_STATUSES = new Set(["active", "trialing", "past_due"]);

type PreviewBody = { plan?: unknown };

function toIso(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PreviewBody;
    if (!isValidPlan(body.plan)) {
      return Response.json({ error: "Plano inválido." }, { status: 400 });
    }
    const targetPlan: PlanType = body.plan;

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: "Sessão expirada." }, { status: 401 });
    }

    const admin = createAdminClient();
    const lookup = await admin
      .from("billing_subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = lookup.data as { stripe_subscription_id: string; status: string } | null;

    if (!row || !CHANGEABLE_STATUSES.has(row.status)) {
      return Response.json({ error: "Nenhuma assinatura ativa encontrada." }, { status: 404 });
    }

    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
    const currentItem = subscription.items.data[0];
    const currentPriceId = currentItem?.price.id;
    const currentMatch = currentPriceId ? getPlanByStripePriceId(currentPriceId) : null;
    const currentPlan = currentMatch?.plan ?? null;
    const billingCycle: BillingCycle = currentMatch?.billingCycle ?? "monthly";
    const currentPeriodEnd = toIso(currentItem?.current_period_end);

    if (!currentPlan || !currentItem) {
      return Response.json({ error: "Não foi possível identificar seu plano atual." }, { status: 409 });
    }

    if (PLAN_ORDER[targetPlan] === PLAN_ORDER[currentPlan]) {
      return Response.json({ direction: "unchanged", currentPlan, currentPeriodEnd });
    }

    // Downgrade: no immediate charge, switches at period end.
    if (PLAN_ORDER[targetPlan] < PLAN_ORDER[currentPlan]) {
      return Response.json({ direction: "downgrade", currentPlan, currentPeriodEnd });
    }

    // Upgrade: preview the prorated amount that would be charged now.
    const targetPriceId = getStripePriceId(targetPlan, billingCycle);
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

    const preview = await stripe.invoices.createPreview({
      customer: customerId,
      subscription: subscription.id,
      subscription_details: {
        items: [{ id: currentItem.id, price: targetPriceId }],
        proration_behavior: "always_invoice",
      },
    });

    return Response.json({
      direction: "upgrade",
      currentPlan,
      currentPeriodEnd,
      amount: preview.amount_due,
      currency: preview.currency,
    });
  } catch (error) {
    console.error("Stripe change preview error:", error);
    return Response.json({ error: "Não foi possível calcular a mudança." }, { status: 500 });
  }
}
