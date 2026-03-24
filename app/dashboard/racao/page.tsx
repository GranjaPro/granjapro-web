"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ModalPortal from "@/components/ui/modal-portal";
import {
  Wheat,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  HelpCircle,
  Search,
  Zap,
  Sparkles,
  Lightbulb,
  Target,
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Package,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ComposedChart,
  BarChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ── Types ── */
type TipoRacao = "milho" | "soja" | "comercial" | "custom";
type StatusEstoque = "normal" | "alerta" | "baixo";

interface RegistroRacao {
  id: number;
  data: string;
  tipo: TipoRacao;
  aviario: string;
  consumoKg: number;
  custoRS: number;
  qtdGalinhas: number;
}

interface ItemEstoque {
  id: number;
  nome: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  status: StatusEstoque;
  fornecedor?: string;
  localizacao?: string;
  lote?: string;
  dataChegada?: string;
}

const tipoLabel: Record<TipoRacao, string> = {
  milho: "Milho Mix",
  soja: "Soja Blend",
  comercial: "Comercial",
  custom: "Fórmula Custom",
};

const tipoColor: Record<TipoRacao, string> = {
  milho: "text-amber-800 bg-amber-100",
  soja: "text-orange-800 bg-orange-100",
  comercial: "text-emerald-800 bg-emerald-100",
  custom: "text-red-800 bg-red-100",
};

const statusColor: Record<StatusEstoque, string> = {
  normal: "text-emerald-700 bg-emerald-50",
  alerta: "text-amber-700 bg-amber-50",
  baixo: "text-red-700 bg-red-50",
};

const statusLabel: Record<StatusEstoque, string> = {
  normal: "Normal",
  alerta: "Alerta",
  baixo: "Baixo",
};

/* ── Mock Data ── */
const initialRegistros: RegistroRacao[] = [
  { id: 1, data: "2024-03-12", tipo: "milho", aviario: "Aviário 1A", consumoKg: 120, custoRS: 78.50, qtdGalinhas: 800 },
  { id: 2, data: "2024-03-12", tipo: "comercial", aviario: "Aviário 1B", consumoKg: 95, custoRS: 65.20, qtdGalinhas: 600 },
  { id: 3, data: "2024-03-11", tipo: "soja", aviario: "Aviário 2A", consumoKg: 110, custoRS: 72.35, qtdGalinhas: 1000 },
  { id: 4, data: "2024-03-11", tipo: "custom", aviario: "Aviário 3A", consumoKg: 85, custoRS: 58.90, qtdGalinhas: 500 },
  { id: 5, data: "2024-03-10", tipo: "comercial", aviario: "Aviário 1A", consumoKg: 125, custoRS: 62.46, qtdGalinhas: 800 },
  { id: 6, data: "2024-03-10", tipo: "milho", aviario: "Aviário 3B", consumoKg: 100, custoRS: 44.00, qtdGalinhas: 500 },
];

const initialEstoque: ItemEstoque[] = [
  { id: 1, nome: "Ração Postura Comercial", categoria: "Ração", quantidade: 1200, unidade: "kg", status: "normal", fornecedor: "AgroMix Ltda", localizacao: "Galpão A - Setor 1", lote: "RM-2024-0312", dataChegada: "2026-03-20" },
  { id: 2, nome: "Farelo de Soja", categoria: "Insumo", quantidade: 450, unidade: "kg", status: "normal", fornecedor: "Soja Brasil", localizacao: "Galpão A - Setor 2", lote: "FS-2024-0228", dataChegada: "2026-03-05" },
  { id: 3, nome: "Milho Moído", categoria: "Insumo", quantidade: 35, unidade: "kg", status: "baixo", fornecedor: "Grãos do Sul", localizacao: "Galpão B", lote: "MM-2024-0115", dataChegada: "2026-02-15" },
  { id: 4, nome: "Premix Vitaminas", categoria: "Suplemento", quantidade: 80, unidade: "kg", status: "normal", fornecedor: "NutriAves", localizacao: "Depósito", lote: "PV-2024-0310", dataChegada: "2026-03-18" },
  { id: 5, nome: "Calcita", categoria: "Mineral", quantidade: 320, unidade: "kg", status: "alerta", fornecedor: "MinBrasil", localizacao: "Galpão A - Setor 3", lote: "CA-2024-0201", dataChegada: "2026-03-01" },
  { id: 6, nome: "Fosfato Bicálcico", categoria: "Mineral", quantidade: 15, unidade: "kg", status: "baixo", fornecedor: "MinBrasil", localizacao: "Depósito", lote: "FB-2024-0105", dataChegada: "2026-01-20" },
];

const consumoMensal = [
  { mes: "Jan", valor: 4200 },
  { mes: "Fev", valor: 4500 },
  { mes: "Mar", valor: 4800 },
  { mes: "Abr", valor: 3800 },
  { mes: "Mai", valor: 4600 },
  { mes: "Jun", valor: 4700 },
];

const consumoDiario = [
  { dia: "06/03", kg: 780, ovos: 2450, eficiencia: 0.318 },
  { dia: "07/03", kg: 800, ovos: 2620, eficiencia: 0.305 },
  { dia: "08/03", kg: 818, ovos: 2700, eficiencia: 0.303 },
  { dia: "09/03", kg: 790, ovos: 2580, eficiencia: 0.306 },
  { dia: "10/03", kg: 825, ovos: 2650, eficiencia: 0.311 },
  { dia: "11/03", kg: 800, ovos: 2600, eficiencia: 0.308 },
  { dia: "12/03", kg: 818, ovos: 2500, eficiencia: 0.327 },
];

/* ── Consumo por Tipo ── */
const consumoPorTipo = [
  { tipo: "Milho Mix", kg: 220, pct: 35, color: "#f59e0b" },
  { tipo: "Comercial", kg: 220, pct: 34, color: "#10b981" },
  { tipo: "Soja Blend", kg: 110, pct: 17, color: "#f97316" },
  { tipo: "Custom", kg: 85, pct: 14, color: "#ef4444" },
];

type ModalMode = "add" | "edit" | null;

export default function RacaoPage() {
  const searchParams = useSearchParams();
  const [registros, setRegistros] = useState(initialRegistros);
  const [estoque, setEstoque] = useState(initialEstoque);
  const [estoqueModal, setEstoqueModal] = useState<"add" | "view" | null>(null);
  const [estoqueForm, setEstoqueForm] = useState({ nome: "", categoria: "Ração", quantidade: "", unidade: "kg", status: "normal" as StatusEstoque, fornecedor: "", localizacao: "", lote: "", dataChegada: "" });
  const [viewingEstoque, setViewingEstoque] = useState<ItemEstoque | null>(null);
  const [editingEstoque, setEditingEstoque] = useState(false);
  const [editEstoqueForm, setEditEstoqueForm] = useState({ nome: "", categoria: "", quantidade: "", unidade: "", status: "normal" as StatusEstoque, fornecedor: "", localizacao: "", lote: "", dataChegada: "" });
  const [modal, setModal] = useState<ModalMode>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (searchParams.get("register") === "true") setModal("add");
  }, [searchParams]);
  const isOldStock = useCallback((dataChegada?: string) => {
    if (!dataChegada) return false;
    const arrival = new Date(dataChegada + "T00:00:00");
    const now = new Date();
    const diffMs = now.getTime() - arrival.getTime();
    return diffMs > 14 * 24 * 60 * 60 * 1000;
  }, []);

  const [editing, setEditing] = useState<RegistroRacao | null>(null);
  const [form, setForm] = useState({ data: "", tipo: "comercial" as TipoRacao, aviario: "", consumoKg: "", custoRS: "", qtdGalinhas: "" });
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

  /* KPIs */
  const kpis = useMemo(() => {
    const totalConsumo = registros.reduce((s, r) => s + r.consumoKg, 0);
    const totalCusto = registros.reduce((s, r) => s + r.custoRS, 0);
    const avgConsumoPorGalinha = registros.length > 0 ? (registros.reduce((s, r) => s + (r.qtdGalinhas > 0 ? r.consumoKg / r.qtdGalinhas : 0), 0) / registros.length * 1000) : 0;
    const custoPorKg = totalConsumo > 0 ? (totalCusto / totalConsumo) : 0;
    const estoqueBaixo = estoque.filter((e) => e.status === "baixo" || e.status === "alerta").length;

    const metaConsumoDiario = 800;
    const consumoHoje = 410;
    const metaCustoTotal = 420;
    const metaConsumoPorGalinha = 120;
    const metaCustoOvo = 0.04;

    const diffConsumo = ((consumoHoje / metaConsumoDiario) * 100) - 100;
    const diffCusto = ((totalCusto / metaCustoTotal) * 100) - 100;
    const diffConsumoGalinha = ((avgConsumoPorGalinha / metaConsumoPorGalinha) * 100) - 100;

    return [
      {
        title: "Consumo Diário",
        value: consumoHoje + " kg",
        icon: Wheat,
        iconBg: "bg-brand-50",
        iconColor: "text-brand-600",
        actual: consumoHoje,
        expectedVal: metaConsumoDiario,
        expectedLabel: metaConsumoDiario + " kg",
        unit: "kg",
        progress: Math.min((consumoHoje / metaConsumoDiario) * 100, 100),
        progressColor: consumoHoje <= metaConsumoDiario ? "bg-emerald-500" : consumoHoje <= metaConsumoDiario * 1.1 ? "bg-amber-500" : "bg-red-500",
        diff: diffConsumo,
        diffLabel: `${diffConsumo > 0 ? "+" : ""}${diffConsumo.toFixed(1)}%`,
        subtitle: `${((consumoHoje / metaConsumoDiario) * 100).toFixed(0)}% do esperado`,
      },
      {
        title: "Custo Total",
        value: "R$ 381,41",
        icon: DollarSign,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        actual: 381.41,
        expectedVal: metaCustoTotal,
        expectedLabel: "R$ " + metaCustoTotal.toFixed(2).replace(".", ","),
        unit: "",
        progress: Math.min((381.41 / (metaCustoTotal * 1.3)) * 100, 100),
        progressColor: 381.41 <= metaCustoTotal ? "bg-emerald-500" : 381.41 <= metaCustoTotal * 1.1 ? "bg-amber-500" : "bg-red-500",
        diff: ((381.41 / metaCustoTotal) * 100) - 100,
        diffLabel: `${((381.41 / metaCustoTotal) * 100) - 100 > 0 ? "+" : ""}${(((381.41 / metaCustoTotal) * 100) - 100).toFixed(1)}%`,
        subtitle: "Menor é melhor",
      },
      {
        title: "Consumo / Galinha",
        value: avgConsumoPorGalinha.toFixed(0) + " g",
        icon: Activity,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        actual: avgConsumoPorGalinha,
        expectedVal: metaConsumoPorGalinha,
        expectedLabel: metaConsumoPorGalinha + " g",
        unit: "g",
        progress: Math.min((avgConsumoPorGalinha / (metaConsumoPorGalinha * 1.3)) * 100, 100),
        progressColor: avgConsumoPorGalinha <= metaConsumoPorGalinha ? "bg-emerald-500" : avgConsumoPorGalinha <= metaConsumoPorGalinha * 1.1 ? "bg-amber-500" : "bg-red-500",
        diff: diffConsumoGalinha,
        diffLabel: `${diffConsumoGalinha > 0 ? "+" : ""}${diffConsumoGalinha.toFixed(1)}%`,
        subtitle: "Padrão: 110-130g",
      },
      {
        title: "Custo / Ovo",
        value: "R$ 0,05",
        icon: Target,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        actual: 0.05,
        expectedVal: metaCustoOvo,
        expectedLabel: "R$ " + metaCustoOvo.toFixed(2),
        unit: "",
        progress: Math.min((0.05 / (metaCustoOvo * 1.5)) * 100, 100),
        progressColor: 0.05 <= metaCustoOvo ? "bg-emerald-500" : 0.05 <= metaCustoOvo * 1.2 ? "bg-amber-500" : "bg-red-500",
        diff: ((0.05 / metaCustoOvo) * 100) - 100,
        diffLabel: `+${(((0.05 / metaCustoOvo) * 100) - 100).toFixed(1)}%`,
        subtitle: `${estoqueBaixo} itens em alerta`,
      },
    ];
  }, [registros, estoque]);

  /* Insights */
  const insights = useMemo(() => {
    const arr: { type: "success" | "warning" | "info"; title: string; action: string }[] = [];
    const estoqueBaixo = estoque.filter((e) => e.status === "baixo");
    const estoqueAlerta = estoque.filter((e) => e.status === "alerta");

    if (estoqueBaixo.length > 0) {
      arr.push({ type: "warning", title: `${estoqueBaixo.length} itens com estoque crítico`, action: `Repor urgente: ${estoqueBaixo.map(e => e.nome).join(", ")}` });
    }

    if (estoqueAlerta.length > 0) {
      arr.push({ type: "warning", title: `${estoqueAlerta.length} itens em nível de alerta`, action: `Programar reposição: ${estoqueAlerta.map(e => e.nome).join(", ")}` });
    }

    const avgCusto = registros.length > 0 ? registros.reduce((s, r) => s + r.custoRS, 0) / registros.length : 0;
    if (avgCusto > 50) {
      arr.push({ type: "warning", title: "Custo médio por registro acima de R$ 50", action: "Avaliar fornecedores alternativos ou negociar preços" });
    } else {
      arr.push({ type: "success", title: "Custo médio dentro do esperado", action: "Manter fornecedores e fórmula atual" });
    }

    arr.push({ type: "info", title: "Consumo estável nos últimos 7 dias", action: "Ritmo consistente — manter práticas atuais de alimentação" });
    arr.push({ type: "info", title: "Considere ajustar fórmula para o período de calor", action: "Reduzir ração energética e aumentar suplementação hídrica" });

    return arr;
  }, [registros, estoque]);

  const filteredRegistros = useMemo(() => {
    if (!searchQuery.trim()) return registros;
    const q = searchQuery.toLowerCase();
    return registros.filter(r =>
      r.aviario.toLowerCase().includes(q) ||
      r.data.includes(q) ||
      tipoLabel[r.tipo].toLowerCase().includes(q)
    );
  }, [registros, searchQuery]);

  function openAdd() {
    setForm({ data: "", tipo: "comercial", aviario: "", consumoKg: "", custoRS: "", qtdGalinhas: "" });
    setEditing(null);
    setModal("add");
  }

  function openEdit(r: RegistroRacao) {
    setForm({ data: r.data, tipo: r.tipo, aviario: r.aviario, consumoKg: String(r.consumoKg), custoRS: String(r.custoRS), qtdGalinhas: String(r.qtdGalinhas) });
    setEditing(r);
    setModal("edit");
  }

  function save() {
    if (!form.data.trim() || !form.aviario.trim()) return;
    const registro: RegistroRacao = {
      id: editing?.id || Date.now(),
      data: form.data,
      tipo: form.tipo,
      aviario: form.aviario,
      consumoKg: Number(form.consumoKg) || 0,
      custoRS: Number(form.custoRS) || 0,
      qtdGalinhas: Number(form.qtdGalinhas) || 0,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
            <Wheat className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestão de Ração</h1>
            <p className="text-sm text-gray-500 mt-0.5">Acompanhe consumo, custos e estoque de alimentação</p>
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

                {filterMode === "intervalo" && (
                  <p className="text-[10px] text-gray-400 font-medium mb-2 text-center">
                    {!rangeStart || (rangeStart && rangeEnd) ? "Clique no dia inicial" : "Clique no dia final"}
                  </p>
                )}

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
            Registrar Consumo
          </button>
        </div>
      </div>

      {/* Resumo de Hoje — Saúde Alimentar */}
      {(() => {
        const estoqueBaixo = estoque.filter((e) => e.status === "baixo").length;
        const estoqueAlerta = estoque.filter((e) => e.status === "alerta").length;
        const totalProblems = estoqueBaixo + estoqueAlerta;
        const score = totalProblems === 0 ? 92 : totalProblems <= 2 ? 65 : 35;
        const scoreColor = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
        const bannerGradient = score >= 80 ? "from-emerald-50 via-emerald-50/50 to-white" : score >= 50 ? "from-amber-50 via-amber-50/50 to-white" : "from-red-50 via-red-50/50 to-white";
        const bannerBorder = score >= 80 ? "border-emerald-200/60" : score >= 50 ? "border-amber-200/60" : "border-red-200/60";
        const statusText = score >= 80 ? "Saudável" : score >= 50 ? "Atenção" : "Crítico";
        const statusTextColor = score >= 80 ? "text-emerald-700" : score >= 50 ? "text-amber-700" : "text-red-700";

        return (
          <div className={cn("bg-gradient-to-r rounded-2xl border p-5 transition-all duration-300", bannerGradient, bannerBorder)}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-center gap-4 lg:min-w-[280px]">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke={scoreColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(score / 100) * 175.9} 175.9`} className="transition-all duration-700" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn("text-base font-bold", statusTextColor)}>{score}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Wheat className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-bold text-gray-900">Saúde Alimentar</span>
                  </div>
                  <p className={cn("text-xl font-bold mt-0.5", statusTextColor)}>{statusText}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Consumo: 410 kg/dia | Meta: 800 kg | Estoque: {estoqueBaixo} críticos</p>
                </div>
              </div>

              <div className="hidden lg:block w-px h-14 bg-gray-200" />

              <div className="flex-1 space-y-2">
                {estoqueBaixo > 0 && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    </div>
                    <p className="text-sm text-gray-700">{estoqueBaixo} itens com estoque crítico — reposição urgente</p>
                  </div>
                )}
                {estoqueAlerta > 0 && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <p className="text-sm text-gray-700">{estoqueAlerta} itens em nível de alerta — programar compra</p>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100">
                    <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <p className="text-sm text-gray-700">Custo médio por kg subiu 2% — renegociar fornecedor</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* KPI Cards — Production Style with Progress Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
            <div className="flex items-center gap-2.5 mb-4">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", kpi.iconBg)}>
                <kpi.icon className={cn("w-4.5 h-4.5", kpi.iconColor)} />
              </div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{kpi.title}</span>
            </div>

            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{kpi.value}</p>
              <span className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full",
                kpi.diff <= 0 ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
              )}>
                {kpi.diff <= 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                {kpi.diffLabel}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">{kpi.subtitle}</p>

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

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                <span className="text-[10px] text-gray-500 font-medium">Esperado: {kpi.expectedLabel}</span>
              </div>
              <span className={cn(
                "text-[10px] font-semibold",
                kpi.diff <= 0 ? "text-emerald-600" : "text-red-500"
              )}>
                {kpi.diff <= 0 ? "Dentro" : "Acima"} do esperado
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights + Financial Metrics */}
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

        {/* Financial Feed Metrics */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Resumo Financeiro</h3>
              <p className="text-[11px] text-gray-400 font-medium">Indicadores de custo de alimentação</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 flex-shrink-0">
              <Sparkles className="w-3 h-3" />
              Pro
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Custo / Dúzia */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Custo/Dúzia</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Custo/Dúzia?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Custo de ração para produzir uma dúzia de ovos. Indica eficiência econômica da alimentação.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: Custo Total Ração / (Total Ovos / 12)</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">R$ 5,04</p>
              <div className="flex items-center justify-between mt-2 gap-1">
                <span className="text-[10px] text-gray-400 truncate">Esperado: R$ 4,56</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <ArrowUpRight className="w-3 h-3" />
                  +10.5%
                </span>
              </div>
            </div>
            {/* Custo/kg */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Wheat className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Custo/kg</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Custo/kg?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Preço médio pago por quilograma de ração. Quanto menor, mais econômico.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: Custo Total / kg Total</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">R$ 0,46</p>
              <div className="flex items-center justify-between mt-2 gap-1">
                <span className="text-[10px] text-gray-400 truncate">Esperado: R$ 0,42</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <ArrowUpRight className="w-3 h-3" />
                  +9.5%
                </span>
              </div>
            </div>
            {/* Economia Mensal */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Economia/Mês</span>
              </div>
              <p className="text-xl font-bold text-gray-900">R$ 320</p>
              <div className="flex items-center justify-between mt-2 gap-1">
                <span className="text-[10px] text-gray-400 truncate">Meta: R$ 500</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <ArrowDownRight className="w-3 h-3" />
                  64%
                </span>
              </div>
            </div>
            {/* Eficiência Alimentar */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-violet-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Efic. Alimentar</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Eficiência Alimentar?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Quantidade de ração consumida para produzir cada ovo. Quanto menor, mais eficiente.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: Ração Total (kg) / Total Ovos</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">0,128 kg</p>
              <div className="flex items-center justify-between mt-2 gap-1">
                <span className="text-[10px] text-gray-400 truncate">Esperado: 0,120 kg</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <ArrowUpRight className="w-3 h-3" />
                  +6.7%
                </span>
              </div>
            </div>
            {/* Custo/Ave */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Custo/Ave</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Custo/Ave?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Custo diário de alimentação por ave. Indica eficiência econômica do plantel.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: Custo Total / Nº de Aves</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">R$ 0,10</p>
              <div className="flex items-center justify-between mt-2 gap-1">
                <span className="text-[10px] text-gray-400 truncate">Esperado: R$ 0,09</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <ArrowUpRight className="w-3 h-3" />
                  +11.1%
                </span>
              </div>
            </div>
            {/* Desperdício */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Desperdício</span>
                </div>
                <div className="relative group">
                  <button className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </button>
                  <div className="absolute right-0 top-7 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Desperdício?</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">Estimativa de ração desperdiçada por dia. Inclui sobras e perdas no processo.</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400">Fórmula: Fornecido - Consumido</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">12 kg</p>
              <div className="flex items-center justify-between mt-2 gap-1">
                <span className="text-[10px] text-gray-400 truncate">Tolerado: 8 kg</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <ArrowUpRight className="w-3 h-3" />
                  +50%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row — 2/3 + 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Combined Chart — Consumo + Produção + Eficiência — 2/3 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Consumo x Produção x Eficiência</h3>
              <p className="text-xs text-gray-400 mt-0.5">Comparativo dos últimos 7 dias</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-brand-600" />
                <span className="text-[10px] font-medium text-gray-400">Consumo (kg)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-violet-500" />
                <span className="text-[10px] font-medium text-gray-400">Produção (ovos)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-[3px] rounded-full bg-amber-500" />
                <span className="text-[10px] font-medium text-gray-400">Eficiência (kg/ovo)</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={consumoDiario} margin={{ top: 10, right: 50, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradConsumoBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2d7a4f" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#2d7a4f" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="gradOvosBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: 500 }} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} dx={-4} domain={[0, 3200]} ticks={[0, 800, 1600, 2400, 3200]} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#d97706", fontSize: 11, fontWeight: 600 }} dx={4} domain={[0.28, 0.35]} ticks={[0.28, 0.30, 0.32, 0.34]} tickFormatter={(v: number) => v.toFixed(2)} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", fontSize: "13px", padding: "14px 18px" }}
                labelStyle={{ fontWeight: 800, color: "#111827", marginBottom: "8px", fontSize: "14px" }}
                itemStyle={{ padding: "2px 0" }}
                formatter={(value: unknown, name: unknown) => {
                  const n = String(name);
                  if (n === "kg") return [Number(value) + " kg", "Consumo"];
                  if (n === "ovos") return [Number(value).toLocaleString("pt-BR") + " ovos", "Produção"];
                  if (n === "eficiencia") return [Number(value).toFixed(3) + " kg/ovo", "Eficiência"];
                  return [value, name];
                }}
                cursor={{ fill: "rgba(45, 122, 79, 0.04)" }}
              />
              <Bar yAxisId="left" dataKey="kg" fill="url(#gradConsumoBar)" radius={[6, 6, 0, 0]} barSize={18} name="kg" />
              <Bar yAxisId="left" dataKey="ovos" fill="url(#gradOvosBar)" radius={[6, 6, 0, 0]} barSize={18} name="ovos" />
              <Line yAxisId="right" type="monotone" dataKey="eficiencia" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: "#fff", stroke: "#f59e0b", strokeWidth: 3 }} activeDot={{ r: 7, fill: "#f59e0b", stroke: "#fff", strokeWidth: 3 }} name="eficiencia" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Consumo por Tipo — 1/3 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900">Consumo por Tipo</h3>
            <p className="text-xs text-gray-400 mt-0.5">Distribuição por tipo de ração</p>
          </div>
          <div className="space-y-4">
            {consumoPorTipo.map((item) => (
              <div key={item.tipo}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">{item.tipo}</span>
                    <span className="text-xs text-gray-400">{item.kg} kg</span>
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    item.pct >= 30 ? "text-emerald-600" : item.pct >= 20 ? "text-amber-600" : "text-gray-600"
                  )}>
                    {item.pct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex-wrap">
              {consumoPorTipo.map((item) => (
                <div key={item.tipo} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.tipo}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Estoque + Consumo Mensal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Itens em Estoque */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Itens em Estoque</h3>
              <p className="text-xs text-gray-400 mt-0.5">Status de cada item</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                {estoque.filter(e => e.status === "normal").length}/{estoque.length} normais
              </span>
              <button onClick={() => setEstoqueModal("add")} className="w-7 h-7 rounded-lg bg-brand-50 hover:bg-brand-100 flex items-center justify-center transition-colors cursor-pointer">
                <Plus className="w-3.5 h-3.5 text-brand-600" />
              </button>
            </div>
          </div>
          {/* Stacked bar */}
          {(() => {
            const totalQty = estoque.reduce((s, e) => s + e.quantidade, 0);
            const normalPct = (estoque.filter(e => e.status === "normal").reduce((s, e) => s + e.quantidade, 0) / totalQty) * 100;
            const alertaPct = (estoque.filter(e => e.status === "alerta").reduce((s, e) => s + e.quantidade, 0) / totalQty) * 100;
            const baixoPct = (estoque.filter(e => e.status === "baixo").reduce((s, e) => s + e.quantidade, 0) / totalQty) * 100;
            return (
              <div className="w-full h-5 rounded-full overflow-hidden flex mb-4">
                <div className="h-full transition-all duration-500 first:rounded-l-full" style={{ width: `${normalPct}%`, backgroundColor: "#10b981" }} />
                <div className="h-full transition-all duration-500" style={{ width: `${alertaPct}%`, backgroundColor: "#f59e0b" }} />
                <div className="h-full transition-all duration-500 last:rounded-r-full" style={{ width: `${baixoPct}%`, backgroundColor: "#ef4444" }} />
              </div>
            );
          })()}
          <div className="space-y-0 max-h-[320px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {estoque.map((item, i) => (
              <div key={item.id}>
                <button onClick={() => { setViewingEstoque(item); setEditingEstoque(false); setEditEstoqueForm({ nome: item.nome, categoria: item.categoria, quantidade: String(item.quantidade), unidade: item.unidade, status: item.status, fornecedor: item.fornecedor || "", localizacao: item.localizacao || "", lote: item.lote || "", dataChegada: item.dataChegada || "" }); setEstoqueModal("view"); }} className="flex items-center justify-between py-2.5 group cursor-pointer hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors w-full text-left">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      item.status === "normal" ? "bg-emerald-50" : item.status === "alerta" ? "bg-amber-50" : "bg-red-50"
                    )}>
                      <Package className={cn(
                        "w-4 h-4",
                        item.status === "normal" ? "text-emerald-600" : item.status === "alerta" ? "text-amber-600" : "text-red-600"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.nome}</p>
                        {isOldStock(item.dataChegada) && (
                          <span className="text-[9px] font-bold text-orange-700 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-0.5 flex-shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            +2 sem
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">{item.categoria}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-700">{item.quantidade} {item.unidade}</span>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusColor[item.status])}>
                      {statusLabel[item.status]}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                  </div>
                </button>
                {i < estoque.length - 1 && <div className="border-t border-gray-50" />}
              </div>
            ))}
          </div>
        </div>

        {/* Consumo Mensal Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Consumo Mensal (R$)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Custo total por mês</p>
            </div>
          </div>
          <div className="flex-1" style={{ minHeight: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consumoMensal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} tickFormatter={(v) => (v / 1000).toFixed(1) + "k"} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                formatter={(value: unknown) => ["R$ " + Number(value).toLocaleString("pt-BR"), "Custo"]}
              />
              <Bar dataKey="valor" fill="#2d7a4f" radius={[6, 6, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Records Table — Production Style */}
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
        <div className="overflow-x-auto max-h-[340px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Data</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Tipo</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Aviário</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Consumo</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    Custo
                    <span className="relative group">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 px-3 py-2 text-[11px] font-normal text-white bg-gray-900 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-lg pointer-events-none leading-relaxed">
                        Custo total (R$) da quantidade de ração consumida neste registro.
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900" />
                      </span>
                    </span>
                  </span>
                </th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    g/Galinha
                    <span className="relative group">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 px-3 py-2 text-[11px] font-normal text-white bg-gray-900 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-lg pointer-events-none leading-relaxed">
                        Quantidade de ração consumida dividida pelo número de galinhas (em gramas por ave).
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900" />
                      </span>
                    </span>
                  </span>
                </th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    R$/Galinha
                    <span className="relative group">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 px-3 py-2 text-[11px] font-normal text-white bg-gray-900 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-lg pointer-events-none leading-relaxed">
                        Custo total da ração dividido pelo número de galinhas (em R$ por ave).
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900" />
                      </span>
                    </span>
                  </span>
                </th>
                <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 py-3">Detalhes</th>
                <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 py-3 pr-6">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistros.map((r) => {
                const consumoGalinha = r.qtdGalinhas > 0 ? ((r.consumoKg / r.qtdGalinhas) * 1000).toFixed(0) : "—";
                const custoGalinha = r.qtdGalinhas > 0 ? (r.custoRS / r.qtdGalinhas).toFixed(2).replace(".", ",") : "—";
                return (
                  <tr key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{formatDate(r.data)}</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap", tipoColor[r.tipo])}>
                        {tipoLabel[r.tipo]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{r.aviario}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{r.consumoKg} kg</td>
                    <td className="px-6 py-4 text-sm text-gray-700">R$ {r.custoRS.toFixed(2).replace(".", ",")}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-sm font-bold",
                        consumoGalinha !== "—" && Number(consumoGalinha) > 150 ? "text-red-600" : consumoGalinha !== "—" && Number(consumoGalinha) > 130 ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {consumoGalinha !== "—" ? consumoGalinha + " g" : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{custoGalinha !== "—" ? "R$ " + custoGalinha : "—"}</td>
                    <td className="px-3 py-4 text-center">
                      <Link href={`/dashboard/racao/${r.id}`} className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer">
                        <FileText className="w-4 h-4" />
                      </Link>
                    </td>
                    <td className="px-3 pr-6 py-4">
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
                );
              })}
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
                {modal === "add" ? "Registrar Consumo" : "Editar Registro"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Auto-calculated preview */}
            {form.consumoKg && form.qtdGalinhas && Number(form.qtdGalinhas) > 0 && (
              <div className="bg-brand-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <Target className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-xs text-brand-600 font-medium">Consumo por galinha estimado</p>
                  <p className="text-lg font-bold text-brand-700">{((Number(form.consumoKg) / Number(form.qtdGalinhas)) * 1000).toFixed(0)} g/ave</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data</label>
                  <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Ração</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoRacao })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="milho">Milho Mix</option>
                    <option value="soja">Soja Blend</option>
                    <option value="comercial">Comercial</option>
                    <option value="custom">Fórmula Custom</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Aviário</label>
                <input type="text" value={form.aviario} onChange={(e) => setForm({ ...form, aviario: e.target.value })} placeholder="Ex: Aviário 1A" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Consumo (kg)</label>
                  <input type="number" value={form.consumoKg} onChange={(e) => setForm({ ...form, consumoKg: e.target.value })} placeholder="120" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Custo (R$)</label>
                  <input type="number" value={form.custoRS} onChange={(e) => setForm({ ...form, custoRS: e.target.value })} placeholder="48" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Qtd. Galinhas</label>
                  <input type="number" value={form.qtdGalinhas} onChange={(e) => setForm({ ...form, qtdGalinhas: e.target.value })} placeholder="800" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button
                onClick={save}
                disabled={!form.data || !form.aviario}
                className={cn(
                  "inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm",
                  form.data && form.aviario
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

      {/* Estoque Modal — Add */}
      {estoqueModal === "add" && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setEstoqueModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Adicionar Item ao Estoque</h2>
              <button onClick={() => setEstoqueModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome do Item</label>
                <input type="text" value={estoqueForm.nome} onChange={(e) => setEstoqueForm({ ...estoqueForm, nome: e.target.value })} placeholder="Ex: Farelo de Milho" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Categoria</label>
                  <select value={estoqueForm.categoria} onChange={(e) => setEstoqueForm({ ...estoqueForm, categoria: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="Ração">Ração</option>
                    <option value="Insumo">Insumo</option>
                    <option value="Suplemento">Suplemento</option>
                    <option value="Mineral">Mineral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                  <select value={estoqueForm.status} onChange={(e) => setEstoqueForm({ ...estoqueForm, status: e.target.value as StatusEstoque })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="normal">Normal</option>
                    <option value="alerta">Alerta</option>
                    <option value="baixo">Baixo</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantidade</label>
                  <input type="number" value={estoqueForm.quantidade} onChange={(e) => setEstoqueForm({ ...estoqueForm, quantidade: e.target.value })} placeholder="500" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unidade</label>
                  <select value={estoqueForm.unidade} onChange={(e) => setEstoqueForm({ ...estoqueForm, unidade: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="un">un</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fornecedor</label>
                  <input type="text" value={estoqueForm.fornecedor} onChange={(e) => setEstoqueForm({ ...estoqueForm, fornecedor: e.target.value })} placeholder="Ex: AgroMix Ltda" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Localização</label>
                  <input type="text" value={estoqueForm.localizacao} onChange={(e) => setEstoqueForm({ ...estoqueForm, localizacao: e.target.value })} placeholder="Ex: Galpão A" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nº Lote</label>
                  <input type="text" value={estoqueForm.lote} onChange={(e) => setEstoqueForm({ ...estoqueForm, lote: e.target.value })} placeholder="Ex: RM-2024-01" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data de Chegada</label>
                  <input type="date" value={estoqueForm.dataChegada} onChange={(e) => setEstoqueForm({ ...estoqueForm, dataChegada: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setEstoqueModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button
                onClick={() => {
                  if (!estoqueForm.nome.trim() || !estoqueForm.quantidade) return;
                  setEstoque((prev) => [...prev, {
                    id: Date.now(),
                    nome: estoqueForm.nome,
                    categoria: estoqueForm.categoria,
                    quantidade: Number(estoqueForm.quantidade) || 0,
                    unidade: estoqueForm.unidade,
                    status: estoqueForm.status,
                    fornecedor: estoqueForm.fornecedor || undefined,
                    localizacao: estoqueForm.localizacao || undefined,
                    lote: estoqueForm.lote || undefined,
                    dataChegada: estoqueForm.dataChegada || undefined,
                  }]);
                  setEstoqueForm({ nome: "", categoria: "Ração", quantidade: "", unidade: "kg", status: "normal", fornecedor: "", localizacao: "", lote: "", dataChegada: "" });
                  setEstoqueModal(null);
                }}
                disabled={!estoqueForm.nome.trim() || !estoqueForm.quantidade}
                className={cn(
                  "inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm",
                  estoqueForm.nome.trim() && estoqueForm.quantidade
                    ? "text-white bg-brand-600 hover:bg-brand-700"
                    : "text-gray-400 bg-gray-200 cursor-not-allowed"
                )}
              >
                <Check className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Estoque Modal — View/Edit Details */}
      {estoqueModal === "view" && viewingEstoque && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { setEstoqueModal(null); setViewingEstoque(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Detalhes do Item</h3>
              <button onClick={() => { setEstoqueModal(null); setViewingEstoque(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {editingEstoque ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nome</label>
                  <input
                    type="text"
                    value={editEstoqueForm.nome}
                    onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, nome: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Categoria</label>
                    <select value={editEstoqueForm.categoria} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, categoria: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all bg-white cursor-pointer">
                      <option value="Ração">Ração</option>
                      <option value="Insumo">Insumo</option>
                      <option value="Suplemento">Suplemento</option>
                      <option value="Mineral">Mineral</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Unidade</label>
                    <select value={editEstoqueForm.unidade} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, unidade: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all bg-white cursor-pointer">
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="un">un</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Quantidade</label>
                    <input
                      type="number"
                      value={editEstoqueForm.quantidade}
                      onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, quantidade: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                    <div className="flex gap-2">
                      {([
                        { value: "normal" as const, label: "Normal", color: "bg-emerald-500" },
                        { value: "alerta" as const, label: "Alerta", color: "bg-amber-500" },
                        { value: "baixo" as const, label: "Baixo", color: "bg-red-500" },
                      ]).map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setEditEstoqueForm({ ...editEstoqueForm, status: s.value })}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                            editEstoqueForm.status === s.value
                              ? `${s.color} text-white border-transparent`
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Fornecedor</label>
                    <input type="text" value={editEstoqueForm.fornecedor} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, fornecedor: e.target.value })} placeholder="Ex: AgroMix Ltda" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Localização</label>
                    <input type="text" value={editEstoqueForm.localizacao} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, localizacao: e.target.value })} placeholder="Ex: Galpão A" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nº Lote</label>
                    <input type="text" value={editEstoqueForm.lote} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, lote: e.target.value })} placeholder="Ex: RM-2024-01" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Data de Chegada</label>
                    <input type="date" value={editEstoqueForm.dataChegada} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, dataChegada: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setEditingEstoque(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const updated = {
                        ...viewingEstoque,
                        nome: editEstoqueForm.nome.trim() || viewingEstoque.nome,
                        categoria: editEstoqueForm.categoria || viewingEstoque.categoria,
                        quantidade: Number(editEstoqueForm.quantidade) || viewingEstoque.quantidade,
                        unidade: editEstoqueForm.unidade || viewingEstoque.unidade,
                        status: editEstoqueForm.status,
                        fornecedor: editEstoqueForm.fornecedor || undefined,
                        localizacao: editEstoqueForm.localizacao || undefined,
                        lote: editEstoqueForm.lote || undefined,
                        dataChegada: editEstoqueForm.dataChegada || undefined,
                      };
                      setEstoque((prev) => prev.map((e) => e.id === viewingEstoque.id ? updated : e));
                      setViewingEstoque(updated);
                      setEditingEstoque(false);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors cursor-pointer shadow-sm"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    viewingEstoque.status === "normal" ? "bg-emerald-50" : viewingEstoque.status === "alerta" ? "bg-amber-50" : "bg-red-50"
                  )}>
                    <Package className={cn(
                      "w-5 h-5",
                      viewingEstoque.status === "normal" ? "text-emerald-600" : viewingEstoque.status === "alerta" ? "text-amber-600" : "text-red-600"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{viewingEstoque.nome}</p>
                    <p className="text-xs text-gray-400">{viewingEstoque.categoria}</p>
                  </div>
                </div>

                {isOldStock(viewingEstoque.dataChegada) && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 border border-orange-200">
                    <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    <p className="text-xs font-semibold text-orange-700">Este item está no estoque há mais de 2 semanas</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Quantidade</p>
                    <p className="text-sm font-bold text-gray-800">{viewingEstoque.quantidade} {viewingEstoque.unidade}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Unidade</p>
                    <p className="text-sm font-bold text-gray-800">{viewingEstoque.unidade}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                    <span className={cn(
                      "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-lg",
                      statusColor[viewingEstoque.status]
                    )}>
                      {statusLabel[viewingEstoque.status]}
                    </span>
                  </div>
                </div>

                {(viewingEstoque.fornecedor || viewingEstoque.localizacao) && (
                  <div className="grid grid-cols-2 gap-3">
                    {viewingEstoque.fornecedor && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Fornecedor</p>
                        <p className="text-sm font-semibold text-gray-800">{viewingEstoque.fornecedor}</p>
                      </div>
                    )}
                    {viewingEstoque.localizacao && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Localização</p>
                        <p className="text-sm font-semibold text-gray-800">{viewingEstoque.localizacao}</p>
                      </div>
                    )}
                  </div>
                )}

                {(viewingEstoque.lote || viewingEstoque.dataChegada) && (
                  <div className="grid grid-cols-2 gap-3">
                    {viewingEstoque.lote && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Nº Lote</p>
                        <p className="text-sm font-semibold text-gray-800">{viewingEstoque.lote}</p>
                      </div>
                    )}
                    {viewingEstoque.dataChegada && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Data de Chegada</p>
                        <p className="text-sm font-semibold text-gray-800">{formatDate(viewingEstoque.dataChegada)}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setEditingEstoque(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setEstoque((prev) => prev.filter((e) => e.id !== viewingEstoque.id));
                      setEstoqueModal(null);
                      setViewingEstoque(null);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
