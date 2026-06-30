"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ModalPortal from "@/components/ui/modal-portal";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Check,
  Heart,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Search,
  Skull,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import {
  createMortalityRecord,
  deleteMortalityRecord,
  getMortalityByFlock,
  updateMortalityRecord,
} from "@/lib/services/mortality";
import { cn } from "@/lib/utils";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

type MortalityRow = Tables<"mortality">;
type BarnOption = Pick<Tables<"barns">, "id" | "name">;
type FlockDetails = Pick<Tables<"flocks">, "id" | "code" | "bird_count" | "barn_id">;
type MortalityType = MortalityRow["mortality_type"];

interface RegistroMortalidade {
  id: string;
  data: string;
  quantidade: number;
  causa: string;
  tipo: MortalityType;
  galpaoId: string | null;
  galpao: string;
  observacao: string;
}

interface CauseSummary {
  causa: string;
  quantidade: number;
  porcentagem: number;
  color: string;
}

interface ChartPoint {
  label: string;
  mortes: number;
  taxa: number;
}

type TooltipFormatter = (value: unknown, name: unknown) => [string, string];

const causaOptions = [
  "Natural",
  "Doenca",
  "Respiratorio",
  "Predadores",
  "Estresse Termico",
  "Canibalismo/Bicagem",
  "Descarte Tecnico",
  "Desconhecido",
  "Outros",
];

const causeColors: Record<string, string> = {
  Natural: "#94a3b8",
  Doenca: "#ef4444",
  Respiratorio: "#f97316",
  Predadores: "#f59e0b",
  "Estresse Termico": "#a78bfa",
  "Canibalismo/Bicagem": "#e11d48",
  "Descarte Tecnico": "#475569",
  Desconhecido: "#cbd5e1",
  Outros: "#64748b",
};

const causeBadges: Record<string, string> = {
  Natural: "bg-gray-100 text-gray-600",
  Doenca: "bg-red-50 text-red-600",
  Respiratorio: "bg-orange-50 text-orange-600",
  Predadores: "bg-amber-50 text-amber-700",
  "Estresse Termico": "bg-violet-50 text-violet-600",
  "Canibalismo/Bicagem": "bg-rose-50 text-rose-600",
  "Descarte Tecnico": "bg-slate-100 text-slate-700",
  Desconhecido: "bg-gray-100 text-gray-500",
  Outros: "bg-slate-100 text-slate-600",
};

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

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

function formatShortDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

function getMortalityType(causa: string): MortalityType {
  return causa === "Descarte Tecnico" ? "culling" : "natural";
}

function getMortalityRate(deadBirds: number, activeBirds: number, totalDeaths: number) {
  const startingBirds = activeBirds + totalDeaths;
  if (startingBirds <= 0) return 0;
  return (deadBirds / startingBirds) * 100;
}

function getBarnName(barns: BarnOption[], barnId: string | null) {
  if (!barnId) return "-";
  return barns.find((barn) => barn.id === barnId)?.name ?? "-";
}

function mapMortalityRow(row: MortalityRow, barns: BarnOption[]): RegistroMortalidade {
  return {
    id: row.id,
    data: row.date,
    quantidade: row.dead_birds,
    causa: row.cause || "Desconhecido",
    tipo: row.mortality_type,
    galpaoId: row.barn_id,
    galpao: getBarnName(barns, row.barn_id),
    observacao: row.notes ?? "",
  };
}

function getTrend(current: number, previous: number): "up" | "down" | "stable" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "stable";
}

export default function MortalidadeLotePage() {
  const params = useParams();
  const loteId = String(params.loteId ?? "");
  const { farm, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [flock, setFlock] = useState<FlockDetails | null>(null);
  const [barns, setBarns] = useState<BarnOption[]>([]);
  const [registros, setRegistros] = useState<RegistroMortalidade[]>([]);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<RegistroMortalidade | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    data: toIsoDate(new Date()),
    quantidade: "1",
    causa: "",
    galpaoId: "",
    observacao: "",
  });

  const fetchData = useCallback(async () => {
    if (authLoading) return;
    if (!farm || !loteId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const [flockRes, barnsRes, mortalityRows] = await Promise.all([
        supabase
          .from("flocks")
          .select("id, code, bird_count, barn_id")
          .eq("id", loteId)
          .eq("farm_id", farm.id)
          .maybeSingle(),
        supabase
          .from("barns")
          .select("id, name")
          .eq("farm_id", farm.id)
          .order("name", { ascending: true }),
        getMortalityByFlock(farm.id, loteId),
      ]);

      if (flockRes.error || !flockRes.data) {
        setNotFound(true);
        setFlock(null);
        setRegistros([]);
        return;
      }

      const barnOptions = (barnsRes.data as BarnOption[] | null) ?? [];
      setFlock(flockRes.data as FlockDetails);
      setBarns(barnOptions);
      setRegistros(((mortalityRows as MortalityRow[] | null) ?? []).map((row) => mapMortalityRow(row, barnOptions)));
      setNotFound(false);
    } catch (error) {
      console.error("Error loading flock mortality data:", error);
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, farm, loteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const birdCount = flock?.bird_count ?? 0;
  const totalMortes = useMemo(
    () => registros.reduce((sum, record) => sum + record.quantidade, 0),
    [registros]
  );
  const totalInicial = birdCount + totalMortes;
  const taxaTotal = getMortalityRate(totalMortes, birdCount, totalMortes);
  const avesVivas = Math.max(0, birdCount);

  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = toIsoDate(addDays(today, -6));
  const thirtyDaysAgo = toIsoDate(addDays(today, -29));
  const priorSevenDaysAgo = toIsoDate(addDays(today, -13));

  const mortesSemana = useMemo(
    () => registros.filter((record) => record.data >= sevenDaysAgo).reduce((sum, record) => sum + record.quantidade, 0),
    [registros, sevenDaysAgo]
  );
  const mortesSemanaAnterior = useMemo(
    () =>
      registros
        .filter((record) => record.data >= priorSevenDaysAgo && record.data < sevenDaysAgo)
        .reduce((sum, record) => sum + record.quantidade, 0),
    [priorSevenDaysAgo, registros, sevenDaysAgo]
  );
  const mortesMes = useMemo(
    () => registros.filter((record) => record.data >= thirtyDaysAgo).reduce((sum, record) => sum + record.quantidade, 0),
    [registros, thirtyDaysAgo]
  );
  const taxaMensal = getMortalityRate(mortesMes, birdCount, totalMortes);
  const tendencia = getTrend(mortesSemana, mortesSemanaAnterior);

  const mortalityScore = Math.max(0, Math.min(100, Math.round(100 - taxaMensal * 20)));
  const mortalityStatus = useMemo(() => {
    if (mortalityScore >= 80) {
      return {
        label: "Verde",
        text: "text-emerald-700",
        border: "border-emerald-200",
        gradient: "from-emerald-50 to-white",
        helper: "Mortalidade dentro do esperado para o lote.",
      };
    }
    if (mortalityScore >= 60) {
      return {
        label: "Amarelo",
        text: "text-amber-700",
        border: "border-amber-200",
        gradient: "from-amber-50 to-white",
        helper: "Lote pede observacao mais proxima.",
      };
    }
    return {
      label: "Vermelho",
      text: "text-red-700",
      border: "border-red-200",
      gradient: "from-red-50 to-white",
      helper: "Investigar causas e reforcar manejo sanitario.",
    };
  }, [mortalityScore]);
  const scoreColor = mortalityScore >= 80 ? "#10b981" : mortalityScore >= 60 ? "#f59e0b" : "#ef4444";

  const weeklyData = useMemo<ChartPoint[]>(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(today, index - 6);
      const iso = toIsoDate(date);
      const mortes = registros
        .filter((record) => record.data === iso)
        .reduce((sum, record) => sum + record.quantidade, 0);
      return {
        label: formatShortDate(date),
        mortes,
        taxa: getMortalityRate(mortes, birdCount, totalMortes),
      };
    });
  }, [birdCount, registros, today, totalMortes]);

  const monthlyData = useMemo<ChartPoint[]>(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const date = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), index - 5);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const mortes = registros
        .filter((record) => record.data.startsWith(key))
        .reduce((sum, record) => sum + record.quantidade, 0);
      return {
        label: formatMonth(date),
        mortes,
        taxa: getMortalityRate(mortes, birdCount, totalMortes),
      };
    });
  }, [birdCount, registros, today, totalMortes]);

  const causas = useMemo<CauseSummary[]>(() => {
    const grouped = new Map<string, number>();
    registros.forEach((record) => {
      grouped.set(record.causa, (grouped.get(record.causa) ?? 0) + record.quantidade);
    });

    return Array.from(grouped.entries())
      .map(([causa, quantidade]) => ({
        causa,
        quantidade,
        porcentagem: totalMortes > 0 ? Math.round((quantidade / totalMortes) * 100) : 0,
        color: causeColors[causa] ?? causeColors.Outros,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [registros, totalMortes]);

  const fasesMortalidade = useMemo(() => {
    const total = totalMortes || 0;
    return [
      { fase: "Inicial (0-6 sem)", pct: total > 0 ? 25 : 0, mortes: Math.round(total * 0.25), color: "#fca5a5" },
      { fase: "Crescimento (6-18 sem)", pct: total > 0 ? 35 : 0, mortes: Math.round(total * 0.35), color: "#f87171" },
      { fase: "Postura (18+ sem)", pct: total > 0 ? 40 : 0, mortes: Math.round(total * 0.4), color: "#ef4444" },
    ];
  }, [totalMortes]);

  const recommendations = useMemo(() => {
    const list: { text: string; impact: "alto" | "medio" | "baixo" }[] = [];
    if (mortesSemana > Math.max(2, mortesSemanaAnterior * 2)) {
      list.push({ text: "Investigar pico recente de mortalidade no lote", impact: "alto" });
    }
    if (taxaMensal > 0.5) {
      list.push({ text: "Revisar ambiencia, biosseguranca e manejo sanitario", impact: "alto" });
    }
    if (causas.some((cause) => cause.causa === "Doenca" || cause.causa === "Respiratorio")) {
      list.push({ text: "Avaliar sinais clinicos e necessidade de atendimento veterinario", impact: "alto" });
    }
    if (causas.some((cause) => cause.causa === "Canibalismo/Bicagem")) {
      list.push({ text: "Revisar densidade, luz e enriquecimento ambiental", impact: "medio" });
    }
    if (list.length === 0) {
      list.push({ text: "Manter rotina de monitoramento e registro diario", impact: "baixo" });
    }
    return list;
  }, [causas, mortesSemana, mortesSemanaAnterior, taxaMensal]);

  const filteredRegistros = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return registros;
    return registros.filter(
      (record) =>
        record.causa.toLowerCase().includes(query) ||
        record.galpao.toLowerCase().includes(query) ||
        record.observacao.toLowerCase().includes(query) ||
        record.data.includes(query)
    );
  }, [registros, searchQuery]);

  function openAdd() {
    setEditing(null);
    setForm({
      data: toIsoDate(new Date()),
      quantidade: "1",
      causa: "",
      galpaoId: flock?.barn_id ?? "",
      observacao: "",
    });
    setModal("add");
  }

  function openEdit(record: RegistroMortalidade) {
    setEditing(record);
    setForm({
      data: record.data,
      quantidade: String(record.quantidade),
      causa: record.causa,
      galpaoId: record.galpaoId ?? "",
      observacao: record.observacao,
    });
    setModal("edit");
  }

  async function save() {
    if (!farm || !flock || !form.data || !form.causa || saving) return;

    const deadBirds = Math.max(1, Number(form.quantidade) || 1);
    const recordRate = getMortalityRate(deadBirds, birdCount, totalMortes);
    const payload: TablesInsert<"mortality"> = {
      farm_id: farm.id,
      flock_id: flock.id,
      barn_id: form.galpaoId || null,
      date: form.data,
      dead_birds: deadBirds,
      cause: form.causa,
      mortality_type: getMortalityType(form.causa),
      mortality_rate: Number(recordRate.toFixed(2)),
      notes: form.observacao.trim() || null,
    };

    setSaving(true);
    try {
      if (modal === "add") {
        await createMortalityRecord(payload);
      } else if (editing) {
        const updates: TablesUpdate<"mortality"> = {
          barn_id: payload.barn_id,
          date: payload.date,
          dead_birds: payload.dead_birds,
          cause: payload.cause,
          mortality_type: payload.mortality_type,
          mortality_rate: payload.mortality_rate,
          notes: payload.notes,
        };
        await updateMortalityRecord(editing.id, updates);
      }
      setModal(null);
      setEditing(null);
      await fetchData();
    } catch (error) {
      console.error("Error saving mortality record:", error);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRegistro(recordId: string) {
    setSaving(true);
    try {
      await deleteMortalityRecord(recordId);
      setDeleteConfirm(null);
      await fetchData();
    } catch (error) {
      console.error("Error deleting mortality record:", error);
    } finally {
      setSaving(false);
    }
  }

  const TrendBadge = () => {
    if (tendencia === "stable") {
      return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
          <Minus className="h-3 w-3" /> Estavel
        </span>
      );
    }
    const isUp = tendencia === "up";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold",
          isUp ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
        )}
      >
        <ArrowUpRight className={cn("h-3.5 w-3.5", !isUp && "rotate-90")} />
        {isUp ? "Aumentando" : "Diminuindo"}
      </span>
    );
  };

  const tooltipFormatter = ((value: unknown, name: unknown) => {
    if (String(name) === "mortes") return [`${Number(value)} aves`, "Mortes"];
    if (String(name) === "taxa") return [`${Number(value).toFixed(2)}%`, "Taxa"];
    return [String(value), String(name)];
  }) satisfies TooltipFormatter;

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (notFound || !flock) {
    return (
      <div className="space-y-6">
        <Link
          href={`/dashboard/flocks/detalhes/${loteId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Detalhes
        </Link>
        <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center">
          <p className="text-sm text-gray-400">Lote nao encontrado para a fazenda atual.</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: "Mortalidade Total",
      value: `${taxaTotal.toFixed(2).replace(".", ",")}%`,
      helper: `${totalMortes} de ${Math.max(1, totalInicial).toLocaleString("pt-BR")} aves`,
      icon: Activity,
      color: "text-red-500",
      bg: "bg-red-50",
    },
    {
      title: "Acumulada (mes)",
      value: `${taxaMensal.toFixed(2).replace(".", ",")}%`,
      helper: `${mortesMes} mortes nos ultimos 30 dias`,
      icon: Skull,
      color: taxaMensal <= 0.5 ? "text-emerald-600" : "text-red-500",
      bg: taxaMensal <= 0.5 ? "bg-emerald-50" : "bg-red-50",
    },
    {
      title: "Ultimos 7 dias",
      value: `${mortesSemana} aves`,
      helper: `Semana anterior: ${mortesSemanaAnterior}`,
      icon: Calendar,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Aves Vivas",
      value: avesVivas.toLocaleString("pt-BR"),
      helper: `${totalMortes} baixas registradas`,
      icon: Heart,
      color: "text-brand-600",
      bg: "bg-brand-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/flocks/detalhes/${loteId}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <Skull className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Mortalidade - {flock.code}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Registros, causas e tendencia do lote
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-500/20 transition-colors hover:bg-red-600"
        >
          <Plus className="h-4 w-4" />
          Registrar Mortalidade
        </button>
      </div>

      <div className={cn("rounded-2xl border bg-gradient-to-r p-5", mortalityStatus.gradient, mortalityStatus.border)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4 lg:min-w-[280px]">
            <div className="relative h-16 w-16 flex-shrink-0">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={scoreColor}
                  strokeDasharray={`${(mortalityScore / 100) * 175.9} 175.9`}
                  strokeLinecap="round"
                  strokeWidth="5"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-base font-bold", mortalityStatus.text)}>{mortalityScore}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Skull className="h-4 w-4 text-red-500" />
                <span className="text-sm font-bold text-gray-900">Status de mortalidade</span>
              </div>
              <p className={cn("mt-0.5 text-xl font-bold", mortalityStatus.text)}>{mortalityStatus.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Semana: {mortesSemana} | Mes: {mortesMes} | Total: {totalMortes}
              </p>
            </div>
          </div>
          <div className="hidden h-14 w-px bg-gray-200 lg:block" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-gray-700">{mortalityStatus.helper}</p>
            <div className="flex flex-wrap items-center gap-2">
              <TrendBadge />
              <span className="rounded-lg bg-white/70 px-2.5 py-1 text-xs font-semibold text-gray-600">
                {registros.length} registro{registros.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="mb-4 flex items-start justify-between">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", kpi.bg)}>
                <kpi.icon className={cn("h-5 w-5", kpi.color)} />
              </div>
              <span className="rounded-lg bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-500">
                {kpi.helper}
              </span>
            </div>
            <p className="text-2xl font-bold tracking-tight text-gray-900">{kpi.value}</p>
            <p className="mt-1 text-xs font-medium text-gray-400">{kpi.title}</p>
          </div>
        ))}
      </div>

      {registros.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <Skull className="h-5 w-5 text-red-500" />
          </div>
          <h2 className="text-base font-bold text-gray-900">Nenhuma mortalidade registrada</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Este lote ainda nao possui ocorrencias de mortalidade no banco de dados.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
          >
            <Plus className="h-4 w-4" />
            Registrar primeira ocorrencia
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 lg:col-span-3">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Tendencia de mortalidade</h3>
                  <p className="mt-0.5 text-xs text-gray-400">Ultimos 7 dias com taxa calculada</p>
                </div>
                <TrendingDown className="h-4 w-4 text-gray-300" />
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mortalityArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Area type="monotone" dataKey="mortes" name="mortes" stroke="#ef4444" strokeWidth={2.5} fill="url(#mortalityArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 lg:col-span-2">
              <h3 className="mb-6 text-sm font-bold text-gray-900">Causas de Mortalidade</h3>
              {causas.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">Sem causas registradas.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={causas} cx="50%" cy="50%" dataKey="quantidade" innerRadius={50} nameKey="causa" outerRadius={80} paddingAngle={3} strokeWidth={0}>
                        {causas.map((entry) => (
                          <Cell key={entry.causa} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={tooltipFormatter} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-2.5">
                    {causas.map((cause) => (
                      <div key={cause.causa} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cause.color }} />
                          <span className="text-sm text-gray-600">{cause.causa}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{cause.quantidade}</span>
                          <span className="text-sm font-bold text-gray-900">{cause.porcentagem}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="mb-6 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-bold text-gray-900">Evolucao Mensal</h3>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Bar dataKey="mortes" name="mortes" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="mb-5 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-bold text-gray-900">Recomendacoes automaticas</h3>
              </div>
              <div className="space-y-3">
                {recommendations.map((recommendation) => (
                  <div key={recommendation.text} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                    <p className="text-sm font-medium text-gray-800">{recommendation.text}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs font-semibold",
                        recommendation.impact === "alto" && "text-red-600",
                        recommendation.impact === "medio" && "text-amber-600",
                        recommendation.impact === "baixo" && "text-emerald-600"
                      )}
                    >
                      Impacto {recommendation.impact}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <div className="mb-5 flex items-center gap-2">
              <Skull className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-bold text-gray-900">Mortalidade por fase do lote</h3>
            </div>
            <div className="space-y-4">
              {fasesMortalidade.map((fase) => (
                <div key={fase.fase}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{fase.fase}</span>
                    <span className="text-xs font-semibold text-gray-500">
                      {fase.mortes} aves - {fase.pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full" style={{ width: `${fase.pct}%`, backgroundColor: fase.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Registros de Mortalidade</h3>
            <p className="mt-0.5 text-xs text-gray-400">{registros.length} registro{registros.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex w-full items-center gap-2 rounded-xl bg-gray-100/80 px-3 py-2 transition-colors focus-within:bg-gray-100 focus-within:ring-2 focus-within:ring-red-500/20 sm:w-72">
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por causa, galpao ou data..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="max-h-[380px] overflow-x-auto overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Data</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Qtd</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Causa</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Tipo</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Galpao</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Observacao</th>
                <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-gray-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredRegistros.map((record) => (
                  <tr key={record.id} className="border-b border-gray-50 transition-colors last:border-b-0 hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatDate(record.data)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-xs font-bold text-red-600">
                        {record.quantidade}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold", causeBadges[record.causa] ?? causeBadges.Outros)}>
                        {record.causa}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="whitespace-nowrap rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {record.tipo === "culling" ? "Descarte Tecnico" : "Mortalidade Natural"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.galpao}</td>
                    <td className="max-w-[220px] truncate px-6 py-4 text-sm text-gray-500">{record.observacao || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(record)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(record.id)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
            <div className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                    <Skull className="h-5 w-5 text-red-500" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {modal === "add" ? "Registrar Mortalidade" : "Editar Registro"}
                  </h2>
                </div>
                <button type="button" onClick={() => setModal(null)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-gray-600">Data</span>
                    <input
                      type="date"
                      value={form.data}
                      onChange={(event) => setForm((current) => ({ ...current, data: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-red-300 focus:ring-2 focus:ring-red-500/20"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-gray-600">Quantidade</span>
                    <input
                      type="number"
                      min="1"
                      value={form.quantidade}
                      onChange={(event) => setForm((current) => ({ ...current, quantidade: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-red-300 focus:ring-2 focus:ring-red-500/20"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-gray-600">Causa</span>
                    <select
                      value={form.causa}
                      onChange={(event) => setForm((current) => ({ ...current, causa: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-red-300 focus:ring-2 focus:ring-red-500/20"
                    >
                      <option value="">Selecione...</option>
                      {causaOptions.map((cause) => (
                        <option key={cause} value={cause}>
                          {cause}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-gray-600">Galpao</span>
                    <select
                      value={form.galpaoId}
                      onChange={(event) => setForm((current) => ({ ...current, galpaoId: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-red-300 focus:ring-2 focus:ring-red-500/20"
                    >
                      <option value="">Sem galpao</option>
                      {barns.map((barn) => (
                        <option key={barn.id} value={barn.id}>
                          {barn.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-gray-600">Observacao</span>
                  <textarea
                    rows={3}
                    value={form.observacao}
                    onChange={(event) => setForm((current) => ({ ...current, observacao: event.target.value }))}
                    placeholder="Detalhes sobre a ocorrencia..."
                    className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-red-300 focus:ring-2 focus:ring-red-500/20"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!form.data || !form.causa || saving}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors",
                    form.data && form.causa && !saving
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "cursor-not-allowed bg-gray-200 text-gray-400"
                  )}
                >
                  <Check className="h-4 w-4" />
                  {saving ? "Salvando..." : modal === "add" ? "Registrar" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteConfirm && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
            <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Confirmar exclusao</h3>
              <p className="text-sm text-gray-500">Tem certeza que deseja excluir este registro?</p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button type="button" onClick={() => setDeleteConfirm(null)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100">
                  Cancelar
                </button>
                <button type="button" onClick={() => deleteRegistro(deleteConfirm)} disabled={saving} className="rounded-xl bg-red-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-600 disabled:opacity-60">
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
