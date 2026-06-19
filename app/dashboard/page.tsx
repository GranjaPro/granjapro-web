"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Egg,
  Bird,
  Wheat,
  DollarSign,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { useDateFilter, CalendarFilter } from "@/components/date-filter";
import { createClient } from "@/lib/supabase/client";
import { getFinancialSummaryInRange } from "@/lib/services/finances";
import { getFarmBirdCount } from "@/lib/services/farms";
import {
  createTask,
  deleteTask,
  getTaskExceptions,
  getTaskSchedule,
  setTaskOccurrenceStatus,
  updateTask,
  type TaskExceptionRow,
  type TaskRow,
} from "@/lib/services/tasks";
import { hasMinimumPlan } from "@/lib/plans";
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
import Link from "next/link";
import ModalPortal from "@/components/ui/modal-portal";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/plan/locked-overlay";
import { UpgradePopup } from "@/components/plan/upgrade-popup";
import { RequiredPlanBadge } from "@/components/plan/plan-badge";
import {
  X, Pencil, Trash2, Droplets, Eye, ShieldCheck, Thermometer, Bug, Scissors,
  Scale, Syringe, Hammer, Truck, Sun, Moon, Heart, Star, Flame, Leaf, Bell,
  Users, ClipboardList, type LucideIcon,
} from "lucide-react";

/* ── Task Icon Map ── */
type TaskIconKey = "egg" | "wheat" | "droplets" | "eye" | "shield" | "clipboard" | "thermometer" | "bug" | "scissors" | "scale" | "syringe" | "hammer" | "truck" | "sun" | "moon" | "zap" | "heart" | "star" | "flame" | "leaf" | "bell" | "users";
type TaskCategory = TaskRow["category"];
type TaskPriority = TaskRow["priority"];
type TaskRecurrence = TaskRow["recurrence"];
type DashboardTaskStatus = "done" | "progress" | "pending" | "missed";

interface DashboardTask {
  id: string;
  baseTaskId: string;
  occurrenceDate: string;
  title: string;
  status: DashboardTaskStatus;
  time: string;
  date: string;
  category: TaskCategory;
  priority: TaskPriority;
  iconKey: TaskIconKey;
  recurrence: TaskRecurrence;
  flockId: string | null;
  notes: string;
}

const taskIconMap: Record<TaskIconKey, { icon: LucideIcon; label: string; color: string; bg: string }> = {
  egg: { icon: Egg, label: "Ovo", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50" },
  wheat: { icon: Wheat, label: "Ração", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-50" },
  droplets: { icon: Droplets, label: "Água", color: "text-blue-700 dark:text-sky-300", bg: "bg-blue-50" },
  eye: { icon: Eye, label: "Inspeção", color: "text-purple-700 dark:text-violet-300", bg: "bg-purple-50" },
  shield: { icon: ShieldCheck, label: "Saúde", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50" },
  clipboard: { icon: ClipboardList, label: "Geral", color: "text-gray-700 dark:text-slate-300", bg: "bg-gray-100" },
  thermometer: { icon: Thermometer, label: "Temperatura", color: "text-red-700 dark:text-red-300", bg: "bg-red-50" },
  bug: { icon: Bug, label: "Pragas", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50" },
  scissors: { icon: Scissors, label: "Debicagem", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-50" },
  scale: { icon: Scale, label: "Pesagem", color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-50" },
  syringe: { icon: Syringe, label: "Vacina", color: "text-teal-700 dark:text-teal-300", bg: "bg-teal-50" },
  hammer: { icon: Hammer, label: "Manutenção", color: "text-stone-700 dark:text-stone-300", bg: "bg-stone-100" },
  truck: { icon: Truck, label: "Transporte", color: "text-cyan-700 dark:text-cyan-300", bg: "bg-cyan-50" },
  sun: { icon: Sun, label: "Manhã", color: "text-yellow-700 dark:text-yellow-300", bg: "bg-yellow-50" },
  moon: { icon: Moon, label: "Noite", color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-50" },
  zap: { icon: Zap, label: "Elétrico", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50" },
  heart: { icon: Heart, label: "Cuidado", color: "text-pink-700 dark:text-pink-300", bg: "bg-pink-50" },
  star: { icon: Star, label: "Importante", color: "text-yellow-600 dark:text-yellow-300", bg: "bg-yellow-50" },
  flame: { icon: Flame, label: "Urgente", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-50" },
  leaf: { icon: Leaf, label: "Ambiente", color: "text-green-700 dark:text-green-300", bg: "bg-green-50" },
  bell: { icon: Bell, label: "Lembrete", color: "text-blue-700 dark:text-sky-300", bg: "bg-blue-50" },
  users: { icon: Users, label: "Equipe", color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-50" },
};

const defaultIconForCategory: Record<TaskCategory, TaskIconKey> = {
  coleta: "egg",
  alimentacao: "wheat",
  limpeza: "droplets",
  inspecao: "eye",
  saude: "shield",
  geral: "clipboard",
};

const taskCategoryOptions = [
  { value: "coleta", label: "Coleta" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "limpeza", label: "Limpeza" },
  { value: "inspecao", label: "Inspeção" },
  { value: "saude", label: "Saúde" },
  { value: "geral", label: "Geral" },
];

const taskPriorityOptions = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

const taskRecurrenceOptions = [
  { value: "diaria", label: "Diária" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
  { value: "unica", label: "Única" },
];

const priorityConfig: Record<string, { label: string; color: string }> = {
  alta: { label: "Alta", color: "text-red-700 bg-red-50 border-red-200 dark:bg-red-500/15 dark:text-red-200 dark:border-red-400/25" },
  media: { label: "Média", color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/25" },
  baixa: { label: "Baixa", color: "text-gray-600 bg-gray-50 border-gray-200 dark:bg-slate-700/60 dark:text-slate-300 dark:border-white/10" },
};

const recurrenceLabel: Record<string, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
  unica: "Única",
};

/* ── Quick Actions ── */
const quickActions = [
  { label: "Registrar Produção", icon: Egg, href: "/dashboard/production?register=true", color: "bg-brand-500 hover:bg-brand-600" },
  { label: "Registrar Ração", icon: Wheat, href: "/dashboard/racao?register=true", color: "bg-amber-500 hover:bg-amber-600" },
  { label: "Registrar Mortalidade", icon: Skull, href: "/dashboard/mortality?register=true", color: "bg-red-500 hover:bg-red-600" },
  { label: "Registrar Venda", icon: DollarSign, href: "/dashboard/sales?register=true", color: "bg-emerald-500 hover:bg-emerald-600" },
];

/* ── Chart Data Type ── */
type WeeklyDataPoint = { day: string; ovos: number; meta: number; postura: number };
type ProductionChartRow = {
  date: string;
  eggs_produced: number;
  laying_rate: number | null;
};

const todayStr = new Date().toISOString().split("T")[0];
const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; })();

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function isSameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function taskOccursOn(task: TaskRow, selectedDate: Date) {
  const taskStart = new Date(`${task.date}T00:00:00`);
  const target = new Date(selectedDate);
  target.setHours(0, 0, 0, 0);

  if (target < taskStart) return false;
  if (task.recurrence === "diaria") return true;
  if (task.recurrence === "semanal") return target.getDay() === taskStart.getDay();
  if (task.recurrence === "mensal") return target.getDate() === taskStart.getDate();
  return isSameCalendarDay(taskStart, target);
}

function mapTaskStatus(exception: TaskExceptionRow | undefined): DashboardTaskStatus {
  if (exception?.status === "done") return "done";
  if (exception?.status === "missed") return "missed";
  return "pending";
}

function mapDashboardTask(task: TaskRow, selectedDateKey: string, exception: TaskExceptionRow | undefined): DashboardTask {
  return {
    id: `${task.id}:${selectedDateKey}`,
    baseTaskId: task.id,
    occurrenceDate: selectedDateKey,
    title: task.title,
    status: mapTaskStatus(exception),
    time: task.scheduled_time ?? "--:--",
    date: selectedDateKey,
    category: task.category,
    priority: task.priority,
    iconKey: defaultIconForCategory[task.category],
    recurrence: task.recurrence,
    flockId: task.flock_id,
    notes: task.notes ?? "",
  };
}

/* ── Setup alerts for first-time users ── */
const setupAlerts = [
  { id: "setup-1", type: "info" as const, msg: "Registre a produção pela primeira vez", time: "Configuração", action: "Registrar", risk: "Sem dados de produção, o dashboard não poderá exibir suas métricas.", href: "/dashboard/production?register=true" },
  { id: "setup-2", type: "info" as const, msg: "Registre a ração pela primeira vez", time: "Configuração", action: "Registrar", risk: "Sem controle de ração, você não saberá o custo real por ovo.", href: "/dashboard/racao?register=true" },
  { id: "setup-3", type: "info" as const, msg: "Registre seus ganhos e gastos", time: "Configuração", action: "Registrar", risk: "Sem dados financeiros, não é possível calcular seu lucro.", href: "/dashboard/finances" },
  { id: "setup-4", type: "info" as const, msg: "Cadastre seus clientes", time: "Configuração", action: "Cadastrar", risk: "Sem clientes cadastrados, você não poderá registrar vendas.", href: "/dashboard/customers" },
  { id: "setup-5", type: "info" as const, msg: "Registre suas vendas", time: "Configuração", action: "Registrar", risk: "Sem vendas registradas, a receita não aparecerá no dashboard.", href: "/dashboard/sales" },
  { id: "setup-6", type: "info" as const, msg: "Registre seus estoques", time: "Configuração", action: "Registrar", risk: "Sem controle de estoque, você pode ficar sem insumos.", href: "/dashboard/inventory" },
];

export default function DashboardPage() {
  const { profile, farm } = useAuth();
  const { plan, hideAdvancedFeatures } = usePlan();
  const supabase = createClient();
  const [showTaskUpgrade, setShowTaskUpgrade] = useState(false);
  const shouldHideAdvancedFeature = useCallback(
    (requiredPlan: "pro" | "premium") => hideAdvancedFeatures && !hasMinimumPlan(plan, requiredPlan),
    [hideAdvancedFeatures, plan]
  );
  const showDashboardAlerts = !shouldHideAdvancedFeature("pro");
  const showDashboardTasks = !shouldHideAdvancedFeature("premium");
  const showDashboardAssistant = !shouldHideAdvancedFeature("premium");

  // Real data state — start empty, filled by Supabase fetch
  const [farmData, setFarmData] = useState({
    name: "", producer: "", totalBirds: 0, activeBirds: 0, barns: 0, breed: "", productionSystem: "",
  });
  const [productionData, setProductionData] = useState({
    date: "", eggsProduced: 0, brokenEggs: 0, dirtyEggs: 0, discardedEggs: 0, eggsSold: 0, eggPrice: 0, layingRate: 0, eggsPerBird: 0,
  });
  const [feedData, setFeedData] = useState({
    quantity: 0, cost: 0, type: "", costPerEgg: 0,
  });
  const [financialData, setFinancialData] = useState({
    revenue: 0, expenses: 0, profit: 0, feedCost: 0, laborCost: 0, otherExpenses: 0, revenueGoal: 0,
  });
  const [barnsData, setBarnsData] = useState<{ id: string; name: string; birds: number; layingRate: number; status: "ok" | "warning"; createdAt: string }[]>([]);
  const [dbTasks, setDbTasks] = useState<DashboardTask[]>([]);
  const [dbAlerts, setDbAlerts] = useState<{ id: string; type: "danger" | "warning" | "info"; msg: string; time: string; action: string; risk: string; href?: string }[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Chart production data
  const [chartProductionData, setChartProductionData] = useState<WeeklyDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // KPI Goals (editable)
  const [kpiGoals, setKpiGoals] = useState({
    eggs: 15000,
    layingRate: 92,
    costPerEgg: 0.12,
    profit: 0,
  });
  const [editingGoalKey, setEditingGoalKey] = useState<string | null>(null);
  const [editingGoalValue, setEditingGoalValue] = useState("");

  // Shared calendar filter
  const { dateRange, filterMode, rangeStart, rangeEnd, selectedDate } = useDateFilter();
  const selectedDateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);

  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  const loadDashboardTasks = useCallback(async () => {
    if (!farm?.id) return;

    const baseTasks = await getTaskSchedule(farm.id, selectedDateKey);
    const occurrences = baseTasks.filter((task) => taskOccursOn(task, selectedDate));
    const exceptions = await getTaskExceptions(farm.id, selectedDateKey, occurrences.map((task) => task.id));
    const exceptionByTaskId = new Map(exceptions.map((exception) => [exception.task_id, exception]));

    setDbTasks(
      occurrences
        .map((task) => mapDashboardTask(task, selectedDateKey, exceptionByTaskId.get(task.id)))
        .sort((a, b) => a.time.localeCompare(b.time)),
    );
  }, [farm?.id, selectedDate, selectedDateKey]);

  // Fetch real data from Supabase when farm or dateRange changes
  useEffect(() => {
    if (!farm) return;
    const currentFarm = farm;
    const farmId = currentFarm.id;
    const { startDate, endDate } = dateRange;

    async function fetchDashboardData() {
      try {
        const [prodRes, feedRes, barnsRes, alertsRes, flocksRes, finSummary, birdCount] = await Promise.all([
          supabase.from("egg_production").select("*").eq("farm_id", farmId).gte("date", startDate).lte("date", endDate),
          supabase.from("feed_consumption").select("*").eq("farm_id", farmId).gte("date", startDate).lte("date", endDate),
          supabase.from("barns").select("*").eq("farm_id", farmId).order("created_at"),
          supabase.from("alerts").select("*").eq("farm_id", farmId).eq("read", false).order("created_at", { ascending: false }).limit(5),
          supabase.from("flocks").select("id, code, breed").eq("farm_id", farmId).order("created_at"),
          getFinancialSummaryInRange(farmId, startDate, endDate),
          getFarmBirdCount(farmId),
        ]);

        if (flocksRes.data) setAvailableFlocks(flocksRes.data);

        // Update farm info
        setFarmData({
          name: currentFarm.name,
          producer: currentFarm.producer_name,
          totalBirds: birdCount,
          activeBirds: birdCount,
          barns: barnsRes.data?.length ?? 0,
          breed: currentFarm.main_breed,
          productionSystem: currentFarm.production_system,
        });

        // Aggregate production for selected period
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
            date: startDate === endDate ? startDate : `${startDate} - ${endDate}`,
            eggsProduced: totalEggs,
            brokenEggs: totalBroken,
            dirtyEggs: totalDirty,
            discardedEggs: totalDiscarded,
            eggsSold: totalSold,
            eggPrice: avgPrice,
            layingRate: avgRate,
            eggsPerBird: avgPerBird,
          });
        } else {
          // Reset if no data for period
          setProductionData({
            date: startDate,
            eggsProduced: 0,
            brokenEggs: 0,
            dirtyEggs: 0,
            discardedEggs: 0,
            eggsSold: 0,
            eggPrice: 0,
            layingRate: 0,
            eggsPerBird: 0,
          });
        }

        // Aggregate feed for selected period
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
        } else {
          setFeedData({
            quantity: 0,
            cost: 0,
            type: "Ração",
            costPerEgg: 0,
          });
        }

        // Barns (static status for now, could be improved with period stats)
        if (barnsRes.data && barnsRes.data.length > 0) {
          setBarnsData(barnsRes.data.map((b) => ({
            id: b.id,
            name: b.name,
            birds: b.current_birds,
            layingRate: 0,
            status: (b.status === "active" ? "ok" : "warning") as "ok" | "warning",
            createdAt: b.created_at,
          })));
        }

        // Alerts — show setup alerts for first-time users, real alerts otherwise
        const realAlerts = (alertsRes.data ?? []).map((a) => ({
          id: a.id,
          type: (a.type === "error" ? "danger" : a.type) as "danger" | "warning" | "info",
          msg: a.message,
          time: new Date(a.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          action: "Ver",
          risk: "",
        }));

        const hasProduction = (prodRes.data?.length ?? 0) > 0;
        const hasFeed = (feedRes.data?.length ?? 0) > 0;
        const hasFinance = (finSummary.revenue > 0 || finSummary.expenses > 0);

        // Check customers & sales & inventory
        const [custRes, salesRes, invRes] = await Promise.all([
          supabase.from("customers").select("id", { count: "exact", head: true }).eq("farm_id", farmId),
          supabase.from("sales").select("id", { count: "exact", head: true }).eq("farm_id", farmId),
          supabase.from("feed_inventory").select("id", { count: "exact", head: true }).eq("farm_id", farmId),
        ]);
        const hasCustomers = (custRes.count ?? 0) > 0;
        const hasSales = (salesRes.count ?? 0) > 0;
        const hasInventory = (invRes.count ?? 0) > 0;

        const pending = setupAlerts.filter((s) => {
          if (s.id === "setup-1" && hasProduction) return false;
          if (s.id === "setup-2" && hasFeed) return false;
          if (s.id === "setup-3" && hasFinance) return false;
          if (s.id === "setup-4" && hasCustomers) return false;
          if (s.id === "setup-5" && hasSales) return false;
          if (s.id === "setup-6" && hasInventory) return false;
          return true;
        });

        setDbAlerts([...realAlerts, ...pending]);

        // Financial summary for selected period
        setFinancialData({
          revenue: finSummary.revenue,
          expenses: finSummary.expenses,
          profit: finSummary.profit,
          feedCost: finSummary.categoryTotals.feed,
          laborCost: finSummary.categoryTotals.labor,
          otherExpenses: finSummary.expenses - finSummary.categoryTotals.feed - finSummary.categoryTotals.labor,
          revenueGoal: finSummary.revenueGoal,
        });

        setDataLoaded(true);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setDataLoaded(true);
      }
    }

    fetchDashboardData();
  }, [farm, dateRange]);

  useEffect(() => {
    void loadDashboardTasks();
  }, [loadDashboardTasks]);

  // Fetch chart production data based on filter
  useEffect(() => {
    if (!farm) return;
    const farmId = farm.id;
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const { startDate, endDate } = dateRange;
    const isMonthMode = filterMode === "mes";

    // Helper: get ISO week number for a date
    function getWeekOfMonth(d: Date): number {
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      const firstDay = first.getDay() === 0 ? 7 : first.getDay(); // Mon=1
      return Math.ceil((d.getDate() + firstDay - 1) / 7);
    }

    async function fetchChartData() {
      setChartLoading(true);
      try {
        const { data } = await supabase
          .from("egg_production")
          .select("date, eggs_produced, laying_rate")
          .eq("farm_id", farmId)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date");

        // Build grouped data from DB rows
        const rows = (data ?? []) as ProductionChartRow[];

        if (isMonthMode) {
          // Group by week of month
          const weekGroups: Record<number, { ovos: number; meta: number; postura: number[]; days: number }> = {};

          // Seed all weeks of the month so empty weeks still appear
          const mYear = parseInt(startDate.split("-")[0]);
          const mMonth = parseInt(startDate.split("-")[1]) - 1;
          const lastDayOfMonth = new Date(mYear, mMonth + 1, 0).getDate();
          for (let d = 1; d <= lastDayOfMonth; d++) {
            const wk = getWeekOfMonth(new Date(mYear, mMonth, d));
            if (!weekGroups[wk]) weekGroups[wk] = { ovos: 0, meta: 0, postura: [], days: 0 };
          }

          rows.forEach((r) => {
            const d = new Date(r.date + "T12:00:00");
            const wk = getWeekOfMonth(d);
            if (!weekGroups[wk]) weekGroups[wk] = { ovos: 0, meta: 0, postura: [], days: 0 };
            weekGroups[wk].ovos += r.eggs_produced ?? 0;
            weekGroups[wk].meta += 13500;
            if (r.laying_rate) weekGroups[wk].postura.push(Number(r.laying_rate));
            weekGroups[wk].days += 1;
          });

          const chartData = Object.entries(weekGroups)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([wk, vals]) => {
              const avgPostura = vals.postura.length > 0
                ? vals.postura.reduce((s, v) => s + v, 0) / vals.postura.length
                : 0;
              return {
                day: `Semana ${wk}`,
                ovos: vals.ovos,
                meta: vals.days > 0 ? vals.meta : 0,
                postura: Math.round(avgPostura * 10) / 10,
              };
            });

          setChartProductionData(chartData);
        } else {
          // Daily view — seed all days in range so gaps show as 0
          const grouped: Record<string, { ovos: number; meta: number; postura: number[] }> = {};
          const cursor = new Date(startDate + "T12:00:00");
          const end = new Date(endDate + "T12:00:00");
          while (cursor <= end) {
            const key = toISO(cursor);
            grouped[key] = { ovos: 0, meta: 13500, postura: [] };
            cursor.setDate(cursor.getDate() + 1);
          }

          rows.forEach((r) => {
            if (!grouped[r.date]) grouped[r.date] = { ovos: 0, meta: 13500, postura: [] };
            grouped[r.date].ovos += r.eggs_produced ?? 0;
            if (r.laying_rate) grouped[r.date].postura.push(Number(r.laying_rate));
          });

          const diffDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) + 1;

          const chartData = Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dateStr, vals]) => {
              const d = new Date(dateStr + "T12:00:00");
              let label: string;
              if (diffDays <= 7) {
                label = sameDay(d, today) ? "Hoje" : dayNames[d.getDay()];
              } else {
                label = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
              }
              const avgPostura = vals.postura.length > 0
                ? vals.postura.reduce((s, v) => s + v, 0) / vals.postura.length
                : 0;
              return { day: label, ovos: vals.ovos, meta: 13500, postura: Math.round(avgPostura * 10) / 10 };
            });

          setChartProductionData(chartData);
        }
      } catch {
        setChartProductionData([]);
      }
      setChartLoading(false);
    }

    fetchChartData();
  }, [farm, dateRange]);

  // Chart label and subtitle based on filter
  const chartTitle = useMemo(() => {
    const today = new Date();
    if (filterMode === "mes") return "Produção Mensal";
    if (rangeStart && rangeEnd) {
      if (sameDay(rangeStart, rangeEnd) && sameDay(rangeStart, today)) return "Controle de Produção";
      if (sameDay(rangeStart, rangeEnd)) return "Produção do Dia";
      const diff = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return `Produção · ${diff} dias`;
    }
    return "Controle de Produção";
  }, [filterMode, rangeStart, rangeEnd]);

  const chartSubtitle = useMemo(() => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmtDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    if (filterMode === "mes") return `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    if (rangeStart && rangeEnd) {
      if (sameDay(rangeStart, rangeEnd) && sameDay(rangeStart, today)) return "Últimos 7 dias · Atualizado agora";
      if (sameDay(rangeStart, rangeEnd)) return fmtDate(rangeStart);
      return `${fmtDate(rangeStart)} — ${fmtDate(rangeEnd)}`;
    }
    return "Últimos 7 dias · Atualizado agora";
  }, [filterMode, rangeStart, rangeEnd, selectedDate]);

  // Dynamic Y-axis domain for chart
  const chartYDomain = useMemo(() => {
    if (chartProductionData.length === 0) return [12000, 14000];
    const values = chartProductionData.map((d) => d.ovos);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max(Math.round((max - min) * 0.2), 200);
    return [Math.max(0, Math.floor((min - padding) / 500) * 500), Math.ceil((max + padding) / 500) * 500];
  }, [chartProductionData]);

  const profitMargin = financialData.revenue > 0
    ? ((financialData.profit / financialData.revenue) * 100).toFixed(1)
    : "0.0";
  const [taskStatuses, setTaskStatuses] = useState<Record<string, DashboardTaskStatus>>(
    Object.fromEntries(dbTasks.map((t) => [t.id, t.status]))
  );

  // Sync task statuses when dbTasks changes from fetch
  useEffect(() => {
    setTaskStatuses(Object.fromEntries(dbTasks.map((t) => [t.id, t.status])));
  }, [dbTasks]);

  // Auto-mark overdue tasks as "missed"
  useEffect(() => {
    if (dbTasks.length === 0) return;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    setTaskStatuses((prev) => {
      const next = { ...prev };
      let changed = false;
      dbTasks.forEach((t) => {
        const status = next[t.id] ?? "pending";
        if (status === "done" || status === "missed") return;
        // Past date → missed
        if (t.date < todayStr) {
          next[t.id] = "missed";
          changed = true;
          return;
        }
        // Today + time passed by more than 60min → missed
        if (t.date === todayStr && t.time && t.time !== "--:--") {
          const [h, m] = t.time.split(":").map(Number);
          if (h * 60 + m + 60 < currentMinutes) {
            next[t.id] = "missed";
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [dbTasks, todayStr]);

  const [openDropdown, setOpenDropdown] = useState<number | string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setDropdownPos(null);
      }
    }
    function handleScroll() {
      if (openDropdown !== null) {
        setOpenDropdown(null);
        setDropdownPos(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    const scrollEl = document.querySelector(".dashboard-scroll");
    scrollEl?.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      scrollEl?.removeEventListener("scroll", handleScroll);
    };
  }, [openDropdown]);

  const completedTasks = Object.values(taskStatuses).filter((s) => s === "done").length;
  const missedTasksCount = Object.values(taskStatuses).filter((s) => s === "missed").length;

  // Flocks for task association
  const [availableFlocks, setAvailableFlocks] = useState<{ id: string; code: string; breed: string }[]>([]);

  // New task modal state
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>("geral");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("media");
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<TaskRecurrence>("unica");
  const [newTaskFlockId, setNewTaskFlockId] = useState("all");
  const [viewTask, setViewTask] = useState<(typeof dbTasks)[number] | null>(null);
  const [editingTask, setEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskTime, setEditTaskTime] = useState("");
  const [editTaskDate, setEditTaskDate] = useState("");

  const handleAddTask = useCallback(async () => {
    if (!farm?.id || !newTaskTitle.trim()) return;

    await createTask({
      farm_id: farm.id,
      flock_id: newTaskFlockId === "all" ? null : newTaskFlockId,
      title: newTaskTitle.trim(),
      scheduled_time: newTaskTime || null,
      date: newTaskDate || selectedDateKey,
      category: newTaskCategory,
      priority: newTaskPriority,
      recurrence: newTaskRecurrence,
    });

    await loadDashboardTasks();
    setNewTaskTitle("");
    setNewTaskTime("");
    setNewTaskDate("");
    setNewTaskCategory("geral");
    setNewTaskPriority("media");
    setNewTaskRecurrence("unica");
    setNewTaskFlockId("all");
    setShowNewTask(false);
  }, [farm?.id, loadDashboardTasks, newTaskCategory, newTaskDate, newTaskFlockId, newTaskPriority, newTaskRecurrence, newTaskTime, newTaskTitle, selectedDateKey]);

  const updateDashboardTaskStatus = useCallback(async (task: DashboardTask, status: DashboardTaskStatus) => {
    if (!farm?.id) return;

    if (status === "progress" || status === "pending") {
      setTaskStatuses((prev) => ({ ...prev, [task.id]: status }));
      return;
    }

    await setTaskOccurrenceStatus({
      farmId: farm.id,
      taskId: task.baseTaskId,
      occurrenceDate: task.occurrenceDate,
      status,
    });
    await loadDashboardTasks();
  }, [farm?.id, loadDashboardTasks]);

  const removeDashboardTask = useCallback(async (task: DashboardTask) => {
    await deleteTask(task.baseTaskId);
    await loadDashboardTasks();
  }, [loadDashboardTasks]);

  const saveDashboardTask = useCallback(async (task: DashboardTask) => {
    await updateTask(task.baseTaskId, {
      title: editTaskTitle.trim() || task.title,
      scheduled_time: editTaskTime || null,
      date: editTaskDate || task.date,
      category: task.category,
      priority: task.priority,
      recurrence: task.recurrence,
    });
    await loadDashboardTasks();
    setViewTask(null);
    setEditingTask(false);
  }, [editTaskDate, editTaskTime, editTaskTitle, loadDashboardTasks]);

  const displayName = profile?.full_name?.split(" ")[0] || farmData.producer.split(" ")[0];
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  // Period helpers for KPI labels
  const periodInfo = useMemo(() => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmtDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

    if (filterMode === "mes") {
      const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const m = selectedDate.getMonth();
      const y = selectedDate.getFullYear();
      const lastDay = new Date(y, m + 1, 0).getDate();
      const isCurrentMonth = m === today.getMonth() && y === today.getFullYear();
      const daysInPeriod = isCurrentMonth ? today.getDate() : lastDay;
      return { label: `${months[m]} ${y}`, isMultiDay: true, days: daysInPeriod };
    }

    if (filterMode === "intervalo" && rangeStart && rangeEnd) {
      if (sameDay(rangeStart, rangeEnd)) {
        if (sameDay(rangeStart, today)) {
          return { label: "Hoje", isMultiDay: false, days: 1 };
        }
        return { label: `Em ${fmtDate(rangeStart)}`, isMultiDay: false, days: 1 };
      }
      const diffMs = rangeEnd.getTime() - rangeStart.getTime();
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return { label: `${fmtDate(rangeStart)} — ${fmtDate(rangeEnd)}`, isMultiDay: true, days };
    }

    return { label: "Hoje", isMultiDay: false, days: 1 };
  }, [filterMode, rangeStart, rangeEnd, selectedDate]);

  // Recompute KPI data from real state
  const profitGoal = kpiGoals.profit > 0 ? kpiGoals.profit : financialData.revenue;
  const currentKpis = useMemo(() => {
    const { isMultiDay, days } = periodInfo;
    const avgPerDay = isMultiDay && days > 0 ? productionData.eggsProduced / days : 0;

    return [
      {
        key: "eggs",
        title: "Ovos",
        value: formatNumber(productionData.eggsProduced),
        periodDetail: isMultiDay
          ? `Média: ${formatNumber(Math.round(avgPerDay))} ovos/dia`
          : undefined,
        badge: "+3.2%",
        badgeDir: "up" as "up" | "down" | "neutral",
        icon: Egg,
        color: "brand",
        gradient: "from-brand-500 to-brand-600",
        lightBg: "bg-brand-50",
        lightIcon: "text-brand-600",
        progress: kpiGoals.eggs > 0 ? (productionData.eggsProduced / kpiGoals.eggs) * 100 : 0,
        reached: formatNumber(productionData.eggsProduced),
        goal: formatNumber(kpiGoals.eggs),
        goalRaw: kpiGoals.eggs,
        inputUnit: "ovos",
        unitPos: "after" as const,
      },
      {
        key: "layingRate",
        title: "Taxa de Postura",
        value: `${productionData.layingRate.toFixed(1)}%`,
        periodDetail: isMultiDay ? "Média do período" : undefined,
        badge: "+1.2%",
        badgeDir: "up" as "up" | "down" | "neutral",
        icon: Target,
        color: "violet",
        gradient: "from-violet-500 to-violet-600",
        lightBg: "bg-violet-50",
        lightIcon: "text-violet-600",
        progress: kpiGoals.layingRate > 0 ? (productionData.layingRate / kpiGoals.layingRate) * 100 : 0,
        reached: `${productionData.layingRate.toFixed(1)}%`,
        goal: `${kpiGoals.layingRate}%`,
        goalRaw: kpiGoals.layingRate,
        inputUnit: "%",
        unitPos: "after" as const,
      },
      {
        key: "costPerEgg",
        title: "Custo por Ovo",
        value: `R$ ${feedData.costPerEgg.toFixed(3)}`,
        periodDetail: isMultiDay ? "Média do período" : undefined,
        badge: "-2.1%",
        badgeDir: "up" as "up" | "down" | "neutral",
        icon: Wheat,
        color: "orange",
        gradient: "from-orange-500 to-orange-600",
        lightBg: "bg-orange-50",
        lightIcon: "text-orange-600",
        progress: feedData.costPerEgg > 0 ? Math.min((kpiGoals.costPerEgg / feedData.costPerEgg) * 100, 100) : 0,
        reached: `R$ ${feedData.costPerEgg.toFixed(3)}`,
        goal: `R$ ${kpiGoals.costPerEgg.toFixed(3).replace(".", ",")}`,
        goalRaw: kpiGoals.costPerEgg,
        inputUnit: "R$",
        unitPos: "before" as const,
      },
      {
        key: "profit",
        title: isMultiDay ? `Lucro · ${days} dias` : "Lucro",
        value: formatCurrency(financialData.profit),
        periodDetail: isMultiDay
          ? `Média: ${formatCurrency(Math.round(financialData.profit / days))}/dia`
          : undefined,
        badge: "+8.5%",
        badgeDir: "up" as "up" | "down" | "neutral",
        icon: DollarSign,
        color: "emerald",
        gradient: "from-emerald-500 to-emerald-600",
        lightBg: "bg-emerald-50",
        lightIcon: "text-emerald-600",
        progress: profitGoal > 0 ? (financialData.profit / profitGoal) * 100 : 0,
        reached: formatCurrency(financialData.profit),
        goal: formatCurrency(profitGoal),
        goalRaw: profitGoal,
        inputUnit: "R$",
        unitPos: "before" as const,
      },
    ];
  }, [productionData, feedData, financialData, periodInfo, kpiGoals, profitGoal]);

  const currentExpenseBreakdown = useMemo(() => [
    { name: "Ração", value: financialData.feedCost, color: "#f59e0b" },
    { name: "Mão de obra", value: financialData.laborCost, color: "#8b5cf6" },
    { name: "Outros", value: financialData.otherExpenses, color: "#94a3b8" },
  ], [financialData]);

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

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
          <CalendarFilter />
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
            key={kpi.key}
            onClick={() => {
              setEditingGoalKey(kpi.key);
              setEditingGoalValue(String(kpi.goalRaw));
            }}
            className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200/80 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity", kpi.gradient)} />
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", kpi.lightBg)}>
                  <kpi.icon className={cn("w-5 h-5", kpi.lightIcon)} />
                </div>
                <p className="text-[13px] font-semibold text-gray-600">{kpi.title}</p>
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
            <p className="text-[12px] text-gray-500 mt-1 font-medium">
              {periodInfo.label}
              {kpi.periodDetail && <span className="ml-1">· {kpi.periodDetail}</span>}
            </p>
            {/* Goal indicator */}
            <div className="flex items-center justify-between mt-3 mb-1">
              <span className="text-[11px] font-semibold text-gray-700">{kpi.reached}</span>
              <span className="text-[11px] text-gray-400 font-medium">Meta: {kpi.goal}</span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", `bg-gradient-to-r ${kpi.gradient}`)}
                style={{ width: `${Math.min(kpi.progress, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Goal Editor Modal ── */}
      {editingGoalKey && (() => {
        const kpi = currentKpis.find((k) => k.key === editingGoalKey);
        if (!kpi) return null;
        const goalLabels: Record<string, string> = {
          eggs: "Meta de Ovos",
          layingRate: "Meta de Taxa de Postura",
          costPerEgg: "Meta de Custo por Ovo",
          profit: "Meta de Lucro",
        };
        const goalHints: Record<string, string> = {
          eggs: "Quantidade de ovos desejada",
          layingRate: "Porcentagem desejada (ex: 92)",
          costPerEgg: "Valor em reais (ex: 0.12)",
          profit: "Valor em reais (ex: 30000)",
        };
        return (
          <ModalPortal>
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
              onClick={() => setEditingGoalKey(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-[340px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className={cn("flex items-center gap-3 px-5 py-4 border-b border-gray-100")}>
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", kpi.lightBg)}>
                    <kpi.icon className={cn("w-[18px] h-[18px]", kpi.lightIcon)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{goalLabels[editingGoalKey]}</p>
                    <p className="text-[11px] text-gray-400">Clique em salvar para atualizar</p>
                  </div>
                  <button
                    onClick={() => setEditingGoalKey(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-3">
                  {/* Current progress */}
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-500">Atual</span>
                    <span className="font-semibold text-gray-800">{kpi.reached}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-500">Progresso</span>
                    <span className="font-semibold text-gray-800">{Math.min(kpi.progress, 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", `bg-gradient-to-r ${kpi.gradient}`)}
                      style={{ width: `${Math.min(kpi.progress, 100)}%` }}
                    />
                  </div>

                  {/* Input */}
                  <div className="pt-2">
                    <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Nova meta</label>
                    <div className="flex items-center gap-2">
                      {kpi.unitPos === "before" && (
                        <span className="text-[13px] font-medium text-gray-400 flex-shrink-0">{kpi.inputUnit}</span>
                      )}
                      <input
                        type="number"
                        step="any"
                        value={editingGoalValue}
                        onChange={(e) => setEditingGoalValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = parseFloat(editingGoalValue);
                            if (!isNaN(val) && val > 0) {
                              setKpiGoals((prev) => ({ ...prev, [editingGoalKey]: val }));
                              setEditingGoalKey(null);
                            }
                          }
                        }}
                        className="flex-1 h-10 rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
                        placeholder={goalHints[editingGoalKey]}
                        autoFocus
                      />
                      {kpi.unitPos === "after" && (
                        <span className="text-[13px] font-medium text-gray-400 flex-shrink-0">{kpi.inputUnit}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                  <button
                    onClick={() => setEditingGoalKey(null)}
                    className="flex-1 h-9 rounded-xl text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const val = parseFloat(editingGoalValue);
                      if (!isNaN(val) && val > 0) {
                        setKpiGoals((prev) => ({ ...prev, [editingGoalKey]: val }));
                        setEditingGoalKey(null);
                      }
                    }}
                    className={cn(
                      "flex-1 h-9 rounded-xl text-[13px] font-semibold text-white transition-all cursor-pointer",
                      `bg-gradient-to-r ${kpi.gradient} hover:opacity-90`
                    )}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        );
      })()}

      {/* ── PRIORITY BLOCK: Alerts + Tasks (2 columns) ── */}
      {(showDashboardAlerts || showDashboardTasks) && (
      <div className={cn("grid grid-cols-1 gap-4", showDashboardAlerts && showDashboardTasks && "xl:grid-cols-2")}>
        {/* Alertas Ativos */}
        {showDashboardAlerts && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col max-h-[420px] overflow-hidden dark:border-white/10 dark:bg-slate-900/80">
          <div className="flex items-center justify-between mb-5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center shadow-sm">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Alertas ativos</h3>
                <p className="text-[11px] text-gray-400 font-medium dark:text-slate-400">
                  {dbAlerts.filter(a => a.type === "danger").length > 0 && (
                    <span className="text-red-600 font-semibold dark:text-red-300">{dbAlerts.filter(a => a.type === "danger").length} urgente · </span>
                  )}
                  {dbAlerts.length} alertas no total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
              <span className="text-[11px] font-bold text-white bg-red-500 px-2.5 py-1 rounded-lg">{dbAlerts.length}</span>
            </div>
          </div>
          {plan === "essencial" ? (
            <LockedOverlay message="Desbloqueie os alertas de controle" targetPlan="pro">
              <div className="space-y-3 overflow-y-auto flex-1 dashboard-scroll pr-1 -mr-1 py-1">
                {dbAlerts.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "rounded-xl p-4 border",
                      a.type === "danger" && "bg-red-50 border-red-200 dark:!border-red-400/20 dark:!bg-red-500/10",
                      a.type === "warning" && "bg-amber-50 border-amber-200 dark:!border-amber-400/20 dark:!bg-amber-500/10",
                      a.type === "info" && "bg-blue-50 border-blue-200 dark:!border-sky-400/20 dark:!bg-sky-500/10"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", a.type === "danger" && "bg-red-100", a.type === "warning" && "bg-amber-100", a.type === "info" && "bg-blue-100")}>
                        <AlertTriangle className="w-4 h-4 text-gray-400 dark:text-slate-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-600 dark:text-slate-200">{a.msg}</p>
                        <p className="text-[11px] text-gray-400 mt-1 dark:text-slate-400">Se ignorar: {a.risk}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </LockedOverlay>
          ) : (
          <div className="space-y-3 overflow-y-auto flex-1 dashboard-scroll pr-1 -mr-1 py-1">
            {dbAlerts.map((a) => {
              return (
                <div
                  key={a.id}
                  className={cn(
                    "rounded-xl p-4 border transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 dark:hover:shadow-black/20",
                    a.type === "danger" && "bg-red-50 border-red-200 hover:border-red-300 dark:!border-red-400/20 dark:!bg-red-500/10 dark:hover:!border-red-300/35 dark:hover:!bg-red-500/15",
                    a.type === "warning" && "bg-amber-50 border-amber-200 hover:border-amber-300 dark:!border-amber-400/20 dark:!bg-amber-500/10 dark:hover:!border-amber-300/35 dark:hover:!bg-amber-500/15",
                    a.type === "info" && "bg-blue-50 border-blue-200 hover:border-blue-300 dark:!border-sky-400/20 dark:!bg-sky-500/10 dark:hover:!border-sky-300/35 dark:hover:!bg-sky-500/15"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                      a.type === "danger" && "bg-red-100 dark:bg-red-500/15",
                      a.type === "warning" && "bg-amber-100 dark:bg-amber-500/15",
                      a.type === "info" && "bg-blue-100 dark:bg-sky-500/15"
                    )}>
                      <AlertTriangle className={cn(
                        "w-4 h-4",
                        a.type === "danger" && "text-red-600 dark:text-red-300",
                        a.type === "warning" && "text-amber-600 dark:text-amber-300",
                        a.type === "info" && "text-blue-600 dark:text-sky-300"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-[13px] font-semibold leading-snug",
                        a.type === "danger" && "text-red-800 dark:text-red-200",
                        a.type === "warning" && "text-amber-800 dark:text-amber-200",
                        a.type === "info" && "text-blue-800 dark:text-sky-200"
                      )}>
                        {a.msg}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed italic dark:text-slate-300">
                        Se ignorar: {a.risk}
                      </p>
                      <div className="flex items-center justify-between mt-2.5">
                        <p className="text-[11px] text-gray-400 dark:text-slate-400">{a.time}</p>
                        {a.href ? (
                          <Link href={a.href} className={cn(
                            "text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors",
                            a.type === "danger" && "text-white bg-red-500 hover:bg-red-600 dark:bg-red-400 dark:text-red-950 dark:hover:bg-red-300",
                            a.type === "warning" && "text-amber-800 bg-amber-200 hover:bg-amber-300 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200",
                            a.type === "info" && "text-blue-800 bg-blue-200 hover:bg-blue-300 dark:bg-sky-300 dark:text-sky-950 dark:hover:bg-sky-200"
                          )}>
                            {a.action}
                          </Link>
                        ) : (
                          <button className={cn(
                            "text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors",
                            a.type === "danger" && "text-white bg-red-500 hover:bg-red-600 dark:bg-red-400 dark:text-red-950 dark:hover:bg-red-300",
                            a.type === "warning" && "text-amber-800 bg-amber-200 hover:bg-amber-300 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200",
                            a.type === "info" && "text-blue-800 bg-blue-200 hover:bg-blue-300 dark:bg-sky-300 dark:text-sky-950 dark:hover:bg-sky-200"
                          )}>
                            {a.action}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
        )}

        {/* Tarefas do Dia */}
        {showDashboardTasks && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col max-h-[420px] overflow-hidden dark:border-white/10 dark:bg-slate-900/80">
          <div className="flex items-center justify-between mb-5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Tarefas</h3>
                <p className="text-[11px] text-gray-400 font-medium dark:text-slate-400">
                  {completedTasks} de {dbTasks.length} concluídas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RequiredPlanBadge requiredPlan="premium" className="flex-shrink-0" />
              {plan === "premium" && (
                <>
                  <div className="relative w-10 h-10">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" className="stroke-gray-200 dark:stroke-slate-700" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15" fill="none" className="stroke-brand-600 dark:stroke-brand-400" strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${(completedTasks / (dbTasks.length || 1)) * 94.2} 94.2`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-900 dark:text-slate-100">
                      {((completedTasks / (dbTasks.length || 1)) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <button
                    onClick={() => setShowNewTask(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-brand-600 font-semibold hover:text-brand-700 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
          {plan !== "premium" ? (
            <LockedOverlay message="Desbloqueie as tarefas" targetPlan="premium">
          <div className="space-y-2 overflow-y-auto flex-1 dashboard-scroll pr-1 -mr-1 py-1 min-h-[260px]">
            {(dbTasks.length > 0 ? dbTasks : [
              { id: "locked-task-1", title: "Coletar ovos", time: "06:00", iconKey: "egg" },
              { id: "locked-task-2", title: "Alimentar aves", time: "07:00", iconKey: "wheat" },
              { id: "locked-task-3", title: "Inspeção sanitária", time: "10:00", iconKey: "eye" },
            ]).map((t) => {
              const status = taskStatuses[t.id] ?? "pending";
              const isMissed = status === "missed";
              const isDone = status === "done";
              const ico = taskIconMap[t.iconKey as TaskIconKey] ?? taskIconMap.clipboard;
              const TaskIcon = ico.icon;

              return (
                <div key={t.id} className={cn("rounded-xl border px-4 py-3 flex items-center gap-3", isMissed ? "bg-red-50/40 border-red-100" : "bg-white border-gray-100")}>
                  {isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : isMissed ? <XCircle className="w-5 h-5 text-red-400" /> : <Circle className="w-5 h-5 text-gray-300" />}
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ico.bg)}>
                    <TaskIcon className={cn("w-4 h-4", ico.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-600 truncate">{t.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{t.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
            </LockedOverlay>
          ) : (
          <div className="space-y-2 overflow-y-auto flex-1 dashboard-scroll pr-1 -mr-1 py-1">
            {dbTasks.map((t) => {
              const status = taskStatuses[t.id] ?? "pending";
              const isMissed = status === "missed";
              const isDelayed = !isMissed && status !== "done" && t.date < todayStr;
              const isDone = status === "done";
              const ico = taskIconMap[t.iconKey] ?? taskIconMap.clipboard;
              const TaskIcon = ico.icon;
              const pri = priorityConfig[t.priority] ?? priorityConfig.media;
              const flockLabel = t.flockId ? availableFlocks.find((flock) => flock.id === t.flockId)?.code ?? "Lote" : "Todos os lotes";

              if (isMissed) {
                return (
                  <div key={t.id} className="bg-red-50/40 rounded-xl border border-red-100 px-4 py-3 flex items-center gap-3 dark:!border-red-400/20 dark:!bg-red-500/10">
                    <button onClick={(e) => { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); const dh = 120; const sb = window.innerHeight - rect.bottom; setDropdownPos({ top: sb < dh ? rect.top - dh - 4 : rect.bottom + 4, left: rect.left }); setOpenDropdown(openDropdown === t.id ? null : t.id); if (openDropdown === t.id) { setOpenDropdown(null); setDropdownPos(null); } }} className="shrink-0 cursor-pointer">
                      <XCircle className="w-5 h-5 text-red-400" />
                    </button>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 opacity-80 dark:opacity-100", ico.bg)}>
                      <TaskIcon className={cn("w-4 h-4", ico.color)} />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setViewTask(t); setEditingTask(false); setEditTaskTitle(t.title); setEditTaskTime(t.time); setEditTaskDate(t.date); }}>
                      <p className="text-[13px] font-medium text-red-800/70 truncate dark:text-red-200">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-red-400 flex items-center gap-1 dark:text-red-300"><Clock className="w-3 h-3" /> {t.time}</span>
                        <span className="text-[11px] text-red-400 dark:text-red-300">· {flockLabel}</span>
                        <span className="text-[11px] font-medium text-red-500 dark:text-red-300">não realizada</span>
                      </div>
                    </div>
                    <button onClick={() => void updateDashboardTaskStatus(t, "done")} className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer dark:border-red-400/20 dark:bg-slate-950 dark:text-red-100 dark:hover:bg-red-500/15">Marcar feita</button>
                  </div>
                );
              }

              if (isDone) {
                return (
                  <div key={t.id} className="bg-gray-50/50 rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 opacity-70 dark:!border-white/10 dark:!bg-slate-800/50">
                    <button onClick={(e) => { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); const dh = 120; const sb = window.innerHeight - rect.bottom; setDropdownPos({ top: sb < dh ? rect.top - dh - 4 : rect.bottom + 4, left: rect.left }); setOpenDropdown(openDropdown === t.id ? null : t.id); if (openDropdown === t.id) { setOpenDropdown(null); setDropdownPos(null); } }} className="shrink-0 cursor-pointer">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </button>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ico.bg)}>
                      <TaskIcon className={cn("w-4 h-4", ico.color)} />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setViewTask(t); setEditingTask(false); setEditTaskTitle(t.title); setEditTaskTime(t.time); setEditTaskDate(t.date); }}>
                      <p className="text-[13px] font-medium text-gray-500 line-through truncate dark:text-slate-400">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1 dark:text-slate-500"><Clock className="w-3 h-3" /> {t.time}</span>
                        <span className="text-[11px] text-gray-400">· {flockLabel}</span>
                        <span className="text-[11px] text-gray-400">· {recurrenceLabel[t.recurrence] ?? t.recurrence}</span>
                      </div>
                    </div>
                    <button onClick={() => void removeDashboardTask(t)} className="shrink-0 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer dark:hover:bg-red-500/10">
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                );
              }

              // pending / progress / delayed
              return (
                <div key={t.id} className={cn("bg-white rounded-xl border px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow dark:!bg-slate-800/55 dark:hover:!bg-slate-800/80", isDelayed ? "border-red-200 bg-red-50/30 dark:!border-red-400/25 dark:!bg-red-500/10" : "border-gray-100 dark:border-white/10")}>
                  <button onClick={(e) => { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); const dh = 120; const sb = window.innerHeight - rect.bottom; setDropdownPos({ top: sb < dh ? rect.top - dh - 4 : rect.bottom + 4, left: rect.left }); setOpenDropdown(openDropdown === t.id ? null : t.id); if (openDropdown === t.id) { setOpenDropdown(null); setDropdownPos(null); } }} className="shrink-0 cursor-pointer">
                    {isDelayed ? <AlertTriangle className="w-5 h-5 text-red-400 dark:text-red-300" /> : status === "progress" ? <Clock className="w-5 h-5 text-amber-500 dark:text-amber-300" /> : <Circle className="w-5 h-5 text-gray-300 hover:text-brand-500 transition-colors dark:text-slate-500 dark:hover:text-brand-300" />}
                  </button>
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ico.bg)}>
                    <TaskIcon className={cn("w-4 h-4", ico.color)} />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setViewTask(t); setEditingTask(false); setEditTaskTitle(t.title); setEditTaskTime(t.time); setEditTaskDate(t.date); }}>
                    <p className={cn("text-[13px] font-semibold truncate", isDelayed ? "text-red-600 dark:text-red-200" : "text-gray-900 dark:text-slate-100")}>{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("text-[11px] flex items-center gap-1", isDelayed ? "text-red-400 dark:text-red-300" : "text-gray-400 dark:text-slate-400")}><Clock className="w-3 h-3" /> {t.time}</span>
                      <span className={cn("text-[11px]", isDelayed ? "text-red-400 dark:text-red-300" : "text-gray-400 dark:text-slate-400")}>· {flockLabel}</span>
                      <span className="text-[11px] text-gray-400">· {recurrenceLabel[t.recurrence] ?? t.recurrence}</span>
                      {isDelayed && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-200">Atrasada</span>}
                    </div>
                  </div>
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold", pri.color)}>{pri.label}</span>
                  <button onClick={() => { setViewTask(t); setEditingTask(true); setEditTaskTitle(t.title); setEditTaskTime(t.time); setEditTaskDate(t.date); }} className="shrink-0 p-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer dark:hover:bg-sky-500/10">
                    <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-blue-500" />
                  </button>
                  <button onClick={() => void removeDashboardTask(t)} className="shrink-0 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer dark:hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
          )}
        </div>
        )}
      </div>
      )}

      {/* Task Status Dropdown (portal) */}
      {openDropdown !== null && dropdownPos && (
        <ModalPortal>
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 w-44 animate-in fade-in slide-in-from-top-1 duration-150"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            {[
              { value: "done" as const, label: "Concluído", icon: CheckSquare, color: "text-emerald-600", bg: "hover:bg-emerald-50" },
              { value: "progress" as const, label: "Em Andamento", icon: Clock, color: "text-amber-600", bg: "hover:bg-amber-50" },
              { value: "pending" as const, label: "Pendente", icon: Square, color: "text-gray-400", bg: "hover:bg-gray-50" },
              { value: "missed" as const, label: "Não realizada", icon: XCircle, color: "text-red-500", bg: "hover:bg-red-50" },
            ].map((opt) => {
              const currentStatus = taskStatuses[openDropdown] ?? "pending";
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    const selectedTask = dbTasks.find((task) => task.id === openDropdown);
                    if (selectedTask) void updateDashboardTaskStatus(selectedTask, opt.value);
                    setOpenDropdown(null);
                    setDropdownPos(null);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-3 py-2 text-left text-[13px] font-medium transition-colors cursor-pointer",
                    opt.bg,
                    currentStatus === opt.value ? "bg-gray-50 font-bold" : "text-gray-700"
                  )}
                >
                  <opt.icon className={cn("w-4 h-4", opt.color)} />
                  {opt.label}
                  {currentStatus === opt.value && (
                    <span className="ml-auto text-[10px] text-gray-400 font-normal">atual</span>
                  )}
                </button>
              );
            })}
          </div>
        </ModalPortal>
      )}

      {/* New Task Modal */}
      {showNewTask && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewTask(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">Nova Tarefa</h3>
                <button onClick={() => setShowNewTask(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Ex: Coletar ovos — Galpão A1"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Categoria</label>
                    <select value={newTaskCategory} onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none">
                      {taskCategoryOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prioridade</label>
                    <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none">
                      {taskPriorityOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Horário</label>
                    <input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Recorrência</label>
                    <select value={newTaskRecurrence} onChange={(e) => setNewTaskRecurrence(e.target.value as TaskRecurrence)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none">
                      {taskRecurrenceOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data</label>
                    <input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lote</label>
                    <select value={newTaskFlockId} onChange={(e) => setNewTaskFlockId(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none">
                      <option value="all">Todos os lotes</option>
                      {availableFlocks.map((f) => (<option key={f.id} value={f.id}>{f.code} — {f.breed}</option>))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-100">
                <button
                  onClick={() => setShowNewTask(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
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

              {(() => {
                const vIco = taskIconMap[viewTask.iconKey] ?? taskIconMap.clipboard;
                const VIcon = vIco.icon;
                const vPri = priorityConfig[viewTask.priority] ?? priorityConfig.media;
                const viewMissed = taskStatuses[viewTask.id] === "missed";
                const viewDelayed = !viewMissed && taskStatuses[viewTask.id] !== "done" && viewTask.date < todayStr;
                const viewDone = taskStatuses[viewTask.id] === "done";
                const formatDetailDate = (d: string) => {
                  if (d === todayStr) return "Hoje";
                  if (d === yesterdayStr) return "Ontem";
                  const [y, m, day] = d.split("-");
                  return `${day}/${m}/${y}`;
                };
                const catLabel = taskCategoryOptions.find((c) => c.value === viewTask.category)?.label ?? viewTask.category;

                if (editingTask) {
                  return (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Título</label>
                        <input type="text" value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" autoFocus />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Categoria</label>
                          <select value={viewTask.category} onChange={(e) => setViewTask({ ...viewTask, category: e.target.value as TaskCategory })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all">
                            {taskCategoryOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Prioridade</label>
                          <select value={viewTask.priority} onChange={(e) => setViewTask({ ...viewTask, priority: e.target.value as TaskPriority })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all">
                            {taskPriorityOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Data</label>
                          <input type="date" value={editTaskDate} onChange={(e) => setEditTaskDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Horário</label>
                          <input type="time" value={editTaskTime} onChange={(e) => setEditTaskTime(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Recorrência</label>
                          <select value={viewTask.recurrence} onChange={(e) => setViewTask({ ...viewTask, recurrence: e.target.value as TaskRecurrence })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all">
                            {taskRecurrenceOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ícone</label>
                        <div className="grid grid-cols-8 gap-1.5">
                          {(Object.entries(taskIconMap) as [TaskIconKey, typeof taskIconMap.egg][]).map(([key, cfg]) => {
                            const I = cfg.icon;
                            return (
                              <button key={key} onClick={() => setViewTask({ ...viewTask, iconKey: key })} className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer border-2", viewTask.iconKey === key ? "border-brand-500 shadow-sm scale-110" : "border-transparent hover:bg-gray-100", cfg.bg)}>
                                <I className={cn("w-4 h-4", cfg.color)} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                        <div className="flex gap-2">
                          {[
                            { value: "done" as const, label: "Concluído", color: "bg-emerald-500" },
                            { value: "progress" as const, label: "Em Andamento", color: "bg-amber-500" },
                            { value: "pending" as const, label: "Pendente", color: "bg-gray-400" },
                            { value: "missed" as const, label: "Não realizada", color: "bg-red-500" },
                          ].map((s) => (
                            <button key={s.value} onClick={() => void updateDashboardTaskStatus(viewTask, s.value)} className={cn("flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border", taskStatuses[viewTask.id] === s.value ? `${s.color} text-white border-transparent` : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <button onClick={() => setEditingTask(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">Cancelar</button>
                        <button
                          onClick={() => {
                            void saveDashboardTask(viewTask);
                          }}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors cursor-pointer shadow-sm"
                        >Salvar</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {viewMissed && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-xs font-semibold text-red-600">Tarefa não realizada — marcada automaticamente como não concluída</span>
                      </div>
                    )}
                    {viewDelayed && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-xs font-semibold text-red-600">Tarefa atrasada — deveria ter sido concluída em {formatDetailDate(viewTask.date)}</span>
                      </div>
                    )}

                    {/* Task header with icon */}
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", viewMissed ? "opacity-50" : "", vIco.bg)}>
                        <VIcon className={cn("w-5 h-5", vIco.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-semibold truncate",
                          viewMissed && "text-red-600/70",
                          viewDelayed && !viewMissed && "text-red-600",
                          viewDone && !viewDelayed && !viewMissed && "text-gray-400 line-through",
                          !viewDone && !viewDelayed && !viewMissed && "text-gray-900"
                        )}>{viewTask.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {viewTask.time}</span>
                          <span className="text-[11px] text-gray-400">· {recurrenceLabel[viewTask.recurrence] ?? viewTask.recurrence}</span>
                        </div>
                      </div>
                      <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold", vPri.color)}>{vPri.label}</span>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Data</p>
                        <p className={cn("text-sm font-bold", viewDelayed ? "text-red-600" : "text-gray-800")}>{formatDetailDate(viewTask.date)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Categoria</p>
                        <p className="text-sm font-bold text-gray-800">{catLabel}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Recorrência</p>
                        <p className="text-sm font-bold text-gray-800">{recurrenceLabel[viewTask.recurrence] ?? viewTask.recurrence}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-lg",
                          viewMissed && "bg-red-50 text-red-600",
                          viewDelayed && !viewMissed && "bg-red-50 text-red-600",
                          viewDone && !viewDelayed && !viewMissed && "bg-emerald-50 text-emerald-600",
                          !viewDone && !viewDelayed && !viewMissed && taskStatuses[viewTask.id] === "progress" && "bg-amber-50 text-amber-600",
                          !viewDone && !viewDelayed && !viewMissed && taskStatuses[viewTask.id] === "pending" && "bg-gray-100 text-gray-500",
                        )}>
                          {viewMissed ? "Não realizada" : viewDelayed ? "Atrasada" : viewDone ? "Concluído" : taskStatuses[viewTask.id] === "progress" ? "Em Andamento" : "Pendente"}
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
                          void removeDashboardTask(viewTask);
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
              {(() => {
                const isNew = barn.createdAt && (Date.now() - new Date(barn.createdAt).getTime()) < 5 * 24 * 60 * 60 * 1000;
                if (barn.layingRate >= 90) return (
                  <div className="mt-2 flex items-center gap-1.5 text-emerald-700 bg-emerald-100/80 rounded-lg px-2.5 py-1.5">
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    <span className="text-[11px] font-medium">Desempenho excelente</span>
                  </div>
                );
                if (barn.layingRate >= 88) return (
                  <div className="mt-2 flex items-center gap-1.5 text-brand-700 bg-brand-100/80 rounded-lg px-2.5 py-1.5">
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    <span className="text-[11px] font-medium">Postura dentro da meta</span>
                  </div>
                );
                if (isNew) return (
                  <div className="mt-2 flex items-center gap-1.5 text-gray-500 bg-gray-100/80 rounded-lg px-2.5 py-1.5">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span className="text-[11px] font-medium">Aguardando dados</span>
                  </div>
                );
                if (barn.layingRate >= 85) return (
                  <div className="mt-2 flex items-center gap-1.5 text-amber-700 bg-amber-100/80 rounded-lg px-2.5 py-1.5">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span className="text-[11px] font-medium">Postura abaixo da meta</span>
                  </div>
                );
                return (
                  <div className="mt-2 flex items-center gap-1.5 text-red-700 bg-red-100/80 rounded-lg px-2.5 py-1.5">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span className="text-[11px] font-medium">Postura crítica</span>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* ── Production Chart + AI Insights ── */}
      <div className={cn("grid grid-cols-1 gap-4", showDashboardAssistant && "xl:grid-cols-3")}>
        {/* Chart */}
        <div className={cn("bg-white rounded-2xl border border-gray-100 p-6", showDashboardAssistant && "xl:col-span-2")}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-900">{chartTitle}</h3>
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
          <p className="text-[11px] text-gray-400 mb-5">{chartSubtitle}</p>
          {chartLoading ? (
            <div className="flex items-center justify-center h-[280px]">
              <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartProductionData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOvos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2d7a4f" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#2d7a4f" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} interval={chartProductionData.length > 14 ? Math.floor(chartProductionData.length / 7) : 0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} domain={chartYDomain} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                  labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                  formatter={(value, name) => [formatNumber(Number(value ?? 0)), String(name ?? "")]}
                />
                <Area type="monotone" dataKey="meta" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="6 4" fill="none" dot={false} name="Meta" />
                <Area type="monotone" dataKey="ovos" stroke="#2d7a4f" strokeWidth={2.5} fill="url(#colorOvos)" dot={chartProductionData.length <= 14 ? { r: 4, fill: "#fff", stroke: "#2d7a4f", strokeWidth: 2.5 } : false} activeDot={{ r: 6, fill: "#2d7a4f", stroke: "#fff", strokeWidth: 3 }} name="Ovos" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* AI Performance Insights */}
        {showDashboardAssistant && (
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
            <RequiredPlanBadge requiredPlan="premium" className="flex-shrink-0" />
          </div>

          {plan !== "premium" ? (
            <LockedOverlay message="Desbloqueie o Assistente de Granja" targetPlan="premium">
          <div className="space-y-3 flex-1">
            {[
              {
                type: "warning" as const,
                icon: TrendingDown,
                title: "ProduÃ§Ã£o caiu 2.2% esta semana",
                detail: "Seg-Ter tiveram queda acentuada. GalpÃ£o 2 Ã© o principal responsÃ¡vel.",
              },
              {
                type: "success" as const,
                icon: TrendingUp,
                title: "Lucro aumentou 8.5% no mÃªs",
                detail: "Receita cresceu mais que despesas. Margem atual: " + profitMargin + "%.",
              },
              {
                type: "danger" as const,
                icon: AlertTriangle,
                title: "Custo de raÃ§Ã£o subiu 5.3%",
                detail: "Estoque para apenas 3 dias. Considere negociar com fornecedor.",
              },
            ].map((insight, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl px-4 py-3 border-l-[3px]",
                  insight.type === "warning" && "bg-amber-50/60 border-l-amber-500",
                  insight.type === "success" && "bg-emerald-50/60 border-l-emerald-500",
                  insight.type === "danger" && "bg-red-50/60 border-l-red-500"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <insight.icon className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                  <div>
                    <p className="text-[13px] font-semibold text-gray-600">{insight.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{insight.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
            </LockedOverlay>
          ) : (
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
            ].map((insight, i) => {
              const isLockedInsight = plan !== "premium" && i >= 2;
              if (isLockedInsight) {
                return (
                  <LockedOverlay key={i} message="Desbloqueie o Assistente de Granja completo" targetPlan="premium">
                    <div className={cn(
                      "rounded-xl px-4 py-3 border-l-[3px]",
                      insight.type === "warning" && "bg-amber-50/60 border-l-amber-500",
                      insight.type === "success" && "bg-emerald-50/60 border-l-emerald-500",
                      insight.type === "danger" && "bg-red-50/60 border-l-red-500",
                      insight.type === "info" && "bg-blue-50/60 border-l-blue-500"
                    )}>
                      <div className="flex items-start gap-2.5">
                        <insight.icon className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                        <div>
                          <p className="text-[13px] font-semibold text-gray-600">{insight.title}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{insight.detail}</p>
                        </div>
                      </div>
                    </div>
                  </LockedOverlay>
                );
              }
              return (
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
              );
            })}
          </div>
          )}
        </div>
        )}
      </div>

      {/* ── Financial Row: Revenue Chart + Expense Breakdown + Profit Summary ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Revenue vs Expenses */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
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
          <div className="h-[200px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[]} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} dx={-4} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px" }}
                  formatter={(value: unknown) => [`R$ ${Number(value).toLocaleString("pt-BR")}`, undefined]}
                />
                <Bar dataKey="receita" fill="#2d7a4f" radius={[5, 5, 0, 0]} name="Receita" />
                <Bar dataKey="despesas" fill="#e24a4a" radius={[5, 5, 0, 0]} name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown Donut */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Despesas</h3>
          <p className="text-[11px] text-gray-400 mb-3">Total: {formatCurrency(financialData.expenses)}</p>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={currentExpenseBreakdown}
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
                  formatter={(value: unknown) => [formatCurrency(Number(value)), undefined]}
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

      <UpgradePopup open={showTaskUpgrade} onClose={() => setShowTaskUpgrade(false)} targetPlan="premium" />
    </div>
  );
}
