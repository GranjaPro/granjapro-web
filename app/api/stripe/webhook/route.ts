import Stripe from "stripe";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPlanByStripePriceId,
  getStripeClient,
  getStripeWebhookSecret,
  parseStripeBillingCycle,
  parseStripePlan,
} from "@/lib/stripe/config";
import type { BillingCycle } from "@/lib/stripe/config";
import type { PlanType } from "@/lib/plans";

type SubscriptionSnapshot = {
  billingCycle: BillingCycle;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  plan: PlanType;
  priceId: string;
  status: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  userId: string;
};

type EventWithSubscription = {
  subscription?: string | Stripe.Subscription | null;
};

type SupabaseMutationError = { message: string } | null;

type BillingSubscriptionUpsert = {
  billing_cycle: BillingCycle;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  plan: PlanType;
  status: string;
  stripe_customer_id: string;
  stripe_price_id: string;
  stripe_subscription_id: string;
  user_id: string;
};

type ProfilePlanUpdate = {
  plan: PlanType | null;
  trial_ends_at: null;
  trial_started_at: null;
};

type BillingSubscriptionsTable = {
  upsert(
    values: BillingSubscriptionUpsert,
    options: { onConflict: "stripe_subscription_id" }
  ): Promise<{ error: SupabaseMutationError }>;
};

type ProfilesTable = {
  update(values: ProfilePlanUpdate): {
    eq(column: "id", value: string): Promise<{ error: SupabaseMutationError }>;
  };
};

type BillingAdminClient = {
  from(table: "billing_subscriptions"): BillingSubscriptionsTable;
  from(table: "profiles"): ProfilesTable;
};

const ACCESS_ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
const ACCESS_DISABLED_STATUSES = new Set([
  "canceled",
  "incomplete_expired",
  "unpaid",
]);

function getStringMetadataValue(
  metadata: Stripe.Metadata | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toIsoDate(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  return customer.id;
}

function getSubscriptionSnapshot(subscription: Stripe.Subscription): SubscriptionSnapshot | null {
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price.id;
  const priceMatch = priceId ? getPlanByStripePriceId(priceId) : null;
  const plan =
    parseStripePlan(getStringMetadataValue(subscription.metadata, "plan")) ??
    priceMatch?.plan ??
    null;
  const billingCycle =
    parseStripeBillingCycle(
      getStringMetadataValue(subscription.metadata, "billing_cycle")
    ) ??
    priceMatch?.billingCycle ??
    null;
  const userId = getStringMetadataValue(subscription.metadata, "user_id");
  const stripeCustomerId = getCustomerId(subscription.customer);

  if (!plan || !billingCycle || !userId || !stripeCustomerId || !priceId) {
    return null;
  }

  return {
    billingCycle,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: toIsoDate(firstItem.current_period_end),
    plan,
    priceId,
    status: subscription.status,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    userId,
  };
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const snapshot = getSubscriptionSnapshot(subscription);
  if (!snapshot) {
    throw new Error(`Stripe subscription ${subscription.id} has incomplete metadata.`);
  }

  const supabase = createAdminClient() as unknown as BillingAdminClient;
  const { error: subscriptionError } = await supabase
    .from("billing_subscriptions")
    .upsert(
      {
        billing_cycle: snapshot.billingCycle,
        cancel_at_period_end: snapshot.cancelAtPeriodEnd,
        current_period_end: snapshot.currentPeriodEnd,
        plan: snapshot.plan,
        status: snapshot.status,
        stripe_customer_id: snapshot.stripeCustomerId,
        stripe_price_id: snapshot.priceId,
        stripe_subscription_id: snapshot.stripeSubscriptionId,
        user_id: snapshot.userId,
      },
      { onConflict: "stripe_subscription_id" }
    );

  if (subscriptionError) throw subscriptionError;

  if (ACCESS_ACTIVE_STATUSES.has(snapshot.status)) {
    const { error } = await supabase
      .from("profiles")
      .update({
        plan: snapshot.plan,
        trial_ends_at: null,
        trial_started_at: null,
      })
      .eq("id", snapshot.userId);

    if (error) throw error;
    return;
  }

  if (ACCESS_DISABLED_STATUSES.has(snapshot.status)) {
    const { error } = await supabase
      .from("profiles")
      .update({
        plan: null,
        trial_ends_at: null,
        trial_started_at: null,
      })
      .eq("id", snapshot.userId);

    if (error) throw error;
  }
}

async function retrieveSubscription(subscriptionId: string) {
  return getStripeClient().subscriptions.retrieve(subscriptionId);
}

function getSubscriptionIdFromEventObject(object: unknown) {
  const value = (object as EventWithSubscription).subscription;
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id;
}

async function syncEventSubscription(object: unknown) {
  const subscriptionId = getSubscriptionIdFromEventObject(object);
  if (!subscriptionId) return;

  const subscription = await retrieveSubscription(subscriptionId);
  await syncSubscription(subscription);
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const subscriptionId = getSubscriptionIdFromEventObject(session);
  if (!subscriptionId) return;

  const subscription = await retrieveSubscription(subscriptionId);
  await syncSubscription(subscription);
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
      await syncSubscription(event.data.object as Stripe.Subscription);
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
