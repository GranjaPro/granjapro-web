"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { AlertCircle, Bird, CheckCircle2, Loader2, Lock, ShieldCheck } from "lucide-react";
import { getStripeBrowser } from "@/lib/stripe/browser";
import { cn } from "@/lib/utils";
import { getPlanOrNull, PLAN_MATRIX, type PlanType } from "@/lib/plans";
import {
  BILLING_COUNTRIES,
  BrandLogos,
  cardElementStyle,
  cardErrorClass,
  cardFieldClass,
  cardInputClass,
  FieldError,
} from "@/components/billing/card-ui";

const stripePromise = getStripeBrowser();

type BillingCycle = "monthly" | "yearly";
type PriceInfo = { amount: number | null; currency: string };
type PlanPrices = { monthly: PriceInfo; yearly: PriceInfo };

function formatCurrency(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

type CardFieldErrors = {
  name?: string;
  card?: string;
  expiry?: string;
  cvc?: string;
  zip?: string;
};

function SubscribeForm({
  subscriptionId,
  clientSecret,
  cycle,
}: {
  subscriptionId: string;
  clientSecret: string;
  cycle: BillingCycle;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("BR");
  const [zip, setZip] = useState("");
  const [cardComplete, setCardComplete] = useState(false);
  const [expiryComplete, setExpiryComplete] = useState(false);
  const [cvcComplete, setCvcComplete] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CardFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function clearFieldError(field: keyof CardFieldErrors) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function validate(): CardFieldErrors {
    const errs: CardFieldErrors = {};
    if (!name.trim()) errs.name = "Informe o nome como está no cartão.";
    if (!cardComplete) errs.card = fieldErrors.card || "Informe um número de cartão válido.";
    if (!expiryComplete) errs.expiry = fieldErrors.expiry || "Informe a validade.";
    if (!cvcComplete) errs.cvc = fieldErrors.cvc || "Informe o código de segurança (CVC).";
    if (!zip) errs.zip = "Informe o CEP/ZIP.";
    else if (zip.length !== 8) errs.zip = "O CEP/ZIP deve ter 8 dígitos.";
    return errs;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).some((key) => errs[key as keyof CardFieldErrors])) return;

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) return;

    setError(null);
    setSubmitting(true);

    const { error: submitError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardNumber,
        billing_details: {
          name: name || undefined,
          address: { country, postal_code: zip || undefined },
        },
      },
    });

    if (submitError) {
      setError(submitError.message ?? "Não foi possível concluir o pagamento.");
      setSubmitting(false);
      return;
    }

    // Payment succeeded — activate the plan immediately (webhook is a backup).
    await fetch("/api/stripe/subscription/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId, businessName }),
    });

    setDone(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1200);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="h-11 w-11 text-brand-600" />
        <p className="text-sm font-semibold text-slate-800">Pagamento confirmado! Liberando seu acesso...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Billed to */}
      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-semibold text-slate-700">Cobrança para</label>
        <div>
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearFieldError("name");
            }}
            placeholder="Nome como está no cartão"
            className={cn(cardInputClass, "w-full", fieldErrors.name && cardErrorClass)}
          />
          <FieldError message={fieldErrors.name} />
        </div>
        <input
          type="text"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder="Nome do negócio (opcional)"
          className={cn(cardInputClass, "w-full")}
        />
      </div>

      {/* Payment details */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700">Detalhes do pagamento</label>
          <Lock className="h-4 w-4 text-slate-400" />
        </div>

        <div>
          <div className={cn("flex items-center gap-2", cardFieldClass, fieldErrors.card && cardErrorClass)}>
            <div className="min-w-0 flex-1">
              <CardNumberElement
                options={{ showIcon: false, placeholder: "Número do cartão", style: cardElementStyle }}
                onChange={(event) => {
                  setCardComplete(event.complete);
                  setFieldErrors((prev) => ({ ...prev, card: event.error?.message }));
                }}
              />
            </div>
            <BrandLogos />
          </div>
          <FieldError message={fieldErrors.card} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={cn(cardFieldClass, fieldErrors.expiry && cardErrorClass)}>
              <CardExpiryElement
                options={{ placeholder: "MM / AA", style: cardElementStyle }}
                onChange={(event) => {
                  setExpiryComplete(event.complete);
                  setFieldErrors((prev) => ({ ...prev, expiry: event.error?.message }));
                }}
              />
            </div>
            <FieldError message={fieldErrors.expiry} />
          </div>
          <div>
            <div className={cn(cardFieldClass, fieldErrors.cvc && cardErrorClass)}>
              <CardCvcElement
                options={{ placeholder: "CVC", style: cardElementStyle }}
                onChange={(event) => {
                  setCvcComplete(event.complete);
                  setFieldErrors((prev) => ({ ...prev, cvc: event.error?.message }));
                }}
              />
            </div>
            <FieldError message={fieldErrors.cvc} />
          </div>
        </div>

        {/* Fiscal data: billing country + postal code, each on its own row */}
        <select
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          className={cn(cardInputClass, "w-full")}
        >
          {BILLING_COUNTRIES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
        <div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={zip}
            onChange={(event) => {
              setZip(event.target.value.replace(/\D/g, "").slice(0, 8));
              clearFieldError("zip");
            }}
            placeholder="CEP/ZIP"
            className={cn(cardInputClass, "w-full", fieldErrors.zip && cardErrorClass)}
          />
          <FieldError message={fieldErrors.zip} />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !stripe}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Confirmar assinatura
      </button>

      <p className="text-center text-[11px] font-medium text-slate-500">
        {cycle === "yearly"
          ? "Cobrança anual · pagamento único à vista no cartão"
          : "Cobrança mensal · Cancele quando quiser"}
      </p>
      <p className="text-center text-[11px] leading-4 text-slate-400">
        Ao clicar em &quot;Confirmar assinatura&quot;, você concorda com os{" "}
        <Link href="/termos-de-uso" target="_blank" className="font-semibold text-brand-700 hover:underline">
          termos
        </Link>
        .
      </p>
    </form>
  );
}

export default function SubscribePage() {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanType | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [planPrices, setPlanPrices] = useState<PlanPrices | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedPlan = getPlanOrNull(params.get("plan"));
    if (!selectedPlan) {
      router.replace("/dashboard/select-plan");
      return;
    }
    const selectedCycle: BillingCycle = params.get("cycle") === "yearly" ? "yearly" : "monthly";
    setPlan(selectedPlan);
    setCycle(selectedCycle);

    let active = true;

    fetch("/api/stripe/prices")
      .then((response) => response.json())
      .then((data: Partial<Record<PlanType, PlanPrices>>) => {
        if (active && data?.[selectedPlan]) setPlanPrices(data[selectedPlan] ?? null);
      })
      .catch(() => {
        /* price display is best-effort */
      });

    fetch("/api/stripe/subscription/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: selectedPlan, billingCycle: selectedCycle }),
    })
      .then((response) => response.json())
      .then((data: { clientSecret?: string; subscriptionId?: string; error?: string; alreadyActive?: boolean }) => {
        if (!active) return;
        if (data.alreadyActive) {
          router.replace("/dashboard/select-plan");
          return;
        }
        if (data.clientSecret && data.subscriptionId) {
          setClientSecret(data.clientSecret);
          setSubscriptionId(data.subscriptionId);
        } else {
          setError(data.error ?? "Não foi possível iniciar a assinatura.");
        }
      })
      .catch(() => {
        if (active) setError("Não foi possível iniciar a assinatura.");
      });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="mx-auto w-[30%]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/20">
            <Bird className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            {plan ? `Assinar plano ${PLAN_MATRIX[plan].displayName}` : "Assinar plano"}
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Pagamento seguro. Seus dados de cartão vão diretamente para o processador de pagamentos.
          </p>
        </div>

        {/* Highlighted plan price */}
        {plan && (() => {
          const yearlyAmount = planPrices?.yearly.amount ?? null;
          const currency = planPrices?.monthly.currency ?? "brl";
          const isYearly = cycle === "yearly";
          const priceLabel =
            isYearly && yearlyAmount
              ? `${formatCurrency(yearlyAmount, currency)}/ano`
              : PLAN_MATRIX[plan].priceMonthly;
          return (
            <div className="mb-6 flex items-center justify-between rounded-xl border-2 border-brand-500 bg-brand-50/60 px-4 py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                  Plano {PLAN_MATRIX[plan].displayName}
                </p>
                {isYearly && yearlyAmount ? (
                  <div className="text-[11px] font-medium text-slate-500">
                    <p>Pagamento único à vista</p>
                    <p>Cancele quando quiser</p>
                  </div>
                ) : (
                  <p className="text-[11px] font-medium text-slate-500">
                    Cobrança mensal · Cancele quando quiser
                  </p>
                )}
              </div>
              <p className="text-2xl font-extrabold tracking-tight text-brand-700">{priceLabel}</p>
            </div>
          );
        })()}

        {error ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/select-plan")}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Voltar para os planos
            </button>
          </div>
        ) : clientSecret && subscriptionId ? (
          <Elements stripe={stripePromise}>
            <SubscribeForm subscriptionId={subscriptionId} clientSecret={clientSecret} cycle={cycle} />
          </Elements>
        ) : (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}
      </div>
    </div>
  );
}
