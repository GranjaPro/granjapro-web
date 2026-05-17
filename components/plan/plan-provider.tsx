"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { DEFAULT_PLAN, getPlanOrNull, parsePlan, type PlanType } from "@/lib/plans";

export type { PlanType } from "@/lib/plans";

const HIDE_ADVANCED_FEATURES_KEY = "granjapro-hide-advanced-features";

interface PlanContextType {
  plan: PlanType;
  hasValidPlan: boolean;
  hideAdvancedFeatures: boolean;
  setPlan: (plan: PlanType) => void;
  setHideAdvancedFeatures: (hide: boolean) => void;
}

const PlanContext = createContext<PlanContextType>({
  plan: DEFAULT_PLAN,
  hasValidPlan: false,
  hideAdvancedFeatures: false,
  setPlan: () => {},
  setHideAdvancedFeatures: () => {},
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [plan, setPlan] = useState<PlanType>(DEFAULT_PLAN);
  const [hasValidPlan, setHasValidPlan] = useState(false);
  const [hideAdvancedFeatures, setHideAdvancedFeaturesState] = useState(false);

  useEffect(() => {
    setPlan(parsePlan(profile?.plan));
    setHasValidPlan(getPlanOrNull(profile?.plan) !== null);
  }, [profile]);

  useEffect(() => {
    setHideAdvancedFeaturesState(window.localStorage.getItem(HIDE_ADVANCED_FEATURES_KEY) === "true");
  }, []);

  useEffect(() => {
    if (plan === "premium" && hideAdvancedFeatures) {
      setHideAdvancedFeatures(false);
    }
  }, [hideAdvancedFeatures, plan]);

  const setHideAdvancedFeatures = (hide: boolean) => {
    setHideAdvancedFeaturesState(hide);
    window.localStorage.setItem(HIDE_ADVANCED_FEATURES_KEY, String(hide));
  };

  return (
    <PlanContext.Provider value={{ plan, hasValidPlan, hideAdvancedFeatures, setPlan, setHideAdvancedFeatures }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);
