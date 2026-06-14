"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Check, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import {
  getPlanOrNull,
  isTrialActive,
  PLAN_MATRIX,
  PLAN_TYPES,
  type PlanType,
} from "@/lib/plans";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";

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

export default function SelectPlanPage() {
  const { user, profile, loading } = useAuth();
  const [submitting, setSubmitting] = useState<PlanType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncingCheckout, setSyncingCheckout] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const plans = useMemo(() => PLAN_TYPES.map((plan) => ({ key: plan, ...PLAN_MATRIX[plan] })), []);
  const activePlan = getPlanOrNull(profile?.plan);
  const trialActive = isTrialActive(profile);
  const checkoutReturn = useMemo(() => {
    if (typeof window === "undefined") {
      return { cancelled: null, cancelledUntil: null, sessionId: null, status: null };
    }

    const params = new URLSearchParams(window.location.search);
    return {
      cancelled: params.get("cancelled"),
      cancelledUntil: params.get("until"),
      sessionId: params.get("session_id"),
      status: params.get("checkout"),
    };
  }, []);

  useEffect(() => {
    if (checkoutReturn.status === "cancelled") {
      setCheckoutNotice("Checkout cancelado. Você pode escolher um plano quando quiser.");
    }
    if (checkoutReturn.cancelled === "success") {
      const formattedDate = formatPeriodEnd(checkoutReturn.cancelledUntil);
      setCheckoutNotice(
        formattedDate
          ? `Cancelamento agendado. Você mantém acesso até ${formattedDate}.`
          : "Cancelamento agendado. Você mantém acesso até o fim do período atual."
      );
    }
  }, [checkoutReturn.cancelled, checkoutReturn.cancelledUntil, checkoutReturn.status]);

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

    const response = await fetch("/api/stripe/checkout", {
      body: JSON.stringify({
        billingCycle: "monthly",
        plan,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const checkout = (await response.json()) as {
      error?: string;
      url?: string;
    };

    if (!response.ok || !checkout.url) {
      setError(checkout.error ?? "Não foi possível iniciar o checkout. Tente novamente.");
      setSubmitting(null);
      return;
    }

    window.location.href = checkout.url;
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

  if (loading) {
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

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = activePlan === plan.key;
          return (
          <article
            key={plan.key}
            aria-current={isCurrentPlan ? "true" : undefined}
            className={cn(
              "group relative flex min-h-[520px] flex-col rounded-xl border bg-white p-5 pt-8 shadow-sm transition-all duration-200 dark:bg-slate-900/80 dark:shadow-black/10",
              isCurrentPlan
                ? "border-2 border-brand-500 bg-brand-50/40 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-500/[0.06] dark:shadow-brand-950/40 dark:ring-brand-400/30"
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

            <p className="mt-6 text-4xl font-bold text-slate-950 dark:text-white">{plan.priceMonthly}</p>

            <div className="mt-6 min-h-[5.75rem]">
              {isCurrentPlan ? (
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
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => selectPlan(plan.key)}
                    disabled={submitting !== null}
                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
                  >
                    {submitting === plan.key ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {activePlan ? "Mudar para este plano" : "Selecionar plano"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Cobrança mensal · Cancele quando quiser
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
    </div>
  );
}
