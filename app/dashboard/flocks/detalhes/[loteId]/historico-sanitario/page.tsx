"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  FileText,
  Filter,
  HeartPulse,
  Pill,
  Search,
  ShieldCheck,
  Skull,
  Sparkles,
  Syringe,
  TrendingUp,
  User,
} from "lucide-react";
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RequiredPlanBadge } from "@/components/plan/plan-badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import type { Tables } from "@/lib/database.types";

type EventType = "vacina" | "tratamento" | "inspecao" | "sintoma" | "mortalidade";
type EventStatus = "concluido" | "pendente" | "atrasado" | "em_andamento";
type TimelinePeriod = "7d" | "30d" | "latest" | "months" | "all";
interface HealthRecordRow {
  id: string;
  title: string;
  date: string;
  type: "vaccination" | "treatment" | "inspection";
  status: "completed" | "in_progress" | "scheduled" | "upcoming";
  responsible: string | null;
  notes: string | null;
}
type MortalityRecordRow = Pick<
  Tables<"mortality">,
  "id" | "date" | "dead_birds" | "cause" | "mortality_rate" | "notes"
>;
type DailyInspectionRow = Pick<
  Tables<"daily_inspections">,
  | "id"
  | "date"
  | "responsible"
  | "feces_aspect"
  | "respiratory_symptoms"
  | "behavior"
  | "light_timer_ops"
  | "water_chlorine_ppm"
  | "water_ph"
  | "notes"
>;
type TooltipFormatter = (value: unknown, name: unknown) => [string, string];

interface TimelineEvent {
  id: string;
  date: string;
  type: EventType;
  title: string;
  description: string;
  employee: string;
  observation?: string;
  status: EventStatus;
}

interface VaccineRecord {
  id: string;
  nome: string;
  dataAplicada: string;
  dose: string;
  protocolo: string;
  proximaDose?: string;
  status: "em_dia" | "proxima" | "expirada" | "pendente";
  responsavel: string;
}

interface TreatmentRecord {
  id: string;
  medicamento: string;
  motivo: string;
  inicio: string;
  fim: string;
  duracao: string;
  resultado: "resolvido" | "em_tratamento" | "obito" | "parcial";
  responsavel: string;
}

interface InspectionRecord {
  id: string;
  data: string;
  responsavel: string;
  checklist: { item: string; ok: boolean }[];
  observacao: string;
}

type HealthTimelineRange = "7d" | "30d" | "months" | "total";

interface HealthTimelinePoint {
  label: string;
  score: number;
  mortalidade: number;
  postura: number;
}

const eventMeta: Record<
  EventType,
  { label: string; icon: typeof Syringe; bg: string; text: string; ring: string }
> = {
  vacina: {
    label: "Vacina",
    icon: Syringe,
    bg: "bg-blue-50",
    text: "text-blue-600",
    ring: "ring-blue-100",
  },
  tratamento: {
    label: "Tratamento",
    icon: Pill,
    bg: "bg-purple-50",
    text: "text-purple-600",
    ring: "ring-purple-100",
  },
  inspecao: {
    label: "Inspeção",
    icon: ClipboardCheck,
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    ring: "ring-emerald-100",
  },
  sintoma: {
    label: "Sintoma",
    icon: AlertTriangle,
    bg: "bg-amber-50",
    text: "text-amber-600",
    ring: "ring-amber-100",
  },
  mortalidade: {
    label: "Mortalidade",
    icon: Skull,
    bg: "bg-red-50",
    text: "text-red-600",
    ring: "ring-red-100",
  },
};

const statusMeta: Record<EventStatus, { label: string; classes: string }> = {
  concluido: { label: "Concluído", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pendente: { label: "Pendente", classes: "bg-gray-50 text-gray-600 border-gray-200" },
  atrasado: { label: "Atrasado", classes: "bg-red-50 text-red-700 border-red-200" },
  em_andamento: { label: "Em andamento", classes: "bg-amber-50 text-amber-700 border-amber-200" },
};

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const eventFilterOptions = [
  { key: "all", label: "Todos" },
  { key: "vacina", label: "Vacinas" },
  { key: "tratamento", label: "Tratamentos" },
  { key: "inspecao", label: "Inspeções" },
  { key: "sintoma", label: "Sintomas" },
  { key: "mortalidade", label: "Mortalidade" },
] as const;

const periodFilterOptions = [
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "latest", label: "Último" },
  { key: "months", label: "Meses" },
  { key: "all", label: "Tempo total" },
] as const;

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  }).replace(".", "");
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  }).replace(".", "");
}

const checklistTemplate = [
  "Temperatura do galpao",
  "Ventilacao",
  "Consumo de racao",
  "Consumo de agua",
  "Condicao das camas",
  "Comportamento das aves",
  "Sinais clinicos",
  "Mortalidade diaria",
  "Qualidade dos ovos",
  "Iluminacao",
  "Biosseguranca",
  "Equipamentos",
] as const;

const checklistKeywordMap: Record<(typeof checklistTemplate)[number], string[]> = {
  "Temperatura do galpao": ["temperatura", "calor", "frio", "termico"],
  Ventilacao: ["ventilacao", "poeira", "amonia", "ar"],
  "Consumo de racao": ["racao", "alimento", "consumo"],
  "Consumo de agua": ["agua", "bebedouro"],
  "Condicao das camas": ["cama", "umidade", "substrato"],
  "Comportamento das aves": ["bicagem", "canibal", "apatia", "estresse"],
  "Sinais clinicos": ["sintoma", "coriza", "respira", "diarre", "pena", "lesao"],
  "Mortalidade diaria": ["mortalidade", "morte", "obito"],
  "Qualidade dos ovos": ["ovo", "casca", "postura"],
  Iluminacao: ["luz", "iluminacao"],
  Biosseguranca: ["biosseguranca", "desinfeccao", "visita"],
  Equipamentos: ["equipamento", "comedouro", "nebulizador"],
};

function mapEventStatus(status: HealthRecordRow["status"]): EventStatus {
  if (status === "completed") return "concluido";
  if (status === "in_progress") return "em_andamento";
  if (status === "upcoming") return "pendente";
  return "pendente";
}

function mapHealthTypeToEventType(record: HealthRecordRow): EventType {
  if (record.type === "vaccination") return "vacina";
  if (record.type === "treatment") return "tratamento";
  const source = `${record.title} ${record.notes ?? ""}`.toLowerCase();
  return source.includes("sintoma") ? "sintoma" : "inspecao";
}

function typeLabelForHealthRecord(type: HealthRecordRow["type"]) {
  if (type === "vaccination") return "Registro de vacinacao";
  if (type === "treatment") return "Registro de tratamento";
  return "Registro de inspecao";
}

function generateChecklistFromText(record: HealthRecordRow) {
  if (record.status !== "completed") {
    return checklistTemplate.map((item) => ({ item, ok: false }));
  }

  const source = `${record.title} ${record.notes ?? ""}`.toLowerCase();
  return checklistTemplate.map((item) => ({
    item,
    ok: !checklistKeywordMap[item].some((keyword) => source.includes(keyword)),
  }));
}

function generateChecklistFromDailyInspection(inspection: DailyInspectionRow) {
  return [
    { item: `Fezes: ${inspection.feces_aspect}`, ok: inspection.feces_aspect === "Normal" },
    {
      item: `Respiração: ${inspection.respiratory_symptoms}`,
      ok: inspection.respiratory_symptoms === "None",
    },
    { item: `Comportamento: ${inspection.behavior}`, ok: inspection.behavior === "Normal" },
    { item: "Timer de luz", ok: inspection.light_timer_ops },
    {
      item: `Cloro da água: ${inspection.water_chlorine_ppm ?? "sem medição"} ppm`,
      ok: inspection.water_chlorine_ppm == null || inspection.water_chlorine_ppm >= 1,
    },
    {
      item: `pH da água: ${inspection.water_ph ?? "sem medição"}`,
      ok: inspection.water_ph == null || (inspection.water_ph >= 6 && inspection.water_ph <= 8),
    },
  ];
}

function mapTreatmentResult(status: HealthRecordRow["status"]): TreatmentRecord["resultado"] {
  if (status === "completed") return "resolvido";
  if (status === "in_progress") return "em_tratamento";
  return "parcial";
}

function parseTreatmentDuration(record: HealthRecordRow) {
  const source = record.notes ?? "";
  const match = source.match(/(\d+)\s*(dia|dias|semana|semanas)/i);
  if (!match) return { fim: record.date, duracao: "—" };

  const amount = Number(match[1]);
  const days = match[2].toLowerCase().startsWith("semana") ? amount * 7 : amount;
  const endDate = addDays(new Date(`${record.date}T00:00:00`), days);
  return {
    fim: toIsoDate(endDate),
    duracao: `${days} dia${days === 1 ? "" : "s"}`,
  };
}

export default function HistoricoSanitarioPage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const { farm, loading: authLoading } = useAuth();
  const [loteCode, setLoteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [birdCount, setBirdCount] = useState(0);
  const [healthRecords, setHealthRecords] = useState<HealthRecordRow[]>([]);
  const [dailyInspections, setDailyInspections] = useState<DailyInspectionRow[]>([]);
  const [mortalityRecords, setMortalityRecords] = useState<MortalityRecordRow[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!farm) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const currentFarm = farm;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const [flockRes, healthRes, dailyInspectionsRes, mortalityRes] = await Promise.all([
        supabase
          .from("flocks")
          .select("code, bird_count")
          .eq("id", loteId)
          .eq("farm_id", currentFarm.id)
          .maybeSingle(),
        supabase
          .from("health_records")
          .select("id, title, date, type, status, responsible, notes")
          .eq("farm_id", currentFarm.id)
          .eq("flock_id", loteId)
          .order("date", { ascending: false }),
        supabase
          .from("daily_inspections")
          .select("id, date, responsible, feces_aspect, respiratory_symptoms, behavior, light_timer_ops, water_chlorine_ppm, water_ph, notes")
          .eq("farm_id", currentFarm.id)
          .or(`flock_id.eq.${loteId},flock_id.is.null`)
          .order("date", { ascending: false }),
        supabase
          .from("mortality")
          .select("id, date, dead_birds, cause, mortality_rate, notes")
          .eq("farm_id", currentFarm.id)
          .eq("flock_id", loteId)
          .order("date", { ascending: false }),
      ]);

      if (cancelled) return;
      if (flockRes.error || !flockRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoteCode(flockRes.data.code);
      setBirdCount(flockRes.data.bird_count ?? 0);
      setHealthRecords((healthRes.data as HealthRecordRow[] | null) ?? []);
      setDailyInspections((dailyInspectionsRes.data as DailyInspectionRow[] | null) ?? []);
      setMortalityRecords((mortalityRes.data as MortalityRecordRow[] | null) ?? []);
      setNotFound(false);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, farm, loteId]);

  const [filterType, setFilterType] = useState<"all" | EventType>("all");
  const [timelinePeriod, setTimelinePeriod] = useState<TimelinePeriod>("all");
  const [search, setSearch] = useState("");
  const [inspectionSearch, setInspectionSearch] = useState("");
  const [vaccineSearch, setVaccineSearch] = useState("");
  const [treatmentSearch, setTreatmentSearch] = useState("");
  const [healthTimelineRange, setHealthTimelineRange] = useState<HealthTimelineRange>("30d");
  const [showPeriodFilter, setShowPeriodFilter] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [expandedInspectionId, setExpandedInspectionId] = useState<string | null>(null);
  const periodFilterRef = useRef<HTMLDivElement | null>(null);
  const typeFilterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (periodFilterRef.current && !periodFilterRef.current.contains(target)) {
        setShowPeriodFilter(false);
      }
      if (typeFilterRef.current && !typeFilterRef.current.contains(target)) {
        setShowTypeFilter(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const healthEvents = healthRecords.map((record) => ({
      id: record.id,
      date: record.date,
      type: mapHealthTypeToEventType(record),
      title: record.title,
      description: record.notes ?? typeLabelForHealthRecord(record.type),
      employee: record.responsible ?? "Sistema",
      observation: record.notes ?? undefined,
      status: mapEventStatus(record.status),
    }));
    const mortalityEvents = mortalityRecords.map((record) => ({
      id: `mortality-${record.id}`,
      date: record.date,
      type: "mortalidade" as const,
      title: `Mortalidade registrada: ${record.dead_birds} aves`,
      description: `${record.cause}${record.notes ? ` - ${record.notes}` : ""}`,
      employee: "Sistema",
      observation: record.notes ?? undefined,
      status: "concluido" as const,
    }));
    const inspectionEvents = dailyInspections.map((inspection) => ({
      id: `daily_inspection-${inspection.id}`,
      date: inspection.date,
      type: "inspecao" as const,
      title: "Inspeção clínica estruturada",
      description: `Fezes ${inspection.feces_aspect}, respiração ${inspection.respiratory_symptoms}, comportamento ${inspection.behavior}`,
      employee: inspection.responsible ?? "Sistema",
      observation: inspection.notes ?? undefined,
      status: "concluido" as const,
    }));

    return [...healthEvents, ...inspectionEvents, ...mortalityEvents].sort((a, b) => b.date.localeCompare(a.date));
  }, [dailyInspections, healthRecords, mortalityRecords]);

  const vaccineRecords = useMemo<VaccineRecord[]>(
    () =>
      healthRecords
        .filter((record) => record.type === "vaccination")
        .map((record) => ({
          id: record.id,
          nome: record.title,
          dataAplicada: record.date,
          dose: record.status === "completed" ? "Aplicada" : "Programada",
          protocolo: record.notes ?? "Registro sanitario",
          proximaDose: record.status === "scheduled" || record.status === "upcoming" ? record.date : undefined,
          status:
            record.status === "completed"
              ? "em_dia"
              : record.status === "upcoming"
              ? "proxima"
              : "pendente",
          responsavel: record.responsible ?? "Sistema",
        })),
    [healthRecords]
  );

  const treatmentRecords = useMemo<TreatmentRecord[]>(
    () =>
      healthRecords
        .filter((record) => record.type === "treatment")
        .map((record) => {
          const duration = parseTreatmentDuration(record);
          return {
            id: record.id,
            medicamento: record.title,
            motivo: record.notes ?? "Tratamento registrado",
            inicio: record.date,
            fim: duration.fim,
            duracao: duration.duracao,
            resultado: mapTreatmentResult(record.status),
            responsavel: record.responsible ?? "Sistema",
          };
        }),
    [healthRecords]
  );

  const inspectionRecords = useMemo<InspectionRecord[]>(
    () =>
      [
        ...dailyInspections.map((inspection) => ({
          id: inspection.id,
          data: inspection.date,
          responsavel: inspection.responsible ?? "Sistema",
          checklist: generateChecklistFromDailyInspection(inspection),
          observacao: inspection.notes ?? "",
        })),
        ...healthRecords.filter((record) => record.type === "inspection").map((record) => ({
          id: record.id,
          data: record.date,
          responsavel: record.responsible ?? "Sistema",
          checklist: generateChecklistFromText(record),
          observacao: record.status === "completed" ? record.notes ?? "" : "Pendente",
        })),
      ].sort((a, b) => b.data.localeCompare(a.data)),
    [dailyInspections, healthRecords]
  );

  const filteredEvents = useMemo(() => {
    const latestEventDate = timelineEvents[0]?.date
      ? new Date(`${timelineEvents.map((event) => event.date).sort().slice(-1)[0]}T00:00:00`)
      : new Date();

    const latestIso = toIsoDate(latestEventDate);
    const periodStart =
      timelinePeriod === "7d"
        ? toIsoDate(addDays(latestEventDate, -6))
        : timelinePeriod === "30d"
        ? toIsoDate(addDays(latestEventDate, -29))
        : timelinePeriod === "months"
        ? toIsoDate(startOfMonth(new Date(latestEventDate.getFullYear(), latestEventDate.getMonth() - 5, 1)))
        : latestIso;

    return timelineEvents
      .filter((e) => {
        if (timelinePeriod === "all") return true;
        if (timelinePeriod === "latest") return e.date === latestIso;
        return e.date >= periodStart && e.date <= latestIso;
      })
      .filter((e) => filterType === "all" || e.type === filterType)
      .filter(
        (e) =>
          search === "" ||
          e.title.toLowerCase().includes(search.toLowerCase()) ||
          e.employee.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filterType, search, timelineEvents, timelinePeriod]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    filteredEvents.forEach((e) => {
      (groups[e.date] ||= []).push(e);
    });
    return Object.entries(groups);
  }, [filteredEvents]);

  const selectedTypeLabel =
    eventFilterOptions.find((option) => option.key === filterType)?.label ?? "Todos";
  const selectedPeriodLabel =
    periodFilterOptions.find((option) => option.key === timelinePeriod)?.label ?? "Tempo total";
  const filteredInspections = useMemo(() => {
    const term = inspectionSearch.trim().toLowerCase();
    if (!term) return inspectionRecords;
    return inspectionRecords.filter(
      (inspection) =>
        formatDate(inspection.data).toLowerCase().includes(term) ||
        inspection.data.toLowerCase().includes(term) ||
        inspection.responsavel.toLowerCase().includes(term),
    );
  }, [inspectionRecords, inspectionSearch]);
  const filteredVaccines = useMemo(() => {
    const term = vaccineSearch.trim().toLowerCase();
    if (!term) return vaccineRecords;
    return vaccineRecords.filter(
      (vaccine) =>
        vaccine.nome.toLowerCase().includes(term) ||
        vaccine.responsavel.toLowerCase().includes(term),
    );
  }, [vaccineRecords, vaccineSearch]);
  const filteredTreatments = useMemo(() => {
    const term = treatmentSearch.trim().toLowerCase();
    if (!term) return treatmentRecords;
    return treatmentRecords.filter(
      (treatment) =>
        treatment.medicamento.toLowerCase().includes(term) ||
        treatment.responsavel.toLowerCase().includes(term),
    );
  }, [treatmentRecords, treatmentSearch]);
  const shouldScrollVaccines = filteredVaccines.length > 5;
  const shouldScrollTreatments = filteredTreatments.length > 3;

  const healthTimeline = useMemo(() => {
    const today = startOfDay(new Date());
    const allDates = [
      ...timelineEvents.map((event) => event.date),
      ...vaccineRecords.flatMap((vaccine) =>
        [vaccine.dataAplicada, vaccine.proximaDose].filter(Boolean) as string[],
      ),
      ...treatmentRecords.flatMap((treatment) => [treatment.inicio, treatment.fim]),
      ...inspectionRecords.map((inspection) => inspection.data),
    ]
      .filter(Boolean)
      .sort();

    const firstDate = allDates[0] ? new Date(`${allDates[0]}T00:00:00`) : today;

    const buildPoint = (start: Date, end: Date, label: string): HealthTimelinePoint => {
      const startIso = toIsoDate(start);
      const endIso = toIsoDate(end);

      const bucketEvents = timelineEvents.filter(
        (event) => event.date >= startIso && event.date <= endIso,
      );
      const criticalEvents = bucketEvents.filter(
        (event) => event.type === "sintoma" || event.type === "mortalidade",
      ).length;
      const mortalityEvents = bucketEvents.filter(
        (event) => event.type === "mortalidade",
      ).length;
      const symptomEvents = bucketEvents.filter(
        (event) => event.type === "sintoma",
      ).length;

      const pendingVaccines = vaccineRecords.filter((vaccine) => {
        const dueDate = vaccine.proximaDose ?? vaccine.dataAplicada;
        return dueDate <= endIso && vaccine.status !== "em_dia";
      }).length;

      const expiredVaccines = vaccineRecords.filter((vaccine) => {
        const dueDate = vaccine.proximaDose ?? vaccine.dataAplicada;
        return dueDate <= endIso && vaccine.status === "expirada";
      }).length;

      const latestInspection = [...inspectionRecords]
        .filter((inspection) => inspection.data <= endIso)
        .sort((a, b) => b.data.localeCompare(a.data))[0];

      const inspectionGap = latestInspection
        ? diffInDays(end, new Date(`${latestInspection.data}T00:00:00`))
        : 30;

      const inspectionPenalty =
        inspectionGap <= 7 ? 0 : Math.min(22, Math.round((inspectionGap - 7) * 1.4));

      const mortalityDeaths = mortalityRecords
        .filter((record) => record.date >= startIso && record.date <= endIso)
        .reduce((sum, record) => sum + record.dead_birds, 0);
      const mortalityRate = birdCount > 0 ? (mortalityDeaths / birdCount) * 100 : mortalityEvents * 0.2;

      const score = Math.max(
        38,
        Math.min(
          100,
          Math.round(
            100 -
              criticalEvents * 10 -
              mortalityRate * 18 -
              pendingVaccines * 8 -
              expiredVaccines * 10 -
              inspectionPenalty,
          ),
        ),
      );

      const mortalidade = Math.max(
        0.08,
        Math.min(
          2.4,
          Number(
            (
              0.12 +
              mortalityRate +
              symptomEvents * 0.16 +
              pendingVaccines * 0.08 +
              expiredVaccines * 0.12 +
              inspectionPenalty * 0.012
            ).toFixed(2),
          ),
        ),
      );

      const postura = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            94 -
              mortalityRate * 18 -
              symptomEvents * 6 -
              pendingVaccines * 2 -
              expiredVaccines * 3 -
              inspectionPenalty * 0.35,
          ),
        ),
      );

      return {
        label,
        score,
        mortalidade,
        postura,
      };
    };

    if (healthTimelineRange === "7d") {
      return Array.from({ length: 7 }, (_, index) => {
        const day = addDays(today, index - 6);
        return buildPoint(day, day, formatShortDayLabel(day));
      });
    }

    if (healthTimelineRange === "30d") {
      return Array.from({ length: 30 }, (_, index) => {
        const day = addDays(today, index - 29);
        return buildPoint(day, day, formatShortDayLabel(day));
      });
    }

    if (healthTimelineRange === "months") {
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
  }, [birdCount, healthTimelineRange, inspectionRecords, mortalityRecords, timelineEvents, vaccineRecords]);

  const vaccineStatusMeta = {
    em_dia: { label: "Em dia", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    proxima: { label: "Próxima dose", classes: "bg-blue-50 text-blue-700 border-blue-200" },
    expirada: { label: "Expirada", classes: "bg-red-50 text-red-700 border-red-200" },
    pendente: { label: "Pendente", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  } as const;

  const treatmentResultMeta = {
    resolvido: { label: "Resolvido", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    em_tratamento: { label: "Em tratamento", classes: "bg-amber-50 text-amber-700 border-amber-200" },
    obito: { label: "Óbito", classes: "bg-red-50 text-red-700 border-red-200" },
    parcial: { label: "Parcial", classes: "bg-gray-50 text-gray-600 border-gray-200" },
  } as const;
  const patterns = useMemo(
    () =>
      [
        mortalityRecords.length > 0
          ? {
              id: "mortality",
              titulo: "Mortalidade registrada no historico",
              descricao: `${mortalityRecords.reduce((sum, record) => sum + record.dead_birds, 0)} aves registradas em ${mortalityRecords.length} ocorrencia${mortalityRecords.length === 1 ? "" : "s"}.`,
              confianca: 100,
              impacto: "alto" as const,
              ocorrencias: mortalityRecords.length,
            }
          : null,
        healthRecords.some((record) => record.status === "in_progress")
          ? {
              id: "active-health",
              titulo: "Registros sanitarios em andamento",
              descricao: "Existem tratamentos ou inspecoes ainda pendentes de resolucao.",
              confianca: 100,
              impacto: "médio" as const,
              ocorrencias: healthRecords.filter((record) => record.status === "in_progress").length,
            }
          : null,
      ].filter((pattern): pattern is NonNullable<typeof pattern> => pattern !== null),
    [healthRecords, mortalityRecords]
  );
  const shouldShowPatterns = timelineEvents.length >= 3 && patterns.length > 0;

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Clock className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <Link
          href={`/dashboard/flocks/detalhes/${loteId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Detalhes
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-gray-400">Dados nao encontrados.</p>
        </div>
      </div>
    );
  }

  if (healthRecords.length === 0 && mortalityRecords.length === 0) {
    return (
      <div className="space-y-6">
        <Link
          href={`/dashboard/flocks/detalhes/${loteId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Detalhes
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <HeartPulse className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">
            Nenhum registro de saude encontrado para este lote
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
            Este lote ainda nao possui historico de vacinas, tratamentos, inspecoes ou
            mortalidade. Clique abaixo para registrar a primeira ocorrencia.
          </p>
          <Link
            href={`/dashboard/health?register=true&flockId=${loteId}`}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Registrar nova ocorrencia
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/flocks/detalhes/${loteId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Detalhes
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Histórico Sanitário — {loteCode}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Linha do tempo completa de eventos, vacinas, tratamentos e inspeções
            </p>
          </div>
        </div>
      </div>

      {/* Score Evolution Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Evolução de saúde</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: "7d", label: "Últimos 7 dias" },
              { id: "30d", label: "Últimos 30 dias" },
              { id: "months", label: "Meses" },
              { id: "total", label: "Tempo total" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setHealthTimelineRange(option.id as HealthTimelineRange)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition-colors",
                  healthTimelineRange === option.id
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
          <ComposedChart data={healthTimeline} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
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
              minTickGap={healthTimelineRange === "30d" ? 18 : 8}
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
                if (name === "Score de saúde" || name === "Postura (%)") return [`${Number(value ?? 0)}%`, String(name)];
                return [`${Number(value ?? 0).toFixed(2)}%`, String(name)];
              }) satisfies TooltipFormatter}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              iconType="circle"
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="score"
              name="Score de saúde"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#scoreGrad)"
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

      {/* Patterns */}
      {shouldShowPatterns && (
      <div className="bg-gradient-to-r from-amber-50 to-amber-50/40 rounded-2xl border border-amber-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Padrões identificados</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Correlações identificadas automaticamente no histórico
              </p>
            </div>
          </div>
          <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {patterns.map((p) => {
            const impactColor =
              p.impacto === "alto"
                ? "text-red-600 bg-red-50 border-red-200"
                : p.impacto === "médio"
                ? "text-amber-700 bg-amber-50 border-amber-200"
                : "text-emerald-700 bg-emerald-50 border-emerald-200";
            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-bold text-gray-900 flex-1">{p.titulo}</h4>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase px-2 py-0.5 rounded border flex-shrink-0",
                      impactColor,
                    )}
                  >
                    {p.impacto}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">{p.descricao}</p>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {p.ocorrencias} ocorrências
                  </span>
                  <span className="font-semibold text-gray-700">
                    Confiança: {p.confianca}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-5 items-stretch">
      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 xl:h-[450px] flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Linha do tempo de eventos</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Todos os eventos sanitários ordenados por data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar evento ou responsável..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-5">
          <div className="flex items-center gap-1 text-xs text-gray-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filtrar:
          </div>

          <div className="relative" ref={periodFilterRef}>
            <button
              type="button"
              onClick={() => {
                setShowPeriodFilter((current) => !current);
                setShowTypeFilter(false);
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>Período: {selectedPeriodLabel}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showPeriodFilter && "rotate-180")} />
            </button>
            {showPeriodFilter && (
              <div className="absolute left-0 top-full mt-2 min-w-[200px] rounded-xl border border-gray-200 bg-white shadow-lg p-2 z-20">
                {periodFilterOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setTimelinePeriod(option.key);
                      setShowPeriodFilter(false);
                    }}
                    className={cn(
                      "w-full text-left text-xs font-semibold px-3 py-2 rounded-lg transition-colors",
                      timelinePeriod === option.key
                        ? "bg-brand-50 text-brand-700"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={typeFilterRef}>
            <button
              type="button"
              onClick={() => {
                setShowTypeFilter((current) => !current);
                setShowPeriodFilter(false);
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>Tipo de evento: {selectedTypeLabel}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showTypeFilter && "rotate-180")} />
            </button>
            {showTypeFilter && (
              <div className="absolute left-0 top-full mt-2 min-w-[220px] rounded-xl border border-gray-200 bg-white shadow-lg p-2 z-20">
                <div className="flex flex-wrap gap-2">
                  {eventFilterOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setFilterType(option.key);
                        setShowTypeFilter(false);
                      }}
                      className={cn(
                        "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer",
                        filterType === option.key
                          ? "bg-brand-500 text-white border-brand-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feed timeline */}
        {groupedByDate.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-5 py-10 text-center">
            <p className="text-sm text-gray-500">Nenhum evento encontrado</p>
          </div>
        ) : (
          <div className="relative flex-1 min-h-0 overflow-y-auto dashboard-scroll pr-1 -mr-1 py-1">
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gray-200" aria-hidden />
            <div className="space-y-6">
              {groupedByDate.map(([date, events]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative z-10 w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-gray-500" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {formatDate(date)}
                    </p>
                  </div>
                  <div className="ml-14 space-y-3">
                    {events.map((ev) => {
                      const meta = eventMeta[ev.type];
                      const Icon = meta.icon;
                      const status = statusMeta[ev.status];
                      return (
                        <div
                          key={ev.id}
                          className="relative bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ring-4",
                                meta.bg,
                                meta.ring,
                              )}
                            >
                              <Icon className={cn("w-4 h-4", meta.text)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span
                                      className={cn(
                                        "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                        meta.bg,
                                        meta.text,
                                      )}
                                    >
                                      {meta.label}
                                    </span>
                                    <span
                                      className={cn(
                                        "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                                        status.classes,
                                      )}
                                    >
                                      {status.label}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold text-gray-900">
                                    {ev.title}
                                  </h4>
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 mb-2">{ev.description}</p>
                              {ev.observation && (
                                <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-2">
                                  <p className="text-[11px] text-gray-600 leading-relaxed">
                                    <FileText className="inline w-3 h-3 mr-1 text-gray-400" />
                                    {ev.observation}
                                  </p>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                <User className="w-3 h-3" />
                                <span>{ev.employee}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Inspection History */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 xl:h-[450px] flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Histórico de inspeções</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Checklists, responsáveis e observações por inspeção
            </p>
          </div>
        </div>
        <div className="relative mb-4 w-[250px] max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar data ou responsável..."
            value={inspectionSearch}
            onChange={(e) => setInspectionSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all placeholder:text-gray-400"
          />
        </div>
        <div className="space-y-4 flex-1 min-h-0 overflow-y-auto dashboard-scroll pr-1 -mr-1 py-1">
          {filteredInspections.map((insp) => {
            const okCount = insp.checklist.filter((c) => c.ok).length;
            const total = insp.checklist.length;
            const pct = Math.round((okCount / total) * 100);
            const isExpanded = expandedInspectionId === insp.id;
            return (
              <div
                key={insp.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  setExpandedInspectionId((current) => (current === insp.id ? null : insp.id))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setExpandedInspectionId((current) => (current === insp.id ? null : insp.id));
                  }
                }}
                className={cn(
                  "border rounded-xl p-4 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-200",
                  isExpanded
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-gray-100 hover:border-gray-200",
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <HeartPulse className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{formatDate(insp.data)}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {insp.responsavel}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {isExpanded ? "Clique para recolher checklist" : "Clique para ver checklist"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                        Conformidade
                      </p>
                      <p
                        className={cn(
                          "text-sm font-bold",
                          pct === 100
                            ? "text-emerald-600"
                            : pct >= 80
                            ? "text-amber-600"
                            : "text-red-600",
                        )}
                      >
                        {okCount}/{total} ({pct}%)
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-gray-400 transition-transform duration-300",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </div>
                </div>
                <div
                  className={cn(
                    "grid overflow-hidden transition-all duration-300 ease-out",
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="min-h-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 pt-1">
                      {insp.checklist.map((c, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border",
                            c.ok
                              ? "bg-emerald-50/50 border-emerald-100 text-emerald-700"
                              : "bg-red-50/50 border-red-100 text-red-700",
                          )}
                        >
                          {c.ok ? (
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          )}
                          <span className="truncate">{c.item}</span>
                        </div>
                      ))}
                    </div>
                    {insp.observacao && (
                      <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        <p className="text-[11px] text-gray-600 leading-relaxed">
                          <FileText className="inline w-3 h-3 mr-1 text-gray-400" />
                          {insp.observacao}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredInspections.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-8 text-center text-sm text-gray-500">
              Nenhuma inspeção encontrada.
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Vaccination History */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Syringe className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Histórico de vacinação</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Protocolo vacinal completo com próximas doses
            </p>
          </div>
        </div>
        <div className="relative mb-4 w-[290px] max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar imunizante ou responsável..."
            value={vaccineSearch}
            onChange={(e) => setVaccineSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all placeholder:text-gray-400"
          />
        </div>
        <div
          className={cn(
            "overflow-x-auto",
            shouldScrollVaccines && "max-h-[420px] overflow-y-auto dashboard-scroll pr-1 -mr-1 py-1",
          )}
        >
          <table className="w-full text-sm">
            <thead className={cn(shouldScrollVaccines && "sticky top-0 z-10 bg-white")}>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                  Vacina
                </th>
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                  Aplicada em
                </th>
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                  Dose / Protocolo
                </th>
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                  Próxima dose
                </th>
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                  Responsável
                </th>
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredVaccines.map((v) => {
                const sm = vaccineStatusMeta[v.status];
                return (
                  <tr
                    key={v.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-3 py-3 font-semibold text-gray-900">{v.nome}</td>
                    <td className="px-3 py-3 text-gray-600">{formatDate(v.dataAplicada)}</td>
                    <td className="px-3 py-3 text-gray-600">
                      <div className="font-medium text-gray-700">{v.dose}</div>
                      <div className="text-[11px] text-gray-400">{v.protocolo}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {v.proximaDose ? formatDate(v.proximaDose) : "—"}
                    </td>
                    <td className="px-3 py-3 text-gray-500">{v.responsavel}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "text-[11px] font-semibold px-2 py-0.5 rounded-md border",
                          sm.classes,
                        )}
                      >
                        {sm.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredVaccines.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-8 text-center text-sm text-gray-500">
              Nenhum imunizante encontrado.
            </div>
          )}
        </div>
      </div>

      {/* Treatment History */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
            <Pill className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Histórico de tratamentos</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Medicamentos aplicados, motivos e resultados
            </p>
          </div>
        </div>
        <div className="relative mb-4 w-[310px] max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar medicamento ou responsável..."
            value={treatmentSearch}
            onChange={(e) => setTreatmentSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all placeholder:text-gray-400"
          />
        </div>
        <div
          className={cn(
            "space-y-3",
            shouldScrollTreatments && "max-h-[420px] overflow-y-auto dashboard-scroll pr-1 -mr-1 py-1",
          )}
        >
          {filteredTreatments.map((t) => {
            const rm = treatmentResultMeta[t.resultado];
            return (
              <div
                key={t.id}
                className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:bg-gray-50/50 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <Pill className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900">{t.medicamento}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">{t.motivo}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-md border flex-shrink-0",
                      rm.classes,
                    )}
                  >
                    {rm.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                      Início
                    </p>
                    <p className="text-xs text-gray-700 font-medium mt-0.5">
                      {formatDate(t.inicio)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                      Fim
                    </p>
                    <p className="text-xs text-gray-700 font-medium mt-0.5">{formatDate(t.fim)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                      Duração
                    </p>
                    <p className="text-xs text-gray-700 font-medium mt-0.5">{t.duracao}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                      Responsável
                    </p>
                    <p className="text-xs text-gray-700 font-medium mt-0.5">{t.responsavel}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredTreatments.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-8 text-center text-sm text-gray-500">
              Nenhum tratamento encontrado.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}


