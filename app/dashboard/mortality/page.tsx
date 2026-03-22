"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ModalPortal from "@/components/ui/modal-portal";
import {
  Skull,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Heart,
  Plus,
  X,
  Check,
  Pencil,
  Trash2,
  Calendar,
  Search,
  Minus,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles,
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
  lote: string;
  galpao: string;
  observacao: string;
}

const initialRegistros: RegistroMortalidade[] = [
  { id: 1, data: "2024-04-17", quantidade: 2, causa: "Natural", lote: "L-2024-04", galpao: "Galpão D1", observacao: "Aves encontradas sem sinais externos" },
  { id: 2, data: "2024-04-16", quantidade: 1, causa: "Respiratório", lote: "L-2024-02", galpao: "Galpão B1", observacao: "Coriza infecciosa" },
  { id: 3, data: "2024-04-15", quantidade: 1, causa: "Natural", lote: "L-2024-01", galpao: "Galpão A1", observacao: "Ave encontrada sem sinais de doença" },
  { id: 4, data: "2024-04-14", quantidade: 1, causa: "Doença", lote: "L-2024-04", galpao: "Galpão D2", observacao: "Investigar contágio" },
  { id: 5, data: "2024-04-12", quantidade: 1, causa: "Natural", lote: "L-2024-02", galpao: "Galpão B1", observacao: "" },
  { id: 6, data: "2024-04-10", quantidade: 1, causa: "Predadores", lote: "L-2024-01", galpao: "Galpão A1", observacao: "Possível ataque noturno" },
  { id: 7, data: "2024-04-10", quantidade: 1, causa: "Natural", lote: "L-2024-04", galpao: "Galpão D1", observacao: "" },
  { id: 8, data: "2024-04-05", quantidade: 1, causa: "Respiratório", lote: "L-2024-02", galpao: "Galpão B2", observacao: "Espirros frequentes" },
  { id: 9, data: "2024-03-28", quantidade: 1, causa: "Natural", lote: "L-2024-01", galpao: "Galpão A2", observacao: "" },
  { id: 10, data: "2024-03-20", quantidade: 1, causa: "Doença", lote: "L-2024-01", galpao: "Galpão A1", observacao: "Sintomas respiratórios detectados" },
  { id: 11, data: "2024-03-18", quantidade: 1, causa: "Estresse", lote: "L-2024-03", galpao: "Galpão C1", observacao: "Calor excessivo" },
  { id: 12, data: "2024-03-12", quantidade: 2, causa: "Doença", lote: "L-2024-01", galpao: "Galpão A2", observacao: "Isolamento tardio" },
];

const semanal = [
  { semana: "S1", mortes: 2 },
  { semana: "S2", mortes: 3 },
  { semana: "S3", mortes: 4 },
  { semana: "S4", mortes: 1 },
  { semana: "S5", mortes: 4 },
  { semana: "S6", mortes: 3 },
];

const causas = [
  { causa: "Natural", quantidade: 28, porcentagem: 57, color: "#94a3b8" },
  { causa: "Doença", quantidade: 10, porcentagem: 20, color: "#ef4444" },
  { causa: "Respiratório", quantidade: 6, porcentagem: 12, color: "#f97316" },
  { causa: "Predadores", quantidade: 3, porcentagem: 6, color: "#f59e0b" },
  { causa: "Estresse", quantidade: 2, porcentagem: 4, color: "#a78bfa" },
];

const mensal = [
  { mes: "Jan", mortes: 11, taxa: 0.48 },
  { mes: "Fev", mortes: 9, taxa: 0.39 },
  { mes: "Mar", mortes: 10, taxa: 0.43 },
  { mes: "Abr", mortes: 9, taxa: 0.39 },
];

const porLote = [
  { lote: "L-2024-01", codigo: "L-2024-01", mortes: 12, taxa: 0.3, tendencia: "stable" as const, loteId: "1" },
  { lote: "L-2024-02", codigo: "L-2024-02", mortes: 9, taxa: 0.5, tendencia: "up" as const, loteId: "2" },
  { lote: "L-2024-03", codigo: "L-2024-03", mortes: 4, taxa: 0.2, tendencia: "down" as const, loteId: "3" },
  { lote: "L-2024-04", codigo: "L-2024-04", mortes: 24, taxa: 0.8, tendencia: "up" as const, loteId: "4" },
];

const loteOptions = ["L-2024-01", "L-2024-02", "L-2024-03", "L-2024-04"];
const causaOptions = ["Natural", "Doença", "Respiratório", "Predadores", "Estresse", "Desconhecido"];

export default function MortalidadePage() {
  const searchParams = useSearchParams();
  const [registros, setRegistros] = useState(initialRegistros);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);

  useEffect(() => {
    if (searchParams.get("register") === "true") setModal("add");
  }, [searchParams]);
  const [editing, setEditing] = useState<RegistroMortalidade | null>(null);
  const [form, setForm] = useState({ data: "", quantidade: "1", causa: "", lote: "", galpao: "", observacao: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [periodo, setPeriodo] = useState<"dia" | "semana" | "mes">("mes");
  const [selectedDate, setSelectedDate] = useState("2024-04-17");
  const [selectedWeek, setSelectedWeek] = useState(3); // week index (0-based) within selected month
  const [selectedMonth, setSelectedMonth] = useState("2024-04");

  /* ── Helpers ── */
  function getWeekRange(year: number, month: number, weekIndex: number) {
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start
    const weekStart = new Date(year, month, 1 + weekIndex * 7 - startOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    // Clamp to month
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const clampedStart = weekStart < monthStart ? monthStart : weekStart;
    const clampedEnd = weekEnd > monthEnd ? monthEnd : weekEnd;
    return {
      start: clampedStart.toISOString().split("T")[0],
      end: clampedEnd.toISOString().split("T")[0],
    };
  }

  function getWeeksInMonth(yearMonth: string) {
    const [y, m] = yearMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const firstDow = new Date(y, m - 1, 1).getDay();
    const startOffset = firstDow === 0 ? 6 : firstDow - 1;
    return Math.ceil((lastDay + startOffset) / 7);
  }

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    registros.forEach((r) => months.add(r.data.substring(0, 7)));
    return Array.from(months).sort();
  }, [registros]);

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    registros.forEach((r) => dates.add(r.data));
    return Array.from(dates).sort();
  }, [registros]);

  /* ── Period-filtered registros ── */
  const periodoRegistros = useMemo(() => {
    if (periodo === "dia") {
      return registros.filter((r) => r.data === selectedDate);
    } else if (periodo === "semana") {
      const [y, m] = selectedMonth.split("-").map(Number);
      const { start, end } = getWeekRange(y, m - 1, selectedWeek);
      return registros.filter((r) => r.data >= start && r.data <= end);
    } else {
      return registros.filter((r) => r.data.startsWith(selectedMonth));
    }
  }, [registros, periodo, selectedDate, selectedWeek, selectedMonth]);

  const periodoStats = useMemo(() => {
    const mortes = periodoRegistros.reduce((s, r) => s + r.quantidade, 0);
    const totalAves = 2851;

    if (periodo === "dia") {
      const taxa = ((mortes / totalAves) * 100).toFixed(1).replace(".", ",");
      const dateObj = new Date(selectedDate + "T00:00:00");
      const label = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      return { mortes, label, taxa: `${taxa}%`, taxaLabel: "Taxa Diária" };
    } else if (periodo === "semana") {
      const dias = 7;
      const media = (mortes / dias).toFixed(1).replace(".", ",");
      const taxa = ((mortes / totalAves) * 100).toFixed(1).replace(".", ",");
      return { mortes, label: `Semana ${selectedWeek + 1}`, taxa: `${taxa}%`, taxaLabel: "Taxa Semanal", media: `${media}/dia` };
    } else {
      const [y, m] = selectedMonth.split("-").map(Number);
      const diasNoMes = new Date(y, m, 0).getDate();
      const media = (mortes / diasNoMes).toFixed(1).replace(".", ",");
      const taxa = ((mortes / totalAves) * 100).toFixed(1).replace(".", ",");
      const mesNome = new Date(y, m - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      return { mortes, label: mesNome.charAt(0).toUpperCase() + mesNome.slice(1), taxa: `${taxa}%`, taxaLabel: "Taxa Mensal", media: `${media}/dia` };
    }
  }, [periodoRegistros, periodo, selectedDate, selectedWeek, selectedMonth]);

  const filteredRegistros = useMemo(() => {
    const base = searchQuery.trim()
      ? periodoRegistros.filter((r) => {
          const q = searchQuery.toLowerCase();
          return (
            r.causa.toLowerCase().includes(q) ||
            r.galpao.toLowerCase().includes(q) ||
            r.lote.toLowerCase().includes(q) ||
            r.observacao.toLowerCase().includes(q) ||
            r.data.includes(q)
          );
        })
      : periodoRegistros;
    return base;
  }, [periodoRegistros, searchQuery]);

  const totalMortes = registros.reduce((s, r) => s + r.quantidade, 0);
  const mortesSemana = registros.filter((r) => r.data >= "2024-04-11").reduce((s, r) => s + r.quantidade, 0);
  const mortesMes = registros.filter((r) => r.data >= "2024-04-01").reduce((s, r) => s + r.quantidade, 0);

  /* Navigation helpers */
  function navigatePeriodo(dir: -1 | 1) {
    if (periodo === "dia") {
      const idx = availableDates.indexOf(selectedDate);
      const next = idx + dir;
      if (next >= 0 && next < availableDates.length) setSelectedDate(availableDates[next]);
    } else if (periodo === "semana") {
      const totalWeeks = getWeeksInMonth(selectedMonth);
      const next = selectedWeek + dir;
      if (next >= 0 && next < totalWeeks) {
        setSelectedWeek(next);
      } else if (dir === -1) {
        const mIdx = availableMonths.indexOf(selectedMonth);
        if (mIdx > 0) {
          const prevMonth = availableMonths[mIdx - 1];
          setSelectedMonth(prevMonth);
          setSelectedWeek(getWeeksInMonth(prevMonth) - 1);
        }
      } else {
        const mIdx = availableMonths.indexOf(selectedMonth);
        if (mIdx < availableMonths.length - 1) {
          setSelectedMonth(availableMonths[mIdx + 1]);
          setSelectedWeek(0);
        }
      }
    } else {
      const idx = availableMonths.indexOf(selectedMonth);
      const next = idx + dir;
      if (next >= 0 && next < availableMonths.length) setSelectedMonth(availableMonths[next]);
    }
  }

  function openAdd() {
    setForm({ data: "", quantidade: "1", causa: "", lote: "", galpao: "", observacao: "" });
    setEditing(null);
    setModal("add");
  }

  function openEdit(r: RegistroMortalidade) {
    setForm({
      data: r.data,
      quantidade: String(r.quantidade),
      causa: r.causa,
      lote: r.lote,
      galpao: r.galpao,
      observacao: r.observacao,
    });
    setEditing(r);
    setModal("edit");
  }

  function save() {
    if (!form.data.trim() || !form.causa.trim() || !form.lote.trim() || !form.galpao.trim()) return;

    const registro: RegistroMortalidade = {
      id: editing?.id || Date.now(),
      data: form.data,
      quantidade: Number(form.quantidade) || 1,
      causa: form.causa,
      lote: form.lote,
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

  const kpis = [
    {
      title: periodoStats.taxaLabel,
      value: periodoStats.taxa,
      icon: Activity,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      badge: "-0.1%",
      badgeDir: "down" as const,
      insight: "Mortalidade controlada no último mês",
      insightColor: "text-emerald-600",
    },
    {
      title: `Mortes — ${periodoStats.label}`,
      value: String(periodoStats.mortes),
      icon: Skull,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      badge: periodoStats.media || `${periodoStats.mortes} mortes`,
      badgeDir: "neutral" as const,
      insight: periodoStats.mortes > 5 ? "Número alto de mortes — verifique a causa" : undefined,
      insightColor: "text-red-500",
    },
    {
      title: "Total Acumulado",
      value: String(totalMortes),
      icon: Calendar,
      iconBg: totalMortes > 10 ? "bg-amber-50" : "bg-emerald-50",
      iconColor: totalMortes > 10 ? "text-amber-600" : "text-emerald-600",
      badge: `${mortesMes} este mês`,
      badgeDir: "neutral" as const,
    },
    {
      title: "Aves Vivas",
      value: "2.851",
      icon: Heart,
      iconBg: "bg-brand-50",
      iconColor: "text-brand-600",
      badge: "4 lotes ativos",
      badgeDir: "neutral" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <Skull className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mortalidade</h1>
            <p className="text-sm text-gray-500 mt-0.5">Controle e análise de mortalidade de todos os lotes</p>
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

      {/* Period Filter + KPI Cards */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: "dia" as const, label: "Dia" },
            { key: "semana" as const, label: "Semana" },
            { key: "mes" as const, label: "Mês" },
          ]).map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                periodo === p.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-50 text-amber-500 border border-amber-200">
          <Sparkles className="w-2.5 h-2.5" />
          Pro
        </span>
      </div>

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
            {kpi.insight && (
              <p className={cn("text-[11px] mt-2.5 font-medium leading-tight", kpi.insightColor)}>
                {kpi.insight}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Area Chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Mortes por Semana</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={semanal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMortesGlobal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="60%" stopColor="#ef4444" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                formatter={(value: number) => [value, "Mortes"]}
              />
              <Area type="monotone" dataKey="mortes" stroke="#ef4444" strokeWidth={2.5} fill="url(#colorMortesGlobal)" dot={{ r: 5, fill: "#fff", stroke: "#ef4444", strokeWidth: 2.5 }} activeDot={{ r: 7, fill: "#ef4444", stroke: "#fff", strokeWidth: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Causas de Mortalidade</h3>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={causas} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="quantidade" nameKey="causa" paddingAngle={3} strokeWidth={0}>
                  {causas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                  formatter={(value: number, name: string) => [`${value} mortes`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2.5 mt-2">
              {causas.map((c) => (
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

      {/* Mortalidade por Lote + Evolução Mensal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per-flock breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-5">Mortalidade por Lote</h3>
          <div className="space-y-3">
            {porLote.map((l) => (
              <div key={l.lote} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                    <Skull className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{l.codigo}</p>
                    <p className="text-xs text-gray-400">{l.mortes} mortes total</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={cn("text-sm font-bold", l.taxa <= 0.3 ? "text-emerald-600" : l.taxa <= 0.5 ? "text-amber-600" : "text-red-500")}>
                      {l.taxa.toFixed(1).replace(".", ",")}%
                    </p>
                    <span className={cn(
                      "inline-flex items-center gap-0.5 text-[10px] font-semibold",
                      l.tendencia === "up" ? "text-red-500" : l.tendencia === "down" ? "text-emerald-600" : "text-gray-400"
                    )}>
                      {l.tendencia === "up" && <ArrowUpRight className="w-3 h-3" />}
                      {l.tendencia === "down" && <ArrowDownRight className="w-3 h-3" />}
                      {l.tendencia === "stable" && <Minus className="w-3 h-3" />}
                      {l.tendencia === "up" ? "Subindo" : l.tendencia === "down" ? "Caindo" : "Estável"}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/flocks/detalhes/${l.loteId}/mortalidade`}
                    className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Evolução Mensal</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mensal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                formatter={(value: number, name: string) => {
                  if (name === "mortes") return [value, "Mortes"];
                  return [`${value}%`, "Taxa"];
                }}
              />
              <Bar dataKey="mortes" fill="#fca5a5" radius={[6, 6, 0, 0]} name="mortes" />
              <Bar dataKey="taxa" fill="#ef4444" radius={[6, 6, 0, 0]} name="taxa" />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
                placeholder="Buscar por causa, lote, galpão..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all placeholder:text-gray-400"
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
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Lote</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Causa</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Galpão</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Observação</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
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
                      <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg">
                        {r.lote}
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
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Lote</label>
                  <select
                    value={form.lote}
                    onChange={(e) => setForm({ ...form, lote: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {loteOptions.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Causa</label>
                  <select
                    value={form.causa}
                    onChange={(e) => setForm({ ...form, causa: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {causaOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
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
        </ModalPortal>
      )}
    </div>
  );
}
