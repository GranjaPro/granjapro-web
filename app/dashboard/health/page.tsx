"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ModalPortal from "@/components/ui/modal-portal";
import {
  HeartPulse,
  Plus,
  Syringe,
  AlertTriangle,
  ClipboardCheck,
  X,
  Check,
  Stethoscope,
  ShieldCheck,
  Pill,
  Search,
  Zap,
  Sparkles,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pencil,
  Trash2,
  Activity,
  Bug,
  Thermometer,
  Eye,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

/* ── Types ── */
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
  observacao?: string;
  responsavel?: string;
}

interface AgendaVacina {
  id: number;
  vacina: string;
  lote: string;
  dataVencimento: string;
  status: AgendaStatus;
}

const statusRegistroConfig: Record<RegistroStatus, { bg: string; text: string }> = {
  "Concluído": { bg: "bg-emerald-50", text: "text-emerald-700" },
  "Em andamento": { bg: "bg-amber-50", text: "text-amber-700" },
};

const statusAgendaConfig: Record<AgendaStatus, { bg: string; text: string; border: string }> = {
  "Próximo": { bg: "bg-white", text: "text-red-600", border: "border-red-200" },
  "Agendado": { bg: "bg-white", text: "text-gray-600", border: "border-gray-200" },
};

const tipoIcon: Record<RegistroTipo, typeof Syringe> = {
  "Vacinação": Syringe,
  "Tratamento": Pill,
  "Inspeção": ClipboardCheck,
};

const tipoColor: Record<RegistroTipo, { bg: string; text: string; badge: string }> = {
  "Vacinação": { bg: "bg-brand-50", text: "text-brand-600", badge: "text-brand-800 bg-brand-100" },
  "Tratamento": { bg: "bg-amber-50", text: "text-amber-600", badge: "text-amber-800 bg-amber-100" },
  "Inspeção": { bg: "bg-sky-50", text: "text-sky-600", badge: "text-sky-800 bg-sky-100" },
};

/* ── Mock Data ── */
const initialRegistros: RegistroSaude[] = [
  { id: 1, titulo: "Newcastle — Reforço", data: "2024-03-12", lote: "L-2024-01", tipo: "Vacinação", status: "Concluído", responsavel: "Dr. Silva", observacao: "Aplicação sem intercorrências" },
  { id: 2, titulo: "Sintomas respiratórios — Antibióticos", data: "2024-03-10", lote: "L-2024-02", tipo: "Tratamento", status: "Em andamento", responsavel: "Dr. Costa", observacao: "Monitorar por 5 dias" },
  { id: 3, titulo: "Inspeção sanitária de rotina", data: "2024-03-08", lote: "L-2024-04", tipo: "Inspeção", status: "Concluído", responsavel: "Eq. Interna" },
  { id: 4, titulo: "Bronquite Infecciosa", data: "2024-03-05", lote: "L-2024-01", tipo: "Vacinação", status: "Concluído", responsavel: "Dr. Silva" },
  { id: 5, titulo: "Desverminização preventiva", data: "2024-03-02", lote: "L-2024-03", tipo: "Tratamento", status: "Concluído", responsavel: "Dr. Costa" },
  { id: 6, titulo: "Gumboro — 2ª dose", data: "2024-02-28", lote: "L-2024-03", tipo: "Vacinação", status: "Concluído", responsavel: "Dr. Silva" },
  { id: 7, titulo: "Coleta de amostras para exame", data: "2024-02-25", lote: "L-2024-02", tipo: "Inspeção", status: "Concluído", responsavel: "Lab. AviSaúde" },
  { id: 8, titulo: "Marek — 1ª dose", data: "2024-02-20", lote: "L-2024-01", tipo: "Vacinação", status: "Concluído", responsavel: "Dr. Silva" },
];

const initialAgenda: AgendaVacina[] = [
  { id: 1, vacina: "Marek — Reforço", lote: "L-2024-03", dataVencimento: "2024-03-20", status: "Próximo" },
  { id: 2, vacina: "Influenza Aviária", lote: "Todos", dataVencimento: "2024-03-25", status: "Próximo" },
  { id: 3, vacina: "Newcastle Reforço", lote: "L-2024-02", dataVencimento: "2024-04-02", status: "Agendado" },
  { id: 4, vacina: "Bronquite Reforço", lote: "L-2024-01", dataVencimento: "2024-04-10", status: "Agendado" },
  { id: 5, vacina: "Gumboro — 3ª dose", lote: "L-2024-03", dataVencimento: "2024-04-18", status: "Agendado" },
];

const mortalidadeSemanal = [
  { dia: "06/03", mortes: 2, taxa: 0.05 },
  { dia: "07/03", mortes: 1, taxa: 0.03 },
  { dia: "08/03", mortes: 3, taxa: 0.08 },
  { dia: "09/03", mortes: 0, taxa: 0.00 },
  { dia: "10/03", mortes: 1, taxa: 0.03 },
  { dia: "11/03", mortes: 2, taxa: 0.05 },
  { dia: "12/03", mortes: 1, taxa: 0.03 },
];

const coberturaMensal = [
  { mes: "Jan", cobertura: 92 },
  { mes: "Fev", cobertura: 88 },
  { mes: "Mar", cobertura: 95 },
  { mes: "Abr", cobertura: 78 },
  { mes: "Mai", cobertura: 90 },
  { mes: "Jun", cobertura: 94 },
];

export default function SaudePage() {
  const searchParams = useSearchParams();
  const [registros, setRegistros] = useState(initialRegistros);
  const [agenda] = useState(initialAgenda);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editing, setEditing] = useState<RegistroSaude | null>(null);

  useEffect(() => {
    if (searchParams.get("register") === "true") setShowModal(true);
  }, [searchParams]);

  const [form, setForm] = useState({
    titulo: "",
    data: "",
    lote: "",
    tipo: "Vacinação" as RegistroTipo,
    status: "Concluído" as RegistroStatus,
    observacao: "",
    responsavel: "",
  });

  // Calendar
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<"intervalo" | "mes">("intervalo");
  const [rangeStart, setRangeStart] = useState<Date | null>(new Date());
  const [rangeEnd, setRangeEnd] = useState<Date | null>(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) setCalendarOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sameDay = (a: Date, b: Date) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

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
    return `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
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

  const isRangeStart = useCallback((day: Date) => filterMode === "intervalo" && rangeStart && sameDay(day, rangeStart), [filterMode, rangeStart]);
  const isRangeEnd = useCallback((day: Date) => filterMode === "intervalo" && rangeEnd && sameDay(day, rangeEnd), [filterMode, rangeEnd]);

  const handleCalDayClick = useCallback((day: Date) => {
    if (filterMode === "intervalo") {
      if (!rangeStart || (rangeStart && rangeEnd)) { setRangeStart(day); setRangeEnd(null); }
      else {
        if (day.getTime() < rangeStart.getTime()) { setRangeEnd(rangeStart); setRangeStart(day); }
        else setRangeEnd(day);
        setCalendarOpen(false);
      }
    } else { setSelectedDate(new Date(day.getFullYear(), day.getMonth(), 1)); setCalendarOpen(false); }
  }, [filterMode, rangeStart, rangeEnd]);

  /* ── Computed ── */
  const healthScore = 94;
  const vacinasPendentes = agenda.filter((a) => a.status === "Próximo").length;
  const tratamentosAtivos = registros.filter((r) => r.status === "Em andamento").length;
  const ultimaInspecao = registros.find((r) => r.tipo === "Inspeção");
  const diasUltimaInspecao = ultimaInspecao ? Math.floor((new Date().getTime() - new Date(ultimaInspecao.data + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const totalMortesSemana = mortalidadeSemanal.reduce((s, d) => s + d.mortes, 0);
  const taxaMortalidade = 0.03;
  const coberturaVacinal = 95;

  const scoreColor = healthScore >= 90 ? "#10b981" : healthScore >= 70 ? "#f59e0b" : "#ef4444";
  const statusText = healthScore >= 90 ? "Saudável" : healthScore >= 70 ? "Atenção" : "Crítico";
  const statusTextColor = healthScore >= 90 ? "text-emerald-700" : healthScore >= 70 ? "text-amber-700" : "text-red-700";
  const bannerGradient = healthScore >= 90 ? "from-emerald-50 via-emerald-50/50 to-white" : healthScore >= 70 ? "from-amber-50 via-amber-50/50 to-white" : "from-red-50 via-red-50/50 to-white";
  const bannerBorder = healthScore >= 90 ? "border-emerald-200/60" : healthScore >= 70 ? "border-amber-200/60" : "border-red-200/60";

  /* ── KPIs ── */
  const kpis = [
    { title: "Mortalidade Semanal", value: `${totalMortesSemana} aves`, icon: Bug, iconBg: "bg-red-50", iconColor: "text-red-500", actual: totalMortesSemana, expectedVal: 5, expectedLabel: "5 aves", diff: ((totalMortesSemana / 5) * 100) - 100, progressColor: totalMortesSemana <= 5 ? "bg-emerald-500" : totalMortesSemana <= 8 ? "bg-amber-500" : "bg-red-500" },
    { title: "Taxa Mortalidade", value: `${(taxaMortalidade * 100).toFixed(1)}%`, icon: Activity, iconBg: "bg-amber-50", iconColor: "text-amber-600", actual: taxaMortalidade * 100, expectedVal: 2, expectedLabel: "2%", diff: ((taxaMortalidade * 100) / 2) * 100 - 100, progressColor: taxaMortalidade * 100 <= 2 ? "bg-emerald-500" : taxaMortalidade * 100 <= 5 ? "bg-amber-500" : "bg-red-500" },
    { title: "Cobertura Vacinal", value: `${coberturaVacinal}%`, icon: Shield, iconBg: "bg-brand-50", iconColor: "text-brand-600", actual: coberturaVacinal, expectedVal: 100, expectedLabel: "100%", diff: ((coberturaVacinal / 100) * 100) - 100, progressColor: coberturaVacinal >= 90 ? "bg-emerald-500" : coberturaVacinal >= 75 ? "bg-amber-500" : "bg-red-500" },
    { title: "Última Inspeção", value: `${diasUltimaInspecao} dias`, icon: Stethoscope, iconBg: "bg-sky-50", iconColor: "text-sky-600", actual: diasUltimaInspecao, expectedVal: 7, expectedLabel: "7 dias", diff: ((diasUltimaInspecao / 7) * 100) - 100, progressColor: diasUltimaInspecao <= 7 ? "bg-emerald-500" : diasUltimaInspecao <= 14 ? "bg-amber-500" : "bg-red-500" },
  ];

  /* ── Insights ── */
  const insights = useMemo(() => {
    const arr: { type: "success" | "warning" | "info"; title: string; action: string }[] = [];
    if (vacinasPendentes > 0) arr.push({ type: "warning", title: `${vacinasPendentes} vacinas pendentes próximas`, action: `Agendar: ${agenda.filter(a => a.status === "Próximo").map(a => a.vacina).join(", ")}` });
    if (tratamentosAtivos > 0) arr.push({ type: "warning", title: `${tratamentosAtivos} tratamento${tratamentosAtivos > 1 ? "s" : ""} em andamento`, action: "Monitorar evolução e ajustar medicação se necessário" });
    if (taxaMortalidade <= 0.03) arr.push({ type: "success", title: "Taxa de mortalidade dentro do esperado", action: "Manter protocolos sanitários atuais" });
    else arr.push({ type: "warning", title: "Taxa de mortalidade acima do ideal", action: "Investigar causas e reforçar biossegurança" });
    if (coberturaVacinal >= 90) arr.push({ type: "success", title: `Cobertura vacinal em ${coberturaVacinal}%`, action: "Excelente — continuar com o calendário" });
    arr.push({ type: "info", title: "Período de calor aumenta risco de estresse térmico", action: "Reforçar ventilação e monitorar consumo de água" });
    return arr;
  }, [vacinasPendentes, tratamentosAtivos, taxaMortalidade, coberturaVacinal, agenda]);

  const filteredRegistros = useMemo(() => {
    if (!searchQuery.trim()) return registros;
    const q = searchQuery.toLowerCase();
    return registros.filter(r => r.titulo.toLowerCase().includes(q) || r.lote.toLowerCase().includes(q) || r.tipo.toLowerCase().includes(q));
  }, [registros, searchQuery]);

  function formatDate(dateStr: string) {
    try { return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return dateStr; }
  }

  function formatDateShort(dateStr: string) {
    try { return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", ""); } catch { return dateStr; }
  }

  function openAdd() {
    setForm({ titulo: "", data: "", lote: "", tipo: "Vacinação", status: "Concluído", observacao: "", responsavel: "" });
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(r: RegistroSaude) {
    setForm({ titulo: r.titulo, data: r.data, lote: r.lote, tipo: r.tipo, status: r.status, observacao: r.observacao || "", responsavel: r.responsavel || "" });
    setEditing(r);
    setShowModal(true);
  }

  function handleSave() {
    if (!form.titulo || !form.data || !form.lote) return;
    const registro: RegistroSaude = { id: editing?.id || Date.now(), ...form };
    if (editing) setRegistros(prev => prev.map(r => r.id === editing.id ? registro : r));
    else setRegistros(prev => [registro, ...prev]);
    setForm({ titulo: "", data: "", lote: "", tipo: "Vacinação", status: "Concluído", observacao: "", responsavel: "" });
    setShowModal(false);
    setEditing(null);
  }

  function deleteRegistro(id: number) {
    setRegistros(prev => prev.filter(r => r.id !== id));
    setDeleteConfirm(null);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
            <HeartPulse className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Saúde Aviária</h1>
            <p className="text-sm text-gray-500 mt-0.5">Vacinações, tratamentos e monitoramento sanitário</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Calendar Filter */}
          <div className="relative" ref={calendarRef}>
            <button onClick={() => setCalendarOpen(!calendarOpen)} className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
              <CalendarDays className="w-4 h-4" />{calendarLabel}
            </button>
            {calendarOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 z-50 w-[320px] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-4">
                  {([{ key: "intervalo" as const, label: "Intervalo" }, { key: "mes" as const, label: "Mês" }]).map(p => (
                    <button key={p.key} onClick={() => setFilterMode(p.key)} className={cn("flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer", filterMode === p.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>{p.label}</button>
                  ))}
                </div>
                {filterMode === "intervalo" && <p className="text-[10px] text-gray-400 font-medium mb-2 text-center">{!rangeStart || (rangeStart && rangeEnd) ? "Clique no dia inicial" : "Clique no dia final"}</p>}
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
                  <span className="text-sm font-semibold text-gray-900">{["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                  <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
                </div>
                {filterMode === "mes" ? (
                  <div className="grid grid-cols-3 gap-2">
                    {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m, i) => (
                      <button key={m} onClick={() => { setSelectedDate(new Date(calendarMonth.getFullYear(), i, 1)); setCalendarOpen(false); }} className={cn("py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer", selectedDate.getMonth() === i && selectedDate.getFullYear() === calendarMonth.getFullYear() ? "bg-brand-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100")}>{m}</button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-7 gap-0 mb-1">{["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>)}</div>
                    <div className="grid grid-cols-7 gap-0">
                      {calendarDays.map((day, i) => {
                        if (!day) return <div key={`e-${i}`} className="h-9" />;
                        const today = new Date(); const isToday = sameDay(day, today);
                        const inRange = isInRange(day); const isStart = isRangeStart(day); const isEnd = isRangeEnd(day); const isSingle = isStart && isEnd;
                        return (
                          <button key={i} onClick={() => handleCalDayClick(day)} className={cn("h-9 text-sm font-medium transition-all duration-150 cursor-pointer relative flex items-center justify-center", inRange && !isStart && !isEnd && "bg-brand-50 text-brand-700", isStart && !isSingle && "bg-brand-600 text-white rounded-l-xl", isEnd && !isSingle && "bg-brand-600 text-white rounded-r-xl", isSingle && "bg-brand-600 text-white rounded-xl shadow-sm", !inRange && "hover:bg-gray-100 rounded-xl")}>
                            <span className={cn(isToday && !inRange && "w-7 h-7 rounded-full border-2 border-brand-500 flex items-center justify-center")}>{day.getDate()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
                <button onClick={() => { const t = new Date(); setRangeStart(t); setRangeEnd(t); setSelectedDate(t); setCalendarMonth(t); setFilterMode("intervalo"); setCalendarOpen(false); }} className="w-full mt-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer">Hoje</button>
              </div>
            )}
          </div>
          <button onClick={openAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20">
            <Plus className="w-4 h-4" />Adicionar Registro
          </button>
        </div>
      </div>

      {/* ── Health Score Banner ── */}
      <div className={cn("bg-gradient-to-r rounded-2xl border p-5 transition-all duration-300", bannerGradient, bannerBorder)}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 lg:min-w-[280px]">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                <circle cx="32" cy="32" r="28" fill="none" stroke={scoreColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(healthScore / 100) * 175.9} 175.9`} className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-base font-bold", statusTextColor)}>{healthScore}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-brand-600" />
                <span className="text-sm font-bold text-gray-900">Saúde do Plantel</span>
              </div>
              <p className={cn("text-xl font-bold mt-0.5", statusTextColor)}>{statusText}</p>
              <p className="text-xs text-gray-500 mt-0.5">Mortalidade: {totalMortesSemana} aves/sem | Vacinas: {vacinasPendentes} pendentes</p>
            </div>
          </div>
          <div className="hidden lg:block w-px h-14 bg-gray-200" />
          <div className="flex-1 space-y-2">
            {vacinasPendentes > 0 && (
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100"><Syringe className="w-3.5 h-3.5 text-amber-600" /></div>
                <p className="text-sm text-gray-700">{vacinasPendentes} vacinas próximas do vencimento — <button className="font-semibold text-amber-600 hover:text-amber-700 underline underline-offset-2 decoration-amber-300 hover:decoration-amber-500 transition-colors cursor-pointer">agendar aplicação</button></p>
              </div>
            )}
            {tratamentosAtivos > 0 && (
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100"><Pill className="w-3.5 h-3.5 text-red-600" /></div>
                <p className="text-sm text-gray-700">{tratamentosAtivos} tratamento em andamento — <button className="font-semibold text-red-600 hover:text-red-700 underline underline-offset-2 decoration-red-300 hover:decoration-red-500 transition-colors cursor-pointer">monitorar evolução</button></p>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-100"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /></div>
              <p className="text-sm text-gray-700">Cobertura vacinal em {coberturaVacinal}% — <button className="font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2 decoration-emerald-300 hover:decoration-emerald-500 transition-colors cursor-pointer">ver calendário</button></p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const maxVal = Math.max(kpi.actual, kpi.expectedVal) * 1.15;
          const fillPct = Math.min((kpi.actual / maxVal) * 100, 100);
          const markerPct = Math.min((kpi.expectedVal / maxVal) * 100, 100);
          const diffLabel = `${kpi.diff > 0 ? "+" : ""}${kpi.diff.toFixed(1)}%`;
          const isGoodLow = kpi.title === "Mortalidade Semanal" || kpi.title === "Taxa Mortalidade" || kpi.title === "Última Inspeção";
          const isGood = isGoodLow ? kpi.diff <= 0 : kpi.diff >= 0;
          return (
            <div key={kpi.title} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-2.5 mb-4">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", kpi.iconBg)}>
                  <kpi.icon className={cn("w-4.5 h-4.5", kpi.iconColor)} />
                </div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{kpi.title}</span>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{kpi.value}</p>
                <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full", isGood ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50")}>
                  {isGood ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}{diffLabel}
                </span>
              </div>
              <div className="mt-4 relative">
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-700", kpi.progressColor)} style={{ width: `${fillPct}%` }} />
                </div>
                <div className="absolute top-[-3px] w-0.5 h-4 bg-gray-800 rounded-full" style={{ left: `${markerPct}%` }} title={`Esperado: ${kpi.expectedLabel}`} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                  <span className="text-[10px] text-gray-500 font-medium">Limite: {kpi.expectedLabel}</span>
                </div>
                <span className={cn("text-[10px] font-semibold", isGood ? "text-emerald-600" : "text-red-500")}>{isGood ? "Dentro" : "Acima"} do esperado</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── AI Insights + Vaccination Schedule ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AI Insights */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm"><Zap className="w-5 h-5 text-white" /></div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Assistente Sanitário</h3>
                <p className="text-[11px] text-gray-400 font-medium">Baseado nos últimos 7 dias</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 flex-shrink-0"><Sparkles className="w-3 h-3" />Premium</span>
          </div>
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {insights.map((ins, i) => (
              <div key={i} className={cn("p-3.5 rounded-xl border-l-[3px]", ins.type === "success" && "bg-emerald-50/50 border-l-emerald-500", ins.type === "warning" && "bg-amber-50/50 border-l-amber-500", ins.type === "info" && "bg-blue-50/50 border-l-blue-500")}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", ins.type === "success" && "bg-emerald-100", ins.type === "warning" && "bg-amber-100", ins.type === "info" && "bg-blue-100")}>
                    {ins.type === "success" && <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />}
                    {ins.type === "warning" && <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />}
                    {ins.type === "info" && <Lightbulb className="w-2.5 h-2.5 text-blue-600" />}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{ins.title}</span>
                </div>
                <p className={cn("text-xs font-medium ml-7", ins.type === "success" ? "text-emerald-600" : ins.type === "warning" ? "text-amber-600" : "text-blue-600")}>&rarr; {ins.action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vaccination Schedule */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-bold text-gray-900">Agenda de Vacinação</h3>
            </div>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">{vacinasPendentes} próximas</span>
          </div>
          <div className="space-y-0 max-h-[280px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {agenda.map((a, i) => {
              const sColor = statusAgendaConfig[a.status];
              const isUrgent = a.status === "Próximo";
              return (
                <div key={a.id}>
                  <div className="flex items-center justify-between py-3 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", isUrgent ? "bg-red-50" : "bg-gray-50")}>
                        <Syringe className={cn("w-4 h-4", isUrgent ? "text-red-500" : "text-gray-400")} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{a.vacina}</p>
                        <p className="text-[11px] text-gray-400 truncate">Lote: {a.lote} · {formatDateShort(a.dataVencimento)}</p>
                      </div>
                    </div>
                    <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-lg border flex-shrink-0", sColor.bg, sColor.text, sColor.border)}>{a.status}</span>
                  </div>
                  {i < agenda.length - 1 && <div className="border-t border-gray-50" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Charts Row — 2/3 + 1/3 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mortalidade Semanal */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Mortalidade x Taxa</h3>
              <p className="text-xs text-gray-400 mt-0.5">Últimos 7 dias</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30"><Sparkles className="w-3 h-3" />Pro</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500" /><span className="text-[10px] font-medium text-gray-400">Mortes</span></div>
                <div className="flex items-center gap-1.5"><div className="w-5 h-[3px] rounded-full bg-amber-500" /><span className="text-[10px] font-medium text-gray-400">Taxa (%)</span></div>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={mortalidadeSemanal} margin={{ top: 10, right: 50, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradMortesBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: 500 }} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} dx={-4} domain={[0, 5]} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#d97706", fontSize: 11, fontWeight: 600 }} dx={4} domain={[0, 0.12]} tickFormatter={(v: number) => (v * 100).toFixed(1) + "%"} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", fontSize: "13px", padding: "14px 18px" }}
                labelStyle={{ fontWeight: 800, color: "#111827", marginBottom: "8px" }}
                formatter={(value: unknown, name: unknown) => {
                  const n = String(name);
                  if (n === "mortes") return [Number(value) + " aves", "Mortes"];
                  if (n === "taxa") return [(Number(value) * 100).toFixed(2) + "%", "Taxa"];
                  return [value, name];
                }}
              />
              <Bar yAxisId="left" dataKey="mortes" fill="url(#gradMortesBar)" radius={[6, 6, 0, 0]} barSize={24} name="mortes" />
              <Line yAxisId="right" type="monotone" dataKey="taxa" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: "#fff", stroke: "#f59e0b", strokeWidth: 3 }} activeDot={{ r: 7, fill: "#f59e0b", stroke: "#fff", strokeWidth: 3 }} name="taxa" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Cobertura Vacinal Mensal */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900">Cobertura Vacinal</h3>
            <p className="text-xs text-gray-400 mt-0.5">% do plantel vacinado por mês</p>
          </div>
          <div className="flex-1" style={{ minHeight: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={coberturaMensal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCobertura" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2d7a4f" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2d7a4f" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} domain={[60, 100]} tickFormatter={(v) => v + "%"} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                  formatter={(value: unknown) => [Number(value) + "%", "Cobertura"]}
                />
                <Area type="monotone" dataKey="cobertura" stroke="#2d7a4f" strokeWidth={2.5} fill="url(#gradCobertura)" dot={{ r: 4, fill: "#fff", stroke: "#2d7a4f", strokeWidth: 2.5 }} activeDot={{ r: 6, fill: "#2d7a4f", stroke: "#fff", strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Records Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Registros de Saúde</h3>
            <p className="text-xs text-gray-400 mt-0.5">{registros.length} registros</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100/80 rounded-xl px-3 py-2 w-56 transition-colors focus-within:bg-gray-100 focus-within:ring-2 focus-within:ring-brand-500/20">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Buscar registro..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none w-full" />
          </div>
        </div>
        <div className="overflow-x-auto max-h-[340px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Data</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Título</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Tipo</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Lote</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Responsável</th>
                <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 py-3">Detalhes</th>
                <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 py-3 pr-6">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistros.map((r) => {
                const tColor = tipoColor[r.tipo];
                const sColor = statusRegistroConfig[r.status];
                return (
                  <tr key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{formatDate(r.data)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 max-w-[200px] truncate">{r.titulo}</td>
                    <td className="px-6 py-4"><span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap", tColor.badge)}>{r.tipo}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-700">{r.lote}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{r.responsavel || "—"}</td>
                    <td className="px-6 py-4"><span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", sColor.bg, sColor.text)}>{r.status}</span></td>
                    <td className="px-3 py-4 text-center">
                      <Link href={`/dashboard/health/${r.id}`} className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"><FileText className="w-4 h-4" /></Link>
                    </td>
                    <td className="px-3 pr-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRegistros.length === 0 && <tr><td colSpan={8} className="text-center py-16 text-gray-400 text-sm">Nenhum registro encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal — Add/Edit ── */}
      {showModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { setShowModal(false); setEditing(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Editar Registro" : "Novo Registro de Saúde"}</h2>
              <button onClick={() => { setShowModal(false); setEditing(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título</label>
                <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Newcastle — Reforço" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data</label>
                  <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lote</label>
                  <select value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="">Selecionar...</option>
                    <option value="L-2024-01">L-2024-01</option>
                    <option value="L-2024-02">L-2024-02</option>
                    <option value="L-2024-03">L-2024-03</option>
                    <option value="L-2024-04">L-2024-04</option>
                    <option value="Todos">Todos os lotes</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as RegistroTipo })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="Vacinação">Vacinação</option>
                    <option value="Tratamento">Tratamento</option>
                    <option value="Inspeção">Inspeção</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as RegistroStatus })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="Concluído">Concluído</option>
                    <option value="Em andamento">Em andamento</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Responsável</label>
                  <input type="text" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Ex: Dr. Silva" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observação</label>
                  <input type="text" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Notas adicionais" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => { setShowModal(false); setEditing(null); }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={handleSave} disabled={!form.titulo || !form.data || !form.lote} className={cn("inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm", form.titulo && form.data && form.lote ? "text-white bg-brand-600 hover:bg-brand-700" : "text-gray-400 bg-gray-200 cursor-not-allowed")}>
                <Check className="w-4 h-4" />Salvar
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteConfirm !== null && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto"><Trash2 className="w-5 h-5 text-red-500" /></div>
            <h3 className="text-base font-bold text-gray-900">Confirmar exclusão</h3>
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir este registro?</p>
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
