import { prepareAssistantInsights, type AssistantInsight } from "./assistant-insight.ts";
import type { AssistantDataStatus, AssistantTrend } from "./dashboard-assistant.ts";

export interface FinanceAssistantSnapshot {
  status: AssistantDataStatus;
  periodLabel: string;
  hasData: boolean;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  profitPerBird: number;
  revenueVariation: AssistantTrend;
  expenseVariation: AssistantTrend;
  profitVariation: AssistantTrend;
  topExpense: { label: string; share: number } | null;
  topCustomer: { name: string; share: number } | null;
}

function formatPercentage(value: number): string {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function generateFinanceInsights(snapshot: FinanceAssistantSnapshot): AssistantInsight[] {
  if (snapshot.status === "loading") {
    return [{ id: "finance-loading", level: "info", title: "Atualizando a análise financeira", action: "Aguarde a conclusão do carregamento dos indicadores.", href: "/dashboard/finances", hrefLabel: "Ver finanças", priority: 0 }];
  }
  if (snapshot.status === "error") {
    return [{ id: "finance-error", level: "critical", title: "Não foi possível analisar as finanças", action: "Atualize a página para tentar carregar os indicadores novamente.", href: "/dashboard/finances", hrefLabel: "Ver finanças", priority: 0 }];
  }
  if (!snapshot.hasData) {
    return [{ id: "finance-no-data", level: "info", title: `Sem movimentações em ${snapshot.periodLabel.toLowerCase()}`, action: "Registre vendas ou despesas para liberar a análise financeira.", href: "/dashboard/finances", hrefLabel: "Ver finanças", priority: 0 }];
  }

  const insights: AssistantInsight[] = [];
  if (snapshot.profit < 0) {
    insights.push({ id: "finance-negative-profit", level: "critical", title: `Resultado negativo de ${formatCurrency(snapshot.profit)}`, action: "Revise a composição das receitas e despesas do período.", href: "/dashboard/finances", hrefLabel: "Ver finanças", metric: { label: "Margem", value: formatPercentage(snapshot.margin) }, priority: 10 });
  }
  if (snapshot.revenue > 0 && snapshot.margin < 10) {
    insights.push({ id: "finance-low-margin", level: "warning", title: "Margem abaixo de 10%", action: "Analise as categorias com maior impacto no resultado.", href: "/dashboard/finances", hrefLabel: "Ver finanças", metric: { label: "Margem", value: formatPercentage(snapshot.margin) }, priority: 20 });
  }
  if (snapshot.expenseVariation.direction === "up") {
    const category = snapshot.topExpense ? `, com maior participação de ${snapshot.topExpense.label}` : "";
    insights.push({ id: "finance-expenses-up", level: "warning", title: `Despesas aumentaram ${snapshot.expenseVariation.label}`, action: `Revise os lançamentos do período${category}.`, href: "/dashboard/finances", hrefLabel: "Ver finanças", priority: 30 });
  } else if (snapshot.expenseVariation.direction === "down") {
    insights.push({ id: "finance-expenses-down", level: "success", title: `Despesas reduziram ${snapshot.expenseVariation.label}`, action: "Acompanhe as categorias para confirmar a tendência.", href: "/dashboard/finances", hrefLabel: "Ver finanças", priority: 30 });
  }
  if (snapshot.revenueVariation.direction === "down") {
    insights.push({ id: "finance-revenue-down", level: "warning", title: `Receita reduziu ${snapshot.revenueVariation.label}`, action: "Confira as vendas e recebimentos registrados no período.", href: "/dashboard/sales", hrefLabel: "Ver vendas", priority: 40 });
  }
  if (snapshot.topCustomer && snapshot.topCustomer.share > 30) {
    insights.push({ id: "finance-customer-concentration", level: "warning", title: `${snapshot.topCustomer.name} concentra ${formatPercentage(snapshot.topCustomer.share)} da receita`, action: "Acompanhe a distribuição do faturamento entre clientes.", href: "/dashboard/customers", hrefLabel: "Ver clientes", priority: 50 });
  }
  if (snapshot.profit > 0 && snapshot.profitVariation.direction === "up") {
    insights.push({ id: "finance-profit-growing", level: "success", title: `Lucro cresceu ${snapshot.profitVariation.label}`, action: "Acompanhe a evolução do resultado nos próximos períodos.", href: "/dashboard/finances", hrefLabel: "Ver finanças", metric: { label: "Lucro por ave", value: formatCurrency(snapshot.profitPerBird) }, priority: 60 });
  }
  if (snapshot.margin >= 10) {
    insights.push({ id: "finance-healthy-margin", level: "success", title: "Margem financeira igual ou superior a 10%", action: "Mantenha o acompanhamento das receitas e despesas.", href: "/dashboard/finances", hrefLabel: "Ver finanças", metric: { label: "Margem", value: formatPercentage(snapshot.margin) }, priority: 70 });
  }

  return prepareAssistantInsights(insights, 5);
}
