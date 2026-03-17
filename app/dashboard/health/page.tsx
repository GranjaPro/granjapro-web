"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  HeartPulse,
  Plus,
  Syringe,
  AlertTriangle,
  ClipboardCheck,
  Calendar,
  X,
  Stethoscope,
  ShieldCheck,
  Pill,
  Search as SearchIcon,
} from "lucide-react";

type RegistroTipo = "Vacinação" | "Tratamento" | "Inspeção";
type RegistroStatus = "Concluído" | "Em andamento";
type AgendaStatus = "Próximo" | "Agendado";

interface RegistroSaude {
  id: number;
  titulo: string;
  data: string;
  lote: string;
  tipo: RegistroTipo;
  status: RegistroStatus;
}

interface AgendaVacina {
  id: number;
  vacina: string;
  lote: string;
  dataVencimento: string;
  status: AgendaStatus;
}

const initialRegistros: RegistroSaude[] = [
  { id: 1, titulo: "Newcastle — Reforço", data: "2024-03-12", lote: "L-2024-01", tipo: "Vacinação", status: "Concluído" },
  { id: 2, titulo: "Sintomas respiratórios — Antibióticos", data: "2024-03-10", lote: "L-2024-02", tipo: "Tratamento", status: "Em andamento" },
  { id: 3, titulo: "Inspeção sanitária de rotina", data: "2024-03-08", lote: "L-2024-04", tipo: "Inspeção", status: "Concluído" },
  { id: 4, titulo: "Bronquite Infecciosa", data: "2024-03-05", lote: "L-2024-01", tipo: "Vacinação", status: "Concluído" },
  { id: 5, titulo: "Desverminização preventiva", data: "2024-03-02", lote: "L-2024-03", tipo: "Tratamento", status: "Concluído" },
  { id: 6, titulo: "Gumboro — 2ª dose", data: "2024-02-28", lote: "L-2024-03", tipo: "Vacinação", status: "Concluído" },
];

const initialAgenda: AgendaVacina[] = [
  { id: 1, vacina: "Marek", lote: "L-2024-03", dataVencimento: "2024-03-20", status: "Próximo" },
  { id: 2, vacina: "Influenza Aviária", lote: "Todos", dataVencimento: "2024-03-25", status: "Próximo" },
  { id: 3, vacina: "Newcastle Reforço", lote: "L-2024-02", dataVencimento: "2024-04-02", status: "Agendado" },
  { id: 4, vacina: "Bronquite Reforço", lote: "L-2024-01", dataVencimento: "2024-04-10", status: "Agendado" },
];

const statusRegistroConfig: Record<RegistroStatus, { bg: string; text: string }> = {
  "Concluído": { bg: "bg-emerald-50", text: "text-emerald-700" },
  "Em andamento": { bg: "bg-amber-50", text: "text-amber-700" },
};

const statusAgendaConfig: Record<AgendaStatus, { bg: string; text: string; border: string }> = {
  "Próximo": { bg: "bg-white", text: "text-brand-700", border: "border-brand-200" },
  "Agendado": { bg: "bg-white", text: "text-gray-600", border: "border-gray-200" },
};

const tipoIcon: Record<RegistroTipo, typeof Syringe> = {
  "Vacinação": Syringe,
  "Tratamento": Pill,
  "Inspeção": ClipboardCheck,
};

const tipoColor: Record<RegistroTipo, { bg: string; text: string }> = {
  "Vacinação": { bg: "bg-brand-50", text: "text-brand-600" },
  "Tratamento": { bg: "bg-amber-50", text: "text-amber-600" },
  "Inspeção": { bg: "bg-sky-50", text: "text-sky-600" },
};

export default function SaudePage() {
  const [registros, setRegistros] = useState(initialRegistros);
  const [agenda] = useState(initialAgenda);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    data: "",
    lote: "",
    tipo: "Vacinação" as RegistroTipo,
    status: "Concluído" as RegistroStatus,
  });

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
    } catch {
      return dateStr;
    }
  }

  function formatDateFull(dateStr: string) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
    } catch {
      return dateStr;
    }
  }

  const healthScore = 94;
  const vacinasPendentes = agenda.filter((a) => a.status === "Próximo").length;
  const tratamentosAtivos = registros.filter((r) => r.status === "Em andamento").length;
  const ultimaInspecao = registros.find((r) => r.tipo === "Inspeção");
  let diasUltimaInspecao = "—";
  if (ultimaInspecao) {
    const diff = Math.floor((new Date().getTime() - new Date(ultimaInspecao.data + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24));
    diasUltimaInspecao = `${diff} dias`;
  }

  const kpis = [
    {
      label: "Score de Saúde",
      value: `${healthScore}%`,
      icon: HeartPulse,
      color: "text-brand-600",
      bg: "bg-brand-50",
      badge: healthScore >= 90 ? "Bom" : healthScore >= 70 ? "Regular" : "Crítico",
      badgeColor: healthScore >= 90 ? "bg-emerald-50 text-emerald-700" : healthScore >= 70 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700",
    },
    {
      label: "Vacinas Pendentes",
      value: String(vacinasPendentes),
      icon: Syringe,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Tratamentos Ativos",
      value: String(tratamentosAtivos),
      icon: AlertTriangle,
      color: "text-red-500",
      bg: "bg-red-50",
    },
    {
      label: "Última Inspeção",
      value: diasUltimaInspecao,
      icon: Stethoscope,
      color: "text-sky-600",
      bg: "bg-sky-50",
    },
  ];

  function handleSave() {
    if (!form.titulo || !form.data || !form.lote) return;
    setRegistros([
      { id: Date.now(), ...form },
      ...registros,
    ]);
    setForm({ titulo: "", data: "", lote: "", tipo: "Vacinação", status: "Concluído" });
    setShowModal(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Saúde Aviária</h1>
            <p className="text-sm text-gray-400">Registros de saúde, vacinações e alertas</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm shadow-brand-600/20 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar Registro
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:shadow-gray-100/50 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", kpi.bg)}>
                <kpi.icon className={cn("w-5 h-5", kpi.color)} />
              </div>
              {"badge" in kpi && kpi.badge && (
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", kpi.badgeColor)}>
                  {kpi.badge}
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Health Records + Vaccination Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Records */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Registros de Saúde</h3>
            <span className="text-xs text-gray-400 font-medium">{registros.length} registros</span>
          </div>
          <div className="divide-y divide-gray-50">
            {registros.map((r) => {
              const TipoIcon = tipoIcon[r.tipo];
              const tColor = tipoColor[r.tipo];
              const sColor = statusRegistroConfig[r.status];
              return (
                <div key={r.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", tColor.bg)}>
                        <TipoIcon className={cn("w-4 h-4", tColor.text)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.titulo}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>{formatDate(r.data)}</span>
                          <span className="text-gray-200">·</span>
                          <span>Lote: {r.lote}</span>
                          <span className="text-gray-200">·</span>
                          <span>{r.tipo}</span>
                        </div>
                      </div>
                    </div>
                    <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0", sColor.bg, sColor.text)}>
                      {r.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vaccination Schedule */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              Agenda de Vacinação
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {agenda.map((a) => {
              const sColor = statusAgendaConfig[a.status];
              return (
                <div key={a.id} className="px-6 py-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{a.vacina}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Lote: {a.lote} · Vencimento: {formatDateFull(a.dataVencimento)}
                      </p>
                    </div>
                    <span className={cn("text-[11px] font-semibold px-3 py-1.5 rounded-lg border flex-shrink-0", sColor.bg, sColor.text, sColor.border)}>
                      {a.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-950/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Novo Registro de Saúde</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Título</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Newcastle — Reforço"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Lote</label>
                  <select
                    value={form.lote}
                    onChange={(e) => setForm({ ...form, lote: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
                  >
                    <option value="">Selecionar...</option>
                    <option value="L-2024-01">L-2024-01</option>
                    <option value="L-2024-02">L-2024-02</option>
                    <option value="L-2024-03">L-2024-03</option>
                    <option value="L-2024-04">L-2024-04</option>
                    <option value="Todos">Todos os lotes</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as RegistroTipo })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
                  >
                    <option value="Vacinação">Vacinação</option>
                    <option value="Tratamento">Tratamento</option>
                    <option value="Inspeção">Inspeção</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as RegistroStatus })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer"
                  >
                    <option value="Concluído">Concluído</option>
                    <option value="Em andamento">Em andamento</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-sm shadow-brand-600/20 transition-colors cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
