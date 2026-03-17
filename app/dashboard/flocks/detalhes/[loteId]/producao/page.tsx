"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Egg, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

export default function ProducaoLotePage() {
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
