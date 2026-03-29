"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Egg, TrendingUp, AlertTriangle, Activity, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
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
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";

interface LoteDetails {
  id: string;
  codigo: string;
  raca: string;
  aves: number;
  idade: string;
  sistema: string;
}

interface Registro {
  id: string;
  data: string;
  total: number;
  quebrados: number;
  sujos: number;
  descartados: number;
  taxa: string;
}

export default function HistoricoLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const { farm, loading: authLoading } = useAuth();

  const [lote, setLote] = useState<LoteDetails | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!farm || !loteId) return;
    setLoading(true);
    const supabase = createClient();

    try {
      // Fetch lote details
      const { data: flockData, error: flockErr } = await supabase
        .from("flocks")
        .select("*, barns(production_system)")
        .eq("id", loteId)
        .eq("farm_id", farm.id)
        .single();

      if (flockErr) throw flockErr;

      if (flockData) {
        // Calculate age in weeks based on arrival_date and arrival_age_weeks
        let currentAge = `${flockData.arrival_age_weeks || 0} semanas`;
        if (flockData.arrival_date) {
          const arrDate = new Date(flockData.arrival_date);
          const now = new Date();
          const diffMs = now.getTime() - arrDate.getTime();
          const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
          const totalWeeks = (flockData.arrival_age_weeks || 0) + diffWeeks;
          currentAge = `${totalWeeks} semanas`;
        }

        let sys = "—";
        if (flockData.barns && !Array.isArray(flockData.barns)) {
           sys = (flockData.barns as any).production_system || "—";
        } else if (flockData.barns && Array.isArray(flockData.barns) && flockData.barns.length > 0) {
           sys = (flockData.barns[0] as any).production_system || "—";
        }

        setLote({
          id: flockData.id,
          codigo: flockData.code,
          raca: flockData.breed,
          aves: flockData.bird_count,
          idade: currentAge,
          sistema: sys,
        });
      }

      // Fetch productions
      const { data: prodData, error: prodErr } = await supabase
        .from("egg_production")
        .select("*")
        .eq("flock_id", loteId)
        .order("date", { ascending: false });

      if (prodErr) throw prodErr;

      if (prodData) {
        setRegistros(prodData.map((r: any) => ({
          id: r.id,
          data: r.date,
          total: r.eggs_produced || 0,
          quebrados: r.broken_eggs || 0,
          sujos: r.dirty_eggs || 0,
          descartados: r.discarded_eggs || 0,
          taxa: r.laying_rate != null ? `${Number(r.laying_rate).toFixed(1)}%` : "—",
        })));
      }

    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  }, [farm, loteId]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  // Derived metrics
  const avgTaxaNum = useMemo(() => {
    const valid = registros.filter(r => r.taxa !== "—");
    if (valid.length === 0) return 0;
    return valid.reduce((acc, r) => acc + parseFloat(r.taxa), 0) / valid.length;
  }, [registros]);
  const avgTaxa = avgTaxaNum > 0 ? avgTaxaNum.toFixed(1) + "%" : "—";

  const totalOvos = registros.reduce((s, r) => s + r.total, 0);
  const totalQuebrados = registros.reduce((s, r) => s + r.quebrados + r.sujos, 0);
  const melhorDia = registros.length > 0
    ? Math.max(...registros.map((r) => r.total)).toLocaleString("pt-BR")
    : "—";

  const chartData = [...registros].reverse().map((r) => ({
    data: new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    ovos: r.total,
    taxa: parseFloat(r.taxa) || 0,
  }));

  // Mensal Data
  const producaoMensal = useMemo(() => {
    const map = new Map<string, { mes: string; ovos: number; meta: number }>();
    const expectedDaily = (lote?.aves || 0) * 0.9;

    // Iterate oldest to newest so months are in order
    const sorted = [...registros].sort((a, b) => a.data.localeCompare(b.data));
    for (const r of sorted) {
      const d = new Date(r.data + "T00:00:00");
      const monthLabel = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const current = map.get(monthLabel) || { mes: monthLabel, ovos: 0, meta: 0 };
      current.ovos += r.total;
      current.meta += expectedDaily;
      map.set(monthLabel, current);
    }
    return Array.from(map.values());
  }, [registros, lote]);

  const qualidadeMensal = useMemo(() => {
    const map = new Map<string, { mes: string; quebrados: number; sujos: number; descartados: number }>();
    const sorted = [...registros].sort((a, b) => a.data.localeCompare(b.data));
    for (const r of sorted) {
      const d = new Date(r.data + "T00:00:00");
      const monthLabel = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const current = map.get(monthLabel) || { mes: monthLabel, quebrados: 0, sujos: 0, descartados: 0 };
      current.quebrados += r.quebrados;
      current.sujos += r.sujos;
      current.descartados += r.descartados;
      map.set(monthLabel, current);
    }
    return Array.from(map.values());
  }, [registros]);

  const kpis = [
    { title: "Total Produzido", value: totalOvos.toLocaleString("pt-BR"), badge: String(registros.length) + " dias", badgeDir: "neutral" as const, icon: Egg, iconBg: "bg-brand-50", iconColor: "text-brand-600" },
    { title: "Taxa Média", value: avgTaxa, badge: avgTaxa !== "—" && avgTaxaNum >= 90 ? "Bom" : "Atenção", badgeDir: avgTaxa !== "—" && avgTaxaNum >= 90 ? "up" as const : "down" as const, icon: TrendingUp, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
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

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/production" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Produção
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/production" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Produção
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-gray-400">Lote não encontrado.</p>
        </div>
      </div>
    );
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
                formatter={((value: any, name: any) => [String(name) === "ovos" ? Number(value).toLocaleString("pt-BR") : Number(value) + "%", String(name) === "ovos" ? "Ovos" : "Taxa"]) as any}
              />
              <Area type="monotone" dataKey="ovos" stroke="#2d7a4f" strokeWidth={2.5} fill="url(#colorHist)" dot={{ r: 5, fill: "#fff", stroke: "#2d7a4f", strokeWidth: 2.5 }} activeDot={{ r: 7, fill: "#2d7a4f", stroke: "#fff", strokeWidth: 3 }} name="ovos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Production vs Target */}
      {producaoMensal.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Produção Mensal vs Meta</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={producaoMensal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                formatter={(value: unknown) => [Number(value).toLocaleString("pt-BR"), ""]}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <Bar dataKey="ovos" name="Produzidos" fill="#2d7a4f" radius={[6, 6, 0, 0]} barSize={28} />
              <Bar dataKey="meta" name="Meta" fill="#e5e7eb" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quality Chart */}
      {qualidadeMensal.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Qualidade Mensal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={qualidadeMensal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
        <div className="overflow-x-auto max-h-[500px]" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
          <table className="w-full">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
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
              {registros.map((r, i) => (
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
              {registros.length === 0 && (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">Nenhum registro encontrado para este lote.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
