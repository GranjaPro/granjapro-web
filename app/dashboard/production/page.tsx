"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ModalPortal from "@/components/ui/modal-portal";
import {
  Egg,
  TrendingUp,
  AlertTriangle,
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  X,
  Check,
  Pencil,
  Trash2,
  FileText,
  Target,
  Lightbulb,
  ChevronRight,
  Search,
  BarChart3,
  HelpCircle,
  Wheat,
  CircleDollarSign,
  AlertOctagon,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { insightHref } from "@/lib/insight-links";
import { AssistantCard } from "@/components/dashboard/assistant-card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
} from "recharts";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useDateFilter, CalendarFilter } from "@/components/date-filter";
import { hasMinimumPlan } from "@/lib/plans";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/plan/locked-overlay";
import { RequiredPlanBadge } from "@/components/plan/plan-badge";
import { FarmHealthBanner, type FarmHealthInsight } from "@/components/dashboard/farm-health-banner";
import type { Tables } from "@/lib/database.types";
import { calculateEggProductionMetrics, calculateLiveBirdsAtDate, getFlockProductionEligibility, type FlockMortality } from "@/lib/domain/egg-production-metrics";
import { calculateRelativePercentageDifference } from "@/lib/domain/kpi-comparison";

/* ── Interfaces ── */
interface Lote {
  id: string;
  codigo: string;
  raca: string;
  aves: number;
  postura: string;
  arrivalAgeWeeks: number;
  arrivalDate: string;
  status: string;
}

interface Registro {
  id: string;
  loteId: string;
  loteCodigo: string;
  data: string;
  total: number;
  quebrados: number;
  sujos: number;
  descartados: number;
  taxa: string;
}
type FlockRow = Pick<Tables<"flocks">, "id" | "code" | "breed" | "bird_count" | "arrival_age_weeks" | "arrival_date" | "status">;
type EggProductionRow = Tables<"egg_production"> & {
  flocks: Pick<Tables<"flocks">, "code" | "breed" | "bird_count"> | null;
};
type WithdrawalTreatment = Pick<
  Tables<"health_records">,
  "id" | "flock_id" | "date" | "title" | "active_ingredient" | "withdrawal_period_days"
>;
type TooltipFormatter = (value: unknown, name: unknown) => [string, string];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

type ModalMode = "add" | "edit" | null;

export default function ProducaoPage() {
  const searchParams = useSearchParams();
  const { farm, loading: authLoading } = useAuth();
  const { plan, hideAdvancedFeatures } = usePlan();
  const showProductionFinancial = !(hideAdvancedFeatures && !hasMinimumPlan(plan, "pro"));
  const showProductionAssistant = !(hideAdvancedFeatures && !hasMinimumPlan(plan, "premium"));

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [mortalities, setMortalities] = useState<FlockMortality[]>([]);
  const [withdrawalTreatments, setWithdrawalTreatments] = useState<WithdrawalTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modal, setModal] = useState<ModalMode>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (searchParams.get("register") === "true") setModal("add");
  }, [searchParams]);
  const [editing, setEditing] = useState<Registro | null>(null);
  const [form, setForm] = useState({ loteId: "", data: "", total: "", quebrados: "", sujos: "", descartados: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Shared calendar filter
  const { dateRange } = useDateFilter();

  /* ── Data Fetching ── */
  const farmRef = useRef(farm);
  farmRef.current = farm;

  const fetchData = useCallback(async () => {
    const currentFarm = farmRef.current;
    if (!currentFarm) { setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();

    try {
      const { startDate, endDate } = dateRange;

      const [productionRes, flocksRes, withdrawalRes, mortalityRes] = await Promise.all([
        supabase
          .from("egg_production")
          .select("*, flocks(code, breed, bird_count)")
          .eq("farm_id", currentFarm.id)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false }),
        supabase
          .from("flocks")
          .select("id, code, breed, bird_count, arrival_age_weeks, arrival_date, status")
          .eq("farm_id", currentFarm.id)
          .order("code"),
        supabase
          .from("health_records")
          .select("id, flock_id, date, title, active_ingredient, withdrawal_period_days")
          .eq("farm_id", currentFarm.id)
          .eq("type", "treatment")
          .gt("withdrawal_period_days", 0),
        supabase
          .from("mortality")
          .select("flock_id, date, dead_birds")
          .eq("farm_id", currentFarm.id)
          .lte("date", endDate),
      ]);

      if (flocksRes.error) throw flocksRes.error;
      if (productionRes.error) throw productionRes.error;
      if (withdrawalRes.error) throw withdrawalRes.error;
      if (mortalityRes.error) throw mortalityRes.error;

      const flocksData = (flocksRes.data ?? []) as FlockRow[];
      const productionData = (productionRes.data ?? []) as EggProductionRow[];
      setWithdrawalTreatments((withdrawalRes.data as WithdrawalTreatment[] | null) ?? []);
      setMortalities((mortalityRes.data ?? []).map((mortality) => ({
        flockId: mortality.flock_id,
        date: mortality.date,
        deadBirds: mortality.dead_birds,
      })));

      // Calculate postura per flock from latest records
      const flockPostura = new Map<string, number>();
      for (const r of productionData) {
        if (r.flock_id && r.laying_rate != null && !flockPostura.has(r.flock_id)) {
          flockPostura.set(r.flock_id, r.laying_rate);
        }
      }

      setLotes(flocksData.map((f) => ({
        id: f.id,
        codigo: f.code,
        raca: f.breed,
        aves: f.bird_count,
        postura: flockPostura.has(f.id) ? `${flockPostura.get(f.id)!.toFixed(1)}%` : "—",
        arrivalAgeWeeks: f.arrival_age_weeks,
        arrivalDate: f.arrival_date,
        status: f.status,
      })));

      const mapped: Registro[] = productionData.map((r) => ({
        id: r.id,
        loteId: r.flock_id || "",
        loteCodigo: r.flocks?.code || "—",
        data: r.date,
        total: r.eggs_produced,
        quebrados: r.broken_eggs || 0,
        sujos: r.dirty_eggs || 0,
        descartados: r.discarded_eggs || 0,
        taxa: r.laying_rate != null ? `${Number(r.laying_rate).toFixed(1)}%` : "—",
      }));
      setRegistros(mapped);
    } catch (err: unknown) {
      console.error("Erro ao carregar dados de produção:", err);
      setError("Erro ao carregar dados de produção.");
    }
    setLoading(false);
  }, [dateRange]);

  const activeWithdrawal = useMemo(() => {
    if (!form.loteId || !form.data) return null;
    return withdrawalTreatments.find((treatment) => {
      if (treatment.flock_id !== form.loteId || !treatment.withdrawal_period_days) return false;
      const start = treatment.date;
      const end = new Date(`${start}T00:00:00`);
      end.setDate(end.getDate() + treatment.withdrawal_period_days);
      const endIso = toIsoDate(end);
      return start <= form.data && form.data <= endIso;
    }) ?? null;
  }, [form.data, form.loteId, withdrawalTreatments]);

  const liveBirdsByFlock = useMemo(() => {
    const referenceDate = form.data || toIsoDate(new Date());
    return new Map(lotes.map((lote) => [
      lote.id,
      calculateLiveBirdsAtDate([{
        id: lote.id,
        birdCount: lote.aves,
        arrivalAgeWeeks: lote.arrivalAgeWeeks,
        arrivalDate: lote.arrivalDate,
      }], mortalities, referenceDate),
    ]));
  }, [form.data, lotes, mortalities]);

  const productionEligibilityDate = form.data || toIsoDate(new Date());
  const eligibleLotes = useMemo(() => lotes.filter((lote) => getFlockProductionEligibility({
    id: lote.id,
    birdCount: lote.aves,
    arrivalAgeWeeks: lote.arrivalAgeWeeks,
    arrivalDate: lote.arrivalDate,
  }, mortalities, productionEligibilityDate, lote.status === "descarte").isEligible), [lotes, mortalities, productionEligibilityDate]);

  useEffect(() => {
    if (!form.loteId || !form.data) return;
    const selectedLote = lotes.find((lote) => lote.id === form.loteId);
    if (!selectedLote) return;

    const eligibility = getFlockProductionEligibility({
      id: selectedLote.id,
      birdCount: selectedLote.aves,
      arrivalAgeWeeks: selectedLote.arrivalAgeWeeks,
      arrivalDate: selectedLote.arrivalDate,
    }, mortalities, form.data, selectedLote.status === "descarte");
    if (eligibility.isEligible) return;

    setForm((current) => current.loteId === selectedLote.id ? { ...current, loteId: "" } : current);
    setError(eligibility.reason ?? "O lote não está apto para produção nesta data.");
  }, [form.data, form.loteId, lotes, mortalities]);

  useEffect(() => {
    if (!activeWithdrawal) return;
    setForm((current) =>
      current.descartados === current.total ? current : { ...current, descartados: current.total },
    );
  }, [activeWithdrawal, form.total]);

  useEffect(() => {
    if (authLoading || !farm) return;
    fetchData();
  }, [authLoading, farm, fetchData]);

  /* ── Derived Chart Data ── */
  const productionMetrics = useMemo(() => {
    const today = toIsoDate(new Date());
    const effectiveEndDate = dateRange.startDate <= today && dateRange.endDate > today ? today : dateRange.endDate;
    return calculateEggProductionMetrics({
      flocks: lotes.map((lote) => ({
        id: lote.id,
        birdCount: lote.aves,
        arrivalAgeWeeks: lote.arrivalAgeWeeks,
        arrivalDate: lote.arrivalDate,
      })),
      mortalities,
      startDate: dateRange.startDate,
      endDate: effectiveEndDate,
      totalEggs: registros.reduce((sum, registro) => sum + registro.total, 0),
    });
  }, [dateRange.endDate, dateRange.startDate, lotes, mortalities, registros]);

  const curvaProducao = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const r of registros) {
      byDate.set(r.data, (byDate.get(r.data) || 0) + r.total);
    }
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return productionMetrics.dailyTargets.map((target) => {
      const date = new Date(`${target.date}T00:00:00`);
      return {
        day: days[date.getDay()],
        ovos: byDate.get(target.date) ?? 0,
        meta: target.eggGoal,
      };
    });
  }, [productionMetrics.dailyTargets, registros]);

  const qualityData = useMemo(() => {
    const totals = registros.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        quebrados: acc.quebrados + r.quebrados,
        sujos: acc.sujos + r.sujos,
        descartados: acc.descartados + r.descartados,
      }),
      { total: 0, quebrados: 0, sujos: 0, descartados: 0 }
    );
    const bons = totals.total - totals.quebrados - totals.sujos - totals.descartados;
    const t = totals.total || 1;
    return [
      { name: "Comercializáveis", value: +((bons / t) * 100).toFixed(1), color: "#2d7a4f", qty: bons },
      { name: "Quebrados", value: +((totals.quebrados / t) * 100).toFixed(1), color: "#ef4444", qty: totals.quebrados },
      { name: "Sujos", value: +((totals.sujos / t) * 100).toFixed(1), color: "#f59e0b", qty: totals.sujos },
      { name: "Descartados", value: +((totals.descartados / t) * 100).toFixed(1), color: "#94a3b8", qty: totals.descartados },
    ];
  }, [registros]);

  const producaoPorLote = useMemo(() => {
    const colors = ["#2d7a4f", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
    const eggsByFlock = new Map<string, number>();
    for (const r of registros) {
      eggsByFlock.set(r.loteId, (eggsByFlock.get(r.loteId) ?? 0) + r.total);
    }
    const periodEndDate = productionMetrics.dailyTargets.at(-1)?.date ?? dateRange.endDate;
    return lotes
      .filter((lote) => eggsByFlock.has(lote.id))
      .map((lote, index) => {
        const ovos = eggsByFlock.get(lote.id) ?? 0;
        const metrics = calculateEggProductionMetrics({
          flocks: [{
            id: lote.id,
            birdCount: lote.aves,
            arrivalAgeWeeks: lote.arrivalAgeWeeks,
            arrivalDate: lote.arrivalDate,
          }],
          mortalities,
          startDate: dateRange.startDate,
          endDate: periodEndDate,
          totalEggs: ovos,
        });
        return {
          lote: lote.codigo,
          ovos,
          taxa: Math.round(metrics.layingRate),
          meta: metrics.layingRateGoal,
          color: colors[index % colors.length],
        };
      });
  }, [dateRange.endDate, dateRange.startDate, lotes, mortalities, productionMetrics.dailyTargets, registros]);

  /* ── Health Score (period-based) ── */
  const healthScore = useMemo(() => {
    if (registros.length === 0) return { score: 0, label: "Sem dados", color: "gray", posturaRate: 0, lossRate: 0 };
    const totalEggs = registros.reduce((s, r) => s + r.total, 0);
    const totalLosses = registros.reduce((s, r) => s + r.quebrados + r.sujos, 0);
    const posturaRate = productionMetrics.layingRate;
    const lossRate = totalEggs > 0 ? (totalLosses / totalEggs) * 100 : 0;
    const qualityRate = 100 - lossRate;
    const posturaScore = productionMetrics.layingRateGoal > 0
      ? Math.min(posturaRate / productionMetrics.layingRateGoal, 1) * 70
      : 0;
    const qualityScore = Math.min(qualityRate / 95, 1) * 30;
    const score = Math.round(posturaScore + qualityScore);
    const label = score >= 80 ? "Excelente" : score >= 60 ? "Bom" : score >= 40 ? "Atenção" : "Crítico";
    const color = score >= 80 ? "emerald" : score >= 60 ? "blue" : score >= 40 ? "amber" : "red";
    return { score, label, color, posturaRate, lossRate };
  }, [productionMetrics.layingRate, productionMetrics.layingRateGoal, registros]);

  const taxaCalculada = useMemo(() => {
    const selectedLote = lotes.find((l) => l.id === form.loteId);
    const total = Number(form.total) || 0;
    if (!selectedLote || !form.data || total === 0) return "—";
    const metrics = calculateEggProductionMetrics({
      flocks: [{
        id: selectedLote.id,
        birdCount: selectedLote.aves,
        arrivalAgeWeeks: selectedLote.arrivalAgeWeeks,
        arrivalDate: selectedLote.arrivalDate,
      }],
      mortalities,
      startDate: form.data,
      endDate: form.data,
      totalEggs: total,
    });
    return metrics.eligibleBirdDays > 0 ? `${metrics.layingRate.toFixed(1)}%` : "—";
  }, [form.data, form.loteId, form.total, lotes, mortalities]);

  /* KPIs */
  const kpis = useMemo(() => {
    const periodTotal = registros.reduce((s, r) => s + r.total, 0);
    const periodQuebrados = registros.reduce((s, r) => s + r.quebrados, 0);
    const periodSujos = registros.reduce((s, r) => s + r.sujos, 0);
    const periodDays = productionMetrics.dailyTargets.length || 1;
    const recordedDays = new Set(registros.map((registro) => registro.data)).size;
    const dailyAvg = Math.round(periodTotal / periodDays);
    const expectedDailyAvg = Math.round(productionMetrics.eggGoal / periodDays);
    const productionPerformance = productionMetrics.eggGoal > 0
      ? (periodTotal / productionMetrics.eggGoal) * 100
      : 0;
    const productionDiff = productionMetrics.eggGoal > 0 ? productionPerformance - 100 : 0;
    const layingRateDiff = calculateRelativePercentageDifference(
      productionMetrics.layingRate,
      productionMetrics.layingRateGoal,
    );
    const qualidade = periodTotal > 0
      ? (1 - (periodQuebrados + periodSujos) / periodTotal) * 100
      : 0;
    const metaQualidade = 95;
    const qualityDiff = periodTotal > 0
      ? calculateRelativePercentageDifference(qualidade, metaQualidade)
      : 0;
    const dailyAverageDiff = expectedDailyAvg > 0
      ? ((dailyAvg - expectedDailyAvg) / expectedDailyAvg) * 100
      : 0;

    return [
      {
        title: "Produção",
        value: periodTotal.toLocaleString("pt-BR"),
        icon: Egg,
        iconBg: "bg-brand-50",
        iconColor: "text-brand-600",
        actual: periodTotal,
        expectedVal: productionMetrics.eggGoal,
        expectedLabel: productionMetrics.eggGoal.toLocaleString("pt-BR"),
        unit: "ovos",
        progress: productionPerformance,
        progressColor: productionMetrics.eggGoal === 0 ? "bg-gray-300" : productionPerformance >= 100 ? "bg-emerald-500" : productionPerformance >= 90 ? "bg-amber-500" : "bg-red-500",
        diff: productionDiff,
        diffLabel: `${productionDiff > 0 ? "+" : ""}${productionDiff.toFixed(1)}%`,
        subtitle: productionMetrics.eggGoal > 0 ? `${productionPerformance.toFixed(0)}% do esperado` : "Sem aves aptas no período",
      },
      {
        title: "Taxa de Postura",
        value: `${productionMetrics.layingRate.toFixed(1)}%`,
        icon: Target,
        iconBg: "bg-violet-50",
        iconColor: "text-violet-600",
        actual: productionMetrics.layingRate,
        expectedVal: productionMetrics.layingRateGoal,
        expectedLabel: `${productionMetrics.layingRateGoal.toFixed(1)}%`,
        unit: "",
        progress: productionMetrics.layingRate,
        progressColor: layingRateDiff >= 0 ? "bg-emerald-500" : layingRateDiff >= -5 ? "bg-amber-500" : "bg-red-500",
        diff: layingRateDiff,
        diffLabel: `${layingRateDiff > 0 ? "+" : ""}${layingRateDiff.toFixed(1)}%`,
        subtitle: "Meta ponderada por fase produtiva",
      },
      {
        title: "Qualidade",
        value: `${qualidade.toFixed(1)}%`,
        icon: AlertTriangle,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        actual: qualidade,
        expectedVal: metaQualidade,
        expectedLabel: `${metaQualidade}%`,
        unit: "",
        progress: qualidade,
        progressColor: periodTotal === 0 ? "bg-gray-300" : qualidade >= metaQualidade ? "bg-emerald-500" : qualidade >= 90 ? "bg-amber-400" : "bg-red-500",
        diff: qualityDiff,
        diffLabel: `${qualityDiff > 0 ? "+" : ""}${qualityDiff.toFixed(1)}%`,
        subtitle: periodTotal > 0 ? `${periodQuebrados} quebrados · ${periodSujos} sujos` : "Sem registros de qualidade",
      },
      {
        title: "Média Diária no Período",
        value: dailyAvg.toLocaleString("pt-BR"),
        icon: Activity,
        iconBg: "bg-teal-50",
        iconColor: "text-teal-600",
        actual: dailyAvg,
        expectedVal: expectedDailyAvg,
        expectedLabel: expectedDailyAvg.toLocaleString("pt-BR"),
        unit: "ovos",
        progress: expectedDailyAvg > 0 ? (dailyAvg / expectedDailyAvg) * 100 : 0,
        progressColor: expectedDailyAvg === 0 ? "bg-gray-300" : dailyAvg >= expectedDailyAvg ? "bg-emerald-500" : dailyAvg >= expectedDailyAvg * 0.9 ? "bg-amber-500" : "bg-red-500",
        diff: dailyAverageDiff,
        diffLabel: `${dailyAverageDiff > 0 ? "+" : ""}${dailyAverageDiff.toFixed(1)}%`,
        subtitle: `${recordedDays} de ${periodDays} dias registrados · ${registros.length} registros`,
      },
    ];
  }, [productionMetrics, registros]);

  /* Insights (period-based) */
  const insights = useMemo(() => {
    const arr: { type: "success" | "warning" | "info"; title: string; action: string }[] = [];
    if (registros.length === 0) return arr;

    const periodTotal = registros.reduce((s, r) => s + r.total, 0);
    const periodDays = productionMetrics.dailyTargets.length || 1;
    const recordedDays = new Set(registros.map((registro) => registro.data)).size;
    const dailyAvg = Math.round(periodTotal / periodDays);
    const expectedDailyAvg = Math.round(productionMetrics.eggGoal / periodDays);

    if (expectedDailyAvg > 0) {
      if (dailyAvg >= expectedDailyAvg) {
        arr.push({ type: "success", title: `Média diária acima da meta (+${((dailyAvg / expectedDailyAvg - 1) * 100).toFixed(0)}%)`, action: "Manter condições atuais de manejo e alimentação" });
      } else {
        const diff = (((expectedDailyAvg - dailyAvg) / expectedDailyAvg) * 100).toFixed(0);
        arr.push({ type: "warning", title: `Média diária abaixo do esperado (-${diff}%)`, action: "Verificar ventilação e consumo de ração" });
      }
    }

    const quebrados = registros.reduce((s, r) => s + r.quebrados, 0);
    const sujos = registros.reduce((s, r) => s + r.sujos, 0);
    if (periodTotal > 0) {
      const physicalLossRate = ((quebrados + sujos) / periodTotal) * 100;
      if (physicalLossRate > 5) {
        const perdaRate = physicalLossRate.toFixed(1);
        arr.push({ type: "warning", title: `Taxa de perdas em ${perdaRate}%`, action: "Possível problema nutricional — revisar ração e suplementos" });
      }
    }

    const lowPerformance = producaoPorLote.filter((lote) => lote.taxa < lote.meta);
    if (lowPerformance.length > 0) {
      arr.push({ type: "warning", title: `${lowPerformance.map((lote) => lote.lote).join(", ")} com postura abaixo da meta da fase`, action: "Avaliar saúde do lote e ajustar dieta" });
    }

    if (recordedDays < periodDays) {
      arr.push({ type: "info", title: `${recordedDays} de ${periodDays} dias possuem registro`, action: "Completar os dias sem lançamento para melhorar a análise do período" });
    } else if (expectedDailyAvg > 0 && dailyAvg >= expectedDailyAvg * 0.95) {
      arr.push({ type: "success", title: `Média do período estável (${dailyAvg.toLocaleString("pt-BR")} ovos/dia)`, action: "Ritmo consistente — manter práticas atuais" });
    } else if (expectedDailyAvg > 0) {
      arr.push({ type: "info", title: `Média do período abaixo da meta (${dailyAvg.toLocaleString("pt-BR")} ovos/dia)`, action: "Intensificar coleta e revisar horários de alimentação" });
    }

    return arr;
  }, [producaoPorLote, productionMetrics.dailyTargets.length, productionMetrics.eggGoal, registros]);

  const filteredRegistros = useMemo(() => {
    if (!searchQuery.trim()) return registros;
    const q = searchQuery.toLowerCase();
    return registros.filter(r =>
      r.loteCodigo.toLowerCase().includes(q) ||
      r.data.includes(q) ||
      r.taxa.includes(q)
    );
  }, [registros, searchQuery]);

  function openAdd() {
    setForm({ loteId: "", data: "", total: "", quebrados: "", sujos: "", descartados: "" });
    setEditing(null);
    setError("");
    setModal("add");
  }

  function openEdit(r: Registro) {
    setForm({
      loteId: r.loteId,
      data: r.data,
      total: String(r.total),
      quebrados: String(r.quebrados),
      sujos: String(r.sujos),
      descartados: String(r.descartados),
    });
    setEditing(r);
    setError("");
    setModal("edit");
  }

  async function save() {
    if (!farm) return;
    const flockId = form.loteId;
    const selectedLote = lotes.find(l => l.id === flockId);
    if (!selectedLote || !form.data.trim()) return;

    const eligibility = getFlockProductionEligibility({
      id: selectedLote.id,
      birdCount: selectedLote.aves,
      arrivalAgeWeeks: selectedLote.arrivalAgeWeeks,
      arrivalDate: selectedLote.arrivalDate,
    }, mortalities, form.data, selectedLote.status === "descarte");
    if (!eligibility.isEligible) {
      setError(eligibility.reason ?? "O lote não está apto para produção nesta data.");
      return;
    }

    const total = Number(form.total) || 0;
    const quebrados = Number(form.quebrados) || 0;
    const sujos = Number(form.sujos) || 0;
    const discardedInput = Number(form.descartados) || 0;
    const descartados = activeWithdrawal ? total : discardedInput;
    const dailyMetrics = calculateEggProductionMetrics({
      flocks: [{
        id: selectedLote.id,
        birdCount: selectedLote.aves,
        arrivalAgeWeeks: selectedLote.arrivalAgeWeeks,
        arrivalDate: selectedLote.arrivalDate,
      }],
      mortalities,
      startDate: form.data,
      endDate: form.data,
      totalEggs: total,
    });

    setSaving(true);
    setError("");

    const record = {
      farm_id: farm.id,
      flock_id: flockId || null,
      date: form.data,
      eggs_produced: total,
      broken_eggs: quebrados,
      dirty_eggs: sujos,
      discarded_eggs: descartados,
      laying_rate: +dailyMetrics.layingRate.toFixed(2),
      eggs_per_bird: dailyMetrics.eligibleBirdDays > 0 ? +(total / dailyMetrics.eligibleBirdDays).toFixed(4) : 0,
    };

    const supabase = createClient();
    try {
      if (modal === "add") {
        const { error: insertErr } = await supabase.from("egg_production").insert(record);
        if (insertErr) throw insertErr;
      } else if (editing) {
        const { error: updateErr } = await supabase.from("egg_production").update(record).eq("id", editing.id);
        if (updateErr) throw updateErr;
      }
      setModal(null);
      await fetchData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao salvar registro."));
    }
    setSaving(false);
  }

  async function deleteRegistro(id: string) {
    const supabase = createClient();
    try {
      const { error: delErr } = await supabase.from("egg_production").delete().eq("id", id);
      if (delErr) throw delErr;
      setDeleteConfirm(null);
      await fetchData();
    } catch (err: unknown) {
      console.error("Erro ao excluir registro:", err);
    }
  }

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return dateStr;
    }
  }

  const farmHealthInsights = useMemo<FarmHealthInsight[]>(
    () =>
      insights.map((insight) => {
        const link = insightHref(`${insight.title} ${insight.action}`);

        return {
          level: insight.type,
          title: insight.title,
          action: insight.action,
          href: link.href,
          hrefLabel: link.label,
        };
      }),
    [insights]
  );
  const farmHealthSummary = `Postura: ${healthScore.posturaRate.toFixed(1)}% | Meta: ${productionMetrics.layingRateGoal.toFixed(1)}% | Perdas físicas: ${healthScore.lossRate.toFixed(1)}%`;

  /* ── Loading State ── */
  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
            <Egg className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Produção de Ovos</h1>
            <p className="text-sm text-gray-500 mt-0.5">Acompanhe a produção diária, qualidade e tendências</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CalendarFilter />
          <button onClick={openAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20">
            <Plus className="w-4 h-4" />
            Registrar Produção
          </button>
        </div>
      </div>

      {/* Resumo de Hoje */}
      {plan === "essencial" ? (
        <LockedOverlay message="Desbloqueie o resumo de saúde produtiva" targetPlan="pro">
          <FarmHealthBanner
            score={healthScore.score}
            summary={farmHealthSummary}
            insights={farmHealthInsights}
          />
        </LockedOverlay>
      ) : (
        <FarmHealthBanner
          score={healthScore.score}
          summary={farmHealthSummary}
          insights={farmHealthInsights}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", kpi.iconBg)}>
                <kpi.icon className={cn("w-4.5 h-4.5", kpi.iconColor)} />
              </div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{kpi.title}</span>
            </div>

            {/* Actual value + diff badge */}
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{kpi.value}</p>
              <span className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full",
                kpi.diff > 0 ? "text-emerald-700 bg-emerald-50" : kpi.diff < 0 ? "text-red-600 bg-red-50" : "text-gray-600 bg-gray-100"
              )}>
                {kpi.diff > 0 && <ArrowUpRight className="w-3 h-3" />}
                {kpi.diff < 0 && <ArrowDownRight className="w-3 h-3" />}
                {kpi.diffLabel}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">{kpi.subtitle}</p>

            {/* Bullet-style progress bar with target marker */}
            {(() => {
              const maxVal = Math.max(kpi.actual, kpi.expectedVal) * 1.08;
              const fillPct = maxVal > 0 ? Math.min((kpi.actual / maxVal) * 100, 100) : 0;
              const markerPct = maxVal > 0 ? Math.min((kpi.expectedVal / maxVal) * 100, 100) : 0;
              return (
                <div className="mt-4 relative">
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-700", kpi.progressColor)} style={{ width: `${fillPct}%` }} />
                  </div>
                  <div
                    className="absolute top-[-3px] w-0.5 h-4 bg-gray-800 rounded-full"
                    style={{ left: `${markerPct}%` }}
                    title={`Esperado: ${kpi.expectedLabel}`}
                  />
                </div>
              );
            })()}

            {/* Expected vs Actual labels */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                <span className="text-[10px] text-gray-500 font-medium">Esperado: {kpi.expectedLabel} {kpi.unit}</span>
              </div>
              <span className={cn(
                "text-[10px] font-semibold",
                kpi.diff > 0 ? "text-emerald-600" : kpi.diff < 0 ? "text-red-500" : "text-gray-500"
              )}>
                {kpi.diff > 0 ? "Acima do esperado" : kpi.diff < 0 ? "Abaixo do esperado" : "Na meta"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights + Trend Chart */}
      {(showProductionAssistant || showProductionFinancial) && (
      <div className={cn("grid grid-cols-1 gap-4", showProductionAssistant && showProductionFinancial && "lg:grid-cols-2")}>
        {/* Assistente de Granja */}
        {showProductionAssistant && (
        <AssistantCard
          subtitle="Baseado nos dados do período"
          lockedMessage="Desbloqueie o Assistente de Granja"
          className="p-5"
        >
          {(() => {
            const displayInsights = insights.length > 0 ? insights : [
              { type: "warning" as const, title: "Taxa de postura abaixo da meta", action: "Verificar idade dos lotes e ajustar manejo alimentar" },
              { type: "success" as const, title: "Produção acima da média semanal", action: "Manter padrão de iluminação e temperatura atuais" },
              { type: "info" as const, title: "Oportunidade de otimização", action: "Redistribuir aves entre galpões para equilibrar densidade" },
              { type: "warning" as const, title: "Perdas acima do aceitável", action: "Rever coleta e transporte de ovos nos horários críticos" },
              { type: "success" as const, title: "Meta de dúzias atingida", action: "Considerar aumentar a meta para o próximo ciclo" },
            ];
            return (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
                {displayInsights.map((ins, i) => {
                  const isLockedInsight = plan !== "premium" && i >= 2;
                  if (isLockedInsight) {
                    return (
                      <LockedOverlay key={i} message="Desbloqueie o Assistente de Granja completo" targetPlan="premium">
                        <div className={cn(
                          "p-3.5 rounded-xl border-l-[3px]",
                          ins.type === "success" && "bg-emerald-50/50 border-l-emerald-500",
                          ins.type === "warning" && "bg-amber-50/50 border-l-amber-500",
                          ins.type === "info" && "bg-blue-50/50 border-l-blue-500",
                        )}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
                              <Lightbulb className="w-2.5 h-2.5 text-gray-400" />
                            </div>
                            <span className="text-sm font-semibold text-gray-600">{ins.title}</span>
                          </div>
                          <p className="text-xs font-medium ml-7 text-gray-400">→ {ins.action}</p>
                        </div>
                      </LockedOverlay>
                    );
                  }
                  return (
                    <div key={i} className={cn(
                      "p-3.5 rounded-xl border-l-[3px]",
                      ins.type === "success" && "bg-emerald-50/50 border-l-emerald-500",
                      ins.type === "warning" && "bg-amber-50/50 border-l-amber-500",
                      ins.type === "info" && "bg-blue-50/50 border-l-blue-500",
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                          ins.type === "success" && "bg-emerald-100",
                          ins.type === "warning" && "bg-amber-100",
                          ins.type === "info" && "bg-blue-100",
                        )}>
                          {ins.type === "success" && <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />}
                          {ins.type === "warning" && <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />}
                          {ins.type === "info" && <Lightbulb className="w-2.5 h-2.5 text-blue-600" />}
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{ins.title}</span>
                      </div>
                      <p className={cn(
                        "text-xs font-medium ml-7",
                        ins.type === "success" ? "text-emerald-600" : ins.type === "warning" ? "text-amber-600" : "text-blue-600"
                      )}>
                        → {ins.action}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </AssistantCard>
        )}

        {/* Financial Production Metrics */}
        {showProductionFinancial && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Resumo Financeiro</h3>
              <p className="text-[11px] text-gray-400 font-medium">Indicadores de custo e receita</p>
            </div>
            <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
          </div>
          {plan === "essencial" ? (
            <LockedOverlay message="Desbloqueie o resumo financeiro da sua produção" targetPlan="pro">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Placeholder KPI cards for blur effect */}
                {[1,2,3,4,5,6].map(n => (
                  <div key={n} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
                    <div className="h-6 bg-gray-200 rounded w-24 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-32" />
                  </div>
                ))}
              </div>
            </LockedOverlay>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Custo por Ovo */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 transition-colors hover:border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Wheat className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Custo/Ovo</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 dark:border-white/10 dark:bg-[#101d3a] dark:hover:bg-slate-800">
                    <HelpCircle className="w-3 h-3 text-gray-500 dark:text-slate-300" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Custo/Ovo?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Valor gasto para produzir cada ovo, incluindo ração, mão de obra, energia e insumos.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: Custo Total / Total de Ovos</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">R$ 0,42</p>
              <div className="flex items-center justify-between mt-2 gap-1">
                <span className="text-[10px] text-gray-400 truncate">Esperado: R$ 0,38</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <ArrowUpRight className="w-3 h-3" />
                  +10.5%
                </span>
              </div>
            </div>
            {/* Margem */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 transition-colors hover:border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Margem</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 dark:border-white/10 dark:bg-[#101d3a] dark:hover:bg-slate-800">
                    <HelpCircle className="w-3 h-3 text-gray-500 dark:text-slate-300" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Margem?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Diferença percentual entre a receita e o custo total de produção. Margem alta indica maior lucro por ovo produzido.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: (Receita - Custo) / Receita × 100</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">32.4%</p>
              <div className="flex items-center justify-between mt-2 gap-1">
                <span className="text-[10px] text-gray-400 truncate">Esperado: 38%</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <ArrowDownRight className="w-3 h-3" />
                  -5.6%
                </span>
              </div>
            </div>
            {/* Receita do Dia */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 transition-colors hover:border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Receita/Dia</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 dark:border-white/10 dark:bg-[#101d3a] dark:hover:bg-slate-800">
                    <HelpCircle className="w-3 h-3 text-gray-500 dark:text-slate-300" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Receita/Dia?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Receita estimada gerada pela produção do dia, considerando o volume produzido e o preço médio de venda.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: Ovos produzidos x Preço médio por ovo</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">R$ 1.520</p>
              <div className="flex items-center justify-between mt-2 gap-1">
                <span className="text-[10px] text-gray-400 truncate">Esperado: R$ 1.600</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <ArrowDownRight className="w-3 h-3" />
                  -5.0%
                </span>
              </div>
            </div>
            {/* Eficiência Alimentar */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 transition-colors hover:border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <Wheat className="w-4 h-4 text-violet-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Efic. Alimentar</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 dark:border-white/10 dark:bg-[#101d3a] dark:hover:bg-slate-800">
                    <HelpCircle className="w-3 h-3 text-gray-500 dark:text-slate-300" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Eficiência Alimentar?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Quantidade de ração consumida para produzir cada ovo. Quanto menor, mais eficiente.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: Ração Total (kg) / Total de Ovos</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">0,128 kg</p>
              <div className="flex items-center justify-between mt-2 gap-1">
                <span className="text-[10px] text-gray-400 truncate">Esperado: 0,120 kg</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <ArrowUpRight className="w-3 h-3" />
                  +6.7%
                </span>
              </div>
            </div>
            {/* Receita por Ave */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 transition-colors hover:border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <CircleDollarSign className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Receita/Ave</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 dark:border-white/10 dark:bg-[#101d3a] dark:hover:bg-slate-800">
                    <HelpCircle className="w-3 h-3 text-gray-500 dark:text-slate-300" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Receita/Ave?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Receita média gerada por cada ave no período. Indica a produtividade econômica do plantel.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: Receita Total / Nº de Aves</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">R$ 0,52</p>
              <div className="flex items-center justify-between mt-2 gap-1">
                <span className="text-[10px] text-gray-400 truncate">Esperado: R$ 0,55</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <ArrowDownRight className="w-3 h-3" />
                  -5.5%
                </span>
              </div>
            </div>
            {/* Perda Diária (R$) */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 transition-colors hover:border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <AlertOctagon className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Perda/Dia</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 dark:border-white/10 dark:bg-[#101d3a] dark:hover:bg-slate-800">
                    <HelpCircle className="w-3 h-3 text-gray-500 dark:text-slate-300" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Perda Diária?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Valor em reais perdido diariamente com ovos quebrados, sujos e descartados.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: (Quebrados + Sujos + Descartados) × Preço/Ovo</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">R$ 18,50</p>
              <div className="flex items-center justify-between mt-2 gap-1">
                <span className="text-[10px] text-gray-400 truncate">Tolerado: R$ 12,00</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <ArrowUpRight className="w-3 h-3" />
                  +54.2%
                </span>
              </div>
            </div>
          </div>
          )}
        </div>
        )}
      </div>
      )}

      {/* Charts Row */}
      <div className={cn("grid grid-cols-1 gap-4", showProductionFinancial && "lg:grid-cols-3")}>
        {/* Production Curve — 2/3 width */}
        <div className={cn("bg-white rounded-2xl border border-gray-100 p-6", showProductionFinancial && "lg:col-span-2")}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Curva de Produção</h3>
              <p className="text-xs text-gray-400 mt-0.5">Produção vs Meta (período selecionado)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                <span className="text-[10px] font-medium text-gray-400">Produção</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-0.5 bg-gray-300" style={{ borderTop: "2px dashed #d1d5db" }} />
                <span className="text-[10px] font-medium text-gray-400">Meta</span>
              </div>
            </div>
          </div>
          {curvaProducao.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={curvaProducao} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2d7a4f" stopOpacity={0.2} />
                    <stop offset="60%" stopColor="#2d7a4f" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#2d7a4f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                  labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                  formatter={((value: unknown, name: unknown) => [Number(value).toLocaleString("pt-BR"), String(name) === "ovos" ? "Produção" : "Meta"]) satisfies TooltipFormatter}
                />
                <Line type="monotone" dataKey="meta" stroke="#9ca3af" strokeDasharray="6 4" strokeWidth={1.5} dot={false} name="meta" />
                <Area type="monotone" dataKey="ovos" stroke="#2d7a4f" strokeWidth={2.5} fill="url(#colorProd)" dot={{ r: 5, fill: "#fff", stroke: "#2d7a4f", strokeWidth: 2.5 }} activeDot={{ r: 7, fill: "#2d7a4f", stroke: "#fff", strokeWidth: 3 }} name="ovos" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">
              Nenhum dado de produção para o período selecionado.
            </div>
          )}
        </div>

        {/* Production by Lote — 1/3 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Produção por Lote</h3>
              <p className="text-xs text-gray-400 mt-0.5">Taxa de postura por lote</p>
            </div>
            <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
          </div>
          {plan === "essencial" ? (
            <LockedOverlay message="Veja sua produção por lote" targetPlan="pro">
              <div>
                <div className="space-y-4">
                  {[1,2,3,4].map(n => (
                    <div key={n}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-5 bg-gray-200 rounded w-14" />
                          <div className="h-4 bg-gray-100 rounded w-24" />
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-10" />
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full" />
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> {"≥90%"}</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> 85-89%</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /> {"<85%"}</div>
                  </div>
                </div>
              </div>
            </LockedOverlay>
          ) : producaoPorLote.length > 0 ? (
            <div className="space-y-4">
              {producaoPorLote.map((item) => (
                <div key={item.lote}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">{item.lote}</span>
                      <span className="text-xs text-gray-400">{item.ovos.toLocaleString("pt-BR")} ovos</span>
                    </div>
                    <span className={cn(
                      "text-xs font-bold",
                      item.taxa >= 90 ? "text-emerald-600" : item.taxa >= 85 ? "text-amber-600" : "text-red-600"
                    )}>
                      {item.taxa}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        item.taxa >= 90 ? "bg-emerald-500" : item.taxa >= 85 ? "bg-amber-400" : "bg-red-400"
                      )}
                      style={{ width: `${Math.min(item.taxa, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              Sem dados por lote.
            </div>
          )}
          {plan !== "essencial" && (
          <div className="mt-5 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> {"≥90%"}</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> 85-89%</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /> {"<85%"}</div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Quality + Breakdown Row */}
      <div className={cn("grid grid-cols-1 gap-4", showProductionFinancial && "lg:grid-cols-2")}>
        {/* Quality Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Aproveitamento dos Ovos</h3>
              <p className="text-xs text-gray-400 mt-0.5">Distribuição comercial da produção no período</p>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{qualityData[0]?.value || 0}% aproveitamento</span>
          </div>
          {/* Stacked bar */}
          <div className="w-full h-5 rounded-full overflow-hidden flex mt-4 mb-4">
            {qualityData.map((item) => (
              <div
                key={item.name}
                className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                style={{ width: `${item.value}%`, backgroundColor: item.color }}
              />
            ))}
          </div>
          {/* Legend rows */}
          <div className="space-y-0">
            {qualityData.map((item, i) => (
              <div key={item.name}>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-700 font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{item.qty.toLocaleString("pt-BR")} ovos</span>
                    <span className="text-xs font-bold text-gray-900 w-12 text-right">{item.value}%</span>
                  </div>
                </div>
                {i < qualityData.length - 1 && <div className="border-t border-gray-50" />}
              </div>
            ))}
          </div>
        </div>

        {/* Lotes Performance Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Desempenho dos Lotes</h3>
              <p className="text-xs text-gray-400 mt-0.5">Status de cada lote ativo</p>
            </div>
            <div className="flex items-center gap-2">
              <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
              <Link href="/dashboard/flocks" className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1 cursor-pointer">
                Ver todos
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
          {plan === "essencial" ? (
            <LockedOverlay message="Veja o desempenho dos seus lotes" targetPlan="pro">
              <div className="space-y-3">
                {[1,2,3].map(n => (
                  <div key={n} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100" />
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-16 mb-1" />
                        <div className="h-3 bg-gray-100 rounded w-24" />
                      </div>
                    </div>
                    <div className="h-4 bg-gray-100 rounded w-20" />
                  </div>
                ))}
              </div>
            </LockedOverlay>
          ) : (
          <>
          {(() => {
            const lotesComPostura = lotes.filter(l => !isNaN(parseFloat(l.postura)));
            const avg = lotesComPostura.length > 0
              ? Math.round(lotesComPostura.reduce((s, l) => s + parseFloat(l.postura), 0) / lotesComPostura.length * 10) / 10
              : 0;
            return (
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Média geral: {avg}%</span>
              </div>
            );
          })()}
          {lotes.length > 0 ? (
          <div className="space-y-0">
            {(() => {
              const lotesComPostura = lotes.filter(l => !isNaN(parseFloat(l.postura)));
              const avg = lotesComPostura.length > 0
                ? lotesComPostura.reduce((s, l) => s + parseFloat(l.postura), 0) / lotesComPostura.length
                : 0;
              return lotes.map((l, i) => {
                const taxa = parseFloat(l.postura);
                const hasPostura = !isNaN(taxa);
                const diff = hasPostura ? Math.round((taxa - avg) * 10) / 10 : 0;
                return (
                  <div key={l.id}>
                    <div className="flex items-center justify-between py-3 group gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0",
                          hasPostura && taxa >= 90 ? "bg-emerald-50 text-emerald-700" :
                          hasPostura && taxa >= 85 ? "bg-amber-50 text-amber-700" :
                          hasPostura ? "bg-red-50 text-red-600" :
                          "bg-gray-50 text-gray-400"
                        )}>
                          {hasPostura ? `${taxa}%` : "—"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{l.codigo}</p>
                          <p className="text-[11px] text-gray-400 truncate">{l.raca} · {l.aves.toLocaleString("pt-BR")} aves</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {hasPostura && diff > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            <ArrowUpRight className="w-3 h-3" />
                            +{diff}% acima da média
                          </span>
                        )}
                        {hasPostura && diff === 0 && (
                          <span className="text-[10px] font-semibold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-full">
                            Na média geral
                          </span>
                        )}
                        {hasPostura && diff < 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                            <ArrowDownRight className="w-3 h-3" />
                            {diff}% abaixo da média
                          </span>
                        )}
                        {!hasPostura && (
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">Sem Informação</span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                      </div>
                    </div>
                    {i < lotes.length - 1 && <div className="border-t border-gray-50" />}
                  </div>
                );
              });
            })()}
          </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-sm text-gray-400">
              Nenhum lote cadastrado.
            </div>
          )}
          </>
          )}
        </div>
        </div>
      </div>

      {/* Recent Entries Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Registros Recentes</h3>
            <p className="text-xs text-gray-400 mt-0.5">{registros.length} registros</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-100/80 rounded-xl px-3 py-2 w-56 transition-colors focus-within:bg-gray-100 focus-within:ring-2 focus-within:ring-brand-500/20">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar registro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none w-full"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Lote</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Data</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Total</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Quebrados</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Sujos</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Descartados</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Taxa</th>
                <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Histórico</th>
                <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistros.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg whitespace-nowrap">{r.loteCodigo}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatDate(r.data)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{r.total.toLocaleString("pt-BR")}</td>
                  <td className="px-6 py-4">
                    <span className={cn("text-sm font-medium", r.quebrados > 10 ? "text-red-600" : "text-gray-500")}>{r.quebrados}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("text-sm font-medium", r.sujos > 15 ? "text-amber-600" : "text-gray-500")}>{r.sujos}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{r.descartados}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-sm font-bold",
                      parseFloat(r.taxa) >= 90 ? "text-emerald-600" :
                      parseFloat(r.taxa) >= 85 ? "text-amber-600" :
                      parseFloat(r.taxa) >= 0 ? "text-red-600" : "text-gray-400"
                    )}>{r.taxa}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link href={`/dashboard/production/historico/${r.loteId}`} className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer">
                      <FileText className="w-4 h-4" />
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRegistros.length === 0 && (
                <tr><td colSpan={9} className="text-center py-16 text-gray-400 text-sm">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Registrar Produção" : "Editar Registro"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Auto-calculated taxa preview */}
            {taxaCalculada !== "—" && (
              <div className="bg-brand-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <Target className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-xs text-brand-600 font-medium">Taxa de postura estimada</p>
                  <p className="text-lg font-bold text-brand-700">{taxaCalculada}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lote</label>
                  <select
                    value={form.loteId}
                    onChange={(e) => {
                      setError("");
                      setForm({ ...form, loteId: e.target.value });
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer"
                  >
                    <option value="">Selecionar lote...</option>
                    {eligibleLotes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.codigo} — {l.raca} ({(liveBirdsByFlock.get(l.id) ?? 0).toLocaleString("pt-BR")} aves vivas)
                      </option>
                    ))}
                  </select>
                  {eligibleLotes.length === 0 && (
                    <p className="mt-1 text-[10px] font-medium text-amber-600">
                      Nenhum lote produtivo com aves vivas nesta data.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Total de Ovos</label>
                <input
                  type="number"
                  value={form.total}
                  onChange={(e) => {
                    const total = e.target.value;
                    setForm({ ...form, total, descartados: activeWithdrawal ? total : form.descartados });
                  }}
                  placeholder="2450"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quebrados</label>
                  <input
                    type="number"
                    value={form.quebrados}
                    onChange={(e) => setForm({ ...form, quebrados: e.target.value })}
                    placeholder="12"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sujos</label>
                  <input
                    type="number"
                    value={form.sujos}
                    onChange={(e) => setForm({ ...form, sujos: e.target.value })}
                    placeholder="18"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descartados</label>
                  <input
                    type="number"
                  value={form.descartados}
                  onChange={(e) => setForm({ ...form, descartados: activeWithdrawal ? form.total : e.target.value })}
                  disabled={Boolean(activeWithdrawal)}
                    placeholder="5"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
              </div>
              {activeWithdrawal && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Este lote está em carência sanitária por tratamento com{" "}
                  <span className="font-semibold">
                    {activeWithdrawal.active_ingredient ?? activeWithdrawal.title}
                  </span>
                  . Todos os ovos devem ser descartados; ovos comercializáveis estão bloqueados.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button
                onClick={save}
                disabled={!form.loteId || !form.data || saving}
                className={cn(
                  "inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm",
                  form.loteId && form.data && !saving
                    ? "text-white bg-brand-600 hover:bg-brand-700"
                    : "text-gray-400 bg-gray-200 cursor-not-allowed"
                )}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Confirmar exclusão</h3>
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={() => deleteRegistro(deleteConfirm)} className="px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
