"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  mockFarm,
  mockTodayProduction,
  mockTodayFeed,
  mockMonthFinancial,
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
  Legend,
} from "recharts";

/* ── KPI Data ── */
const kpis = [
  {
    title: "Ovos Hoje",
    value: formatNumber(mockTodayProduction.eggsProduced),
    badge: "+3.2%",
    badgeDir: "up" as const,
    icon: Egg,
    gradient: "from-brand-500 to-brand-600",
    lightBg: "bg-brand-50",
    lightIcon: "text-brand-600",
  },
  {
    title: "Aves Ativas",
    value: formatNumber(mockFarm.activeBirds),
    badge: "-12",
    badgeDir: "down" as const,
    icon: Bird,
    gradient: "from-violet-500 to-violet-600",
    lightBg: "bg-violet-50",
    lightIcon: "text-violet-600",
  },
  {
    title: "Estoque Ração",
    value: `${formatNumber(mockTodayFeed.quantity)} kg`,
    badge: "3 dias",
    badgeDir: "neutral" as const,
    icon: Wheat,
    gradient: "from-amber-500 to-amber-600",
    lightBg: "bg-amber-50",
    lightIcon: "text-amber-600",
  },
  {
    title: "Receita Mensal",
    value: formatCurrency(mockMonthFinancial.revenue),
    badge: "+8.5%",
    badgeDir: "up" as const,
    icon: DollarSign,
    gradient: "from-emerald-500 to-emerald-600",
    lightBg: "bg-emerald-50",
    lightIcon: "text-emerald-600",
  },
];

/* ── Chart Data ── */
const weeklyData = [
  { day: "Seg", ovos: 2500, meta: 2700 },
  { day: "Ter", ovos: 2620, meta: 2700 },
  { day: "Qua", ovos: 2550, meta: 2700 },
  { day: "Qui", ovos: 2700, meta: 2700 },
  { day: "Sex", ovos: 2650, meta: 2700 },
  { day: "Sab", ovos: 2580, meta: 2700 },
  { day: "Dom", ovos: 2630, meta: 2700 },
];

const revenueData = [
  { month: "Jan", receita: 12500, despesas: 8500 },
  { month: "Fev", receita: 13000, despesas: 9200 },
  { month: "Mar", receita: 13500, despesas: 9000 },
  { month: "Abr", receita: 14000, despesas: 9800 },
  { month: "Mai", receita: 13200, despesas: 10200 },
  { month: "Jun", receita: 14500, despesas: 9500 },
];

const alerts = [
  { id: 1, type: "danger" as const, msg: "Estoque de ração baixo — 3 dias restantes", time: "2h atrás" },
  { id: 2, type: "warning" as const, msg: "Pico de mortalidade detectado no Galpão B2 (+2.3%)", time: "4h atrás" },
  { id: 3, type: "info" as const, msg: "Lote #F-2024-03 atingindo pico de produção na próxima semana", time: "1d atrás" },
];

const tasks = [
  { id: 1, title: "Coletar ovos — Galpão A1", status: "Pendente" as const },
  { id: 2, title: "Vacinar Lote #F-2024-05", status: "Pendente" as const },
  { id: 3, title: "Inspeção de entrega de ração", status: "Concluído" as const },
  { id: 4, title: "Limpeza Galpão B3", status: "Em Andamento" as const },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bom dia! Aqui está o resumo da sua granja.</p>
        </div>
        <button className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
          <CalendarDays className="w-4 h-4" />
          Hoje
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.title}
            className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity", kpi.gradient)} />
            <div className="flex items-start justify-between mb-4">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105", kpi.lightBg)}>
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
            <p className="text-xs text-gray-400 mt-1 font-medium">{kpi.title}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Weekly Production Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-gray-900">Produção Semanal de Ovos</h3>
            <button className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOvos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2d7a4f" stopOpacity={0.25} />
                  <stop offset="60%" stopColor="#2d7a4f" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#2d7a4f" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} domain={[0, 2800]} ticks={[0, 700, 1400, 2100, 2800]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                formatter={(value: number, name: string) => [value.toLocaleString("pt-BR"), name]}
              />
              <Area type="monotone" dataKey="meta" stroke="#b0b0b0" strokeWidth={1.5} strokeDasharray="6 4" fill="none" dot={false} name="Meta" />
              <Area type="monotone" dataKey="ovos" stroke="#2d7a4f" strokeWidth={2.5} fill="url(#colorOvos)" dot={{ r: 5, fill: "#fff", stroke: "#2d7a4f", strokeWidth: 2.5 }} activeDot={{ r: 7, fill: "#2d7a4f", stroke: "#fff", strokeWidth: 3 }} name="Ovos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-gray-900">Alertas</h3>
            </div>
            <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{alerts.length}</span>
          </div>
          <div className="space-y-3">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "rounded-xl p-4 border-l-[3px] transition-colors cursor-pointer",
                  a.type === "danger" && "bg-red-50/60 border-l-red-500 hover:bg-red-50",
                  a.type === "warning" && "bg-amber-50/60 border-l-amber-500 hover:bg-amber-50",
                  a.type === "info" && "bg-blue-50/60 border-l-blue-500 hover:bg-blue-50"
                )}
              >
                <p className={cn(
                  "text-[13px] font-medium leading-snug",
                  a.type === "danger" && "text-red-800",
                  a.type === "warning" && "text-amber-800",
                  a.type === "info" && "text-blue-800"
                )}>
                  {a.msg}
                </p>
                <p className="text-[11px] text-gray-400 mt-1.5">{a.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue + Tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue vs Expenses */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-gray-900">Receita vs Despesas</h3>
            <div className="flex items-center gap-4">
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
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px" }}
                labelStyle={{ fontWeight: 600, color: "#111827", marginBottom: "4px" }}
                formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, undefined]}
              />
              <Bar dataKey="receita" fill="#2d7a4f" radius={[6, 6, 0, 0]} name="Receita" />
              <Bar dataKey="despesas" fill="#fbbf24" radius={[6, 6, 0, 0]} name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-gray-900">Tarefas de Hoje</h3>
            <button className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-1">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    t.status === "Concluído" && "bg-emerald-500",
                    t.status === "Em Andamento" && "bg-amber-400",
                    t.status === "Pendente" && "bg-gray-300"
                  )} />
                  <span className={cn(
                    "text-[13px] truncate",
                    t.status === "Concluído" ? "text-gray-400 line-through" : "text-gray-700"
                  )}>
                    {t.title}
                  </span>
                </div>
                <span className={cn(
                  "text-[11px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap ml-3",
                  t.status === "Concluído" && "text-emerald-700 bg-emerald-50",
                  t.status === "Em Andamento" && "text-amber-700 bg-amber-50",
                  t.status === "Pendente" && "text-gray-500 bg-gray-100"
                )}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
