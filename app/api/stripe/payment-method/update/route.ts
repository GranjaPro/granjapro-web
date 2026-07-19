import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/config";
import { syncStripeSubscription } from "@/lib/stripe/subscription-sync";
import { clearGracePeriod } from "@/lib/stripe/dunning";

type UpdateRequestBody = { paymentMethodId?: unknown; businessName?: unknown };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateRequestBody;
    const paymentMethodId = body.paymentMethodId;
    if (typeof paymentMethodId !== "string" || !paymentMethodId) {
      return Response.json({ error: "Cartão inválido." }, { status: 400 });
    }
    const businessName =
      typeof body.businessName === "string" && body.businessName.trim()
        ? body.businessName.trim()
        : null;

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "Entre novamente para atualizar o cartão." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const lookup = await admin
      .from("billing_subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = lookup.data as {
      stripe_customer_id: string;
      stripe_subscription_id: string;
    } | null;

    if (lookup.error || !row?.stripe_customer_id) {
      return Response.json(
        { error: "Nenhum cadastro de cobrança encontrado." },
        { status: 404 }
      );
    }

    const stripe = getStripeClient();

    // Make the new card the default for the customer and the subscription.
    await stripe.customers.update(row.stripe_customer_id, {
      invoice_settings: { default_payment_method: paymentMethodId },
      ...(businessName ? { metadata: { business_name: businessName } } : {}),
    });

    const subscription = await stripe.subscriptions.update(
      row.stripe_subscription_id,
      { default_payment_method: paymentMethodId }
    );

    // If we're in dunning, retry the open invoice right away.
    let paidOpenInvoice = false;
    if (subscription.status === "past_due") {
      const latestInvoiceId =
        typeof subscription.latest_invoice === "string"
          ? subscription.latest_invoice
          : subscription.latest_invoice?.id ?? null;
      if (latestInvoiceId) {
        try {
          await stripe.invoices.pay(latestInvoiceId, { payment_method: paymentMethodId });
          paidOpenInvoice = true;
        } catch (payError) {
          console.error("Retry invoice payment failed:", payError);
          return Response.json(
            {
              error:
                "Cartão salvo, mas a cobrança pendente foi recusada. Verifique os dados ou tente outro cartão.",
            },
            { status: 402 }
          );
        }
      }
    }

    // Reflect the fresh status (past_due -> active) immediately.
    const refreshed = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
    await syncStripeSubscription(refreshed);

    // Clear the dunning grace period synchronously (don't wait for the webhook)
    // so access is restored right after the redirect.
    if (paidOpenInvoice || refreshed.status !== "past_due") {
      await clearGracePeriod(row.stripe_subscription_id);
    }

    return Response.json({ updated: true });
  } catch (error) {
    console.error("Stripe payment method update error:", error);
    return Response.json(
      { error: "Não foi possível atualizar o cartão agora." },
      { status: 500 }
    );
  }
}
