"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Skull,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Activity,
  AlertTriangle,
  Heart,
  Plus,
  X,
  Check,
  Pencil,
  Trash2,
  Calendar,
  Search,
  ChevronDown,
  Minus,
} from "lucide-react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ── Mock Data ── */

interface RegistroMortalidade {
  id: number;
  data: string;
  quantidade: number;
  causa: string;
  galpao: string;
  observacao: string;
}

const lotesMortalidade: Record<
  string,
  {
    codigo: string;
    taxaMensal: number;
    totalMortes: number;
    mortesSemana: number;
    mortesMes: number;
    avesVivas: number;
    causaPrincipal: string;
    tendencia: "up" | "down" | "stable";
    semanal: { semana: string; mortes: number }[];
    causas: { causa: string; quantidade: number; porcentagem: number; color: string }[];
    mensal: { mes: string; mortes: number; taxa: number }[];
    registros: RegistroMortalidade[];
  }
> = {
  "1": {
    codigo: "L-2024-01",
    taxaMensal: 0.3,
    totalMortes: 12,
    mortesSemana: 1,
    mortesMes: 2,
    avesVivas: 788,
    causaPrincipal: "Natural",
    tendencia: "stable",
    semanal: [
      { semana: "S1", mortes: 1 },
      { semana: "S2", mortes: 0 },
      { semana: "S3", mortes: 1 },
      { semana: "S4", mortes: 0 },
      { semana: "S5", mortes: 1 },
      { semana: "S6", mortes: 0 },
    ],
    causas: [
      { causa: "Natural", quantidade: 8, porcentagem: 67, color: "#94a3b8" },
      { causa: "Predadores", quantidade: 2, porcentagem: 17, color: "#f59e0b" },
      { causa: "Doença", quantidade: 2, porcentagem: 16, color: "#ef4444" },
    ],
    mensal: [
      { mes: "Jan", mortes: 3, taxa: 0.38 },
      { mes: "Fev", mortes: 2, taxa: 0.25 },
      { mes: "Mar", mortes: 2, taxa: 0.25 },
      { mes: "Abr", mortes: 2, taxa: 0.25 },
    ],
    registros: [
      { id: 1, data: "2024-04-15", quantidade: 1, causa: "Natural", galpao: "Galpão A1", observacao: "Ave encontrada sem sinais de doença" },
      { id: 2, data: "2024-04-10", quantidade: 1, causa: "Predadores", galpao: "Galpão A1", observacao: "Possível ataque noturno" },
      { id: 3, data: "2024-03-28", quantidade: 1, causa: "Natural", galpao: "Galpão A2", observacao: "" },
      { id: 4, data: "2024-03-20", quantidade: 1, causa: "Doença", galpao: "Galpão A1", observacao: "Sintomas respiratórios detectados" },
      { id: 5, data: "2024-03-12", quantidade: 2, causa: "Doença", galpao: "Galpão A2", observacao: "Isolamento tardio" },
    ],
  },
  "2": {
    codigo: "L-2024-02",
    taxaMensal: 0.5,
    totalMortes: 9,
    mortesSemana: 1,
    mortesMes: 3,
    avesVivas: 591,
    causaPrincipal: "Respiratório",
    tendencia: "up",
    semanal: [
      { semana: "S1", mortes: 0 },
      { semana: "S2", mortes: 1 },
      { semana: "S3", mortes: 1 },
      { semana: "S4", mortes: 0 },
      { semana: "S5", mortes: 1 },
      { semana: "S6", mortes: 1 },
    ],
    causas: [
      { causa: "Respiratório", quantidade: 5, porcentagem: 56, color: "#ef4444" },
      { causa: "Natural", quantidade: 3, porcentagem: 33, color: "#94a3b8" },
      { causa: "Desconhecido", quantidade: 1, porcentagem: 11, color: "#a78bfa" },
    ],
    mensal: [
      { mes: "Jan", mortes: 1, taxa: 0.17 },
      { mes: "Fev", mortes: 2, taxa: 0.33 },
      { mes: "Mar", mortes: 3, taxa: 0.5 },
      { mes: "Abr", mortes: 3, taxa: 0.5 },
    ],
    registros: [
      { id: 1, data: "2024-04-16", quantidade: 1, causa: "Respiratório", galpao: "Galpão B1", observacao: "Coriza infecciosa" },
      { id: 2, data: "2024-04-12", quantidade: 1, causa: "Natural", galpao: "Galpão B1", observacao: "" },
      { id: 3, data: "2024-04-05", quantidade: 1, causa: "Respiratório", galpao: "Galpão B2", observacao: "Espirros frequentes" },
    ],
  },
  "3": {
    codigo: "L-2024-03",
    taxaMensal: 0.2,
    totalMortes: 4,
    mortesSemana: 0,
    mortesMes: 2,
    avesVivas: 996,
    causaPrincipal: "Natural",
    tendencia: "down",
    semanal: [
      { semana: "S1", mortes: 1 },
      { semana: "S2", mortes: 1 },
      { semana: "S3", mortes: 0 },
      { semana: "S4", mortes: 0 },
      { semana: "S5", mortes: 0 },
      { semana: "S6", mortes: 0 },
    ],
    causas: [
      { causa: "Natural", quantidade: 3, porcentagem: 75, color: "#94a3b8" },
      { causa: "Estresse", quantidade: 1, porcentagem: 25, color: "#f59e0b" },
    ],
    mensal: [
      { mes: "Jan", mortes: 2, taxa: 0.2 },
      { mes: "Fev", mortes: 1, taxa: 0.1 },
      { mes: "Mar", mortes: 1, taxa: 0.1 },
      { mes: "Abr", mortes: 0, taxa: 0.0 },
    ],
    registros: [
      { id: 1, data: "2024-03-18", quantidade: 1, causa: "Estresse", galpao: "Galpão C1", observacao: "Calor excessivo" },
      { id: 2, data: "2024-03-05", quantidade: 1, causa: "Natural", galpao: "Galpão C1", observacao: "" },
    ],
  },
  "4": {
    codigo: "L-2024-04",
    taxaMensal: 0.8,
    totalMortes: 24,
    mortesSemana: 2,
    mortesMes: 4,
    avesVivas: 476,
    causaPrincipal: "Natural",
    tendencia: "up",
    semanal: [
      { semana: "S1", mortes: 1 },
      { semana: "S2", mortes: 1 },
      { semana: "S3", mortes: 2 },
      { semana: "S4", mortes: 1 },
      { semana: "S5", mortes: 2 },
      { semana: "S6", mortes: 2 },
    ],
    causas: [
      { causa: "Natural", quantidade: 20, porcentagem: 83, color: "#94a3b8" },
      { causa: "Doença", quantidade: 4, porcentagem: 17, color: "#ef4444" },
    ],
    mensal: [
      { mes: "Jan", mortes: 5, taxa: 1.0 },
      { mes: "Fev", mortes: 4, taxa: 0.8 },
      { mes: "Mar", mortes: 4, taxa: 0.8 },
      { mes: "Abr", mortes: 4, taxa: 0.8 },
    ],
    registros: [
      { id: 1, data: "2024-04-17", quantidade: 2, causa: "Natural", galpao: "Galpão D1", observacao: "Aves encontradas sem sinais externos" },
      { id: 2, data: "2024-04-14", quantidade: 1, causa: "Doença", galpao: "Galpão D2", observacao: "Investigar contágio" },
      { id: 3, data: "2024-04-10", quantidade: 1, causa: "Natural", galpao: "Galpão D1", observacao: "" },
    ],
  },
};

const causaOptions = ["Natural", "Doença", "Respiratório", "Predadores", "Estresse", "Desconhecido"];

export default function MortalidadeLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const baseData = lotesMortalidade[loteId];

  const [registros, setRegistros] = useState<RegistroMortalidade[]>(baseData?.registros || []);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<RegistroMortalidade | null>(null);
  const [form, setForm] = useState({ data: "", quantidade: "", causa: "", galpao: "", observacao: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRegistros = useMemo(() => {
    if (!searchQuery.trim()) return registros;
    const q = searchQuery.toLowerCase();
    return registros.filter(
      (r) =>
        r.causa.toLowerCase().includes(q) ||
        r.galpao.toLowerCase().includes(q) ||
        r.observacao.toLowerCase().includes(q) ||
        r.data.includes(q)
    );
  }, [registros, searchQuery]);

  if (!baseData) {
    return (
      <div className="space-y-6">
        <Link
          href={`/dashboard/flocks/detalhes/${loteId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-gray-400">Dados não encontrados.</p>
        </div>
      </div>
    );
  }

  const data = baseData;

  function openAdd() {
    setForm({ data: "", quantidade: "1", causa: "", galpao: "", observacao: "" });
    setEditing(null);
    setModal("add");
  }

  function openEdit(r: RegistroMortalidade) {
    setForm({
      data: r.data,
      quantidade: String(r.quantidade),
      causa: r.causa,
      galpao: r.galpao,
      observacao: r.observacao,
    });
    setEditing(r);
    setModal("edit");
  }

  function save() {
    if (!form.data.trim() || !form.causa.trim() || !form.galpao.trim()) return;

    const registro: RegistroMortalidade = {
      id: editing?.id || Date.now(),
      data: form.data,
      quantidade: Number(form.quantidade) || 1,
      causa: form.causa,
      galpao: form.galpao,
      observacao: form.observacao,
    };

    if (modal === "add") {
      setRegistros((prev) => [registro, ...prev]);
    } else if (editing) {
      setRegistros((prev) => prev.map((r) => (r.id === editing.id ? registro : r)));
    }

    setModal(null);
  }

  function deleteRegistro(id: number) {
    setRegistros((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirm(null);
  }

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return dateStr;
    }
  }

  const TrendBadge = () => {
    if (data.tendencia === "stable")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">
          <Minus className="w-3 h-3" /> Estável
        </span>
      );
    const isUp = data.tendencia === "up";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg",
          isUp ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
        )}
      >
        {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {isUp ? "Aumentando" : "Diminuindo"}
      </span>
    );
  };

  const kpis = [
    {
      title: "Taxa Mensal",
      value: `${data.taxaMensal.toFixed(1).replace(".", ",")}%`,
      icon: Activity,
      iconBg: data.taxaMensal <= 0.5 ? "bg-emerald-50" : data.taxaMensal <= 1.0 ? "bg-amber-50" : "bg-red-50",
      iconColor: data.taxaMensal <= 0.5 ? "text-emerald-600" : data.taxaMensal <= 1.0 ? "text-amber-600" : "text-red-500",
      badge: data.tendencia === "up" ? "+0.1%" : data.tendencia === "down" ? "-0.1%" : "0%",
      badgeDir: data.tendencia === "up" ? ("up" as const) : data.tendencia === "down" ? ("down" as const) : ("neutral" as const),
    },
    {
      title: "Mortes Total",
      value: String(data.totalMortes),
      icon: Skull,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      badge: `${data.mortesMes} este mês`,
      badgeDir: "neutral" as const,
    },
    {
      title: "Esta Semana",
      value: String(data.mortesSemana),
      icon: Calendar,
      iconBg: data.mortesSemana === 0 ? "bg-emerald-50" : "bg-amber-50",
      iconColor: data.mortesSemana === 0 ? "text-emerald-600" : "text-amber-600",
      badge: data.mortesSemana === 0 ? "Zero mortes" : `${data.mortesSemana} ave(s)`,
      badgeDir: data.mortesSemana === 0 ? ("down" as const) : ("neutral" as const),
    },
    {
      title: "Aves Vivas",
      value: data.avesVivas.toLocaleString("pt-BR"),
      icon: Heart,
      iconBg: "bg-brand-50",
      iconColor: "text-brand-600",
      badge: data.causaPrincipal,
      badgeDir: "neutral" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/flocks/detalhes/${loteId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Detalhes
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <Skull className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Mortalidade — {data.codigo}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-500">Análise detalhada de mortalidade</p>
                <TrendBadge />
              </div>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Registrar Mortalidade
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.title}
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", kpi.iconBg)}>
                <kpi.icon className={cn("w-5 h-5", kpi.iconColor)} />
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-lg",
                  kpi.badgeDir === "up" && "text-red-600 bg-red-50",
                  kpi.badgeDir === "down" && "text-emerald-700 bg-emerald-50",
                  kpi.badgeDir === "neutral" && "text-gray-500 bg-gray-50"
                )}
              >
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Area Chart - Mortes por Semana */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Mortes por Semana</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.semanal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMortes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="60%" stopColor="#ef4444" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: "13px",
                  padding: "10px 14px",
                }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                formatter={(value: unknown) => [Number(value), "Mortes"]}
              />
              <Area
                type="monotone"
                dataKey="mortes"
                stroke="#ef4444"
                strokeWidth={2.5}
                fill="url(#colorMortes)"
                dot={{ r: 5, fill: "#fff", stroke: "#ef4444", strokeWidth: 2.5 }}
                activeDot={{ r: 7, fill: "#ef4444", stroke: "#fff", strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Causas */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Causas de Mortalidade</h3>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data.causas}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="quantidade"
                  nameKey="causa"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.causas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: "13px",
                    padding: "10px 14px",
                  }}
                  formatter={((value: any, name: any) => [`${Number(value)} mortes`, String(name)]) as any}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2.5 mt-2">
              {data.causas.map((c) => (
                <div key={c.causa} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-sm text-gray-600">{c.causa}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{c.quantidade}</span>
                    <span className="text-sm font-bold text-gray-900">{c.porcentagem}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-6">Evolução Mensal</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.mensal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                fontSize: "13px",
                padding: "10px 14px",
              }}
              labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
              formatter={((value: any, name: any) => {
                if (String(name) === "mortes") return [Number(value), "Mortes"];
                return [`${Number(value)}%`, "Taxa"];
              }) as any}
            />
            <Bar dataKey="mortes" fill="#fca5a5" radius={[6, 6, 0, 0]} name="mortes" />
            <Bar dataKey="taxa" fill="#ef4444" radius={[6, 6, 0, 0]} name="taxa" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-sm font-bold text-gray-900">Registros de Mortalidade</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por causa, galpão..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Data</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Qtd</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Causa</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Galpão</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Observação</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistros.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredRegistros.map((r) => (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{formatDate(r.data)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                        {r.quantidade}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg",
                          r.causa === "Doença" || r.causa === "Respiratório"
                            ? "bg-red-50 text-red-600"
                            : r.causa === "Natural"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-amber-50 text-amber-700"
                        )}
                      >
                        {r.causa}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{r.galpao}</td>
                    <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate">{r.observacao || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirm === r.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteRegistro(r.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(r.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Registrar Mortalidade" : "Editar Registro"}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Causa</label>
                  <select
                    value={form.causa}
                    onChange={(e) => setForm({ ...form, causa: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {causaOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Galpão</label>
                  <input
                    type="text"
                    placeholder="Ex: Galpão A1"
                    value={form.galpao}
                    onChange={(e) => setForm({ ...form, galpao: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Observação</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes sobre a ocorrência..."
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all placeholder:text-gray-400 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                {modal === "add" ? "Registrar" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
