"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  X,
  CalendarDays,
  ClipboardCheck,
  HeartPulse,
  Loader2,
  Pill,
  ShieldCheck,
  Syringe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { RequiredPlanBadge } from "@/components/plan/plan-badge";
import type { Tables } from "@/lib/database.types";

type RecordType = "vaccination" | "treatment" | "inspection";
type RecordStatus = "completed" | "in_progress" | "scheduled" | "upcoming";
type MortalityRecord = Pick<
  Tables<"mortality">,
  "id" | "date" | "dead_birds" | "cause" | "mortality_rate" | "notes"
>;
type DailyInspectionRecord = Pick<
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

interface HealthRecord {
  id: string;
  title: string;
  date: string;
  type: RecordType;
  status: RecordStatus;
  responsible: string | null;
  notes: string | null;
  target_disease: string | null;
  brand_name: string | null;
  batch: string | null;
  active_ingredient: string | null;
  withdrawal_period_days: number | null;
  disposal_destination: string | null;
}

type AgendaStatus = keyof typeof statusAgendaConfig;

const statusAgendaConfig = {
  Próximo: { bg: "bg-white", text: "text-red-600", border: "border-red-200" },
  Agendado: { bg: "bg-white", text: "text-gray-600", border: "border-gray-200" },
} as const;

const typeLabel: Record<RecordType, string> = {
  vaccination: "Vacinação",
  treatment: "Tratamento",
  inspection: "Inspeção",
};

const typeIcon: Record<RecordType, typeof Syringe> = {
  vaccination: Syringe,
  treatment: Pill,
  inspection: ClipboardCheck,
};

function formatDate(dateStr: string) {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string) {
  try {
    return new Date(`${dateStr}T00:00:00`)
      .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
      .replace(".", "");
  } catch {
    return dateStr;
  }
}

function getDaysSince(dateStr: string) {
  return Math.floor(
    (new Date().getTime() - new Date(`${dateStr}T00:00:00`).getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

type SymptomInsight = {
  causa: string;
  gravidade: "Baixa" | "Média" | "Alta";
  risco: "Baixo" | "Médio" | "Alto";
};

function getVaccineConsequence(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("newcastle"))
    return "risco alto de surto respiratório e mortalidade elevada.";
  if (n.includes("bronquite"))
    return "queda na produção de ovos e lesões respiratórias.";
  if (n.includes("gumboro"))
    return "imunossupressão severa e maior susceptibilidade a outras doenças.";
  if (n.includes("marek")) return "tumores e paralisia em aves jovens.";
  if (n.includes("salmonel")) return "contaminação dos ovos e risco zoonótico.";
  if (n.includes("vermifug") || n.includes("verme"))
    return "parasitose intestinal, perda de peso e queda na postura.";
  if (n.includes("coccid"))
    return "surto de coccidiose com diarreia e mortalidade.";
  return "aumento do risco sanitário e comprometimento do lote.";
}

function getSymptomInsight(symptom: string): SymptomInsight {
  const s = symptom.toLowerCase();
  if (s.includes("pena")) {
    return {
      causa: "Estresse, deficiência nutricional ou ectoparasitas.",
      gravidade: "Baixa",
      risco: "Médio",
    };
  }
  if (s.includes("bicagem") || s.includes("canibal")) {
    return {
      causa: "Superlotação, baixa luminosidade ou desequilíbrio na ração.",
      gravidade: "Média",
      risco: "Alto",
    };
  }
  if (s.includes("coriza") || s.includes("respira")) {
    return {
      causa: "Infecção respiratória bacteriana ou viral.",
      gravidade: "Alta",
      risco: "Alto",
    };
  }
  if (s.includes("diarre") || s.includes("intest")) {
    return {
      causa: "Coccidiose, contaminação alimentar ou estresse térmico.",
      gravidade: "Média",
      risco: "Médio",
    };
  }
  return {
    causa: "Causa indeterminada — requer avaliação veterinária.",
    gravidade: "Média",
    risco: "Médio",
  };
}

const severityColor: Record<SymptomInsight["gravidade"], string> = {
  Baixa: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Média: "text-amber-700 bg-amber-50 border-amber-200",
  Alta: "text-red-700 bg-red-50 border-red-200",
};

const riskColor: Record<SymptomInsight["risco"], string> = {
  Baixo: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Médio: "text-amber-700 bg-amber-50 border-amber-200",
  Alto: "text-red-700 bg-red-50 border-red-200",
};

function extractSymptom(record: HealthRecord) {
  const source = (record.notes?.trim() || record.title.trim()).replace(/\s+/g, " ");
  const parts = source.split(/\s*[—–-]\s*/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : source;
}

function calculateMortalityScore(mortalityRate: number) {
  if (mortalityRate <= 0.02) return 100;
  if (mortalityRate >= 0.1) return 0;
  return Math.round((1 - (mortalityRate - 0.02) / 0.08) * 100);
}

function isDailyInspection(record: HealthRecord | DailyInspectionRecord): record is DailyInspectionRecord {
  return "feces_aspect" in record;
}

function getInspectionNotes(record: HealthRecord | DailyInspectionRecord) {
  return record.notes ?? "";
}

export default function SaudeLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const { farm, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loteCode, setLoteCode] = useState("");
  const [birdCount, setBirdCount] = useState(0);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [dailyInspections, setDailyInspections] = useState<DailyInspectionRecord[]>([]);
  const [mortalityRecords, setMortalityRecords] = useState<MortalityRecord[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!farm) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const currentFarm = farm;
    const supabase = createClient();

    async function fetchData() {
      setLoading(true);

      const [flockRes, recordsRes, dailyInspectionsRes, mortalityRes] = await Promise.all([
        supabase
          .from("flocks")
          .select("code, bird_count")
          .eq("id", loteId)
          .eq("farm_id", currentFarm.id)
          .single(),
        supabase
          .from("health_records")
          .select("id, title, date, type, status, responsible, notes, target_disease, brand_name, batch, active_ingredient, withdrawal_period_days, disposal_destination")
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
      setBirdCount(flockRes.data.bird_count);
      const fetched = (recordsRes.data as HealthRecord[] | null) ?? [];
      setRecords(fetched);
      setDailyInspections((dailyInspectionsRes.data as DailyInspectionRecord[] | null) ?? []);
      setMortalityRecords((mortalityRes.data as MortalityRecord[] | null) ?? []);
      setNotFound(false);
      setLoading(false);
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [authLoading, farm, loteId]);

  const agenda = useMemo(() => {
    return records
      .filter(
        (record) =>
          record.type === "vaccination" &&
          (record.status === "scheduled" || record.status === "upcoming")
      )
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((record) => ({
        id: record.id,
        vacina: record.title,
        dataVencimento: record.date,
        status: (record.status === "upcoming" ? "Próximo" : "Agendado") as AgendaStatus,
      }));
  }, [records]);

  const ultimaInspecao = useMemo(
    () => dailyInspections[0] ?? records.find((record) => record.type === "inspection") ?? null,
    [dailyInspections, records]
  );

  const ultimoRegistroSanitario = useMemo(() => {
    return (
      records.find(
        (record) =>
          record.type === "treatment" &&
          (record.status === "completed" || record.status === "in_progress")
      ) ?? null
    );
  }, [records]);

  const [resolvedSymptoms, setResolvedSymptoms] = useState<string[]>([]);
  const [closingSymptoms, setClosingSymptoms] = useState<string[]>([]);
  const [historyModal, setHistoryModal] = useState<null | "sanitario" | "vacinacao">(null);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    date: string;
    responsible: string;
    notes: string;
    status: RecordStatus;
  }>({ title: "", date: "", responsible: "", notes: "", status: "scheduled" });

  const openEdit = (record: HealthRecord) => {
    if (record.type === "vaccination" && record.status === "completed") return;
    setEditingRecord(record);
    setEditForm({
      title: record.title,
      date: record.date,
      responsible: record.responsible ?? "",
      notes: record.notes ?? "",
      status: record.status,
    });
  };

  const saveEdit = async () => {
    if (!editingRecord) return;
    const today = new Date().toISOString().slice(0, 10);
    if (editForm.date < today) return;
    const supabase = createClient();
    const updates = {
      title: editForm.title,
      date: editForm.date,
      responsible: editForm.responsible || null,
      notes: editForm.notes || null,
      status: editForm.status,
    };
    const { error } = await supabase
      .from("health_records")
      .update(updates)
      .eq("id", editingRecord.id);
    if (error) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === editingRecord.id
          ? {
              ...r,
              ...updates,
            }
          : r
      )
    );
    setEditingRecord(null);
  };

  const handleResolveSymptom = async (symptom: string) => {
    setClosingSymptoms((prev) => [...prev, symptom]);
    const matchingIds = records
      .filter((record) => record.status === "in_progress" && extractSymptom(record) === symptom)
      .map((record) => record.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("health_records")
      .update({ status: "completed" })
      .in("id", matchingIds);

    if (!error) {
      setRecords((prev) =>
        prev.map((record) =>
          matchingIds.includes(record.id) ? { ...record, status: "completed" } : record
        )
      );
      setResolvedSymptoms((prev) => [...prev, symptom]);
    }
    setClosingSymptoms((prev) => prev.filter((s) => s !== symptom));
  };

  const sintomasAtivos = useMemo(() => {
    const values = records
      .filter(
        (record) =>
          record.status === "in_progress" &&
          (record.type === "treatment" || record.type === "inspection")
      )
      .map(extractSymptom)
      .filter(Boolean);

    return Array.from(new Set(values)).filter((s) => !resolvedSymptoms.includes(s));
  }, [records, resolvedSymptoms]);

  const vacinasAtrasadas = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return agenda.filter((item) => item.dataVencimento < today).length;
  }, [agenda]);

  const diasUltimaInspecao = ultimaInspecao ? getDaysSince(ultimaInspecao.date) : null;
  const ultimaInspecaoNotes = ultimaInspecao ? getInspectionNotes(ultimaInspecao) : "";
  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date.toISOString().slice(0, 10);
  }, []);
  const weeklyMortalityRecords = useMemo(
    () => mortalityRecords.filter((record) => record.date >= sevenDaysAgo),
    [mortalityRecords, sevenDaysAgo]
  );
  const weeklyMortalityCount = useMemo(
    () => weeklyMortalityRecords.reduce((sum, record) => sum + record.dead_birds, 0),
    [weeklyMortalityRecords]
  );
  const weeklyMortalityRate = birdCount > 0 ? weeklyMortalityCount / birdCount : 0;

  const healthScore = useMemo(() => {
    if (records.length === 0 && mortalityRecords.length === 0 && dailyInspections.length === 0) return 0;
    const vacPendentes = agenda.length;
    const vacScore = Math.max(0, 100 - vacPendentes * 10 - vacinasAtrasadas * 20);
    const symptomScore = Math.max(0, 100 - sintomasAtivos.length * 25);
    const inspScore =
      diasUltimaInspecao === null
        ? 50
        : Math.max(0, Math.min(100, (1 - (diasUltimaInspecao - 7) / 23) * 100));
    const mortalityScore = calculateMortalityScore(weeklyMortalityRate);
    return Math.round(
      mortalityScore * 0.4 + symptomScore * 0.25 + vacScore * 0.2 + inspScore * 0.15
    );
  }, [
    records.length,
    dailyInspections.length,
    mortalityRecords.length,
    agenda.length,
    vacinasAtrasadas,
    sintomasAtivos.length,
    diasUltimaInspecao,
    weeklyMortalityRate,
  ]);

  const scoreColor =
    healthScore >= 90 ? "#10b981" : healthScore >= 70 ? "#f59e0b" : "#ef4444";

  const recomendacoes = useMemo(() => {
    const list: { text: string; impacto: "alto" | "médio" | "baixo" }[] = [];
    const seen = new Set<string>();
    const add = (text: string, impacto: "alto" | "médio" | "baixo") => {
      if (seen.has(text)) return;
      seen.add(text);
      list.push({ text, impacto });
    };

    sintomasAtivos.forEach((s) => {
      const low = s.toLowerCase();
      if (low.includes("bicagem") || low.includes("canibal")) {
        add("Ajustar densidade nas áreas com bicagem", "alto");
        add("Aplicar enriquecimento ambiental (poleiros e forrageamento)", "alto");
        add("Reduzir intensidade luminosa nos galpões afetados", "médio");
      }
      if (low.includes("pena")) {
        add("Revisar formulação da ração (proteína e aminoácidos)", "médio");
        add("Inspecionar lote em busca de ectoparasitas", "médio");
      }
      if (low.includes("coriza") || low.includes("respira")) {
        add("Isolar aves sintomáticas e iniciar antibioticoterapia", "alto");
        add("Reforçar ventilação e reduzir poeira no galpão", "alto");
      }
      if (low.includes("diarre") || low.includes("intest")) {
        add("Coletar amostras para exame de coccidiose", "alto");
        add("Revisar qualidade da água e armazenamento da ração", "médio");
      }
    });

    if (vacinasAtrasadas > 0) {
      add(
        `Aplicar ${vacinasAtrasadas} vacina${vacinasAtrasadas === 1 ? "" : "s"} em atraso`,
        "alto"
      );
    }
    const proxima = agenda[0];
    if (proxima) {
      add(
        `Preparar ${proxima.vacina} para ${formatDate(proxima.dataVencimento)}`,
        "médio"
      );
    }
    if (diasUltimaInspecao === null) {
      add("Realizar a primeira inspeção sanitária do lote", "alto");
    } else if (diasUltimaInspecao > 14) {
      add(`Agendar nova inspeção — última há ${diasUltimaInspecao} dias`, "médio");
    }
    if (list.length === 0) {
      add("Manter rotina regular de observação sanitária", "baixo");
    }
    const order = { alto: 0, médio: 1, baixo: 2 } as const;
    return list.sort((a, b) => order[a.impacto] - order[b.impacto]).slice(0, 5);
  }, [agenda, diasUltimaInspecao, sintomasAtivos, vacinasAtrasadas]);

  const sanitaryStatus = useMemo(() => {
    if (vacinasAtrasadas > 0 || (sintomasAtivos.length > 0 && diasUltimaInspecao !== null && diasUltimaInspecao > 14)) {
      return {
        label: "Vermelho",
        text: "text-red-700",
        ring: "border-red-200",
        iconBg: "bg-red-50",
        icon: "text-red-600",
        border: "border-red-200/70",
        gradient: "from-red-50 via-red-50/60 to-white",
        helper: "Há sinais que exigem ação imediata no lote.",
      };
    }

    if (sintomasAtivos.length > 0 || agenda.length > 0 || diasUltimaInspecao === null || diasUltimaInspecao > 7) {
      return {
        label: "Amarelo",
        text: "text-amber-700",
        ring: "border-amber-200",
        iconBg: "bg-amber-50",
        icon: "text-amber-600",
        border: "border-amber-200/70",
        gradient: "from-amber-50 via-amber-50/60 to-white",
        helper: "O lote pede observação e rotina sanitária próxima.",
      };
    }

    return {
      label: "Verde",
      text: "text-emerald-700",
      ring: "border-emerald-200",
      iconBg: "bg-emerald-50",
      icon: "text-emerald-600",
      border: "border-emerald-200/70",
      gradient: "from-emerald-50 via-emerald-50/60 to-white",
      helper: "Sem pendências críticas nos registros atuais.",
    };
  }, [agenda.length, diasUltimaInspecao, sintomasAtivos.length, vacinasAtrasadas]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
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
          <p className="text-gray-400">Dados não encontrados.</p>
        </div>
      </div>
    );
  }

  if (records.length === 0 && mortalityRecords.length === 0 && dailyInspections.length === 0) {
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
      <div>
        <Link
          href={`/dashboard/flocks/detalhes/${loteId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Detalhes
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <HeartPulse className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Saúde do Lote {loteCode}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Situação sanitária, inspeções e vacinação do lote
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "bg-gradient-to-r rounded-2xl border p-5",
          sanitaryStatus.gradient,
          sanitaryStatus.border
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 lg:min-w-[300px]">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${(healthScore / 100) * 175.9} 175.9`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-base font-bold", sanitaryStatus.text)}>
                  {healthScore}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-brand-600" />
                <span className="text-sm font-bold text-gray-900">Status sanitário</span>
              </div>
              <p className={cn("text-xl font-bold mt-0.5", sanitaryStatus.text)}>
                {sanitaryStatus.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Sintomas: {sintomasAtivos.length} | Vacinas: {agenda.length} pendentes
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Mortalidade semanal: {weeklyMortalityCount} aves (
                {(weeklyMortalityRate * 100).toFixed(1)}%)
              </p>
              <div className="mt-2">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                  Score baseado em:
                </p>
                <ul className="mt-1 space-y-0.5">
                  <li className="text-xs text-gray-600">• Sintomas ativos</li>
                  <li className="text-xs text-gray-600">• Risco de escalada</li>
                  <li className="text-xs text-gray-600">• Vacinação pendente</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="hidden lg:block w-px self-stretch bg-gray-200/70" />

          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
              Recomendações automáticas
            </p>
            <ul className="space-y-1.5">
              {recomendacoes.map((rec, i) => {
                const impactColor =
                  rec.impacto === "alto"
                    ? "text-red-600"
                    : rec.impacto === "médio"
                    ? "text-amber-600"
                    : "text-emerald-600";
                const dotColor =
                  rec.impacto === "alto"
                    ? "bg-red-500"
                    : rec.impacto === "médio"
                    ? "bg-amber-500"
                    : "bg-emerald-500";
                return (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span
                      className={cn("mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0", dotColor)}
                    />
                    <span>
                      {rec.text}{" "}
                      <span className={cn("font-semibold", impactColor)}>
                        (impacto: {rec.impacto})
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900">Sintomas ativos</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Sinais em observação no lote
              </p>
            </div>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              {sintomasAtivos.length}
            </span>
            <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
          </div>

          {sintomasAtivos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-5 py-6">
              <p className="text-sm text-gray-500">Nenhum sintoma anormal</p>
            </div>
          ) : (
            <div
              className="space-y-3 max-h-[160px] overflow-y-auto overflow-x-hidden pr-1"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}
            >
              {sintomasAtivos.map((symptom) => {
                const insight = getSymptomInsight(symptom);
                return (
                  <div
                    key={symptom}
                    className={cn(
                      "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-300 ease-out overflow-hidden",
                      closingSymptoms.includes(symptom)
                        ? "opacity-0 -translate-x-4 max-h-0 py-0 my-0 border-transparent"
                        : "opacity-100 translate-x-0 max-h-[400px]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{symptom}</p>
                      <button
                        type="button"
                        onClick={() => handleResolveSymptom(symptom)}
                        aria-label="Resolver sintoma"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                          Possível causa
                        </p>
                        <p className="text-sm text-slate-700 mt-0.5">{insight.causa}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                            Gravidade:
                          </span>
                          <span
                            className={cn(
                              "text-[11px] font-semibold border px-2 py-0.5 rounded-md",
                              severityColor[insight.gravidade]
                            )}
                          >
                            {insight.gravidade}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                            Risco de escalada:
                          </span>
                          <span
                            className={cn(
                              "text-[11px] font-semibold border px-2 py-0.5 rounded-md",
                              riskColor[insight.risco]
                            )}
                          >
                            {insight.risco}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Syringe className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Vacinas pendentes</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Aguardando aplicação no lote
              </p>
            </div>
          </div>

          <p className="text-3xl font-bold tracking-tight text-gray-900">
            {agenda.length}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {agenda.filter((i) => i.status === "Próximo").length} próxima
            {agenda.filter((i) => i.status === "Próximo").length === 1 ? "" : "s"} ·{" "}
            {agenda.filter((i) => i.status === "Agendado").length} agendada
            {agenda.filter((i) => i.status === "Agendado").length === 1 ? "" : "s"}
          </p>
          {agenda[0] && (
            <p className="text-sm text-gray-600 mt-4">
              Próxima: <span className="font-semibold">{agenda[0].vacina}</span> em{" "}
              {formatDate(agenda[0].dataVencimento)}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Data da última inspeção</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Controle sanitário mais recente
              </p>
            </div>
          </div>

          {ultimaInspecao ? (
            <>
              <p className="text-2xl font-bold tracking-tight text-gray-900">
                {formatDate(ultimaInspecao.date)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {diasUltimaInspecao === 0
                  ? "Inspeção realizada hoje"
                  : `Há ${diasUltimaInspecao} dia${diasUltimaInspecao === 1 ? "" : "s"}`}
              </p>
              {isDailyInspection(ultimaInspecao) ? (
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <span>Fezes: {ultimaInspecao.feces_aspect}</span>
                  <span>Respiração: {ultimaInspecao.respiratory_symptoms}</span>
                  <span>Comportamento: {ultimaInspecao.behavior}</span>
                  <span>Luz: {ultimaInspecao.light_timer_ops ? "OK" : "Atenção"}</span>
                </div>
              ) : ultimaInspecaoNotes ? (
                <p className="text-sm text-gray-600 mt-4">{ultimaInspecaoNotes}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-gray-500">Sem inspeção registrada.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-900">Último registro sanitário</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Medicação, observação ou procedimento mais recente
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHistoryModal("sanitario")}
            className="text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Ver todos
          </button>
        </div>

        {ultimoRegistroSanitario ? (
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const Icon = typeIcon[ultimoRegistroSanitario.type];
                    return <Icon className="w-4 h-4 text-brand-600 flex-shrink-0" />;
                  })()}
                  <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg">
                    {typeLabel[ultimoRegistroSanitario.type]}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {ultimoRegistroSanitario.title}
                </p>
                {ultimoRegistroSanitario.notes && (
                  <p className="text-sm text-gray-600 mt-2">
                    {ultimoRegistroSanitario.notes}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatDate(ultimoRegistroSanitario.date)}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                {ultimoRegistroSanitario.status === "in_progress"
                  ? "Em andamento"
                  : "Concluído"}
              </span>
              {ultimoRegistroSanitario.responsible && (
                <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                  Responsável: {ultimoRegistroSanitario.responsible}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhum registro sanitário encontrado.</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-gray-900">Agenda de Vacinação</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              {agenda.filter((item) => item.status === "Próximo").length} próximas
            </span>
            <button
              type="button"
              onClick={() => setHistoryModal("vacinacao")}
              className="text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Ver todos
            </button>
          </div>
        </div>

        <div
          className="space-y-0 max-h-[192px] overflow-y-auto overflow-x-hidden"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}
        >
          {agenda.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              Nenhuma vacinação agendada.
            </div>
          )}

          {agenda.map((item, index) => {
            const sColor = statusAgendaConfig[item.status];
            const isUrgent = item.status === "Próximo";

            return (
              <div key={item.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const rec = records.find((r) => r.id === item.id);
                    if (rec) openEdit(rec);
                  }}
                  className="flex items-center justify-between py-3 group cursor-pointer hover:bg-gray-50/70 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        isUrgent ? "bg-red-50" : "bg-gray-50"
                      )}
                    >
                      <Syringe
                        className={cn(
                          "w-4 h-4",
                          isUrgent ? "text-red-500" : "text-gray-400"
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {item.vacina}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        <span className="font-semibold text-amber-600">
                          Sem aplicação:
                        </span>{" "}
                        {getVaccineConsequence(item.vacina)}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        Lote: {loteCode} · {formatDateShort(item.dataVencimento)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2.5 py-1 rounded-lg border flex-shrink-0",
                      sColor.bg,
                      sColor.text,
                      sColor.border
                    )}
                  >
                    {item.status}
                  </span>
                </div>
                {index < agenda.length - 1 && <div className="border-t border-gray-50" />}
              </div>
            );
          })}
        </div>
      </div>
      </div>

      {historyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200"
          onClick={() => setHistoryModal(null)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {historyModal === "sanitario"
                    ? "Histórico sanitário"
                    : "Histórico de vacinação"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {historyModal === "sanitario"
                    ? "Todos os registros sanitários do lote"
                    : "Todas as vacinações do lote"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              {(historyModal === "sanitario"
                ? records.filter((r) => r.type === "treatment")
                : records.filter((r) => r.type === "vaccination")
              ).map((record) => {
                const Icon = typeIcon[record.type];
                return (
                  <div
                    key={record.id}
                    onClick={() => {
                      setHistoryModal(null);
                      openEdit(record);
                    }}
                    className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4 text-brand-600 flex-shrink-0" />
                          <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg">
                            {typeLabel[record.type]}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{record.title}</p>
                        {record.notes && (
                          <p className="text-sm text-gray-600 mt-2">{record.notes}</p>
                        )}
                        {(record.brand_name || record.active_ingredient) && (
                          <p className="text-xs text-gray-500 mt-2">
                            {record.brand_name ?? record.active_ingredient}
                            {record.withdrawal_period_days
                              ? ` · carência ${record.withdrawal_period_days} dias`
                              : ""}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(record.date)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                        {record.status === "in_progress"
                          ? "Em andamento"
                          : record.status === "completed"
                          ? "Concluído"
                          : record.status === "upcoming"
                          ? "Próximo"
                          : "Agendado"}
                      </span>
                      {record.responsible && (
                        <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                          Responsável: {record.responsible}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {(historyModal === "sanitario"
                ? records.filter((r) => r.type === "treatment")
                : records.filter((r) => r.type === "vaccination")
              ).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  Nenhum registro encontrado.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {editingRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200"
          onClick={() => setEditingRecord(null)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-md max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Editar registro</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {typeLabel[editingRecord.type]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  Título
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  Data
                </label>
                {(() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const isPast = editForm.date < today;
                  return (
                    <>
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, date: e.target.value }))
                        }
                        className={cn(
                          "w-full text-sm rounded-xl border px-3 py-2 focus:outline-none",
                          isPast
                            ? "border-red-300 focus:border-red-500"
                            : "border-gray-200 focus:border-brand-500"
                        )}
                      />
                      {isPast && (
                        <p className="text-xs text-red-600 mt-1.5">
                          A data não pode ser anterior à data de hoje.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      status: e.target.value as RecordStatus,
                    }))
                  }
                  className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:border-brand-500"
                >
                  <option value="scheduled">Agendado</option>
                  <option value="upcoming">Próximo</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="completed">Concluído</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  Responsável
                </label>
                <input
                  type="text"
                  value={editForm.responsible}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, responsible: e.target.value }))
                  }
                  className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  Observações
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-sm font-semibold text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={editForm.date < new Date().toISOString().slice(0, 10)}
                className="text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-600"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
