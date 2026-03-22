"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  ChevronLeft,
  Zap,
  Plus,
  BarChart3,
  Activity,
  Square,
  CheckSquare,
  Minus,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import {
  mockFarm,
  mockTodayProduction,
  mockTodayFeed,
  mockMonthFinancial,
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
import next from "next";
import Link from "next/link";
import ModalPortal from "@/components/ui/modal-portal";
import { X, Pencil, Trash2 } from "lucide-react";

/* ── KPI Data ── */
const kpis = [
  {
    title: "Ovos",
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
    title: "Lucro Últimos 30 Dias",
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

const todayStr = new Date().toISOString().split("T")[0];
const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; })();

const tasks = [
  { id: 1, title: "Coletar ovos — Galpão A1", status: "done" as const, time: "06:00", date: todayStr },
  { id: 2, title: "Alimentar aves — Todos", status: "done" as const, time: "06:30", date: todayStr },
  { id: 3, title: "Vacinar Lote #F-2024-05", status: "progress" as const, time: "08:00", date: todayStr },
  { id: 4, title: "Inspeção de entrega de ração", status: "pending" as const, time: "10:00", date: todayStr },
  { id: 5, title: "Limpeza Galpão B3", status: "pending" as const, time: "14:00", date: todayStr },
  { id: 6, title: "Verificar bebedouros — Galpão A2", status: "pending" as const, time: "09:00", date: yesterdayStr },
];

export default function DashboardPage() {
  const { profile, farm } = useAuth();
  const supabase = createClient();

  // Real data state
  const [farmData, setFarmData] = useState(mockFarm);
  const [productionData, setProductionData] = useState(mockTodayProduction);
  const [feedData, setFeedData] = useState(mockTodayFeed);
  const [financialData, setFinancialData] = useState(mockMonthFinancial);
  const [barnsData, setBarnsData] = useState(mockBarns);
  const [dbTasks, setDbTasks] = useState(tasks);
  const [dbAlerts, setDbAlerts] = useState(alerts);
  const [dataLoaded, setDataLoaded] = useState(false);

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

  const handleDayClick = useCallback((day: Date) => {
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

  // Fetch real data from Supabase when farm is available
  useEffect(() => {
    if (!farm) return;
    const currentFarm = farm;
    const farmId = currentFarm.id;

    async function fetchDashboardData() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

        const [prodRes, feedRes, barnsRes, tasksRes, alertsRes, finRes] = await Promise.all([
          supabase.from("egg_production").select("*").eq("farm_id", farmId).eq("date", today),
          supabase.from("feed_consumption").select("*").eq("farm_id", farmId).eq("date", today),
          supabase.from("barns").select("*").eq("farm_id", farmId).order("created_at"),
          supabase.from("tasks").select("*").eq("farm_id", farmId).eq("date", today).order("scheduled_time"),
          supabase.from("alerts").select("*").eq("farm_id", farmId).eq("read", false).order("created_at", { ascending: false }).limit(5),
          supabase.from("financial_transactions").select("*").eq("farm_id", farmId).gte("date", monthStart).lte("date", monthEnd),
        ]);

        // Update farm info
        setFarmData({
          name: currentFarm.name,
          producer: currentFarm.producer_name,
          totalBirds: currentFarm.total_birds,
          activeBirds: currentFarm.total_birds,
          barns: barnsRes.data?.length ?? 0,
          breed: currentFarm.main_breed,
          productionSystem: currentFarm.production_system,
        });

        // Aggregate today's production
        if (prodRes.data && prodRes.data.length > 0) {
          const totalEggs = prodRes.data.reduce((s, r) => s + r.eggs_produced, 0);
          const totalBroken = prodRes.data.reduce((s, r) => s + (r.broken_eggs ?? 0), 0);
          const totalDirty = prodRes.data.reduce((s, r) => s + (r.dirty_eggs ?? 0), 0);
          const totalDiscarded = prodRes.data.reduce((s, r) => s + (r.discarded_eggs ?? 0), 0);
          const totalSold = prodRes.data.reduce((s, r) => s + (r.eggs_sold ?? 0), 0);
          const avgPrice = prodRes.data.reduce((s, r) => s + Number(r.egg_price ?? 0), 0) / prodRes.data.length;
          const avgRate = prodRes.data.reduce((s, r) => s + Number(r.laying_rate ?? 0), 0) / prodRes.data.length;
          const avgPerBird = prodRes.data.reduce((s, r) => s + Number(r.eggs_per_bird ?? 0), 0) / prodRes.data.length;
          setProductionData({
            date: today,
            eggsProduced: totalEggs,
            brokenEggs: totalBroken,
            dirtyEggs: totalDirty,
            discardedEggs: totalDiscarded,
            eggsSold: totalSold,
            eggPrice: avgPrice,
            layingRate: avgRate,
            eggsPerBird: avgPerBird,
          });
        }

        // Aggregate today's feed
        if (feedRes.data && feedRes.data.length > 0) {
          const totalQty = feedRes.data.reduce((s, r) => s + Number(r.quantity_kg), 0);
          const totalCost = feedRes.data.reduce((s, r) => s + Number(r.cost ?? 0), 0);
          const avgCostPerEgg = feedRes.data.reduce((s, r) => s + Number(r.cost_per_egg ?? 0), 0) / feedRes.data.length;
          setFeedData({
            quantity: totalQty,
            cost: totalCost,
            type: feedRes.data[0].feed_type ?? "Ração Postura",
            costPerEgg: avgCostPerEgg,
          });
        }

        // Barns
        if (barnsRes.data && barnsRes.data.length > 0) {
          setBarnsData(barnsRes.data.map((b) => ({
            id: b.id as any,
            name: b.name,
            birds: b.current_birds,
            layingRate: 0,
            status: (b.status === "active" ? "ok" : "warning") as "ok" | "warning",
          })));
        }

        // Tasks
        if (tasksRes.data && tasksRes.data.length > 0) {
          setDbTasks(tasksRes.data.map((t) => ({
            id: t.id as any,
            title: t.title,
            status: (t.done ? "done" : "pending") as "done" | "progress" | "pending",
            time: t.scheduled_time ?? "",
            date: t.scheduled_date ?? todayStr,
          })));
        }

        // Alerts
        if (alertsRes.data && alertsRes.data.length > 0) {
          setDbAlerts(alertsRes.data.map((a) => ({
            id: a.id as any,
            type: (a.type === "error" ? "danger" : a.type) as "danger" | "warning" | "info",
            msg: a.message,
            time: new Date(a.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            action: "Ver",
            risk: "",
          })));
        }

        // Financial summary
        if (finRes.data && finRes.data.length > 0) {
          const revenue = finRes.data.filter((t) => t.type === "revenue").reduce((s, t) => s + Number(t.amount), 0);
          const expenses = finRes.data.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
          const feedCost = finRes.data.filter((t) => t.type === "expense" && t.category === "feed").reduce((s, t) => s + Number(t.amount), 0);
          const laborCost = finRes.data.filter((t) => t.type === "expense" && t.category === "labor").reduce((s, t) => s + Number(t.amount), 0);
          setFinancialData({
            revenue,
            expenses,
            profit: revenue - expenses,
            feedCost,
            laborCost,
            otherExpenses: expenses - feedCost - laborCost,
            revenueGoal: mockMonthFinancial.revenueGoal,
          });
        }

        setDataLoaded(true);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setDataLoaded(true);
      }
    }

    fetchDashboardData();
  }, [farm]);

  const profitMargin = financialData.revenue > 0
    ? ((financialData.profit / financialData.revenue) * 100).toFixed(1)
    : "0.0";
  const [taskStatuses, setTaskStatuses] = useState<Record<number | string, "done" | "progress" | "pending">>(
    Object.fromEntries(dbTasks.map((t) => [t.id, t.status]))
  );

  // Sync task statuses when dbTasks changes from fetch
  useEffect(() => {
    setTaskStatuses(Object.fromEntries(dbTasks.map((t) => [t.id, t.status])));
  }, [dbTasks]);

  const [openDropdown, setOpenDropdown] = useState<number | string | null>(null);
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

  // New task modal state
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [viewTask, setViewTask] = useState<(typeof dbTasks)[number] | null>(null);
  const [editingTask, setEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskTime, setEditTaskTime] = useState("");
  const [editTaskDate, setEditTaskDate] = useState("");

  const handleAddTask = useCallback(() => {
    if (!newTaskTitle.trim()) return;
    const newId = Date.now();
    setDbTasks((prev) => [...prev, { id: newId, title: newTaskTitle.trim(), status: "pending" as const, time: newTaskTime || "--:--", date: newTaskDate || todayStr }]);
    setTaskStatuses((prev) => ({ ...prev, [newId]: "pending" }));
    setNewTaskTitle("");
    setNewTaskTime("");
    setNewTaskDate("");
    setShowNewTask(false);
  }, [newTaskTitle, newTaskTime, newTaskDate]);

  const displayName = profile?.full_name?.split(" ")[0] || farmData.producer.split(" ")[0];
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  // Recompute KPI data from real state
  const currentKpis = useMemo(() => [
    {
      title: "Ovos",
      value: formatNumber(productionData.eggsProduced),
      badge: "+3.2%",
      badgeDir: "up" as const,
      subtitle: `Meta: 15.000 · ${((productionData.eggsProduced / 15000) * 100).toFixed(0)}% atingido`,
      icon: Egg,
      color: "brand",
      gradient: "from-brand-500 to-brand-600",
      lightBg: "bg-brand-50",
      lightIcon: "text-brand-600",
      progress: (productionData.eggsProduced / 15000) * 100,
    },
    {
      title: "Taxa de Postura",
      value: `${productionData.layingRate.toFixed(1)}%`,
      badge: "+1.2%",
      badgeDir: "up" as const,
      subtitle: "Meta: 90% · Padrão: 85-92%",
      icon: Target,
      color: "violet",
      gradient: "from-violet-500 to-violet-600",
      lightBg: "bg-violet-50",
      lightIcon: "text-violet-600",
      progress: (productionData.layingRate / 92) * 100,
    },
    {
      title: "Custo por Ovo",
      value: `R$ ${feedData.costPerEgg.toFixed(3)}`,
      badge: "-2.1%",
      badgeDir: "up" as const,
      subtitle: `Ração: R$ ${formatNumber(feedData.cost)} · ${formatNumber(feedData.quantity)}kg`,
      icon: Wheat,
      color: "amber",
      gradient: "from-amber-500 to-amber-600",
      lightBg: "bg-amber-50",
      lightIcon: "text-amber-600",
      progress: 72,
    },
    {
      title: "Lucro Últimos 30 Dias",
      value: formatCurrency(financialData.profit),
      badge: "+8.5%",
      badgeDir: "up" as const,
      subtitle: `Receita: ${formatCurrency(financialData.revenue)}`,
      icon: DollarSign,
      color: "emerald",
      gradient: "from-emerald-500 to-emerald-600",
      lightBg: "bg-emerald-50",
      lightIcon: "text-emerald-600",
      progress: financialData.revenue > 0 ? (financialData.profit / financialData.revenue) * 100 : 0,
    },
  ], [productionData, feedData, financialData]);

  const currentExpenseBreakdown = useMemo(() => [
    { name: "Ração", value: financialData.feedCost, color: "#f59e0b" },
    { name: "Mão de obra", value: financialData.laborCost, color: "#8b5cf6" },
    { name: "Outros", value: financialData.otherExpenses, color: "#94a3b8" },
  ], [financialData]);

  return (
    <div className="space-y-6">
      {/* ── Header + Quick Actions ── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {greeting}, {displayName}!
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {farmData.name} · {formatNumber(farmData.activeBirds)} aves ativas · {farmData.barns} galpões
            </p>
          </div>
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
                  /* Month grid */
                  <div className="grid grid-cols-3 gap-2">
                    {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((m, i) => {
                      const isSelected = selectedDate.getMonth() === i && selectedDate.getFullYear() === calendarMonth.getFullYear();
                      return (
                        <button
                          key={m}
                          onClick={() => handleMonthClick(i)}
                          className={cn(
                            "py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
                            isSelected
                              ? "bg-brand-600 text-white shadow-sm"
                              : "text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Interval day grid */
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
                            onClick={() => handleDayClick(day)}
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

                {/* Today button */}
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
        {currentKpis.map((kpi) => (
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
                  {dbAlerts.filter(a => a.type === "danger").length > 0 && (
                    <span className="text-red-600 font-semibold">{dbAlerts.filter(a => a.type === "danger").length} urgente · </span>
                  )}
                  {dbAlerts.length} alertas no total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 flex-shrink-0"><Sparkles className="w-3 h-3" />Pro</span>
              <span className="text-[11px] font-bold text-white bg-red-500 px-2.5 py-1 rounded-lg">{dbAlerts.length}</span>
            </div>
          </div>
          <div className="space-y-3">
            {dbAlerts.map((a) => (
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
                <h3 className="text-base font-bold text-gray-900">Tarefas</h3>
                <p className="text-[11px] text-gray-400 font-medium">
                  {completedTasks} de {dbTasks.length} concluídas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 flex-shrink-0">
                <Sparkles className="w-3 h-3" />
                Premium
              </span>
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none" stroke="#2d7a4f" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(completedTasks / (dbTasks.length || 1)) * 94.2} 94.2`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
                  {((completedTasks / (dbTasks.length || 1)) * 100).toFixed(0)}%
                </span>
              </div>
              <button
                onClick={() => setShowNewTask(true)}
                className="inline-flex items-center gap-1.5 text-xs text-brand-600 font-semibold hover:text-brand-700 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-visible">
            {dbTasks.map((t) => {
              const status = taskStatuses[t.id];
              const isDelayed = status !== "done" && t.date < todayStr;
              const formatTaskDate = (d: string) => {
                if (d === todayStr) return "Hoje";
                if (d === yesterdayStr) return "Ontem";
                const [y, m, day] = d.split("-");
                return `${day}/${m}`;
              };
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200",
                    isDelayed && "bg-red-50/50 border-red-200",
                    !isDelayed && status === "done" && "bg-emerald-50/50 border-emerald-100",
                    !isDelayed && status === "progress" && "bg-amber-50/50 border-amber-100",
                    !isDelayed && status === "pending" && "bg-gray-50/50 border-gray-100"
                  )}
                >
                  {/* Clickable square checkbox with dropdown */}
                  <div className="relative" ref={openDropdown === t.id ? dropdownRef : undefined}>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === t.id ? null : t.id)}
                      className="w-[18px] h-[18px] rounded flex items-center justify-center cursor-pointer transition-colors border flex-shrink-0"
                      style={{
                        borderColor: isDelayed ? "#ef4444" : status === "done" ? "#10b981" : status === "progress" ? "#f59e0b" : "#d1d5db",
                        backgroundColor: isDelayed ? "#ef4444" : status === "done" ? "#10b981" : status === "progress" ? "#f59e0b" : "transparent",
                      }}
                    >
                      {status === "done" && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                      {status === "progress" && !isDelayed && <Minus className="w-3.5 h-3.5 text-white" />}
                      {isDelayed && status !== "done" && <AlertTriangle className="w-3 h-3 text-white" />}
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

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => { setViewTask(t); setEditingTask(false); setEditTaskTitle(t.title); setEditTaskTime(t.time); setEditTaskDate(t.date); }}
                  >
                    <span className={cn(
                      "text-[13px] truncate block",
                      isDelayed && "text-red-600 font-medium",
                      !isDelayed && status === "done" && "text-gray-400 line-through",
                      !isDelayed && status !== "done" && "text-gray-700 font-medium"
                    )}>
                      {t.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isDelayed && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                        Atrasada
                      </span>
                    )}
                    <span
                      className={cn("text-[11px] flex-shrink-0 cursor-pointer", isDelayed ? "text-red-400" : "text-gray-400")}
                      onClick={() => { setViewTask(t); setEditingTask(false); setEditTaskTitle(t.title); setEditTaskTime(t.time); setEditTaskDate(t.date); }}
                    >
                      {formatTaskDate(t.date)} · {t.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Task Modal */}
      {showNewTask && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewTask(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Nova Tarefa</h3>
                <button onClick={() => setShowNewTask(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Título</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Ex: Coletar ovos — Galpão A1"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Data</label>
                    <input
                      type="date"
                      value={newTaskDate}
                      onChange={(e) => setNewTaskDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Horário</label>
                    <input
                      type="time"
                      value={newTaskTime}
                      onChange={(e) => setNewTaskTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setShowNewTask(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Task Detail Modal */}
      {viewTask && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewTask(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Detalhes da Tarefa</h3>
                <button onClick={() => setViewTask(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {editingTask ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Título</label>
                    <input
                      type="text"
                      value={editTaskTitle}
                      onChange={(e) => setEditTaskTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Data</label>
                      <input
                        type="date"
                        value={editTaskDate}
                        onChange={(e) => setEditTaskDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Horário</label>
                      <input
                        type="time"
                        value={editTaskTime}
                        onChange={(e) => setEditTaskTime(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                    <div className="flex gap-2">
                      {[
                        { value: "done" as const, label: "Concluído", color: "bg-emerald-500" },
                        { value: "progress" as const, label: "Em Andamento", color: "bg-amber-500" },
                        { value: "pending" as const, label: "Pendente", color: "bg-gray-400" },
                      ].map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setTaskStatuses((prev) => ({ ...prev, [viewTask.id]: s.value }))}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                            taskStatuses[viewTask.id] === s.value
                              ? `${s.color} text-white border-transparent`
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => setEditingTask(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        setDbTasks((prev) => prev.map((task) => task.id === viewTask.id ? { ...task, title: editTaskTitle.trim() || task.title, time: editTaskTime || task.time, date: editTaskDate || task.date } : task));
                        setViewTask({ ...viewTask, title: editTaskTitle.trim() || viewTask.title, time: editTaskTime || viewTask.time, date: editTaskDate || viewTask.date });
                        setEditingTask(false);
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors cursor-pointer shadow-sm"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (() => {
                const viewDelayed = taskStatuses[viewTask.id] !== "done" && viewTask.date < todayStr;
                const formatDetailDate = (d: string) => {
                  if (d === todayStr) return "Hoje";
                  if (d === yesterdayStr) return "Ontem";
                  const [y, m, day] = d.split("-");
                  return `${day}/${m}/${y}`;
                };
                return (
                <div className="space-y-4">
                  {viewDelayed && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="text-xs font-semibold text-red-600">Tarefa atrasada — deveria ter sido concluída em {formatDetailDate(viewTask.date)}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        borderWidth: 2,
                        borderColor: viewDelayed ? "#ef4444" : taskStatuses[viewTask.id] === "done" ? "#10b981" : taskStatuses[viewTask.id] === "progress" ? "#f59e0b" : "#d1d5db",
                        backgroundColor: viewDelayed ? "#ef4444" : taskStatuses[viewTask.id] === "done" ? "#10b981" : taskStatuses[viewTask.id] === "progress" ? "#f59e0b" : "transparent",
                      }}
                    >
                      {taskStatuses[viewTask.id] === "done" && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                      {taskStatuses[viewTask.id] === "progress" && !viewDelayed && <Minus className="w-3.5 h-3.5 text-white" />}
                      {viewDelayed && <AlertTriangle className="w-3 h-3 text-white" />}
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      viewDelayed && "text-red-600",
                      !viewDelayed && taskStatuses[viewTask.id] === "done" && "text-gray-400 line-through",
                      !viewDelayed && taskStatuses[viewTask.id] !== "done" && "text-gray-800"
                    )}>
                      {viewTask.title}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Data</p>
                      <p className={cn("text-sm font-bold", viewDelayed ? "text-red-600" : "text-gray-800")}>{formatDetailDate(viewTask.date)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Horário</p>
                      <p className="text-sm font-bold text-gray-800">{viewTask.time}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-lg",
                        viewDelayed && "bg-red-50 text-red-600",
                        !viewDelayed && taskStatuses[viewTask.id] === "done" && "bg-emerald-50 text-emerald-600",
                        !viewDelayed && taskStatuses[viewTask.id] === "progress" && "bg-amber-50 text-amber-600",
                        !viewDelayed && taskStatuses[viewTask.id] === "pending" && "bg-gray-100 text-gray-500",
                      )}>
                        {viewDelayed ? "Atrasada" : taskStatuses[viewTask.id] === "done" ? "Concluído" : taskStatuses[viewTask.id] === "progress" ? "Em Andamento" : "Pendente"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => setEditingTask(true)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setDbTasks((prev) => prev.filter((task) => task.id !== viewTask.id));
                        setViewTask(null);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>
                );
              })()}
            </div>
          </div>
        </ModalPortal>
      )}

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
          {barnsData.map((barn) => (
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
                <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
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
              <Bar dataKey="despesas" fill="#e24a4a" radius={[5, 5, 0, 0]} name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown Donut */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Despesas Últimos 30 Dias</h3>
          <p className="text-[11px] text-gray-400 mb-3">Total: {formatCurrency(financialData.expenses)}</p>
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
                  {currentExpenseBreakdown.map((entry, i) => (
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
            {currentExpenseBreakdown.map((e) => (
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
          <h3 className="text-sm font-bold text-gray-900 mb-5">Resumo Financeiro Últimos 30 Dias</h3>
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-medium">Receita</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(financialData.revenue)}</p>
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
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(financialData.expenses)}</p>
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
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(financialData.profit)}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{profitMargin}%</span>
            </div>
            {/* Revenue Goal Progress */}
            <div className="mt-auto pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-gray-500 font-medium">Meta de receita mensal</span>
                <span className="text-[11px] font-bold text-gray-700">
                  {financialData.revenueGoal > 0 ? ((financialData.revenue / financialData.revenueGoal) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-700"
                  style={{ width: `${financialData.revenueGoal > 0 ? (financialData.revenue / financialData.revenueGoal) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                {formatCurrency(financialData.revenue)} de {formatCurrency(financialData.revenueGoal)}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
