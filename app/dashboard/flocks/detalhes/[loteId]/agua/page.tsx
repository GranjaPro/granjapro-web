"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Droplets, Loader2, Plus } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/components/auth/auth-provider";
import { PlanAwareCalendarFilter, useDateFilter } from "@/components/date-filter";
import { LockedOverlay } from "@/components/plan/locked-overlay";
import { usePlan } from "@/components/plan/plan-provider";
import { createClient } from "@/lib/supabase/client";
import { getWaterByFlock, type WaterConsumptionRow } from "@/lib/services/water";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Lote = Pick<
  Tables<"flocks">,
  "id" | "code" | "breed" | "bird_count" | "arrival_age_weeks" | "production_system" | "avg_weight_kg" | "arrival_date"
>;

type EggProductionRow = Pick<Tables<"egg_production">, "date" | "eggs_produced">;

type ProductionStage =
  | "cria"
  | "recria"
  | "pre-postura"
  | "producao"
  | "pico"
  | "estavel"
  | "declinio"
  | "descarte";

type WaterTrend = "up" | "down" | "stable";
type WaterHistoryRange = "7d" | "30d" | "meses" | "total";
type TooltipValue = number | string | ReadonlyArray<number | string> | undefined;

interface WaterHistoryPoint {
  label: string;
  date: string;
  consumo: number;
  meta: number;
}

interface WaterMetrics {
  ageWeeks: number;
  stage: ProductionStage;
  mlPerBird: number;
  litersPerDay: number;
  targetLitersPerDay: number;
  monthlyTotal: number;
  litersPer100Birds: number;
  eggsPerDay: number;
  litersPerEgg: number | null;
  litersPerEggUsesEstimate: boolean;
  variationPercent: number;
  weeklyDelta: number;
  trend: WaterTrend;
  status: "Saudável" | "Atenção" | "Crítico";
  score: number;
  insight: string;
  daily: WaterHistoryPoint[];
  monthly: Array<{ mes: string; consumo: number }>;
}

const targetMlByStage: Record<ProductionStage, number> = {
  cria: 55,
  recria: 120,
  "pre-postura": 175,
  producao: 220,
  pico: 245,
  estavel: 225,
  declinio: 205,
  descarte: 170,
};

const productionStageLabel: Record<ProductionStage, string> = {
  cria: "Cria",
  recria: "Recria",
  "pre-postura": "Pré-postura",
  producao: "Produção",
  pico: "Pico",
  estavel: "Estável",
  declinio: "Declínio",
  descarte: "Descarte",
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

function parseLocalDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function calculateAgeAtDate(arrivalDate: string, arrivalAgeWeeks: number, targetDate: string): number {
  const arrival = parseLocalDate(arrivalDate);
  const target = parseLocalDate(targetDate);
  const diffMs = target.getTime() - arrival.getTime();
  const weeksSinceArrival = Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)));
  return arrivalAgeWeeks + weeksSinceArrival;
}

function calculateCurrentAge(arrivalDate: string, arrivalAgeWeeks: number): number {
  return calculateAgeAtDate(arrivalDate, arrivalAgeWeeks, toDateKey(new Date()));
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

function formatDecimal(value: number, digits = 1) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatMonthLabel(date: Date) {
  return date
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .replace(/^./, (char) => char.toUpperCase());
}

function formatShortDate(date: string) {
  return parseLocalDate(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function getDateRangeStart(range: WaterHistoryRange, records: WaterConsumptionRow[]) {
  if (range === "total") return "";

  const latestDate = records.at(-1)?.date;
  if (!latestDate) return "";

  const start = parseLocalDate(latestDate);
  if (range === "7d") start.setDate(start.getDate() - 6);
  if (range === "30d") start.setDate(start.getDate() - 29);
  if (range === "meses") start.setMonth(start.getMonth() - 5, 1);
  return toDateKey(start);
}

function filterRecordsByRange(records: WaterConsumptionRow[], range: WaterHistoryRange) {
  const startDate = getDateRangeStart(range, records);
  return startDate ? records.filter((record) => record.date >= startDate) : records;
}

function sumWaterLiters(records: WaterConsumptionRow[]) {
  return records.reduce((sum, record) => sum + Number(record.quantity_liters), 0);
}

function buildDailyWaterPoints(lote: Lote, records: WaterConsumptionRow[]): WaterHistoryPoint[] {
  const totalsByDate = records.reduce<Map<string, number>>((totals, record) => {
    totals.set(record.date, (totals.get(record.date) ?? 0) + Number(record.quantity_liters));
    return totals;
  }, new Map());

  return Array.from(totalsByDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, liters]) => {
      const stage = getProductionStage(calculateAgeAtDate(lote.arrival_date, lote.arrival_age_weeks, date));
      return {
        label: formatShortDate(date),
        date,
        consumo: Number(((liters * 1000) / lote.bird_count).toFixed(1)),
        meta: targetMlByStage[stage],
      };
    });
}

function buildMonthlyWaterPoints(records: WaterConsumptionRow[]) {
  const totalsByMonth = records.reduce<Map<string, number>>((totals, record) => {
    const monthKey = record.date.slice(0, 7);
    totals.set(monthKey, (totals.get(monthKey) ?? 0) + Number(record.quantity_liters));
    return totals;
  }, new Map());

  return Array.from(totalsByMonth.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6)
    .map(([monthKey, liters]) => ({
      mes: formatMonthLabel(parseLocalDate(`${monthKey}-01`)),
      consumo: Number(liters.toFixed(1)),
    }));
}

function averageDailyLiters(records: WaterConsumptionRow[]) {
  const dayCount = new Set(records.map((record) => record.date)).size || 1;
  return sumWaterLiters(records) / dayCount;
}

function calculateWeeklyDelta(records: WaterConsumptionRow[]) {
  const latestDate = records.at(-1)?.date;
  if (!latestDate) return { weeklyDelta: 0, variationPercent: 0, trend: "stable" as WaterTrend };

  const latest = parseLocalDate(latestDate);
  const currentStart = new Date(latest);
  currentStart.setDate(latest.getDate() - 6);
  const previousStart = new Date(latest);
  previousStart.setDate(latest.getDate() - 13);
  const previousEnd = new Date(latest);
  previousEnd.setDate(latest.getDate() - 7);

  const currentRecords = records.filter((record) => record.date >= toDateKey(currentStart) && record.date <= latestDate);
  const previousRecords = records.filter(
    (record) => record.date >= toDateKey(previousStart) && record.date <= toDateKey(previousEnd),
  );
  const currentAverage = averageDailyLiters(currentRecords);
  const previousAverage = previousRecords.length > 0 ? averageDailyLiters(previousRecords) : currentAverage;
  const weeklyDelta = Number((currentAverage - previousAverage).toFixed(1));
  const variationPercent = previousAverage > 0 ? Number(((weeklyDelta / previousAverage) * 100).toFixed(1)) : 0;
  const trend: WaterTrend = variationPercent > 2 ? "up" : variationPercent < -2 ? "down" : "stable";

  return { weeklyDelta, variationPercent, trend };
}

function buildWaterMetrics(lote: Lote, waterRecords: WaterConsumptionRow[], productionRecords: EggProductionRow[]): WaterMetrics {
  const daily = buildDailyWaterPoints(lote, waterRecords);
  const monthly = buildMonthlyWaterPoints(waterRecords);
  const ageWeeks = calculateCurrentAge(lote.arrival_date, lote.arrival_age_weeks);
  const stage = getProductionStage(ageWeeks);
  const litersPerDay = Number(averageDailyLiters(waterRecords).toFixed(1));
  const mlPerBird = Number(((litersPerDay * 1000) / lote.bird_count).toFixed(1));
  const targetLitersPerDay = Number(((targetMlByStage[stage] * lote.bird_count) / 1000).toFixed(1));
  const targetMlPerBird = targetMlByStage[stage];
  const totalLiters = sumWaterLiters(waterRecords);
  const totalEggs = productionRecords.reduce((sum, record) => sum + Number(record.eggs_produced), 0);
  const productionDays = new Set(productionRecords.map((record) => record.date)).size || 1;
  const estimatedEggsPerDay = Math.round(lote.bird_count * stageEggRate[stage]);
  const eggsPerDay = totalEggs > 0 ? Math.round(totalEggs / productionDays) : estimatedEggsPerDay;
  const litersPerEgg =
    eggsPerDay > 0
      ? Number((totalLiters / (totalEggs > 0 ? totalEggs : eggsPerDay * (new Set(waterRecords.map((record) => record.date)).size || 1))).toFixed(3))
      : null;
  const { weeklyDelta, variationPercent, trend } = calculateWeeklyDelta(waterRecords);
  const deviationPercent = targetMlPerBird > 0 ? Math.abs((mlPerBird / targetMlPerBird) * 100 - 100) : 0;
  const status = deviationPercent <= 10 ? "Saudável" : deviationPercent <= 20 ? "Atenção" : "Crítico";
  const score = Math.max(45, Math.round(100 - deviationPercent * 1.4 - Math.abs(variationPercent) * 0.25));
  const insight =
    status === "Saudável"
      ? "Consumo dentro da faixa esperada para a fase atual do lote."
      : status === "Atenção"
        ? "Vale revisar vazão dos bebedouros e temperatura ambiente."
        : "Consumo fora da faixa ideal. Priorize inspeção de linha e conforto térmico.";

  return {
    ageWeeks,
    stage,
    mlPerBird,
    litersPerDay,
    targetLitersPerDay,
    monthlyTotal: Number(totalLiters.toFixed(1)),
    litersPer100Birds: Number(((mlPerBird * 100) / 1000).toFixed(1)),
    eggsPerDay,
    litersPerEgg,
    litersPerEggUsesEstimate: totalEggs === 0,
    variationPercent,
    weeklyDelta,
    trend,
    status,
    score,
    insight,
    daily,
    monthly,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro ao carregar dados";
}

function formatMlTooltip(value: TooltipValue, name: string | number | undefined): [string, string] {
  const numericValue = Number(value ?? 0);
  return [
    `${formatDecimal(Number.isFinite(numericValue) ? numericValue : 0)} ml/ave/dia`,
    name === "consumo" ? "Consumo" : name === "meta" ? "Meta" : String(name),
  ];
}

function formatLiterTooltip(value: TooltipValue): [string, string] {
  const numericValue = Number(value ?? 0);
  return [`${formatDecimal(Number.isFinite(numericValue) ? numericValue : 0)} L`, "Consumo"];
}

export default function AguaLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const { farm, loading: authLoading } = useAuth();
  const { plan } = usePlan();
  const { dateRange } = useDateFilter();
  const [lote, setLote] = useState<Lote | null>(null);
  const [waterRecords, setWaterRecords] = useState<WaterConsumptionRow[]>([]);
  const [productionRecords, setProductionRecords] = useState<EggProductionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waterHistoryRange, setWaterHistoryRange] = useState<WaterHistoryRange>("7d");

  const loadData = useCallback(async () => {
    if (authLoading) return;
    if (!farm?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: flockData, error: flockError } = await supabase
        .from("flocks")
        .select("id, code, breed, bird_count, arrival_age_weeks, production_system, avg_weight_kg, arrival_date")
        .eq("id", loteId)
        .eq("farm_id", farm.id)
        .maybeSingle();

      if (flockError) throw flockError;

      setLote(flockData);
      if (!flockData || plan === "essencial") {
        setWaterRecords([]);
        setProductionRecords([]);
        return;
      }

      const [waterData, productionResult] = await Promise.all([
        getWaterByFlock(farm.id, loteId),
        supabase
          .from("egg_production")
          .select("date, eggs_produced")
          .eq("farm_id", farm.id)
          .eq("flock_id", loteId)
          .order("date", { ascending: true }),
      ]);

      if (productionResult.error) throw productionResult.error;

      setWaterRecords(waterData);
      setProductionRecords(productionResult.data ?? []);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [authLoading, farm?.id, loteId, plan]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const dateFilteredWaterRecords = useMemo(
    () => waterRecords.filter((record) => record.date >= dateRange.startDate && record.date <= dateRange.endDate),
    [dateRange.endDate, dateRange.startDate, waterRecords],
  );
  const dateFilteredProductionRecords = useMemo(
    () => productionRecords.filter((record) => record.date >= dateRange.startDate && record.date <= dateRange.endDate),
    [dateRange.endDate, dateRange.startDate, productionRecords],
  );
  const filteredWaterRecords = useMemo(
    () => filterRecordsByRange(dateFilteredWaterRecords, waterHistoryRange),
    [dateFilteredWaterRecords, waterHistoryRange],
  );
  const filteredProductionRecords = useMemo(() => {
    const startDate = getDateRangeStart(waterHistoryRange, dateFilteredWaterRecords);
    return startDate ? dateFilteredProductionRecords.filter((record) => record.date >= startDate) : dateFilteredProductionRecords;
  }, [dateFilteredProductionRecords, dateFilteredWaterRecords, waterHistoryRange]);
  const metrics = useMemo(
    () => (lote && filteredWaterRecords.length > 0 ? buildWaterMetrics(lote, filteredWaterRecords, filteredProductionRecords) : null),
    [filteredProductionRecords, filteredWaterRecords, lote],
  );
  const waterStatus = useMemo(() => {
    if (!metrics) return null;
    if (metrics.status === "Saudável") {
      return {
        label: "Verde",
        text: "text-emerald-600",
        ring: "#10b981",
        border: "border-emerald-200",
        background: "from-emerald-50/80 via-white to-white",
      };
    }
    if (metrics.status === "Atenção") {
      return {
        label: "Amarelo",
        text: "text-amber-600",
        ring: "#f59e0b",
        border: "border-amber-200",
        background: "from-amber-50/80 via-white to-white",
      };
    }
    return {
      label: "Vermelho",
      text: "text-red-600",
      ring: "#ef4444",
      border: "border-red-200",
      background: "from-red-50/80 via-white to-white",
    };
  }, [metrics]);
  const waterRecommendations = useMemo(() => {
    if (!metrics) return [];

    const recommendations: Array<{ text: string; impact: "alto" | "medio" | "baixo" }> = [];
    const gap = Math.abs(metrics.targetLitersPerDay - metrics.litersPerDay);

    if (gap >= 4) {
      recommendations.push({
        text: "Comparar consumo real com a meta diária e revisar a linha de bebedouros.",
        impact: gap >= 8 ? "alto" : "medio",
      });
    }

    if (metrics.trend === "up") {
      recommendations.push({
        text: "Monitorar temperatura e possíveis vazamentos, pois o consumo está em alta.",
        impact: "medio",
      });
    }

    if (metrics.trend === "down") {
      recommendations.push({
        text: "Consumo de água caiu no histórico recente. Checar pressão, acesso aos bebedouros e conforto do lote.",
        impact: "alto",
      });
    }

    if (metrics.stage === "cria") {
      recommendations.push({
        text: "Na cria, observe distribuição dos pintinhos e aquecimento para evitar baixa ingestão de água.",
        impact: "alto",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        text: "Consumo estável para a fase atual do lote. Manter rotina de inspeção diária.",
        impact: "baixo",
      });
    }

    return recommendations.slice(0, 3);
  }, [metrics]);
  const phaseWaterChart = useMemo(
    () => [
      { fase: "Cria", meta: 55, atual: metrics?.stage === "cria" ? metrics.mlPerBird : 0 },
      { fase: "Recria", meta: 120, atual: metrics?.stage === "recria" ? metrics.mlPerBird : 0 },
      { fase: "Pré-postura", meta: 175, atual: metrics?.stage === "pre-postura" ? metrics.mlPerBird : 0 },
      { fase: "Produção", meta: 220, atual: metrics?.stage === "producao" ? metrics.mlPerBird : 0 },
      { fase: "Pico", meta: 245, atual: metrics?.stage === "pico" ? metrics.mlPerBird : 0 },
      { fase: "Estável", meta: 225, atual: metrics?.stage === "estavel" ? metrics.mlPerBird : 0 },
      { fase: "Declínio", meta: 205, atual: metrics?.stage === "declinio" ? metrics.mlPerBird : 0 },
      { fase: "Descarte", meta: 170, atual: metrics?.stage === "descarte" ? metrics.mlPerBird : 0 },
    ],
    [metrics],
  );
  const waterKpis = useMemo(() => {
    if (!metrics || !lote) return [];

    const targetMlPerBird = targetMlByStage[metrics.stage];
    const litersPerEggTarget = metrics.eggsPerDay > 0 ? Number((metrics.targetLitersPerDay / metrics.eggsPerDay).toFixed(3)) : null;

    const buildMetaBar = (valuePercent: number | null, lowerIsBetter = false) => {
      if (valuePercent === null || !Number.isFinite(valuePercent)) {
        return { progress: 0, progressColor: "bg-gray-300", statusText: "Sem meta" };
      }

      const safePercent = Math.max(0, Math.min(valuePercent, 200));
      const diff = safePercent - 100;

      let progressColor = "bg-emerald-500";
      if (lowerIsBetter) {
        progressColor = safePercent <= 100 ? "bg-emerald-500" : (safePercent <= 110 ? "bg-amber-500" : "bg-red-500");
      } else {
        progressColor = safePercent < 100 ? (safePercent >= 90 ? "bg-amber-500" : "bg-red-500") : "bg-emerald-500";
      }

      return {
        progress: Math.min((safePercent / 100) * 75, 100),
        progressColor,
        statusText:
          Math.abs(diff) < 1
            ? "Dentro"
            : diff < 0
              ? `Abaixo em ${Math.round(Math.abs(diff))}%`
              : `Acima em ${Math.round(diff)}%`,
      };
    };

    const dailyMeta = buildMetaBar((metrics.litersPerDay / metrics.targetLitersPerDay) * 100);
    const perBirdMeta = buildMetaBar((metrics.mlPerBird / targetMlPerBird) * 100);
    const perEggMeta = buildMetaBar(
      metrics.litersPerEgg !== null && litersPerEggTarget ? (metrics.litersPerEgg / litersPerEggTarget) * 100 : null,
      true,
    );

    return [
      {
        label: "Consumo diário",
        value: `${formatDecimal(metrics.litersPerDay)} L`,
        helper: `${lote.bird_count.toLocaleString("pt-BR")} aves ativas`,
        targetLabel: `Meta: ${formatDecimal(metrics.targetLitersPerDay)} L`,
        progress: dailyMeta.progress,
        progressColor: dailyMeta.progressColor,
        statusText: dailyMeta.statusText,
      },
      {
        label: "Consumo diário / ave",
        value: `${formatDecimal(metrics.mlPerBird, 0)} ml`,
        helper: `Idade atual: ${metrics.ageWeeks} semanas`,
        targetLabel: `Meta: ${targetMlPerBird} ml`,
        progress: perBirdMeta.progress,
        progressColor: perBirdMeta.progressColor,
        statusText: perBirdMeta.statusText,
      },
      {
        label: "Variação semanal",
        value: `${metrics.weeklyDelta >= 0 ? "+" : ""}${formatDecimal(metrics.weeklyDelta)} L`,
        helper:
          metrics.trend === "up"
            ? "Acima da semana anterior"
            : metrics.trend === "down"
              ? "Abaixo da semana anterior"
              : "Sem variação relevante",
        helperSecondary: `${metrics.variationPercent >= 0 ? "+" : ""}${formatDecimal(metrics.variationPercent, 1)}%`,
        targetLabel: "",
        progress: 0,
        progressColor: "bg-gray-300",
        statusText: "",
        hideMetaBar: true,
      },
      {
        label: "Litros de água / ovo",
        value: metrics.litersPerEgg !== null ? `${formatDecimal(metrics.litersPerEgg, 2)} L` : "—",
        helper:
          metrics.eggsPerDay > 0
            ? `${metrics.eggsPerDay.toLocaleString("pt-BR")} ovos/dia ${
                metrics.litersPerEggUsesEstimate ? "estimados" : "registrados"
              }`
            : "Sem postura no lote",
        targetLabel: litersPerEggTarget ? `Meta: ${formatDecimal(litersPerEggTarget, 2)} L` : "Meta indisponível",
        progress: perEggMeta.progress,
        progressColor: perEggMeta.progressColor,
        statusText: perEggMeta.statusText,
      },
    ];
  }, [lote, metrics]);

  if (loading || authLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-16 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!lote) {
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
          <p className="text-gray-400">Dados do lote não encontrados.</p>
        </div>
      </div>
    );
  }

  const pageHeader = (
    <div>
      <Link
        href={`/dashboard/flocks/detalhes/${loteId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Detalhes
      </Link>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <Droplets className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Consumo de Água - {lote.code}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Indicadores hídricos e histórico operacional do lote</p>
          </div>
        </div>
        <PlanAwareCalendarFilter />
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
          <p className="text-sm font-semibold text-red-600">Não foi possível carregar o consumo de água.</p>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (plan === "essencial") {
    return (
      <div className="space-y-6">
        {pageHeader}
        <LockedOverlay message="Desbloqueie os indicadores de consumo de água por lote" targetPlan="pro">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {["Consumo diário", "Consumo / ave", "Variação semanal", "Água / ovo"].map((label) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-bold text-gray-300 tracking-tight mt-2">—</p>
                <div className="mt-3 h-2 rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        </LockedOverlay>
      </div>
    );
  }

  if (waterRecords.length === 0) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <div className="bg-white rounded-2xl border border-blue-100 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Droplets className="h-7 w-7 text-blue-600" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-gray-900">Nenhum registro de consumo de água encontrado para este lote</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Registre o consumo hídrico diário para acompanhar metas por fase, tendências e eficiência por ovo.
          </p>
          <Link
            href="/dashboard/agua"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Registrar consumo de água
          </Link>
        </div>
      </div>
    );
  }

  if (!metrics || !waterStatus) {
    return null;
  }

  return (
    <div className="space-y-6">
      {pageHeader}

      <div className="flex justify-end">
        <div className="inline-flex w-full rounded-xl bg-gray-100 p-1 sm:w-auto">
          {[
            { id: "7d", label: "7 dias" },
            { id: "30d", label: "30 dias" },
            { id: "meses", label: "Meses" },
            { id: "total", label: "Total" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setWaterHistoryRange(option.id as WaterHistoryRange)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:flex-none",
                waterHistoryRange === option.id ? "bg-white text-blue-700 shadow-sm" : "text-gray-500",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("rounded-2xl border bg-gradient-to-r p-5 lg:p-6", waterStatus.border, waterStatus.background)}>
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
                  stroke={waterStatus.ring}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${(metrics.score / 100) * 175.9} 175.9`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-base font-bold", waterStatus.text)}>{metrics.score}</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-bold text-gray-900">Status do consumo de água</span>
              </div>
              <p className={cn("mt-0.5 text-xl font-bold", waterStatus.text)}>{waterStatus.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Consumo: {formatDecimal(metrics.litersPerDay)} L/dia | Meta: {formatDecimal(metrics.targetLitersPerDay)} L
              </p>
              <p className="mt-2 text-xs text-gray-600">{metrics.insight}</p>
            </div>
          </div>

          <div className="hidden lg:block w-px self-stretch bg-gray-200/70" />

          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Recomendações automáticas</p>
            <ul className="space-y-1.5">
              {waterRecommendations.map((rec) => {
                const impactColor = rec.impact === "alto" ? "text-red-600" : rec.impact === "medio" ? "text-amber-600" : "text-emerald-600";
                const dotColor = rec.impact === "alto" ? "bg-red-500" : rec.impact === "medio" ? "bg-amber-500" : "bg-emerald-500";

                return (
                  <li key={rec.text} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className={cn("mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full", dotColor)} />
                    <span>
                      {rec.text} <span className={cn("font-semibold", impactColor)}>(impacto: {rec.impact})</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {waterKpis.map((kpi) => {
          const isTrendCard = "hideMetaBar" in kpi && kpi.hideMetaBar;
          const isNegativeTrend = String(kpi.value).trim().startsWith("-");
          const trendTone = isNegativeTrend
            ? { iconWrap: "bg-amber-50 text-amber-600", badge: "bg-amber-100 text-amber-700 border border-amber-200", caption: "text-amber-700" }
            : { iconWrap: "bg-emerald-50 text-emerald-600", badge: "bg-emerald-100 text-emerald-700 border border-emerald-200", caption: "text-emerald-700" };

          return (
            <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900 tracking-tight mt-2">{kpi.value}</p>
              {isTrendCard ? (
                <div className="mt-3 rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white px-3 py-3">
                  <div className="flex items-start gap-2.5">
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", trendTone.iconWrap)}>
                      {isNegativeTrend ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-600">{kpi.helper}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold", trendTone.badge)}>
                          {"helperSecondary" in kpi ? kpi.helperSecondary : ""}
                        </span>
                        <span className={cn("text-[11px] font-medium", trendTone.caption)}>vs. semana anterior</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mt-2">{kpi.helper}</p>
                  <div className="relative mt-2.5">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", kpi.progressColor)} style={{ width: `${kpi.progress}%` }} />
                    </div>
                    <div className="absolute top-[-3px] w-0.5 h-4 bg-gray-800 rounded-full" style={{ left: "75%" }} title={kpi.targetLabel} />
                  </div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-900 flex-shrink-0" />
                      <span className="text-[10px] text-gray-500 font-medium truncate">{kpi.targetLabel}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 flex-shrink-0">{kpi.statusText}</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Histórico de consumo por ave</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.daily}>
                <defs>
                  <linearGradient id="waterDailyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit=" ml" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }} formatter={formatMlTooltip} />
                <Area type="monotone" dataKey="consumo" stroke="#2563eb" strokeWidth={2.5} fill="url(#waterDailyGradient)" />
                <Area type="monotone" dataKey="meta" stroke="#bfdbfe" strokeWidth={1.5} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Consumo mensal registrado</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }} formatter={formatLiterTooltip} />
                <Bar dataKey="consumo" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Metas por fase de crescimento</h3>
              <p className="text-xs text-gray-500 mt-1">Referência em ml por ave por dia</p>
            </div>
            <div className="rounded-xl bg-blue-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wider text-blue-500 font-semibold">Fase atual</p>
              <p className="text-sm font-bold text-blue-900 mt-1">
                {productionStageLabel[metrics.stage]} · {formatDecimal(metrics.mlPerBird, 0)} ml/ave/dia
              </p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={phaseWaterChart}>
                <defs>
                  <linearGradient id="phaseTargetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="phaseActualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="fase" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit=" ml" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }} formatter={formatMlTooltip} />
                <Area type="monotone" dataKey="meta" stroke="#93c5fd" strokeWidth={2} fill="url(#phaseTargetGradient)" />
                <Area type="monotone" dataKey="atual" stroke="#2563eb" strokeWidth={3} fill="url(#phaseActualGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-5">Leituras operacionais</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-xl bg-gray-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sistema</p>
              <p className="text-lg font-bold text-gray-900 mt-2">{lote.production_system || "Não informado"}</p>
              <p className="text-xs text-gray-500 mt-1">Impacta a demanda hídrica e a dissipação de calor.</p>
            </div>
            <div className="rounded-xl bg-gray-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Peso médio</p>
              <p className="text-lg font-bold text-gray-900 mt-2">{lote.avg_weight_kg ? `${formatDecimal(lote.avg_weight_kg, 2)} kg` : "Sem registro"}</p>
              <p className="text-xs text-gray-500 mt-1">Usado como contexto de manejo, sem alterar as metas oficiais.</p>
            </div>
            <div className="rounded-xl bg-gray-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tendência</p>
              <div className="mt-2 flex items-center gap-2">
                {metrics.trend === "up" && <ArrowUpRight className="w-4 h-4 text-emerald-600" />}
                {metrics.trend === "down" && <ArrowDownRight className="w-4 h-4 text-red-600" />}
                {metrics.trend === "stable" && <Droplets className="w-4 h-4 text-blue-600" />}
                <p className="text-lg font-bold text-gray-900">
                  {metrics.trend === "up" ? "Em alta" : metrics.trend === "down" ? "Em queda" : "Estável"}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">Comparação entre a semana atual e a semana anterior com dados registrados.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
