"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasMinimumPlan, PLAN_MATRIX, type PlanType } from "@/lib/plans";
import { usePlan } from "@/components/plan/plan-provider";

const PLAN_BADGE_LABEL: Record<PlanType, string> = {
  essencial: "ESSENCIAL",
  pro: "PRO",
  premium: "PREMIUM",
};

const badgeBase =
  "inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-500 bg-opacity-20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:border-amber-500/40 dark:bg-amber-500 dark:bg-opacity-20 dark:text-amber-600";

interface PlanBadgeProps {
  className?: string;
  label?: string;
  plan?: PlanType;
}

export function PlanBadge({ className, label, plan }: PlanBadgeProps) {
  return (
    <span className={cn(badgeBase, className)}>
      <Sparkles className="h-3 w-3" />
      {label ?? (plan ? PLAN_BADGE_LABEL[plan] : null)}
    </span>
  );
}

interface ActivePlanBadgeProps {
  className?: string;
  plan: PlanType;
  trialDaysRemaining?: number;
}

export function ActivePlanBadge({ className, plan, trialDaysRemaining }: ActivePlanBadgeProps) {
  const planName = PLAN_MATRIX[plan].displayName.toLowerCase();
  const trialSuffix =
    trialDaysRemaining !== undefined
      ? ` (teste gratis: ${trialDaysRemaining} dia${trialDaysRemaining === 1 ? "" : "s"} restante${trialDaysRemaining === 1 ? "" : "s"})`
      : "";

  return <PlanBadge className={className} label={`Conta ${planName} ativa${trialSuffix}`} />;
}

interface RequiredPlanBadgeProps {
  className?: string;
  requiredPlan: PlanType;
}

export function RequiredPlanBadge({ className, requiredPlan }: RequiredPlanBadgeProps) {
  const { plan, hasValidPlan, hideAdvancedFeatures } = usePlan();
  if (hasValidPlan && hasMinimumPlan(plan, requiredPlan)) return null;
  if (hideAdvancedFeatures && !hasMinimumPlan(plan, requiredPlan)) return null;
  return <PlanBadge className={className} plan={requiredPlan} />;
}
