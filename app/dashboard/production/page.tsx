"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ModalPortal from "@/components/ui/modal-portal";
import {
  Egg,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Check,
  Pencil,
  Trash2,
  FileText,
  Target,
  Lightbulb,
  ChevronRight,
  Search,
  BarChart3,
  Sparkles,
  Zap,
  CalendarDays,
  ChevronLeft,
  HelpCircle,
  Wheat,
  CircleDollarSign,
  AlertOctagon,
} from "lucide-react";
import Link from "next/link";
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
  ReferenceLine,
  Cell,
} from "recharts";

/* ── Lotes (shared mock data) ── */
interface Lote {
  id: number;
  codigo: string;
  raca: string;
  aves: number;
  postura: string;
}

const initialLotes: Lote[] = [
  { id: 1, codigo: "L-2024-01", raca: "Hy-Line Brown", aves: 800, postura: "92%" },
  { id: 2, codigo: "L-2024-02", raca: "Lohmann LSL", aves: 600, postura: "88%" },
  { id: 3, codigo: "L-2024-03", raca: "ISA Brown", aves: 1000, postura: "—" },
  { id: 4, codigo: "L-2024-04", raca: "Novogen Brown", aves: 500, postura: "78%" },
];

/* ── Chart Data ── */
const curvaProducao = [
  { day: "Seg", ovos: 2450, meta: 2600 },
  { day: "Ter", ovos: 2620, meta: 2600 },
  { day: "Qua", ovos: 2700, meta: 2600 },
  { day: "Qui", ovos: 2650, meta: 2600 },
  { day: "Sex", ovos: 2580, meta: 2600 },
  { day: "Sáb", ovos: 2600, meta: 2600 },
  { day: "Dom", ovos: 2500, meta: 2600 },
];

/* ── Quality Breakdown ── */
const qualityData = [
  { name: "Bons", value: 96.2, color: "#2d7a4f", qty: 2356 },
  { name: "Quebrados", value: 1.5, color: "#ef4444", qty: 12 },
  { name: "Sujos", value: 1.8, color: "#f59e0b", qty: 18 },
  { name: "Reaproveitados", value: 0.3, color: "#3b82f6", qty: 7 },
  { name: "Descartados", value: 0.2, color: "#94a3b8", qty: 5 },
];

/* ── Production by Lote ── */
const producaoPorLote = [
  { lote: "L-2024-01", ovos: 736, taxa: 92, color: "#2d7a4f" },
  { lote: "L-2024-02", ovos: 528, taxa: 88, color: "#3b82f6" },
  { lote: "L-2024-03", ovos: 850, taxa: 85, color: "#f59e0b" },
  { lote: "L-2024-04", ovos: 390, taxa: 78, color: "#ef4444" },
];

/* ── Table Data ── */
interface Registro {
  id: number;
  loteId: number;
  loteCodigo: string;
  data: string;
  total: number;
  quebrados: number;
  sujos: number;
  descartados: number;
  taxa: string;
}

const initialRegistros: Registro[] = [
  { id: 1, loteId: 1, loteCodigo: "L-2024-01", data: "2024-03-17", total: 2450, quebrados: 12, sujos: 18, descartados: 5, taxa: "90.0%" },
  { id: 2, loteId: 2, loteCodigo: "L-2024-02", data: "2024-03-16", total: 2620, quebrados: 8, sujos: 14, descartados: 3, taxa: "95.3%" },
  { id: 3, loteId: 1, loteCodigo: "L-2024-01", data: "2024-03-15", total: 2700, quebrados: 15, sujos: 20, descartados: 7, taxa: "96.2%" },
  { id: 4, loteId: 3, loteCodigo: "L-2024-03", data: "2024-03-14", total: 2400, quebrados: 10, sujos: 12, descartados: 4, taxa: "85.0%" },
  { id: 5, loteId: 4, loteCodigo: "L-2024-04", data: "2024-03-13", total: 1950, quebrados: 20, sujos: 25, descartados: 8, taxa: "78.0%" },
];

type ModalMode = "add" | "edit" | null;

export default function ProducaoPage() {
  const searchParams = useSearchParams();
  const [lotes, setLotes] = useState(initialLotes);
  const [registros, setRegistros] = useState(initialRegistros);
  const [modal, setModal] = useState<ModalMode>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (searchParams.get("register") === "true") setModal("add");
  }, [searchParams]);
  const [editing, setEditing] = useState<Registro | null>(null);
  const [form, setForm] = useState({ loteId: "", data: "", total: "", quebrados: "", sujos: "", descartados: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Calendar filter state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<"intervalo" | "mes">("intervalo");
  const [rangeStart, setRangeStart] = useState<Date | null>(new Date());
  const [rangeEnd, setRangeEnd] = useState<Date | null>(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutsideCal(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideCal);
    return () => document.removeEventListener("mousedown", handleClickOutsideCal);
  }, []);

  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  const calendarLabel = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    if (filterMode === "intervalo") {
      if (rangeStart && rangeEnd) {
        if (sameDay(rangeStart, rangeEnd)) {
          const today = new Date();
          if (sameDay(rangeStart, today)) return `Hoje, ${rangeStart.getDate()} ${months[rangeStart.getMonth()]}`;
          return `${rangeStart.getDate()} ${months[rangeStart.getMonth()]}, ${rangeStart.getFullYear()}`;
        }
        return `${rangeStart.getDate()} ${months[rangeStart.getMonth()]} — ${rangeEnd.getDate()} ${months[rangeEnd.getMonth()]}`;
      }
      if (rangeStart) return `${rangeStart.getDate()} ${months[rangeStart.getMonth()]} — ...`;
      return "Selecionar período";
    }
    const d = selectedDate;
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }, [selectedDate, filterMode, rangeStart, rangeEnd]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  }, [calendarMonth]);

  const isInRange = useCallback((day: Date) => {
    if (filterMode !== "intervalo" || !rangeStart) return false;
    if (!rangeEnd) return sameDay(day, rangeStart);
    const t = day.getTime();
    const s = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).getTime();
    const e = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate()).getTime();
    return t >= s && t <= e;
  }, [filterMode, rangeStart, rangeEnd]);

  const isRangeStart = useCallback((day: Date) => {
    return filterMode === "intervalo" && rangeStart && sameDay(day, rangeStart);
  }, [filterMode, rangeStart]);

  const isRangeEnd = useCallback((day: Date) => {
    return filterMode === "intervalo" && rangeEnd && sameDay(day, rangeEnd);
  }, [filterMode, rangeEnd]);

  const handleCalDayClick = useCallback((day: Date) => {
    if (filterMode === "intervalo") {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(day);
        setRangeEnd(null);
      } else {
        if (day.getTime() < rangeStart.getTime()) {
          setRangeEnd(rangeStart);
          setRangeStart(day);
        } else {
          setRangeEnd(day);
        }
        setCalendarOpen(false);
      }
    } else {
      setSelectedDate(new Date(day.getFullYear(), day.getMonth(), 1));
      setCalendarOpen(false);
    }
  }, [filterMode, rangeStart, rangeEnd]);

  const handleMonthClick = useCallback((monthIndex: number) => {
    setSelectedDate(new Date(calendarMonth.getFullYear(), monthIndex, 1));
    setCalendarOpen(false);
  }, [calendarMonth]);

  const taxaCalculada = useMemo(() => {
    const selectedLote = lotes.find((l) => l.id === Number(form.loteId));
    const total = Number(form.total) || 0;
    if (!selectedLote || selectedLote.aves === 0 || total === 0) return "—";
    const taxa = (total / selectedLote.aves) * 100;
    return taxa.toFixed(1) + "%";
  }, [form.loteId, form.total, lotes]);

  /* KPIs */
  const kpis = useMemo(() => {
    const todayTotal = registros.slice(0, 1).reduce((s, r) => s + r.total, 0);
    const todayQuebrados = registros.slice(0, 1).reduce((s, r) => s + r.quebrados, 0);
    const todaySujos = registros.slice(0, 1).reduce((s, r) => s + r.sujos, 0);
    const weeklyAvg = Math.round(registros.reduce((s, r) => s + r.total, 0) / (registros.length || 1));
    const totalAves = lotes.reduce((s, l) => s + l.aves, 0);
    const taxaPostura = totalAves > 0 ? ((todayTotal / totalAves) * 100).toFixed(1) : "0";
    const metaDiaria = 2600;
    const metaPercent = ((todayTotal / metaDiaria) * 100).toFixed(0);

    const qualidade = ((1 - (todayQuebrados + todaySujos) / (todayTotal || 1)) * 100);
    const metaPostura = 90;
    const metaQualidade = 98;
    const metaMediaSemanal = 2500;
    const diffPostura = (Number(taxaPostura) - metaPostura).toFixed(1);
    const diffQualidade = (qualidade - metaQualidade).toFixed(1);
    const diffMedia = (((weeklyAvg - metaMediaSemanal) / metaMediaSemanal) * 100).toFixed(1);

    return [
      {
        title: "Produção Hoje",
        value: todayTotal.toLocaleString("pt-BR"),
        icon: Egg,
        iconBg: "bg-brand-50",
        iconColor: "text-brand-600",
        actual: todayTotal,
        expectedVal: metaDiaria,
        expectedLabel: metaDiaria.toLocaleString("pt-BR"),
        unit: "ovos",
        progress: Number(metaPercent),
        progressColor: Number(metaPercent) >= 100 ? "bg-emerald-500" : Number(metaPercent) >= 90 ? "bg-amber-500" : "bg-red-500",
        diff: Number(metaPercent) - 100,
        diffLabel: `${(Number(metaPercent) - 100) > 0 ? "+" : ""}${(Number(metaPercent) - 100).toFixed(1)}%`,
        subtitle: `${metaPercent}% do esperado`,
      },
      {
        title: "Taxa de Postura",
        value: `${taxaPostura}%`,
        icon: Target,
        iconBg: "bg-violet-50",
        iconColor: "text-violet-600",
        actual: Number(taxaPostura),
        expectedVal: metaPostura,
        expectedLabel: `${metaPostura}%`,
        unit: "",
        progress: Math.min(Number(taxaPostura), 100),
        progressColor: Number(taxaPostura) >= 90 ? "bg-emerald-500" : Number(taxaPostura) >= 85 ? "bg-amber-500" : "bg-red-500",
        diff: Number(diffPostura),
        diffLabel: `${Number(diffPostura) > 0 ? "+" : ""}${diffPostura}%`,
        subtitle: "Padrão: 85-92%",
      },
      {
        title: "Qualidade",
        value: `${qualidade.toFixed(1)}%`,
        icon: AlertTriangle,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        actual: qualidade,
        expectedVal: metaQualidade,
        expectedLabel: `${metaQualidade}%`,
        unit: "",
        progress: qualidade,
        progressColor: qualidade >= metaQualidade ? "bg-emerald-500" : qualidade >= 96 ? "bg-amber-400" : "bg-red-500",
        diff: Number(diffQualidade),
        diffLabel: `${Number(diffQualidade) > 0 ? "+" : ""}${diffQualidade}%`,
        subtitle: `${todayQuebrados} quebrados · ${todaySujos} sujos`,
      },
      {
        title: "Média Semanal de Postura",
        value: weeklyAvg.toLocaleString("pt-BR"),
        icon: Activity,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        actual: weeklyAvg,
        expectedVal: metaMediaSemanal,
        expectedLabel: metaMediaSemanal.toLocaleString("pt-BR"),
        unit: "ovos",
        progress: Math.min((weeklyAvg / metaMediaSemanal) * 100, 100),
        progressColor: weeklyAvg >= metaMediaSemanal ? "bg-emerald-500" : weeklyAvg >= metaMediaSemanal * 0.9 ? "bg-amber-500" : "bg-red-500",
        diff: Number(diffMedia),
        diffLabel: `${Number(diffMedia) > 0 ? "+" : ""}${diffMedia}%`,
        subtitle: `${registros.length} registros`,
      },
    ];
  }, [registros, lotes]);

  /* Insights */
  const insights = useMemo(() => {
    const arr: { type: "success" | "warning" | "info"; title: string; action: string }[] = [];
    const todayTotal = registros[0]?.total || 0;
    const metaDiaria = 2600;

    if (todayTotal >= metaDiaria) {
      arr.push({ type: "success", title: `Produção acima da meta (+${((todayTotal / metaDiaria - 1) * 100).toFixed(0)}%)`, action: "Manter condições atuais de manejo e alimentação" });
    } else {
      const diff = (((metaDiaria - todayTotal) / metaDiaria) * 100).toFixed(0);
      arr.push({ type: "warning", title: `Produção abaixo do esperado (-${diff}%)`, action: "Verificar ventilação e consumo de ração" });
    }

    const quebrados = registros[0]?.quebrados || 0;
    const sujos = registros[0]?.sujos || 0;
    const perdaRate = ((quebrados + sujos) / (todayTotal || 1) * 100).toFixed(1);
    if ((quebrados + sujos) / (todayTotal || 1) > 0.01) {
      arr.push({ type: "warning", title: `Qualidade caiu ${perdaRate}% na última semana`, action: "Possível problema nutricional — revisar ração e suplementos" });
    }

    const lowPerformance = lotes.filter(l => {
      const p = parseFloat(l.postura);
      return !isNaN(p) && p < 85;
    });
    if (lowPerformance.length > 0) {
      arr.push({ type: "warning", title: `${lowPerformance.map(l => l.codigo).join(", ")} com postura abaixo de 85%`, action: "Avaliar saúde do lote e ajustar dieta" });
    }

    const weeklyAvg = Math.round(registros.reduce((s, r) => s + r.total, 0) / (registros.length || 1));
    if (weeklyAvg >= metaDiaria * 0.95) {
      arr.push({ type: "success", title: `Média semanal estável (${weeklyAvg.toLocaleString("pt-BR")} ovos)`, action: "Ritmo consistente — manter práticas atuais" });
    } else {
      arr.push({ type: "info", title: `Média semanal abaixo da meta (${weeklyAvg.toLocaleString("pt-BR")} ovos)`, action: "Intensificar coleta e revisar horários de alimentação" });
    }

    arr.push({ type: "info", title: "Queda de produção nos fins de semana detectada", action: "Reforçar equipe de coleta aos sábados e domingos" });

    return arr;
  }, [registros, lotes]);

  const filteredRegistros = useMemo(() => {
    if (!searchQuery.trim()) return registros;
    const q = searchQuery.toLowerCase();
    return registros.filter(r =>
      r.loteCodigo.toLowerCase().includes(q) ||
      r.data.includes(q) ||
      r.taxa.includes(q)
    );
  }, [registros, searchQuery]);

  function openAdd() {
    setForm({ loteId: "", data: "", total: "", quebrados: "", sujos: "", descartados: "" });
    setEditing(null);
    setModal("add");
  }

  function openEdit(r: Registro) {
    setForm({
      loteId: String(r.loteId),
      data: r.data,
      total: String(r.total),
      quebrados: String(r.quebrados),
      sujos: String(r.sujos),
      descartados: String(r.descartados),
    });
    setEditing(r);
    setModal("edit");
  }

  function save() {
    const loteId = Number(form.loteId);
    const selectedLote = lotes.find((l) => l.id === loteId);
    if (!selectedLote || !form.data.trim()) return;

    const total = Number(form.total) || 0;
    const quebrados = Number(form.quebrados) || 0;
    const sujos = Number(form.sujos) || 0;
    const descartados = Number(form.descartados) || 0;
    const taxa = selectedLote.aves > 0 ? ((total / selectedLote.aves) * 100).toFixed(1) + "%" : "—";

    const registro: Registro = {
      id: editing?.id || Date.now(),
      loteId,
      loteCodigo: selectedLote.codigo,
      data: form.data,
      total,
      quebrados,
      sujos,
      descartados,
      taxa,
    };

    if (modal === "add") {
      setRegistros((prev) => [registro, ...prev]);
    } else if (editing) {
      setRegistros((prev) => prev.map((r) => (r.id === editing.id ? registro : r)));
    }

    setLotes((prev) =>
      prev.map((l) => (l.id === loteId ? { ...l, postura: taxa } : l))
    );

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
            <Egg className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Produção de Ovos</h1>
            <p className="text-sm text-gray-500 mt-0.5">Acompanhe a produção diária, qualidade e tendências</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={calendarRef}>
            <button
              onClick={() => setCalendarOpen(!calendarOpen)}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm"
            >
              <CalendarDays className="w-4 h-4" />
              {calendarLabel}
            </button>

            {calendarOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 z-50 w-[320px] animate-in fade-in zoom-in-95 duration-150">
                {/* Mode selector */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-4">
                  {([
                    { key: "intervalo" as const, label: "Intervalo" },
                    { key: "mes" as const, label: "Mês" },
                  ]).map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setFilterMode(p.key)}
                      className={cn(
                        "flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                        filterMode === p.key
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Range hint */}
                {filterMode === "intervalo" && (
                  <p className="text-[10px] text-gray-400 font-medium mb-2 text-center">
                    {!rangeStart || (rangeStart && rangeEnd) ? "Clique no dia inicial" : "Clique no dia final"}
                  </p>
                )}

                {/* Month navigation */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-500" />
                  </button>
                  <span className="text-sm font-semibold text-gray-900">
                    {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </span>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {filterMode === "mes" ? (
                  <div className="grid grid-cols-3 gap-2">
                    {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((m, i) => {
                      const isSelected = selectedDate.getMonth() === i && selectedDate.getFullYear() === calendarMonth.getFullYear();
                      return (
                        <button
                          key={m}
                          onClick={() => handleMonthClick(i)}
                          className={cn(
                            "py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
                            isSelected ? "bg-brand-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-7 gap-0 mb-1">
                      {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                        <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0">
                      {calendarDays.map((day, i) => {
                        if (!day) return <div key={`empty-${i}`} className="h-9" />;
                        const today = new Date();
                        const isToday = sameDay(day, today);
                        const inRange = isInRange(day);
                        const isStart = isRangeStart(day);
                        const isEnd = isRangeEnd(day);
                        const isSingle = isStart && isEnd;

                        return (
                          <button
                            key={i}
                            onClick={() => handleCalDayClick(day)}
                            className={cn(
                              "h-9 text-sm font-medium transition-all duration-150 cursor-pointer relative flex items-center justify-center",
                              inRange && !isStart && !isEnd && "bg-brand-50 text-brand-700",
                              isStart && !isSingle && "bg-brand-600 text-white rounded-l-xl",
                              isEnd && !isSingle && "bg-brand-600 text-white rounded-r-xl",
                              isSingle && "bg-brand-600 text-white rounded-xl shadow-sm",
                              !inRange && "hover:bg-gray-100 rounded-xl",
                            )}
                          >
                            <span className={cn(
                              isToday && !inRange && "w-7 h-7 rounded-full border-2 border-brand-500 flex items-center justify-center",
                            )}>
                              {day.getDate()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                <button
                  onClick={() => {
                    const today = new Date();
                    setRangeStart(today);
                    setRangeEnd(today);
                    setSelectedDate(today);
                    setCalendarMonth(today);
                    setFilterMode("intervalo");
                    setCalendarOpen(false);
                  }}
                  className="w-full mt-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer"
                >
                  Hoje
                </button>
              </div>
            )}
          </div>
          <button onClick={openAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20">
            <Plus className="w-4 h-4" />
            Registrar Produção
          </button>
        </div>
      </div>

      {/* Resumo de Hoje */}
      <div className="bg-gradient-to-r from-amber-50 via-amber-50/50 to-white rounded-2xl border border-amber-200/60 p-5 transition-all duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Health Score */}
          <div className="flex items-center gap-4 lg:min-w-[280px]">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                <circle cx="32" cy="32" r="28" fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(45 / 100) * 175.9} 175.9`} className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-bold text-amber-700">45</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-gray-900">Saúde Produtiva</span>
              </div>
              <p className="text-xl font-bold mt-0.5 text-amber-700">Atenção</p>
              <p className="text-xs text-gray-500 mt-0.5">Postura: 88.5% | Meta: 92% | Perdas: 3.5%</p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-14 bg-gray-200" />

          {/* Action Items */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className="text-sm text-gray-700">Produção abaixo da meta (-4%) — verificar ventilação</p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className="text-sm text-gray-700">Quebras acima do normal (+0.8%) — revisar coleta</p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100">
                <TrendingDown className="w-3.5 h-3.5 text-red-600" />
              </div>
              <p className="text-sm text-gray-700">Lote C com postura em queda — monitorar ração</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", kpi.iconBg)}>
                <kpi.icon className={cn("w-4.5 h-4.5", kpi.iconColor)} />
              </div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{kpi.title}</span>
            </div>

            {/* Actual value + diff badge */}
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{kpi.value}</p>
              <span className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full",
                kpi.diff >= 0 ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
              )}>
                {kpi.diff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.diffLabel}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">{kpi.subtitle}</p>

            {/* Bullet-style progress bar with target marker */}
            {(() => {
              const maxVal = Math.max(kpi.actual, kpi.expectedVal) * 1.08;
              const fillPct = Math.min((kpi.actual / maxVal) * 100, 100);
              const markerPct = Math.min((kpi.expectedVal / maxVal) * 100, 100);
              return (
                <div className="mt-4 relative">
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-700", kpi.progressColor)} style={{ width: `${fillPct}%` }} />
                  </div>
                  <div
                    className="absolute top-[-3px] w-0.5 h-4 bg-gray-800 rounded-full"
                    style={{ left: `${markerPct}%` }}
                    title={`Esperado: ${kpi.expectedLabel}`}
                  />
                </div>
              );
            })()}

            {/* Expected vs Actual labels */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                <span className="text-[10px] text-gray-500 font-medium">Esperado: {kpi.expectedLabel} {kpi.unit}</span>
              </div>
              <span className={cn(
                "text-[10px] font-semibold",
                kpi.diff >= 0 ? "text-emerald-600" : "text-red-500"
              )}>
                {kpi.diff >= 0 ? "Acima" : "Abaixo"} do esperado
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights + Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assistente de Granja */}
        {insights.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Assistente de Granja</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Baseado nos últimos 7 dias</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 flex-shrink-0">
                <Sparkles className="w-3 h-3" />
                Premium
              </span>
            </div>
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
              {insights.map((ins, i) => (
                <div key={i} className={cn(
                  "p-3.5 rounded-xl border-l-[3px]",
                  ins.type === "success" && "bg-emerald-50/50 border-l-emerald-500",
                  ins.type === "warning" && "bg-amber-50/50 border-l-amber-500",
                  ins.type === "info" && "bg-blue-50/50 border-l-blue-500",
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                      ins.type === "success" && "bg-emerald-100",
                      ins.type === "warning" && "bg-amber-100",
                      ins.type === "info" && "bg-blue-100",
                    )}>
                      {ins.type === "success" && <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />}
                      {ins.type === "warning" && <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />}
                      {ins.type === "info" && <Lightbulb className="w-2.5 h-2.5 text-blue-600" />}
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{ins.title}</span>
                  </div>
                  <p className={cn(
                    "text-xs font-medium ml-7",
                    ins.type === "success" ? "text-emerald-600" : ins.type === "warning" ? "text-amber-600" : "text-blue-600"
                  )}>
                    → {ins.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Production Metrics */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Resumo Financeiro</h3>
              <p className="text-[11px] text-gray-400 font-medium">Indicadores de custo e receita</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 flex-shrink-0">
              <Sparkles className="w-3 h-3" />
              Pro
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* Custo por Ovo */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <Egg className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Custo/Ovo</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors cursor-pointer">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Custo/Ovo?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Valor gasto para produzir cada ovo, incluindo ração, mão de obra, energia e insumos.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: Custo Total / Total de Ovos</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">R$ 0,42</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-400">Esperado: R$ 0,38</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3" />
                  +10.5%
                </span>
              </div>
            </div>
            {/* Margem */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Margem</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors cursor-pointer">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Margem?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Diferença percentual entre a receita e o custo total de produção. Margem alta indica maior lucro por ovo produzido.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: (Receita - Custo) / Receita × 100</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">32.4%</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-400">Esperado: 38%</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                  <ArrowDownRight className="w-3 h-3" />
                  -5.6%
                </span>
              </div>
            </div>
            {/* Receita do Dia */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Receita/Dia</span>
              </div>
              <p className="text-xl font-bold text-gray-900">R$ 1.520</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-400">Esperado: R$ 1.600</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                  <ArrowDownRight className="w-3 h-3" />
                  -5.0%
                </span>
              </div>
            </div>
            {/* Eficiência Alimentar */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Wheat className="w-4 h-4 text-violet-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Efic. Alimentar</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors cursor-pointer">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Eficiência Alimentar?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Quantidade de ração consumida para produzir cada ovo. Quanto menor, mais eficiente.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: Ração Total (kg) / Total de Ovos</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">0,128 kg</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-400">Esperado: 0,120 kg</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3" />
                  +6.7%
                </span>
              </div>
            </div>
            {/* Receita por Ave */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <CircleDollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Receita/Ave</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors cursor-pointer">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Receita/Ave?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Receita média gerada por cada ave no período. Indica a produtividade econômica do plantel.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: Receita Total / Nº de Aves</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">R$ 0,52</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-400">Esperado: R$ 0,55</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                  <ArrowDownRight className="w-3 h-3" />
                  -5.5%
                </span>
              </div>
            </div>
            {/* Perda Diária (R$) */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <AlertOctagon className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Perda/Dia</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors cursor-pointer">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Perda Diária?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Valor em reais perdido diariamente com ovos quebrados, sujos e descartados.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: (Quebrados + Sujos + Descartados) × Preço/Ovo</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">R$ 18,50</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-400">Tolerado: R$ 12,00</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3" />
                  +54.2%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Production Curve — 2/3 width */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Curva de Produção</h3>
              <p className="text-xs text-gray-400 mt-0.5">Produção vs Meta (esta semana)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                <span className="text-[10px] font-medium text-gray-400">Produção</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-0.5 bg-gray-300" style={{ borderTop: "2px dashed #d1d5db" }} />
                <span className="text-[10px] font-medium text-gray-400">Meta</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={curvaProducao} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2d7a4f" stopOpacity={0.2} />
                  <stop offset="60%" stopColor="#2d7a4f" stopOpacity={0.05} />
                  <stop offset="100%" stopColor="#2d7a4f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} domain={[2200, 2900]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                formatter={(value: unknown, name: unknown) => [Number(value).toLocaleString("pt-BR"), String(name) === "ovos" ? "Produção" : "Meta"]}
              />
              <ReferenceLine y={2600} stroke="#d1d5db" strokeDasharray="6 4" strokeWidth={1.5} />
              <Area type="monotone" dataKey="ovos" stroke="#2d7a4f" strokeWidth={2.5} fill="url(#colorProd)" dot={{ r: 5, fill: "#fff", stroke: "#2d7a4f", strokeWidth: 2.5 }} activeDot={{ r: 7, fill: "#2d7a4f", stroke: "#fff", strokeWidth: 3 }} name="ovos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Production by Lote — 1/3 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900">Produção por Lote</h3>
            <p className="text-xs text-gray-400 mt-0.5">Taxa de postura por lote</p>
          </div>
          <div className="space-y-4">
            {producaoPorLote.map((item) => (
              <div key={item.lote}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">{item.lote}</span>
                    <span className="text-xs text-gray-400">{item.ovos} ovos</span>
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    item.taxa >= 90 ? "text-emerald-600" : item.taxa >= 85 ? "text-amber-600" : "text-red-600"
                  )}>
                    {item.taxa}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      item.taxa >= 90 ? "bg-emerald-500" : item.taxa >= 85 ? "bg-amber-400" : "bg-red-400"
                    )}
                    style={{ width: `${item.taxa}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> {"≥90%"}</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> 85-89%</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /> {"<85%"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quality + Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quality Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Qualidade dos Ovos</h3>
              <p className="text-xs text-gray-400 mt-0.5">Distribuição da produção de hoje</p>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{qualityData[0].value}% aproveitamento</span>
          </div>
          {/* Stacked bar */}
          <div className="w-full h-5 rounded-full overflow-hidden flex mt-4 mb-4">
            {qualityData.map((item) => (
              <div
                key={item.name}
                className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                style={{ width: `${item.value}%`, backgroundColor: item.color }}
              />
            ))}
          </div>
          {/* Legend rows */}
          <div className="space-y-0">
            {qualityData.map((item, i) => (
              <div key={item.name}>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-700 font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{item.qty.toLocaleString("pt-BR")} ovos</span>
                    <span className="text-xs font-bold text-gray-900 w-12 text-right">{item.value}%</span>
                  </div>
                </div>
                {i < qualityData.length - 1 && <div className="border-t border-gray-50" />}
              </div>
            ))}
          </div>
        </div>

        {/* Lotes Performance Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Desempenho dos Lotes</h3>
              <p className="text-xs text-gray-400 mt-0.5">Status de cada lote ativo</p>
            </div>
            <Link href="/dashboard/flocks" className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1 cursor-pointer">
              Ver todos
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {(() => {
            const lotesComPostura = lotes.filter(l => !isNaN(parseFloat(l.postura)));
            const avg = lotesComPostura.length > 0
              ? Math.round(lotesComPostura.reduce((s, l) => s + parseFloat(l.postura), 0) / lotesComPostura.length * 10) / 10
              : 0;
            return (
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Média geral: {avg}%</span>
              </div>
            );
          })()}
          <div className="space-y-0">
            {(() => {
              const lotesComPostura = lotes.filter(l => !isNaN(parseFloat(l.postura)));
              const avg = lotesComPostura.length > 0
                ? lotesComPostura.reduce((s, l) => s + parseFloat(l.postura), 0) / lotesComPostura.length
                : 0;
              return lotes.map((l, i) => {
                const taxa = parseFloat(l.postura);
                const hasPostura = !isNaN(taxa);
                const diff = hasPostura ? Math.round((taxa - avg) * 10) / 10 : 0;
                return (
                  <div key={l.id}>
                    <div className="flex items-center justify-between py-3 group">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                          hasPostura && taxa >= 90 ? "bg-emerald-50 text-emerald-700" :
                          hasPostura && taxa >= 85 ? "bg-amber-50 text-amber-700" :
                          hasPostura ? "bg-red-50 text-red-600" :
                          "bg-gray-50 text-gray-400"
                        )}>
                          {hasPostura ? `${taxa}%` : "—"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{l.codigo}</p>
                          <p className="text-[11px] text-gray-400">{l.raca} · {l.aves.toLocaleString("pt-BR")} aves</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPostura && diff > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <ArrowUpRight className="w-3 h-3" />
                            +{diff}% acima da média
                          </span>
                        )}
                        {hasPostura && diff === 0 && (
                          <span className="text-[10px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                            Na média geral
                          </span>
                        )}
                        {hasPostura && diff < 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                            <ArrowDownRight className="w-3 h-3" />
                            {diff}% abaixo da média
                          </span>
                        )}
                        {!hasPostura && (
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Sem Informação</span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 transition-colors" />
                      </div>
                    </div>
                    {i < lotes.length - 1 && <div className="border-t border-gray-50" />}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Recent Entries Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Registros Recentes</h3>
            <p className="text-xs text-gray-400 mt-0.5">{registros.length} registros</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-100/80 rounded-xl px-3 py-2 w-56 transition-colors focus-within:bg-gray-100 focus-within:ring-2 focus-within:ring-brand-500/20">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar registro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none w-full"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Lote</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Data</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Total</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Quebrados</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Sujos</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Descartados</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Taxa</th>
                <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Histórico</th>
                <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistros.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg">{r.loteCodigo}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatDate(r.data)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{r.total.toLocaleString("pt-BR")}</td>
                  <td className="px-6 py-4">
                    <span className={cn("text-sm font-medium", r.quebrados > 10 ? "text-red-600" : "text-gray-500")}>{r.quebrados}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("text-sm font-medium", r.sujos > 15 ? "text-amber-600" : "text-gray-500")}>{r.sujos}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{r.descartados}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-sm font-bold",
                      parseFloat(r.taxa) >= 90 ? "text-emerald-600" :
                      parseFloat(r.taxa) >= 85 ? "text-amber-600" :
                      parseFloat(r.taxa) >= 0 ? "text-red-600" : "text-gray-400"
                    )}>{r.taxa}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link href={`/dashboard/production/historico/${r.loteId}`} className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer">
                      <FileText className="w-4 h-4" />
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRegistros.length === 0 && (
                <tr><td colSpan={9} className="text-center py-16 text-gray-400 text-sm">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Registrar Produção" : "Editar Registro"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Auto-calculated taxa preview */}
            {taxaCalculada !== "—" && (
              <div className="bg-brand-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <Target className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-xs text-brand-600 font-medium">Taxa de postura estimada</p>
                  <p className="text-lg font-bold text-brand-700">{taxaCalculada}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lote</label>
                  <select
                    value={form.loteId}
                    onChange={(e) => setForm({ ...form, loteId: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer"
                  >
                    <option value="">Selecionar lote...</option>
                    {lotes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.codigo} — {l.raca} ({l.aves.toLocaleString("pt-BR")} aves)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Total de Ovos</label>
                <input
                  type="number"
                  value={form.total}
                  onChange={(e) => setForm({ ...form, total: e.target.value })}
                  placeholder="2450"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quebrados</label>
                  <input
                    type="number"
                    value={form.quebrados}
                    onChange={(e) => setForm({ ...form, quebrados: e.target.value })}
                    placeholder="12"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sujos</label>
                  <input
                    type="number"
                    value={form.sujos}
                    onChange={(e) => setForm({ ...form, sujos: e.target.value })}
                    placeholder="18"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descartados</label>
                  <input
                    type="number"
                    value={form.descartados}
                    onChange={(e) => setForm({ ...form, descartados: e.target.value })}
                    placeholder="5"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button
                onClick={save}
                disabled={!form.loteId || !form.data}
                className={cn(
                  "inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm",
                  form.loteId && form.data
                    ? "text-white bg-brand-600 hover:bg-brand-700"
                    : "text-gray-400 bg-gray-200 cursor-not-allowed"
                )}
              >
                <Check className="w-4 h-4" />
                Salvar
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Confirmar exclusão</h3>
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={() => deleteRegistro(deleteConfirm)} className="px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
