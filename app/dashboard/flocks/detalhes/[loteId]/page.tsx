"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Layers,
  Truck,
  Calendar,
  MapPin,
  Bird,
  Weight,
  Egg,
  Clock,
  Building2,
  Phone,
  Tag,
  Dna,
  Wheat,
  HeartPulse,
  Skull,
  ChevronRight,
  Droplets,
  ShieldCheck,
  Loader2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/plan/locked-overlay";
import { PlanAwareCalendarFilter, useDateFilter } from "@/components/date-filter";
import { hasMinimumPlan } from "@/lib/plans";
import type { Tables } from "@/lib/database.types";

function calculateCurrentAge(arrivalDate: string, arrivalAgeWeeks: number): number {
  const arrival = new Date(arrivalDate);
  const now = new Date();
  const diffMs = now.getTime() - arrival.getTime();
  const weeksSinceArrival = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return arrivalAgeWeeks + weeksSinceArrival;
}

interface Lote {
  id: string;
  code: string;
  breed: string;
  bird_count: number;
  arrival_age_weeks: number;
  production_system: string;
  status: string;
  supplier: string | null;
  supplier_contact: string | null;
  arrival_date: string;
  origin: string | null;
  lineage: string | null;
  avg_weight_kg: number | null;
  barn_name: string | null;
}

type FlockDetailsRow = Tables<"flocks"> & {
  barns: { name: string | null } | null;
};
type EggProductionSummaryRow = Pick<Tables<"egg_production">, "eggs_produced" | "laying_rate">;
type HealthSummaryRow = Pick<Tables<"health_records">, "type" | "status">;
type MortalitySummaryRow = Pick<Tables<"mortality">, "dead_birds" | "mortality_rate">;
type WaterSummaryRow = Pick<Tables<"water_consumption">, "quantity_liters">;
type FeedSummaryRow = Pick<Tables<"feed_consumption">, "quantity_kg" | "cost">;
type TaskSummaryRow = Pick<Tables<"tasks">, "done">;

interface LoteSummary {
  productionRecords: number;
  totalEggs: number;
  averageLayingRate: number;
  healthRecords: number;
  pendingHealthRecords: number;
  mortalityDeaths: number;
  averageMortalityRate: number;
  sanitaryRecords: number;
  waterLiters: number;
  feedKg: number;
  feedCost: number;
  tasksTotal: number;
  tasksDone: number;
}

const emptySummary: LoteSummary = {
  productionRecords: 0,
  totalEggs: 0,
  averageLayingRate: 0,
  healthRecords: 0,
  pendingHealthRecords: 0,
  mortalityDeaths: 0,
  averageMortalityRate: 0,
  sanitaryRecords: 0,
  waterLiters: 0,
  feedKg: 0,
  feedCost: 0,
  tasksTotal: 0,
  tasksDone: 0,
};

const stageLabel: Record<string, string> = {
  crescimento: "Crescimento",
  pico: "Pico",
  estavel: "Estável",
  declinio: "Declínio",
  descarte: "Descarte",
};

function getProductionStage(ageWeeks: number): string {
  if (ageWeeks < 28) return "crescimento";
  if (ageWeeks <= 35) return "pico";
  if (ageWeeks <= 60) return "estavel";
  if (ageWeeks <= 80) return "declinio";
  return "descarte";
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return dateStr; }
}

function daysSinceArrival(dateStr: string) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return Math.floor((new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  } catch { return 0; }
}

export default function DetalhesLotePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const loteId = params.loteId as string;
  const cameFromProduction = searchParams.get("origem") === "producao";
  const originSuffix = cameFromProduction ? "?origem=producao" : "";
  const backHref = cameFromProduction ? "/dashboard/production" : "/dashboard/flocks";
  const backLabel = cameFromProduction ? "Voltar para Produção" : "Voltar para Lotes";
  const { farm, loading: authLoading } = useAuth();
  const { plan } = usePlan();
  const { dateRange } = useDateFilter();
  const canUseDateFilter = hasMinimumPlan(plan, "pro");

  const [lote, setLote] = useState<Lote | null>(null);
  const [summary, setSummary] = useState<LoteSummary>(emptySummary);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!farm) { setFetching(false); return; }
    let cancelled = false;
    const supabase = createClient();

    async function fetchLote() {
      setFetching(true);
      const productionQuery = supabase
        .from("egg_production")
        .select("eggs_produced, laying_rate")
        .eq("farm_id", farm!.id)
        .eq("flock_id", loteId);
      const healthQuery = supabase
        .from("health_records")
        .select("type, status")
        .eq("farm_id", farm!.id)
        .eq("flock_id", loteId);
      const mortalityQuery = supabase
        .from("mortality")
        .select("dead_birds, mortality_rate")
        .eq("farm_id", farm!.id)
        .eq("flock_id", loteId);
      const waterQuery = supabase
        .from("water_consumption")
        .select("quantity_liters")
        .eq("farm_id", farm!.id)
        .eq("flock_id", loteId);
      const feedQuery = supabase
        .from("feed_consumption")
        .select("quantity_kg, cost")
        .eq("farm_id", farm!.id)
        .eq("flock_id", loteId);
      const tasksQuery = supabase
        .from("tasks")
        .select("done")
        .eq("farm_id", farm!.id)
        .eq("flock_id", loteId);

      if (canUseDateFilter) {
        productionQuery.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
        healthQuery.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
        mortalityQuery.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
        waterQuery.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
        feedQuery.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
        tasksQuery.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
      }

      const [loteRes, productionRes, healthRes, mortalityRes, waterRes, feedRes, tasksRes] = await Promise.all([
        supabase
          .from("flocks")
          .select("*, barns(name)")
          .eq("id", loteId)
          .eq("farm_id", farm!.id)
          .single(),
        productionQuery,
        healthQuery,
        mortalityQuery,
        waterQuery,
        feedQuery,
        tasksQuery,
      ]);

      if (cancelled) return;

      if (loteRes.data) {
        const data = loteRes.data as FlockDetailsRow;
        setLote({
          id: data.id,
          code: data.code,
          breed: data.breed,
          bird_count: data.bird_count,
          arrival_age_weeks: data.arrival_age_weeks ?? 0,
          production_system: data.production_system ?? "",
          status: data.status,
          supplier: data.supplier,
          supplier_contact: data.supplier_contact,
          arrival_date: data.arrival_date,
          origin: data.origin,
          lineage: data.lineage,
          avg_weight_kg: data.avg_weight_kg,
          barn_name: data.barns?.name ?? null,
        });

        const productionRows = (productionRes.data ?? []) as EggProductionSummaryRow[];
        const healthRows = (healthRes.data ?? []) as HealthSummaryRow[];
        const mortalityRows = (mortalityRes.data ?? []) as MortalitySummaryRow[];
        const waterRows = (waterRes.data ?? []) as WaterSummaryRow[];
        const feedRows = (feedRes.data ?? []) as FeedSummaryRow[];
        const taskRows = (tasksRes.data ?? []) as TaskSummaryRow[];
        const totalLayingRate = productionRows.reduce((sum, row) => sum + Number(row.laying_rate || 0), 0);
        const totalMortalityRate = mortalityRows.reduce((sum, row) => sum + Number(row.mortality_rate || 0), 0);

        setSummary({
          productionRecords: productionRows.length,
          totalEggs: productionRows.reduce((sum, row) => sum + row.eggs_produced, 0),
          averageLayingRate: productionRows.length > 0 ? totalLayingRate / productionRows.length : 0,
          healthRecords: healthRows.length,
          pendingHealthRecords: healthRows.filter((row) => row.status === "scheduled" || row.status === "upcoming" || row.status === "in_progress").length,
          mortalityDeaths: mortalityRows.reduce((sum, row) => sum + row.dead_birds, 0),
          averageMortalityRate: mortalityRows.length > 0 ? totalMortalityRate / mortalityRows.length : 0,
          sanitaryRecords: healthRows.filter((row) => row.type === "vaccination" || row.type === "treatment").length,
          waterLiters: waterRows.reduce((sum, row) => sum + Number(row.quantity_liters || 0), 0),
          feedKg: feedRows.reduce((sum, row) => sum + Number(row.quantity_kg || 0), 0),
          feedCost: feedRows.reduce((sum, row) => sum + Number(row.cost || 0), 0),
          tasksTotal: taskRows.length,
          tasksDone: taskRows.filter((row) => row.done).length,
        });
      } else {
        setSummary(emptySummary);
      }
      setFetching(false);
    }

    fetchLote();
    return () => { cancelled = true; };
  }, [authLoading, canUseDateFilter, dateRange.endDate, dateRange.startDate, farm, loteId]);

  if (authLoading || fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="space-y-6">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-gray-400">Lote não encontrado.</p>
        </div>
      </div>
    );
  }

  const dias = daysSinceArrival(lote.arrival_date);

  const topCards = [
    {
      label: "Produção",
      href: `/dashboard/flocks/detalhes/${loteId}/producao${originSuffix}`,
      icon: Egg,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      value: summary.productionRecords > 0 ? `${summary.totalEggs.toLocaleString("pt-BR")} ovos` : "Sem registros",
      sub: summary.productionRecords > 0 ? `${summary.productionRecords} registros · Postura média ${summary.averageLayingRate.toFixed(1)}%` : "Registre a produção diária de ovos",
      progress: Math.min(summary.averageLayingRate, 100),
      progressColor: "bg-amber-500",
    },
    {
      label: "Saúde",
      href: `/dashboard/flocks/detalhes/${loteId}/saude${originSuffix}`,
      icon: HeartPulse,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      value: summary.healthRecords > 0 ? `${summary.healthRecords} registros` : "Sem registros",
      sub: summary.pendingHealthRecords > 0 ? `${summary.pendingHealthRecords} pendentes/em andamento` : "Registre procedimentos sanitários",
      progress: summary.healthRecords > 0 ? Math.min((summary.healthRecords / Math.max(summary.healthRecords + summary.pendingHealthRecords, 1)) * 100, 100) : 0,
      progressColor: "bg-emerald-500",
    },
    {
      label: "Mortalidade",
      href: `/dashboard/flocks/detalhes/${loteId}/mortalidade${originSuffix}`,
      icon: Skull,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      value: summary.mortalityDeaths > 0 ? `${summary.mortalityDeaths} aves` : "0 aves",
      sub: summary.mortalityDeaths > 0 ? `Taxa média ${summary.averageMortalityRate.toFixed(2)}%` : "Nenhuma ocorrência registrada",
      progress: summary.mortalityDeaths > 0 ? Math.min(summary.averageMortalityRate * 20, 100) : 0,
      progressColor: summary.mortalityDeaths > 0 ? "bg-red-500" : "bg-emerald-500",
    },
    {
      label: "Histórico Sanitário",
      href: `/dashboard/flocks/detalhes/${loteId}/historico-sanitario${originSuffix}`,
      icon: ShieldCheck,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-600",
      value: summary.sanitaryRecords > 0 ? `${summary.sanitaryRecords} eventos` : "Sem eventos",
      sub: "Vacinas e procedimentos",
      progress: summary.healthRecords > 0 ? Math.min((summary.sanitaryRecords / summary.healthRecords) * 100, 100) : 0,
      progressColor: "bg-teal-500",
    },
  ];

  const bottomCards = [
    {
      label: "Consumo de Água",
      href: `/dashboard/flocks/detalhes/${loteId}/agua${originSuffix}`,
      icon: Droplets,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      value: summary.waterLiters > 0 ? `${summary.waterLiters.toLocaleString("pt-BR")} L` : "Sem registros",
      sub: "Consumo acumulado de água",
      progress: summary.waterLiters > 0 ? 100 : 0,
      progressColor: "bg-blue-500",
    },
    {
      label: "Consumo de Ração",
      href: `/dashboard/flocks/detalhes/${loteId}/racao${originSuffix}`,
      icon: Wheat,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      value: summary.feedKg > 0 ? `${summary.feedKg.toLocaleString("pt-BR")} kg` : "Sem registros",
      sub: summary.feedCost > 0 ? `Custo: R$ ${summary.feedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Registre o consumo de ração",
      progress: summary.feedKg > 0 ? 100 : 0,
      progressColor: "bg-orange-500",
    },
    {
      label: "Operacional",
      href: `/dashboard/flocks/detalhes/${loteId}/operacional${originSuffix}`,
      icon: Users,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      value: summary.tasksTotal > 0 ? `${summary.tasksDone}/${summary.tasksTotal}` : "Sem tarefas",
      sub: "Tarefas concluídas",
      progress: summary.tasksTotal > 0 ? (summary.tasksDone / summary.tasksTotal) * 100 : 0,
      progressColor: "bg-violet-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
            <Layers className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Detalhes do Lote — {lote.code}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{lote.breed} · {lote.production_system || "—"} · {stageLabel[getProductionStage(calculateCurrentAge(lote.arrival_date, lote.arrival_age_weeks))] ?? lote.status}</p>
          </div>
          </div>
          <PlanAwareCalendarFilter />
        </div>
      </div>

      {/* Detail Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações do Lote */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Layers className="w-4 h-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Informações do Lote</h3>
          </div>
          <div className="p-6 space-y-0">
            {[
              { icon: Tag, label: "Código", value: lote.code },
              { icon: Bird, label: "Raça", value: lote.breed },
              { icon: Dna, label: "Linhagem", value: lote.lineage ?? "—" },
              { icon: Bird, label: "Quantidade de Aves", value: lote.bird_count.toLocaleString("pt-BR") },
              { icon: Clock, label: "Idade", value: `${calculateCurrentAge(lote.arrival_date, lote.arrival_age_weeks)} semanas` },
              { icon: Weight, label: "Peso Médio", value: lote.avg_weight_kg ? `${lote.avg_weight_kg.toLocaleString("pt-BR")} kg` : "—" },
              { icon: Building2, label: "Galpão", value: lote.barn_name ?? "—" },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <div className="flex items-center justify-between py-3.5 group">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors" />
                    <span className="text-sm text-gray-500">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {item.value}
                  </span>
                </div>
                {i < arr.length - 1 && <div className="border-t border-gray-50" />}
              </div>
            ))}
          </div>
        </div>

        {/* Fornecedor e Origem */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Truck className="w-4 h-4 text-violet-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Fornecedor e Origem</h3>
          </div>
          <div className="p-6">
            {lote.supplier ? (
              <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-50/50 border border-gray-100 p-5 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Truck className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{lote.supplier}</p>
                    {lote.supplier_contact && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500">{formatPhone(lote.supplier_contact)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 mb-6 text-center">
                <p className="text-sm text-gray-400">Nenhum fornecedor informado</p>
              </div>
            )}
            <div className="space-y-0">
              {[
                { icon: MapPin, label: "Origem", value: lote.origin ?? "—" },
                { icon: Calendar, label: "Data de Chegada", value: formatDate(lote.arrival_date) },
                { icon: Clock, label: "Dias na Granja", value: `${dias} dias` },
              ].map((item, i, arr) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between py-3.5 group">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors" />
                      <span className="text-sm text-gray-500">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                  </div>
                  {i < arr.length - 1 && <div className="border-t border-gray-50" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards — Day 0 */}
      {/* KPI Cards — Top row: 4 cols, Bottom row: 3 cols */}
      {/* Top row: 4 equal cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topCards.map((card) => {
          if (plan === "essencial") {
            return (
              <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.iconBg)}>
                    <card.icon className={cn("w-[18px] h-[18px]", card.iconColor)} />
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">{card.label}</span>
                </div>
                <LockedOverlay message="Desbloqueie as informações detalhadas do seu lote" targetPlan="pro">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight mb-1">{card.value}</p>
                    <p className="text-xs text-gray-400">{card.sub}</p>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", card.progressColor)} style={{ width: `${Math.min(card.progress, 100)}%` }} />
                    </div>
                  </div>
                </LockedOverlay>
              </div>
            );
          }
          return (
          <Link
            key={card.label}
            href={card.href}
            className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-100/60 hover:border-gray-200 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.iconBg)}>
                  <card.icon className={cn("w-[18px] h-[18px]", card.iconColor)} />
                </div>
                <span className="text-[13px] font-bold text-gray-900">{card.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight mb-1">{card.value}</p>
            <p className="text-xs text-gray-400">{card.sub}</p>
            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700", card.progressColor)} style={{ width: `${Math.min(card.progress, 100)}%` }} />
            </div>
          </Link>
          );
        })}
      </div>

      {/* Bottom row: 3/8 + 3/8 + 2/8 */}
      <div className="grid grid-cols-8 gap-4">
        {bottomCards.map((card, i) => {
          if (plan === "essencial") {
            return (
              <div key={card.label} className={cn(
                "bg-white rounded-2xl border border-gray-100 p-5",
                i < 2 ? "col-span-8 sm:col-span-3" : "col-span-8 sm:col-span-2"
              )}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.iconBg)}>
                    <card.icon className={cn("w-[18px] h-[18px]", card.iconColor)} />
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">{card.label}</span>
                </div>
                <LockedOverlay message="Desbloqueie as informações detalhadas do seu lote" targetPlan="pro">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight mb-1">{card.value}</p>
                    <p className="text-xs text-gray-400">{card.sub}</p>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", card.progressColor)} style={{ width: `${Math.min(card.progress, 100)}%` }} />
                    </div>
                  </div>
                </LockedOverlay>
              </div>
            );
          }
          return (
          <Link
            key={card.label}
            href={card.href}
            className={cn(
              "group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-100/60 hover:border-gray-200 transition-all duration-300 cursor-pointer",
              i < 2 ? "col-span-8 sm:col-span-3" : "col-span-8 sm:col-span-2"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.iconBg)}>
                  <card.icon className={cn("w-[18px] h-[18px]", card.iconColor)} />
                </div>
                <span className="text-[13px] font-bold text-gray-900">{card.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight mb-1">{card.value}</p>
            <p className="text-xs text-gray-400">{card.sub}</p>
            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700", card.progressColor)} style={{ width: `${Math.min(card.progress, 100)}%` }} />
            </div>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
