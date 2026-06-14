import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidPlan, PLAN_MATRIX } from "@/lib/plans";
import type { PlanType } from "@/lib/plans";
import {
  type BillingCycle,
  getAppUrl,
  getStripeClient,
  getStripePriceId,
} from "@/lib/stripe/config";

type CheckoutRequestBody = {
  billingCycle?: unknown;
  plan?: unknown;
};

function parseBillingCycle(value: unknown): BillingCycle | null {
  if (value === "monthly" || value === "mensal") return "monthly";
  if (value === "yearly" || value === "annual" || value === "anual") {
    return "yearly";
  }

  return null;
}

function parseCheckoutRequest(body: CheckoutRequestBody): {
  billingCycle: BillingCycle;
  plan: PlanType;
} | null {
  if (!isValidPlan(body.plan)) return null;

  const billingCycle = parseBillingCycle(body.billingCycle);
  if (!billingCycle) return null;

  return {
    billingCycle,
    plan: body.plan,
  };
}

export async function POST(request: NextRequest) {
  try {
    const parsedRequestBody = parseCheckoutRequest(await request.json());

    if (!parsedRequestBody) {
      return Response.json(
        { error: "Plano ou período de cobrança inválido." },
        { status: 400 }
      );
    }

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

    const stripe = getStripeClient();
    const priceId = getStripePriceId(
      parsedRequestBody.plan,
      parsedRequestBody.billingCycle
    );
    const appUrl = getAppUrl(request.nextUrl.origin);
    const selectedPlan = PLAN_MATRIX[parsedRequestBody.plan];

    const checkoutSession = await stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      cancel_url: `${appUrl}/dashboard/select-plan?checkout=cancelled`,
      client_reference_id: user.id,
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        billing_cycle: parsedRequestBody.billingCycle,
        plan: parsedRequestBody.plan,
        user_id: user.id,
      },
      mode: "subscription",
      subscription_data: {
        description: `Assinatura ${selectedPlan.displayName} do Granja Pro`,
        metadata: {
          billing_cycle: parsedRequestBody.billingCycle,
          plan: parsedRequestBody.plan,
          user_id: user.id,
        },
      },
      success_url: `${appUrl}/dashboard/select-plan?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    });

    if (!checkoutSession.url) {
      return Response.json(
        { error: "Não foi possível criar o checkout." },
        { status: 500 }
      );
    }

    return Response.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    return Response.json(
      { error: "Erro ao iniciar o checkout da Stripe." },
      { status: 500 }
    );
  }
}
