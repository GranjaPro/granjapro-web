"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Check, Clock, Loader2, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import {
  getPlanOrNull,
  isTrialActive,
  PLAN_MATRIX,
  PLAN_ORDER,
  PLAN_TYPES,
  type PlanType,
} from "@/lib/plans";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";

type SubscriptionState = {
  hasSubscription: boolean;
  plan: PlanType | null;
  status?: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  scheduledPlan: PlanType | null;
  scheduledChangeAt: string | null;
};

const PLAN_SELECTION_COPY = {
  essencial: {
    badge: "Inteligência artificial experimental",
    description: "Saia do caderno e comece a controlar sua granja",
    tagline: "Ideal para quem está começando a organizar a produção",
  },
  pro: {
    badge: "Mais popular + inteligência artificial",
    description: "Descubra onde você está perdendo dinheiro e aumente seu lucro",
    tagline: "Para quem quer tomar decisões e ganhar mais com a granja",
  },
  premium: {
    badge: "Inteligência artificial avançada",
    description: "Controle total e inteligência avançada da sua granja",
    tagline: "Para produtores que querem escalar e profissionalizar a operação",
  },
} satisfies Record<PlanType, { badge: string; description: string; tagline: string }>;

function formatPeriodEnd(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

type BillingCycle = "monthly" | "yearly";
type PriceInfo = { amount: number | null; currency: string };
type PlanPrices = { monthly: PriceInfo; yearly: PriceInfo };
type PricesMap = Partial<Record<PlanType, PlanPrices>>;
type PendingChange = { plan: PlanType; direction: "upgrade" | "downgrade" };
type ChangePreview = { amount: number | null; currency: string; currentPeriodEnd: string | null };

function formatCurrency(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function yearlySavingsPct(prices: PlanPrices | undefined): number {
  const monthly = prices?.monthly.amount;
  const yearly = prices?.yearly.amount;
  if (!monthly || !yearly) return 0;
  return Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100));
}

export default function SelectPlanPage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [submitting, setSubmitting] = useState<PlanType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncingCheckout, setSyncingCheckout] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [prices, setPrices] = useState<PricesMap>({});
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [changePreview, setChangePreview] = useState<ChangePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const plans = useMemo(() => PLAN_TYPES.map((plan) => ({ key: plan, ...PLAN_MATRIX[plan] })), []);
  const activePlan = getPlanOrNull(profile?.plan);
  const trialActive = isTrialActive(profile);
  const checkoutReturn = useMemo(() => {
    if (typeof window === "undefined") {
      return { cancelled: null, cancelledUntil: null, resumed: null, sessionId: null, status: null };
    }

    const params = new URLSearchParams(window.location.search);
    return {
      cancelled: params.get("cancelled"),
      cancelledUntil: params.get("until"),
      changed: params.get("changed"),
      resumed: params.get("resumed"),
      sessionId: params.get("session_id"),
      status: params.get("checkout"),
    };
  }, []);

  const cancelScheduled =
    !trialActive &&
    (subscription?.cancelAtPeriodEnd ?? checkoutReturn.cancelled === "success");
  const cancelUntilLabel = formatPeriodEnd(
    subscription?.currentPeriodEnd ?? checkoutReturn.cancelledUntil
  );
  const scheduledDowngradePlan = subscription?.scheduledPlan ?? null;
  const scheduledDowngradeLabel = formatPeriodEnd(subscription?.scheduledChangeAt ?? null);
  const hasActiveSubscription = subscription?.hasSubscription ?? false;
  const toggleSavings = Math.max(
    yearlySavingsPct(prices.pro),
    yearlySavingsPct(prices.premium),
    yearlySavingsPct(prices.essencial)
  );

  useEffect(() => {
    if (checkoutReturn.status === "cancelled") {
      setCheckoutNotice("Checkout cancelado. Você pode escolher um plano quando quiser.");
    }
    if (checkoutReturn.resumed === "success") {
      setCheckoutNotice("Plano retomado. Sua assinatura continua ativa normalmente.");
    }
    if (checkoutReturn.changed === "upgrade") {
      setCheckoutNotice(
        "Plano atualizado! Você já está no novo plano — cobramos apenas a diferença proporcional."
      );
    }
    if (checkoutReturn.changed === "downgrade") {
      const formattedDate = formatPeriodEnd(checkoutReturn.cancelledUntil);
      setCheckoutNotice(
        formattedDate
          ? `Mudança agendada. Você continua no plano atual até ${formattedDate} e depois muda automaticamente.`
          : "Mudança agendada. Você continua no plano atual até o fim do período e depois muda automaticamente."
      );
    }
    if (checkoutReturn.changed === "reverted") {
      setCheckoutNotice("Agendamento cancelado. Você continua no seu plano atual.");
    }
  }, [checkoutReturn.changed, checkoutReturn.cancelledUntil, checkoutReturn.resumed, checkoutReturn.status]);

  const loadSubscription = useCallback(async () => {
    try {
      const response = await fetch("/api/stripe/subscription", { cache: "no-store" });
      const data = (await response.json()) as SubscriptionState;
      setSubscription(data);
    } catch {
      /* status is best-effort; keep defaults */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadSubscription();
  }, [user, loadSubscription]);

  useEffect(() => {
    let active = true;
    fetch("/api/stripe/prices")
      .then((response) => response.json())
      .then((data: PricesMap) => {
        if (active) setPrices(data ?? {});
      })
      .catch(() => {
        /* prices are best-effort; monthly falls back to PLAN_MATRIX */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (checkoutReturn.status !== "success") return;

    let active = true;

    async function syncCheckoutSession() {
      if (!checkoutReturn.sessionId) {
        setError("Pagamento recebido, mas a sessão de checkout não foi encontrada.");
        return;
      }

      setError(null);
      setSyncingCheckout(true);
      setCheckoutNotice("Pagamento recebido. Liberando seu acesso...");

      const response = await fetch("/api/stripe/checkout/sync", {
        body: JSON.stringify({ sessionId: checkoutReturn.sessionId }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as { error?: string; synced?: boolean };

      if (!active) return;

      if (!response.ok || !result.synced) {
        setError(result.error ?? "Pagamento recebido, mas ainda não foi possível liberar o plano.");
        setCheckoutNotice("Aguardando confirmação da Stripe. Tente atualizar a página em alguns segundos.");
        setSyncingCheckout(false);
        return;
      }

      setCheckoutNotice("Plano liberado. Redirecionando para o dashboard...");
      window.location.href = "/dashboard";
    }

    syncCheckoutSession().catch(() => {
      if (!active) return;
      setError("Pagamento recebido, mas ocorreu um erro ao confirmar o plano.");
      setCheckoutNotice("Aguardando confirmação da Stripe. Tente atualizar a página em alguns segundos.");
      setSyncingCheckout(false);
    });

    return () => {
      active = false;
    };
  }, [checkoutReturn.sessionId, checkoutReturn.status]);

  useEffect(() => {
    if (checkoutReturn.status === "success" && getPlanOrNull(profile?.plan)) {
      window.location.href = "/dashboard";
    }
  }, [checkoutReturn.status, profile?.plan]);

  async function selectPlan(plan: PlanType) {
    if (!user) {
      setError("Entre novamente para selecionar um plano.");
      return;
    }

    setError(null);
    setSubmitting(plan);
    // Client-side navigation keeps the sidebar/top bar fixed and loads only the
    // content area on the payment page (no full-screen reload).
    router.push(`/dashboard/subscribe?plan=${plan}&cycle=${billingCycle}`);
  }

  async function changePlan(plan: PlanType) {
    if (!user) {
      setError("Entre novamente para alterar seu plano.");
      return;
    }

    setError(null);
    setSubmitting(plan);

    const response = await fetch("/api/stripe/subscription/change", {
      body: JSON.stringify({ plan }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = (await response.json()) as {
      changed?: boolean;
      direction?: "upgrade" | "downgrade" | "reverted" | "unchanged";
      effectiveAt?: string | null;
      error?: string;
      needsCheckout?: boolean;
    };

    if (response.status === 404 && result.needsCheckout) {
      // No paid subscription yet — fall back to the checkout flow.
      await selectPlan(plan);
      return;
    }

    if (!response.ok || !result.changed) {
      if (result.direction === "unchanged") {
        setSubmitting(null);
        return;
      }
      setError(result.error ?? "Não foi possível alterar o plano. Tente novamente.");
      setSubmitting(null);
      return;
    }

    // Update the page in place — no full reload — so the confirmation, active
    // plan and scheduled-change banner all reflect the new state immediately.
    if (result.direction === "upgrade") {
      setCheckoutNotice(
        "Plano atualizado! Você já está no novo plano — cobramos apenas a diferença proporcional."
      );
    } else if (result.direction === "downgrade") {
      const formattedDate = formatPeriodEnd(result.effectiveAt ?? null);
      setCheckoutNotice(
        formattedDate
          ? `Mudança agendada. Você continua no plano atual até ${formattedDate} e depois muda automaticamente.`
          : "Mudança agendada. Você continua no plano atual até o fim do período e depois muda automaticamente."
      );
    } else if (result.direction === "reverted") {
      setCheckoutNotice("Agendamento cancelado. Você continua no seu plano atual.");
    }

    await Promise.all([refreshProfile(), loadSubscription()]);
    setSubmitting(null);
  }

  // Existing paid subscribers confirm the change in a popup (with the prorated
  // amount for upgrades / switch date for downgrades); new or trial users go to
  // the payment page.
  function handlePlanAction(plan: PlanType) {
    if (activePlan && !trialActive) {
      return requestChange(plan);
    }
    return selectPlan(plan);
  }

  function requestChange(plan: PlanType) {
    if (!activePlan) return;
    const direction: PendingChange["direction"] =
      PLAN_ORDER[plan] > PLAN_ORDER[activePlan] ? "upgrade" : "downgrade";
    setError(null);
    setPendingChange({ plan, direction });
    setChangePreview(null);
    setPreviewLoading(true);

    fetch("/api/stripe/subscription/change/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    })
      .then((response) => response.json())
      .then((data: { amount?: number | null; currency?: string; currentPeriodEnd?: string | null }) => {
        setChangePreview({
          amount: data.amount ?? null,
          currency: data.currency ?? "brl",
          currentPeriodEnd: data.currentPeriodEnd ?? subscription?.currentPeriodEnd ?? null,
        });
      })
      .catch(() => {
        setChangePreview({
          amount: null,
          currency: "brl",
          currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        });
      })
      .finally(() => setPreviewLoading(false));
  }

  async function confirmPendingChange() {
    if (!pendingChange) return;
    await changePlan(pendingChange.plan);
    setPendingChange(null);
  }

  function revertScheduledChange() {
    if (!activePlan) return;
    return changePlan(activePlan);
  }

  async function cancelPlan() {
    setError(null);
    setCancelling(true);

    const response = await fetch("/api/stripe/subscription/cancel", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = (await response.json()) as {
      cancelled?: boolean;
      currentPeriodEnd?: string | null;
      error?: string;
    };

    if (!response.ok || !result.cancelled) {
      setError(result.error ?? "Não foi possível cancelar o plano. Tente novamente.");
      setCancelling(false);
      setConfirmingCancel(false);
      return;
    }

    const untilParam = result.currentPeriodEnd
      ? `&until=${encodeURIComponent(result.currentPeriodEnd)}`
      : "";
    window.location.href = `/dashboard/select-plan?cancelled=success${untilParam}`;
  }

  async function resumePlan() {
    setError(null);
    setResuming(true);

    const response = await fetch("/api/stripe/subscription/resume", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = (await response.json()) as {
      error?: string;
      resumed?: boolean;
    };

    if (!response.ok || !result.resumed) {
      setError(result.error ?? "Não foi possível retomar o plano. Tente novamente.");
      setResuming(false);
      return;
    }

    window.location.href = "/dashboard/select-plan?resumed=success";
  }

  // `loading` becomes false as soon as the user is resolved, but the profile
  // (and thus the active plan) loads a moment later. Keep the spinner until the
  // profile is available to avoid flashing the "no active plan" state.
  if (loading || (user && !profile)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-500/30 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-400/30 dark:bg-brand-500/10 dark:text-brand-200">
          <Sparkles className="h-3.5 w-3.5" />
          {activePlan ? "Gerenciar plano" : "Escolha seu acesso"}
        </div>
        <div>
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-slate-950 dark:text-white sm:text-4xl">
              {activePlan ? "Seu plano e cobrança" : "Selecione um plano para continuar"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {activePlan
                ? "Você pode trocar de plano ou cancelar a assinatura a qualquer momento."
                : "Seu teste grátis terminou ou sua conta está sem plano ativo. Escolha um plano para voltar ao dashboard. Você será redirecionado para o checkout seguro da Stripe."}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {checkoutNotice && (
        <div className="flex items-center gap-2 rounded-lg border border-brand-400/30 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-100">
          {syncingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {checkoutNotice}
        </div>
      )}

      {cancelScheduled && (
        <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {cancelUntilLabel
            ? `Cancelamento agendado. Você mantém acesso até ${cancelUntilLabel}.`
            : "Cancelamento agendado. Você mantém acesso até o fim do período atual."}
        </div>
      )}

      {scheduledDowngradePlan && !cancelScheduled && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              Mudança para o plano {PLAN_MATRIX[scheduledDowngradePlan].displayName} agendada
              {scheduledDowngradeLabel ? ` para ${scheduledDowngradeLabel}` : ""}. Você continua no
              plano atual até lá.
            </span>
          </div>
          <button
            type="button"
            onClick={revertScheduledChange}
            disabled={submitting !== null}
            className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-amber-500/50 bg-white px-3 text-xs font-bold text-amber-800 transition-colors duration-200 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-400/40 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-500/10"
          >
            {submitting !== null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Desfazer
          </button>
        </div>
      )}

      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
              billingCycle === "monthly"
                ? "bg-brand-600 text-white shadow-sm dark:bg-brand-500"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
            )}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
              billingCycle === "yearly"
                ? "bg-brand-600 text-white shadow-sm dark:bg-brand-500"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
            )}
          >
            Anual
            {toggleSavings > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  billingCycle === "yearly" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                )}
              >
                -{toggleSavings}%
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-4 pt-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = activePlan === plan.key;
          const isScheduledPlan = scheduledDowngradePlan === plan.key;
          const isPaidChange = Boolean(activePlan) && !trialActive && hasActiveSubscription;
          const isUpgrade =
            isPaidChange && activePlan ? PLAN_ORDER[plan.key] > PLAN_ORDER[activePlan] : false;
          const isDowngrade =
            isPaidChange && activePlan ? PLAN_ORDER[plan.key] < PLAN_ORDER[activePlan] : false;
          const actionLabel = isUpgrade
            ? "Fazer upgrade agora"
            : isDowngrade
              ? "Agendar mudança"
              : activePlan
                ? "Mudar para este plano"
                : "Selecionar plano";
          const isYearly = billingCycle === "yearly";
          const planPrices = prices[plan.key];
          const currency = planPrices?.monthly.currency ?? "brl";
          const yearlyAmount = planPrices?.yearly.amount ?? null;
          const yearlyPerMonth = yearlyAmount ? formatCurrency(Math.round(yearlyAmount / 12), currency) : null;
          const yearlyTotal = yearlyAmount ? formatCurrency(yearlyAmount, currency) : null;
          const cycleSubtext = isYearly
            ? "Cobrança anual · Cancele quando quiser"
            : "Cobrança mensal · Cancele quando quiser";
          const actionSubtext = isUpgrade
            ? "Cobramos só a diferença proporcional"
            : isDowngrade
              ? "Troca automática ao fim do período atual"
              : cycleSubtext;
          // Highlight the "most popular" plan only when choosing for the first
          // time. Once a plan is active, only the active plan stays highlighted.
          const isFeatured = plan.key === "pro" && !isCurrentPlan && !activePlan;
          return (
          <article
            key={plan.key}
            aria-current={isCurrentPlan ? "true" : undefined}
            className={cn(
              "group relative flex min-h-[520px] flex-col rounded-xl border bg-white p-5 pt-8 shadow-sm transition-all duration-200 dark:bg-slate-900/80 dark:shadow-black/10",
              isCurrentPlan
                ? "border-2 border-brand-500 bg-brand-50/40 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-500/[0.06] dark:shadow-brand-950/40 dark:ring-brand-400/30"
                : isFeatured
                  ? "z-10 border-2 border-brand-500 bg-brand-50/50 shadow-2xl shadow-brand-500/20 ring-1 ring-brand-500/20 hover:shadow-brand-500/30 lg:-translate-y-3 lg:scale-[1.04] dark:border-brand-400 dark:bg-brand-500/[0.08] dark:ring-brand-400/30"
                  : cn(
                      "hover:-translate-y-1 hover:border-brand-400 hover:shadow-2xl hover:shadow-brand-900/10 dark:hover:shadow-brand-950/30",
                      plan.key === "premium" ? "border-brand-400/60" : "border-slate-200 dark:border-white/10"
                    )
            )}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
              {isCurrentPlan ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500 bg-brand-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md shadow-brand-500/30 dark:border-brand-400 dark:bg-brand-500">
                  <ShieldCheck className="h-3 w-3" />
                  Plano ativo atualmente
                </span>
              ) : isFeatured ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500 bg-brand-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md shadow-brand-500/30 dark:border-brand-400 dark:bg-brand-500">
                  <Sparkles className="h-3 w-3" />
                  {PLAN_SELECTION_COPY[plan.key].badge}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700 shadow-sm dark:border-brand-400/30 dark:bg-brand-500/10 dark:text-brand-200">
                  <Sparkles className="h-3 w-3" />
                  {PLAN_SELECTION_COPY[plan.key].badge}
                </span>
              )}
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">{plan.commercialName}</p>
            <h2 className="mt-3 text-xl font-bold text-slate-950 dark:text-white">{plan.displayName}</h2>
            <p className="mt-2 min-h-[3rem] text-sm leading-6 text-slate-600 dark:text-slate-300">{PLAN_SELECTION_COPY[plan.key].description}</p>
            <p className="mt-3 min-h-[3.25rem] rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {PLAN_SELECTION_COPY[plan.key].tagline}
            </p>

            <div className="mt-6 min-h-[3.75rem]">
              {isYearly && yearlyPerMonth ? (
                <>
                  <p className="text-4xl font-bold text-slate-950 dark:text-white">
                    {yearlyPerMonth}
                    <span className="text-lg font-semibold text-slate-500 dark:text-slate-400">/mês</span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Cobrado {yearlyTotal}/ano
                  </p>
                </>
              ) : (
                <p className="text-4xl font-bold text-slate-950 dark:text-white">{plan.priceMonthly}</p>
              )}
            </div>

            <div className="mt-6 min-h-[5.75rem]">
              {isCurrentPlan && cancelScheduled ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={resumePlan}
                    disabled={resuming}
                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
                  >
                    {resuming ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Retomar plano
                  </button>
                  <p className="text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Cancelamento agendado · Retome quando quiser
                  </p>
                </div>
              ) : isCurrentPlan ? (
                <div className="flex flex-col gap-2">
                  <div
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-brand-300 bg-brand-100 px-4 text-sm font-bold text-brand-800 dark:border-brand-400/40 dark:bg-brand-500/15 dark:text-brand-100"
                    aria-label="Você está neste plano"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {trialActive ? "Em teste grátis" : "Plano ativo"}
                  </div>
                  {!trialActive && (
                    confirmingCancel ? (
                      <div className="flex flex-col gap-1.5 rounded-lg border border-red-300/70 bg-red-50 p-2 dark:border-red-400/30 dark:bg-red-500/10">
                        <p className="px-1 text-[11px] font-semibold text-red-700 dark:text-red-200">
                          Confirmar cancelamento? Você mantém acesso até o fim do período atual.
                        </p>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={cancelPlan}
                            disabled={cancelling}
                            className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 text-xs font-bold text-white transition-colors duration-200 hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingCancel(false)}
                            disabled={cancelling}
                            className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <X className="h-3.5 w-3.5" />
                            Voltar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingCancel(true)}
                        disabled={cancelling}
                        className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 text-xs font-bold text-red-700 transition-colors duration-200 hover:border-red-400 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-400/40 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/10"
                      >
                        Cancelar plano
                      </button>
                    )
                  )}
                </div>
              ) : isScheduledPlan ? (
                <div className="flex flex-col gap-2">
                  <div
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-100 px-4 text-sm font-bold text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100"
                    aria-label="Mudança para este plano agendada"
                  >
                    <Clock className="h-4 w-4" />
                    Mudança agendada
                  </div>
                  <p className="text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {scheduledDowngradeLabel
                      ? `A partir de ${scheduledDowngradeLabel}`
                      : "Troca no fim do período atual"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handlePlanAction(plan.key)}
                    disabled={submitting !== null}
                    className={cn(
                      "flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400",
                      isFeatured && "shadow-lg shadow-brand-500/35"
                    )}
                  >
                    {submitting === plan.key ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {actionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {actionSubtext}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-200">
              {plan.benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500 dark:text-emerald-300" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

          </article>
          );
        })}
      </div>

      {pendingChange && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-md"
            onClick={() => submitting === null && setPendingChange(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
              <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                {pendingChange.direction === "upgrade"
                  ? `Fazer upgrade para o ${PLAN_MATRIX[pendingChange.plan].displayName}?`
                  : `Mudar para o plano ${PLAN_MATRIX[pendingChange.plan].displayName}?`}
              </h2>

              <div className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {previewLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculando os detalhes...
                  </span>
                ) : pendingChange.direction === "upgrade" ? (
                  <p>
                    O acesso ao plano{" "}
                    <strong>{PLAN_MATRIX[pendingChange.plan].displayName}</strong> é liberado na hora.
                    Cobramos agora{" "}
                    {changePreview?.amount != null ? (
                      <strong>
                        a diferença proporcional de {formatCurrency(changePreview.amount, changePreview.currency)}
                      </strong>
                    ) : (
                      "apenas a diferença proporcional"
                    )}
                    . Depois, você segue pagando o valor normal do novo plano.
                  </p>
                ) : (
                  <p>
                    Você continua no{" "}
                    <strong>{activePlan ? PLAN_MATRIX[activePlan].displayName : "plano atual"}</strong>{" "}
                    {formatPeriodEnd(changePreview?.currentPeriodEnd ?? null)
                      ? `até ${formatPeriodEnd(changePreview?.currentPeriodEnd ?? null)}`
                      : "até o fim do período atual"}
                    . A partir daí, sua assinatura muda automaticamente para o{" "}
                    <strong>{PLAN_MATRIX[pendingChange.plan].displayName}</strong> e os recursos
                    exclusivos do plano atual deixam de ficar disponíveis.
                  </p>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPendingChange(null)}
                  disabled={submitting !== null}
                  className="flex h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmPendingChange}
                  disabled={previewLoading || submitting !== null}
                  className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
                >
                  {submitting !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
