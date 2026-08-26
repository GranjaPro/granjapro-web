import { prepareAssistantInsights, type AssistantInsight } from "./assistant-insight.ts";

export type AssistantDataStatus = "loading" | "error" | "ready";

export interface AssistantTrend {
  label: string;
  direction: "up" | "down" | "neutral";
}

export interface DashboardAssistantSnapshot {
  status: AssistantDataStatus;
  periodLabel: string;
  hasData: boolean;
  production: {
    total: number;
    goal: number;
    variation: AssistantTrend;
  };
  layingRate: {
    current: number;
    goal: number;
  };
  costPerEgg: {
    current: number;
    variation: AssistantTrend;
  };
  finances: {
    profit: number;
    margin: number;
    profitVariation: AssistantTrend;
  };
  underperformingFlocks: string[];
}

function formatPercentage(value: number): string {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function generateDashboardInsights(snapshot: DashboardAssistantSnapshot): AssistantInsight[] {
  if (snapshot.status === "loading") {
    return [{
      id: "dashboard-loading",
      level: "info",
      title: "Atualizando a análise do período",
      action: "Aguarde a conclusão do carregamento dos indicadores.",
      href: "/dashboard",
      hrefLabel: "Ver painel",
      priority: 0,
    }];
  }

  if (snapshot.status === "error") {
    return [{
      id: "dashboard-error",
      level: "critical",
      title: "Não foi possível analisar o período",
      action: "Atualize o painel para tentar carregar os indicadores novamente.",
      href: "/dashboard",
      hrefLabel: "Ver painel",
      priority: 0,
    }];
  }

  if (!snapshot.hasData) {
    return [{
      id: "dashboard-no-data",
      level: "info",
      title: `Sem dados suficientes para ${snapshot.periodLabel.toLowerCase()}`,
      action: "Registre a produção do período para liberar a análise da granja.",
      href: "/dashboard/production",
      hrefLabel: "Ver produção",
      priority: 0,
    }];
  }

  const insights: AssistantInsight[] = [];

  if (snapshot.finances.profit < 0) {
    insights.push({
      id: "dashboard-negative-profit",
      level: "critical",
      title: `Resultado negativo de ${formatCurrency(snapshot.finances.profit)}`,
      action: "Revise as receitas e despesas registradas no período.",
      href: "/dashboard/finances",
      hrefLabel: "Ver finanças",
      metric: { label: "Margem", value: formatPercentage(snapshot.finances.margin) },
      priority: 10,
    });
  }

  if (snapshot.production.goal > 0) {
    if (snapshot.production.total < snapshot.production.goal) {
      const gap = ((snapshot.production.goal - snapshot.production.total) / snapshot.production.goal) * 100;
      insights.push({
        id: "dashboard-production-below-goal",
        level: "warning",
        title: `Produção ${formatPercentage(gap)} abaixo da meta`,
        action: "Revise os registros e o desempenho produtivo dos lotes.",
        href: "/dashboard/production",
        hrefLabel: "Ver produção",
        metric: { label: "Variação", value: snapshot.production.variation.label },
        priority: 20,
      });
    } else {
      insights.push({
        id: "dashboard-production-on-goal",
        level: "success",
        title: "Produção dentro ou acima da meta",
        action: "Mantenha o acompanhamento do desempenho no período.",
        href: "/dashboard/production",
        hrefLabel: "Ver produção",
        metric: { label: "Variação", value: snapshot.production.variation.label },
        priority: 20,
      });
    }
  }

  if (snapshot.layingRate.goal > 0) {
    const belowGoal = snapshot.layingRate.current < snapshot.layingRate.goal;
    insights.push({
      id: belowGoal ? "dashboard-laying-rate-below-goal" : "dashboard-laying-rate-on-goal",
      level: belowGoal ? "warning" : "success",
      title: belowGoal ? "Taxa de postura abaixo da meta" : "Taxa de postura dentro da meta",
      action: belowGoal
        ? "Compare o desempenho por lote e verifique os registros do período."
        : "Mantenha o monitoramento da taxa de postura.",
      href: "/dashboard/production",
      hrefLabel: "Ver produção",
      metric: {
        label: "Postura",
        value: `${formatPercentage(snapshot.layingRate.current)} / ${formatPercentage(snapshot.layingRate.goal)}`,
      },
      priority: 30,
    });
  }

  if (snapshot.costPerEgg.current > 0 && snapshot.costPerEgg.variation.direction !== "neutral") {
    const increased = snapshot.costPerEgg.variation.direction === "up";
    insights.push({
      id: increased ? "dashboard-cost-per-egg-up" : "dashboard-cost-per-egg-down",
      level: increased ? "warning" : "success",
      title: increased ? "Custo por ovo aumentou" : "Custo por ovo reduziu",
      action: increased
        ? "Revise o consumo e os custos de ração do período."
        : "Acompanhe a redução para confirmar a tendência.",
      href: "/dashboard/racao",
      hrefLabel: "Ver ração",
      metric: { label: "Variação", value: snapshot.costPerEgg.variation.label },
      priority: 40,
    });
  }

  if (snapshot.underperformingFlocks.length > 0) {
    insights.push({
      id: "dashboard-underperforming-flocks",
      level: "warning",
      title: `${snapshot.underperformingFlocks.length} lote${snapshot.underperformingFlocks.length > 1 ? "s" : ""} abaixo da meta`,
      action: `Compare o manejo de ${snapshot.underperformingFlocks.join(", ")}.`,
      href: "/dashboard/flocks",
      hrefLabel: "Ver lotes",
      priority: 25,
    });
  }

  if (snapshot.finances.profit > 0) {
    const growing = snapshot.finances.profitVariation.direction === "up";
    insights.push({
      id: growing ? "dashboard-profit-growing" : "dashboard-positive-profit",
      level: growing ? "success" : "info",
      title: growing ? "Resultado financeiro melhorou" : "Resultado financeiro positivo",
      action: "Acompanhe a composição das receitas e despesas do período.",
      href: "/dashboard/finances",
      hrefLabel: "Ver finanças",
      metric: { label: "Resultado", value: formatCurrency(snapshot.finances.profit) },
      priority: 50,
    });
  }

  return prepareAssistantInsights(insights, 5);
}
