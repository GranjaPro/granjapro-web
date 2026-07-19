import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/config";
import { syncStripeSubscription } from "@/lib/stripe/subscription-sync";

type SyncRequestBody = { subscriptionId?: unknown; businessName?: unknown };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncRequestBody;
    const subscriptionId = body.subscriptionId;
    if (typeof subscriptionId !== "string" || !subscriptionId) {
      return Response.json({ error: "Assinatura inválida." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: "Sessão expirada." }, { status: 401 });
    }

    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Only sync a subscription that belongs to the current user.
    if (subscription.metadata?.user_id !== user.id) {
      return Response.json({ error: "Assinatura não encontrada." }, { status: 404 });
    }

    const businessName =
      typeof body.businessName === "string" && body.businessName.trim()
        ? body.businessName.trim()
        : null;
    if (businessName) {
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      await stripe.customers.update(customerId, {
        metadata: { business_name: businessName },
      });
    }

    await syncStripeSubscription(subscription);
    return Response.json({ synced: true });
  } catch (error) {
    console.error("Stripe subscription sync error:", error);
    return Response.json({ error: "Não foi possível confirmar a assinatura." }, { status: 500 });
  }
}
