export const PLAN_TYPES = ["essencial", "pro", "premium"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const AI_RESPONSE_MODES = ["simple", "detailed", "diagnostic"] as const;
export type AIResponseMode = (typeof AI_RESPONSE_MODES)[number];

export type CapabilityKey =
  | "ai_assistant"
  | "reports"
  | "workers"
  | "environmental_conditions"
  | "advanced_insights"
  | "farm_management"
  | "task_management";

type LimitValue = number | null | "limited" | "expanded" | "basic" | "advanced" | "complete";

export const DEFAULT_PLAN: PlanType = "essencial";
export const TRIAL_DAYS = 7;

export const PLAN_ORDER: Record<PlanType, number> = {
  essencial: 0,
  pro: 1,
  premium: 2,
};

export const CAPABILITIES: Record<
  CapabilityKey,
  {
    minimumPlan: PlanType;
    label: string;
    routes?: string[];
    surfaces?: string[];
  }
> = {
  ai_assistant: {
    minimumPlan: "essencial",
    label: "Assistente IA",
    routes: ["/dashboard/ai"],
  },
  reports: {
    minimumPlan: "pro",
    label: "Relatorios",
    routes: ["/dashboard/reports"],
  },
  workers: {
    minimumPlan: "pro",
    label: "Funcionarios",
    routes: ["/dashboard/workers"],
  },
  environmental_conditions: {
    minimumPlan: "pro",
    label: "Condicoes ambientais",
    routes: ["/dashboard/barns"],
    surfaces: ["barn_environmental_section"],
  },
  advanced_insights: {
    minimumPlan: "pro",
    label: "Insights avancados",
  },
  farm_management: {
    minimumPlan: "essencial",
    label: "Gestao da granja",
  },
  task_management: {
    minimumPlan: "essencial",
    label: "Tarefas e rotinas",
  },
};

export const AI_MODE_META: Record<
  AIResponseMode,
  {
    label: string;
    description: string;
    creditCost: number;
  }
> = {
  simple: {
    label: "Resumo simples",
    description: "Resposta rapida e direta",
    creditCost: 1,
  },
  detailed: {
    label: "Analise detalhada",
    description: "Dados e comparativos",
    creditCost: 3,
  },
  diagnostic: {
    label: "Diagnostico com recomendacoes",
    description: "Analise completa + plano de acao",
    creditCost: 5,
  },
};

export const PLAN_MATRIX: Record<
  PlanType,
  {
    displayName: string;
    commercialName: string;
    priceMonthly: string;
    limits: {
      birds: number | null;
      users: number;
      farms: number | null;
      tasks: LimitValue;
      insights: LimitValue;
      aiCreditsMonthly: number;
    };
    benefits: string[];
    excluded?: string[];
    capabilities: typeof CAPABILITIES;
    ai: {
      monthlyCredits: number;
      allowedModes: AIResponseMode[];
    };
  }
> = {
  essencial: {
    displayName: "Essencial",
    commercialName: "ESSENCIAL",
    priceMonthly: "R$ 44,90/mes",
    limits: {
      birds: 300,
      users: 1,
      farms: 1,
      tasks: "limited",
      insights: "basic",
      aiCreditsMonthly: 15,
    },
    benefits: [
      "Controle basico da producao de ovos",
      "Controle basico de racao e estoque",
      "Acompanhamento de mortalidade",
      "Registro de vendas e clientes",
      "Ate 300 galinhas",
      "1 usuario",
      "Ate 15 analises com IA por mes",
    ],
    excluded: [
      "Relatorios avancados",
      "Exportacao de dados",
      "Alertas automaticos",
      "IA completa com recomendacoes continuas",
    ],
    capabilities: CAPABILITIES,
    ai: {
      monthlyCredits: 15,
      allowedModes: [...AI_RESPONSE_MODES],
    },
  },
  pro: {
    displayName: "Profissional",
    commercialName: "PROFISSIONAL",
    priceMonthly: "R$ 66,90/mes",
    limits: {
      birds: 1000,
      users: 2,
      farms: 2,
      tasks: "expanded",
      insights: "advanced",
      aiCreditsMonthly: 30,
    },
    benefits: [
      "Tudo do Essencial",
      "Calculo de lucro automatico",
      "Alertas quando sua producao cair",
      "IA que analisa sua granja e sugere melhorias",
      "Comparacao semanal e mensal",
      "Controle por lote e periodo",
      "Previsao de producao e custos",
      "Relatorios em PDF e Excel",
      "Gestao de colaboradores",
      "Ate 1000 galinhas",
      "Ate 2 usuarios",
      "Ate 30 analises com IA por mes",
    ],
    excluded: [
      "IA avancada com analises continuas",
      "Comparacao com outras granjas",
      "Ranking de desempenho",
      "Alertas automaticos inteligentes",
      "Gestao ilimitada de tarefas e rotinas",
      "Historico completo ilimitado",
      "Galinhas ilimitadas",
      "Ate 5 usuarios",
      "Ate 60 analises com IA por mes",
      "Suporte prioritario",
    ],
    capabilities: CAPABILITIES,
    ai: {
      monthlyCredits: 30,
      allowedModes: [...AI_RESPONSE_MODES],
    },
  },
  premium: {
    displayName: "Premium",
    commercialName: "PREMIUM",
    priceMonthly: "R$ 99,90/mes",
    limits: {
      birds: null,
      users: 5,
      farms: null,
      tasks: null,
      insights: "complete",
      aiCreditsMonthly: 60,
    },
    benefits: [
      "Tudo do Profissional",
      "IA avancada com analises continuas",
      "Comparacao com outras granjas",
      "Ranking de desempenho",
      "Alertas automaticos inteligentes",
      "Gestao ilimitada de tarefas e rotinas",
      "Historico completo ilimitado",
      "Galinhas ilimitadas",
      "Ate 5 usuarios",
      "Ate 60 analises com IA por mes",
      "Suporte prioritario",
    ],
    capabilities: CAPABILITIES,
    ai: {
      monthlyCredits: 60,
      allowedModes: [...AI_RESPONSE_MODES],
    },
  },
};

export function isValidPlan(value: unknown): value is PlanType {
  return typeof value === "string" && PLAN_TYPES.includes(value as PlanType);
}

export function parsePlan(value: unknown): PlanType {
  return isValidPlan(value) ? value : DEFAULT_PLAN;
}

export function getPlanOrNull(value: unknown): PlanType | null {
  return isValidPlan(value) ? value : null;
}

export function hasMinimumPlan(plan: PlanType, minimumPlan: PlanType): boolean {
  return PLAN_ORDER[plan] >= PLAN_ORDER[minimumPlan];
}

export function canAccessCapability(plan: PlanType, capability: CapabilityKey): boolean {
  return hasMinimumPlan(plan, CAPABILITIES[capability].minimumPlan);
}

export function getRequiredPlan(capability: CapabilityKey): PlanType {
  return CAPABILITIES[capability].minimumPlan;
}

export function getPlanLimits(plan: PlanType) {
  return PLAN_MATRIX[plan].limits;
}

export function isValidAIResponseMode(value: unknown): value is AIResponseMode {
  return typeof value === "string" && AI_RESPONSE_MODES.includes(value as AIResponseMode);
}

export function getAICreditCost(mode: AIResponseMode): number {
  return AI_MODE_META[mode].creditCost;
}

export function hasUsedTrial(profile: { trial_used_at: string | null } | null | undefined): boolean {
  return Boolean(profile?.trial_used_at);
}

export function isTrialActive(
  profile: { trial_ends_at: string | null } | null | undefined,
  now = new Date()
): boolean {
  if (!profile?.trial_ends_at) return false;
  return new Date(profile.trial_ends_at).getTime() > now.getTime();
}

export function isTrialExpired(
  profile: { trial_ends_at: string | null; trial_used_at: string | null } | null | undefined,
  now = new Date()
): boolean {
  if (!profile?.trial_used_at || !profile.trial_ends_at) return false;
  return new Date(profile.trial_ends_at).getTime() <= now.getTime();
}

export function requiresPlanSelection(
  profile:
    | {
        plan: unknown;
        trial_ends_at: string | null;
        trial_used_at: string | null;
      }
    | null
    | undefined,
  now = new Date()
): boolean {
  if (!profile) return true;
  if (!getPlanOrNull(profile.plan)) return true;
  return isTrialExpired(profile, now);
}
