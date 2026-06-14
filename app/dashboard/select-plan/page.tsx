"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import {
  AI_MODE_META,
  PLAN_MATRIX,
  PLAN_TYPES,
  type PlanType,
} from "@/lib/plans";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";

const PLAN_SELECTION_COPY = {
  essencial: {
    badge: "Inteligencia artificial experimental",
    description: "Saia do caderno e comece a controlar sua granja",
    tagline: "Ideal para quem esta comecando a organizar a producao",
  },
  pro: {
    badge: "Mais popular + inteligencia artificial",
    description: "Descubra onde voce esta perdendo dinheiro e aumente seu lucro",
    tagline: "Para quem quer tomar decisoes e ganhar mais com a granja",
  },
  premium: {
    badge: "Inteligencia artificial avancada",
    description: "Controle total e inteligencia avancada da sua granja",
    tagline: "Para produtores que querem escalar e profissionalizar a operacao",
  },
} satisfies Record<PlanType, { badge: string; description: string; tagline: string }>;

export default function SelectPlanPage() {
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState<PlanType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const plans = useMemo(() => PLAN_TYPES.map((plan) => ({ key: plan, ...PLAN_MATRIX[plan] })), []);

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
      setError(checkout.error ?? "Nao foi possivel iniciar o checkout. Tente novamente.");
      setSubmitting(null);
      return;
    }

    window.location.href = checkout.url;
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
          Escolha seu acesso
        </div>
        <div>
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-slate-950 dark:text-white sm:text-4xl">
              Selecione um plano para continuar
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Seu teste gratis terminou ou sua conta esta sem plano ativo. Escolha um plano para voltar ao dashboard.
              Voce sera redirecionado para o checkout seguro da Stripe.
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

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.key}
            className={cn(
              "group relative flex min-h-[520px] flex-col rounded-xl border bg-white p-5 pt-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-400 hover:shadow-2xl hover:shadow-brand-900/10 dark:bg-slate-900/80 dark:shadow-black/10 dark:hover:shadow-brand-950/30",
              plan.key === "premium" ? "border-brand-400/60" : "border-slate-200 dark:border-white/10"
            )}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700 shadow-sm dark:border-brand-400/30 dark:bg-brand-500/10 dark:text-brand-200">
                <Sparkles className="h-3 w-3" />
                {PLAN_SELECTION_COPY[plan.key].badge}
              </span>
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">{plan.commercialName}</p>
            <h2 className="mt-3 text-xl font-bold text-slate-950 dark:text-white">{plan.displayName}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{PLAN_SELECTION_COPY[plan.key].description}</p>
            <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {PLAN_SELECTION_COPY[plan.key].tagline}
            </p>

            <p className="mt-6 text-4xl font-bold text-slate-950 dark:text-white">{plan.priceMonthly.replace("R$ ", "R$ ").replace("/mes", "/mes")}</p>

            <button
              type="button"
              onClick={() => selectPlan(plan.key)}
              disabled={submitting !== null}
              className="mt-6 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
            >
              {submitting === plan.key ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Selecionar plano
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-200">
              {plan.benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500 dark:text-emerald-300" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

          </article>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white">Creditos da IA por peso da analise</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              A escolha do nivel de resposta no assistente consome creditos diferentes do plano.
            </p>
          </div>
          <div className="grid gap-2 sm:min-w-[360px]">
            {Object.entries(AI_MODE_META).map(([mode, meta]) => (
              <div
                key={mode}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-slate-950/40"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{meta.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{meta.description}</p>
                </div>
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700 dark:bg-brand-400/15 dark:text-brand-200">
                  {meta.creditCost} credito{meta.creditCost > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
