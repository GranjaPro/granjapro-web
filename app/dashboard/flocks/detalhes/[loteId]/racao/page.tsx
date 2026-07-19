"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  DollarSign,
  Loader2,
  Package,
  Target,
  Wheat,
} from "lucide-react";
import { insightHref } from "@/lib/insight-links";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PlanAwareCalendarFilter, useDateFilter } from "@/components/date-filter";
import { usePlan } from "@/components/plan/plan-provider";
import { hasMinimumPlan } from "@/lib/plans";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Lote {
  id: string;
  code: string;
  bird_count: number;
  arrival_age_weeks: number;
  arrival_date: string;
  production_system: string;
  avg_weight_kg: number | null;
}

interface FeedRecord {
  id: string;
  date: string;
  quantity_kg: number;
  cost: number;
  feed_type: string;
  cost_per_egg: number;
}

interface ProductionRecord {
  id: string;
  date: string;
  eggs_produced: number;
}

type ProductionStage =
  | "cria"
  | "recria"
  | "pre-postura"
  | "producao"
  | "pico"
  | "estavel"
  | "declinio"
  | "descarte";

type FeedTrend = "up" | "down" | "stable";
type FeedHistoryRange = "7d" | "30d" | "meses" | "total";

function calculateCurrentAge(arrivalDate: string, arrivalAgeWeeks: number): number {
  const arrival = new Date(`${arrivalDate}T00:00:00`);
  const now = new Date();
  const diffMs = now.getTime() - arrival.getTime();
  const weeksSinceArrival = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return arrivalAgeWeeks + weeksSinceArrival;
}

function getProductionStage(ageWeeks: number): ProductionStage {
  if (ageWeeks <= 5) return "cria";
  if (ageWeeks <= 16) return "recria";
  if (ageWeeks <= 18) return "pre-postura";
  if (ageWeeks <= 28) return "producao";
  if (ageWeeks <= 40) return "pico";
  if (ageWeeks <= 60) return "estavel";
  if (ageWeeks <= 80) return "declinio";
  return "descarte";
}

const stageLabel: Record<ProductionStage, string> = {
  cria: "Cria",
  recria: "Recria",
  "pre-postura": "Pré-postura",
  producao: "Produção inicial",
  pico: "Pico de produção",
  estavel: "Estável",
  declinio: "Declínio",
  descarte: "Descarte",
};

const feedTargetByStage: Record<ProductionStage, { min: number; max: number; ideal: number }> = {
  cria: { min: 25, max: 55, ideal: 40 },
  recria: { min: 55, max: 95, ideal: 75 },
  "pre-postura": { min: 95, max: 110, ideal: 102 },
  producao: { min: 110, max: 120, ideal: 115 },
  pico: { min: 115, max: 125, ideal: 120 },
  estavel: { min: 110, max: 120, ideal: 115 },
  declinio: { min: 100, max: 115, ideal: 108 },
  descarte: { min: 90, max: 105, ideal: 98 },
};

const feedCompositionByStage: Partial<
  Record<ProductionStage, Array<{ ingredient: string; percentage: string; tone: string }>>
> = {
  cria: [
    { ingredient: "Milho", percentage: "55-60%", tone: "bg-amber-50 text-amber-700 border-amber-200" },
    { ingredient: "Farelo de soja", percentage: "30-35%", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { ingredient: "Óleo vegetal", percentage: "2-4%", tone: "bg-orange-50 text-orange-700 border-orange-200" },
    { ingredient: "Calcário calcítico", percentage: "1%", tone: "bg-slate-50 text-slate-700 border-slate-200" },
    { ingredient: "Fosfato bicálcico", percentage: "1,5%", tone: "bg-sky-50 text-sky-700 border-sky-200" },
    { ingredient: "Premix vitamínico-mineral", percentage: "1-2%", tone: "bg-violet-50 text-violet-700 border-violet-200" },
    { ingredient: "Sal", percentage: "0,3-0,5%", tone: "bg-zinc-50 text-zinc-700 border-zinc-200" },
  ],
  recria: [
    { ingredient: "Milho", percentage: "60-65%", tone: "bg-amber-50 text-amber-700 border-amber-200" },
    { ingredient: "Farelo de soja", percentage: "20-25%", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { ingredient: "Farelo de trigo ou casca de soja", percentage: "3-5%", tone: "bg-lime-50 text-lime-700 border-lime-200" },
    { ingredient: "Óleo vegetal", percentage: "1-2%", tone: "bg-orange-50 text-orange-700 border-orange-200" },
    { ingredient: "Calcário calcítico", percentage: "1-1,2%", tone: "bg-slate-50 text-slate-700 border-slate-200" },
    { ingredient: "Fosfato bicálcico", percentage: "1-1,3%", tone: "bg-sky-50 text-sky-700 border-sky-200" },
    { ingredient: "Premix vitamínico-mineral", percentage: "1-2%", tone: "bg-violet-50 text-violet-700 border-violet-200" },
    { ingredient: "Sal", percentage: "0,3-0,5%", tone: "bg-zinc-50 text-zinc-700 border-zinc-200" },
  ],
  "pre-postura": [
    { ingredient: "Milho", percentage: "58-62%", tone: "bg-amber-50 text-amber-700 border-amber-200" },
    { ingredient: "Farelo de soja", percentage: "25-28%", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { ingredient: "Calcário calcítico", percentage: "2,5-3%", tone: "bg-slate-50 text-slate-700 border-slate-200" },
    { ingredient: "Fosfato bicálcico", percentage: "1,2%", tone: "bg-sky-50 text-sky-700 border-sky-200" },
    { ingredient: "Óleo vegetal", percentage: "1,5-2%", tone: "bg-orange-50 text-orange-700 border-orange-200" },
    { ingredient: "Premix vitamínico-mineral", percentage: "1-2%", tone: "bg-violet-50 text-violet-700 border-violet-200" },
    { ingredient: "Sal", percentage: "0,3-0,5%", tone: "bg-zinc-50 text-zinc-700 border-zinc-200" },
  ],
  producao: [
    { ingredient: "Milho", percentage: "55-60%", tone: "bg-amber-50 text-amber-700 border-amber-200" },
    { ingredient: "Farelo de soja", percentage: "25-30%", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { ingredient: "Calcário calcítico", percentage: "3,5-4%", tone: "bg-slate-50 text-slate-700 border-slate-200" },
    { ingredient: "Fosfato bicálcico", percentage: "1-1,2%", tone: "bg-sky-50 text-sky-700 border-sky-200" },
    { ingredient: "Óleo vegetal", percentage: "2-3%", tone: "bg-orange-50 text-orange-700 border-orange-200" },
    { ingredient: "Premix vitamínico-mineral", percentage: "1-2%", tone: "bg-violet-50 text-violet-700 border-violet-200" },
    { ingredient: "Sal", percentage: "0,3-0,5%", tone: "bg-zinc-50 text-zinc-700 border-zinc-200" },
  ],
  pico: [
    { ingredient: "Milho", percentage: "55-58%", tone: "bg-amber-50 text-amber-700 border-amber-200" },
    { ingredient: "Farelo de soja", percentage: "28-32%", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { ingredient: "Calcário calcítico", percentage: "3,8-4,2%", tone: "bg-slate-50 text-slate-700 border-slate-200" },
    { ingredient: "Fosfato bicálcico", percentage: "1-1,2%", tone: "bg-sky-50 text-sky-700 border-sky-200" },
    { ingredient: "Óleo vegetal", percentage: "2-3%", tone: "bg-orange-50 text-orange-700 border-orange-200" },
    { ingredient: "Premix vitamínico-mineral", percentage: "1-2%", tone: "bg-violet-50 text-violet-700 border-violet-200" },
    { ingredient: "Sal", percentage: "0,3-0,5%", tone: "bg-zinc-50 text-zinc-700 border-zinc-200" },
  ],
  estavel: [
    { ingredient: "Milho", percentage: "60-65%", tone: "bg-amber-50 text-amber-700 border-amber-200" },
    { ingredient: "Farelo de soja", percentage: "20-25%", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { ingredient: "Calcário calcítico", percentage: "4-4,5%", tone: "bg-slate-50 text-slate-700 border-slate-200" },
    { ingredient: "Fosfato bicálcico", percentage: "1%", tone: "bg-sky-50 text-sky-700 border-sky-200" },
    { ingredient: "Óleo vegetal", percentage: "1,5-2%", tone: "bg-orange-50 text-orange-700 border-orange-200" },
    { ingredient: "Premix vitamínico-mineral", percentage: "1-2%", tone: "bg-violet-50 text-violet-700 border-violet-200" },
    { ingredient: "Sal", percentage: "0,3-0,5%", tone: "bg-zinc-50 text-zinc-700 border-zinc-200" },
  ],
  declinio: [
    { ingredient: "Milho", percentage: "60-65%", tone: "bg-amber-50 text-amber-700 border-amber-200" },
    { ingredient: "Farelo de soja", percentage: "18-22%", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { ingredient: "Calcário calcítico", percentage: "4,5-5%", tone: "bg-slate-50 text-slate-700 border-slate-200" },
    { ingredient: "Fosfato bicálcico", percentage: "1%", tone: "bg-sky-50 text-sky-700 border-sky-200" },
    { ingredient: "Óleo vegetal", percentage: "1-2%", tone: "bg-orange-50 text-orange-700 border-orange-200" },
    { ingredient: "Premix vitamínico-mineral", percentage: "1-2%", tone: "bg-violet-50 text-violet-700 border-violet-200" },
    { ingredient: "Sal", percentage: "0,3-0,5%", tone: "bg-zinc-50 text-zinc-700 border-zinc-200" },
  ],
};

function formatDecimal(value: number, digits = 1) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getCompositionMidpoint(percentage: string) {
  const normalized = percentage.replace("%", "").replace(",", ".");
  if (normalized.includes("-")) {
    const [min, max] = normalized.split("-").map((value) => Number(value.trim()));
    return (min + max) / 2;
  }
  return Number(normalized.trim());
}

function getMonthLabel(date: Date) {
  return date
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .replace(/^./, (char) => char.toUpperCase());
}

function getCodeSeed(value: string) {
  return value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const days: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end && days.length < 400) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function buildMockLote(loteId: string): Lote {
  const seed = getCodeSeed(loteId);
  const codeNumber = String((seed % 90) + 10).padStart(3, "0");
  const arrival = new Date();
  arrival.setDate(arrival.getDate() - ((seed % 160) + 35));

  return {
    id: loteId,
    code: `L${codeNumber}`,
    bird_count: 900 + (seed % 7) * 80,
    arrival_age_weeks: 1 + (seed % 18),
    arrival_date: arrival.toISOString().slice(0, 10),
    production_system: seed % 2 === 0 ? "automatico" : "piso",
    avg_weight_kg: Number((1.45 + (seed % 8) * 0.08).toFixed(2)),
  };
}

function buildMockFeedData(lote: Lote, startDate: string, endDate: string) {
  const ageWeeks = calculateCurrentAge(lote.arrival_date, lote.arrival_age_weeks);
  const stage = getProductionStage(ageWeeks);
  const target = feedTargetByStage[stage];
  const seed = getCodeSeed(`${lote.id}-${lote.code}`);
  const days = buildDateRange(startDate, endDate);

  const stageFeedTypes: Record<ProductionStage, string[]> = {
    cria: ["Pré-inicial", "Inicial", "Inicial Plus"],
    recria: ["Crescimento", "Recria", "Recria Plus"],
    "pre-postura": ["Pré-postura", "Transição", "Pré-postura Plus"],
    producao: ["Postura 1", "Postura Balanceada", "Postura 18%"],
    pico: ["Postura Pico", "Alta Energia", "Postura 18%"],
    estavel: ["Postura 2", "Postura Balanceada", "Manutenção"],
    declinio: ["Manutenção", "Postura 2", "Fibra Controlada"],
    descarte: ["Manutenção", "Baixa Densidade", "Fibra Controlada"],
  };

  const stageEggRate: Record<ProductionStage, number> = {
    cria: 0,
    recria: 0,
    "pre-postura": 0.18,
    producao: 0.82,
    pico: 0.93,
    estavel: 0.88,
    declinio: 0.73,
    descarte: 0.42,
  };

  const feedRecords: FeedRecord[] = days.map((date, index) => {
    const wave = Math.sin((index + seed) / 2.8) * 4.8;
    const seasonal = Math.cos((index + seed) / 5.2) * 2.4;
    const gramsPerBird = clamp(target.ideal + wave + seasonal, target.min - 4, target.max + 4);
    const quantityKg = Number(((gramsPerBird * lote.bird_count) / 1000).toFixed(1));
    const feedTypeOptions = stageFeedTypes[stage];
    const feedType = feedTypeOptions[index % feedTypeOptions.length];
    const costPerKg =
      stage === "cria" || stage === "pre-postura"
        ? 3.25 + ((index + seed) % 5) * 0.06
        : 2.65 + ((index + seed) % 6) * 0.05;
    const cost = Number((quantityKg * costPerKg).toFixed(2));

    return {
      id: `feed-${index}`,
      date: date.toISOString().slice(0, 10),
      quantity_kg: quantityKg,
      cost,
      feed_type: feedType,
      cost_per_egg: 0,
    };
  });

  const productionRecords: ProductionRecord[] = days.map((date, index) => {
    const dailyRateBase = stageEggRate[stage];
    const dailyRate = clamp(dailyRateBase + Math.sin((index + seed) / 4.1) * 0.018, 0, 0.98);
    return {
      id: `production-${index}`,
      date: date.toISOString().slice(0, 10),
      eggs_produced: Math.round(lote.bird_count * dailyRate),
    };
  });

  return { feedRecords, productionRecords };
}

export default function RacaoLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const { farm, loading: authLoading } = useAuth();
  const { plan } = usePlan();
  const { dateRange } = useDateFilter();
  const canUseDateFilter = hasMinimumPlan(plan, "pro");

  const [lote, setLote] = useState<Lote | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [feedHistoryRange, setFeedHistoryRange] = useState<FeedHistoryRange>("7d");

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function fetchData() {
      setInitialLoading(true);

      if (!farm) {
        if (!cancelled) {
          setLote(buildMockLote(loteId));
          setInitialLoading(false);
        }
        return;
      }

      const supabase = createClient();
      const loteRes = await supabase
        .from("flocks")
        .select("id, code, bird_count, arrival_age_weeks, arrival_date, production_system, avg_weight_kg")
        .eq("id", loteId)
        .eq("farm_id", farm.id)
        .maybeSingle();

      if (cancelled) return;

      setLote((loteRes.data as Lote | null) ?? buildMockLote(loteId));
      setInitialLoading(false);
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [authLoading, farm, loteId]);

  const effectiveDateRange = useMemo(() => {
    if (canUseDateFilter) return dateRange;

    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 29);
    return { startDate: toDateKey(start), endDate: toDateKey(end) };
  }, [canUseDateFilter, dateRange]);

  const { feedRecords, productionRecords } = useMemo(() => {
    if (!lote) return { feedRecords: [], productionRecords: [] };
    return buildMockFeedData(lote, effectiveDateRange.startDate, effectiveDateRange.endDate);
  }, [effectiveDateRange.endDate, effectiveDateRange.startDate, lote]);

  const metrics = useMemo(() => {
    if (!lote) return null;

    const currentAge = calculateCurrentAge(lote.arrival_date, lote.arrival_age_weeks);
    const stage = getProductionStage(currentAge);
    const target = feedTargetByStage[stage];
    const totalKg = feedRecords.reduce((sum, record) => sum + Number(record.quantity_kg ?? 0), 0);
    const totalCost = feedRecords.reduce((sum, record) => sum + Number(record.cost ?? 0), 0);
    const realEggs = productionRecords.reduce((sum, record) => sum + Number(record.eggs_produced ?? 0), 0);
    const totalEggs = realEggs > 0 ? realEggs : Math.round(lote.bird_count * 0.85 * feedRecords.length);
    const activeDays = feedRecords.length;
    const avgDailyKg = activeDays > 0 ? totalKg / activeDays : 0;
    const gramsPerBird = activeDays > 0 && lote.bird_count > 0 ? (totalKg * 1000) / (lote.bird_count * activeDays) : 0;
    const costPerKg = totalKg > 0 ? totalCost / totalKg : 0;
    const costPerEgg = totalEggs > 0 ? totalCost / totalEggs : 0;
    const kgPerEgg = totalEggs > 0 ? totalKg / totalEggs : 0;
    const latestFeedType = feedRecords.length > 0 ? feedRecords[feedRecords.length - 1].feed_type || "Não informado" : "Sem registro";

    let trend: FeedTrend = "stable";
    if (feedRecords.length >= 2) {
      const recentSlice = feedRecords.slice(-Math.min(3, feedRecords.length));
      const previousSlice = feedRecords.slice(Math.max(0, feedRecords.length - 6), Math.max(0, feedRecords.length - 3));
      const recentAvg = recentSlice.reduce((sum, record) => sum + Number(record.quantity_kg ?? 0), 0) / recentSlice.length;
      const previousAvg = previousSlice.length > 0
        ? previousSlice.reduce((sum, record) => sum + Number(record.quantity_kg ?? 0), 0) / previousSlice.length
        : recentAvg;

      if (recentAvg > previousAvg * 1.03) trend = "up";
      else if (recentAvg < previousAvg * 0.97) trend = "down";
    }

    const outOfRange =
      gramsPerBird < target.min
        ? (target.min - gramsPerBird) / Math.max(target.min, 1)
        : gramsPerBird > target.max
          ? (gramsPerBird - target.max) / Math.max(target.max, 1)
          : 0;
    const trendPenalty = trend === "stable" ? 0 : 4;
    const idealDiff = gramsPerBird < target.ideal ? (target.ideal - gramsPerBird) / Math.max(target.ideal, 1) : 0;
    const score = Math.max(38, Math.min(96, Math.round(94 - outOfRange * 95 - idealDiff * 40 - trendPenalty)));
    const status =
      score >= 90
        ? {
            label: "Verde",
            text: "text-emerald-600",
            ring: "#10b981",
            border: "border-emerald-200",
            background: "from-emerald-50/80 via-white to-white",
          }
        : score >= 72
          ? {
              label: "Atenção",
              text: "text-amber-600",
              ring: "#f59e0b",
              border: "border-amber-200",
              background: "from-amber-50/80 via-white to-white",
            }
          : {
              label: "Vermelho",
              text: "text-red-600",
              ring: "#ef4444",
              border: "border-red-200",
              background: "from-red-50/80 via-white to-white",
            };

    return {
      currentAge,
      stage,
      target,
      totalKg,
      totalCost,
      totalEggs,
      activeDays,
      avgDailyKg,
      gramsPerBird,
      costPerKg,
      costPerEgg,
      kgPerEgg,
      latestFeedType,
      trend,
      score,
      status,
    };
  }, [feedRecords, lote, productionRecords]);

  const recommendations = useMemo(() => {
    if (!metrics) return [];

    const items: Array<{ title: string; consequences: string[]; impact: "alto" | "medio" | "baixo" }> = [];

    const stage = stageLabel[metrics.stage];
    const mockCostPerEgg = 0.18;
    const mockCostPerEggTarget = 0.15;
    const diffPercent = metrics.target.ideal > 0 ? Math.round(((metrics.gramsPerBird - metrics.target.ideal) / metrics.target.ideal) * 100) : 0;

    if (metrics.gramsPerBird < metrics.target.min) {
      items.push({
        title: `Consumo muito abaixo da faixa (${diffPercent}%)`,
        consequences: [
          "pode comprometer crescimento e imunidade",
          "risco: atraso na maturidade produtiva",
        ],
        impact: "alto",
      });
    } else if (metrics.gramsPerBird < metrics.target.ideal) {
      items.push({
        title: `Consumo abaixo da meta (${diffPercent}%)`,
        consequences:
          metrics.stage === "cria" || metrics.stage === "recria"
            ? ["pode impactar ganho de peso", "risco: atraso na maturidade produtiva"]
            : ["pode reduzir taxa de postura", "risco: queda de uniformidade no lote"],
        impact: "medio",
      });
    }

    if (metrics.gramsPerBird > metrics.target.max) {
      items.push({
        title: `Consumo acima da faixa (+${diffPercent}%)`,
        consequences: [
          "possível desperdício ou erro de regulagem",
          "risco: aumento do custo/ovo sem ganho produtivo",
        ],
        impact: "medio",
      });
    }

    if (metrics.trend === "down") {
      items.push({
        title: "Tendência de queda no consumo",
        consequences: [
          "pode antecipar queda de postura",
          "risco: piora de uniformidade e conversão alimentar",
        ],
        impact: "alto",
      });
    }

    if (metrics.costPerKg > 0 && metrics.costPerKg >= 3.2) {
      items.push({
        title: `Custo/kg elevado (R$ ${formatDecimal(metrics.costPerKg, 2)})`,
        consequences: [
          "margem por ovo comprometida",
          "avaliar: renegociar fornecedor ou ajustar fórmula",
        ],
        impact: "medio",
      });
    }

    if (mockCostPerEgg > mockCostPerEggTarget) {
      items.push({
        title: `Custo/ovo acima da referência (R$ ${mockCostPerEgg.toFixed(2)} vs R$ ${mockCostPerEggTarget.toFixed(2)})`,
        consequences: [
          "rentabilidade abaixo do esperado",
          "avaliar: volume de compra ou troca de insumos",
        ],
        impact: "medio",
      });
    }

    if (metrics.stage === "cria" || metrics.stage === "recria") {
      items.push({
        title: `Lote em fase de ${stage.toLowerCase()}`,
        consequences: [
          "garantir proteína adequada para desenvolvimento",
          "foco: uniformidade corporal do lote",
        ],
        impact: "baixo",
      });
    }

    if (metrics.stage === "pico" || metrics.stage === "producao") {
      items.push({
        title: `Fase de ${stage.toLowerCase()} ativa`,
        consequences: [
          "manter aporte energético e cálcio",
          "foco: sustentar postura e qualidade de casca",
        ],
        impact: "baixo",
      });
    }

    if (items.length === 0) {
      items.push({
        title: "Consumo dentro do esperado",
        consequences: ["manter rotina de acompanhamento diário"],
        impact: "baixo",
      });
    }

    return items.slice(0, 5);
  }, [metrics]);

  const historyData = useMemo(() => {
    if (!lote || lote.bird_count <= 0) return [];

    return feedRecords.map((record) => ({
      date: new Date(`${record.date}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      consumoKg: Number(record.quantity_kg ?? 0),
      consumoAve: Number((((record.quantity_kg ?? 0) * 1000) / lote.bird_count).toFixed(1)),
      meta: metrics?.target.ideal ?? 0,
    }));
  }, [feedRecords, lote, metrics]);

  const historyChartData = useMemo(() => {
    if (!lote || !metrics) return [];

    const today = new Date();
    const target = metrics.target.ideal;
    const base = metrics.gramsPerBird;

    if (feedHistoryRange === "7d") {
      return historyData.slice(-7).map((item) => ({
        label: item.date,
        consumoAve: item.consumoAve,
        meta: item.meta,
      }));
    }

    if (feedHistoryRange === "30d") {
      return Array.from({ length: 30 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (29 - index));
        const factor = 1 + Math.sin((index + 3) / 4.2) * 0.05 + (((index % 6) - 2) * 0.007);
        return {
          label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          consumoAve: Number((base * factor).toFixed(1)),
          meta: target,
        };
      });
    }

    if (feedHistoryRange === "meses") {
      return Array.from({ length: 6 }, (_, index) => {
        const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
        const factor = 1 + Math.sin((index + 1) * 0.85) * 0.06;
        return {
          label: getMonthLabel(date),
          consumoAve: Number((base * factor).toFixed(1)),
          meta: target,
        };
      });
    }

    return Array.from({ length: 12 }, (_, index) => {
      const factor = 1 + Math.sin((index + 1) * 0.55) * 0.08 + (((index % 4) - 1.5) * 0.01);
      return {
        label: `Sem ${index + 1}`,
        consumoAve: Number((base * factor).toFixed(1)),
        meta: target,
      };
    });
  }, [feedHistoryRange, historyData, lote, metrics]);

  const monthlyData = useMemo(() => {
    const grouped = new Map<string, { consumoKg: number; custo: number }>();

    feedRecords.forEach((record) => {
      const date = new Date(`${record.date}T12:00:00`);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const current = grouped.get(key) ?? { consumoKg: 0, custo: 0 };
      current.consumoKg += Number(record.quantity_kg ?? 0);
      current.custo += Number(record.cost ?? 0);
      grouped.set(key, current);
    });

    return Array.from(grouped.entries()).map(([key, value]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        mes: getMonthLabel(new Date(year, month, 1)),
        consumoKg: Number(value.consumoKg.toFixed(1)),
        custo: Number(value.custo.toFixed(2)),
      };
    });
  }, [feedRecords]);

  const feedComposition = useMemo(
    () => (metrics ? feedCompositionByStage[metrics.stage] ?? [] : []),
    [metrics],
  );
  const feedCompositionSummary = useMemo(() => {
    if (!metrics || metrics.stage === "descarte" || feedComposition.length === 0) return null;

    const energyBase = feedComposition.find((item) => item.ingredient === "Milho");
    const proteinBase = feedComposition.find((item) => item.ingredient === "Farelo de soja");
    const mineralFocus = feedComposition.find((item) => item.ingredient.includes("Calcário"));

    return {
      energyBase,
      proteinBase,
      mineralFocus,
      highestShare: Math.max(...feedComposition.map((item) => getCompositionMidpoint(item.percentage))),
    };
  }, [feedComposition, metrics]);

  const phaseFeedChart = useMemo(
    () => [
      { fase: "Cria", minimo: 5, maximo: 40, estimado: metrics?.stage === "cria" ? metrics.gramsPerBird : 0 },
      { fase: "Recria", minimo: 40, maximo: 90, estimado: metrics?.stage === "recria" ? metrics.gramsPerBird : 0 },
      { fase: "Pré-postura", minimo: 90, maximo: 105, estimado: metrics?.stage === "pre-postura" ? metrics.gramsPerBird : 0 },
      { fase: "Produção", minimo: 100, maximo: 115, estimado: metrics?.stage === "producao" ? metrics.gramsPerBird : 0 },
      { fase: "Pico", minimo: 110, maximo: 125, estimado: metrics?.stage === "pico" ? metrics.gramsPerBird : 0 },
      { fase: "Estável", minimo: 105, maximo: 120, estimado: metrics?.stage === "estavel" ? metrics.gramsPerBird : 0 },
      { fase: "Declínio", minimo: 100, maximo: 115, estimado: metrics?.stage === "declinio" ? metrics.gramsPerBird : 0 },
      { fase: "Descarte", minimo: 90, maximo: 110, estimado: metrics?.stage === "descarte" ? metrics.gramsPerBird : 0 },
    ],
    [metrics],
  );

  const feedKpis = useMemo(() => {
    if (!lote || !metrics) return [];

    const markerPercent = 75;
    const targetTotalKg =
      metrics.activeDays > 0 ? (metrics.target.ideal * lote.bird_count * metrics.activeDays) / 1000 : 0;
    const costPerKgTarget =
      metrics.stage === "cria" || metrics.stage === "pre-postura"
        ? 3.25
        : metrics.stage === "producao" || metrics.stage === "pico"
          ? 2.95
          : 2.8;
    const costPerEggTarget =
      metrics.totalEggs > 0 ? Number((((targetTotalKg * costPerKgTarget) / metrics.totalEggs)).toFixed(3)) : null;

    const buildMetaBar = (performancePercent: number | null) => {
      if (performancePercent === null || !Number.isFinite(performancePercent)) {
        return {
          progress: 0,
          progressColor: "bg-gray-300",
          statusText: "Sem meta",
        };
      }

      const safePercent = Math.max(0, Math.min(performancePercent, 200));
      const diff = safePercent - 100;

      return {
        progress: Math.min((safePercent / 100) * markerPercent, 100),
        progressColor:
          safePercent < 100 ? (safePercent >= 90 ? "bg-amber-500" : "bg-red-500") : "bg-emerald-500",
        statusText:
          Math.abs(diff) < 1
            ? "Dentro"
            : diff < 0
              ? `Abaixo em ${Math.round(Math.abs(diff))}%`
              : `Acima em ${Math.round(diff)}%`,
      };
    };

    const totalMeta = buildMetaBar(targetTotalKg > 0 ? (metrics.totalKg / targetTotalKg) * 100 : null);
    const perBirdMeta = buildMetaBar(metrics.target.ideal > 0 ? (metrics.gramsPerBird / metrics.target.ideal) * 100 : null);
    const costKgMeta = buildMetaBar(metrics.costPerKg > 0 ? (costPerKgTarget / metrics.costPerKg) * 100 : null);
    const costEggMeta = buildMetaBar(
      metrics.totalEggs > 0 && metrics.costPerEgg > 0 && costPerEggTarget
        ? (costPerEggTarget / metrics.costPerEgg) * 100
        : null,
    );

    return [
      {
        label: "Consumo diário",
        value: `${formatDecimal(metrics.totalKg)} kg`,
        helper: `${lote.bird_count.toLocaleString("pt-BR")} aves`,
        targetLabel: `Meta: ${formatDecimal(targetTotalKg)} kg`,
        progress: totalMeta.progress,
        progressColor: totalMeta.progressColor,
        statusText: totalMeta.statusText,
      },
      {
        label: "Consumo/ave/dia",
        value: `${formatDecimal(metrics.gramsPerBird)} g`,
        helper: `Faixa ideal: ${metrics.target.min}-${metrics.target.max} g`,
        targetLabel: `Meta: ${metrics.target.ideal} g`,
        progress: perBirdMeta.progress,
        progressColor: perBirdMeta.progressColor,
        statusText: perBirdMeta.statusText,
      },
      {
        label: "Custo/kg",
        value: `R$ ${formatDecimal(metrics.costPerKg, 2)}`,
        helper: "Média ponderada do período",
        targetLabel: `Meta: R$ ${formatDecimal(costPerKgTarget, 2)}`,
        progress: costKgMeta.progress,
        progressColor: costKgMeta.progressColor,
        statusText: costKgMeta.statusText,
      },
      {
        label: "Custo/ovo",
        value: metrics.totalEggs > 0 ? `R$ ${formatDecimal(metrics.costPerEgg, 3)}` : "—",
        helper: "Baseado na produção simulada do período",
        targetLabel:
          costPerEggTarget !== null ? `Meta: R$ ${formatDecimal(costPerEggTarget, 3)}` : "Meta indisponível",
        progress: costEggMeta.progress,
        progressColor: costEggMeta.progressColor,
        statusText: costEggMeta.statusText,
      },
    ];
  }, [lote, metrics]);

  if (authLoading || initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!lote || !metrics) {
    return (
      <div className="space-y-6">
        <Link
          href={`/dashboard/flocks/detalhes/${loteId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Detalhes
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-gray-400">Lote não encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/flocks/detalhes/${loteId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Detalhes
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
              <Wheat className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ração - {lote.code}</h1>
              <p className="text-sm text-gray-400 mt-0.5">Consumo e custo alimentar detalhados do lote</p>
            </div>
          </div>
          <PlanAwareCalendarFilter />
        </div>
      </div>

      <div
        className={cn(
          "rounded-2xl border bg-gradient-to-r p-5 lg:p-6",
          metrics.status.border,
          metrics.status.background,
        )}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
          <div className="flex min-w-0 items-center gap-4 lg:w-[460px]">
            <div className="relative h-16 w-16 flex-shrink-0">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={metrics.status.ring}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${(metrics.score / 100) * 175.9} 175.9`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-base font-bold", metrics.status.text)}>{metrics.score}</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Wheat className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-bold text-gray-900">Saúde alimentar do lote</span>
              </div>
              <p className={cn("mt-0.5 text-xl font-bold", metrics.status.text)}>{metrics.status.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Consumo: {formatDecimal(metrics.avgDailyKg)} kg/dia | Faixa: {metrics.target.min} a {metrics.target.max} g/ave/dia
              </p>
              <div className="mt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Score baseado em:
                </p>
                <ul className="mt-1 space-y-0.5">
                  <li className="text-xs text-gray-600">• Consumo por ave vs fase do lote</li>
                  <li className="text-xs text-gray-600">• Tendência recente de consumo</li>
                  <li className="text-xs text-gray-600">• Pressão de custo alimentar</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="hidden lg:block w-px self-stretch bg-gray-200/70" />

          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Recomendações automáticas
            </p>
            <ul className="space-y-1.5">
              {recommendations.map((rec, index) => {
                const link = insightHref(`${rec.title} ${rec.consequences.join(" ")}`);
                const impactColor =
                  rec.impact === "alto"
                    ? "text-red-600"
                    : rec.impact === "medio"
                      ? "text-amber-600"
                      : "text-emerald-600";
                const dotColor =
                  rec.impact === "alto"
                    ? "bg-red-500"
                    : rec.impact === "medio"
                      ? "bg-amber-500"
                      : "bg-emerald-500";

                return (
                  <li key={`${rec.title}-${index}`} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className={cn("mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full", dotColor)} />
                    <div>
                      <span className="font-semibold text-gray-900">{rec.title}</span>
                      {rec.consequences.map((c, i) => (
                        <span key={i} className="block text-xs text-gray-500 mt-0.5">→ {c}</span>
                      ))}
                      <Link href={link.href} className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                        {link.label}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">Alimentação do lote</p>
            <h2 className="text-3xl font-bold text-gray-900 mt-1">
              {formatDecimal(metrics.avgDailyKg)} kg/dia
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {metrics.gramsPerBird >= metrics.target.min && metrics.gramsPerBird <= metrics.target.max
                ? "Consumo dentro da faixa esperada para a fase atual do lote."
                : "Consumo fora da faixa esperada para a fase atual do lote."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-blue-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-blue-500 font-semibold">Consumo/ave</p>
              <p className="text-lg font-bold text-blue-900 mt-1">
                {formatDecimal(metrics.gramsPerBird, 0)} g
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Meta diária</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {metrics.target.ideal} g
              </p>
            </div>
            <div className="rounded-xl bg-orange-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-orange-500 font-semibold">Fase</p>
              <p className="text-lg font-bold text-orange-900 mt-1">
                {stageLabel[metrics.stage]}
              </p>
            </div>
            <div className="rounded-xl bg-indigo-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-indigo-500 font-semibold">30 dias</p>
              <p className="text-lg font-bold text-indigo-900 mt-1">
                {formatDecimal(metrics.avgDailyKg * 30, 0)} kg
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {feedKpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight mt-2">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-2">{kpi.helper}</p>
            <div className="relative mt-2.5">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", kpi.progressColor)}
                  style={{ width: `${kpi.progress}%` }}
                />
              </div>
              <div
                className="absolute top-[-3px] w-0.5 h-4 bg-gray-800 rounded-full"
                style={{ left: "75%" }}
                title={kpi.targetLabel}
              />
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-900 flex-shrink-0" />
                <span className="text-[10px] text-gray-500 font-medium truncate">{kpi.targetLabel}</span>
              </div>
              <span className="text-[10px] font-semibold text-gray-600 flex-shrink-0">{kpi.statusText}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Histórico de consumo por ave</h3>
              <p className="text-xs text-gray-400 mt-0.5">Consumo em g por ave com meta da fase</p>
            </div>
            <div className="inline-flex rounded-2xl bg-gray-100 p-1">
              {[
                { id: "7d", label: "Últimos 7 dias" },
                { id: "30d", label: "Últimos 30 dias" },
                { id: "meses", label: "Meses" },
                { id: "total", label: "Tempo total" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFeedHistoryRange(option.id as FeedHistoryRange)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:flex-none",
                    feedHistoryRange === option.id ? "bg-white text-blue-700 shadow-sm" : "text-gray-500",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyChartData} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="feedPerBirdFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit=" g" />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  formatter={((value: unknown, name: unknown) => [
                    `${formatDecimal(Number(value ?? 0))} g`,
                    name === "consumoAve" ? "Consumo por ave" : "Meta",
                  ]) as never}
                />
                <Area type="monotone" dataKey="consumoAve" stroke="#f97316" strokeWidth={2.5} fill="url(#feedPerBirdFill)" />
                <Line type="monotone" dataKey="meta" stroke="#fdba74" strokeWidth={1.75} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {metrics.stage !== "descarte" ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50/50 to-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="inline-flex items-center rounded-full border border-orange-200 bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-600 shrink-0">
                    Fase {stageLabel[metrics.stage]}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 truncate">Composição recomendada da ração</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Energética</p>
                    <p className="text-xs font-bold text-gray-900">{feedCompositionSummary?.energyBase?.ingredient ?? "Milho"}</p>
                    <p className="text-[10px] font-medium text-amber-700">{feedCompositionSummary?.energyBase?.percentage ?? "—"}</p>
                  </div>
                  <div className="w-px h-8 bg-orange-200/60" />
                  <div className="text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Proteica</p>
                    <p className="text-xs font-bold text-gray-900">{feedCompositionSummary?.proteinBase?.ingredient ?? "Farelo de soja"}</p>
                    <p className="text-[10px] font-medium text-emerald-700">{feedCompositionSummary?.proteinBase?.percentage ?? "—"}</p>
                  </div>
                  <div className="w-px h-8 bg-orange-200/60" />
                  <div className="text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Mineral</p>
                    <p className="text-xs font-bold text-gray-900">{feedCompositionSummary?.mineralFocus?.ingredient ?? "Calcário calcítico"}</p>
                    <p className="text-[10px] font-medium text-slate-700">{feedCompositionSummary?.mineralFocus?.percentage ?? "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              {feedComposition.map((item) => {
                const midpoint = getCompositionMidpoint(item.percentage);
                const maxShare = feedCompositionSummary?.highestShare ?? 1;
                const width = Math.max(10, (midpoint / maxShare) * 100);

                return (
                  <div
                    key={`${metrics.stage}-${item.ingredient}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-semibold text-gray-900 w-44 shrink-0 truncate">{item.ingredient}</p>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", item.tone.split(" ")[0])}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold", item.tone)}>
                      {item.percentage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col min-h-[360px]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-900">Consumo mensal e custo</h3>
            <p className="text-xs text-gray-400 mt-0.5">Comparativo consolidado por mês</p>
          </div>
          <div className="flex-1 min-h-0" style={{ height: "calc(100% - 48px)" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -18, bottom: 0 }} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit=" kg" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit=" R$" />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  formatter={((value: unknown, name: unknown) => [
                    name === "custo" ? `R$ ${formatDecimal(Number(value ?? 0), 2)}` : `${formatDecimal(Number(value ?? 0))} kg`,
                    name === "custo" ? "Custo" : "Consumo",
                  ]) as never}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} formatter={(v: string) => (v === "consumoKg" ? "Consumo (kg)" : "Custo (R$)")} />
                <Bar yAxisId="left" dataKey="consumoKg" fill="#f97316" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="custo" fill="#fdba74" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-900">Leituras operacionais</h3>
            <p className="text-xs text-gray-400 mt-0.5">Indicadores de apoio ao manejo alimentar</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-xl bg-gray-50/80 p-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Fase atual</p>
              </div>
              <p className="text-lg font-bold text-gray-900 mt-2">{stageLabel[metrics.stage]}</p>
              <p className="text-xs text-gray-500 mt-1">
                Faixa esperada: {metrics.target.min} a {metrics.target.max} g/ave/dia
              </p>
            </div>

            <div className="rounded-xl bg-gray-50/80 p-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tipo predominante</p>
              </div>
              <p className="text-lg font-bold text-gray-900 mt-2">{metrics.latestFeedType}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Set(feedRecords.map((record) => record.feed_type?.trim() || "Não informado")).size} tipos mockados no período
              </p>
            </div>

            <div className="rounded-xl bg-gray-50/80 p-4">
              <div className="flex items-center gap-2">
                {metrics.trend === "up" && <ArrowUpRight className="w-4 h-4 text-emerald-600" />}
                {metrics.trend === "down" && <ArrowDownRight className="w-4 h-4 text-red-600" />}
                {metrics.trend === "stable" && <Activity className="w-4 h-4 text-orange-600" />}
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tendência</p>
              </div>
              <p className="text-lg font-bold text-gray-900 mt-2">
                {metrics.trend === "up" ? "Em alta" : metrics.trend === "down" ? "Em queda" : "Estável"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Conversão atual: {metrics.totalEggs > 0 ? `${formatDecimal(metrics.kgPerEgg, 3)} kg/ovo` : "sem ovos no período"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50/80 p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Custo total</p>
              </div>
              <p className="text-lg font-bold text-gray-900 mt-2">R$ {formatDecimal(metrics.totalCost, 2)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.avgDailyKg > 0 ? `Média diária de ${formatDecimal(metrics.avgDailyKg)} kg` : "Sem registros no período"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Consumo médio estimado por fase de crescimento</h3>
            <p className="text-xs text-gray-500 mt-1">Faixas de referência em g por ave por dia</p>
          </div>
          <div className="rounded-xl bg-orange-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-orange-500 font-semibold">Fase atual</p>
            <p className="text-sm font-bold text-orange-900 mt-1">
              {phaseFeedChart.find((item) => item.estimado > 0)?.fase ?? stageLabel[metrics.stage]} · {formatDecimal(metrics.gramsPerBird, 0)} g/ave/dia
            </p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={phaseFeedChart}>
              <defs>
                <linearGradient id="phaseFeedMinGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fed7aa" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#fed7aa" stopOpacity={0.15} />
                </linearGradient>
                <linearGradient id="phaseFeedMaxGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fdba74" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#fdba74" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="phaseFeedEstGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="fase" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit=" g" />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                formatter={((value: unknown, name: unknown) => [
                  `${Number(value ?? 0)} g`,
                  name === "minimo" ? "Mínimo" : name === "maximo" ? "Máximo" : "Estimado do lote",
                ]) as never}
              />
              <Area type="monotone" dataKey="maximo" name="maximo" stroke="#fdba74" strokeWidth={2} fill="url(#phaseFeedMaxGrad)" />
              <Area type="monotone" dataKey="minimo" name="minimo" stroke="#fed7aa" strokeWidth={2} fill="url(#phaseFeedMinGrad)" />
              <Area type="monotone" dataKey="estimado" name="estimado" stroke="#f97316" strokeWidth={3} fill="url(#phaseFeedEstGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
