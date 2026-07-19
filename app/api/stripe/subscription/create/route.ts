import Stripe from "stripe";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidPlan } from "@/lib/plans";
import type { PlanType } from "@/lib/plans";
import {
  type BillingCycle,
  getStripeClient,
  getStripePriceId,
} from "@/lib/stripe/config";
import { getOrCreateCustomer } from "@/lib/stripe/customer";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

type CreateRequestBody = { plan?: unknown; billingCycle?: unknown };

function parseBillingCycle(value: unknown): BillingCycle {
  if (value === "yearly" || value === "annual" || value === "anual") return "yearly";
  return "monthly";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateRequestBody;
    if (!isValidPlan(body.plan)) {
      return Response.json({ error: "Plano inválido." }, { status: 400 });
    }
    const plan: PlanType = body.plan;
    const billingCycle = parseBillingCycle(body.billingCycle);

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "Entre novamente para assinar um plano." },
        { status: 401 }
      );
    }

    // Guard: an active subscription must go through the plan-change flow.
    const admin = createAdminClient();
    const lookup = await admin
      .from("billing_subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const existing = lookup.data as { status: string } | null;
    if (existing && ACTIVE_STATUSES.has(existing.status)) {
      return Response.json(
        { error: "Você já possui uma assinatura ativa.", alreadyActive: true },
        { status: 409 }
      );
    }

    const stripe = getStripeClient();
    const customerId = await getOrCreateCustomer(user.id, user.email);
    const priceId = getStripePriceId(plan, billingCycle);

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        // Restrict to card so Stripe Link (quick checkout) is not offered.
        payment_method_types: ["card"],
      },
      // Newer Stripe API versions expose the client secret via
      // `confirmation_secret`; older ones via `payment_intent`. Expand both so
      // we can read whichever exists.
      expand: ["latest_invoice.confirmation_secret", "latest_invoice.payment_intent"],
      metadata: {
        billing_cycle: billingCycle,
        plan,
        user_id: user.id,
      },
    });

    const invoice = subscription.latest_invoice as
      | (Stripe.Invoice & {
          confirmation_secret?: { client_secret?: string | null } | null;
          payment_intent?: Stripe.PaymentIntent | string | null;
        })
      | null;

    const paymentIntent = invoice?.payment_intent;
    const clientSecret =
      invoice?.confirmation_secret?.client_secret ??
      (paymentIntent && typeof paymentIntent === "object"
        ? paymentIntent.client_secret ?? null
        : null);

    if (!clientSecret) {
      return Response.json(
        { error: "Não foi possível iniciar o pagamento. Tente novamente." },
        { status: 500 }
      );
    }

    return Response.json({
      subscriptionId: subscription.id,
      clientSecret,
    });
  } catch (error) {
    console.error("Stripe subscription create error:", error);
    return Response.json(
      { error: "Erro ao iniciar a assinatura." },
      { status: 500 }
    );
  }
}
