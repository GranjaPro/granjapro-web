"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  CheckCircle2,
  Circle,
  Pencil,
  Plus,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Filter,
  X,
  Loader2,
  Egg,
  Wheat,
  Droplets,
  Eye,
  ShieldCheck,
  Sparkles,
  Users,
  Bell,
  AlertCircle,
  TrendingUp,
  XCircle,
  Thermometer,
  Bug,
  Scissors,
  Scale,
  Syringe,
  Hammer,
  Truck,
  Sun,
  Moon,
  Zap,
  Heart,
  Star,
  Flame,
  Leaf,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import ModalPortal from "@/components/ui/modal-portal";

interface Lote {
  id: string;
  code: string;
  breed: string;
  bird_count: number;
  arrival_age_weeks: number;
  arrival_date: string;
}

type TaskCategory = "coleta" | "alimentacao" | "limpeza" | "inspecao" | "saude" | "geral";
type TaskPriority = "alta" | "media" | "baixa";
type TaskRecurrence = "diaria" | "semanal" | "mensal" | "unica";
type TaskIconKey = "egg" | "wheat" | "droplets" | "eye" | "shield" | "clipboard" | "thermometer" | "bug" | "scissors" | "scale" | "syringe" | "hammer" | "truck" | "sun" | "moon" | "zap" | "heart" | "star" | "flame" | "leaf" | "bell" | "users";

const taskIconMap: Record<TaskIconKey, { icon: LucideIcon; label: string; color: string; bg: string }> = {
  egg: { icon: Egg, label: "Ovo", color: "text-amber-700", bg: "bg-amber-50" },
  wheat: { icon: Wheat, label: "Ração", color: "text-orange-700", bg: "bg-orange-50" },
  droplets: { icon: Droplets, label: "Água", color: "text-blue-700", bg: "bg-blue-50" },
  eye: { icon: Eye, label: "Inspeção", color: "text-purple-700", bg: "bg-purple-50" },
  shield: { icon: ShieldCheck, label: "Saúde", color: "text-emerald-700", bg: "bg-emerald-50" },
  clipboard: { icon: ClipboardList, label: "Geral", color: "text-gray-700", bg: "bg-gray-100" },
  thermometer: { icon: Thermometer, label: "Temperatura", color: "text-red-700", bg: "bg-red-50" },
  bug: { icon: Bug, label: "Pragas", color: "text-rose-700", bg: "bg-rose-50" },
  scissors: { icon: Scissors, label: "Debicagem", color: "text-slate-700", bg: "bg-slate-50" },
  scale: { icon: Scale, label: "Pesagem", color: "text-indigo-700", bg: "bg-indigo-50" },
  syringe: { icon: Syringe, label: "Vacina", color: "text-teal-700", bg: "bg-teal-50" },
  hammer: { icon: Hammer, label: "Manutenção", color: "text-stone-700", bg: "bg-stone-100" },
  truck: { icon: Truck, label: "Transporte", color: "text-cyan-700", bg: "bg-cyan-50" },
  sun: { icon: Sun, label: "Manhã", color: "text-yellow-700", bg: "bg-yellow-50" },
  moon: { icon: Moon, label: "Noite", color: "text-violet-700", bg: "bg-violet-50" },
  zap: { icon: Zap, label: "Elétrico", color: "text-amber-700", bg: "bg-amber-50" },
  heart: { icon: Heart, label: "Cuidado", color: "text-pink-700", bg: "bg-pink-50" },
  star: { icon: Star, label: "Importante", color: "text-yellow-600", bg: "bg-yellow-50" },
  flame: { icon: Flame, label: "Urgente", color: "text-orange-700", bg: "bg-orange-50" },
  leaf: { icon: Leaf, label: "Ambiente", color: "text-green-700", bg: "bg-green-50" },
  bell: { icon: Bell, label: "Lembrete", color: "text-blue-700", bg: "bg-blue-50" },
  users: { icon: Users, label: "Equipe", color: "text-violet-700", bg: "bg-violet-50" },
};

const defaultIconForCategory: Record<TaskCategory, TaskIconKey> = {
  coleta: "egg",
  alimentacao: "wheat",
  limpeza: "droplets",
  inspecao: "eye",
  saude: "shield",
  geral: "clipboard",
};

interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  recurrence: TaskRecurrence;
  scheduledTime: string;
  done: boolean;
  doneAt: string | null;
  missed: boolean;
  barn: string | null;
  notes: string;
  iconKey: TaskIconKey;
}

interface FlockAlert {
  id: string;
  type: "warning" | "info" | "critical";
  message: string;
  time: string;
  dismissed: boolean;
}

const categoryConfig: Record<TaskCategory, { label: string; icon: typeof Egg; color: string; bg: string }> = {
  coleta: { label: "Coleta", icon: Egg, color: "text-amber-700", bg: "bg-amber-50" },
  alimentacao: { label: "Alimentação", icon: Wheat, color: "text-orange-700", bg: "bg-orange-50" },
  limpeza: { label: "Limpeza", icon: Droplets, color: "text-blue-700", bg: "bg-blue-50" },
  inspecao: { label: "Inspeção", icon: Eye, color: "text-purple-700", bg: "bg-purple-50" },
  saude: { label: "Saúde", icon: ShieldCheck, color: "text-emerald-700", bg: "bg-emerald-50" },
  geral: { label: "Geral", icon: ClipboardList, color: "text-gray-700", bg: "bg-gray-100" },
};

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  alta: { label: "Alta", color: "text-red-700 bg-red-50 border-red-200" },
  media: { label: "Média", color: "text-amber-700 bg-amber-50 border-amber-200" },
  baixa: { label: "Baixa", color: "text-gray-600 bg-gray-50 border-gray-200" },
};

const recurrenceLabel: Record<TaskRecurrence, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
  unica: "Única",
};

function generateMockTasks(date: Date, loteCode: string): Task[] {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();

  const daily: Task[] = [
    { id: "t1", title: `Coletar ovos — ${loteCode}`, category: "coleta", priority: "alta", recurrence: "diaria", scheduledTime: "06:00", done: false, doneAt: null, missed: false, barn: null, notes: "", iconKey: "egg" },
    { id: "t2", title: `Alimentar aves — manhã`, category: "alimentacao", priority: "alta", recurrence: "diaria", scheduledTime: "07:00", done: false, doneAt: null, missed: false, barn: null, notes: "", iconKey: "sun" },
    { id: "t3", title: "Verificar bebedouros", category: "limpeza", priority: "media", recurrence: "diaria", scheduledTime: "07:30", done: false, doneAt: null, missed: false, barn: null, notes: "", iconKey: "droplets" },
    { id: "t4", title: "Inspeção visual do lote", category: "inspecao", priority: "media", recurrence: "diaria", scheduledTime: "08:00", done: false, doneAt: null, missed: false, barn: null, notes: "", iconKey: "eye" },
    { id: "t5", title: "Registrar mortalidade", category: "saude", priority: "alta", recurrence: "diaria", scheduledTime: "08:30", done: false, doneAt: null, missed: false, barn: null, notes: "", iconKey: "heart" },
    { id: "t6", title: `Alimentar aves — tarde`, category: "alimentacao", priority: "alta", recurrence: "diaria", scheduledTime: "14:00", done: false, doneAt: null, missed: false, barn: null, notes: "", iconKey: "wheat" },
    { id: "t7", title: `Coletar ovos — ${loteCode} (tarde)`, category: "coleta", priority: "media", recurrence: "diaria", scheduledTime: "15:00", done: false, doneAt: null, missed: false, barn: null, notes: "", iconKey: "egg" },
  ];

  const weekly: Task[] = [];
  if (dayOfWeek === 1) {
    weekly.push({ id: "tw1", title: "Limpeza geral do galpão", category: "limpeza", priority: "alta", recurrence: "semanal", scheduledTime: "09:00", done: false, doneAt: null, missed: false, barn: null, notes: "", iconKey: "droplets" });
    weekly.push({ id: "tw2", title: "Desinfetar bebedouros e comedouros", category: "saude", priority: "alta", recurrence: "semanal", scheduledTime: "10:00", done: false, doneAt: null, missed: false, barn: null, notes: "", iconKey: "syringe" });
  }
  if (dayOfWeek === 3) {
    weekly.push({ id: "tw3", title: "Verificar temperatura e ventilação", category: "inspecao", priority: "media", recurrence: "semanal", scheduledTime: "10:00", done: false, doneAt: null, missed: false, barn: null, notes: "", iconKey: "thermometer" });
  }
  if (dayOfWeek === 5) {
    weekly.push({ id: "tw4", title: "Conferir estoque de ração do lote", category: "alimentacao", priority: "media", recurrence: "semanal", scheduledTime: "11:00", done: false, doneAt: null, missed: false, barn: null, notes: "", iconKey: "wheat" });
  }

  const monthly: Task[] = [];
  if (dayOfMonth === 1) {
    monthly.push({ id: "tm1", title: "Manutenção preventiva dos equipamentos", category: "geral", priority: "alta", recurrence: "mensal", scheduledTime: "08:00", done: false, doneAt: null, missed: false, barn: null, notes: "", iconKey: "hammer" });
  }
  if (dayOfMonth === 15) {
    monthly.push({ id: "tm2", title: "Pesagem de amostra do lote", category: "inspecao", priority: "media", recurrence: "mensal", scheduledTime: "09:00", done: false, doneAt: null, missed: false, barn: null, notes: "", iconKey: "scale" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const isPast = target < today;
  const isToday = target.getTime() === today.getTime();

  const all = [...daily, ...weekly, ...monthly];

  if (isPast) {
    // Simulate: most done, some missed
    const missedIds = new Set(["t3", "tw3"]);
    return all.map((t) =>
      missedIds.has(t.id)
        ? { ...t, done: false, missed: true }
        : { ...t, done: true, doneAt: t.scheduledTime },
    );
  }

  if (isToday) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return all.map((t) => {
      const [h, m] = t.scheduledTime.split(":").map(Number);
      const taskMinutes = h * 60 + m;
      const overdue = taskMinutes < currentMinutes - 60;
      const autoDone = taskMinutes < currentMinutes - 30 && !overdue;
      if (overdue) return { ...t, done: false, missed: true };
      if (autoDone) return { ...t, done: true, doneAt: t.scheduledTime };
      return t;
    });
  }

  return all;
}

function generateMockAlerts(loteCode: string): FlockAlert[] {
  return [
    { id: "a1", type: "warning", message: `Consumo de ração abaixo da meta nos últimos 3 dias`, time: "08:15", dismissed: false },
    { id: "a2", type: "info", message: `Pesagem programada para próxima semana`, time: "07:00", dismissed: false },
    { id: "a3", type: "critical", message: `Mortalidade acima do esperado ontem (0.4%)`, time: "06:30", dismissed: false },
    { id: "a4", type: "info", message: `Lote ${loteCode} completa 4 semanas em 3 dias`, time: "07:00", dismissed: false },
    { id: "a5", type: "warning", message: `Temperatura do galpão fora da faixa ideal ontem à tarde`, time: "16:00", dismissed: false },
  ];
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateBR(date: Date) {
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

export default function OperacionalLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const { farm, loading: authLoading } = useAuth();

  const [lote, setLote] = useState<Lote | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterCategory, setFilterCategory] = useState<TaskCategory | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<FlockAlert[]>([]);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const isToday = useMemo(() => isSameDay(selectedDate, today), [selectedDate, today]);

  useEffect(() => {
    if (!farm?.id) return;
    const supabase = createClient();
    supabase
      .from("flocks")
      .select("id, code, breed, bird_count, arrival_age_weeks, arrival_date")
      .eq("id", loteId)
      .eq("farm_id", farm.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setLote(data as Lote);
          setTasks(generateMockTasks(new Date(), data.code));
          setAlerts(generateMockAlerts(data.code));
        }
        setInitialLoading(false);
      });
  }, [farm?.id, loteId]);

  const changeDate = useCallback((offset: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + offset);
      if (lote) setTasks(generateMockTasks(next, lote.code));
      return next;
    });
  }, [lote]);

  const goToToday = useCallback(() => {
    const now = new Date();
    setSelectedDate(now);
    if (lote) setTasks(generateMockTasks(now, lote.code));
  }, [lote]);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, missed: false, doneAt: !t.done ? new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null }
          : t,
      ),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a)));
  }, []);

  const filteredTasks = useMemo(
    () => (filterCategory === "all" ? tasks : tasks.filter((t) => t.category === filterCategory)),
    [tasks, filterCategory],
  );

  const pendingTasks = useMemo(() => filteredTasks.filter((t) => !t.done && !t.missed), [filteredTasks]);
  const doneTasks = useMemo(() => filteredTasks.filter((t) => t.done), [filteredTasks]);
  const missedTasks = useMemo(() => filteredTasks.filter((t) => t.missed && !t.done), [filteredTasks]);
  const activeAlerts = useMemo(() => alerts.filter((a) => !a.dismissed), [alerts]);

  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const highPriorityPending = useMemo(() => tasks.filter((t) => !t.done && t.priority === "alta").length, [tasks]);

  const weekDays = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  // Task form (shared for add/edit)
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<TaskCategory>("geral");
  const [newPriority, setNewPriority] = useState<TaskPriority>("media");
  const [newTime, setNewTime] = useState("08:00");
  const [newRecurrence, setNewRecurrence] = useState<TaskRecurrence>("unica");
  const [newIcon, setNewIcon] = useState<TaskIconKey>("clipboard");

  const resetForm = useCallback(() => {
    setEditingTask(null);
    setNewTitle("");
    setNewCategory("geral");
    setNewPriority("media");
    setNewTime("08:00");
    setNewRecurrence("unica");
    setNewIcon("clipboard");
  }, []);

  const openAddModal = useCallback(() => {
    resetForm();
    setShowAddModal(true);
  }, [resetForm]);

  const openEditModal = useCallback((task: Task) => {
    setEditingTask(task);
    setNewTitle(task.title);
    setNewCategory(task.category);
    setNewPriority(task.priority);
    setNewTime(task.scheduledTime);
    setNewRecurrence(task.recurrence);
    setNewIcon(task.iconKey);
    setShowAddModal(true);
  }, []);

  const saveTask = useCallback(() => {
    if (!newTitle.trim()) return;
    if (editingTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? { ...t, title: newTitle.trim(), category: newCategory, priority: newPriority, scheduledTime: newTime, recurrence: newRecurrence, iconKey: newIcon }
            : t,
        ).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
      );
    } else {
      setTasks((prev) =>
        [...prev, {
          id: `custom-${Date.now()}`,
          title: newTitle.trim(),
          category: newCategory,
          priority: newPriority,
          recurrence: newRecurrence,
          scheduledTime: newTime,
          done: false,
          doneAt: null,
          missed: false,
          barn: null,
          notes: "",
          iconKey: newIcon,
        }].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
      );
    }
    resetForm();
    setShowAddModal(false);
  }, [newTitle, newCategory, newPriority, newTime, newRecurrence, newIcon, editingTask, resetForm]);

  if (authLoading || initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-gray-500">Lote não encontrado</p>
        <Link href="/dashboard/flocks" className="text-sm text-brand-600 hover:underline mt-2 inline-block">
          Voltar para lotes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/flocks/detalhes/${loteId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para {lote.code}
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-600" />
              <h1 className="text-xl font-bold text-gray-900">Operacional — {lote.code}</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">Tarefas diárias, alertas e acompanhamento do lote</p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova tarefa
          </button>
        </div>
      </div>

      {/* Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "rounded-xl border px-4 py-3 flex items-start gap-3",
                alert.type === "critical" ? "bg-red-50 border-red-200" : alert.type === "warning" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200",
              )}
            >
              <AlertCircle className={cn("w-4 h-4 mt-0.5 shrink-0", alert.type === "critical" ? "text-red-600" : alert.type === "warning" ? "text-amber-600" : "text-blue-600")} />
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", alert.type === "critical" ? "text-red-900" : alert.type === "warning" ? "text-amber-900" : "text-blue-900")}>
                  {alert.message}
                </p>
                <span className="text-[11px] text-gray-500 mt-0.5 block">{alert.time}</span>
              </div>
              <button onClick={() => dismissAlert(alert.id)} className="shrink-0 p-1 rounded-lg hover:bg-white/50 cursor-pointer">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Week strip */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => changeDate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-bold text-gray-900 capitalize">{formatDateBR(selectedDate)}</span>
            <button onClick={() => changeDate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          {!isToday && (
            <button onClick={goToToday} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" /> Hoje
            </button>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDay = isSameDay(day, today);
            return (
              <button
                key={day.toISOString()}
                onClick={() => { setSelectedDate(day); if (lote) setTasks(generateMockTasks(day, lote.code)); }}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-xs font-medium transition-colors cursor-pointer",
                  isSelected ? "bg-brand-600 text-white" : isTodayDay ? "bg-brand-50 text-brand-700" : "hover:bg-gray-50 text-gray-600",
                )}
              >
                <span className="text-[10px] uppercase tracking-wider opacity-70">
                  {day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                </span>
                <span className="text-sm font-bold">{day.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total", value: totalCount, icon: ClipboardList, iconBg: "bg-brand-50", iconColor: "text-brand-600" },
          { label: "Concluídas", value: doneCount, icon: CheckCircle2, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
          { label: "Pendentes", value: totalCount - doneCount, icon: Clock, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
          { label: "Prioridade alta", value: highPriorityPending, icon: AlertTriangle, iconBg: highPriorityPending > 0 ? "bg-red-50" : "bg-emerald-50", iconColor: highPriorityPending > 0 ? "text-red-600" : "text-emerald-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", kpi.iconBg)}>
                <kpi.icon className={cn("w-4 h-4", kpi.iconColor)} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{kpi.label}</p>
                <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900">Progresso do dia</span>
          <span className="text-sm font-bold text-brand-600">{progressPercent}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progressPercent === 100 ? "bg-emerald-500" : progressPercent >= 70 ? "bg-brand-500" : progressPercent >= 40 ? "bg-amber-500" : "bg-red-500",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[11px] text-gray-400">{doneCount} de {totalCount} tarefas</span>
          {progressPercent === 100 && (
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Dia completo!
            </span>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
        <button
          onClick={() => setFilterCategory("all")}
          className={cn(
            "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
            filterCategory === "all" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          )}
        >
          Todas
        </button>
        {(Object.entries(categoryConfig) as [TaskCategory, typeof categoryConfig.coleta][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilterCategory(key)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
              filterCategory === key ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Task lists */}
      <div className="space-y-6">
        {pendingTasks.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Pendentes ({pendingTasks.length})</h3>
            <div className="space-y-2">
              {pendingTasks.map((task) => {
                const ico = taskIconMap[task.iconKey];
                const pri = priorityConfig[task.priority];
                const Icon = ico.icon;
                return (
                  <div key={task.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
                    <button onClick={() => toggleTask(task.id)} className="shrink-0 cursor-pointer">
                      <Circle className="w-5 h-5 text-gray-300 hover:text-brand-500 transition-colors" />
                    </button>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ico.bg)}>
                      <Icon className={cn("w-4 h-4", ico.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {task.scheduledTime}</span>
                        <span className="text-[11px] text-gray-400">· {recurrenceLabel[task.recurrence]}</span>
                      </div>
                    </div>
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold", pri.color)}>{pri.label}</span>
                    <button onClick={() => openEditModal(task)} className="shrink-0 p-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer">
                      <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-blue-500" />
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="shrink-0 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {doneTasks.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Concluídas ({doneTasks.length})</h3>
            <div className="space-y-2">
              {doneTasks.map((task) => {
                const ico = taskIconMap[task.iconKey];
                const Icon = ico.icon;
                return (
                  <div key={task.id} className="bg-gray-50/50 rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 opacity-70">
                    <button onClick={() => toggleTask(task.id)} className="shrink-0 cursor-pointer">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </button>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ico.bg)}>
                      <Icon className={cn("w-4 h-4", ico.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500 line-through truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {task.scheduledTime}</span>
                        {task.doneAt && <span className="text-[11px] text-emerald-500">concluída às {task.doneAt}</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="shrink-0 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {missedTasks.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">Não realizadas ({missedTasks.length})</h3>
            <div className="space-y-2">
              {missedTasks.map((task) => {
                const ico = taskIconMap[task.iconKey];
                const Icon = ico.icon;
                return (
                  <div key={task.id} className="bg-red-50/40 rounded-xl border border-red-100 px-4 py-3 flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 opacity-50", ico.bg)}>
                      <Icon className={cn("w-4 h-4", ico.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-800/70 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-red-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {task.scheduledTime}</span>
                        <span className="text-[11px] font-medium text-red-500">não realizada</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Marcar feita
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">Nenhuma tarefa para este dia</p>
            <p className="text-xs text-gray-400 mt-1">Adicione uma tarefa para começar</p>
          </div>
        )}
      </div>

      {/* Add task modal */}
      {showAddModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAddModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">{editingTask ? "Editar tarefa" : "Nova tarefa"}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título</label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Coletar ovos — tarde"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Categoria</label>
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as TaskCategory)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none">
                      {Object.entries(categoryConfig).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prioridade</label>
                    <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as TaskPriority)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none">
                      {Object.entries(priorityConfig).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Horário</label>
                    <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Recorrência</label>
                    <select value={newRecurrence} onChange={(e) => setNewRecurrence(e.target.value as TaskRecurrence)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none">
                      {Object.entries(recurrenceLabel).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Ícone</label>
                  <div className="grid grid-cols-7 gap-1.5 max-h-40 overflow-y-auto rounded-xl border border-gray-200 p-2">
                    {(Object.entries(taskIconMap) as [TaskIconKey, typeof taskIconMap.egg][]).map(([key, cfg]) => {
                      const IconOption = cfg.icon;
                      const isSelected = newIcon === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setNewIcon(key)}
                          title={cfg.label}
                          className={cn(
                            "flex flex-col items-center gap-0.5 rounded-lg p-1.5 transition-colors cursor-pointer",
                            isSelected ? "bg-brand-100 ring-2 ring-brand-500" : "hover:bg-gray-100",
                          )}
                        >
                          <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", cfg.bg)}>
                            <IconOption className={cn("w-3.5 h-3.5", cfg.color)} />
                          </div>
                          <span className="text-[9px] text-gray-500 truncate w-full text-center">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-100">
                <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button onClick={saveTask} disabled={!newTitle.trim()} className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                  {editingTask ? "Salvar" : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
