import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/config";
import {
  getSubscriptionIdFromEventObject,
  syncStripeSubscription,
} from "@/lib/stripe/subscription-sync";

type SyncCheckoutRequestBody = {
  sessionId?: unknown;
};

function parseSessionId(body: SyncCheckoutRequestBody) {
  return typeof body.sessionId === "string" && body.sessionId.startsWith("cs_")
    ? body.sessionId
    : null;
}

function sessionBelongsToUser(session: Stripe.Checkout.Session, userId: string) {
  return session.client_reference_id === userId || session.metadata?.user_id === userId;
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = parseSessionId(await request.json());

    if (!sessionId) {
      return Response.json(
        { error: "Sessão de checkout inválida." },
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
        { error: "Entre novamente para confirmar sua assinatura." },
        { status: 401 }
      );
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!sessionBelongsToUser(session, user.id)) {
      return Response.json(
        { error: "Esta sessão de checkout não pertence ao usuário atual." },
        { status: 403 }
      );
    }

    const subscriptionId = getSubscriptionIdFromEventObject(session);

    if (!subscriptionId) {
      return Response.json(
        { error: "A sessão ainda não possui assinatura vinculada." },
        { status: 409 }
      );
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const snapshot = await syncStripeSubscription(subscription);

    return Response.json({
      plan: snapshot.plan,
      status: snapshot.status,
      synced: true,
    });
  } catch (error) {
    console.error("Stripe checkout sync error:", error);

    return Response.json(
      { error: "Não foi possível confirmar a assinatura agora." },
      { status: 500 }
    );
  }
}
