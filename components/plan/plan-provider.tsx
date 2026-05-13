"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { DEFAULT_PLAN, getPlanOrNull, parsePlan, type PlanType } from "@/lib/plans";

export type { PlanType } from "@/lib/plans";

interface PlanContextType {
  plan: PlanType;
  hasValidPlan: boolean;
  setPlan: (plan: PlanType) => void;
}

const PlanContext = createContext<PlanContextType>({
  plan: DEFAULT_PLAN,
  hasValidPlan: false,
  setPlan: () => {},
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [plan, setPlan] = useState<PlanType>(DEFAULT_PLAN);
  const [hasValidPlan, setHasValidPlan] = useState(false);

  useEffect(() => {
    setPlan(parsePlan(profile?.plan));
    setHasValidPlan(getPlanOrNull(profile?.plan) !== null);
  }, [profile]);

  return (
    <PlanContext.Provider value={{ plan, hasValidPlan, setPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);
