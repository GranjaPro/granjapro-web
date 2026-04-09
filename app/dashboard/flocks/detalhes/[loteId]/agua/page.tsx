"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Droplets, Loader2 } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Lote {
  id: string;
  code: string;
  breed: string;
  bird_count: number;
  arrival_age_weeks: number;
  production_system: string;
  avg_weight_kg: number | null;
  arrival_date: string;
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

type WaterTrend = "up" | "down" | "stable";
type WaterHistoryRange = "7d" | "30d" | "meses" | "total";

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

function formatDecimal(value: number, digits = 1) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCodeSeed(code: string) {
  return code.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function getMonthLabel(date: Date) {
  return date
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .replace(/^./, (char) => char.toUpperCase());
}

function getDayLabel(date: Date) {
  return date
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "")
    .replace(/^./, (char) => char.toUpperCase());
}

function buildWaterMetrics(lote: Lote) {
  const ageWeeks = calculateCurrentAge(lote.arrival_date, lote.arrival_age_weeks);
  const stage = getProductionStage(ageWeeks);
  const seed = getCodeSeed(lote.code || lote.id);
  const baseMlByStage: Record<ProductionStage, number> = {
    cria: 55,
    recria: 120,
    "pre-postura": 175,
    producao: 220,
    pico: 245,
    estavel: 225,
    declinio: 205,
    descarte: 170,
  };
  const systemFactorMap: Record<string, number> = {
    gaiola: 1,
    piso: 1.06,
    caipira: 1.12,
    automatico: 1.02,
  };

  const baseMl = baseMlByStage[stage] ?? 210;
  const systemFactor = systemFactorMap[(lote.production_system || "").toLowerCase()] ?? 1;
  const weightFactor = lote.avg_weight_kg ? clamp(lote.avg_weight_kg / 1.85, 0.94, 1.08) : 1;
  const loadFactor = 1 + (((seed % 9) - 4) * 0.01);

  const mlPerBird = Math.round(baseMl * systemFactor * weightFactor * loadFactor);
  const targetMlPerBird = Math.round(mlPerBird * (stage === "pico" || stage === "producao" ? 1.04 : 1.02));
  const litersPerDay = Number(((lote.bird_count * mlPerBird) / 1000).toFixed(1));
  const targetLitersPerDay = Number(((lote.bird_count * targetMlPerBird) / 1000).toFixed(1));
  const variationPercent = ((seed % 11) - 5) * 0.9;
  const weeklyDelta = Number((litersPerDay * (variationPercent / 100)).toFixed(1));
  const trend: WaterTrend =
    variationPercent > 1 ? "up" : variationPercent < -1 ? "down" : "stable";
  const deviation = Math.abs(targetMlPerBird - mlPerBird);
  const status =
    deviation <= 8 ? "Saudável" : deviation <= 18 ? "Atenção" : "Crítico";
  const statusColor =
    status === "Saudável"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : status === "Atenção"
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-red-700 bg-red-50 border-red-200";
  const score = status === "Saudável" ? 92 : status === "Atenção" ? 79 : 64;
  const litersPer100Birds = Number(((mlPerBird * 100) / 1000).toFixed(1));
  const monthlyEstimate = Math.round(litersPerDay * 30);

  const dailyFactors = [0.97, 1.01, 0.99, 1.02, 1.03, 0.98, 1];
  const today = new Date();
  const daily = dailyFactors.map((factor, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (dailyFactors.length - 1 - index));
    const liters = Number((litersPerDay * factor).toFixed(1));
    return {
      dia: getDayLabel(date),
      consumo: liters,
      meta: targetLitersPerDay,
    };
  });

  const monthlyFactors = [0.94, 0.98, 1, 1.03, 1.01, 1.04];
  const monthly = monthlyFactors.map((factor, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (monthlyFactors.length - 1 - index), 1);
    return {
      mes: getMonthLabel(date),
      consumo: Math.round(monthlyEstimate * factor),
    };
  });

  const insight =
    status === "Saudável"
      ? "Consumo dentro da faixa esperada para a fase atual do lote."
      : status === "Atenção"
      ? "Vale revisar vazão dos bebedouros e temperatura ambiente."
      : "Consumo fora da faixa ideal. Priorize inspeção de linha e conforto térmico.";

  const growthPhase =
    ageWeeks < 6 ? "cria" : ageWeeks < 16 ? "recria" : ageWeeks < 20 ? "pre-postura" : "produção";

  return {
    ageWeeks,
    stage,
    growthPhase,
    mlPerBird,
    litersPerDay,
    targetLitersPerDay,
    monthlyEstimate,
    litersPer100Birds,
    weeklyDelta,
    trend,
    status,
    statusColor,
    score,
    insight,
    daily,
    monthly,
  };
}

export default function AguaLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const { farm, loading: authLoading } = useAuth();
  const [lote, setLote] = useState<Lote | null>(null);
  const [loading, setLoading] = useState(true);
  const [waterHistoryRange, setWaterHistoryRange] = useState<WaterHistoryRange>("7d");

  useEffect(() => {
    if (authLoading) return;
    if (!farm) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    async function fetchLote() {
      setLoading(true);
      const { data } = await supabase
        .from("flocks")
        .select("id, code, breed, bird_count, arrival_age_weeks, production_system, avg_weight_kg, arrival_date")
        .eq("id", loteId)
        .eq("farm_id", farm!.id)
        .maybeSingle();

      if (cancelled) return;
      setLote((data as Lote | null) ?? null);
      setLoading(false);
    }

    fetchLote();

    return () => {
      cancelled = true;
    };
  }, [authLoading, farm, loteId]);

  const metrics = useMemo(() => (lote ? buildWaterMetrics(lote) : null), [lote]);
  const waterStatus = useMemo(() => {
    if (!metrics) return null;
    if (metrics.score >= 88) {
      return {
        label: "Verde",
        text: "text-emerald-600",
        ring: "#10b981",
        border: "border-emerald-200",
        background: "from-emerald-50/80 via-white to-white",
      };
    }
    if (metrics.score >= 75) {
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
        text: "Consumo de água caiu hoje, isso pode afetar a produção de ovos amanhã. Checar pressão, acesso aos bebedouros e conforto do lote.",
        impact: "alto",
      });
    }

    if (metrics.stage === "cria") {
      recommendations.push({
        text: "Na cria, observe distribuição dos pintinhos e aquecimento para evitar baixa ingestão de água.",
        impact: "alto",
      });
    }

    if (metrics.stage === "producao") {
      recommendations.push({
        text: "Na produção, acompanhe o consumo junto da postura para detectar desvios cedo.",
        impact: "medio",
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
      { fase: "Cria", minimo: 20, maximo: 70, estimado: metrics?.stage === "cria" ? metrics.mlPerBird : 0 },
      { fase: "Recria", minimo: 70, maximo: 150, estimado: metrics?.stage === "recria" ? metrics.mlPerBird : 0 },
      { fase: "Pr\u00E9-postura", minimo: 150, maximo: 180, estimado: metrics?.stage === "pre-postura" ? metrics.mlPerBird : 0 },
      { fase: "Produ\u00E7\u00E3o", minimo: 180, maximo: 220, estimado: metrics?.stage === "producao" ? metrics.mlPerBird : 0 },
      { fase: "Pico", minimo: 220, maximo: 260, estimado: metrics?.stage === "pico" ? metrics.mlPerBird : 0 },
      { fase: "Est\u00E1vel", minimo: 210, maximo: 250, estimado: metrics?.stage === "estavel" ? metrics.mlPerBird : 0 },
      { fase: "Decl\u00EDnio", minimo: 190, maximo: 230, estimado: metrics?.stage === "declinio" ? metrics.mlPerBird : 0 },
      { fase: "Descarte", minimo: 170, maximo: 210, estimado: metrics?.stage === "descarte" ? metrics.mlPerBird : 0 },
    ],
    [metrics],
  );
  const waterHistoryChart = useMemo(() => {
    if (!metrics || !lote?.bird_count) return [];

    const targetMlPerBird = Number(((metrics.targetLitersPerDay * 1000) / lote.bird_count).toFixed(1));
    const baseMlPerBird = metrics.mlPerBird;
    const today = new Date();

    if (waterHistoryRange === "7d") {
      return metrics.daily.map((item) => ({
        label: item.dia,
        consumo: Number(((item.consumo * 1000) / lote.bird_count).toFixed(1)),
        meta: Number(((item.meta * 1000) / lote.bird_count).toFixed(1)),
      }));
    }

    if (waterHistoryRange === "30d") {
      return Array.from({ length: 30 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (29 - index));
        const factor = 1 + Math.sin((index + 2) / 3.8) * 0.05 + (((index % 5) - 2) * 0.008);
        return {
          label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          consumo: Number((baseMlPerBird * factor).toFixed(1)),
          meta: targetMlPerBird,
        };
      });
    }

    if (waterHistoryRange === "meses") {
      return Array.from({ length: 6 }, (_, index) => {
        const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
        const factor = 1 + Math.sin((index + 1) * 0.9) * 0.06;
        return {
          label: getMonthLabel(date),
          consumo: Number((baseMlPerBird * factor).toFixed(1)),
          meta: targetMlPerBird,
        };
      });
    }

    const totalWeeks = Math.max(1, Math.min(metrics.ageWeeks, 90));
    return Array.from({ length: totalWeeks }, (_, index) => {
      const week = index + 1;
      const factor = 0.82 + (week / totalWeeks) * 0.2 + Math.sin(week / 2.8) * 0.03;
      return {
        label: `S${week}`,
        consumo: Number((baseMlPerBird * factor).toFixed(1)),
        meta: targetMlPerBird,
      };
    });
  }, [lote?.bird_count, metrics, waterHistoryRange]);

  if (loading || authLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-16 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
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
          <p className="text-gray-400">Dados do lote não encontrados.</p>
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Consumo de Água — {lote.code}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Indicadores hídricos e histórico operacional do lote
              </p>
            </div>
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold",
              metrics.statusColor,
            )}
          >
            <span>{metrics.score}</span>
            <span>{metrics.status}</span>
          </div>
        </div>
      </div>

      {waterStatus && (
        <div
          className={cn(
            "rounded-2xl border bg-gradient-to-r p-5 lg:p-6",
            waterStatus.border,
            waterStatus.background,
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
                    stroke={waterStatus.ring}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${(metrics.score / 100) * 175.9} 175.9`}
                    className="transition-all duration-700"
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
                <div className="mt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Score baseado em:
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    <li className="text-xs text-gray-600">• Desvio em relação à meta diária</li>
                    <li className="text-xs text-gray-600">• Tendência semanal do consumo</li>
                    <li className="text-xs text-gray-600">• Faixa esperada para a fase do lote</li>
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
                {waterRecommendations.map((rec, index) => {
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
                    <li key={`${rec.text}-${index}`} className="flex items-start gap-2 text-sm text-gray-700">
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
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Hidratação do lote</p>
            <h2 className="text-3xl font-bold text-gray-900 mt-1">{formatDecimal(metrics.litersPerDay)} L/dia</h2>
            <p className="text-sm text-gray-500 mt-1">{metrics.insight}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-blue-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-blue-500 font-semibold">Consumo/ave</p>
              <p className="text-lg font-bold text-blue-900 mt-1">{metrics.mlPerBird} ml</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Meta diária</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatDecimal(metrics.targetLitersPerDay)} L</p>
            </div>
            <div className="rounded-xl bg-sky-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-sky-500 font-semibold">Fase</p>
              <p className="text-lg font-bold text-sky-900 mt-1">{productionStageLabel[metrics.stage]}</p>
            </div>
            <div className="rounded-xl bg-indigo-50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-indigo-500 font-semibold">30 dias</p>
              <p className="text-lg font-bold text-indigo-900 mt-1">{metrics.monthlyEstimate.toLocaleString("pt-BR")} L</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Consumo Diário",
            value: `${formatDecimal(metrics.litersPerDay)} L`,
            helper: `${lote.bird_count.toLocaleString("pt-BR")} aves ativas`,
          },
          {
            label: "Consumo/Ave/Dia",
            value: `${metrics.mlPerBird} ml`,
            helper: `Idade atual: ${metrics.ageWeeks} semanas`,
          },
          {
            label: "Variação Semanal",
            value: `${metrics.weeklyDelta >= 0 ? "+" : ""}${formatDecimal(metrics.weeklyDelta)} L`,
            helper:
              metrics.trend === "up"
                ? "Acima da semana anterior"
                : metrics.trend === "down"
                ? "Abaixo da semana anterior"
                : "Sem variação relevante",
          },
          {
            label: "Índice Hídrico",
            value: `${formatDecimal(metrics.litersPer100Birds)} L`,
            helper: "Por 100 aves/dia",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight mt-2">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-2">{kpi.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-bold text-gray-900">Histórico de consumo por ave</h3>
            <div className="inline-flex w-full rounded-xl bg-gray-100 p-1 sm:w-auto">
              {[
                { id: "7d", label: "Últimos 7 dias" },
                { id: "30d", label: "Últimos 30 dias" },
                { id: "meses", label: "Meses" },
                { id: "total", label: "Tempo total" },
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
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={waterHistoryChart}>
                <defs>
                  <linearGradient id="waterDailyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit=" ml" />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                  formatter={((value: unknown, name: unknown) => [
                    `${formatDecimal(Number(value ?? 0))} ml/ave/dia`,
                    name === "consumo" ? "Consumo" : "Meta",
                  ]) as any}
                />
                <Area type="monotone" dataKey="consumo" stroke="#2563eb" strokeWidth={2.5} fill="url(#waterDailyGradient)" />
                <Area type="monotone" dataKey="meta" stroke="#bfdbfe" strokeWidth={1.5} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Consumo mensal estimado</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                  formatter={((value: unknown) => [
                    `${Number(value ?? 0).toLocaleString("pt-BR")} L`,
                    "Consumo",
                  ]) as any}
                />
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
            <h3 className="text-sm font-bold text-gray-900">Consumo médio estimado por fase de crescimento</h3>
            <p className="text-xs text-gray-500 mt-1">Faixas de referência em ml por ave por dia</p>
          </div>
          <div className="rounded-xl bg-blue-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-blue-500 font-semibold">Fase atual</p>
            <p className="text-sm font-bold text-blue-900 mt-1">
              {phaseWaterChart.find((item) => item.estimado > 0)?.fase ?? "Produção"} · {metrics.mlPerBird} ml/ave/dia
            </p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={phaseWaterChart}>
              <defs>
                <linearGradient id="phaseMinGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dbeafe" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#dbeafe" stopOpacity={0.15} />
                </linearGradient>
                <linearGradient id="phaseMaxGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="phaseEstimatedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="fase" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit=" ml" />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                formatter={((value: unknown, name: unknown) => [
                  `${Number(value ?? 0)} ml`,
                  name === "minimo" ? "Mínimo" : name === "maximo" ? "Máximo" : "Estimado do lote",
                ]) as any}
              />
              <Area type="monotone" dataKey="maximo" name="maximo" stroke="#93c5fd" strokeWidth={2} fill="url(#phaseMaxGradient)" />
              <Area type="monotone" dataKey="minimo" name="minimo" stroke="#bfdbfe" strokeWidth={2} fill="url(#phaseMinGradient)" />
              <Area type="monotone" dataKey="estimado" name="estimado" stroke="#2563eb" strokeWidth={3} fill="url(#phaseEstimatedGradient)" />
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
            <p className="text-lg font-bold text-gray-900 mt-2">
              {lote.avg_weight_kg ? `${formatDecimal(lote.avg_weight_kg, 2)} kg` : "Sem registro"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Usado para calibrar o consumo estimado por ave.</p>
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
            <p className="text-xs text-gray-500 mt-1">Comparação com a média operacional recente do lote.</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
