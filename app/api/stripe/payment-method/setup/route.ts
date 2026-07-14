import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/config";

export async function POST(_request: NextRequest) {
  try {
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
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = lookup.data as { stripe_customer_id: string } | null;

    if (lookup.error || !row?.stripe_customer_id) {
      return Response.json(
        { error: "Nenhum cadastro de cobrança encontrado." },
        { status: 404 }
      );
    }

    const stripe = getStripeClient();
    const setupIntent = await stripe.setupIntents.create({
      customer: row.stripe_customer_id,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    return Response.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error("Stripe setup intent error:", error);
    return Response.json(
      { error: "Não foi possível iniciar a atualização do cartão." },
      { status: 500 }
    );
  }
}
