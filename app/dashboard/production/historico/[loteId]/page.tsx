"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Egg, TrendingUp, AlertTriangle, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
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
  Legend,
} from "recharts";

/* ── Mock Data per Lote ── */
const lotesData: Record<string, {
  codigo: string;
  raca: string;
  aves: number;
  sistema: string;
  idade: string;
  registros: { data: string; total: number; quebrados: number; sujos: number; descartados: number; taxa: string }[];
  producaoMensal: { mes: string; ovos: number; meta: number }[];
  qualidade: { mes: string; quebrados: number; sujos: number; descartados: number }[];
}> = {
  "1": {
    codigo: "L-2024-01",
    raca: "Hy-Line Brown",
    aves: 800,
    sistema: "Cage-Free",
    idade: "42 semanas",
    registros: [
      { data: "2024-03-17", total: 2450, quebrados: 12, sujos: 18, descartados: 5, taxa: "90.0%" },
      { data: "2024-03-16", total: 2520, quebrados: 10, sujos: 15, descartados: 4, taxa: "92.6%" },
      { data: "2024-03-15", total: 2700, quebrados: 15, sujos: 20, descartados: 7, taxa: "96.2%" },
      { data: "2024-03-14", total: 2580, quebrados: 8, sujos: 12, descartados: 3, taxa: "94.8%" },
      { data: "2024-03-13", total: 2650, quebrados: 11, sujos: 16, descartados: 6, taxa: "95.5%" },
      { data: "2024-03-12", total: 2490, quebrados: 14, sujos: 19, descartados: 8, taxa: "91.5%" },
      { data: "2024-03-11", total: 2610, quebrados: 9, sujos: 13, descartados: 4, taxa: "93.6%" },
    ],
    producaoMensal: [
      { mes: "Out", ovos: 72000, meta: 74000 },
      { mes: "Nov", ovos: 73500, meta: 74000 },
      { mes: "Dez", ovos: 71000, meta: 74000 },
      { mes: "Jan", ovos: 74200, meta: 74000 },
      { mes: "Fev", ovos: 73800, meta: 74000 },
      { mes: "Mar", ovos: 68500, meta: 74000 },
    ],
    qualidade: [
      { mes: "Out", quebrados: 280, sujos: 420, descartados: 150 },
      { mes: "Nov", quebrados: 310, sujos: 380, descartados: 130 },
      { mes: "Dez", quebrados: 350, sujos: 450, descartados: 180 },
      { mes: "Jan", quebrados: 260, sujos: 360, descartados: 120 },
      { mes: "Fev", quebrados: 290, sujos: 400, descartados: 140 },
      { mes: "Mar", quebrados: 320, sujos: 430, descartados: 160 },
    ],
  },
  "2": {
    codigo: "L-2024-02",
    raca: "Lohmann LSL",
    aves: 600,
    sistema: "Free Range",
    idade: "28 semanas",
    registros: [
      { data: "2024-03-16", total: 2620, quebrados: 8, sujos: 14, descartados: 3, taxa: "95.3%" },
      { data: "2024-03-15", total: 2580, quebrados: 10, sujos: 16, descartados: 5, taxa: "94.1%" },
      { data: "2024-03-14", total: 2550, quebrados: 7, sujos: 11, descartados: 2, taxa: "93.8%" },
      { data: "2024-03-13", total: 2600, quebrados: 9, sujos: 13, descartados: 4, taxa: "95.0%" },
      { data: "2024-03-12", total: 2480, quebrados: 12, sujos: 18, descartados: 6, taxa: "91.2%" },
    ],
    producaoMensal: [
      { mes: "Out", ovos: 54000, meta: 55000 },
      { mes: "Nov", ovos: 55200, meta: 55000 },
      { mes: "Dez", ovos: 53800, meta: 55000 },
      { mes: "Jan", ovos: 56000, meta: 55000 },
      { mes: "Fev", ovos: 55500, meta: 55000 },
      { mes: "Mar", ovos: 52000, meta: 55000 },
    ],
    qualidade: [
      { mes: "Out", quebrados: 200, sujos: 310, descartados: 100 },
      { mes: "Nov", quebrados: 220, sujos: 290, descartados: 90 },
      { mes: "Dez", quebrados: 250, sujos: 340, descartados: 120 },
      { mes: "Jan", quebrados: 190, sujos: 270, descartados: 80 },
      { mes: "Fev", quebrados: 210, sujos: 300, descartados: 95 },
      { mes: "Mar", quebrados: 230, sujos: 320, descartados: 110 },
    ],
  },
  "3": {
    codigo: "L-2024-03",
    raca: "ISA Brown",
    aves: 1000,
    sistema: "Gaiola",
    idade: "18 semanas",
    registros: [],
    producaoMensal: [],
    qualidade: [],
  },
  "4": {
    codigo: "L-2024-04",
    raca: "Novogen Brown",
    aves: 500,
    sistema: "Orgânico",
    idade: "60 semanas",
    registros: [
      { data: "2024-03-17", total: 1800, quebrados: 20, sujos: 25, descartados: 10, taxa: "78.0%" },
      { data: "2024-03-16", total: 1850, quebrados: 18, sujos: 22, descartados: 8, taxa: "80.2%" },
      { data: "2024-03-15", total: 1780, quebrados: 22, sujos: 28, descartados: 12, taxa: "77.4%" },
    ],
    producaoMensal: [
      { mes: "Out", ovos: 42000, meta: 46000 },
      { mes: "Nov", ovos: 40500, meta: 46000 },
      { mes: "Dez", ovos: 39000, meta: 46000 },
      { mes: "Jan", ovos: 38000, meta: 46000 },
      { mes: "Fev", ovos: 36500, meta: 46000 },
      { mes: "Mar", ovos: 35000, meta: 46000 },
    ],
    qualidade: [
      { mes: "Out", quebrados: 380, sujos: 500, descartados: 200 },
      { mes: "Nov", quebrados: 400, sujos: 520, descartados: 220 },
      { mes: "Dez", quebrados: 420, sujos: 550, descartados: 250 },
      { mes: "Jan", quebrados: 450, sujos: 580, descartados: 270 },
      { mes: "Fev", quebrados: 460, sujos: 600, descartados: 280 },
      { mes: "Mar", quebrados: 480, sujos: 620, descartados: 300 },
    ],
  },
};

export default function HistoricoLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const lote = lotesData[loteId];

  if (!lote) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/production" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Produção
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-gray-400">Lote não encontrado.</p>
        </div>
      </div>
    );
  }

  const avgTaxa = lote.registros.length > 0
    ? (lote.registros.reduce((s, r) => s + parseFloat(r.taxa), 0) / lote.registros.length).toFixed(1) + "%"
    : "—";
  const totalOvos = lote.registros.reduce((s, r) => s + r.total, 0);
  const totalQuebrados = lote.registros.reduce((s, r) => s + r.quebrados + r.sujos, 0);
  const melhorDia = lote.registros.length > 0
    ? Math.max(...lote.registros.map((r) => r.total)).toLocaleString("pt-BR")
    : "—";

  const chartData = [...lote.registros].reverse().map((r) => ({
    data: new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    ovos: r.total,
    taxa: parseFloat(r.taxa),
  }));

  const kpis = [
    { title: "Total Produzido", value: totalOvos.toLocaleString("pt-BR"), badge: String(lote.registros.length) + " dias", badgeDir: "neutral" as const, icon: Egg, iconBg: "bg-brand-50", iconColor: "text-brand-600" },
    { title: "Taxa Média", value: avgTaxa, badge: avgTaxa !== "—" && parseFloat(avgTaxa) >= 90 ? "Bom" : "Atenção", badgeDir: avgTaxa !== "—" && parseFloat(avgTaxa) >= 90 ? "up" as const : "down" as const, icon: TrendingUp, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { title: "Quebrados / Sujos", value: totalQuebrados.toLocaleString("pt-BR"), badge: totalOvos > 0 ? ((totalQuebrados / totalOvos) * 100).toFixed(1) + "%" : "—", badgeDir: "neutral" as const, icon: AlertTriangle, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
    { title: "Melhor Dia", value: melhorDia, badge: "pico", badgeDir: "up" as const, icon: Activity, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  ];

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/dashboard/production" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Produção
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Histórico de Produção — {lote.codigo}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {lote.raca} · {lote.aves.toLocaleString("pt-BR")} aves · {lote.sistema} · {lote.idade}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", kpi.iconBg)}>
                <kpi.icon className={cn("w-5 h-5", kpi.iconColor)} />
              </div>
              <span className={cn(
                "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-lg",
                kpi.badgeDir === "up" && "text-emerald-700 bg-emerald-50",
                kpi.badgeDir === "down" && "text-red-600 bg-red-50",
                kpi.badgeDir === "neutral" && "text-amber-700 bg-amber-50"
              )}>
                {kpi.badgeDir === "up" && <ArrowUpRight className="w-3 h-3" />}
                {kpi.badgeDir === "down" && <ArrowDownRight className="w-3 h-3" />}
                {kpi.badge}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">{kpi.title}</p>
          </div>
        ))}
      </div>

      {/* Production Trend Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Tendência de Produção</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2d7a4f" stopOpacity={0.25} />
                  <stop offset="60%" stopColor="#2d7a4f" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#2d7a4f" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                formatter={(value: number, name: string) => [name === "ovos" ? value.toLocaleString("pt-BR") : value + "%", name === "ovos" ? "Ovos" : "Taxa"]}
              />
              <Area type="monotone" dataKey="ovos" stroke="#2d7a4f" strokeWidth={2.5} fill="url(#colorHist)" dot={{ r: 5, fill: "#fff", stroke: "#2d7a4f", strokeWidth: 2.5 }} activeDot={{ r: 7, fill: "#2d7a4f", stroke: "#fff", strokeWidth: 3 }} name="ovos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Production vs Target */}
      {lote.producaoMensal.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Produção Mensal vs Meta</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={lote.producaoMensal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                formatter={(value: number) => [value.toLocaleString("pt-BR"), ""]}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Bar dataKey="ovos" name="Produzidos" fill="#2d7a4f" radius={[6, 6, 0, 0]} barSize={28} />
              <Bar dataKey="meta" name="Meta" fill="#e5e7eb" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quality Chart */}
      {lote.qualidade.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Qualidade Mensal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={lote.qualidade} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Bar dataKey="quebrados" name="Quebrados" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="sujos" name="Sujos" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="descartados" name="Descartados" fill="#6b7280" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Full History Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Todos os Registros</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Data</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Total</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Quebrados</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Sujos</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Descartados</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Taxa</th>
              </tr>
            </thead>
            <tbody>
              {lote.registros.map((r, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatDate(r.data)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.total.toLocaleString("pt-BR")}</td>
                  <td className="px-6 py-4 text-sm font-medium text-red-600">{r.quebrados}</td>
                  <td className="px-6 py-4 text-sm font-medium text-amber-600">{r.sujos}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.descartados}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-brand-600">{r.taxa}</span>
                  </td>
                </tr>
              ))}
              {lote.registros.length === 0 && (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">Nenhum registro encontrado para este lote.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
