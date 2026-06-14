import Stripe from "stripe";
import { NextRequest } from "next/server";
import {
  getStripeClient,
  getStripeWebhookSecret,
} from "@/lib/stripe/config";
import {
  getSubscriptionIdFromEventObject,
  syncStripeSubscription,
} from "@/lib/stripe/subscription-sync";

async function retrieveSubscription(subscriptionId: string) {
  return getStripeClient().subscriptions.retrieve(subscriptionId);
}

async function syncEventSubscription(object: unknown) {
  const subscriptionId = getSubscriptionIdFromEventObject(object);
  if (!subscriptionId) return;

  const subscription = await retrieveSubscription(subscriptionId);
  await syncStripeSubscription(subscription);
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const subscriptionId = getSubscriptionIdFromEventObject(session);
  if (!subscriptionId) return;

  const subscription = await retrieveSubscription(subscriptionId);
  await syncStripeSubscription(subscription);
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session
      );
      return;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncStripeSubscription(event.data.object as Stripe.Subscription);
      return;
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
    case "invoice.payment_action_required":
      await syncEventSubscription(event.data.object);
      return;
    default:
      return;
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  try {
    const payload = await request.text();
    const event = getStripeClient().webhooks.constructEvent(
      payload,
      signature,
      getStripeWebhookSecret()
    );

    await handleStripeEvent(event);

    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);

    return Response.json(
      { error: "Stripe webhook handler failed." },
      { status: 400 }
    );
  }
}
