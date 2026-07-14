"use client";

import { useEffect, useState } from "react";
import { Bird, Check, CheckCircle2, Loader2, Lock, X } from "lucide-react";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import ModalPortal from "@/components/ui/modal-portal";
import { useAuth } from "@/components/auth/auth-provider";
import { getStripeBrowser } from "@/lib/stripe/browser";
import { cn } from "@/lib/utils";
import { PLAN_MATRIX } from "@/lib/plans";
import {
  BILLING_COUNTRIES,
  BrandLogos,
  cardElementStyle,
  cardErrorClass,
  cardFieldClass,
  cardInputClass,
  FieldError,
} from "@/components/billing/card-ui";
import type { PlanType } from "./plan-provider";

const stripePromise = getStripeBrowser();

type PayablePlan = Exclude<PlanType, "essencial">;
type BillingCycle = "monthly" | "yearly";
type PriceInfo = { amount: number | null; currency: string };
type PlanPrices = { monthly: PriceInfo; yearly: PriceInfo };
type PricesResponse = Record<PayablePlan, PlanPrices>;

type CardFieldErrors = {
  name?: string;
  card?: string;
  expiry?: string;
  cvc?: string;
  zip?: string;
};

interface UpgradePopupProps {
  open: boolean;
  onClose: () => void;
  targetPlan: PayablePlan;
}

function formatCurrency(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function PaymentModalContent({ targetPlan, onClose }: { targetPlan: PayablePlan; onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user, refreshProfile } = useAuth();

  const [prices, setPrices] = useState<PlanPrices | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
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

  const meta = PLAN_MATRIX[targetPlan];

  useEffect(() => {
    let active = true;
    fetch("/api/stripe/prices")
      .then((response) => response.json())
      .then((data: PricesResponse) => {
        if (active && data[targetPlan]) setPrices(data[targetPlan]);
      })
      .catch(() => {
        /* prices are best-effort */
      });
    return () => {
      active = false;
    };
  }, [targetPlan]);

  const monthlyAmount = prices?.monthly.amount ?? null;
  const yearlyAmount = prices?.yearly.amount ?? null;
  const currency = prices?.monthly.currency ?? "brl";
  const savingsPct =
    monthlyAmount && yearlyAmount
      ? Math.max(0, Math.round((1 - yearlyAmount / (monthlyAmount * 12)) * 100))
      : 0;
  const totalLabel =
    billingCycle === "monthly"
      ? `${formatCurrency(monthlyAmount, currency)}/mês`
      : `${formatCurrency(yearlyAmount, currency)}/ano`;

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
    if (!user) {
      setError("Entre novamente para assinar o plano.");
      return;
    }

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).some((key) => errs[key as keyof CardFieldErrors])) return;

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) return;

    setError(null);
    setSubmitting(true);

    // Create the subscription for the selected billing cycle.
    const createResponse = await fetch("/api/stripe/subscription/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: targetPlan, billingCycle }),
    });
    const created = (await createResponse.json()) as {
      clientSecret?: string;
      subscriptionId?: string;
      error?: string;
      alreadyActive?: boolean;
    };

    if (created.alreadyActive) {
      setError("Você já possui uma assinatura ativa.");
      setSubmitting(false);
      return;
    }
    if (!createResponse.ok || !created.clientSecret || !created.subscriptionId) {
      setError(created.error ?? "Não foi possível iniciar o pagamento.");
      setSubmitting(false);
      return;
    }

    const { error: payError } = await stripe.confirmCardPayment(created.clientSecret, {
      payment_method: {
        card: cardNumber,
        billing_details: {
          name: name || undefined,
          address: { country, postal_code: zip || undefined },
        },
      },
    });

    if (payError) {
      setError(payError.message ?? "Não foi possível concluir o pagamento.");
      setSubmitting(false);
      return;
    }

    await fetch("/api/stripe/subscription/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId: created.subscriptionId, businessName }),
    });
    await refreshProfile();

    setDone(true);
    // Full reload so plan gating everywhere reflects the new plan.
    setTimeout(() => window.location.reload(), 1300);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-brand-600" />
        <p className="text-base font-bold text-slate-900">Plano ativado!</p>
        <p className="text-sm text-slate-500">Liberando seu acesso...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-2">
      {/* Left: billed to + payment details */}
      <div className="flex flex-col gap-6">
        <div>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/20">
            <Bird className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Assinar plano {meta.displayName}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Desbloqueie os recursos {meta.displayName} da sua granja.
          </p>
        </div>

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
      </div>

      {/* Right: billing options + total + submit */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <label className="text-sm font-semibold text-slate-700">Forma de cobrança</label>

          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors",
              billingCycle === "monthly" ? "border-brand-500 bg-brand-50/40" : "border-slate-200 hover:border-slate-300"
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border-2", billingCycle === "monthly" ? "border-brand-500" : "border-slate-300")}>
                {billingCycle === "monthly" && <span className="h-2 w-2 rounded-full bg-brand-500" />}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">Pagar mensalmente</p>
                <p className="text-xs text-slate-500">{formatCurrency(monthlyAmount, currency)} / mês</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={cn(
              "flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors",
              billingCycle === "yearly" ? "border-brand-500 bg-brand-50/40" : "border-slate-200 hover:border-slate-300"
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border-2", billingCycle === "yearly" ? "border-brand-500" : "border-slate-300")}>
                {billingCycle === "yearly" && <span className="h-2 w-2 rounded-full bg-brand-500" />}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">Pagar anualmente</p>
                <p className="text-xs text-slate-500">
                  {yearlyAmount ? `${formatCurrency(Math.round(yearlyAmount / 12), currency)} / mês` : "—"}
                </p>
              </div>
            </div>
            {savingsPct > 0 && (
              <span className="text-sm font-bold text-emerald-600">Economize {savingsPct}%</span>
            )}
          </button>
        </div>

        <ul className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
          {meta.benefits.slice(0, 5).map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm text-slate-600">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              {benefit}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-xl font-bold text-slate-950">{totalLabel}</span>
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !stripe}
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Assinar plano {meta.displayName}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-center text-xs font-medium text-slate-400 hover:text-slate-600 disabled:opacity-60"
          >
            Agora não
          </button>
          <p className="text-center text-[11px] leading-4 text-slate-400">
            Ao continuar, você autoriza o Granja Pro a cobrar seu cartão conforme os termos. Cancele quando quiser.
          </p>
        </div>
      </div>
    </form>
  );
}

export function UpgradePopup({ open, onClose, targetPlan }: UpgradePopupProps) {
  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
          <Elements stripe={stripePromise}>
            <PaymentModalContent targetPlan={targetPlan} onClose={onClose} />
          </Elements>
        </div>
      </div>
    </ModalPortal>
  );
}
