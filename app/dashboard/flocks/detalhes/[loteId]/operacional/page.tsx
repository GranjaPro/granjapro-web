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
  Loader2,
  Egg,
  Wheat,
  Droplets,
  Eye,
  ShieldCheck,
  Sparkles,
  Users,
  Bell,
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
import { formatTaskCompletionDate } from "@/lib/domain/task-timing";
import { createClient } from "@/lib/supabase/client";
import {
  TaskDialog,
  type TaskCategory,
  type TaskDialogValues,
  type TaskPriority,
  type TaskRecurrence,
} from "@/components/dashboard/task-dialog";
import {
  createTask,
  deleteTask as deleteTaskRecord,
  getTaskExceptions,
  getTaskSchedule,
  setTaskOccurrenceStatus,
  updateTask,
  type TaskExceptionRow,
  type TaskRow,
} from "@/lib/services/tasks";

interface Lote {
  id: string;
  code: string;
  breed: string;
  bird_count: number;
  arrival_age_weeks: number;
  arrival_date: string;
}

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
  baseTaskId: string;
  occurrenceDate: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  recurrence: TaskRecurrence;
  scheduledTime: string;
  done: boolean;
  doneAt: string | null;
  missed: boolean;
  flockId: string | null;
  flockCode: string | null;
  barn: string | null;
  notes: string;
  iconKey: TaskIconKey;
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

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function formatDateBR(date: Date) {
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function taskOccursOn(task: TaskRow, selectedDate: Date) {
  const taskStart = new Date(`${task.date}T00:00:00`);
  const target = new Date(selectedDate);
  target.setHours(0, 0, 0, 0);

  if (target < taskStart) return false;
  if (task.recurrence === "diaria") return true;
  if (task.recurrence === "semanal") return target.getDay() === taskStart.getDay();
  if (task.recurrence === "mensal") return target.getDate() === taskStart.getDate();
  return isSameDay(taskStart, target);
}

function completedTime(exception: TaskExceptionRow | undefined) {
  if (!exception?.completed_at) return null;
  return formatTaskCompletionDate(exception.completed_at);
}

function mapTaskOccurrence(
  task: TaskRow,
  selectedDateKey: string,
  exception: TaskExceptionRow | undefined,
  flockCodeById: Map<string, string>,
): Task {
  return {
    id: `${task.id}:${selectedDateKey}`,
    baseTaskId: task.id,
    occurrenceDate: selectedDateKey,
    title: task.title,
    category: task.category,
    priority: task.priority,
    recurrence: task.recurrence,
    scheduledTime: task.scheduled_time ?? "--:--",
    done: exception?.status === "done",
    doneAt: completedTime(exception),
    missed: exception?.status === "missed",
    flockId: task.flock_id,
    flockCode: task.flock_id ? flockCodeById.get(task.flock_id) ?? null : null,
    barn: null,
    notes: task.notes ?? "",
    iconKey: defaultIconForCategory[task.category],
  };
}

export default function OperationalTasksPage() {
  const params = useParams();
  const loteId = typeof params.loteId === "string" ? params.loteId : undefined;
  const { farm, loading: authLoading } = useAuth();

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedDate, setSelectedDateState] = useState(new Date());
  const [filterCategory, setFilterCategory] = useState<TaskCategory | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterFlockId, setFilterFlockId] = useState("all");
  const [taskFlockId, setTaskFlockId] = useState(loteId ?? "all");
  const selectedDateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const isToday = useMemo(() => isSameDay(selectedDate, today), [selectedDate, today]);

  const loadTasks = useCallback(async () => {
    if (!farm?.id) return;

    const baseTasks = await getTaskSchedule(farm.id, selectedDateKey, loteId);
    const occurrences = baseTasks.filter((task) => taskOccursOn(task, selectedDate));
    const exceptions = await getTaskExceptions(farm.id, selectedDateKey, occurrences.map((task) => task.id));
    const exceptionByTaskId = new Map(exceptions.map((exception) => [exception.task_id, exception]));

    setTasks(
      occurrences
        .map((task) => mapTaskOccurrence(
          task,
          selectedDateKey,
          exceptionByTaskId.get(task.id),
          new Map(lotes.map((flock) => [flock.id, flock.code])),
        ))
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
    );
  }, [farm?.id, loteId, lotes, selectedDate, selectedDateKey]);

  useEffect(() => {
    if (!farm?.id) return;
    const supabase = createClient();
    let query = supabase
      .from("flocks")
      .select("id, code, breed, bird_count, arrival_age_weeks, arrival_date")
      .eq("farm_id", farm.id)
      .order("code");

    if (loteId) query = query.eq("id", loteId);

    query.then(({ data }) => {
        setLotes((data ?? []) as Lote[]);
        setInitialLoading(false);
      });
  }, [farm?.id, loteId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const setOperationalDate = useCallback((date: Date) => {
    setSelectedDateState(date);
  }, []);

  const changeDate = useCallback((offset: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + offset);
    setOperationalDate(next);
  }, [selectedDate, setOperationalDate]);

  const goToToday = useCallback(() => {
    setOperationalDate(new Date());
  }, [setOperationalDate]);

  const toggleTask = useCallback(async (task: Task) => {
    if (!farm?.id) return;

    await setTaskOccurrenceStatus({
      farmId: farm.id,
      taskId: task.baseTaskId,
      occurrenceDate: task.occurrenceDate,
      status: task.done ? "skipped" : "done",
    });
    await loadTasks();
  }, [farm?.id, loadTasks]);

  const deleteTask = useCallback(async (task: Task) => {
    await deleteTaskRecord(task.baseTaskId);
    await loadTasks();
  }, [loadTasks]);

  const filteredTasks = useMemo(
    () => tasks.filter((task) =>
      (filterCategory === "all" || task.category === filterCategory)
      && (filterFlockId === "all" || (filterFlockId === "general" ? task.flockId === null : task.flockId === filterFlockId)),
    ),
    [filterCategory, filterFlockId, tasks],
  );

  const pendingTasks = useMemo(() => filteredTasks.filter((t) => !t.done && !t.missed), [filteredTasks]);
  const doneTasks = useMemo(() => filteredTasks.filter((t) => t.done), [filteredTasks]);
  const missedTasks = useMemo(() => filteredTasks.filter((t) => t.missed && !t.done), [filteredTasks]);
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
  const [taskFormValues, setTaskFormValues] = useState<TaskDialogValues>({
    title: "",
    category: "geral",
    priority: "media",
    scheduledTime: "08:00",
    recurrence: "unica",
    notes: "",
  });

  const resetForm = useCallback(() => {
    setEditingTask(null);
    setTaskFlockId(loteId ?? "all");
    setTaskFormValues({
      title: "",
      category: "geral",
      priority: "media",
      scheduledTime: "08:00",
      recurrence: "unica",
      notes: "",
    });
  }, [loteId]);

  const openAddModal = useCallback(() => {
    resetForm();
    setShowAddModal(true);
  }, [resetForm]);

  const openEditModal = useCallback((task: Task) => {
    setEditingTask(task);
    setTaskFlockId(task.flockId ?? "all");
    setTaskFormValues({
      title: task.title,
      category: task.category,
      priority: task.priority,
      scheduledTime: task.scheduledTime === "--:--" ? "08:00" : task.scheduledTime,
      recurrence: task.recurrence,
      notes: task.notes,
    });
    setShowAddModal(true);
  }, []);

  const saveTask = useCallback(async () => {
    if (!farm?.id || !taskFormValues.title.trim()) return;

    if (editingTask) {
      await updateTask(editingTask.baseTaskId, {
        flock_id: loteId ?? (taskFlockId === "all" ? null : taskFlockId),
        title: taskFormValues.title.trim(),
        category: taskFormValues.category,
        priority: taskFormValues.priority,
        scheduled_time: taskFormValues.scheduledTime,
        recurrence: taskFormValues.recurrence,
        notes: taskFormValues.notes.trim() || null,
      });
    } else {
      await createTask({
        farm_id: farm.id,
        flock_id: loteId ?? (taskFlockId === "all" ? null : taskFlockId),
        title: taskFormValues.title.trim(),
        category: taskFormValues.category,
        priority: taskFormValues.priority,
        scheduled_time: taskFormValues.scheduledTime,
        recurrence: taskFormValues.recurrence,
        date: selectedDateKey,
        notes: taskFormValues.notes.trim() || null,
      });
    }

    await loadTasks();
    resetForm();
    setShowAddModal(false);
  }, [editingTask, farm?.id, loadTasks, loteId, resetForm, selectedDateKey, taskFlockId, taskFormValues]);

  if (authLoading || initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const lote = loteId ? lotes[0] : null;

  if (loteId && !lote) {
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
          href={loteId ? `/dashboard/flocks/detalhes/${loteId}` : "/dashboard"}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {lote ? `Voltar para ${lote.code}` : "Voltar para o dashboard"}
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-600" />
              <h1 className="text-xl font-bold text-gray-900">{lote ? `Operacional — ${lote.code}` : "Operacional"}</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {lote ? "Tarefas diárias e acompanhamento do lote" : "Tarefas diárias e acompanhamento de todos os lotes"}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova tarefa
            </button>
          </div>
        </div>
      </div>

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
                onClick={() => setOperationalDate(day)}
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
        {!loteId && (
          <select
            value={filterFlockId}
            onChange={(event) => setFilterFlockId(event.target.value)}
            aria-label="Filtrar tarefas por lote"
            className="shrink-0 rounded-lg border-0 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="all">Todos os lotes</option>
            <option value="general">Tarefas gerais</option>
            {lotes.map((flock) => <option key={flock.id} value={flock.id}>{flock.code}</option>)}
          </select>
        )}
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
                    <button onClick={() => void toggleTask(task)} className="shrink-0 cursor-pointer">
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
                        {!loteId && <span className="text-[11px] font-medium text-brand-600">· {task.flockCode ?? "Todos os lotes"}</span>}
                      </div>
                    </div>
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold", pri.color)}>{pri.label}</span>
                    <button onClick={() => openEditModal(task)} className="shrink-0 p-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer">
                      <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-blue-500" />
                    </button>
                    <button onClick={() => void deleteTask(task)} className="shrink-0 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
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
                    <button onClick={() => void toggleTask(task)} className="shrink-0 cursor-pointer">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </button>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ico.bg)}>
                      <Icon className={cn("w-4 h-4", ico.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500 line-through truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {task.scheduledTime}</span>
                        {task.doneAt && <span className="text-[11px] text-emerald-500">concluída em {task.doneAt}</span>}
                        {!loteId && <span className="text-[11px] font-medium text-brand-600">· {task.flockCode ?? "Todos os lotes"}</span>}
                      </div>
                    </div>
                    <button onClick={() => void deleteTask(task)} className="shrink-0 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
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
                        {!loteId && <span className="text-[11px] font-medium text-brand-600">· {task.flockCode ?? "Todos os lotes"}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => void toggleTask(task)}
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

      <TaskDialog
        open={showAddModal}
        mode={editingTask ? "edit" : "create"}
        values={taskFormValues}
        scopeLabel={!loteId ? "Lote" : undefined}
        scopeValue={!loteId ? taskFlockId : undefined}
        scopeOptions={!loteId ? [
          { value: "all", label: "Todos os lotes" },
          ...lotes.map((flock) => ({ value: flock.id, label: flock.code })),
        ] : undefined}
        categoryOptions={Object.entries(categoryConfig).map(([value, config]) => ({
          value: value as TaskCategory,
          label: config.label,
        }))}
        priorityOptions={Object.entries(priorityConfig).map(([value, config]) => ({
          value: value as TaskPriority,
          label: config.label,
        }))}
        recurrenceOptions={Object.entries(recurrenceLabel).map(([value, label]) => ({
          value: value as TaskRecurrence,
          label,
        }))}
        onChange={setTaskFormValues}
        onScopeChange={!loteId ? setTaskFlockId : undefined}
        onClose={() => setShowAddModal(false)}
        onSave={() => void saveTask()}
      />

    </div>
  );
}
