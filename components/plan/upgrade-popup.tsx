"use client";

import { X, Sparkles, Check } from "lucide-react";
import ModalPortal from "@/components/ui/modal-portal";
import type { PlanType } from "./plan-provider";

interface UpgradePopupProps {
  open: boolean;
  onClose: () => void;
  targetPlan: Exclude<PlanType, "essencial">;
}

const planFeatures: Record<string, { title: string; price: string; features: string[] }> = {
  pro: {
    title: "Profissional",
    price: "R$ 69,90/mês",
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
    price: "R$ 99,90/mês",
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
  if (!open) return null;

  const plan = planFeatures[targetPlan];

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
              onClick={onClose}
              className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-lg shadow-amber-500/25"
            >
              Ativar plano {plan.title}
            </button>
            <button
              onClick={onClose}
              className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

