"use client";

import { useEffect, useState } from "react";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { AlertCircle, Bird, CheckCircle2, CreditCard, Loader2, Lock } from "lucide-react";
import { getStripeBrowser } from "@/lib/stripe/browser";
import { cn } from "@/lib/utils";
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

type CardFieldErrors = {
  name?: string;
  card?: string;
  expiry?: string;
  cvc?: string;
  zip?: string;
};

async function applyPaymentMethod(
  paymentMethodId: string,
  businessName: string
): Promise<string | null> {
  const response = await fetch("/api/stripe/payment-method/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentMethodId, businessName }),
  });
  const result = (await response.json()) as { updated?: boolean; error?: string };
  if (!response.ok || !result.updated) {
    return result.error ?? "Não foi possível atualizar o cartão.";
  }
  return null;
}

function UpdateCardForm({ clientSecret }: { clientSecret: string | null }) {
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
    if (!stripe || !elements || !clientSecret) return;

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).some((key) => errs[key as keyof CardFieldErrors])) return;

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) return;

    setError(null);
    setSubmitting(true);

    const { error: submitError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardNumber,
        billing_details: {
          name: name || undefined,
          address: {
            country,
            postal_code: zip || undefined,
          },
        },
      },
    });

    if (submitError) {
      setError(submitError.message ?? "Não foi possível validar o cartão.");
      setSubmitting(false);
      return;
    }

    const pm = setupIntent?.payment_method;
    const paymentMethodId = typeof pm === "string" ? pm : pm?.id ?? null;
    if (!paymentMethodId) {
      setError("Não foi possível identificar o novo cartão.");
      setSubmitting(false);
      return;
    }

    const applyError = await applyPaymentMethod(paymentMethodId, businessName);
    if (applyError) {
      setError(applyError);
      setSubmitting(false);
      return;
    }

    setDone(true);
    // Full reload so the dashboard layout re-fetches billing status (not the
    // cached "blocked" state) and access is restored.
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1200);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="h-11 w-11 text-brand-600" />
        <p className="text-sm font-semibold text-slate-800">Cartão atualizado! Redirecionando...</p>
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
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        Salvar cartão
      </button>

      <p className="text-xs leading-5 text-slate-500">
        Ao fornecer os dados do seu cartão, você autoriza o Granja Pro a cobrar cobranças futuras da
        sua assinatura de acordo com os termos.
      </p>
    </form>
  );
}

export default function UpdateCardPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/stripe/payment-method/setup", { method: "POST" })
      .then((response) => response.json())
      .then((data: { clientSecret?: string; error?: string }) => {
        if (!active) return;
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else setFetchError(data.error ?? "Não foi possível iniciar a atualização do cartão.");
      })
      .catch(() => {
        if (active) setFetchError("Não foi possível iniciar a atualização do cartão.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto w-[30%]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/20">
            <Bird className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Atualizar cartão</h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Cadastre um novo cartão para manter sua assinatura ativa.
          </p>
        </div>

        {fetchError ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {fetchError}
          </div>
        ) : (
          <Elements stripe={stripePromise}>
            <UpdateCardForm clientSecret={clientSecret} />
          </Elements>
        )}
      </div>
    </div>
  );
}
