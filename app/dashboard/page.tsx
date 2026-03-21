"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Egg,
  Bird,
  Wheat,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Target,
  Skull,
  CheckCircle2,
  Circle,
  Clock,
  ChevronRight,
  Zap,
  Plus,
  BarChart3,
  Activity,
  Square,
  CheckSquare,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  mockFarm,
  mockTodayProduction,
  mockTodayFeed,
  mockMonthFinancial,
  mockTodayMortality,
  mockBarns,
} from "@/lib/mock-data";
import { formatNumber, formatCurrency } from "@/lib/utils";
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
  Cell,
  PieChart,
  Pie,
} from "recharts";

/* ── KPI Data ── */
const kpis = [
  {
    title: "Ovos Hoje",
    value: formatNumber(mockTodayProduction.eggsProduced),
    badge: "+3.2%",
    badgeDir: "up" as const,
    subtitle: `Meta: 15.000 · ${((mockTodayProduction.eggsProduced / 15000) * 100).toFixed(0)}% atingido`,
    icon: Egg,
    color: "brand",
    gradient: "from-brand-500 to-brand-600",
    lightBg: "bg-brand-50",
    lightIcon: "text-brand-600",
    progress: (mockTodayProduction.eggsProduced / 15000) * 100,
  },
  {
    title: "Taxa de Postura",
    value: `${mockTodayProduction.layingRate}%`,
    badge: "+1.2%",
    badgeDir: "up" as const,
    subtitle: "Meta: 90% · Padrão: 85-92%",
    icon: Target,
    color: "violet",
    gradient: "from-violet-500 to-violet-600",
    lightBg: "bg-violet-50",
    lightIcon: "text-violet-600",
    progress: (mockTodayProduction.layingRate / 92) * 100,
  },
  {
    title: "Custo por Ovo",
    value: `R$ ${mockTodayFeed.costPerEgg.toFixed(3)}`,
    badge: "-2.1%",
    badgeDir: "up" as const,
    subtitle: `Ração: R$ ${formatNumber(mockTodayFeed.cost)} · ${formatNumber(mockTodayFeed.quantity)}kg`,
    icon: Wheat,
    color: "amber",
    gradient: "from-amber-500 to-amber-600",
    lightBg: "bg-amber-50",
    lightIcon: "text-amber-600",
    progress: 72,
  },
  {
    title: "Lucro Mensal",
    value: formatCurrency(mockMonthFinancial.profit),
    badge: "+8.5%",
    badgeDir: "up" as const,
    subtitle: `Receita: ${formatCurrency(mockMonthFinancial.revenue)}`,
    icon: DollarSign,
    color: "emerald",
    gradient: "from-emerald-500 to-emerald-600",
    lightBg: "bg-emerald-50",
    lightIcon: "text-emerald-600",
    progress: (mockMonthFinancial.profit / mockMonthFinancial.revenue) * 100,
  },
];

/* ── Quick Actions ── */
const quickActions = [
  { label: "Registrar Produção", icon: Egg, href: "/dashboard/production?register=true", color: "bg-brand-500 hover:bg-brand-600" },
  { label: "Registrar Ração", icon: Wheat, href: "/dashboard/racao?register=true", color: "bg-amber-500 hover:bg-amber-600" },
  { label: "Registrar Mortalidade", icon: Skull, href: "/dashboard/mortality?register=true", color: "bg-red-500 hover:bg-red-600" },
  { label: "Registrar Venda", icon: DollarSign, href: "/dashboard/sales?register=true", color: "bg-emerald-500 hover:bg-emerald-600" },
];

/* ── Chart Data ── */
const weeklyData = [
  { day: "Seg", ovos: 12800, meta: 13500, postura: 85.3 },
  { day: "Ter", ovos: 13100, meta: 13500, postura: 87.3 },
  { day: "Qua", ovos: 13350, meta: 13500, postura: 89.0 },
  { day: "Qui", ovos: 13200, meta: 13500, postura: 88.0 },
  { day: "Sex", ovos: 13050, meta: 13500, postura: 87.0 },
  { day: "Sáb", ovos: 13400, meta: 13500, postura: 89.3 },
  { day: "Hoje", ovos: 13200, meta: 13500, postura: 88.0 },
];

const revenueData = [
  { month: "Jan", receita: 12500, despesas: 8500 },
  { month: "Fev", receita: 13000, despesas: 9200 },
  { month: "Mar", receita: 13500, despesas: 9000 },
  { month: "Abr", receita: 14000, despesas: 9800 },
  { month: "Mai", receita: 13200, despesas: 10200 },
  { month: "Jun", receita: 14500, despesas: 9500 },
];

const expenseBreakdown = [
  { name: "Ração", value: mockMonthFinancial.feedCost, color: "#f59e0b" },
  { name: "Mão de obra", value: mockMonthFinancial.laborCost, color: "#8b5cf6" },
  { name: "Outros", value: mockMonthFinancial.otherExpenses, color: "#94a3b8" },
];

const alerts = [
  { id: 1, type: "danger" as const, msg: "Estoque de ração baixo — 3 dias restantes", time: "2h atrás", action: "Comprar ração", risk: "Sem ração, as aves param de produzir e podem morrer em dias." },
  { id: 2, type: "warning" as const, msg: "Mortalidade acima do normal no Galpão 2 (+2.3%)", time: "4h atrás", action: "Inspecionar", risk: "Pode ser início de doença. Sem ação, você pode perder centenas de aves." },
  { id: 3, type: "info" as const, msg: "Lote #F-2024-03 atingindo pico de produção", time: "1d atrás", action: "Ver lote", risk: "Sem acompanhamento, você perde a chance de maximizar o lucro nesse período." },
];

const tasks = [
  { id: 1, title: "Coletar ovos — Galpão A1", status: "done" as const, time: "06:00" },
  { id: 2, title: "Alimentar aves — Todos", status: "done" as const, time: "06:30" },
  { id: 3, title: "Vacinar Lote #F-2024-05", status: "progress" as const, time: "08:00" },
  { id: 4, title: "Inspeção de entrega de ração", status: "pending" as const, time: "10:00" },
  { id: 5, title: "Limpeza Galpão B3", status: "pending" as const, time: "14:00" },
];

export default function DashboardPage() {
  const profitMargin = ((mockMonthFinancial.profit / mockMonthFinancial.revenue) * 100).toFixed(1);
  const [taskStatuses, setTaskStatuses] = useState<Record<number, "done" | "progress" | "pending">>(
    Object.fromEntries(tasks.map((t) => [t.id, t.status]))
  );
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const completedTasks = Object.values(taskStatuses).filter((s) => s === "done").length;

  return (
    <div className="space-y-6">
      {/* ── Header + Quick Actions ── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Bom dia, {mockFarm.producer.split(" ")[0]}!
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {mockFarm.name} · {formatNumber(mockFarm.activeBirds)} aves ativas · {mockFarm.barns} galpões
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
              <CalendarDays className="w-4 h-4" />
              Hoje, 18 Mar
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5",
                a.color
              )}
            >
              <a.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.title}
            className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200/80 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity", kpi.gradient)} />
            <div className="flex items-start justify-between mb-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", kpi.lightBg)}>
                <kpi.icon className={cn("w-5 h-5", kpi.lightIcon)} />
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
            <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{kpi.title}</p>
            <p className="text-[11px] text-gray-400 mt-2">{kpi.subtitle}</p>
            {/* Mini progress bar */}
            <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", `bg-gradient-to-r ${kpi.gradient}`)}
                style={{ width: `${Math.min(kpi.progress, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── PRIORITY BLOCK: Alerts + Tasks (2 columns) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Alertas Ativos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center shadow-sm">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Alertas ativos</h3>
                <p className="text-[11px] text-gray-400 font-medium">
                  {alerts.filter(a => a.type === "danger").length > 0 && (
                    <span className="text-red-600 font-semibold">{alerts.filter(a => a.type === "danger").length} urgente · </span>
                  )}
                  {alerts.length} alertas no total
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-white bg-red-500 px-2.5 py-1 rounded-lg">{alerts.length}</span>
          </div>
          <div className="space-y-3">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "rounded-xl p-4 border transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5",
                  a.type === "danger" && "bg-red-50 border-red-200 hover:border-red-300",
                  a.type === "warning" && "bg-amber-50 border-amber-200 hover:border-amber-300",
                  a.type === "info" && "bg-blue-50 border-blue-200 hover:border-blue-300"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                    a.type === "danger" && "bg-red-100",
                    a.type === "warning" && "bg-amber-100",
                    a.type === "info" && "bg-blue-100"
                  )}>
                    <AlertTriangle className={cn(
                      "w-4 h-4",
                      a.type === "danger" && "text-red-600",
                      a.type === "warning" && "text-amber-600",
                      a.type === "info" && "text-blue-600"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[13px] font-semibold leading-snug",
                      a.type === "danger" && "text-red-800",
                      a.type === "warning" && "text-amber-800",
                      a.type === "info" && "text-blue-800"
                    )}>
                      {a.msg}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed italic">
                      Se ignorar: {a.risk}
                    </p>
                    <div className="flex items-center justify-between mt-2.5">
                      <p className="text-[11px] text-gray-400">{a.time}</p>
                      <button className={cn(
                        "text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors",
                        a.type === "danger" && "text-white bg-red-500 hover:bg-red-600",
                        a.type === "warning" && "text-amber-800 bg-amber-200 hover:bg-amber-300",
                        a.type === "info" && "text-blue-800 bg-blue-200 hover:bg-blue-300"
                      )}>
                        {a.action}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tarefas do Dia */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Tarefas do dia</h3>
                <p className="text-[11px] text-gray-400 font-medium">
                  {completedTasks} de {tasks.length} concluídas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none" stroke="#2d7a4f" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(completedTasks / tasks.length) * 94.2} 94.2`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
                  {((completedTasks / tasks.length) * 100).toFixed(0)}%
                </span>
              </div>
              <button className="inline-flex items-center gap-1.5 text-xs text-brand-600 font-semibold hover:text-brand-700 cursor-pointer transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {tasks.map((t) => {
              const status = taskStatuses[t.id];
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200",
                    status === "done" && "bg-emerald-50/50 border-emerald-100",
                    status === "progress" && "bg-amber-50/50 border-amber-100",
                    status === "pending" && "bg-gray-50/50 border-gray-100"
                  )}
                >
                  {/* Clickable square checkbox with dropdown */}
                  <div className="relative" ref={openDropdown === t.id ? dropdownRef : undefined}>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === t.id ? null : t.id)}
                      className="w-[18px] h-[18px] rounded flex items-center justify-center cursor-pointer transition-colors border flex-shrink-0"
                      style={{
                        borderColor: status === "done" ? "#10b981" : status === "progress" ? "#f59e0b" : "#d1d5db",
                        backgroundColor: status === "done" ? "#10b981" : status === "progress" ? "#f59e0b" : "transparent",
                      }}
                    >
                      {status === "done" && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                      {status === "progress" && <Minus className="w-3.5 h-3.5 text-white" />}
                    </button>

                    {/* Status dropdown */}
                    {openDropdown === t.id && (
                      <div className="absolute left-0 top-7 z-50 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 w-44 animate-in fade-in slide-in-from-top-1 duration-150">
                        {[
                          { value: "done" as const, label: "Concluído", icon: CheckSquare, color: "text-emerald-600", bg: "hover:bg-emerald-50" },
                          { value: "progress" as const, label: "Em Andamento", icon: Clock, color: "text-amber-600", bg: "hover:bg-amber-50" },
                          { value: "pending" as const, label: "Pendente", icon: Square, color: "text-gray-400", bg: "hover:bg-gray-50" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setTaskStatuses((prev) => ({ ...prev, [t.id]: opt.value }));
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              "flex items-center gap-2.5 w-full px-3 py-2 text-left text-[13px] font-medium transition-colors cursor-pointer",
                              opt.bg,
                              status === opt.value ? "bg-gray-50 font-bold" : "text-gray-700"
                            )}
                          >
                            <opt.icon className={cn("w-4 h-4", opt.color)} />
                            {opt.label}
                            {status === opt.value && (
                              <span className="ml-auto text-[10px] text-gray-400 font-normal">atual</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "text-[13px] truncate block",
                      status === "done" ? "text-gray-400 line-through" : "text-gray-700 font-medium"
                    )}>
                      {t.title}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{t.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Barn Status Strip ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-gray-900">Status dos Galpões</h3>
          </div>
          <button className="text-xs text-brand-600 font-semibold hover:text-brand-700 cursor-pointer transition-colors flex items-center gap-1">
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {mockBarns.map((barn) => (
            <div
              key={barn.id}
              className={cn(
                "relative rounded-xl p-4 border transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5",
                barn.layingRate >= 90 ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300" : barn.layingRate >= 88 ? "border-brand-200 bg-brand-50/30 hover:border-brand-300" : barn.layingRate >= 85 ? "border-amber-200 bg-amber-50/50 hover:border-amber-300" : "border-red-200 bg-red-50/50 hover:border-red-300"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-900">{barn.name}</span>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  barn.layingRate >= 90 ? "bg-emerald-500" : barn.layingRate >= 88 ? "bg-brand-500" : barn.layingRate >= 85 ? "bg-amber-500" : "bg-red-500"
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-gray-400 font-medium">Aves</p>
                  <p className="text-sm font-bold text-gray-800">{formatNumber(barn.birds)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-medium">Postura</p>
                  <p className={cn(
                    "text-sm font-bold",
                    barn.layingRate >= 88 ? "text-emerald-600" : barn.layingRate >= 85 ? "text-amber-600" : "text-red-600"
                  )}>
                    {barn.layingRate}%
                  </p>
                </div>
              </div>
              {barn.layingRate >= 90 ? (
                <div className="mt-2 flex items-center gap-1.5 text-emerald-700 bg-emerald-100/80 rounded-lg px-2.5 py-1.5">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[11px] font-medium">Desempenho excelente</span>
                </div>
              ) : barn.layingRate >= 88 ? (
                <div className="mt-2 flex items-center gap-1.5 text-brand-700 bg-brand-100/80 rounded-lg px-2.5 py-1.5">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[11px] font-medium">Postura dentro da meta</span>
                </div>
              ) : barn.layingRate >= 85 ? (
                <div className="mt-2 flex items-center gap-1.5 text-amber-700 bg-amber-100/80 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[11px] font-medium">Postura abaixo da meta</span>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-1.5 text-red-700 bg-red-100/80 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[11px] font-medium">Postura crítica</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Production Chart + AI Insights ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-900">Produção Semanal</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                <span className="text-[11px] text-gray-400 font-medium">Ovos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <span className="text-[11px] text-gray-400 font-medium">Meta</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mb-5">Últimos 7 dias · Atualizado agora</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOvos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2d7a4f" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#2d7a4f" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} domain={[12000, 14000]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                formatter={(value: number, name: string) => [formatNumber(value), name]}
              />
              <Area type="monotone" dataKey="meta" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="6 4" fill="none" dot={false} name="Meta" />
              <Area type="monotone" dataKey="ovos" stroke="#2d7a4f" strokeWidth={2.5} fill="url(#colorOvos)" dot={{ r: 4, fill: "#fff", stroke: "#2d7a4f", strokeWidth: 2.5 }} activeDot={{ r: 6, fill: "#2d7a4f", stroke: "#fff", strokeWidth: 3 }} name="Ovos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI Performance Insights */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Assistente de Granja</h3>
              <p className="text-[11px] text-gray-400 font-medium">Baseado nos últimos 7 dias</p>
            </div>
          </div>

          <div className="space-y-3 flex-1">
            {/* Insight items */}
            {[
              {
                type: "warning" as const,
                icon: TrendingDown,
                title: "Produção caiu 2.2% esta semana",
                detail: "Seg-Ter tiveram queda acentuada. Galpão 2 é o principal responsável.",
              },
              {
                type: "success" as const,
                icon: TrendingUp,
                title: "Lucro aumentou 8.5% no mês",
                detail: "Receita cresceu mais que despesas. Margem atual: " + profitMargin + "%.",
              },
              {
                type: "danger" as const,
                icon: AlertTriangle,
                title: "Custo de ração subiu 5.3%",
                detail: "Estoque para apenas 3 dias. Considere negociar com fornecedor.",
              },
              {
                type: "info" as const,
                icon: Target,
                title: "Meta semanal: 92% atingida",
                detail: "Faltam 2.100 ovos para bater a meta de 94.500 na semana.",
              },
              {
                type: "success" as const,
                icon: Activity,
                title: "Mortalidade sob controle",
                detail: "Taxa de 0.02% — bem abaixo do limite aceitável de 0.05%.",
              },
            ].map((insight, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl px-4 py-3 border-l-[3px] cursor-pointer transition-colors",
                  insight.type === "warning" && "bg-amber-50/60 border-l-amber-500 hover:bg-amber-50",
                  insight.type === "success" && "bg-emerald-50/60 border-l-emerald-500 hover:bg-emerald-50",
                  insight.type === "danger" && "bg-red-50/60 border-l-red-500 hover:bg-red-50",
                  insight.type === "info" && "bg-blue-50/60 border-l-blue-500 hover:bg-blue-50"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <insight.icon className={cn(
                    "w-4 h-4 flex-shrink-0 mt-0.5",
                    insight.type === "warning" && "text-amber-600",
                    insight.type === "success" && "text-emerald-600",
                    insight.type === "danger" && "text-red-600",
                    insight.type === "info" && "text-blue-600"
                  )} />
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900 leading-snug">{insight.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{insight.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Financial Row: Revenue Chart + Expense Breakdown + Profit Summary ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Revenue vs Expenses */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-900">Receita vs Despesas</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-brand-500" />
                <span className="text-[11px] text-gray-400 font-medium">Receita</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                <span className="text-[11px] text-gray-400 font-medium">Despesas</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mb-5">Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} dx={-4} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px" }}
                formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, undefined]}
              />
              <Bar dataKey="receita" fill="#2d7a4f" radius={[5, 5, 0, 0]} name="Receita" />
              <Bar dataKey="despesas" fill="#fbbf24" radius={[5, 5, 0, 0]} name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown Donut */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Despesas do Mês</h3>
          <p className="text-[11px] text-gray-400 mb-3">Total: {formatCurrency(mockMonthFinancial.expenses)}</p>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {expenseBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "12px" }}
                  formatter={(value: number) => [formatCurrency(value), undefined]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {expenseBreakdown.map((e) => (
              <div key={e.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                  <span className="text-[12px] text-gray-600 font-medium">{e.name}</span>
                </div>
                <span className="text-[12px] font-bold text-gray-800">{formatCurrency(e.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Profit Summary Card */}
        <div className="xl:col-span-4 bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-5">Resumo Financeiro</h3>
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-medium">Receita</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(mockMonthFinancial.revenue)}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">+8.5%</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-medium">Despesas</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(mockMonthFinancial.expenses)}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">-3.2%</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-medium">Lucro Líquido</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(mockMonthFinancial.profit)}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{profitMargin}%</span>
            </div>
            {/* Revenue Goal Progress */}
            <div className="mt-auto pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-gray-500 font-medium">Meta de receita mensal</span>
                <span className="text-[11px] font-bold text-gray-700">
                  {((mockMonthFinancial.revenue / mockMonthFinancial.revenueGoal) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-700"
                  style={{ width: `${(mockMonthFinancial.revenue / mockMonthFinancial.revenueGoal) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                {formatCurrency(mockMonthFinancial.revenue)} de {formatCurrency(mockMonthFinancial.revenueGoal)}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
