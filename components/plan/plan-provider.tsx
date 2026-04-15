"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export type PlanType = "essencial" | "pro" | "premium";

interface PlanContextType {
  plan: PlanType;
  setPlan: (plan: PlanType) => void;
}

const PlanContext = createContext<PlanContextType>({
  plan: "essencial",
  setPlan: () => {},
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [plan, setPlan] = useState<PlanType>("essencial");

  useEffect(() => {
    if (profile?.plan) {
      setPlan(profile.plan as PlanType);
    }
  }, [profile]);

  return (
    <PlanContext.Provider value={{ plan, setPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);
