"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Egg,
  Skull,
  Wheat,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  ChevronDown,
  FileDown,
  Sheet,
  AlertTriangle,
  CheckCircle2,
  Info,
  Target,
  Activity,
  Zap,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
} from "recharts";
import { useAuth } from "@/components/auth/auth-provider";
import {
  getProductionByDateRange,
  getMortalityByDateRange,
  getFeedByDateRange,
  getTransactionsByDateRange,
  getBarns,
} from "@/lib/services";

const periodos = ["7 dias", "30 dias", "90 dias", "12 meses"];

// --- Types ---
type InsightLevel = "critical" | "warning" | "success";
interface Insight {
  level: InsightLevel;
  title: string;
  description: string;
  action: string;
  metric?: string;
}

interface LucroTrendItem { periodo: string; receita: number; despesa: number; lucro: number; }
interface ProducaoItem { dia: string; ovos: number; meta: number; }
interface GalpaoItem { galpao: string; ovos: number; postura: number; mortes: number; eficiencia: number; }
interface DespesaItem { categoria: string; valor: number; pct: number; color: string; }
interface MortalidadeItem { causa: string; qtd: number; pct: number; }
interface RacaoItem { dia: string; consumo: number; custo: number; }

// --- Date range helper ---
function getDateRange(periodo: string): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  switch (periodo) {
    case "7 dias": start.setDate(end.getDate() - 7); break;
    case "30 dias": start.setDate(end.getDate() - 30); break;
    case "90 dias": start.setDate(end.getDate() - 90); break;
    case "12 meses": start.setFullYear(end.getFullYear() - 1); break;
  }
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// --- Data transformers ---
function transformProducaoSemanal(records: any[]): ProducaoItem[] {
  const byDay: Record<string, { total: number; count: number }> = {};
  for (const r of records) {
    const d = new Date(r.date + "T12:00:00");
    const day = dayNames[d.getDay()];
    if (!byDay[day]) byDay[day] = { total: 0, count: 0 };
    byDay[day].total += r.eggs_produced;
    byDay[day].count++;
  }
  const avgProduction = records.length > 0
    ? Math.round(records.reduce((s: number, r: any) => s + r.eggs_produced, 0) / Math.max(1, new Set(records.map((r: any) => r.date)).size))
    : 4200;
  return ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((dia) => ({
    dia,
    ovos: byDay[dia]?.total ?? 0,
    meta: avgProduction,
  })).filter((d) => d.ovos > 0);
}

function transformGalpaoPerformance(production: any[], mortality: any[], barns: any[]): GalpaoItem[] {
  if (barns.length === 0) return [];
  return barns
    .filter((b: any) => b.status === "active")
    .map((barn: any) => {
      const barnProd = production.filter((p: any) => p.barn_id === barn.id);
      const barnMort = mortality.filter((m: any) => m.barn_id === barn.id);
      const totalEggs = barnProd.reduce((s: number, p: any) => s + p.eggs_produced, 0);
      const avgPostura = barnProd.length > 0
        ? barnProd.reduce((s: number, p: any) => s + (p.laying_rate || 0), 0) / barnProd.length
        : 0;
      const totalMortes = barnMort.reduce((s: number, m: any) => s + m.dead_birds, 0);
      const totalBroken = barnProd.reduce((s: number, p: any) => s + (p.broken_eggs || 0), 0);
      const efficiency = totalEggs > 0
        ? Math.round(((totalEggs - totalBroken) / totalEggs) * 100)
        : 0;
      return {
        galpao: barn.name,
        ovos: totalEggs,
        postura: Math.round(avgPostura * 10) / 10,
        mortes: totalMortes,
        eficiencia: efficiency,
      };
    })
    .filter((g: GalpaoItem) => g.ovos > 0 || g.mortes > 0);
}

function transformLucroTrend(transactions: any[], periodo: string): LucroTrendItem[] {
  if (transactions.length === 0) return [];
  const byMonth: Record<string, { receita: number; despesa: number }> = {};
  for (const t of transactions) {
    const d = new Date(t.date + "T12:00:00");
    const key = monthNames[d.getMonth()];
    if (!byMonth[key]) byMonth[key] = { receita: 0, despesa: 0 };
    if (t.type === "revenue") byMonth[key].receita += Number(t.amount);
    else byMonth[key].despesa += Number(t.amount);
  }
  // If period is short (7 or 30 days), group by week instead
  if (periodo === "7 dias" || periodo === "30 dias") {
    const byWeek: Record<string, { receita: number; despesa: number }> = {};
    for (const t of transactions) {
      const d = new Date(t.date + "T12:00:00");
      const weekNum = `Sem ${Math.ceil(d.getDate() / 7)}`;
      if (!byWeek[weekNum]) byWeek[weekNum] = { receita: 0, despesa: 0 };
      if (t.type === "revenue") byWeek[weekNum].receita += Number(t.amount);
      else byWeek[weekNum].despesa += Number(t.amount);
    }
    return Object.entries(byWeek).map(([periodo, v]) => ({
      periodo,
      receita: Math.round(v.receita),
      despesa: Math.round(v.despesa),
      lucro: Math.round(v.receita - v.despesa),
    }));
  }
  return Object.entries(byMonth).map(([periodo, v]) => ({
    periodo,
    receita: Math.round(v.receita),
    despesa: Math.round(v.despesa),
    lucro: Math.round(v.receita - v.despesa),
  }));
}

const categoryColors: Record<string, string> = {
  feed: "#22c55e",
  labor: "#3b82f6",
  energy: "#eab308",
  medication: "#ef4444",
  maintenance: "#a855f7",
  utilities: "#eab308",
  supplies: "#f97316",
};

const categoryLabels: Record<string, string> = {
  feed: "Ração",
  labor: "Mão de obra",
  energy: "Energia",
  medication: "Medicamentos",
  maintenance: "Manutenção",
  utilities: "Utilidades",
  supplies: "Suprimentos",
};

function transformDespesas(transactions: any[]): DespesaItem[] {
  const expenses = transactions.filter((t: any) => t.type === "expense");
  if (expenses.length === 0) return [];
  const byCategory: Record<string, number> = {};
  for (const t of expenses) {
    const cat = t.category || "other";
    byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount);
  }
  const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
  return Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, valor]) => ({
      categoria: categoryLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
      valor: Math.round(valor),
      pct: Math.round((valor / total) * 1000) / 10,
      color: categoryColors[cat] || "#6b7280",
    }));
}

function transformMortalidade(records: any[]): MortalidadeItem[] {
  if (records.length === 0) return [];
  const byCause: Record<string, number> = {};
  for (const r of records) {
    const cause = r.cause || "Não identificado";
    byCause[cause] = (byCause[cause] || 0) + r.dead_birds;
  }
  const total = Object.values(byCause).reduce((s, v) => s + v, 0);
  return Object.entries(byCause)
    .sort((a, b) => b[1] - a[1])
    .map(([causa, qtd]) => ({
      causa,
      qtd,
      pct: Math.round((qtd / total) * 1000) / 10,
    }));
}

function transformRacao(records: any[]): RacaoItem[] {
  const byDay: Record<string, { consumo: number; custo: number }> = {};
  for (const r of records) {
    const d = new Date(r.date + "T12:00:00");
    const day = dayNames[d.getDay()];
    if (!byDay[day]) byDay[day] = { consumo: 0, custo: 0 };
    byDay[day].consumo += r.quantity_kg;
    byDay[day].custo += Number(r.cost || 0);
  }
  return ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    .map((dia) => ({
      dia,
      consumo: Math.round(byDay[dia]?.consumo ?? 0),
      custo: Math.round(byDay[dia]?.custo ?? 0),
    }))
    .filter((d) => d.consumo > 0);
}

// --- Health Score ---
function computeHealthScore(
  totalReceita: number,
  totalDespesa: number,
  avgPostura: number,
  mortalidadeRate: number,
  racaoEficiencia: number
) {
  const margem = totalReceita > 0 ? ((totalReceita - totalDespesa) / totalReceita) * 100 : 0;
  let score = 0;
  score += margem >= 10 ? 30 : margem >= 5 ? 20 : margem >= 0 ? 10 : 0;
  score += avgPostura >= 90 ? 30 : avgPostura >= 85 ? 22 : avgPostura >= 80 ? 15 : 5;
  score += mortalidadeRate <= 0.1 ? 20 : mortalidadeRate <= 0.2 ? 15 : mortalidadeRate <= 0.5 ? 8 : 0;
  score += racaoEficiencia >= 90 ? 20 : racaoEficiencia >= 80 ? 14 : racaoEficiencia >= 70 ? 8 : 0;
  return score;
}

function getScoreColor(score: number) {
  if (score >= 80) return { ring: "text-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", label: "Excelente" };
  if (score >= 60) return { ring: "text-amber-500", bg: "bg-amber-50", text: "text-amber-700", label: "Atenção" };
  return { ring: "text-red-500", bg: "bg-red-50", text: "text-red-700", label: "Crítico" };
}

// --- Insights engine ---
function generateInsights(
  lucroTrend: LucroTrendItem[],
  avgPostura: number,
  mortalidadeCausas: MortalidadeItem[],
  totalReceita: number,
  totalDespesa: number,
  galpaoPerformance: GalpaoItem[]
): Insight[] {
  const insights: Insight[] = [];
  const margem = totalReceita > 0 ? ((totalReceita - totalDespesa) / totalReceita) * 100 : 0;

  // Profit margin check
  if (lucroTrend.length >= 2) {
    const last = lucroTrend[lucroTrend.length - 1];
    const prev = lucroTrend[lucroTrend.length - 2];
    if (prev.lucro > 0 && last.lucro < prev.lucro) {
      const drop = Math.round(((prev.lucro - last.lucro) / prev.lucro) * 100);
      insights.push({
        level: drop > 20 ? "critical" : "warning",
        title: "Margem de lucro em queda",
        description: `Lucro caiu ${drop}% em relação ao período anterior. Margem atual: ${margem.toFixed(1)}%.`,
        action: "Renegociar custos ou ajustar preço de venda",
        metric: `${margem.toFixed(1)}%`,
      });
    }
  }

  // Underperforming barns
  for (const g of galpaoPerformance) {
    if (g.postura > 0 && g.postura < 87) {
      insights.push({
        level: "warning",
        title: `Galpão ${g.galpao} abaixo da meta`,
        description: `Taxa de postura ${g.postura}% (meta: 87%). Eficiência geral: ${g.eficiencia}%.`,
        action: "Verificar condições ambientais e idade do lote",
        metric: `${g.postura}%`,
      });
    }
  }

  // Top mortality cause
  if (mortalidadeCausas.length > 0) {
    const top = mortalidadeCausas[0];
    if (top.pct > 30) {
      insights.push({
        level: "warning",
        title: `${top.causa} é a principal causa de mortes`,
        description: `${top.pct}% das mortes por ${top.causa.toLowerCase()}.`,
        action: "Investigar e mitigar causa principal",
        metric: `${top.pct}%`,
      });
    }
  }

  // Revenue growing
  if (lucroTrend.length >= 2) {
    const last = lucroTrend[lucroTrend.length - 1];
    const prev = lucroTrend[lucroTrend.length - 2];
    if (prev.receita > 0 && last.receita > prev.receita) {
      const growth = Math.round(((last.receita - prev.receita) / prev.receita) * 100 * 10) / 10;
      insights.push({
        level: "success",
        title: "Receita crescendo",
        description: `Receita cresceu ${growth}% no último período.`,
        action: "Manter volume de vendas e explorar novos canais",
        metric: `+${growth}%`,
      });
    }
  }

  // If no insights, add a neutral one
  if (insights.length === 0) {
    insights.push({
      level: "success",
      title: "Operação estável",
      description: "Nenhum alerta crítico no período selecionado.",
      action: "Continuar monitorando os indicadores",
    });
  }

  return insights;
}

const insightConfig = {
  critical: { bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle, iconColor: "text-red-500", titleColor: "text-red-800", descColor: "text-red-600", actionBg: "bg-red-100", actionText: "text-red-700", metricBg: "bg-red-100", metricText: "text-red-700" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", icon: Info, iconColor: "text-amber-500", titleColor: "text-amber-800", descColor: "text-amber-600", actionBg: "bg-amber-100", actionText: "text-amber-700", metricBg: "bg-amber-100", metricText: "text-amber-700" },
  success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2, iconColor: "text-emerald-500", titleColor: "text-emerald-800", descColor: "text-emerald-600", actionBg: "bg-emerald-100", actionText: "text-emerald-700", metricBg: "bg-emerald-100", metricText: "text-emerald-700" },
};

const customTooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export default function RelatoriosPage() {
  const { farm } = useAuth();
  const farmRef = useRef(farm);
  farmRef.current = farm;

  const [periodo, setPeriodo] = useState("7 dias");
  const [showPeriodo, setShowPeriodo] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dynamic data state
  const [lucroTrend, setLucroTrend] = useState<LucroTrendItem[]>([]);
  const [producaoSemanal, setProducaoSemanal] = useState<ProducaoItem[]>([]);
  const [galpaoPerformance, setGalpaoPerformance] = useState<GalpaoItem[]>([]);
  const [despesasBreakdown, setDespesasBreakdown] = useState<DespesaItem[]>([]);
  const [mortalidadeCausas, setMortalidadeCausas] = useState<MortalidadeItem[]>([]);
  const [racaoSemanal, setRacaoSemanal] = useState<RacaoItem[]>([]);

  // Computed KPI state
  const [totalReceita, setTotalReceita] = useState(0);
  const [totalDespesa, setTotalDespesa] = useState(0);
  const [totalOvos, setTotalOvos] = useState(0);
  const [avgPostura, setAvgPostura] = useState(0);
  const [totalMortes, setTotalMortes] = useState(0);
  const [totalBirds, setTotalBirds] = useState(0);
  const [custoPerOvo, setCustoPerOvo] = useState(0);

  // Previous period KPIs for variation
  const [prevReceita, setPrevReceita] = useState(0);
  const [prevOvos, setPrevOvos] = useState(0);
  const [prevMortRate, setPrevMortRate] = useState(0);
  const [prevCustoPerOvo, setPrevCustoPerOvo] = useState(0);

  const fetchData = useCallback(async () => {
    const f = farmRef.current;
    if (!f) return;
    setLoading(true);

    const { startDate, endDate } = getDateRange(periodo);

    // Also get previous period for variation calculation
    const periodMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    const prevEnd = new Date(new Date(startDate).getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - periodMs);
    const prevStartStr = prevStart.toISOString().split("T")[0];
    const prevEndStr = prevEnd.toISOString().split("T")[0];

    try {
      const [production, mortality, feed, transactions, barns, prevProd, prevMort, prevFeed, prevTrans] = await Promise.all([
        getProductionByDateRange(f.id, startDate, endDate),
        getMortalityByDateRange(f.id, startDate, endDate),
        getFeedByDateRange(f.id, startDate, endDate),
        getTransactionsByDateRange(f.id, startDate, endDate),
        getBarns(f.id),
        getProductionByDateRange(f.id, prevStartStr, prevEndStr),
        getMortalityByDateRange(f.id, prevStartStr, prevEndStr),
        getFeedByDateRange(f.id, prevStartStr, prevEndStr),
        getTransactionsByDateRange(f.id, prevStartStr, prevEndStr),
      ]);

      // Transform data for charts
      setProducaoSemanal(transformProducaoSemanal(production));
      setGalpaoPerformance(transformGalpaoPerformance(production, mortality, barns));
      setLucroTrend(transformLucroTrend(transactions, periodo));
      setDespesasBreakdown(transformDespesas(transactions));
      setMortalidadeCausas(transformMortalidade(mortality));
      setRacaoSemanal(transformRacao(feed));

      // Compute KPIs
      const curReceita = (transactions || []).filter((t: any) => t.type === "revenue").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const curDespesa = (transactions || []).filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const curOvos = (production || []).reduce((s: number, p: any) => s + p.eggs_produced, 0);
      const curPostura = production.length > 0
        ? production.reduce((s: number, p: any) => s + (p.laying_rate || 0), 0) / production.length
        : 0;
      const curMortes = (mortality || []).reduce((s: number, m: any) => s + m.dead_birds, 0);
      const curBirds = barns.reduce((s: number, b: any) => s + (b.current_birds || 0), 0);
      const feedCost = (feed || []).reduce((s: number, f: any) => s + Number(f.cost || 0), 0);
      const curCustoPerOvo = curOvos > 0 ? feedCost / curOvos : 0;

      setTotalReceita(curReceita);
      setTotalDespesa(curDespesa);
      setTotalOvos(curOvos);
      setAvgPostura(Math.round(curPostura * 10) / 10);
      setTotalMortes(curMortes);
      setTotalBirds(curBirds);
      setCustoPerOvo(Math.round(curCustoPerOvo * 100) / 100);

      // Previous period KPIs
      const pReceita = (prevTrans || []).filter((t: any) => t.type === "revenue").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const pOvos = (prevProd || []).reduce((s: number, p: any) => s + p.eggs_produced, 0);
      const pMortes = (prevMort || []).reduce((s: number, m: any) => s + m.dead_birds, 0);
      const pBirds = curBirds; // approximation
      const pFeedCost = (prevFeed || []).reduce((s: number, f: any) => s + Number(f.cost || 0), 0);
      setPrevReceita(pReceita);
      setPrevOvos(pOvos);
      setPrevMortRate(pBirds > 0 ? (pMortes / pBirds) * 100 : 0);
      setPrevCustoPerOvo(pOvos > 0 ? pFeedCost / pOvos : 0);
    } catch (err) {
      console.error("Error loading report data:", err);
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    if (farm) fetchData();
  }, [farm, fetchData]);

  // Computed values
  const lucro = totalReceita - totalDespesa;
  const margem = totalReceita > 0 ? ((lucro / totalReceita) * 100) : 0;
  const mortalidadeRate = totalBirds > 0 ? (totalMortes / totalBirds) * 100 : 0;
  const racaoEficiencia = producaoSemanal.length > 0 ? 85 : 0; // simplified
  const feedTotal = racaoSemanal.reduce((s, r) => s + r.consumo, 0);

  // Variations
  const lucroChange = prevReceita > 0 ? Math.round(((lucro - (prevReceita - totalDespesa)) / Math.abs(prevReceita - totalDespesa || 1)) * 100 * 10) / 10 : 0;
  const prodChange = prevOvos > 0 ? Math.round(((totalOvos - prevOvos) / prevOvos) * 100 * 10) / 10 : 0;
  const mortChange = prevMortRate > 0 ? Math.round(((mortalidadeRate - prevMortRate) / prevMortRate) * 100 * 10) / 10 : 0;
  const custoChange = prevCustoPerOvo > 0 ? Math.round(((custoPerOvo - prevCustoPerOvo) / prevCustoPerOvo) * 100 * 10) / 10 : 0;

  const healthScore = computeHealthScore(totalReceita, totalDespesa, avgPostura, mortalidadeRate, racaoEficiencia);
  const scoreStyle = getScoreColor(healthScore);
  const insights = generateInsights(lucroTrend, avgPostura, mortalidadeCausas, totalReceita, totalDespesa, galpaoPerformance);

  // --- Export data (derived from dynamic state) ---
  const allReports = {
    producao: {
      title: "Produção",
      headers: ["Dia", "Ovos Produzidos", "Meta"],
      rows: producaoSemanal.map((d) => [d.dia, d.ovos, d.meta]),
      summary: [
        ["Total do período", `${totalOvos.toLocaleString("pt-BR")} ovos`],
        ["Média diária", `${producaoSemanal.length > 0 ? Math.round(totalOvos / producaoSemanal.length) : 0} ovos`],
        ["Taxa média de postura", `${avgPostura}%`],
      ],
      extraTitle: "Produção por Galpão",
      extraHeaders: ["Galpão", "Ovos", "Postura (%)", "Mortes", "Eficiência (%)"],
      extraRows: galpaoPerformance.map((g) => [g.galpao, g.ovos, g.postura, g.mortes, g.eficiencia]),
    },
    mortalidade: {
      title: "Mortalidade",
      headers: ["Causa", "Quantidade", "Percentual (%)"],
      rows: mortalidadeCausas.map((c) => [c.causa, c.qtd, c.pct]),
      summary: [
        ["Óbitos no período", String(totalMortes)],
        ["Taxa de mortalidade", `${mortalidadeRate.toFixed(2)}%`],
        ["Aves ativas", totalBirds.toLocaleString("pt-BR")],
      ],
      extraTitle: "Mortes por Galpão",
      extraHeaders: ["Galpão", "Mortes"],
      extraRows: galpaoPerformance.map((g) => [g.galpao, g.mortes]),
    },
    racao: {
      title: "Ração",
      headers: ["Dia", "Consumo (kg)", "Custo (R$)"],
      rows: racaoSemanal.map((d) => [d.dia, d.consumo, d.custo]),
      summary: [
        ["Consumo total", `${feedTotal.toLocaleString("pt-BR")} kg`],
        ["Custo total", `R$ ${racaoSemanal.reduce((s, d) => s + d.custo, 0).toLocaleString("pt-BR")}`],
        ["Custo por ovo", `R$ ${custoPerOvo.toFixed(3)}`],
      ],
      extraTitle: "Distribuição por Dia",
      extraHeaders: ["Dia", "Consumo (kg)", "Custo (R$)"],
      extraRows: racaoSemanal.map((d) => [d.dia, d.consumo, d.custo]),
    },
    financeiro: {
      title: "Financeiro",
      headers: ["Período", "Receita (R$)", "Despesas (R$)", "Lucro (R$)"],
      rows: lucroTrend.map((d) => [d.periodo, d.receita, d.despesa, d.lucro]),
      summary: [
        ["Receita total", `R$ ${totalReceita.toLocaleString("pt-BR")}`],
        ["Despesas", `R$ ${totalDespesa.toLocaleString("pt-BR")}`],
        ["Lucro", `R$ ${lucro.toLocaleString("pt-BR")}`],
        ["Margem", `${margem.toFixed(1)}%`],
      ],
      extraTitle: "Despesas por Categoria",
      extraHeaders: ["Categoria", "Valor (R$)", "Percentual (%)"],
      extraRows: despesasBreakdown.map((d) => [d.categoria, d.valor, d.pct]),
    },
  };

  function addPDFSection(doc: jsPDF, report: typeof allReports.producao, startY: number): number {
    let y = startY;
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(report.title, 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text("Resumo", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor"]],
      body: report.summary,
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("Dados Detalhados", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [report.headers],
      body: report.rows.map((r) => r.map(String)),
      theme: "striped",
      headStyles: { fillColor: [45, 122, 79], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(report.extraTitle, 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [report.extraHeaders],
      body: report.extraRows.map((r: any[]) => r.map(String)),
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
    return y;
  }

  // --- PDF Chart Helpers ---
  function drawBarChart(doc: jsPDF, x: number, y: number, w: number, h: number, data: { label: string; value: number; color: number[] }[], title: string) {
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title, x, y - 4);
    if (data.length === 0) return;
    const maxVal = Math.max(...data.map((d) => d.value));
    const barW = Math.min((w - (data.length - 1) * 3) / data.length, 22);
    const totalBarsW = data.length * barW + (data.length - 1) * 3;
    const startX = x + (w - totalBarsW) / 2;

    doc.setDrawColor(230, 230, 230);
    for (let i = 0; i <= 4; i++) {
      const lineY = y + h - (h * i) / 4;
      doc.line(x, lineY, x + w, lineY);
    }

    data.forEach((d, i) => {
      const barH = maxVal > 0 ? (d.value / maxVal) * (h - 10) : 0;
      const bx = startX + i * (barW + 3);
      const by = y + h - barH;
      doc.setFillColor(d.color[0], d.color[1], d.color[2]);
      doc.roundedRect(bx, by, barW, barH, 1.5, 1.5, "F");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(d.label, bx + barW / 2, y + h + 4, { align: "center" });
      doc.setFontSize(6);
      doc.setTextColor(30, 41, 59);
      doc.text(d.value.toLocaleString("pt-BR"), bx + barW / 2, by - 2, { align: "center" });
    });
  }

  function drawGroupedBarChart(doc: jsPDF, x: number, y: number, w: number, h: number, data: { label: string; values: number[]; colors: number[][] }[], legend: { label: string; color: number[] }[], title: string) {
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title, x, y - 8);
    if (data.length === 0) return;
    legend.forEach((l, i) => {
      const lx = x + w - (legend.length - i) * 40;
      doc.setFillColor(l.color[0], l.color[1], l.color[2]);
      doc.roundedRect(lx, y - 12, 5, 3, 0.5, 0.5, "F");
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(l.label, lx + 7, y - 9.5);
    });

    const maxVal = Math.max(...data.flatMap((d) => d.values));
    if (maxVal === 0) return;
    const groupW = (w - (data.length - 1) * 4) / data.length;
    const barW = Math.min((groupW - 2) / data[0].values.length, 12);

    doc.setDrawColor(230, 230, 230);
    for (let i = 0; i <= 4; i++) {
      const lineY = y + h - (h * i) / 4;
      doc.line(x, lineY, x + w, lineY);
    }

    data.forEach((d, i) => {
      const gx = x + i * (groupW + 4);
      d.values.forEach((v, j) => {
        const barH = (v / maxVal) * (h - 10);
        const bx = gx + j * (barW + 1);
        const by = y + h - barH;
        doc.setFillColor(d.colors[j][0], d.colors[j][1], d.colors[j][2]);
        doc.roundedRect(bx, by, barW, barH, 1, 1, "F");
      });
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(d.label, gx + (d.values.length * (barW + 1)) / 2, y + h + 4, { align: "center" });
    });
  }

  function drawHorizontalBarChart(doc: jsPDF, x: number, y: number, w: number, data: { label: string; value: number; pct: number; color: number[] }[], title: string) {
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title, x, y);
    let cy = y + 6;
    if (data.length === 0) return cy;
    const barMaxW = w - 80;
    data.forEach((d) => {
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(d.label, x, cy + 3);
      const barX = x + 38;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(barX, cy, barMaxW, 5, 1, 1, "F");
      doc.setFillColor(d.color[0], d.color[1], d.color[2]);
      doc.roundedRect(barX, cy, (d.pct / 100) * barMaxW, 5, 1, 1, "F");
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      doc.text(`R$ ${d.value.toLocaleString("pt-BR")} (${d.pct}%)`, barX + barMaxW + 3, cy + 3.5);
      cy += 9;
    });
    return cy;
  }

  function drawLineChart(doc: jsPDF, x: number, y: number, w: number, h: number, datasets: { data: number[]; color: number[]; label: string }[], labels: string[], title: string) {
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title, x, y - 8);
    if (labels.length === 0) return;
    datasets.forEach((ds, i) => {
      const lx = x + w - (datasets.length - i) * 35;
      doc.setDrawColor(ds.color[0], ds.color[1], ds.color[2]);
      doc.setLineWidth(1.2);
      doc.line(lx, y - 10, lx + 8, y - 10);
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(ds.label, lx + 10, y - 8.5);
    });

    const allVals = datasets.flatMap((ds) => ds.data);
    if (allVals.length === 0) return;
    const maxVal = Math.max(...allVals);
    const minVal = Math.min(...allVals) * 0.9;
    const range = maxVal - minVal || 1;

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    for (let i = 0; i <= 4; i++) {
      const lineY = y + h - (h * i) / 4;
      doc.line(x, lineY, x + w, lineY);
      doc.setFontSize(6);
      doc.setTextColor(160, 170, 180);
      const val = minVal + (range * i) / 4;
      doc.text((val / 1000).toFixed(0) + "k", x - 2, lineY + 1.5, { align: "right" });
    }

    const stepX = labels.length > 1 ? w / (labels.length - 1) : w;
    labels.forEach((l, i) => {
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(l, x + i * stepX, y + h + 5, { align: "center" });
    });

    datasets.forEach((ds) => {
      doc.setDrawColor(ds.color[0], ds.color[1], ds.color[2]);
      doc.setLineWidth(1);
      for (let i = 1; i < ds.data.length; i++) {
        const x1 = x + (i - 1) * stepX;
        const y1 = y + h - ((ds.data[i - 1] - minVal) / range) * h;
        const x2 = x + i * stepX;
        const y2 = y + h - ((ds.data[i] - minVal) / range) * h;
        doc.line(x1, y1, x2, y2);
      }
      ds.data.forEach((v, i) => {
        const cx = x + i * stepX;
        const cy = y + h - ((v - minVal) / range) * h;
        doc.setFillColor(255, 255, 255);
        doc.circle(cx, cy, 1.8, "F");
        doc.setFillColor(ds.color[0], ds.color[1], ds.color[2]);
        doc.circle(cx, cy, 1.2, "F");
      });
    });
  }

  function drawHealthGauge(doc: jsPDF, cx: number, cy: number, score: number) {
    const r = 14;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(3);
    doc.circle(cx, cy, r);
    const color = score >= 80 ? [34, 197, 94] : score >= 60 ? [245, 158, 11] : [239, 68, 68];
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(3);
    const endAngle = -90 + (score / 100) * 360;
    const steps = Math.round(score * 1.5);
    for (let i = 0; i < steps; i++) {
      const a1 = (-90 + (i / steps) * (endAngle + 90)) * (Math.PI / 180);
      const a2 = (-90 + ((i + 1) / steps) * (endAngle + 90)) * (Math.PI / 180);
      doc.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2));
    }
    doc.setFontSize(14);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(String(score), cx, cy + 2, { align: "center" });
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("/ 100", cx, cy + 7, { align: "center" });
  }

  function exportPDF() {
    const doc = new jsPDF();
    const timestamp = `Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text("Granja Pro — Relatório Completo", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Período: ${periodo}`, 14, 28);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(timestamp, 14, 34);

    drawHealthGauge(doc, 175, 24, healthScore);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Saúde da Granja", 175, 44, { align: "center" });

    const checkPage = (need: number) => { if (y + need > 280) { doc.addPage(); y = 16; } };

    // KPIs Table
    let y = 48;
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor", "Variação", "Detalhe"]],
      body: [
        ["Lucro", `R$ ${lucro.toLocaleString("pt-BR")}`, `${lucroChange > 0 ? "+" : ""}${lucroChange}%`, `Margem: ${margem.toFixed(1)}%`],
        ["Produção", `${totalOvos.toLocaleString("pt-BR")} ovos`, `${prodChange > 0 ? "+" : ""}${prodChange}%`, `Postura: ${avgPostura}%`],
        ["Mortalidade", `${mortalidadeRate.toFixed(2)}%`, `${mortChange > 0 ? "+" : ""}${mortChange}%`, `${totalMortes} óbitos`],
        ["Custo/Ovo", `R$ ${custoPerOvo.toFixed(2)}`, `${custoChange > 0 ? "+" : ""}${custoChange}%`, "Custo de ração por ovo"],
      ],
      theme: "grid",
      headStyles: { fillColor: [45, 122, 79], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    // Insights Table
    checkPage(50);
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("Alertas e Ações Recomendadas", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Prioridade", "Alerta", "Ação Recomendada"]],
      body: insights.map((i) => [
        i.level === "critical" ? "URGENTE" : i.level === "warning" ? "ATENÇÃO" : "POSITIVO",
        i.title + " — " + i.description,
        i.action,
      ]),
      theme: "grid",
      headStyles: { fillColor: [45, 122, 79], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7, cellPadding: 2 },
      margin: { left: 14 },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 95 } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Profit Trend Chart
    if (lucroTrend.length > 0) {
      checkPage(75);
      drawLineChart(doc, 20, y + 12, 170, 45,
        [
          { data: lucroTrend.map((d) => d.receita), color: [34, 197, 94], label: "Receita" },
          { data: lucroTrend.map((d) => d.despesa), color: [239, 68, 68], label: "Despesas" },
          { data: lucroTrend.map((d) => d.lucro), color: [99, 102, 241], label: "Lucro" },
        ],
        lucroTrend.map((d) => d.periodo),
        "Evolução do Lucro"
      );
      y += 65;
      autoTable(doc, {
        startY: y,
        head: [["Período", "Receita (R$)", "Despesas (R$)", "Lucro (R$)", "Margem (%)"]],
        body: lucroTrend.map((d) => [
          d.periodo,
          "R$ " + d.receita.toLocaleString("pt-BR"),
          "R$ " + d.despesa.toLocaleString("pt-BR"),
          "R$ " + d.lucro.toLocaleString("pt-BR"),
          d.receita > 0 ? ((d.lucro / d.receita) * 100).toFixed(1) + "%" : "0%",
        ]),
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Expense Horizontal Bar Chart + Table
    if (despesasBreakdown.length > 0) {
      checkPage(70);
      y = drawHorizontalBarChart(doc, 14, y, 182, despesasBreakdown.map((d) => ({
        label: d.categoria,
        value: d.valor,
        pct: d.pct,
        color: d.color === "#22c55e" ? [34, 197, 94] : d.color === "#3b82f6" ? [59, 130, 246] : d.color === "#eab308" ? [234, 179, 8] : d.color === "#ef4444" ? [239, 68, 68] : d.color === "#a855f7" ? [168, 85, 247] : [107, 114, 128],
      })), "Despesas por Categoria");
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [["Categoria", "Valor (R$)", "Percentual (%)"]],
        body: despesasBreakdown.map((d) => [d.categoria, "R$ " + d.valor.toLocaleString("pt-BR"), d.pct + "%"]),
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14 },
        foot: [["Total", `R$ ${totalDespesa.toLocaleString("pt-BR")}`, "100%"]],
        footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold", fontSize: 8 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Production Chart + Table
    if (producaoSemanal.length > 0) {
      checkPage(75);
      drawGroupedBarChart(doc, 20, y + 14, 170, 40,
        producaoSemanal.map((d) => ({
          label: d.dia,
          values: [d.meta, d.ovos],
          colors: [[220, 220, 220], d.ovos >= d.meta ? [34, 197, 94] : [245, 158, 11]],
        })),
        [
          { label: "Meta", color: [220, 220, 220] },
          { label: "Produção", color: [34, 197, 94] },
        ],
        "Produção Diária vs Meta"
      );
      y += 62;
      autoTable(doc, {
        startY: y,
        head: [["Dia", "Produção", "Meta", "Diferença", "Atingiu"]],
        body: producaoSemanal.map((d) => [
          d.dia,
          d.ovos.toLocaleString("pt-BR"),
          d.meta.toLocaleString("pt-BR"),
          (d.ovos - d.meta > 0 ? "+" : "") + (d.ovos - d.meta),
          d.ovos >= d.meta ? "Sim" : "Não",
        ]),
        theme: "striped",
        headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Barn Performance
    if (galpaoPerformance.length > 0) {
      checkPage(30);
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("Performance por Galpão", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Galpão", "Ovos", "Postura (%)", "Mortes", "Eficiência (%)"]],
        body: galpaoPerformance.map((g) => [g.galpao, g.ovos.toLocaleString("pt-BR"), g.postura + "%", String(g.mortes), g.eficiencia + "%"]),
        theme: "striped",
        headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Mortality Bar Chart + Table
    if (mortalidadeCausas.length > 0) {
      checkPage(65);
      drawBarChart(doc, 20, y + 8, 170, 35,
        mortalidadeCausas.map((c) => ({
          label: c.causa.length > 12 ? c.causa.slice(0, 12) + "…" : c.causa,
          value: c.qtd,
          color: [239, 68, 68],
        })),
        "Causas de Mortalidade"
      );
      y += 50;
      autoTable(doc, {
        startY: y,
        head: [["Causa", "Quantidade", "Percentual (%)"]],
        body: mortalidadeCausas.map((c) => [c.causa, String(c.qtd), c.pct + "%"]),
        theme: "striped",
        headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Feed Chart + Table
    if (racaoSemanal.length > 0) {
      checkPage(75);
      drawGroupedBarChart(doc, 20, y + 14, 170, 40,
        racaoSemanal.map((d) => ({
          label: d.dia,
          values: [d.consumo, d.custo],
          colors: [[245, 158, 11], [59, 130, 246]],
        })),
        [
          { label: "Consumo (kg)", color: [245, 158, 11] },
          { label: "Custo (R$)", color: [59, 130, 246] },
        ],
        "Consumo e Custo de Ração"
      );
      y += 62;
      autoTable(doc, {
        startY: y,
        head: [["Dia", "Consumo (kg)", "Custo (R$)", "Custo/kg (R$)"]],
        body: racaoSemanal.map((d) => [d.dia, d.consumo.toLocaleString("pt-BR"), "R$ " + d.custo.toLocaleString("pt-BR"), d.consumo > 0 ? "R$ " + (d.custo / d.consumo).toFixed(2) : "R$ 0"]),
        theme: "striped",
        headStyles: { fillColor: [168, 85, 247], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14 },
      });
    }

    doc.save(`granja-pro-completo-${periodo.replace(" ", "-")}.pdf`);
    setShowExport(false);
  }

  async function exportExcel() {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Granja Pro";
    wb.created = new Date();
    const timestamp = new Date().toLocaleDateString("pt-BR");

    const headerFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D7A4F" } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    const sectionFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    const sectionFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const totalFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    const totalFont: Partial<ExcelJS.Font> = { bold: true, size: 10 };
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
    const altFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

    function styleHeader(ws: ExcelJS.Worksheet, row: number, cols: number) {
      const r = ws.getRow(row);
      for (let c = 1; c <= cols; c++) {
        const cell = r.getCell(c);
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.border = thinBorder;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
      r.height = 22;
    }

    function styleSection(ws: ExcelJS.Worksheet, row: number, cols: number, text: string) {
      ws.mergeCells(row, 1, row, cols);
      const cell = ws.getCell(row, 1);
      cell.value = text;
      cell.fill = sectionFill;
      cell.font = sectionFont;
      cell.alignment = { vertical: "middle" };
      ws.getRow(row).height = 26;
    }

    function styleDataRows(ws: ExcelJS.Worksheet, startRow: number, endRow: number, cols: number) {
      for (let r = startRow; r <= endRow; r++) {
        const row = ws.getRow(r);
        for (let c = 1; c <= cols; c++) {
          const cell = row.getCell(c);
          cell.border = thinBorder;
          cell.alignment = { vertical: "middle" };
          if ((r - startRow) % 2 === 1) cell.fill = altFill;
        }
        row.height = 20;
      }
    }

    function styleTotalRow(ws: ExcelJS.Worksheet, row: number, cols: number) {
      const r = ws.getRow(row);
      for (let c = 1; c <= cols; c++) {
        const cell = r.getCell(c);
        cell.fill = totalFill;
        cell.font = totalFont;
        cell.border = thinBorder;
      }
      r.height = 22;
    }

    // SHEET 1: Resumo Geral
    const ws1 = wb.addWorksheet("Resumo Geral", { views: [{ state: "frozen", ySplit: 0, xSplit: 0 }] });
    ws1.columns = [
      { width: 24 }, { width: 22 }, { width: 22 }, { width: 24 }, { width: 18 }, { width: 18 },
    ];

    ws1.mergeCells("A1:F1");
    const titleCell = ws1.getCell("A1");
    titleCell.value = "GRANJA PRO — RELATÓRIO COMPLETO";
    titleCell.font = { bold: true, size: 16, color: { argb: "FF1E293B" } };
    titleCell.alignment = { vertical: "middle" };
    ws1.getRow(1).height = 32;

    ws1.mergeCells("A2:B2");
    ws1.getCell("A2").value = `Período: ${periodo}`;
    ws1.getCell("A2").font = { size: 10, color: { argb: "FF64748B" } };
    ws1.mergeCells("C2:D2");
    ws1.getCell("C2").value = `Gerado em: ${timestamp}`;
    ws1.getCell("C2").font = { size: 10, color: { argb: "FF64748B" } };
    ws1.mergeCells("E2:F2");
    ws1.getCell("E2").value = `Saúde: ${healthScore}/100 (${scoreStyle.label})`;
    ws1.getCell("E2").font = { bold: true, size: 10, color: { argb: healthScore >= 80 ? "FF16A34A" : healthScore >= 60 ? "FFD97706" : "FFDC2626" } };

    // KPIs
    let row = 4;
    styleSection(ws1, row, 6, "INDICADORES PRINCIPAIS");
    row++;
    ws1.getRow(row).values = ["Indicador", "Valor", "Variação", "Detalhe", "", ""];
    styleHeader(ws1, row, 4);
    row++;
    const kpis = [
      ["Lucro", `R$ ${lucro.toLocaleString("pt-BR")}`, lucroChange, `Margem: ${margem.toFixed(1)}%`],
      ["Produção", `${totalOvos.toLocaleString("pt-BR")} ovos`, prodChange, `Postura: ${avgPostura}%`],
      ["Mortalidade", `${mortalidadeRate.toFixed(2)}%`, mortChange, `${totalMortes} óbitos`],
      ["Custo/Ovo", `R$ ${custoPerOvo.toFixed(2)}`, custoChange, "Custo de ração por ovo"],
    ];
    kpis.forEach((k, i) => {
      ws1.getRow(row + i).values = [k[0], k[1], k[2], k[3]];
      const varCell = ws1.getCell(row + i, 3);
      const val = k[2] as number;
      const isKpiGood = k[0] === "Mortalidade" ? val <= 0 : val >= 0;
      varCell.value = (val > 0 ? "+" : "") + val + "%";
      varCell.font = { bold: true, color: { argb: isKpiGood ? "FF16A34A" : "FFDC2626" } };
    });
    styleDataRows(ws1, row, row + 3, 4);
    row += 5;

    // Insights
    styleSection(ws1, row, 6, "ALERTAS E AÇÕES RECOMENDADAS");
    row++;
    ws1.getRow(row).values = ["Prioridade", "Alerta", "", "Ação Recomendada", "", ""];
    styleHeader(ws1, row, 4);
    row++;
    insights.forEach((ins, i) => {
      const r = ws1.getRow(row + i);
      r.values = [
        ins.level === "critical" ? "URGENTE" : ins.level === "warning" ? "ATENÇÃO" : "POSITIVO",
        ins.title + " — " + ins.description,
        "",
        ins.action,
      ];
      const pCell = r.getCell(1);
      pCell.font = { bold: true, color: { argb: ins.level === "critical" ? "FFDC2626" : ins.level === "warning" ? "FFD97706" : "FF16A34A" } };
      pCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ins.level === "critical" ? "FFFEE2E2" : ins.level === "warning" ? "FFFEF3C7" : "FFDCFCE7" } };
    });
    styleDataRows(ws1, row, row + insights.length - 1, 4);
    row += insights.length + 1;

    // Profit Trend
    if (lucroTrend.length > 0) {
      styleSection(ws1, row, 6, "EVOLUÇÃO DO LUCRO");
      row++;
      ws1.getRow(row).values = ["Período", "Receita (R$)", "Despesas (R$)", "Lucro (R$)", "Margem (%)", ""];
      styleHeader(ws1, row, 5);
      row++;
      const lucroStart = row;
      lucroTrend.forEach((d, i) => {
        ws1.getRow(row + i).values = [d.periodo, d.receita, d.despesa, d.lucro, d.receita > 0 ? +((d.lucro / d.receita) * 100).toFixed(1) : 0];
      });
      styleDataRows(ws1, lucroStart, lucroStart + lucroTrend.length - 1, 5);
      row = lucroStart + lucroTrend.length;
      ws1.getRow(row).values = ["TOTAL", totalReceita, totalDespesa, lucro, ""];
      styleTotalRow(ws1, row, 5);
      row += 2;
    }

    // Barn Performance
    if (galpaoPerformance.length > 0) {
      styleSection(ws1, row, 6, "PERFORMANCE POR GALPÃO");
      row++;
      ws1.getRow(row).values = ["Galpão", "Ovos", "Postura (%)", "Mortes", "Eficiência (%)", "Status"];
      styleHeader(ws1, row, 6);
      row++;
      const galpaoStart = row;
      galpaoPerformance.forEach((g, i) => {
        const r = ws1.getRow(row + i);
        r.values = [g.galpao, g.ovos, g.postura, g.mortes, g.eficiencia, g.eficiencia >= 85 ? "Bom" : g.eficiencia >= 70 ? "Atenção" : "Crítico"];
        const statusCell = r.getCell(6);
        statusCell.font = { bold: true, color: { argb: g.eficiencia >= 85 ? "FF16A34A" : g.eficiencia >= 70 ? "FFD97706" : "FFDC2626" } };
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: g.eficiencia >= 85 ? "FFDCFCE7" : g.eficiencia >= 70 ? "FFFEF3C7" : "FFFEE2E2" } };
        if (g.mortes > 5) r.getCell(4).font = { bold: true, color: { argb: "FFDC2626" } };
      });
      styleDataRows(ws1, galpaoStart, galpaoStart + galpaoPerformance.length - 1, 6);
      row = galpaoStart + galpaoPerformance.length + 1;
    }

    // Expenses
    if (despesasBreakdown.length > 0) {
      styleSection(ws1, row, 6, "DESPESAS POR CATEGORIA");
      row++;
      ws1.getRow(row).values = ["Categoria", "Valor (R$)", "Percentual (%)", "", "", ""];
      styleHeader(ws1, row, 3);
      row++;
      const despStart = row;
      despesasBreakdown.forEach((d, i) => {
        ws1.getRow(row + i).values = [d.categoria, d.valor, d.pct];
      });
      styleDataRows(ws1, despStart, despStart + despesasBreakdown.length - 1, 3);
      row = despStart + despesasBreakdown.length;
      ws1.getRow(row).values = ["TOTAL", totalDespesa, 100];
      styleTotalRow(ws1, row, 3);
      row += 2;
    }

    // Mortality
    if (mortalidadeCausas.length > 0) {
      styleSection(ws1, row, 6, "CAUSAS DE MORTALIDADE");
      row++;
      ws1.getRow(row).values = ["#", "Causa", "Quantidade", "Percentual (%)", "", ""];
      styleHeader(ws1, row, 4);
      row++;
      const mortStart = row;
      mortalidadeCausas.forEach((c, i) => {
        ws1.getRow(row + i).values = [i + 1, c.causa, c.qtd, c.pct];
      });
      styleDataRows(ws1, mortStart, mortStart + mortalidadeCausas.length - 1, 4);
      row = mortStart + mortalidadeCausas.length + 1;
    }

    // Production vs Meta
    if (producaoSemanal.length > 0) {
      styleSection(ws1, row, 6, "PRODUÇÃO VS META");
      row++;
      ws1.getRow(row).values = ["Dia", "Produção", "Meta", "Diferença", "Atingiu", ""];
      styleHeader(ws1, row, 5);
      row++;
      const prodStart = row;
      producaoSemanal.forEach((d, i) => {
        const r = ws1.getRow(row + i);
        r.values = [d.dia, d.ovos, d.meta, d.ovos - d.meta, d.ovos >= d.meta ? "Sim" : "Não"];
        const atingiuCell = r.getCell(5);
        atingiuCell.font = { bold: true, color: { argb: d.ovos >= d.meta ? "FF16A34A" : "FFDC2626" } };
        atingiuCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: d.ovos >= d.meta ? "FFDCFCE7" : "FFFEE2E2" } };
      });
      styleDataRows(ws1, prodStart, prodStart + producaoSemanal.length - 1, 5);
      row = prodStart + producaoSemanal.length;
      ws1.getRow(row).values = ["TOTAL", totalOvos, "", "", ""];
      styleTotalRow(ws1, row, 5);
      row += 2;
    }

    // Feed
    if (racaoSemanal.length > 0) {
      styleSection(ws1, row, 6, "CONSUMO E CUSTO DE RAÇÃO");
      row++;
      ws1.getRow(row).values = ["Dia", "Consumo (kg)", "Custo (R$)", "Custo/kg (R$)", "", ""];
      styleHeader(ws1, row, 4);
      row++;
      const racStart = row;
      racaoSemanal.forEach((d, i) => {
        ws1.getRow(row + i).values = [d.dia, d.consumo, d.custo, d.consumo > 0 ? +(d.custo / d.consumo).toFixed(2) : 0];
      });
      styleDataRows(ws1, racStart, racStart + racaoSemanal.length - 1, 4);
      row = racStart + racaoSemanal.length;
      ws1.getRow(row).values = ["TOTAL", feedTotal, racaoSemanal.reduce((s, d) => s + d.custo, 0), ""];
      styleTotalRow(ws1, row, 4);
    }

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `granja-pro-completo-${periodo.replace(" ", "-")}.xlsx`);
    setShowExport(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  const noData = totalOvos === 0 && totalMortes === 0 && totalReceita === 0 && totalDespesa === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Relatórios</h1>
            <p className="text-sm text-gray-500 mt-0.5">Veja o que importa. Aja com confiança.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => { setShowPeriodo(!showPeriodo); setShowExport(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              {periodo}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {showPeriodo && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 min-w-[130px]">
                {periodos.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPeriodo(p); setShowPeriodo(false); }}
                    className={cn(
                      "block w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer",
                      p === periodo ? "text-indigo-600 bg-indigo-50 font-semibold" : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => { setShowExport(!showExport); setShowPeriodo(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm shadow-brand-600/20"
            >
              <Download className="w-4 h-4" />
              Exportar
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 min-w-[180px]">
                <button onClick={exportPDF} className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                  <FileDown className="w-4 h-4 text-red-500" />
                  Exportar PDF
                </button>
                <button onClick={exportExcel} className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                  <Sheet className="w-4 h-4 text-emerald-600" />
                  Exportar Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {noData ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum dado encontrado</h3>
          <p className="text-sm text-gray-500">Não há registros para o período selecionado ({periodo}). Tente ampliar o período ou registre dados nas páginas de produção, mortalidade, ração e financeiro.</p>
        </div>
      ) : (
        <>
          {/* Health Score + Top KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Health Score */}
            <div className={cn("lg:col-span-1 rounded-2xl border p-5 flex flex-col items-center justify-center gap-2", scoreStyle.bg, scoreStyle.bg === "bg-emerald-50" ? "border-emerald-200" : scoreStyle.bg === "bg-amber-50" ? "border-amber-200" : "border-red-200")}>
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    className={scoreStyle.ring}
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(healthScore / 100) * 213.6} 213.6`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn("text-2xl font-bold", scoreStyle.text)}>{healthScore}</span>
                </div>
              </div>
              <span className={cn("text-xs font-bold", scoreStyle.text)}>{scoreStyle.label}</span>
              <span className="text-[10px] text-gray-400 font-medium">Saúde da Granja</span>
            </div>

            {/* KPIs */}
            <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Lucro", value: `R$ ${lucro.toLocaleString("pt-BR")}`, change: lucroChange, icon: DollarSign, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", sub: `Margem: ${margem.toFixed(1)}%` },
                { label: "Produção", value: totalOvos.toLocaleString("pt-BR"), change: prodChange, icon: Egg, iconBg: "bg-amber-50", iconColor: "text-amber-600", sub: `Postura: ${avgPostura}%` },
                { label: "Mortalidade", value: `${mortalidadeRate.toFixed(2)}%`, change: mortChange, icon: Activity, iconBg: "bg-red-50", iconColor: "text-red-500", sub: `${totalMortes} óbitos` },
                { label: "Custo/Ovo", value: `R$ ${custoPerOvo.toFixed(2)}`, change: custoChange, icon: Zap, iconBg: "bg-blue-50", iconColor: "text-blue-600", sub: "Custo de ração por ovo" },
              ].map((kpi) => {
                const isPositive = kpi.label === "Mortalidade" ? kpi.change <= 0 : kpi.change >= 0;
                return (
                  <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", kpi.iconBg)}>
                        <kpi.icon className={cn("w-5 h-5", kpi.iconColor)} />
                      </div>
                      {kpi.change !== 0 && (
                        <div className={cn(
                          "flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
                          isPositive ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
                        )}>
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(kpi.change)}%
                        </div>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight">{kpi.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">{kpi.label}</p>
                    <p className="text-[11px] text-gray-500 mt-1.5 font-medium">{kpi.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actionable Insights */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-bold text-gray-900">O que fazer agora</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {insights.map((insight, i) => {
                const cfg = insightConfig[insight.level];
                const Icon = cfg.icon;
                return (
                  <div key={i} className={cn("rounded-2xl border p-4 transition-all duration-200", cfg.bg, cfg.border)}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <Icon className={cn("w-5 h-5", cfg.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className={cn("text-sm font-bold", cfg.titleColor)}>{insight.title}</h3>
                          {insight.metric && (
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0", cfg.metricBg, cfg.metricText)}>
                              {insight.metric}
                            </span>
                          )}
                        </div>
                        <p className={cn("text-xs leading-relaxed mb-2", cfg.descColor)}>{insight.description}</p>
                        <div className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg", cfg.actionBg, cfg.actionText)}>
                          <ArrowRight className="w-3 h-3" />
                          {insight.action}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Profit Trend */}
          {lucroTrend.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Evolução do Lucro</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Receita, despesas e lucro líquido no período</p>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Receita</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Despesas</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-1 rounded bg-indigo-500" /> Lucro</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={lucroTrend}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="periodo" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={customTooltipStyle} formatter={(value: unknown) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />
                  <Area type="monotone" dataKey="receita" stroke="#22c55e" strokeWidth={2} fill="url(#colorReceita)" />
                  <Area type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={2} fill="url(#colorDespesa)" />
                  <Line type="monotone" dataKey="lucro" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: "#6366f1", r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Performance Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Barn Performance Table */}
            {galpaoPerformance.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Performance por Galpão</h3>
                <div className="space-y-3">
                  {galpaoPerformance.map((g) => {
                    const isGood = g.eficiencia >= 85;
                    return (
                      <div key={g.galpao} className="rounded-xl border border-gray-100 p-3.5 hover:border-gray-200 transition-colors">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-sm font-bold text-gray-900">{g.galpao}</span>
                          <span className={cn(
                            "text-xs font-bold px-2.5 py-0.5 rounded-full",
                            isGood ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          )}>
                            {g.eficiencia}%
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Ovos</p>
                            <p className="text-sm font-bold text-gray-800">{g.ovos.toLocaleString("pt-BR")}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Postura</p>
                            <p className="text-sm font-bold text-gray-800">{g.postura}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Mortes</p>
                            <p className={cn("text-sm font-bold", g.mortes > 5 ? "text-red-600" : "text-gray-800")}>{g.mortes}</p>
                          </div>
                        </div>
                        <div className="mt-2.5 h-1.5 rounded-full bg-gray-100">
                          <div
                            className={cn("h-1.5 rounded-full transition-all", isGood ? "bg-emerald-500" : "bg-amber-500")}
                            style={{ width: `${g.eficiencia}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Expense Breakdown + Mortality Causes */}
            <div className="space-y-4">
              {/* Expenses */}
              {despesasBreakdown.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900">Para onde vai o dinheiro</h3>
                    <span className="text-xs text-gray-400 font-medium">Total: R$ {totalDespesa.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="space-y-2.5">
                    {despesasBreakdown.map((d) => (
                      <div key={d.categoria} className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-gray-600 w-24 flex-shrink-0">{d.categoria}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
                        </div>
                        <span className="text-xs font-bold text-gray-900 w-20 text-right">R$ {d.valor.toLocaleString("pt-BR")}</span>
                        <span className="text-[10px] text-gray-400 w-10 text-right">{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mortality causes */}
              {mortalidadeCausas.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900">Causas de mortalidade</h3>
                    <span className="text-xs text-gray-400 font-medium">{periodo}</span>
                  </div>
                  <div className="space-y-2">
                    {mortalidadeCausas.map((c, i) => (
                      <div key={c.causa} className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-gray-300 w-4 text-right">{i + 1}</span>
                        <span className="text-xs text-gray-600 flex-1">{c.causa}</span>
                        <div className="w-24 h-2 rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${c.pct}%`,
                              backgroundColor: i === 0 ? "#ef4444" : i === 1 ? "#f97316" : "#d4d4d8",
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-900 w-6 text-right">{c.qtd}</span>
                        <span className="text-[10px] text-gray-400 w-10 text-right">{c.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Production vs Meta */}
          {producaoSemanal.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Produção Diária vs Meta</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Acompanhe se a produção está atingindo o objetivo</p>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Produção</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Meta</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={producaoSemanal} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dia" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="meta" fill="#e5e7eb" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="ovos" radius={[4, 4, 0, 0]} barSize={24}>
                    {producaoSemanal.map((entry, i) => (
                      <Cell key={i} fill={entry.ovos >= entry.meta ? "#22c55e" : "#f59e0b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
