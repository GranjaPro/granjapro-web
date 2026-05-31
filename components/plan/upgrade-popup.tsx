"use client";

import { useState } from "react";
import { X, Sparkles, Check, Loader2, AlertCircle } from "lucide-react";
import ModalPortal from "@/components/ui/modal-portal";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { PLAN_MATRIX } from "@/lib/plans";
import type { PlanType } from "./plan-provider";

interface UpgradePopupProps {
  open: boolean;
  onClose: () => void;
  targetPlan: Exclude<PlanType, "essencial">;
}

const planFeatures: Record<string, { title: string; price: string; features: string[] }> = {
  pro: {
    title: "Profissional",
    price: PLAN_MATRIX.pro.priceMonthly.replace("/mes", "/mês"),
    features: [
      "Finanças completas (receita, despesas)",
      "Gestão de vendas e clientes",
      "Gestão de trabalhadores",
      "Equipamentos e estoque",
      "Relatórios PDF & Excel",
      "Assistente IA (modo simples)",
      "Condições ambientais dos galpões",
      "Alertas ilimitados",
      "Até 3 fazendas",
    ],
  },
  premium: {
    title: "Premium",
    price: PLAN_MATRIX.premium.priceMonthly.replace("/mes", "/mês"),
    features: [
      "Tudo do plano Profissional",
      "Assistente IA completo (detalhado + diagnóstico)",
      "Tarefas ilimitadas",
      "Assistente de Granja completo",
      "Fazendas ilimitadas",
      "Alertas e notificações avançadas",
      "Suporte prioritário",
    ],
  },
};

export function UpgradePopup({ open, onClose, targetPlan }: UpgradePopupProps) {
  const { user, refreshProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const plan = planFeatures[targetPlan];

  async function activatePlan() {
    if (!user) {
      setError("Entre novamente para ativar o plano.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        plan: targetPlan,
        trial_started_at: null,
        trial_ends_at: null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError("Nao foi possivel salvar sua escolha. Tente novamente.");
      setSubmitting(false);
      return;
    }

    await refreshProfile();
    setSubmitting(false);
    onClose();
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white dark:bg-slate-950 rounded-2xl shadow-2xl dark:shadow-black/50 max-w-md w-full animate-in fade-in zoom-in-95 duration-200 overflow-hidden border border-transparent dark:border-white/10">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Plano {plan.title}</span>
            </div>
            <p className="text-2xl font-bold">{plan.price}</p>
            <p className="text-sm text-white/80 mt-1">Desbloqueie todo o potencial da sua granja</p>
          </div>
          <div className="p-6">
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">O que você ganha:</p>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-200">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <ul className="space-y-3">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-slate-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={activatePlan}
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Ativar plano {plan.title}
            </button>
            <button
              onClick={onClose}
              disabled={submitting}
              className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

