import Stripe from "stripe";
import { isValidPlan, type PlanType } from "@/lib/plans";

export type BillingCycle = "monthly" | "yearly";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!stripeSecretKey) {
    throw new Error("Missing Stripe env var: STRIPE_SECRET_KEY.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(stripeSecretKey);
  }

  return stripeClient;
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function getStripePriceId(plan: PlanType, billingCycle: BillingCycle) {
  const priceEnvByPlan: Record<PlanType, Record<BillingCycle, string | undefined>> = {
    essencial: {
      monthly: process.env.STRIPE_PRICE_ESSENCIAL_MONTHLY,
      yearly: process.env.STRIPE_PRICE_ESSENCIAL_YEARLY,
    },
    pro: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    },
    premium: {
      monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
      yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
    },
  };

  const priceId = priceEnvByPlan[plan][billingCycle];

  if (!priceId) {
    throw new Error(`Missing Stripe price id for ${plan} ${billingCycle}.`);
  }

  return priceId;
}

export function getStripeWebhookSecret() {
  if (!stripeWebhookSecret) {
    throw new Error("Missing Stripe env var: STRIPE_WEBHOOK_SECRET.");
  }

  return stripeWebhookSecret;
}

export function getPlanByStripePriceId(priceId: string) {
  const entries: Array<{
    billingCycle: BillingCycle;
    envPriceId: string | undefined;
    plan: PlanType;
  }> = [
    {
      billingCycle: "monthly",
      envPriceId: process.env.STRIPE_PRICE_ESSENCIAL_MONTHLY,
      plan: "essencial",
    },
    {
      billingCycle: "yearly",
      envPriceId: process.env.STRIPE_PRICE_ESSENCIAL_YEARLY,
      plan: "essencial",
    },
    {
      billingCycle: "monthly",
      envPriceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
      plan: "pro",
    },
    {
      billingCycle: "yearly",
      envPriceId: process.env.STRIPE_PRICE_PRO_YEARLY,
      plan: "pro",
    },
    {
      billingCycle: "monthly",
      envPriceId: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
      plan: "premium",
    },
    {
      billingCycle: "yearly",
      envPriceId: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
      plan: "premium",
    },
  ];

  const match = entries.find((entry) => entry.envPriceId === priceId);
  if (match) return { billingCycle: match.billingCycle, plan: match.plan };

  return null;
}

export function parseStripePlan(value: unknown) {
  return isValidPlan(value) ? value : null;
}

export function parseStripeBillingCycle(value: unknown): BillingCycle | null {
  if (value === "monthly" || value === "mensal") return "monthly";
  if (value === "yearly" || value === "annual" || value === "anual") {
    return "yearly";
  }

  return null;
}
