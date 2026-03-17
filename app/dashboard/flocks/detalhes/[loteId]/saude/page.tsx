"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, HeartPulse, Syringe, ShieldCheck, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const lotesSaude: Record<string, {
  codigo: string;
  score: number;
  vacinasEmDia: number;
  vacinasTotal: number;
  proximaVacina: string;
  proximaVacinaData: string;
  tratamentosAtivos: number;
  ultimaInspecao: string;
  vacinacoes: { vacina: string; data: string; status: "aplicada" | "pendente" | "atrasada" }[];
  tratamentos: { titulo: string; inicio: string; fim: string; status: "ativo" | "concluído" }[];
}> = {
  "1": {
    codigo: "L-2024-01", score: 96, vacinasEmDia: 7, vacinasTotal: 8,
    proximaVacina: "Bronquite (reforço)", proximaVacinaData: "2024-06-15",
    tratamentosAtivos: 0, ultimaInspecao: "2024-03-08",
    vacinacoes: [
      { vacina: "Marek", data: "2023-06-15", status: "aplicada" },
      { vacina: "Newcastle + Bronquite (1ª)", data: "2023-06-22", status: "aplicada" },
      { vacina: "Gumboro (1ª)", data: "2023-06-29", status: "aplicada" },
      { vacina: "Newcastle + Bronquite (2ª)", data: "2023-07-13", status: "aplicada" },
      { vacina: "Gumboro (2ª)", data: "2023-07-20", status: "aplicada" },
      { vacina: "Encefalomielite + Bouba", data: "2023-08-24", status: "aplicada" },
      { vacina: "Newcastle (reforço)", data: "2024-03-15", status: "aplicada" },
      { vacina: "Bronquite (reforço)", data: "2024-06-15", status: "pendente" },
    ],
    tratamentos: [],
  },
  "2": {
    codigo: "L-2024-02", score: 82, vacinasEmDia: 6, vacinasTotal: 7,
    proximaVacina: "Newcastle (reforço)", proximaVacinaData: "2024-03-20",
    tratamentosAtivos: 1, ultimaInspecao: "2024-03-06",
    vacinacoes: [
      { vacina: "Marek", data: "2023-09-20", status: "aplicada" },
      { vacina: "Newcastle + Bronquite (1ª)", data: "2023-09-27", status: "aplicada" },
      { vacina: "Gumboro (1ª)", data: "2023-10-04", status: "aplicada" },
      { vacina: "Newcastle + Bronquite (2ª)", data: "2023-10-18", status: "aplicada" },
      { vacina: "Gumboro (2ª)", data: "2023-10-25", status: "aplicada" },
      { vacina: "Encefalomielite + Bouba", data: "2023-11-29", status: "aplicada" },
      { vacina: "Newcastle (reforço)", data: "2024-03-20", status: "pendente" },
    ],
    tratamentos: [
      { titulo: "Antibióticos — Sintomas respiratórios", inicio: "2024-03-10", fim: "2024-03-17", status: "ativo" },
    ],
  },
  "3": {
    codigo: "L-2024-03", score: 91, vacinasEmDia: 4, vacinasTotal: 5,
    proximaVacina: "Encefalomielite + Bouba", proximaVacinaData: "2024-02-10",
    tratamentosAtivos: 0, ultimaInspecao: "2024-03-05",
    vacinacoes: [
      { vacina: "Marek", data: "2023-11-10", status: "aplicada" },
      { vacina: "Newcastle + Bronquite (1ª)", data: "2023-11-17", status: "aplicada" },
      { vacina: "Gumboro (1ª)", data: "2023-11-24", status: "aplicada" },
      { vacina: "Newcastle + Bronquite (2ª)", data: "2023-12-08", status: "aplicada" },
      { vacina: "Encefalomielite + Bouba", data: "2024-02-10", status: "atrasada" },
    ],
    tratamentos: [],
  },
  "4": {
    codigo: "L-2024-04", score: 88, vacinasEmDia: 8, vacinasTotal: 8,
    proximaVacina: "—", proximaVacinaData: "",
    tratamentosAtivos: 0, ultimaInspecao: "2024-03-01",
    vacinacoes: [
      { vacina: "Marek", data: "2023-03-05", status: "aplicada" },
      { vacina: "Newcastle + Bronquite (1ª)", data: "2023-03-12", status: "aplicada" },
      { vacina: "Gumboro (1ª)", data: "2023-03-19", status: "aplicada" },
      { vacina: "Newcastle + Bronquite (2ª)", data: "2023-04-02", status: "aplicada" },
      { vacina: "Gumboro (2ª)", data: "2023-04-09", status: "aplicada" },
      { vacina: "Encefalomielite + Bouba", data: "2023-05-14", status: "aplicada" },
      { vacina: "Newcastle (reforço)", data: "2023-09-05", status: "aplicada" },
      { vacina: "Newcastle (2º reforço)", data: "2024-03-05", status: "aplicada" },
    ],
    tratamentos: [
      { titulo: "Suplementação vitamínica", inicio: "2024-02-15", fim: "2024-02-28", status: "concluído" },
    ],
  },
};

const statusVacinaConfig = {
  aplicada: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Aplicada", icon: CheckCircle2 },
  pendente: { bg: "bg-amber-50", text: "text-amber-700", label: "Pendente", icon: Clock },
  atrasada: { bg: "bg-red-50", text: "text-red-600", label: "Atrasada", icon: AlertTriangle },
};

export default function SaudeLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const data = lotesSaude[loteId];

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

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch { return dateStr; }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/flocks/detalhes/${loteId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar para Detalhes
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <HeartPulse className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Saúde — {data.codigo}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Vacinações, tratamentos e inspeções</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Score de Saúde", value: `${data.score}%`, color: data.score >= 90 ? "text-emerald-600" : data.score >= 75 ? "text-amber-600" : "text-red-500" },
          { label: "Vacinas em Dia", value: `${data.vacinasEmDia}/${data.vacinasTotal}`, color: "text-gray-900" },
          { label: "Tratamentos Ativos", value: String(data.tratamentosAtivos), color: data.tratamentosAtivos > 0 ? "text-amber-600" : "text-emerald-600" },
          { label: "Última Inspeção", value: formatDate(data.ultimaInspecao), color: "text-gray-900" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{kpi.label}</p>
            <p className={cn("text-2xl font-bold tracking-tight mt-2", kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Score bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">Score Geral</h3>
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg",
            data.score >= 90 ? "bg-emerald-50 text-emerald-700" : data.score >= 75 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"
          )}>
            {data.score >= 90 ? "Bom" : data.score >= 75 ? "Regular" : "Crítico"}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700",
              data.score >= 90 ? "bg-emerald-500" : data.score >= 75 ? "bg-amber-500" : "bg-red-500"
            )}
            style={{ width: `${data.score}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vaccination list */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
            <Syringe className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-gray-900">Calendário de Vacinação</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.vacinacoes.map((v, i) => {
              const cfg = statusVacinaConfig[v.status];
              const StatusIcon = cfg.icon;
              return (
                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cfg.bg)}>
                      <StatusIcon className={cn("w-4 h-4", cfg.text)} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{v.vacina}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(v.data)}</p>
                    </div>
                  </div>
                  <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", cfg.bg, cfg.text)}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Treatments */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-gray-900">Histórico de Tratamentos</h3>
          </div>
          {data.tratamentos.length === 0 ? (
            <div className="p-12 text-center">
              <HeartPulse className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Nenhum tratamento registrado</p>
              <p className="text-xs text-gray-300 mt-1">Lote saudável</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.tratamentos.map((t, i) => (
                <div key={i} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.titulo}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.inicio)} — {formatDate(t.fim)}</p>
                    </div>
                    <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg",
                      t.status === "ativo" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    )}>
                      {t.status === "ativo" ? "Em andamento" : "Concluído"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
