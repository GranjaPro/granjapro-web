"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wheat, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const lotesRacao: Record<string, {
  codigo: string;
  consumoDiario: number;
  consumoAve: number;
  custoKg: number;
  custoMensal: number;
  custoOvo: number;
  estoqueRestante: number;
  tipoRacao: string;
  tendencia: "up" | "down" | "stable";
  diario: { dia: string; consumo: number }[];
  mensal: { mes: string; consumo: number; custo: number }[];
}> = {
  "1": {
    codigo: "L-2024-01", consumoDiario: 96, consumoAve: 120, custoKg: 2.85, custoMensal: 8208,
    custoOvo: 0.37, estoqueRestante: 450, tipoRacao: "Postura Fase 2", tendencia: "stable",
    diario: [
      { dia: "Seg", consumo: 95 }, { dia: "Ter", consumo: 97 }, { dia: "Qua", consumo: 96 },
      { dia: "Qui", consumo: 98 }, { dia: "Sex", consumo: 95 }, { dia: "Sáb", consumo: 94 }, { dia: "Dom", consumo: 93 },
    ],
    mensal: [
      { mes: "Jan", consumo: 2880, custo: 8208 }, { mes: "Fev", consumo: 2750, custo: 7838 },
      { mes: "Mar", consumo: 2900, custo: 8265 }, { mes: "Abr", consumo: 2880, custo: 8208 },
    ],
  },
  "2": {
    codigo: "L-2024-02", consumoDiario: 69, consumoAve: 115, custoKg: 2.85, custoMensal: 5899,
    custoOvo: 0.37, estoqueRestante: 320, tipoRacao: "Postura Fase 1", tendencia: "up",
    diario: [
      { dia: "Seg", consumo: 67 }, { dia: "Ter", consumo: 68 }, { dia: "Qua", consumo: 70 },
      { dia: "Qui", consumo: 69 }, { dia: "Sex", consumo: 71 }, { dia: "Sáb", consumo: 68 }, { dia: "Dom", consumo: 67 },
    ],
    mensal: [
      { mes: "Jan", consumo: 2010, custo: 5729 }, { mes: "Fev", consumo: 2040, custo: 5814 },
      { mes: "Mar", consumo: 2070, custo: 5900 }, { mes: "Abr", consumo: 2070, custo: 5900 },
    ],
  },
  "3": {
    codigo: "L-2024-03", consumoDiario: 85, consumoAve: 85, custoKg: 2.50, custoMensal: 6375,
    custoOvo: 0, estoqueRestante: 600, tipoRacao: "Crescimento", tendencia: "up",
    diario: [
      { dia: "Seg", consumo: 82 }, { dia: "Ter", consumo: 84 }, { dia: "Qua", consumo: 85 },
      { dia: "Qui", consumo: 86 }, { dia: "Sex", consumo: 87 }, { dia: "Sáb", consumo: 85 }, { dia: "Dom", consumo: 84 },
    ],
    mensal: [
      { mes: "Jan", consumo: 2400, custo: 6000 }, { mes: "Fev", consumo: 2450, custo: 6125 },
      { mes: "Mar", consumo: 2550, custo: 6375 }, { mes: "Abr", consumo: 2550, custo: 6375 },
    ],
  },
  "4": {
    codigo: "L-2024-04", consumoDiario: 62.5, consumoAve: 125, custoKg: 2.85, custoMensal: 5344,
    custoOvo: 0.46, estoqueRestante: 280, tipoRacao: "Postura Fase 3", tendencia: "stable",
    diario: [
      { dia: "Seg", consumo: 63 }, { dia: "Ter", consumo: 62 }, { dia: "Qua", consumo: 63 },
      { dia: "Qui", consumo: 62 }, { dia: "Sex", consumo: 63 }, { dia: "Sáb", consumo: 62 }, { dia: "Dom", consumo: 62 },
    ],
    mensal: [
      { mes: "Jan", consumo: 1900, custo: 5415 }, { mes: "Fev", consumo: 1880, custo: 5358 },
      { mes: "Mar", consumo: 1875, custo: 5344 }, { mes: "Abr", consumo: 1875, custo: 5344 },
    ],
  },
};

export default function RacaoLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const data = lotesRacao[loteId];

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

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/flocks/detalhes/${loteId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar para Detalhes
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
            <Wheat className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ração — {data.codigo}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Consumo e custos detalhados de ração</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Consumo Diário", value: `${data.consumoDiario} kg` },
          { label: "Consumo/Ave/Dia", value: `${data.consumoAve} g` },
          { label: "Custo/kg", value: `R$ ${data.custoKg.toFixed(2).replace(".", ",")}` },
          { label: "Custo Mensal", value: `R$ ${(data.custoMensal / 1000).toFixed(1).replace(".", ",")}k` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight mt-2">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Consumo Diário (kg)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.diario}>
                <defs>
                  <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                <Area type="monotone" dataKey="consumo" stroke="#f97316" strokeWidth={2.5} fill="url(#colorConsumo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Consumo Mensal (kg)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.mensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                <Bar dataKey="consumo" fill="#f97316" radius={[6, 6, 0, 0]} name="Consumo (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-5">Informações Adicionais</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Tipo de Ração", value: data.tipoRacao },
            { label: "Custo/Ovo", value: data.custoOvo > 0 ? `R$ ${data.custoOvo.toFixed(2).replace(".", ",")}` : "—" },
            { label: "Estoque Restante", value: `${data.estoqueRestante} kg` },
            { label: "Tendência", value: data.tendencia === "up" ? "Aumento" : data.tendencia === "down" ? "Redução" : "Estável" },
          ].map((item) => (
            <div key={item.label} className="text-center p-4 rounded-xl bg-gray-50/80">
              <p className="text-sm font-bold text-gray-900">{item.value}</p>
              <p className="text-[11px] text-gray-400 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
