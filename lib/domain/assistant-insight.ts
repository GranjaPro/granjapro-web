export type AssistantInsightLevel = "critical" | "warning" | "success" | "info";

export type AssistantInsightHref =
  | "/dashboard"
  | "/dashboard/production"
  | "/dashboard/racao"
  | "/dashboard/finances"
  | "/dashboard/flocks"
  | "/dashboard/customers"
  | "/dashboard/sales"
  | "/dashboard/health";

export interface AssistantInsightMetric {
  label: string;
  value: string;
}

export interface AssistantInsight {
  id: string;
  level: AssistantInsightLevel;
  title: string;
  action: string;
  href: AssistantInsightHref;
  hrefLabel: string;
  metric?: AssistantInsightMetric;
  priority: number;
}

const LEVEL_ORDER: Record<AssistantInsightLevel, number> = {
  critical: 0,
  warning: 1,
  success: 2,
  info: 3,
};

export function prepareAssistantInsights(
  insights: AssistantInsight[],
  limit = 5,
): AssistantInsight[] {
  const uniqueInsights = Array.from(
    new Map(insights.map((insight) => [insight.id, insight])).values(),
  );

  return uniqueInsights
    .sort(
      (left, right) =>
        LEVEL_ORDER[left.level] - LEVEL_ORDER[right.level] ||
        left.priority - right.priority ||
        left.id.localeCompare(right.id),
    )
    .slice(0, Math.max(0, limit));
}
