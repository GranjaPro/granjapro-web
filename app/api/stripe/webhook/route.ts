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
import { clearGracePeriod, startGracePeriod } from "@/lib/stripe/dunning";
import { sendEmail } from "@/lib/email/send";
import { paymentFailedEmail } from "@/lib/email/templates";
import { getAppUrl } from "@/lib/stripe/config";

async function retrieveSubscription(subscriptionId: string) {
  return getStripeClient().subscriptions.retrieve(subscriptionId);
}

async function syncEventSubscription(object: unknown) {
  const subscriptionId = getSubscriptionIdFromEventObject(object);
  if (!subscriptionId) return;

  const subscription = await retrieveSubscription(subscriptionId);
  await syncStripeSubscription(subscription);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getSubscriptionIdFromEventObject(invoice);
  if (!subscriptionId) return;

  // Reflect the past_due status first.
  await syncEventSubscription(invoice);

  // Dunning applies only to renewal charges — not the first payment or
  // upgrade-proration invoices (which are handled synchronously elsewhere).
  if (invoice.billing_reason !== "subscription_cycle") return;

  const { started, email, gracePeriodEndsAt } = await startGracePeriod(subscriptionId);

  if (started) {
    const recipient = invoice.customer_email ?? email;
    if (recipient) {
      const { subject, html } = paymentFailedEmail({
        updateUrl: `${getAppUrl()}/dashboard/select-plan`,
        gracePeriodEndsAt,
      });
      await sendEmail({ to: recipient, subject, html });
    }
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = getSubscriptionIdFromEventObject(invoice);
  if (subscriptionId) {
    await clearGracePeriod(subscriptionId);
  }
  await syncEventSubscription(invoice);
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
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      return;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      return;
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
