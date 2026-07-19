"use client";

import { CalendarFilter } from "./calendar-filter";
import { usePlan } from "@/components/plan/plan-provider";
import { hasMinimumPlan, type PlanType } from "@/lib/plans";

interface PlanAwareCalendarFilterProps {
  minimumPlan?: PlanType;
}

export function PlanAwareCalendarFilter({ minimumPlan = "pro" }: PlanAwareCalendarFilterProps) {
  const { plan } = usePlan();

  if (!hasMinimumPlan(plan, minimumPlan)) return null;

  return <CalendarFilter />;
}
