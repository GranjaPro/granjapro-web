"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Egg, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { PlanAwareCalendarFilter, useDateFilter } from "@/components/date-filter";
import { usePlan } from "@/components/plan/plan-provider";
import { hasMinimumPlan } from "@/lib/plans";
import { createClient } from "@/lib/supabase/client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const lotesProducao: Record<string, {
  codigo: string;
  taxaPostura: number;
  mediaOvosDia: number;
  totalOvosSemana: number;
  totalOvosMes: number;
  quebrados: number;
  sujos: number;
  descartados: number;
  tendencia: "up" | "down" | "stable";
  diario: { dia: string; ovos: number }[];
  semanal: { semana: string; ovos: number; meta: number }[];
}> = {
  "1": {
    codigo: "L-2024-01", taxaPostura: 92, mediaOvosDia: 736, totalOvosSemana: 5152,
    totalOvosMes: 22080, quebrados: 1.2, sujos: 0.8, descartados: 0.3, tendencia: "up",
    diario: [
      { dia: "Seg", ovos: 728 }, { dia: "Ter", ovos: 741 }, { dia: "Qua", ovos: 735 },
      { dia: "Qui", ovos: 750 }, { dia: "Sex", ovos: 738 }, { dia: "Sáb", ovos: 730 }, { dia: "Dom", ovos: 730 },
    ],
    semanal: [
      { semana: "S1", ovos: 4980, meta: 5200 }, { semana: "S2", ovos: 5050, meta: 5200 },
      { semana: "S3", ovos: 5100, meta: 5200 }, { semana: "S4", ovos: 5152, meta: 5200 },
    ],
  },
  "2": {
    codigo: "L-2024-02", taxaPostura: 88, mediaOvosDia: 528, totalOvosSemana: 3696,
    totalOvosMes: 15840, quebrados: 1.8, sujos: 1.0, descartados: 0.5, tendencia: "up",
    diario: [
      { dia: "Seg", ovos: 520 }, { dia: "Ter", ovos: 530 }, { dia: "Qua", ovos: 525 },
      { dia: "Qui", ovos: 535 }, { dia: "Sex", ovos: 528 }, { dia: "Sáb", ovos: 530 }, { dia: "Dom", ovos: 528 },
    ],
    semanal: [
      { semana: "S1", ovos: 3500, meta: 3780 }, { semana: "S2", ovos: 3600, meta: 3780 },
      { semana: "S3", ovos: 3650, meta: 3780 }, { semana: "S4", ovos: 3696, meta: 3780 },
    ],
  },
  "3": {
    codigo: "L-2024-03", taxaPostura: 0, mediaOvosDia: 0, totalOvosSemana: 0,
    totalOvosMes: 0, quebrados: 0, sujos: 0, descartados: 0, tendencia: "stable",
    diario: [
      { dia: "Seg", ovos: 0 }, { dia: "Ter", ovos: 0 }, { dia: "Qua", ovos: 0 },
      { dia: "Qui", ovos: 0 }, { dia: "Sex", ovos: 0 }, { dia: "Sáb", ovos: 0 }, { dia: "Dom", ovos: 0 },
    ],
    semanal: [
      { semana: "S1", ovos: 0, meta: 0 }, { semana: "S2", ovos: 0, meta: 0 },
      { semana: "S3", ovos: 0, meta: 0 }, { semana: "S4", ovos: 0, meta: 0 },
    ],
  },
  "4": {
    codigo: "L-2024-04", taxaPostura: 78, mediaOvosDia: 390, totalOvosSemana: 2730,
    totalOvosMes: 11700, quebrados: 2.4, sujos: 1.5, descartados: 0.8, tendencia: "down",
    diario: [
      { dia: "Seg", ovos: 400 }, { dia: "Ter", ovos: 395 }, { dia: "Qua", ovos: 388 },
      { dia: "Qui", ovos: 385 }, { dia: "Sex", ovos: 390 }, { dia: "Sáb", ovos: 386 }, { dia: "Dom", ovos: 386 },
    ],
    semanal: [
      { semana: "S1", ovos: 2850, meta: 3000 }, { semana: "S2", ovos: 2800, meta: 3000 },
      { semana: "S3", ovos: 2760, meta: 3000 }, { semana: "S4", ovos: 2730, meta: 3000 },
    ],
  },
};

function LegacyProducaoLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const data = lotesProducao[loteId];

  if (!data) {
    return (
      <div className="space-y-6">
        <Link href={`/dashboard/flocks/detalhes/${loteId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-gray-400">Dados não encontrados.</p>
        </div>
      </div>
    );
  }

  const TrendBadge = () => {
    if (data.tendencia === "stable") return <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">Estável</span>;
    const isUp = data.tendencia === "up";
    return (
      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1",
        isUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      )}>
        {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {isUp ? "Em alta" : "Em queda"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/flocks/detalhes/${loteId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar para Detalhes
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <Egg className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Produção — {data.codigo}</h1>
              <p className="text-sm text-gray-400 mt-0.5">Indicadores detalhados de produção</p>
            </div>
          </div>
          <TrendBadge />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Taxa de Postura", value: `${data.taxaPostura}%`, color: "text-amber-600" },
          { label: "Média Ovos/Dia", value: data.mediaOvosDia.toLocaleString("pt-BR"), color: "text-gray-900" },
          { label: "Total Semana", value: data.totalOvosSemana.toLocaleString("pt-BR"), color: "text-gray-900" },
          { label: "Total Mês", value: data.totalOvosMes.toLocaleString("pt-BR"), color: "text-gray-900" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{kpi.label}</p>
            <p className={cn("text-2xl font-bold tracking-tight mt-2", kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Produção Diária</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.diario}>
                <defs>
                  <linearGradient id="colorOvos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                <Area type="monotone" dataKey="ovos" stroke="#f59e0b" strokeWidth={2.5} fill="url(#colorOvos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Semanal vs Meta</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.semanal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="semana" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                <Bar dataKey="ovos" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Produzido" />
                <Bar dataKey="meta" fill="#e2e8f0" radius={[6, 6, 0, 0]} name="Meta" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quality */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-5">Qualidade dos Ovos</h3>
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: "Quebrados", value: `${data.quebrados}%`, color: data.quebrados <= 1.5 ? "text-emerald-600" : "text-red-500", bar: data.quebrados * 10, barColor: data.quebrados <= 1.5 ? "bg-emerald-500" : "bg-red-500" },
            { label: "Sujos", value: `${data.sujos}%`, color: data.sujos <= 1.0 ? "text-emerald-600" : "text-amber-600", bar: data.sujos * 10, barColor: data.sujos <= 1.0 ? "bg-emerald-500" : "bg-amber-500" },
            { label: "Descartados", value: `${data.descartados}%`, color: data.descartados <= 0.5 ? "text-emerald-600" : "text-red-500", bar: data.descartados * 10, barColor: data.descartados <= 0.5 ? "bg-emerald-500" : "bg-red-500" },
          ].map((q) => (
            <div key={q.label} className="text-center">
              <p className={cn("text-3xl font-bold tracking-tight", q.color)}>{q.value}</p>
              <p className="text-xs text-gray-400 mt-1 mb-3">{q.label}</p>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", q.barColor)} style={{ width: `${Math.min(q.bar, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Lote {
  id: string;
  code: string;
}

interface ProductionRecord {
  id: string;
  date: string;
  eggs_produced: number;
  broken_eggs: number;
  dirty_eggs: number;
  discarded_eggs: number;
  laying_rate: number;
}

export default function ProducaoLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const { farm, loading: authLoading } = useAuth();
  const { plan } = usePlan();
  const { dateRange } = useDateFilter();
  const canUseDateFilter = hasMinimumPlan(plan, "pro");
  const [lote, setLote] = useState<Lote | null>(null);
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([]);
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

      const productionQuery = supabase
        .from("egg_production")
        .select("id, date, eggs_produced, broken_eggs, dirty_eggs, discarded_eggs, laying_rate")
        .eq("farm_id", currentFarm.id)
        .eq("flock_id", loteId);

      if (canUseDateFilter) {
        productionQuery.gte("date", dateRange.startDate).lte("date", dateRange.endDate);
      }

      const [loteRes, productionRes] = await Promise.all([
        supabase
          .from("flocks")
          .select("id, code")
          .eq("id", loteId)
          .eq("farm_id", currentFarm.id)
          .single(),
        productionQuery.order("date", { ascending: true }),
      ]);

      if (cancelled) return;

      if (loteRes.data) {
        setLote({
          id: loteRes.data.id,
          code: loteRes.data.code,
        });
      } else {
        setLote(null);
      }

      setProductionRecords((productionRes.data ?? []) as ProductionRecord[]);
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
        <Link href={`/dashboard/flocks/detalhes/${loteId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Detalhes
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
  const avgDailyEggs = productionRecords.length > 0 ? Math.round(totalEggs / productionRecords.length) : 0;
  const latestRate = productionRecords.length > 0 ? Number(productionRecords[productionRecords.length - 1].laying_rate ?? 0) : 0;
  const avgRate = productionRecords.length > 0
    ? productionRecords.reduce((sum, record) => sum + Number(record.laying_rate ?? 0), 0) / productionRecords.length
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

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/flocks/detalhes/${loteId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Detalhes
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <Egg className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Produção - {lote.code}</h1>
              <p className="text-sm text-gray-400 mt-0.5">Indicadores detalhados de produção</p>
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
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">{latestRate.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</p>
              <p className="mt-1 text-xs text-gray-500">Média do período: {avgRate.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</p>
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
        </div>
      </div>
    </div>
  );
}
