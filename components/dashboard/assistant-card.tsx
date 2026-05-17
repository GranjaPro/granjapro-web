"use client";

import { AlertTriangle, Lightbulb, TrendingUp, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasMinimumPlan, type PlanType } from "@/lib/plans";
import { LockedOverlay } from "@/components/plan/locked-overlay";
import { RequiredPlanBadge } from "@/components/plan/plan-badge";
import { usePlan } from "@/components/plan/plan-provider";

interface AssistantCardProps {
  title?: string;
  subtitle: string;
  requiredPlan?: Exclude<PlanType, "essencial">;
  lockedMessage?: string;
  icon?: LucideIcon;
  className?: string;
  contentClassName?: string;
  iconClassName?: string;
  iconWrapClassName?: string;
  badgeClassName?: string;
  headerClassName?: string;
  children: React.ReactNode;
}

export function AssistantCard({
  title = "Assistente de Granja",
  subtitle,
  requiredPlan = "premium",
  lockedMessage: _lockedMessage,
  icon: Icon = Zap,
  className,
  contentClassName,
  iconClassName,
  iconWrapClassName,
  badgeClassName,
  headerClassName,
  children,
}: AssistantCardProps) {
  const { plan, hideAdvancedFeatures } = usePlan();
  const hasAccess = hasMinimumPlan(plan, requiredPlan);

  if (hideAdvancedFeatures && !hasAccess) return null;

  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 p-6 flex flex-col", className)}>
        <div className={cn("flex items-center justify-between mb-5", headerClassName)}>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm",
                iconWrapClassName
              )}
            >
              <Icon className={cn("w-5 h-5 text-white", iconClassName)} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
              <p className="text-[11px] text-gray-400 font-medium">{subtitle}</p>
            </div>
          </div>
          <RequiredPlanBadge requiredPlan={requiredPlan} className={cn("flex-shrink-0", badgeClassName)} />
        </div>
      {hasAccess ? (
        <div className={contentClassName}>{children}</div>
      ) : (
        <AssistantLockedPreview
          className={contentClassName}
          lockedMessage={_lockedMessage ?? `Desbloqueie ${title}`}
          requiredPlan={requiredPlan}
        />
      )}
    </div>
  );
}

export function AssistantLockedPreview({
  lockedMessage,
  requiredPlan = "premium",
  overlayClassName,
  className,
  itemClassName,
}: {
  lockedMessage: string;
  requiredPlan?: Exclude<PlanType, "essencial">;
  overlayClassName?: string;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <LockedOverlay message={lockedMessage} targetPlan={requiredPlan} className={overlayClassName}>
      <div className={cn("space-y-3 flex-1", className)}>
        {[
          {
            type: "warning" as const,
            icon: AlertTriangle,
            title: "Queda relevante detectada no período",
            detail: "Relatório identifica a origem provável e sugere ação imediata.",
          },
          {
            type: "success" as const,
            icon: TrendingUp,
            title: "Indicador com melhora acima da média",
            detail: "Comparativo mostra tendência positiva nos dados recentes.",
          },
          {
            type: "info" as const,
            icon: Lightbulb,
            title: "Oportunidade de otimização encontrada",
            detail: "Análise cruza histórico, custos e operação para recomendar próximos passos.",
          },
        ].map((item, index) => (
          <div
            key={index}
            className={cn(
              "rounded-xl px-4 py-3 border-l-[3px]",
              item.type === "warning" && "bg-amber-50/60 border-l-amber-500",
              item.type === "success" && "bg-emerald-50/60 border-l-emerald-500",
              item.type === "info" && "bg-blue-50/60 border-l-blue-500",
              itemClassName
            )}
          >
            <div className="flex items-start gap-2.5">
              <item.icon className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
              <div>
                <p className="text-[13px] font-semibold text-gray-600">{item.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{item.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </LockedOverlay>
  );
}
