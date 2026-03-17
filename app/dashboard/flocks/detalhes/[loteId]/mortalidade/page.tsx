"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Skull, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const lotesMortalidade: Record<string, {
  codigo: string;
  taxaMensal: number;
  totalMortes: number;
  mortesSemana: number;
  mortesMes: number;
  causaPrincipal: string;
  tendencia: "up" | "down" | "stable";
  semanal: { semana: string; mortes: number }[];
  causas: { causa: string; quantidade: number; porcentagem: number }[];
  mensal: { mes: string; mortes: number; taxa: number }[];
}> = {
  "1": {
    codigo: "L-2024-01", taxaMensal: 0.3, totalMortes: 12, mortesSemana: 1,
    mortesMes: 2, causaPrincipal: "Natural", tendencia: "stable",
    semanal: [
      { semana: "S1", mortes: 1 }, { semana: "S2", mortes: 0 }, { semana: "S3", mortes: 1 },
      { semana: "S4", mortes: 0 }, { semana: "S5", mortes: 1 }, { semana: "S6", mortes: 0 },
    ],
    causas: [
      { causa: "Natural", quantidade: 8, porcentagem: 67 },
      { causa: "Predadores", quantidade: 2, porcentagem: 17 },
      { causa: "Doença", quantidade: 2, porcentagem: 16 },
    ],
    mensal: [
      { mes: "Jan", mortes: 3, taxa: 0.38 }, { mes: "Fev", mortes: 2, taxa: 0.25 },
      { mes: "Mar", mortes: 2, taxa: 0.25 }, { mes: "Abr", mortes: 2, taxa: 0.25 },
    ],
  },
  "2": {
    codigo: "L-2024-02", taxaMensal: 0.5, totalMortes: 9, mortesSemana: 1,
    mortesMes: 3, causaPrincipal: "Respiratório", tendencia: "up",
    semanal: [
      { semana: "S1", mortes: 0 }, { semana: "S2", mortes: 1 }, { semana: "S3", mortes: 1 },
      { semana: "S4", mortes: 0 }, { semana: "S5", mortes: 1 }, { semana: "S6", mortes: 1 },
    ],
    causas: [
      { causa: "Respiratório", quantidade: 5, porcentagem: 56 },
      { causa: "Natural", quantidade: 3, porcentagem: 33 },
      { causa: "Desconhecido", quantidade: 1, porcentagem: 11 },
    ],
    mensal: [
      { mes: "Jan", mortes: 1, taxa: 0.17 }, { mes: "Fev", mortes: 2, taxa: 0.33 },
      { mes: "Mar", mortes: 3, taxa: 0.50 }, { mes: "Abr", mortes: 3, taxa: 0.50 },
    ],
  },
  "3": {
    codigo: "L-2024-03", taxaMensal: 0.2, totalMortes: 4, mortesSemana: 0,
    mortesMes: 2, causaPrincipal: "Natural", tendencia: "down",
    semanal: [
      { semana: "S1", mortes: 1 }, { semana: "S2", mortes: 1 }, { semana: "S3", mortes: 0 },
      { semana: "S4", mortes: 0 }, { semana: "S5", mortes: 0 }, { semana: "S6", mortes: 0 },
    ],
    causas: [
      { causa: "Natural", quantidade: 3, porcentagem: 75 },
      { causa: "Estresse", quantidade: 1, porcentagem: 25 },
    ],
    mensal: [
      { mes: "Jan", mortes: 2, taxa: 0.20 }, { mes: "Fev", mortes: 1, taxa: 0.10 },
      { mes: "Mar", mortes: 1, taxa: 0.10 }, { mes: "Abr", mortes: 0, taxa: 0.00 },
    ],
  },
  "4": {
    codigo: "L-2024-04", taxaMensal: 0.8, totalMortes: 24, mortesSemana: 2,
    mortesMes: 4, causaPrincipal: "Idade avançada", tendencia: "up",
    semanal: [
      { semana: "S1", mortes: 1 }, { semana: "S2", mortes: 1 }, { semana: "S3", mortes: 2 },
      { semana: "S4", mortes: 1 }, { semana: "S5", mortes: 2 }, { semana: "S6", mortes: 2 },
    ],
    causas: [
      { causa: "Idade avançada", quantidade: 14, porcentagem: 58 },
      { causa: "Natural", quantidade: 6, porcentagem: 25 },
      { causa: "Doença", quantidade: 4, porcentagem: 17 },
    ],
    mensal: [
      { mes: "Jan", mortes: 5, taxa: 1.0 }, { mes: "Fev", mortes: 4, taxa: 0.8 },
      { mes: "Mar", mortes: 4, taxa: 0.8 }, { mes: "Abr", mortes: 4, taxa: 0.8 },
    ],
  },
};

export default function MortalidadeLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const data = lotesMortalidade[loteId];

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
        isUp ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
      )}>
        {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {isUp ? "Aumentando" : "Diminuindo"}
      </span>
    );
  };

  const maxCausa = Math.max(...data.causas.map((c) => c.porcentagem));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/flocks/detalhes/${loteId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar para Detalhes
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <Skull className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mortalidade — {data.codigo}</h1>
              <p className="text-sm text-gray-400 mt-0.5">Análise detalhada de mortalidade</p>
            </div>
          </div>
          <TrendBadge />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Taxa Mensal", value: `${data.taxaMensal.toFixed(1).replace(".", ",")}%`, color: data.taxaMensal <= 0.5 ? "text-emerald-600" : data.taxaMensal <= 1.0 ? "text-amber-600" : "text-red-500" },
          { label: "Total de Mortes", value: String(data.totalMortes), color: "text-gray-900" },
          { label: "Esta Semana", value: String(data.mortesSemana), color: data.mortesSemana === 0 ? "text-emerald-600" : "text-gray-900" },
          { label: "Causa Principal", value: data.causaPrincipal, color: "text-gray-900", small: true },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{kpi.label}</p>
            <p className={cn("font-bold tracking-tight mt-2", kpi.color, kpi.small ? "text-lg" : "text-2xl")}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Mortes por Semana</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.semanal}>
                <defs>
                  <linearGradient id="colorMortes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="semana" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                <Area type="monotone" dataKey="mortes" stroke="#ef4444" strokeWidth={2.5} fill="url(#colorMortes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Taxa Mensal (%)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.mensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                <Bar dataKey="taxa" fill="#ef4444" radius={[6, 6, 0, 0]} name="Taxa (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Causes breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-5">Causas de Mortalidade</h3>
        <div className="space-y-4">
          {data.causas.map((c) => (
            <div key={c.causa}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700">{c.causa}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{c.quantidade} mortes</span>
                  <span className="text-sm font-bold text-gray-900">{c.porcentagem}%</span>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500",
                    c.porcentagem === maxCausa ? "bg-red-400" : "bg-red-200"
                  )}
                  style={{ width: `${c.porcentagem}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
