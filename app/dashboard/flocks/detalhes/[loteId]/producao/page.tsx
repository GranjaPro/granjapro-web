"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Egg, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { PlanAwareCalendarFilter, useDateFilter } from "@/components/date-filter";
import { usePlan } from "@/components/plan/plan-provider";
import { hasMinimumPlan } from "@/lib/plans";
import { createClient } from "@/lib/supabase/client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  calculateRecordedFlockProductionMetrics,
  type FlockMortality,
} from "@/lib/domain/egg-production-metrics";

interface Lote {
  id: string;
  code: string;
  breed: string;
  birdCount: number;
  arrivalAgeWeeks: number;
  arrivalDate: string;
}

interface ProductionRecord {
  id: string;
  date: string;
  eggs_produced: number;
  broken_eggs: number;
  dirty_eggs: number;
  discarded_eggs: number;
}

function formatRecordDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ProducaoLotePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const loteId = params.loteId as string;
  const cameFromProduction = searchParams.get("origem") === "producao";
  const backHref = cameFromProduction ? "/dashboard/production" : `/dashboard/flocks/detalhes/${loteId}`;
  const backLabel = cameFromProduction ? "Voltar para Produção" : "Voltar para Detalhes";
  const { farm, loading: authLoading } = useAuth();
  const { plan } = usePlan();
  const { dateRange } = useDateFilter();
  const canUseDateFilter = hasMinimumPlan(plan, "pro");
  const [lote, setLote] = useState<Lote | null>(null);
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([]);
  const [mortalities, setMortalities] = useState<FlockMortality[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (authLoading) return;
    if (!farm) {
      setInitialLoading(false);
      return;
    }

    let cancelled = false;
    const currentFarm = farm;
    const supabase = createClient();

    async function fetchData() {
      if (firstLoadRef.current) {
        setInitialLoading(true);
      }
      const today = new Date().toISOString().slice(0, 10);
      const effectiveEndDate = dateRange.endDate > today ? today : dateRange.endDate;
      const mortalityEndDate = canUseDateFilter ? effectiveEndDate : today;

      const productionQuery = supabase
        .from("egg_production")
        .select("id, date, eggs_produced, broken_eggs, dirty_eggs, discarded_eggs")
        .eq("farm_id", currentFarm.id)
        .eq("flock_id", loteId);

      if (canUseDateFilter) {
        productionQuery.gte("date", dateRange.startDate).lte("date", effectiveEndDate);
      }

      const [loteRes, productionRes, mortalityRes] = await Promise.all([
        supabase
          .from("flocks")
          .select("id, code, breed, bird_count, arrival_age_weeks, arrival_date")
          .eq("id", loteId)
          .eq("farm_id", currentFarm.id)
          .single(),
        productionQuery.order("date", { ascending: true }),
        supabase
          .from("mortality")
          .select("flock_id, date, dead_birds")
          .eq("farm_id", currentFarm.id)
          .eq("flock_id", loteId)
          .lte("date", mortalityEndDate),
      ]);

      if (cancelled) return;

      if (loteRes.data) {
        setLote({
          id: loteRes.data.id,
          code: loteRes.data.code,
          breed: loteRes.data.breed,
          birdCount: loteRes.data.bird_count,
          arrivalAgeWeeks: loteRes.data.arrival_age_weeks,
          arrivalDate: loteRes.data.arrival_date,
        });
      } else {
        setLote(null);
      }

      setProductionRecords((productionRes.data ?? []) as ProductionRecord[]);
      setMortalities((mortalityRes.data ?? []).map((mortality) => ({
        flockId: mortality.flock_id,
        date: mortality.date,
        deadBirds: mortality.dead_birds,
      })));
      setInitialLoading(false);
      firstLoadRef.current = false;
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [authLoading, canUseDateFilter, dateRange.endDate, dateRange.startDate, farm, loteId]);

  if (authLoading || initialLoading) {
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

  const totalEggs = productionRecords.reduce((sum, record) => sum + (record.eggs_produced ?? 0), 0);
  const brokenEggs = productionRecords.reduce((sum, record) => sum + (record.broken_eggs ?? 0), 0);
  const dirtyEggs = productionRecords.reduce((sum, record) => sum + (record.dirty_eggs ?? 0), 0);
  const discardedEggs = productionRecords.reduce((sum, record) => sum + (record.discarded_eggs ?? 0), 0);
  const goodEggs = Math.max(totalEggs - brokenEggs - dirtyEggs - discardedEggs, 0);
  const today = new Date().toISOString().slice(0, 10);
  const lastRecordDate = productionRecords.at(-1)?.date;
  const filteredEndDate = dateRange.endDate > today ? today : dateRange.endDate;
  const analysisEndDate = lastRecordDate ?? (dateRange.startDate <= filteredEndDate ? filteredEndDate : today);
  const analysisStartDate = productionRecords[0]?.date ?? analysisEndDate;
  const flockMetric = {
    id: lote.id,
    birdCount: lote.birdCount,
    arrivalAgeWeeks: lote.arrivalAgeWeeks,
    arrivalDate: lote.arrivalDate,
  };
  const productionMetrics = calculateRecordedFlockProductionMetrics({
    flock: flockMetric,
    mortalities,
    productionRecords: productionRecords.map((record) => ({
      flockId: lote.id,
      date: record.date,
      eggsProduced: record.eggs_produced,
    })),
    startDate: analysisStartDate,
    endDate: analysisEndDate,
  });
  const avgDailyEggs = productionMetrics.recordedDays > 0
    ? Math.round(totalEggs / productionMetrics.recordedDays)
    : 0;

  const historyData = productionRecords.map((record) => ({
    date: new Date(record.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    ovos: record.eggs_produced ?? 0,
  }));

  const qualityData = [
    { name: "Bons", ovos: goodEggs, fill: "#10b981" },
    { name: "Quebrados", ovos: brokenEggs, fill: "#ef4444" },
    { name: "Sujos", ovos: dirtyEggs, fill: "#f59e0b" },
    { name: "Descartados", ovos: discardedEggs, fill: "#94a3b8" },
  ];
  const historyRows = [...productionRecords].reverse().map((record) => {
    const recordMetrics = calculateRecordedFlockProductionMetrics({
      flock: flockMetric,
      mortalities,
      productionRecords: [{ flockId: lote.id, date: record.date, eggsProduced: record.eggs_produced }],
      startDate: record.date,
      endDate: record.date,
    });
    return {
      ...record,
      layingRate: recordMetrics.eligibleBirdDays > 0 ? recordMetrics.layingRate : undefined,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <Egg className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Produção - {lote.code}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {lote.breed} · {productionMetrics.liveBirds.toLocaleString("pt-BR")} aves vivas
              </p>
            </div>
          </div>
          <PlanAwareCalendarFilter />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Produção de ovos</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{totalEggs.toLocaleString("pt-BR")}</p>
              <p className="mt-1 text-xs text-gray-500">Média diária de {avgDailyEggs.toLocaleString("pt-BR")} ovos</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Taxa de postura</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">{productionMetrics.layingRate.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</p>
              <p className="mt-1 text-xs text-gray-500">Meta da fase: {productionMetrics.layingRateGoal.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Qualidade</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
                {totalEggs > 0
                  ? ((goodEggs / totalEggs) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                  : "0,0"}%
              </p>
              <p className="mt-1 text-xs text-gray-500">{goodEggs.toLocaleString("pt-BR")} ovos bons no período</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-100 p-5">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-gray-900">Histórico de produção de ovos</h4>
                <p className="text-xs text-gray-400 mt-0.5">Evolução por lançamento</p>
              </div>
              <div className="h-72">
                {historyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="flockProductionFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                      <Area type="monotone" dataKey="ovos" stroke="#f59e0b" strokeWidth={2.5} fill="url(#flockProductionFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    Nenhum registro de produção para este lote.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 p-5">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-gray-900">Qualidade dos ovos</h4>
                <p className="text-xs text-gray-400 mt-0.5">Bons, quebrados, sujos e descartados</p>
              </div>
              <div className="h-72">
                {historyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={qualityData} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                        formatter={(value: unknown) => [Number(value).toLocaleString("pt-BR"), "ovos"]}
                      />
                      <Bar dataKey="ovos" name="ovos" radius={[8, 8, 0, 0]}>
                        {qualityData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    Nenhum registro de qualidade para este lote.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h4 className="text-sm font-bold text-gray-900">Registros de produção</h4>
              <p className="text-xs text-gray-400 mt-0.5">
                {historyRows.length} {historyRows.length === 1 ? "lançamento" : "lançamentos"} no período
              </p>
            </div>
            <div className="max-h-[500px] overflow-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-3">Data</th>
                    <th className="px-5 py-3 text-right">Total</th>
                    <th className="px-5 py-3 text-right">Quebrados</th>
                    <th className="px-5 py-3 text-right">Sujos</th>
                    <th className="px-5 py-3 text-right">Descartados</th>
                    <th className="px-5 py-3 text-right">Taxa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyRows.length > 0 ? historyRows.map((record) => (
                    <tr key={record.id} className="text-sm text-gray-600 hover:bg-gray-50/60">
                      <td className="px-5 py-3 font-medium text-gray-900">{formatRecordDate(record.date)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{record.eggs_produced.toLocaleString("pt-BR")}</td>
                      <td className="px-5 py-3 text-right">{record.broken_eggs.toLocaleString("pt-BR")}</td>
                      <td className="px-5 py-3 text-right">{record.dirty_eggs.toLocaleString("pt-BR")}</td>
                      <td className="px-5 py-3 text-right">{record.discarded_eggs.toLocaleString("pt-BR")}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">
                        {record.layingRate === undefined
                          ? "—"
                          : `${record.layingRate.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                        Nenhum registro de produção para este lote.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
