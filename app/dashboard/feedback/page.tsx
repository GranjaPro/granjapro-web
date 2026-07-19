"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AlertCircle, Check, Loader2, MessageSquare, Star } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { createFeedback } from "@/lib/services/feedback";
import { cn } from "@/lib/utils";

const FEEDBACK_CATEGORIES = ["Satisfacao", "Bug", "Sugestao", "Dificuldade", "Outro"] as const;
type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
type CategorySelection = FeedbackCategory | "";

type FieldErrors = {
  rating?: string;
  category?: string;
};

const DESCRIPTION_PLACEHOLDER = "Ex: tive dificuldade para registrar uma tarefa no celular.";
const SUBMIT_ERROR_MESSAGE = "Nao foi possivel enviar seu feedback. Revise os campos destacados e tente novamente.";
const CONTEXT_LOADING_MESSAGE = "Carregando o contexto da sua granja. Aguarde para enviar o feedback.";

function isFeedbackCategory(value: string): value is FeedbackCategory {
  return FEEDBACK_CATEGORIES.some((feedbackCategory) => feedbackCategory === value);
}

export default function FeedbackPage() {
  const { user, farm } = useAuth();
  const [rating, setRating] = useState<number | null>(null);
  const [category, setCategory] = useState<CategorySelection>("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const hasRequiredContext = Boolean(user?.id && farm?.id);
  const hasRequiredFields = Boolean(rating && category);
  const canSubmit = hasRequiredContext && hasRequiredFields && !isSaving;

  function updateRating(nextRating: number) {
    setRating(nextRating);
    setSubmitError(null);
    setSuccessMessage(null);
    setFieldErrors((current) => ({ ...current, rating: undefined }));
  }

  function updateCategory(nextCategory: string) {
    const safeCategory = isFeedbackCategory(nextCategory) ? nextCategory : "";
    setSubmitError(null);
    setSuccessMessage(null);
    setFieldErrors((current) => ({ ...current, category: undefined }));
    setCategory(safeCategory);
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};
    if (!rating) {
      nextErrors.rating = "Escolha uma nota de 1 a 5 estrelas para continuar.";
    }
    if (!category) {
      nextErrors.category = "Selecione uma categoria antes de enviar para classificar o feedback.";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function clearForm() {
    setRating(null);
    setCategory("");
    setDescription("");
    setFieldErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    if (!hasRequiredContext || !user?.id || !farm?.id) {
      setSubmitError(CONTEXT_LOADING_MESSAGE);
      return;
    }

    if (!validateForm() || !rating || !category) {
      return;
    }

    setIsSaving(true);
    try {
      const trimmedDescription = description.trim();
      await createFeedback({
        user_id: user.id,
        farm_id: farm.id,
        rating,
        category,
        description: trimmedDescription ? trimmedDescription : null,
      });
      clearForm();
      setSuccessMessage("Obrigado por ajudar a melhorar o Granja Pro.");
    } catch {
      setSubmitError(SUBMIT_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight tracking-normal text-slate-950 dark:text-white">
              Feedback
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Conte como o Granja Pro esta ajudando sua rotina ou onde podemos melhorar.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900 sm:p-6">
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/40">
            <h2 className="text-base font-semibold leading-tight text-slate-950 dark:text-white">
              Compartilhe sua experiencia
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Escolha uma nota, selecione uma categoria e, se quiser, descreva rapidamente o que aconteceu.
            </p>
          </div>

          {submitError && (
            <StatusBanner tone="error" icon={<AlertCircle className="h-4 w-4 shrink-0" />}>
              {submitError}
            </StatusBanner>
          )}

          {successMessage && (
            <StatusBanner tone="success" icon={<Check className="h-4 w-4 shrink-0" />}>
              <strong className="block font-semibold text-brand-900 dark:text-brand-50">Feedback enviado</strong>
              <span className="block">{successMessage}</span>
            </StatusBanner>
          )}

          {!hasRequiredContext && (
            <StatusBanner tone="info" icon={<Loader2 className="h-4 w-4 shrink-0 animate-spin" />}>
              {CONTEXT_LOADING_MESSAGE}
            </StatusBanner>
          )}

          <Field label="Nota" error={fieldErrors.rating}>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Nota">
              {[1, 2, 3, 4, 5].map((value) => {
                const selected = rating !== null && value <= rating;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateRating(value)}
                    disabled={isSaving}
                    aria-checked={rating === value}
                    role="radio"
                    className={cn(
                      "flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900",
                      selected
                        ? "border-brand-500 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-300"
                        : "border-slate-200 bg-white text-slate-300 hover:border-brand-300 hover:text-brand-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-600 dark:hover:border-brand-400 dark:hover:text-brand-300"
                    )}
                  >
                    <Star className={cn("h-5 w-5", selected && "fill-current")} />
                    <span className="sr-only">{value} estrelas</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Categoria" error={fieldErrors.category}>
            <select
              value={category}
              onChange={(event) => updateCategory(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800/60"
            >
              <option value="">Selecione uma categoria</option>
              {FEEDBACK_CATEGORIES.map((feedbackCategory) => (
                <option key={feedbackCategory} value={feedbackCategory}>
                  {feedbackCategory}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Descricao opcional"
            helper="Ajude com um detalhe rapido se algo travou, confundiu ou funcionou bem."
          >
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSaving}
              rows={5}
              placeholder={DESCRIPTION_PLACEHOLDER}
              className="min-h-32 w-full resize-y rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-6 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800/60"
            />
          </Field>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              A descricao e opcional, mas ajuda a entender melhor sua experiencia.
            </p>
            <button
              type="submit"
              disabled={!canSubmit}
              aria-disabled={!canSubmit}
              className={cn(
                "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:focus-visible:ring-offset-slate-900 dark:disabled:bg-slate-700",
                !canSubmit && "opacity-70"
              )}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSaving ? "Enviando feedback" : "Enviar feedback"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  helper,
  error,
  children,
}: {
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-semibold leading-snug text-slate-600 dark:text-slate-300">
        {label}
      </span>
      {children}
      {helper ? (
        <span className="mt-2 block break-words text-sm leading-6 text-slate-500 dark:text-slate-400">
          {helper}
        </span>
      ) : null}
      {error ? (
        <span className="mt-2 block break-words text-sm leading-6 font-medium text-red-700 dark:text-red-300">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function StatusBanner({
  tone,
  icon,
  children,
}: {
  tone: "error" | "success" | "info";
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2 rounded-lg border px-4 py-3 text-sm leading-6",
        tone === "error"
          ? "border-red-400/30 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200"
          : tone === "success"
            ? "border-brand-400/30 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-100"
            : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-300"
      )}
    >
      {icon}
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}
