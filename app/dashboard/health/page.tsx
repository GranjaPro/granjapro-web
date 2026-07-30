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
  Lightbulb,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  Activity,
  Bug,
  Shield,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { insightHref } from "@/lib/insight-links";
import { cn } from "@/lib/utils";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useDateFilter, CalendarFilter } from "@/components/date-filter";
import { hasMinimumPlan } from "@/lib/plans";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/plan/locked-overlay";
import { RequiredPlanBadge } from "@/components/plan/plan-badge";
import { AssistantLockedPreview } from "@/components/dashboard/assistant-card";
import { FarmHealthBanner, type FarmHealthInsight } from "@/components/dashboard/farm-health-banner";
import type { Tables, TablesInsert } from "@/lib/database.types";

/* ── Types ── */
type RegistroTipo = "Vacinação" | "Tratamento" | "Inspeção";
type AgendaStatus = "Próximo" | "Agendado";
type RegistroRapido = "vacinacao" | "inspecao" | "tratamento";
type RegistroStatus = "Concluído" | "Em andamento" | AgendaStatus;
type RegistroDbStatus = HealthRecordRow["status"];
type HealthEvolutionRange = "7d" | "30d" | "months" | "total";

interface RegistroSaude {
  id: string;
  source: "health_records" | "daily_inspections";
  titulo: string;
  data: string;
  lote: string;
  loteId: string | null;
  tipo: RegistroTipo;
  status: RegistroStatus;
  dbStatus?: RegistroDbStatus;
  observacao?: string;
  responsavel?: string;
  targetDisease?: string;
  brandName?: string;
  batch?: string;
  expiryDate?: string;
  manufacturer?: string;
  applicationRoute?: HealthRecordRow["application_route"];
  doses?: number | null;
  activeIngredient?: string;
  dosageDilution?: string;
  withdrawalPeriodDays?: number | null;
  disposalDestination?: string;
  prescriptionRef?: string;
  fecesAspect?: DailyInspectionRow["feces_aspect"];
  respiratorySymptoms?: DailyInspectionRow["respiratory_symptoms"];
  behavior?: DailyInspectionRow["behavior"];
  lightTimerOps?: boolean;
  waterChlorinePpm?: number | null;
  waterPh?: number | null;
}

interface AgendaVacina {
  id: string;
  vacina: string;
  lote: string;
  dataVencimento: string;
  status: AgendaStatus;
  recordId: string;
}

interface Lote {
  id: string;
  codigo: string;
  aves: number;
}

interface RegistroRapidoOption {
  id: RegistroRapido;
  label: string;
  description: string;
  tipo: RegistroTipo;
  placeholder: string;
  icon: typeof Syringe;
  iconBg: string;
  iconColor: string;
}

interface HealthEvolutionPoint {
  label: string;
  score: number;
  mortalidade: number;
  postura: number;
}

type FlockRow = Pick<Tables<"flocks">, "id" | "code" | "bird_count" | "status">;
type MortalityRow = Tables<"mortality">;
interface HealthRecordRow {
  id: string;
  farm_id: string;
  flock_id: string | null;
  title: string;
  date: string;
  type: "vaccination" | "treatment" | "inspection";
  status: "completed" | "in_progress" | "scheduled" | "upcoming";
  responsible: string | null;
  notes: string | null;
  target_disease: string | null;
  brand_name: string | null;
  batch: string | null;
  expiry_date: string | null;
  manufacturer: string | null;
  application_route: "water" | "ocular" | "spray" | "wing web" | "intramuscular" | "subcutaneous" | null;
  doses: number | null;
  active_ingredient: string | null;
  dosage_dilution: string | null;
  withdrawal_period_days: number | null;
  disposal_destination: string | null;
  prescription_ref: string | null;
  flocks: Pick<Tables<"flocks">, "code"> | null;
}
type HealthRecordInsert = TablesInsert<"health_records">;
type DailyInspectionInsert = TablesInsert<"daily_inspections">;
type DailyInspectionRow = Tables<"daily_inspections"> & {
  flocks: Pick<Tables<"flocks">, "code"> | null;
};
type TooltipFormatter = (value: unknown, name: unknown) => [string, string];

const statusRegistroConfig: Record<RegistroStatus, { bg: string; text: string }> = {
  "Concluído": { bg: "bg-emerald-50", text: "text-emerald-700" },
  "Em andamento": { bg: "bg-amber-50", text: "text-amber-700" },
  "Próximo": { bg: "bg-red-50", text: "text-red-600" },
  "Agendado": { bg: "bg-gray-100", text: "text-gray-600" },
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

const typeMap: Record<string, RegistroTipo> = {
  vaccination: "Vacinação",
  treatment: "Tratamento",
  inspection: "Inspeção",
};

const typeMapReverse: Record<RegistroTipo, string> = {
  "Vacinação": "vaccination",
  "Tratamento": "treatment",
  "Inspeção": "inspection",
};

const registroRapidoOptions: RegistroRapidoOption[] = [
  {
    id: "vacinacao",
    label: "Vacinação",
    description: "Aplicação de vacina no lote",
    tipo: "Vacinação",
    placeholder: "Ex: Newcastle — Reforço",
    icon: Syringe,
    iconBg: "bg-brand-50",
    iconColor: "text-brand-600",
  },
  {
    id: "inspecao",
    label: "Inspeção",
    description: "Checagem sanitária de rotina",
    tipo: "Inspeção",
    placeholder: "Ex: Inspeção sanitária de rotina",
    icon: ClipboardCheck,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
  },
  {
    id: "tratamento",
    label: "Tratamento",
    description: "Acompanhamento sanitário geral",
    tipo: "Tratamento",
    placeholder: "Ex: Tratamento respiratório",
    icon: HeartPulse,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
];

const mockAgendaVacina: AgendaVacina[] = [
  {
    id: "mock-agenda-1",
    vacina: "Newcastle — reforço",
    lote: "L001",
    dataVencimento: "2026-04-08",
    status: "Próximo",
    recordId: "mock-agenda-1",
  },
  {
    id: "mock-agenda-2",
    vacina: "Bronquite infecciosa",
    lote: "L003",
    dataVencimento: "2026-04-14",
    status: "Agendado",
    recordId: "mock-agenda-2",
  },
  {
    id: "mock-agenda-3",
    vacina: "Gumboro — 2ª dose",
    lote: "L002",
    dataVencimento: "2026-04-19",
    status: "Agendado",
    recordId: "mock-agenda-3",
  },
];

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const weekday = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - weekday);
  return next;
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function diffInDays(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function formatShortDayLabel(date: Date) {
  return date
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");
}

function formatMonthLabel(date: Date) {
  return date
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "");
}

export default function SaudePage() {
  const searchParams = useSearchParams();
  const { farm, loading: authLoading } = useAuth();
  const { plan, hideAdvancedFeatures } = usePlan();
  const showHealthProFeatures = !(hideAdvancedFeatures && !hasMinimumPlan(plan, "pro"));
  const showHealthPremiumFeatures = !(hideAdvancedFeatures && !hasMinimumPlan(plan, "premium"));

  const [registros, setRegistros] = useState<RegistroSaude[]>([]);
  const [agenda, setAgenda] = useState<AgendaVacina[]>([]);
  const [scheduledRecords, setScheduledRecords] = useState<HealthRecordRow[]>([]);
  const [healthHistoryRecords, setHealthHistoryRecords] = useState<HealthRecordRow[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [mortalidadeData, setMortalidadeData] = useState<{ dia: string; mortes: number; taxa: number }[]>([]);
  const [coberturaMensal, setCoberturaMensal] = useState<{ mes: string; cobertura: number }[]>([]);
  const [totalAves, setTotalAves] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showHealthHistory, setShowHealthHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | RegistroTipo>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editing, setEditing] = useState<RegistroSaude | null>(null);
  const [healthEvolutionRange, setHealthEvolutionRange] = useState<HealthEvolutionRange>("30d");

  useEffect(() => {
    if (searchParams.get("register") !== "true") return;
    const requestedFlockId = searchParams.get("flockId") ?? searchParams.get("loteId") ?? "";
    openAdd(undefined, requestedFlockId);
  }, [searchParams]);

  const [form, setForm] = useState({
    titulo: "",
    data: "",
    loteId: "",
    tipo: "Vacinação" as RegistroTipo,
    registroRapido: "vacinacao" as RegistroRapido,
    status: "completed" as RegistroDbStatus,
    observacao: "",
    responsavel: "",
    targetDisease: "",
    brandName: "",
    batch: "",
    expiryDate: "",
    manufacturer: "",
    applicationRoute: "water" as NonNullable<HealthRecordRow["application_route"]>,
    doses: "",
    activeIngredient: "",
    dosageDilution: "",
    withdrawalPeriodDays: "",
    disposalDestination: "",
    prescriptionRef: "",
    fecesAspect: "Normal" as DailyInspectionRow["feces_aspect"],
    respiratorySymptoms: "None" as DailyInspectionRow["respiratory_symptoms"],
    behavior: "Normal" as DailyInspectionRow["behavior"],
    lightTimerOps: true,
    waterChlorinePpm: "",
    waterPh: "",
  });

  const { dateRange } = useDateFilter();

  const farmRef = useRef(farm);
  farmRef.current = farm;

  /* ── Data Fetching ── */
  const fetchData = useCallback(async () => {
    const currentFarm = farmRef.current;
    if (!currentFarm) { setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();

    try {
      const { startDate, endDate } = dateRange;

      const [healthRes, inspectionsRes, scheduleRes, historyRes, flocksRes, mortalityRes] = await Promise.all([
        supabase
          .from("health_records")
          .select("*, flocks(code)")
          .eq("farm_id", currentFarm.id)
          .in("status", ["completed", "in_progress"])
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false }),
        supabase
          .from("daily_inspections")
          .select("*, flocks(code)")
          .eq("farm_id", currentFarm.id)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false }),
        supabase
          .from("health_records")
          .select("*, flocks(code)")
          .eq("farm_id", currentFarm.id)
          .eq("type", "vaccination")
          .in("status", ["scheduled", "upcoming"])
          .order("date", { ascending: true }),
        supabase
          .from("health_records")
          .select("*, flocks(code)")
          .eq("farm_id", currentFarm.id)
          .eq("type", "vaccination")
          .order("date", { ascending: false }),
        supabase
          .from("flocks")
          .select("id, code, bird_count, status")
          .eq("farm_id", currentFarm.id)
          .order("code"),
        supabase
          .from("mortality")
          .select("*")
          .eq("farm_id", currentFarm.id)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: true }),
      ]);

      if (healthRes.error) throw healthRes.error;
      if (inspectionsRes.error) throw inspectionsRes.error;
      if (scheduleRes.error) throw scheduleRes.error;
      if (historyRes.error) throw historyRes.error;
      if (flocksRes.error) throw flocksRes.error;
      if (mortalityRes.error) throw mortalityRes.error;

      const flocksData = (flocksRes.data ?? []) as FlockRow[];
      const healthData = (healthRes.data ?? []) as HealthRecordRow[];
      const inspectionsData = (inspectionsRes.data ?? []) as DailyInspectionRow[];
      const scheduleData = (scheduleRes.data ?? []) as HealthRecordRow[];
      const historyData = (historyRes.data ?? []) as HealthRecordRow[];
      const mortalityData = (mortalityRes.data ?? []) as MortalityRow[];
      setScheduledRecords(scheduleData);
      setHealthHistoryRecords(historyData);

      // Map flocks
      const mappedLotes: Lote[] = flocksData.map((f) => ({
        id: f.id,
        codigo: f.code,
        aves: f.bird_count,
      }));
      setLotes(mappedLotes);
      setTotalAves(mappedLotes.reduce((s, l) => s + l.aves, 0));

      // Map health records
      setRegistros(
        [
          ...[...healthData, ...scheduleData].map((r) => ({
            id: r.id,
            source: "health_records" as const,
            titulo: r.title,
            data: r.date,
            lote: r.flocks?.code || "Todos",
            loteId: r.flock_id,
            tipo: typeMap[r.type] || "Inspeção",
            status:
              r.status === "completed"
                ? "Concluído" as const
                : r.status === "in_progress"
                  ? "Em andamento" as const
                  : r.status === "upcoming"
                    ? "Próximo" as const
                    : "Agendado" as const,
            dbStatus: r.status,
            observacao: r.notes || "",
            responsavel: r.responsible || "",
            targetDisease: r.target_disease ?? "",
            brandName: r.brand_name ?? "",
            batch: r.batch ?? "",
            expiryDate: r.expiry_date ?? "",
            manufacturer: r.manufacturer ?? "",
            applicationRoute: r.application_route,
            doses: r.doses,
            activeIngredient: r.active_ingredient ?? "",
            dosageDilution: r.dosage_dilution ?? "",
            withdrawalPeriodDays: r.withdrawal_period_days,
            disposalDestination: r.disposal_destination ?? "",
            prescriptionRef: r.prescription_ref ?? "",
          })),
          ...inspectionsData.map((inspection) => ({
            id: inspection.id,
            source: "daily_inspections" as const,
            titulo: "Inspeção clínica estruturada",
            data: inspection.date,
            lote: inspection.flocks?.code || "Todos",
            loteId: inspection.flock_id,
            tipo: "Inspeção" as const,
            status: "Concluído" as const,
            dbStatus: "completed" as const,
            observacao: inspection.notes || "",
            responsavel: inspection.responsible || "",
            fecesAspect: inspection.feces_aspect,
            respiratorySymptoms: inspection.respiratory_symptoms,
            behavior: inspection.behavior,
            lightTimerOps: inspection.light_timer_ops,
            waterChlorinePpm: inspection.water_chlorine_ppm,
            waterPh: inspection.water_ph,
          })),
        ].sort((a, b) => b.data.localeCompare(a.data))
      );

      // Map vaccine schedule
      setAgenda(scheduleData.map((r) => ({
        id: r.id,
        vacina: r.title,
        lote: r.flocks?.code || "Todos",
        dataVencimento: r.date,
        status: r.status === "upcoming" ? "Próximo" : "Agendado",
        recordId: r.id,
      })));

      // Map mortality data by day
      const mortalityByDay = new Map<string, number>();
      for (const m of mortalityData) {
        const key = m.date;
        mortalityByDay.set(key, (mortalityByDay.get(key) || 0) + m.dead_birds);
      }
      const totalBirds = mappedLotes.reduce((s, l) => s + l.aves, 0) || 1;
      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      setMortalidadeData(
        Array.from(mortalityByDay.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, mortes]) => {
            const d = new Date(date + "T00:00:00");
            return {
              dia: `${String(d.getDate()).padStart(2, "0")}/${months[d.getMonth()]}`,
              mortes,
              taxa: mortes / totalBirds,
            };
          })
      );

      // Vaccination coverage by month
      const allVaccinations = [...healthData, ...scheduleData].filter(
        (r) => r.type === "vaccination"
      );
      const monthlyVaccinations = new Map<string, { total: number; completed: number }>();
      for (const v of allVaccinations) {
        const d = new Date(v.date + "T00:00:00");
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const entry = monthlyVaccinations.get(key) || { total: 0, completed: 0 };
        entry.total++;
        if (v.status === "completed") entry.completed++;
        monthlyVaccinations.set(key, entry);
      }
      setCoberturaMensal(
        Array.from(monthlyVaccinations.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([key, val]) => ({
            mes: months[parseInt(key.split("-")[1]) - 1],
            cobertura: val.total > 0 ? Math.round((val.completed / val.total) * 100) : 0,
          }))
      );
    } catch (err: unknown) {
      console.error("Erro ao carregar dados de saúde:", err);
      setError("Erro ao carregar dados de saúde.");
    }
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    if (authLoading || !farm) return;
    fetchData();
  }, [authLoading, farm, fetchData]);

  /* ── Computed ── */
  const vacinasPendentes = agenda.filter((a) => a.status === "Próximo").length;
  const tratamentosAtivos = registros.filter((r) => r.status === "Em andamento").length;
  const ultimaInspecao = registros.find((r) => r.tipo === "Inspeção");
  const diasUltimaInspecao = ultimaInspecao ? Math.floor((new Date().getTime() - new Date(ultimaInspecao.data + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const totalMortesSemana = mortalidadeData.reduce((s, d) => s + d.mortes, 0);

  const taxaMortalidade = useMemo(() => {
    if (totalAves === 0 || mortalidadeData.length === 0) return 0;
    return totalMortesSemana / totalAves;
  }, [totalMortesSemana, totalAves, mortalidadeData]);

  const coberturaVacinal = useMemo(() => {
    const totalVac = registros.filter(r => r.tipo === "Vacinação").length;
    const totalScheduled = agenda.length + totalVac;
    if (totalScheduled === 0) return 100;
    return Math.round((totalVac / totalScheduled) * 100);
  }, [registros, agenda]);

  const healthScore = useMemo(() => {
    if (registros.length === 0 && mortalidadeData.length === 0 && agenda.length === 0) return 0;
    // Mortality score (40% weight): 100 if rate <= 0.02, 0 if rate >= 0.10
    const mortScore = Math.max(0, Math.min(100, (1 - (taxaMortalidade - 0.02) / 0.08) * 100));
    // Vaccination score (35% weight)
    const vacScore = coberturaVacinal;
    // Inspection recency score (25% weight): 100 if <=7 days, 0 if >=30 days
    const inspScore = ultimaInspecao ? Math.max(0, Math.min(100, (1 - (diasUltimaInspecao - 7) / 23) * 100)) : 50;
    return Math.round(mortScore * 0.4 + vacScore * 0.35 + inspScore * 0.25);
  }, [taxaMortalidade, coberturaVacinal, diasUltimaInspecao, ultimaInspecao, registros, mortalidadeData, agenda]);

  /* ── KPIs ── */
  const kpis = [
    { title: "Mortalidade Semanal", value: `${totalMortesSemana} aves`, icon: Bug, iconBg: "bg-red-50", iconColor: "text-red-500", actual: totalMortesSemana, expectedVal: 5, expectedLabel: "5 aves", diff: totalMortesSemana > 0 ? ((totalMortesSemana / 5) * 100) - 100 : -100, progressColor: totalMortesSemana <= 5 ? "bg-emerald-500" : totalMortesSemana <= 8 ? "bg-amber-500" : "bg-red-500" },
    { title: "Taxa Mortalidade", value: `${(taxaMortalidade * 100).toFixed(1)}%`, icon: Activity, iconBg: "bg-amber-50", iconColor: "text-amber-600", actual: taxaMortalidade * 100, expectedVal: 2, expectedLabel: "2%", diff: taxaMortalidade > 0 ? ((taxaMortalidade * 100) / 2) * 100 - 100 : -100, progressColor: taxaMortalidade * 100 <= 2 ? "bg-emerald-500" : taxaMortalidade * 100 <= 5 ? "bg-amber-500" : "bg-red-500" },
    { title: "Cobertura Vacinal", value: `${coberturaVacinal}%`, icon: Shield, iconBg: "bg-brand-50", iconColor: "text-brand-600", actual: coberturaVacinal, expectedVal: 100, expectedLabel: "100%", diff: ((coberturaVacinal / 100) * 100) - 100, progressColor: coberturaVacinal >= 90 ? "bg-emerald-500" : coberturaVacinal >= 75 ? "bg-amber-500" : "bg-red-500" },
    { title: "Última Inspeção", value: ultimaInspecao ? `${diasUltimaInspecao} dias` : "—", icon: Stethoscope, iconBg: "bg-sky-50", iconColor: "text-sky-600", actual: diasUltimaInspecao, expectedVal: 7, expectedLabel: "7 dias", diff: ultimaInspecao ? ((diasUltimaInspecao / 7) * 100) - 100 : 0, progressColor: diasUltimaInspecao <= 7 ? "bg-emerald-500" : diasUltimaInspecao <= 14 ? "bg-amber-500" : "bg-red-500" },
  ];

  /* ── Insights ── */
  const insights = useMemo(() => {
    const arr: { type: "success" | "warning" | "info"; title: string; action: string }[] = [];
    if (vacinasPendentes > 0) arr.push({ type: "warning", title: `${vacinasPendentes} vacinas pendentes próximas`, action: `Agendar: ${agenda.filter(a => a.status === "Próximo").map(a => a.vacina).join(", ")}` });
    if (tratamentosAtivos > 0) arr.push({ type: "warning", title: `${tratamentosAtivos} tratamento${tratamentosAtivos > 1 ? "s" : ""} em andamento`, action: "Monitorar evolução e ajustar medicação se necessário" });
    if (taxaMortalidade <= 0.03) arr.push({ type: "success", title: "Taxa de mortalidade dentro do esperado", action: "Manter protocolos sanitários atuais" });
    else if (taxaMortalidade > 0) arr.push({ type: "warning", title: "Taxa de mortalidade acima do ideal", action: "Investigar causas e reforçar biossegurança" });
    if (coberturaVacinal >= 90) arr.push({ type: "success", title: `Cobertura vacinal em ${coberturaVacinal}%`, action: "Excelente — continuar com o calendário" });
    if (registros.length === 0 && agenda.length === 0) arr.push({ type: "info", title: "Nenhum registro de saúde encontrado", action: "Adicione registros para monitorar a saúde do plantel" });
    else arr.push({ type: "info", title: "Período de calor aumenta risco de estresse térmico", action: "Reforçar ventilação e monitorar consumo de água" });
    return arr;
  }, [vacinasPendentes, tratamentosAtivos, taxaMortalidade, coberturaVacinal, agenda, registros]);
  const farmHealthInsights = useMemo<FarmHealthInsight[]>(
    () =>
      insights.map((insight) => {
        const link = insightHref(`${insight.title} ${insight.action}`);

        return {
          level: insight.type,
          title: insight.title,
          action: insight.action,
          href: link.href,
          hrefLabel: link.label,
        };
      }),
    [insights]
  );
  const farmHealthSummary = `Mortalidade: ${totalMortesSemana} aves | Vacinas: ${vacinasPendentes} pendentes`;

  const filteredRegistros = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return registros.filter((r) => {
      const matchesType = typeFilter === "all" || r.tipo === typeFilter;
      const matchesSearch =
        !q.trim() ||
        r.titulo.toLowerCase().includes(q) ||
        r.lote.toLowerCase().includes(q) ||
        r.tipo.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [registros, searchQuery, typeFilter]);

  const hasRealVaccineRecords =
    agenda.length > 0 || registros.some((registro) => registro.tipo === "Vacinação");
  const displayedAgenda = hasRealVaccineRecords ? agenda : mockAgendaVacina;
  const displayedVacinasPendentes = displayedAgenda.filter((item) => item.status === "Próximo").length;

  const healthEvolutionData = useMemo(() => {
    const today = startOfDay(new Date());
    const allDates = [
      ...registros.map((registro) => registro.data),
      ...agenda.map((item) => item.dataVencimento),
      ...mortalidadeData.map((item) => {
        const [day, monthLabel] = item.dia.split("/");
        const monthIndex = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].indexOf(monthLabel);
        const currentYear = today.getFullYear();
        const fallback = new Date(currentYear, monthIndex === -1 ? today.getMonth() : monthIndex, Number(day));
        return toIsoDate(fallback);
      }),
    ].filter(Boolean).sort();

    const firstDate = allDates[0] ? new Date(`${allDates[0]}T00:00:00`) : today;

    const buildPoint = (start: Date, end: Date, label: string): HealthEvolutionPoint => {
      const startIso = toIsoDate(start);
      const endIso = toIsoDate(end);

      const bucketRegistros = registros.filter(
        (registro) => registro.data >= startIso && registro.data <= endIso,
      );
      const inspections = bucketRegistros.filter((registro) => registro.tipo === "Inspeção").length;
      const ongoingTreatments = bucketRegistros.filter(
        (registro) => registro.tipo === "Tratamento" && registro.status === "Em andamento",
      ).length;
      const completedVaccinations = bucketRegistros.filter(
        (registro) => registro.tipo === "Vacinação",
      ).length;
      const pendingVaccines = agenda.filter(
        (item) => item.dataVencimento >= startIso && item.dataVencimento <= endIso,
      ).length;

      const mortalityEntries = mortalidadeData.filter((item) => {
        const [day, monthLabel] = item.dia.split("/");
        const monthIndex = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].indexOf(monthLabel);
        const sampleDate = new Date(today.getFullYear(), monthIndex === -1 ? today.getMonth() : monthIndex, Number(day));
        const sampleIso = toIsoDate(sampleDate);
        return sampleIso >= startIso && sampleIso <= endIso;
      });

      const mortalityRate = mortalityEntries.reduce((sum, item) => sum + item.taxa * 100, 0);
      const mortalidade = Number(
        Math.max(0.08, Math.min(2.5, mortalityRate || ongoingTreatments * 0.18 + pendingVaccines * 0.08)).toFixed(2),
      );

      const postura = Math.max(
        0,
        Math.min(
          100,
          Math.round(94 - mortalidade * 18 - ongoingTreatments * 6 - pendingVaccines * 2 + completedVaccinations * 1.5),
        ),
      );

      const score = Math.max(
        38,
        Math.min(
          100,
          Math.round(100 - mortalidade * 18 - ongoingTreatments * 10 - pendingVaccines * 6 + inspections * 2),
        ),
      );

      return { label, score, mortalidade, postura };
    };

    if (healthEvolutionRange === "7d") {
      return Array.from({ length: 7 }, (_, index) => {
        const day = addDays(today, index - 6);
        return buildPoint(day, day, formatShortDayLabel(day));
      });
    }

    if (healthEvolutionRange === "30d") {
      return Array.from({ length: 30 }, (_, index) => {
        const day = addDays(today, index - 29);
        return buildPoint(day, day, formatShortDayLabel(day));
      });
    }

    if (healthEvolutionRange === "months") {
      return Array.from({ length: 6 }, (_, index) => {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
        return buildPoint(
          startOfMonth(monthDate),
          endOfMonth(monthDate),
          formatMonthLabel(monthDate),
        );
      });
    }

    const timelineStart = startOfWeek(firstDate);
    const weeks = Math.max(1, Math.ceil((diffInDays(today, timelineStart) + 1) / 7));

    return Array.from({ length: weeks }, (_, index) => {
      const weekStart = addDays(timelineStart, index * 7);
      const weekEnd = endOfWeek(weekStart) > today ? today : endOfWeek(weekStart);
      return buildPoint(weekStart, weekEnd, `Sem ${index + 1}`);
    });
  }, [agenda, healthEvolutionRange, mortalidadeData, registros]);

  function formatDate(dateStr: string) {
    try { return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return dateStr; }
  }

  function formatDateShort(dateStr: string) {
    try { return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", ""); } catch { return dateStr; }
  }

  const registroRapidoSelecionado = registroRapidoOptions.find((option) => option.id === form.registroRapido);
  const titlePlaceholder = registroRapidoSelecionado?.placeholder ?? "Ex: Newcastle — Reforço";
  const defaultClinicalFields = {
    targetDisease: "",
    brandName: "",
    batch: "",
    expiryDate: "",
    manufacturer: "",
    applicationRoute: "water" as NonNullable<HealthRecordRow["application_route"]>,
    doses: "",
    activeIngredient: "",
    dosageDilution: "",
    withdrawalPeriodDays: "",
    disposalDestination: "",
    prescriptionRef: "",
    fecesAspect: "Normal" as DailyInspectionRow["feces_aspect"],
    respiratorySymptoms: "None" as DailyInspectionRow["respiratory_symptoms"],
    behavior: "Normal" as DailyInspectionRow["behavior"],
    lightTimerOps: true,
    waterChlorinePpm: "",
    waterPh: "",
  };

  function inferRegistroRapido(record: RegistroSaude): RegistroRapido {
    const source = `${record.titulo} ${record.observacao || ""}`.toLowerCase();
    if (record.tipo === "Vacinação") return "vacinacao";
    if (record.tipo === "Tratamento") {
      return "tratamento";
    }
    return "inspecao";
  }

  function openAdd(option?: RegistroRapidoOption, selectedFlockId = "") {
    setForm({
      titulo: "",
      data: "",
      loteId: selectedFlockId,
      tipo: option?.tipo ?? "Vacinação",
      registroRapido: option?.id ?? "vacinacao",
      status: "completed",
      observacao: "",
      responsavel: "",
      ...defaultClinicalFields,
    });
    setEditing(null);
    setError("");
    setShowModal(true);
  }

  function openEdit(r: RegistroSaude) {
    setForm({
      titulo: r.titulo,
      data: r.data,
      loteId: r.loteId || "",
      tipo: r.tipo,
      registroRapido: inferRegistroRapido(r),
      status: r.dbStatus ?? (r.status === "Concluído" ? "completed" : "in_progress"),
      observacao: r.observacao || "",
      responsavel: r.responsavel || "",
      targetDisease: r.targetDisease ?? "",
      brandName: r.brandName ?? "",
      batch: r.batch ?? "",
      expiryDate: r.expiryDate ?? "",
      manufacturer: r.manufacturer ?? "",
      applicationRoute: r.applicationRoute ?? "water",
      doses: r.doses == null ? "" : String(r.doses),
      activeIngredient: r.activeIngredient ?? "",
      dosageDilution: r.dosageDilution ?? "",
      withdrawalPeriodDays: r.withdrawalPeriodDays == null ? "" : String(r.withdrawalPeriodDays),
      disposalDestination: r.disposalDestination ?? "",
      prescriptionRef: r.prescriptionRef ?? "",
      fecesAspect: r.fecesAspect ?? "Normal",
      respiratorySymptoms: r.respiratorySymptoms ?? "None",
      behavior: r.behavior ?? "Normal",
      lightTimerOps: r.lightTimerOps ?? true,
      waterChlorinePpm: r.waterChlorinePpm == null ? "" : String(r.waterChlorinePpm),
      waterPh: r.waterPh == null ? "" : String(r.waterPh),
    });
    setEditing(r);
    setError("");
    setShowModal(true);
  }

  function openEditHealthRecord(record: HealthRecordRow) {
    openEdit({
      id: record.id,
      source: "health_records",
      titulo: record.title,
      data: record.date,
      lote: record.flocks?.code || "Todos",
      loteId: record.flock_id,
      tipo: typeMap[record.type] || "Inspeção",
      status: record.status === "completed" ? "Concluído" : "Em andamento",
      dbStatus: record.status,
      observacao: record.notes || "",
      responsavel: record.responsible || "",
      targetDisease: record.target_disease ?? "",
      brandName: record.brand_name ?? "",
      batch: record.batch ?? "",
      expiryDate: record.expiry_date ?? "",
      manufacturer: record.manufacturer ?? "",
      applicationRoute: record.application_route,
      doses: record.doses,
      activeIngredient: record.active_ingredient ?? "",
      dosageDilution: record.dosage_dilution ?? "",
      withdrawalPeriodDays: record.withdrawal_period_days,
      disposalDestination: record.disposal_destination ?? "",
      prescriptionRef: record.prescription_ref ?? "",
    });
  }

  async function handleSave() {
    if (!farm || !form.titulo || !form.data || !form.loteId) return;
    setSaving(true);
    setError("");

    const computedStatus = form.tipo === "Inspeção" ? "completed" : form.status;

    const healthRecord: HealthRecordInsert = {
      farm_id: farm.id,
      flock_id: form.loteId,
      title: form.titulo,
      date: form.data,
      type: typeMapReverse[form.tipo] as HealthRecordInsert["type"],
      status: computedStatus,
      responsible: form.responsavel || null,
      notes: form.observacao || null,
      target_disease: form.tipo === "Vacinação" ? form.targetDisease || null : null,
      brand_name: form.tipo === "Vacinação" ? form.brandName || null : null,
      batch: form.tipo === "Vacinação" ? form.batch || null : null,
      expiry_date: form.tipo === "Vacinação" ? form.expiryDate || null : null,
      manufacturer: form.tipo === "Vacinação" ? form.manufacturer || null : null,
      application_route: form.tipo === "Vacinação" ? form.applicationRoute : null,
      doses: form.tipo === "Vacinação" && form.doses ? Number(form.doses) : null,
      active_ingredient: form.tipo === "Tratamento" ? form.activeIngredient || null : null,
      dosage_dilution: form.tipo === "Tratamento" ? form.dosageDilution || null : null,
      withdrawal_period_days:
        form.tipo === "Tratamento" && form.withdrawalPeriodDays
          ? Number(form.withdrawalPeriodDays)
          : null,
      disposal_destination: form.tipo === "Tratamento" ? form.disposalDestination || null : null,
      prescription_ref: form.tipo === "Tratamento" ? form.prescriptionRef || null : null,
    };
    const dailyInspection: DailyInspectionInsert = {
      farm_id: farm.id,
      flock_id: form.loteId,
      date: form.data,
      responsible: form.responsavel || null,
      feces_aspect: form.fecesAspect,
      respiratory_symptoms: form.respiratorySymptoms,
      behavior: form.behavior,
      light_timer_ops: form.lightTimerOps,
      water_chlorine_ppm: form.waterChlorinePpm ? Number(form.waterChlorinePpm) : null,
      water_ph: form.waterPh ? Number(form.waterPh) : null,
      notes: form.observacao || null,
    };

    const supabase = createClient();
    try {
      if (editing?.source === "daily_inspections") {
        const { error: updateErr } = await supabase
          .from("daily_inspections")
          .update(dailyInspection)
          .eq("id", editing.id);
        if (updateErr) throw updateErr;
      } else if (editing) {
        const { error: updateErr } = await supabase.from("health_records").update(healthRecord).eq("id", editing.id);
        if (updateErr) throw updateErr;
      } else if (form.tipo === "Inspeção") {
        const { error: insertErr } = await supabase.from("daily_inspections").insert(dailyInspection);
        if (insertErr) throw insertErr;
      } else {
        const { error: insertErr } = await supabase.from("health_records").insert(healthRecord);
        if (insertErr) throw insertErr;
      }
      setShowModal(false);
      setEditing(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar registro.");
    }
    setSaving(false);
  }

  async function deleteRegistro(id: string) {
    const supabase = createClient();
    try {
      const registro = registros.find((item) => item.id === id);
      const { error: delErr } =
        registro?.source === "daily_inspections"
          ? await supabase.from("daily_inspections").delete().eq("id", id)
          : await supabase.from("health_records").delete().eq("id", id);
      if (delErr) throw delErr;
      setDeleteConfirm(null);
      await fetchData();
    } catch (err: unknown) {
      console.error("Erro ao excluir registro:", err);
    }
  }

  /* ── Loading State ── */
  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
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
          <CalendarFilter />
          <button onClick={() => openAdd()} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20">
            <Plus className="w-4 h-4" />Adicionar Registro
          </button>
        </div>
      </div>

      {/* ── Health Score Banner ── */}
      {plan === "essencial" ? (
        <LockedOverlay message="Desbloqueie o resumo de saúde do plantel" targetPlan="pro">
          <FarmHealthBanner
            score={healthScore}
            summary={farmHealthSummary}
            insights={farmHealthInsights}
          />
        </LockedOverlay>
      ) : (
        <FarmHealthBanner
          score={healthScore}
          summary={farmHealthSummary}
          insights={farmHealthInsights}
        />
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const maxVal = Math.max(kpi.actual, kpi.expectedVal) * 1.15 || 1;
          const fillPct = Math.min((kpi.actual / maxVal) * 100, 100);
          const markerPct = Math.min((kpi.expectedVal / maxVal) * 100, 100);
          const diffLabel = `${kpi.diff > 0 ? "+" : ""}${kpi.diff.toFixed(1)}%`;
          const isGoodLow = kpi.title === "Mortalidade Semanal" || kpi.title === "Taxa Mortalidade" || kpi.title === "Última Inspeção";
          const isGood = isGoodLow ? kpi.diff <= 0 : kpi.diff >= 0;
          return (
            <div key={kpi.title} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
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

      {/* ── Evolução do lote ── */}
      <div className={cn(
        "grid grid-cols-1 gap-4",
        showHealthProFeatures && showHealthPremiumFeatures && "lg:grid-cols-2 xl:grid-cols-4",
        showHealthProFeatures && !showHealthPremiumFeatures && "lg:grid-cols-2 xl:grid-cols-3"
      )}>
        {plan === "essencial" ? (
          <LockedOverlay message="Desbloqueie a evolução do lote" targetPlan="pro" className="lg:col-span-2" preserveFirstChild>
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
              <div className="mb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Evolução do lote</h3>
                    </div>
                  </div>
                  <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {[
                    { id: "7d", label: "Últimos 7 dias" },
                    { id: "30d", label: "Últimos 30 dias" },
                    { id: "months", label: "Meses" },
                    { id: "total", label: "Tempo total" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setHealthEvolutionRange(option.id as HealthEvolutionRange)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition-colors",
                        healthEvolutionRange === option.id
                          ? "bg-brand-50 text-brand-700 border-brand-200"
                          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart
                  data={healthEvolutionData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="evoScoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    minTickGap={healthEvolutionRange === "30d" ? 18 : 8}
                  />
                  <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    domain={[0, 2.5]}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "13px",
                      padding: "10px 14px",
                    }}
                    formatter={((value: unknown, name: unknown) => {
                      if (name === "Score de saúde" || name === "Postura (%)") {
                        return [`${Number(value ?? 0)}%`, String(name)];
                      }
                      return [`${Number(value ?? 0).toFixed(2)}%`, String(name)];
                    }) satisfies TooltipFormatter}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} iconType="circle" />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="score"
                    name="Score de saúde"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#evoScoreGrad)"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="postura"
                    name="Postura (%)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="mortalidade"
                    name="Mortalidade (%)"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </LockedOverlay>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
            <div className="mb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Evolução do lote</h3>
                  </div>
                </div>
                <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {[
                  { id: "7d", label: "Últimos 7 dias" },
                  { id: "30d", label: "Últimos 30 dias" },
                  { id: "months", label: "Meses" },
                  { id: "total", label: "Tempo total" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setHealthEvolutionRange(option.id as HealthEvolutionRange)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition-colors",
                      healthEvolutionRange === option.id
                        ? "bg-brand-50 text-brand-700 border-brand-200"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart
                data={healthEvolutionData}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="evoScoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  minTickGap={healthEvolutionRange === "30d" ? 18 : 8}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  domain={[0, 100]}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  domain={[0, 2.5]}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: "13px",
                    padding: "10px 14px",
                  }}
                  formatter={((value: unknown, name: unknown) => {
                    if (name === "Score de saúde" || name === "Postura (%)") {
                      return [`${Number(value ?? 0)}%`, String(name)];
                    }
                    return [`${Number(value ?? 0).toFixed(2)}%`, String(name)];
                  }) satisfies TooltipFormatter}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} iconType="circle" />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="score"
                  name="Score de saúde"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#evoScoreGrad)"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="postura"
                  name="Postura (%)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="mortalidade"
                  name="Mortalidade (%)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AI Insights — under Cobertura Vacinal */}
        {showHealthPremiumFeatures && (
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm"><Zap className="w-4 h-4 text-white" /></div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Assistente Sanitário</h3>
                  <p className="text-[11px] text-gray-400 font-medium">Baseado nos dados do período</p>
                </div>
              </div>
              <RequiredPlanBadge requiredPlan="premium" className="flex-shrink-0 px-2 py-0.5 text-[10px]" />
            </div>
            {plan !== "premium" ? (
              <AssistantLockedPreview lockedMessage="Desbloqueie o Assistente Sanitário" />
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
                {insights.map((ins, i) => {
                  const link = insightHref(`${ins.title} ${ins.action}`);
                  if (plan !== "premium" && i >= 2) {
                    return (
                      <LockedOverlay key={i} message="Desbloqueie o Assistente Sanitário" targetPlan="premium">
                        <div className={cn("p-3 rounded-xl border-l-[3px]", ins.type === "success" && "bg-emerald-50/50 border-l-emerald-500", ins.type === "warning" && "bg-amber-50/50 border-l-amber-500", ins.type === "info" && "bg-blue-50/50 border-l-blue-500")}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", ins.type === "success" && "bg-emerald-100", ins.type === "warning" && "bg-amber-100", ins.type === "info" && "bg-blue-100")}>
                              {ins.type === "success" && <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />}
                              {ins.type === "warning" && <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />}
                              {ins.type === "info" && <Lightbulb className="w-2.5 h-2.5 text-blue-600" />}
                            </div>
                            <span className="text-xs font-semibold text-gray-800">{ins.title}</span>
                          </div>
                          <p className={cn("text-[11px] font-medium ml-7", ins.type === "success" ? "text-emerald-600" : ins.type === "warning" ? "text-amber-600" : "text-blue-600")}>&rarr; {ins.action}</p>
                        </div>
                      </LockedOverlay>
                    );
                  }
                  return (
                    <div key={i} className={cn("p-3 rounded-xl border-l-[3px]", ins.type === "success" && "bg-emerald-50/50 border-l-emerald-500", ins.type === "warning" && "bg-amber-50/50 border-l-amber-500", ins.type === "info" && "bg-blue-50/50 border-l-blue-500")}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", ins.type === "success" && "bg-emerald-100", ins.type === "warning" && "bg-amber-100", ins.type === "info" && "bg-blue-100")}>
                          {ins.type === "success" && <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />}
                          {ins.type === "warning" && <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />}
                          {ins.type === "info" && <Lightbulb className="w-2.5 h-2.5 text-blue-600" />}
                        </div>
                        <span className="text-xs font-semibold text-gray-800">{ins.title}</span>
                      </div>
                      <div className="ml-7 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <p className={cn("text-[11px] font-medium", ins.type === "success" ? "text-emerald-600" : ins.type === "warning" ? "text-amber-600" : "text-blue-600")}>&rarr; {ins.action}</p>
                        <Link href={link.href} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                          {link.label}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        )}
        {/* Vaccination Schedule — under Última Inspeção */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-bold text-gray-900">Agenda de Vacinação</h3>
            </div>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">{displayedVacinasPendentes} próximas</span>
          </div>
          <div className="space-y-0 max-h-[260px] overflow-y-auto flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {displayedAgenda.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">Nenhuma vacinação agendada.</div>
            )}
            {displayedAgenda.map((a, i) => {
              const sColor = statusAgendaConfig[a.status];
              const isUrgent = a.status === "Próximo";
              return (
                <div key={a.id}>
                  <div
                    role={a.recordId.startsWith("mock-") ? undefined : "button"}
                    tabIndex={a.recordId.startsWith("mock-") ? undefined : 0}
                    onClick={() => {
                      const record = scheduledRecords.find((item) => item.id === a.recordId);
                      if (record) openEditHealthRecord(record);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      const record = scheduledRecords.find((item) => item.id === a.recordId);
                      if (!record) return;
                      event.preventDefault();
                      openEditHealthRecord(record);
                    }}
                    className={cn(
                      "flex items-center justify-between py-3 group rounded-lg transition-colors",
                      a.recordId.startsWith("mock-") ? "" : "cursor-pointer hover:bg-gray-50/70 px-2 -mx-2",
                    )}
                  >
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
                  {i < displayedAgenda.length - 1 && <div className="border-t border-gray-50" />}
                </div>
              );
            })}
          </div>
          <div className="pt-4 mt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowHealthHistory(true)}
              className="w-full text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Ver todo o histórico
            </button>
          </div>
        </div>
      </div>

      {/* ── Charts Row — moved above (Mortalidade 2/3 + Cobertura 1/3) ── */}
      <div className={cn("grid grid-cols-1 gap-4", showHealthProFeatures && "lg:grid-cols-3")}>
        {/* Mortalidade */}
        {plan === "essencial" ? (
          <LockedOverlay message="Desbloqueie o gráfico Mortalidade x Taxa" targetPlan="pro" className="lg:col-span-2" preserveFirstChild>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Mortalidade x Taxa</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Período selecionado</p>
                </div>
                <div className="flex items-center gap-4">
                  <RequiredPlanBadge requiredPlan="pro" />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500" /><span className="text-[10px] font-medium text-gray-400">Mortes</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-5 h-[3px] rounded-full bg-amber-500" /><span className="text-[10px] font-medium text-gray-400">Taxa (%)</span></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">Nenhum dado de mortalidade no período.</div>
            </div>
          </LockedOverlay>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Mortalidade x Taxa</h3>
                <p className="text-xs text-gray-400 mt-0.5">Período selecionado</p>
              </div>
              <div className="flex items-center gap-4">
                <RequiredPlanBadge requiredPlan="pro" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500" /><span className="text-[10px] font-medium text-gray-400">Mortes</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-5 h-[3px] rounded-full bg-amber-500" /><span className="text-[10px] font-medium text-gray-400">Taxa (%)</span></div>
                </div>
              </div>
            </div>
            {mortalidadeData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">Nenhum dado de mortalidade no período.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={mortalidadeData} margin={{ top: 10, right: 50, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradMortesBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: 500 }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} dx={-4} domain={[0, "auto"]} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#d97706", fontSize: 11, fontWeight: 600 }} dx={4} domain={[0, "auto"]} tickFormatter={(v: number) => (v * 100).toFixed(1) + "%"} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", fontSize: "13px", padding: "14px 18px" }}
                    labelStyle={{ fontWeight: 800, color: "#111827", marginBottom: "8px" }}
                    formatter={((value: unknown, name: unknown) => {
                      if (name === "mortes") return [Number(value) + " aves", "Mortes"];
                      if (name === "taxa") return [(Number(value) * 100).toFixed(2) + "%", "Taxa"];
                      return [String(value), String(name)];
                    }) satisfies TooltipFormatter}
                  />
                  <Bar yAxisId="left" dataKey="mortes" fill="url(#gradMortesBar)" radius={[6, 6, 0, 0]} barSize={24} name="mortes" />
                  <Line yAxisId="right" type="monotone" dataKey="taxa" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: "#fff", stroke: "#f59e0b", strokeWidth: 3 }} activeDot={{ r: 7, fill: "#f59e0b", stroke: "#fff", strokeWidth: 3 }} name="taxa" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Cobertura Vacinal Mensal */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900">Cobertura Vacinal</h3>
            <p className="text-xs text-gray-400 mt-0.5">% do plantel vacinado por mês</p>
          </div>
          <div className="flex-1" style={{ minHeight: 280 }}>
            {coberturaMensal.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">Nenhum dado de vacinação.</div>
            ) : (
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
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} domain={[0, 100]} tickFormatter={(v) => v + "%"} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                    formatter={(value: unknown) => [Number(value) + "%", "Cobertura"]}
                  />
                  <Area type="monotone" dataKey="cobertura" stroke="#2d7a4f" strokeWidth={2.5} fill="url(#gradCobertura)" dot={{ r: 4, fill: "#fff", stroke: "#2d7a4f", strokeWidth: 2.5 }} activeDot={{ r: 6, fill: "#2d7a4f", stroke: "#fff", strokeWidth: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
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
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | RegistroTipo)}
              className="bg-gray-100/80 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">Todos</option>
              <option value="Vacinação">Vacinação</option>
              <option value="Tratamento">Tratamento</option>
              <option value="Inspeção">Inspeção</option>
            </select>
            <div className="flex items-center gap-2 bg-gray-100/80 rounded-xl px-3 py-2 w-56 transition-colors focus-within:bg-gray-100 focus-within:ring-2 focus-within:ring-brand-500/20">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input type="text" placeholder="Buscar registro..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none w-full" />
            </div>
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
                    <td className="px-3 pr-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRegistros.length === 0 && <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">Nenhum registro encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Health History Modal ── */}
      {showHealthHistory && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowHealthHistory(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Histórico de Vacinação</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{healthHistoryRecords.length} registros</p>
                </div>
                <button
                  type="button"
                  aria-label="Fechar histórico sanitário"
                  onClick={() => setShowHealthHistory(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-5 space-y-3">
                {healthHistoryRecords.map((registro) => {
                  const registroTipo = typeMap[registro.type] || "Inspeção";
                  const tipo = tipoColor[registroTipo];
                  const status =
                    registro.status === "completed"
                      ? { label: "Concluído", bg: "bg-emerald-50", text: "text-emerald-600" }
                      : registro.status === "in_progress"
                        ? { label: "Em andamento", bg: "bg-blue-50", text: "text-blue-600" }
                        : registro.status === "upcoming"
                          ? { label: "Próximo", bg: "bg-red-50", text: "text-red-600" }
                          : { label: "Agendado", bg: "bg-gray-100", text: "text-gray-600" };

                  return (
                    <button
                      key={registro.id}
                      type="button"
                      onClick={() => {
                        setShowHealthHistory(false);
                        openEditHealthRecord(registro);
                      }}
                      className="w-full text-left rounded-2xl border border-gray-100 bg-gray-50/70 p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <span className={cn("inline-flex text-xs font-semibold px-2.5 py-1 rounded-lg", tipo.badge)}>
                            {registroTipo}
                          </span>
                          <p className="text-sm font-semibold text-gray-900 mt-2">{registro.title}</p>
                          <p className="text-xs text-gray-500 mt-1">Lote: {registro.flocks?.code || "Todos"}</p>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(registro.date)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", status.bg, status.text)}>
                          {status.label}
                        </span>
                        {registro.responsible && (
                          <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                            Responsável: {registro.responsible}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {healthHistoryRecords.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">Nenhuma vacinação encontrada.</p>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ── Modal — Add/Edit ── */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { setShowModal(false); setEditing(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{editing ? "Editar Registro" : "Novo Registro de Saúde"}</h2>
                <button onClick={() => { setShowModal(false); setEditing(null); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.7fr)_220px] gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título</label>
                    <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder={titlePlaceholder} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo</label>
                    <select
                      value={form.registroRapido}
                      onChange={(e) => {
                        const option = registroRapidoOptions.find((item) => item.id === e.target.value);
                        if (!option) return;
                        setForm({
                          ...form,
                          registroRapido: option.id,
                          tipo: option.tipo,
                        });
                      }}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer"
                    >
                      {registroRapidoOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data</label>
                    <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lote</label>
                    <select value={form.loteId} onChange={(e) => setForm({ ...form, loteId: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                      <option value="">Selecione um lote...</option>
                      {lotes.map(l => <option key={l.id} value={l.id}>{l.codigo}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Responsável</label>
                    <input type="text" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Ex: Dr. Silva" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observação</label>
                  <input type="text" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Notas adicionais" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                {form.tipo !== "Inspeção" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as RegistroDbStatus })}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer"
                    >
                      <option value="completed">Concluído</option>
                      <option value="in_progress">Em andamento</option>
                      <option value="scheduled">Agendado</option>
                      <option value="upcoming">Próximo</option>
                    </select>
                  </div>
                )}
                {form.tipo === "Vacinação" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
                    <input type="text" value={form.targetDisease} onChange={(e) => setForm({ ...form, targetDisease: e.target.value })} placeholder="Doença alvo" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <input type="text" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} placeholder="Nome comercial / marca" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <input type="text" value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} placeholder="Lote da vacina" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <input type="text" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="Fabricante" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <select value={form.applicationRoute} onChange={(e) => setForm({ ...form, applicationRoute: e.target.value as NonNullable<HealthRecordRow["application_route"]> })} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                      <option value="water">Água</option>
                      <option value="ocular">Ocular</option>
                      <option value="spray">Spray</option>
                      <option value="wing web">Membrana da asa</option>
                      <option value="intramuscular">Intramuscular</option>
                      <option value="subcutaneous">Subcutânea</option>
                    </select>
                    <input type="number" value={form.doses} onChange={(e) => setForm({ ...form, doses: e.target.value })} placeholder="Quantidade de doses" className="border border-gray-200 rounded-xl px-3 py-2 text-sm md:col-span-2" />
                  </div>
                )}
                {form.tipo === "Tratamento" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                    <input type="text" value={form.activeIngredient} onChange={(e) => setForm({ ...form, activeIngredient: e.target.value })} placeholder="Princípio ativo" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <input type="text" value={form.dosageDilution} onChange={(e) => setForm({ ...form, dosageDilution: e.target.value })} placeholder="Dosagem / diluição" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <input type="number" value={form.withdrawalPeriodDays} onChange={(e) => setForm({ ...form, withdrawalPeriodDays: e.target.value })} placeholder="Carência (dias)" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <input type="text" value={form.disposalDestination} onChange={(e) => setForm({ ...form, disposalDestination: e.target.value })} placeholder="Destino de descarte" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <input type="text" value={form.prescriptionRef} onChange={(e) => setForm({ ...form, prescriptionRef: e.target.value })} placeholder="Receita / referência" className="border border-gray-200 rounded-xl px-3 py-2 text-sm md:col-span-2" />
                  </div>
                )}
                {form.tipo === "Inspeção" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-sky-100 bg-sky-50/40 p-3">
                    <select value={form.fecesAspect} onChange={(e) => setForm({ ...form, fecesAspect: e.target.value as DailyInspectionRow["feces_aspect"] })} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                      <option value="Normal">Fezes normais</option>
                      <option value="Diarrhea">Diarreia</option>
                      <option value="Blood">Sangue</option>
                    </select>
                    <select value={form.respiratorySymptoms} onChange={(e) => setForm({ ...form, respiratorySymptoms: e.target.value as DailyInspectionRow["respiratory_symptoms"] })} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                      <option value="None">Sem sintomas respiratórios</option>
                      <option value="Snick">Espirro / ruído respiratório</option>
                      <option value="Coryza">Coriza</option>
                    </select>
                    <select value={form.behavior} onChange={(e) => setForm({ ...form, behavior: e.target.value as DailyInspectionRow["behavior"] })} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                      <option value="Normal">Comportamento normal</option>
                      <option value="Huddled">Aglomeradas</option>
                      <option value="Feather Pecking">Bicagem de penas</option>
                    </select>
                    <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                      <input type="checkbox" checked={form.lightTimerOps} onChange={(e) => setForm({ ...form, lightTimerOps: e.target.checked })} />
                      Timer de luz operando
                    </label>
                    <input type="number" step="0.1" value={form.waterChlorinePpm} onChange={(e) => setForm({ ...form, waterChlorinePpm: e.target.value })} placeholder="Cloro da água (ppm)" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <input type="number" step="0.1" value={form.waterPh} onChange={(e) => setForm({ ...form, waterPh: e.target.value })} placeholder="pH da água" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={() => { setShowModal(false); setEditing(null); }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
                <button onClick={handleSave} disabled={saving || !form.titulo || !form.data || !form.loteId} className={cn("inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm", form.titulo && form.data && form.loteId && !saving ? "text-white bg-brand-600 hover:bg-brand-700" : "text-gray-400 bg-gray-200 cursor-not-allowed")}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Salvar
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
