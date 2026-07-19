"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

export function TrialEndedModal() {
  const { signOut } = useAuth();

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl dark:border-white/10 dark:bg-slate-900">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/25">
        <Sparkles className="h-7 w-7 text-white" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
        Seu teste grátis terminou
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Obrigado por experimentar o Granja Pro nestes 7 dias! Esperamos que tenha ajudado a organizar
        sua granja. Para continuar com todos os recursos, faça o upgrade para um plano.
      </p>
      <button
        type="button"
        onClick={() => {
          window.location.href = "/dashboard/select-plan";
        }}
        className="mt-6 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400"
      >
        Fazer upgrade
        <ArrowRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={signOut}
        className="mt-3 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Sair
      </button>
    </div>
  );
}
