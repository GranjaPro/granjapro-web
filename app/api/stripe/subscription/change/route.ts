import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPlanByStripePriceId,
  getStripeClient,
  getStripePriceId,
  type BillingCycle,
} from "@/lib/stripe/config";
import { syncStripeSubscription } from "@/lib/stripe/subscription-sync";
import { isValidPlan, PLAN_ORDER, type PlanType } from "@/lib/plans";

const CHANGEABLE_STATUSES = new Set(["active", "trialing", "past_due"]);

type SubscriptionLookupRow = {
  status: string;
  stripe_subscription_id: string;
};

type ChangeRequestBody = { plan?: unknown };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChangeRequestBody;
    if (!isValidPlan(body.plan)) {
      return Response.json({ error: "Plano inválido." }, { status: 400 });
    }
    const targetPlan: PlanType = body.plan;

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "Entre novamente para alterar seu plano." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const lookup = await admin
      .from("billing_subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const subscriptionRow = lookup.data as SubscriptionLookupRow | null;

    if (lookup.error) {
      console.error("Stripe change lookup error:", lookup.error);
      return Response.json(
        { error: "Não foi possível localizar sua assinatura." },
        { status: 500 }
      );
    }

    if (!subscriptionRow) {
      return Response.json(
        { error: "Nenhuma assinatura ativa encontrada.", needsCheckout: true },
        { status: 404 }
      );
    }

    if (!CHANGEABLE_STATUSES.has(subscriptionRow.status)) {
      return Response.json(
        { error: "Esta assinatura não pode ser alterada." },
        { status: 409 }
      );
    }

    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(
      subscriptionRow.stripe_subscription_id
    );

    const currentItem = subscription.items.data[0];
    const currentPriceId = currentItem?.price.id;
    const currentMatch = currentPriceId ? getPlanByStripePriceId(currentPriceId) : null;
    const currentPlan = currentMatch?.plan ?? null;
    const billingCycle: BillingCycle = currentMatch?.billingCycle ?? "monthly";

    if (!currentPlan || !currentItem) {
      return Response.json(
        { error: "Não foi possível identificar seu plano atual." },
        { status: 409 }
      );
    }

    const targetPriceId = getStripePriceId(targetPlan, billingCycle);
    const scheduleId =
      typeof subscription.schedule === "string"
        ? subscription.schedule
        : subscription.schedule?.id ?? null;

    // Same plan: only meaningful if it undoes a pending downgrade schedule.
    if (PLAN_ORDER[targetPlan] === PLAN_ORDER[currentPlan]) {
      if (scheduleId) {
        await stripe.subscriptionSchedules.release(scheduleId);
        const refreshed = await stripe.subscriptions.retrieve(
          subscriptionRow.stripe_subscription_id
        );
        await syncStripeSubscription(refreshed);
        return Response.json({ changed: true, direction: "reverted" });
      }
      return Response.json({ changed: false, direction: "unchanged" });
    }

    // ----- UPGRADE: swap price immediately, invoice the prorated difference -----
    if (PLAN_ORDER[targetPlan] > PLAN_ORDER[currentPlan]) {
      // Drop any pending downgrade schedule so it does not fight the upgrade.
      if (scheduleId) {
        await stripe.subscriptionSchedules.release(scheduleId);
      }

      const updated = await stripe.subscriptions.update(
        subscriptionRow.stripe_subscription_id,
        {
          items: [{ id: currentItem.id, price: targetPriceId }],
          proration_behavior: "always_invoice",
          // Charge the prorated difference synchronously. If the card is
          // declined the update is NOT applied — the customer stays on their
          // current plan instead of being upgraded without paying.
          payment_behavior: "error_if_incomplete",
          cancel_at_period_end: false,
          metadata: {
            billing_cycle: billingCycle,
            plan: targetPlan,
            user_id: user.id,
          },
        }
      );

      await syncStripeSubscription(updated);
      return Response.json({ changed: true, direction: "upgrade" });
    }

    // ----- DOWNGRADE: keep current plan until period end, then switch -----
    let workingScheduleId = scheduleId;
    if (!workingScheduleId) {
      const created = await stripe.subscriptionSchedules.create({
        from_subscription: subscriptionRow.stripe_subscription_id,
      });
      workingScheduleId = created.id;
    }

    const schedule = await stripe.subscriptionSchedules.retrieve(workingScheduleId);
    const currentPhase = schedule.phases[0];

    await stripe.subscriptionSchedules.update(workingScheduleId, {
      end_behavior: "release",
      proration_behavior: "none",
      phases: [
        {
          items: [{ price: currentPriceId, quantity: 1 }],
          start_date: currentPhase.start_date,
          end_date: currentPhase.end_date,
        },
        {
          items: [{ price: targetPriceId, quantity: 1 }],
        },
      ],
    });

    return Response.json({
      changed: true,
      direction: "downgrade",
      effectiveAt: currentPhase.end_date
        ? new Date(currentPhase.end_date * 1000).toISOString()
        : null,
    });
  } catch (error) {
    console.error("Stripe change error:", error);

    // A declined card on an upgrade means the update was rolled back — the
    // customer keeps their current plan. Tell them clearly.
    if (isStripeCardError(error)) {
      return Response.json(
        {
          error:
            "Não foi possível cobrar a diferença no seu cartão, então o upgrade não foi aplicado. Verifique os dados do cartão e tente novamente.",
        },
        { status: 402 }
      );
    }

    return Response.json(
      { error: "Não foi possível alterar o plano agora." },
      { status: 500 }
    );
  }
}

function isStripeCardError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as { type?: string }).type === "StripeCardError"
  );
}
