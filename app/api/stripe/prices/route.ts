import { getStripeClient, getStripePriceId } from "@/lib/stripe/config";
import type { BillingCycle } from "@/lib/stripe/config";
import type { PlanType } from "@/lib/plans";

export const dynamic = "force-dynamic";

type PriceInfo = { amount: number | null; currency: string };

async function retrievePrice(plan: PlanType, cycle: BillingCycle): Promise<PriceInfo> {
  const stripe = getStripeClient();
  const price = await stripe.prices.retrieve(getStripePriceId(plan, cycle));
  return { amount: price.unit_amount, currency: price.currency };
}

export async function GET() {
  try {
    const plans: PlanType[] = ["essencial", "pro", "premium"];
    const entries = await Promise.all(
      plans.map(async (plan) => {
        const [monthly, yearly] = await Promise.all([
          retrievePrice(plan, "monthly"),
          retrievePrice(plan, "yearly"),
        ]);
        return [plan, { monthly, yearly }] as const;
      })
    );

    return Response.json(Object.fromEntries(entries));
  } catch (error) {
    console.error("Stripe prices error:", error);
    return Response.json({ error: "Não foi possível carregar os preços." }, { status: 500 });
  }
}
