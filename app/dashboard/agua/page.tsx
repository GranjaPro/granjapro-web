"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { insightHref } from "@/lib/insight-links";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Droplets,
  Info,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Scale,
  Thermometer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ModalPortal from "@/components/ui/modal-portal";
import { CalendarFilter, useDateFilter } from "@/components/date-filter";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";
import { getBarns } from "@/lib/services/barns";
import { getFlocks } from "@/lib/services/flocks";
import { getFeedByDateRange } from "@/lib/services/feed";
import {
  createWaterRecord,
  deleteWaterRecord,
  getWaterByDateRange,
  updateWaterRecord,
  type WaterConsumptionRow,
  type WaterConsumptionUpdate,
} from "@/lib/services/water";
import type { Tables } from "@/lib/database.types";

type Barn = Pick<Tables<"barns">, "id" | "name" | "current_birds">;
type Flock = Pick<Tables<"flocks">, "id" | "code" | "bird_count" | "barn_id">;

interface WaterForm {
  date: string;
  barnId: string;
  flockId: string;
  quantityLiters: string;
}

interface ChartPoint {
  date: string;
  liters: number;
  breakdown: { label: string; liters: number }[];
}

// Referências do guia de manejo Novogen Brown (Seção 8 - Qualidade da Água, ITAVI 2012).
// Consumo em produção varia de ~205 ml/ave/dia (clima ameno) a ~320 ml/ave/dia (calor).
const PER_BIRD_IDEAL_MIN = 200; // ml/ave/dia
const PER_BIRD_IDEAL_MAX = 320; // ml/ave/dia
const PER_BIRD_LOW_LIMIT = 180; // abaixo disso: alerta de consumo baixo
const PER_BIRD_HIGH_LIMIT = 360; // acima disso: alerta de consumo alto
// Relação água:ração de referência (guia: aves bebem ~1,8x mais do que comem).
const RATIO_IDEAL_MIN = 1.6;
const RATIO_IDEAL_MAX = 2.5;

const COMPARE_BADGE: Record<"emerald" | "amber" | "red" | "gray", string> = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  red: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  gray: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400",
};

// Estima a relação água:ração a partir do consumo por ave (ml/ave/dia), seguindo a
// tendência do guia: quanto mais a ave bebe (calor), maior a relação água:ração.
const RATIO_ANCHORS = [
  { ml: 200, ratio: 1.6 },
  { ml: 240, ratio: 1.8 },
  { ml: 280, ratio: 2.3 },
  { ml: 320, ratio: 3.1 },
];
function estimateWaterFeedRatio(mlPerBird: number): number {
  if (mlPerBird <= RATIO_ANCHORS[0].ml) return RATIO_ANCHORS[0].ratio;
  for (let i = 1; i < RATIO_ANCHORS.length; i += 1) {
    const prev = RATIO_ANCHORS[i - 1];
    const curr = RATIO_ANCHORS[i];
    if (mlPerBird <= curr.ml) {
      const t = (mlPerBird - prev.ml) / (curr.ml - prev.ml);
      return prev.ratio + t * (curr.ratio - prev.ratio);
    }
  }
  return RATIO_ANCHORS[RATIO_ANCHORS.length - 1].ratio;
}

// Tabela do guia: consumo de água conforme a temperatura do galpão.
const TEMPERATURE_REFERENCE = [
  { temp: "15 °C", ratio: "1,7", perBird: "210 ml" },
  { temp: "20 °C", ratio: "1,8", perBird: "205 ml" },
  { temp: "25 °C", ratio: "2,1", perBird: "230 ml" },
  { temp: "30 °C", ratio: "3,1", perBird: "320 ml" },
];

const emptyForm: WaterForm = {
  date: new Date().toISOString().split("T")[0],
  barnId: "",
  flockId: "",
  quantityLiters: "",
};

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro ao carregar dados";
}

export default function AguaPage() {
  const { farm } = useAuth();
  const { dateRange } = useDateFilter();
  const [records, setRecords] = useState<WaterConsumptionRow[]>([]);
  const [barns, setBarns] = useState<Barn[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [feedKg, setFeedKg] = useState(0);
  const [form, setForm] = useState<WaterForm>(emptyForm);
  const [editingRecord, setEditingRecord] = useState<WaterConsumptionRow | null>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!farm?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [waterData, barnsData, flocksData, feedData] = await Promise.all([
        getWaterByDateRange(farm.id, dateRange.startDate, dateRange.endDate),
        getBarns(farm.id),
        getFlocks(farm.id),
        getFeedByDateRange(farm.id, dateRange.startDate, dateRange.endDate),
      ]);

      setRecords(waterData);
      setBarns(barnsData.map((barn) => ({
        id: barn.id,
        name: barn.name,
        current_birds: barn.current_birds,
      })));
      setFlocks(flocksData.map((flock) => ({
        id: flock.id,
        code: flock.code,
        bird_count: flock.bird_count,
        barn_id: flock.barn_id,
      })));
      setFeedKg(feedData.reduce((sum, item) => sum + Number(item.quantity_kg ?? 0), 0));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [dateRange.endDate, dateRange.startDate, farm?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const barnNameById = useMemo(
    () => new Map(barns.map((barn) => [barn.id, barn.name])),
    [barns]
  );
  const flockById = useMemo(
    () => new Map(flocks.map((flock) => [flock.id, flock])),
    [flocks]
  );

  const totalLiters = useMemo(
    () => records.reduce((sum, record) => sum + Number(record.quantity_liters), 0),
    [records]
  );

  // Total de aves usado como base: prioriza os lotes presentes nos registros,
  // com fallback para o efetivo total da granja.
  const totalBirds = useMemo(() => {
    const birdsFromRecords = Array.from(
      new Set(records.map((record) => record.flock_id).filter((id): id is string => Boolean(id)))
    ).reduce((sum, flockId) => sum + (flockById.get(flockId)?.bird_count ?? 0), 0);
    const fallbackBirds = farm?.total_birds || barns.reduce((sum, barn) => sum + barn.current_birds, 0);
    return birdsFromRecords || fallbackBirds;
  }, [barns, farm?.total_birds, flockById, records]);

  const dayCount = useMemo(
    () => new Set(records.map((record) => record.date)).size || 1,
    [records]
  );

  const dailyAverageLiters = useMemo(() => totalLiters / dayCount, [totalLiters, dayCount]);

  // ml por ave por dia — métrica comparável diretamente com o guia de manejo.
  const mlPerBirdPerDay = useMemo(
    () => (totalBirds > 0 ? (dailyAverageLiters / totalBirds) * 1000 : 0),
    [dailyAverageLiters, totalBirds]
  );

  // Relação água:ração (litros de água por kg de ração no período).
  const waterFeedRatio = useMemo(
    () => (feedKg > 0 ? totalLiters / feedKg : null),
    [feedKg, totalLiters]
  );

  // Desvio do consumo do dia mais recente em relação à média dos 7 dias anteriores.
  const trend = useMemo(() => {
    if (totalBirds <= 0) return null;
    const litersByDate = new Map<string, number>();
    records.forEach((record) => {
      litersByDate.set(record.date, (litersByDate.get(record.date) || 0) + Number(record.quantity_liters));
    });
    const series = Array.from(litersByDate.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, liters]) => (liters / totalBirds) * 1000);
    if (series.length < 2) return null;
    const current = series[series.length - 1];
    const baseline = series.slice(Math.max(0, series.length - 8), series.length - 1);
    const average = baseline.reduce((sum, value) => sum + value, 0) / baseline.length;
    if (average <= 0) return null;
    return { deviationPct: ((current - average) / average) * 100 };
  }, [records, totalBirds]);

  // Comparativo entre galpões: consumo por ave, relação água:ração, status e desvio.
  const barnComparison = useMemo(() => {
    if (barns.length === 0) return [];
    const litersByBarn = new Map<string, number>();
    records.forEach((record) => {
      if (!record.barn_id) return;
      litersByBarn.set(record.barn_id, (litersByBarn.get(record.barn_id) || 0) + Number(record.quantity_liters));
    });
    const base = barns.map((barn) => {
      const birds = barn.current_birds || flocks.filter((flock) => flock.barn_id === barn.id).reduce((sum, flock) => sum + (flock.bird_count || 0), 0);
      const liters = litersByBarn.get(barn.id) || 0;
      const mlPerBird = birds > 0 ? (liters / dayCount / birds) * 1000 : 0;
      return { id: barn.id, name: barn.name, mlPerBird, ratio: estimateWaterFeedRatio(mlPerBird) };
    });
    const withData = base.filter((row) => row.mlPerBird > 0);
    const avg = withData.length ? withData.reduce((sum, row) => sum + row.mlPerBird, 0) / withData.length : 0;
    return base.map((row) => {
      if (row.mlPerBird <= 0) {
        return { ...row, tone: "gray" as const, statusLabel: "Sem dados", observation: "Sem registros" };
      }
      const deviation = avg > 0 ? (row.mlPerBird - avg) / avg : 0;
      const outOfRange = row.mlPerBird < PER_BIRD_LOW_LIMIT || row.mlPerBird > PER_BIRD_HIGH_LIMIT;
      const aboveAvg = deviation > 0.03;
      const belowAvg = deviation < -0.03;
      const observation = outOfRange
        ? "Fora da faixa ideal"
        : aboveAvg
          ? "Consumo acima da média"
          : belowAvg
            ? "Consumo abaixo da média"
            : "Estável";
      const tone: "emerald" | "amber" | "red" = outOfRange ? "red" : aboveAvg ? "amber" : "emerald";
      const statusLabel = outOfRange ? "Crítico" : aboveAvg ? "Atenção" : "Saudável";
      return { ...row, tone, statusLabel, observation };
    });
  }, [barns, flocks, records, dayCount]);

  const hasData = records.length > 0;

  const status = useMemo(() => {
    if (!hasData || mlPerBirdPerDay === 0) {
      return {
        key: "sem-dados" as const,
        label: "Sem dados",
        tone: "gray",
        score: 0,
        risk: "—",
        action: "Registre o consumo diário para acompanhar a hidratação do plantel.",
        insight:
          "Registre o consumo de água diário para acompanhar a hidratação do plantel e comparar com as metas do guia de manejo.",
      };
    }
    if (mlPerBirdPerDay < PER_BIRD_LOW_LIMIT) {
      return {
        key: "baixo" as const,
        label: "Consumo baixo",
        tone: "red",
        score: Math.max(40, Math.round((mlPerBirdPerDay / PER_BIRD_IDEAL_MIN) * 100)),
        risk: "Alto",
        action: "Verifique hoje o abastecimento, a pressão dos bebedouros e a saúde do lote.",
        insight:
          "Consumo abaixo do esperado. Segundo o guia, baixo consumo pode indicar falha no abastecimento ou problema sanitário — verifique pressão, vazão dos bebedouros e a saúde do lote.",
      };
    }
    if (mlPerBirdPerDay > PER_BIRD_HIGH_LIMIT) {
      return {
        key: "alto" as const,
        label: "Consumo alto",
        tone: "amber",
        score: 70,
        risk: "Moderado",
        action: "Mantenha a água fresca (<20 °C) e inspecione possíveis vazamentos na linha.",
        insight:
          "Consumo acima do esperado. Pode indicar calor excessivo ou vazamento na linha. Mantenha a água fresca (<20 °C) e inspecione possíveis vazamentos.",
      };
    }
    if (mlPerBirdPerDay < PER_BIRD_IDEAL_MIN) {
      return {
        key: "atencao" as const,
        label: "Atenção",
        tone: "amber",
        score: 80,
        risk: "Moderado",
        action: "Observe a temperatura ambiente e o acesso aos bebedouros nos próximos dias.",
        insight:
          "Consumo um pouco abaixo da faixa ideal. Observe a temperatura ambiente e o acesso aos bebedouros nos próximos dias.",
      };
    }
    return {
      key: "saudavel" as const,
      label: "Saudável",
      tone: "emerald",
      score: 96,
      risk: "Baixo",
      action: "Manter a inspeção diária dos bebedouros e a água fresca.",
      insight:
        "Consumo dentro da faixa de referência (200–320 ml por ave/dia). Mantenha a rotina de inspeção dos bebedouros e a água fresca.",
    };
  }, [hasData, mlPerBirdPerDay]);

  const statusTheme = useMemo(() => {
    switch (status.tone) {
      case "emerald":
        return { text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/20", ring: "#10b981", border: "border-emerald-200 dark:border-emerald-900/40", gradient: "from-emerald-50/80 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900" };
      case "amber":
        return { text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/20", ring: "#f59e0b", border: "border-amber-200 dark:border-amber-900/40", gradient: "from-amber-50/80 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900" };
      case "red":
        return { text: "text-red-700 dark:text-red-300", bg: "bg-red-50 dark:bg-red-950/20", ring: "#ef4444", border: "border-red-200 dark:border-red-900/40", gradient: "from-red-50/80 via-white to-white dark:from-red-950/20 dark:via-slate-900 dark:to-slate-900" };
      default:
        return { text: "text-gray-500 dark:text-slate-400", bg: "bg-gray-100 dark:bg-slate-800", ring: "#94a3b8", border: "border-gray-200 dark:border-white/10", gradient: "from-gray-50 via-white to-white dark:from-slate-800/40 dark:via-slate-900 dark:to-slate-900" };
    }
  }, [status.tone]);

  // Assistente de Granja — insights automáticos a partir dos dados de água do período.
  const waterInsights = useMemo(() => {
    const arr: { type: "success" | "warning" | "info"; title: string; action: string }[] = [];
    if (!hasData) {
      arr.push({ type: "info", title: "Sem registros no período", action: "Registre o consumo diário para liberar a análise do assistente." });
      return arr;
    }

    if (status.tone === "emerald") {
      arr.push({ type: "success", title: "Hidratação dentro da faixa ideal", action: `Consumo de ${mlPerBirdPerDay.toFixed(0)} ml/ave/dia — manter inspeção diária dos bebedouros.` });
    } else {
      arr.push({ type: "warning", title: status.label, action: status.action });
    }

    if (trend) {
      const dev = trend.deviationPct;
      if (dev > 10) {
        arr.push({ type: "warning", title: `Consumo subiu ${dev.toFixed(0)}% vs média de 7 dias`, action: "Verifique calor ou vazamentos na linha de bebedouros." });
      } else if (dev < -10) {
        arr.push({ type: "warning", title: `Consumo caiu ${Math.abs(dev).toFixed(0)}% vs média de 7 dias`, action: "Cheque pressão/vazão dos bebedouros e a saúde do lote." });
      } else {
        arr.push({ type: "info", title: "Consumo estável nos últimos 7 dias", action: "Ritmo consistente — manter práticas atuais de manejo hídrico." });
      }
    }

    if (waterFeedRatio !== null) {
      if (waterFeedRatio > RATIO_IDEAL_MAX) {
        arr.push({ type: "warning", title: `Relação água:ração alta (${waterFeedRatio.toFixed(1).replace(".", ",")}:1)`, action: "Pode indicar calor ou desperdício — avalie temperatura e vazamentos." });
      } else if (waterFeedRatio < RATIO_IDEAL_MIN) {
        arr.push({ type: "warning", title: `Relação água:ração baixa (${waterFeedRatio.toFixed(1).replace(".", ",")}:1)`, action: "Consumo de água baixo para a ração — verifique os bebedouros." });
      }
    }

    const flagged = barnComparison.filter((row) => row.tone === "amber" || row.tone === "red");
    if (flagged.length > 0) {
      arr.push({ type: "warning", title: `${flagged.length} galpão(ões) fora do padrão`, action: `Comparar manejo: ${flagged.map((row) => row.name).join(", ")}.` });
    }

    arr.push({ type: "info", title: "Água é o nutriente nº 1", action: "Mantenha água limpa e fresca (<20 °C) disponível o tempo todo." });

    return arr;
  }, [hasData, status, trend, mlPerBirdPerDay, waterFeedRatio, barnComparison]);

  const chartData = useMemo<ChartPoint[]>(() => {
    const byDate = new Map<string, { liters: number; flocks: Map<string, number> }>();
    records.forEach((record) => {
      const entry = byDate.get(record.date) ?? { liters: 0, flocks: new Map<string, number>() };
      const liters = Number(record.quantity_liters);
      entry.liters += liters;
      const key = record.flock_id ?? "__none__";
      entry.flocks.set(key, (entry.flocks.get(key) || 0) + liters);
      byDate.set(record.date, entry);
    });
    return Array.from(byDate.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, entry]) => ({
        date: formatDate(date),
        liters: entry.liters,
        breakdown: Array.from(entry.flocks.entries())
          .map(([flockId, liters]) => ({
            label: flockId === "__none__" ? "Sem lote" : `Lote ${flockById.get(flockId)?.code ?? "-"}`,
            liters,
          }))
          .sort((left, right) => right.liters - left.liters),
      }));
  }, [records, flockById]);

  // Zona ideal diária em litros, derivada da faixa por ave do guia.
  const idealBand = useMemo(() => {
    if (totalBirds <= 0) return null;
    return {
      min: (totalBirds * PER_BIRD_IDEAL_MIN) / 1000,
      max: (totalBirds * PER_BIRD_IDEAL_MAX) / 1000,
    };
  }, [totalBirds]);

  // Garante que o topo do eixo Y comporte toda a zona ideal, mesmo quando o
  // consumo real fica abaixo do limite superior da faixa recomendada.
  const yAxisMax = useMemo(() => {
    const dataMax = chartData.reduce((max, point) => Math.max(max, point.liters), 0);
    const target = Math.max(dataMax, idealBand?.max ?? 0);
    return Math.ceil((target * 1.1) / 10) * 10 || 100;
  }, [chartData, idealBand]);

  function openAddModal() {
    setEditingRecord(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(record: WaterConsumptionRow) {
    setEditingRecord(record);
    setForm({
      date: record.date,
      barnId: record.barn_id ?? "",
      flockId: record.flock_id ?? "",
      quantityLiters: String(record.quantity_liters),
    });
    setModalOpen(true);
  }

  async function saveRecord() {
    if (!farm?.id || !form.date || !form.quantityLiters) return;
    const quantityLiters = Number(form.quantityLiters);
    if (quantityLiters <= 0) return;

    const selectedFlock = form.flockId ? flockById.get(form.flockId) : undefined;
    const selectedBarnId = selectedFlock?.barn_id ?? (form.barnId || null);
    if (form.barnId && !barnNameById.has(form.barnId)) return;
    if (form.flockId && !selectedFlock) return;

    setIsSaving(true);
    try {
      if (editingRecord) {
        const updates: WaterConsumptionUpdate = {
          date: form.date,
          barn_id: selectedBarnId,
          flock_id: form.flockId || null,
          quantity_liters: quantityLiters,
        };
        await updateWaterRecord(editingRecord.id, updates);
      } else {
        await createWaterRecord({
          farm_id: farm.id,
          date: form.date,
          barn_id: selectedBarnId,
          flock_id: form.flockId || null,
          quantity_liters: quantityLiters,
        });
      }
      setModalOpen(false);
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRecordId) return;
    setIsSaving(true);
    try {
      await deleteWaterRecord(deleteRecordId);
      setDeleteRecordId(null);
      await loadData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const ratioMeta = describeRatio(waterFeedRatio);
  const perBirdMeta = describePerBird(mlPerBirdPerDay, hasData);

  const deviationText = trend ? `${trend.deviationPct >= 0 ? "+" : ""}${trend.deviationPct.toFixed(0)}%` : "—";
  const deviationMagnitude = trend ? Math.abs(trend.deviationPct) : 0;
  const DeviationIcon = !trend || deviationMagnitude < 1 ? Minus : trend.deviationPct > 0 ? TrendingUp : TrendingDown;

  const toneCircle =
    status.tone === "emerald"
      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
      : status.tone === "amber"
        ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
        : status.tone === "red"
          ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
          : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400";
  const StatusInsightIcon = status.tone === "emerald" ? CheckCircle2 : Info;
  const deviationCircle =
    !trend
      ? "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400"
      : deviationMagnitude <= 10
        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        : deviationMagnitude <= 25
          ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
          : "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center flex-shrink-0">
            <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight truncate">Consumo de Água</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5 truncate">Acompanhe a hidratação do plantel com base no guia de manejo</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <CalendarFilter />
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-3 sm:px-5 py-2 sm:py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Registrar Consumo</span>
            <span className="sm:hidden">Registrar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Status banner - mesma UI do bloco de Saúde Alimentar (ração) */}
      <div className={cn("bg-gradient-to-r rounded-2xl border p-4 sm:p-5 transition-all duration-300", statusTheme.border, statusTheme.gradient)}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 lg:min-w-[280px]">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
              <svg className="w-14 h-14 sm:w-16 sm:h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5" className="text-gray-200 dark:text-[#334155]" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={statusTheme.ring}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${(status.score / 100) * 175.9} 175.9`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-sm sm:text-base font-bold", statusTheme.text)}>{status.score || "—"}</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="text-sm font-bold text-gray-900 dark:text-slate-100">Hidratação do plantel</span>
              </div>
              <p className={cn("text-lg sm:text-xl font-bold mt-0.5", statusTheme.text)}>{status.label}</p>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">
                {hasData
                  ? `Consumo: ${mlPerBirdPerDay.toFixed(0)} ml/ave/dia | Meta: ${PER_BIRD_IDEAL_MIN}–${PER_BIRD_IDEAL_MAX} ml | Risco: ${status.risk}`
                  : "Sem registros no período"}
              </p>
            </div>
          </div>

          <div className="hidden lg:block w-px h-14 bg-gray-200 dark:bg-white/10" />

          <div className="flex-1 space-y-1.5 sm:space-y-2">
            {hasData && trend && (
              <div className="flex items-start sm:items-center gap-2">
                <div className={cn("w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0", deviationCircle)}>
                  <DeviationIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300">
                  Consumo {deviationText} em relação à média dos últimos 7 dias
                </p>
              </div>
            )}
            <div className="flex items-start sm:items-center gap-2">
              <div className={cn("w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0", toneCircle)}>
                <StatusInsightIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300">{status.insight}</p>
            </div>
            <div className="flex items-start sm:items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0 bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300">
                <span className="font-semibold">Ação recomendada:</span> {status.action}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Consumo Total"
          value={`${totalLiters.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} L`}
          subtitle={`${dayCount} dia(s) com registro`}
          icon={<Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-50 dark:bg-blue-950/20"
        />
        <KpiCard
          title="Média Diária"
          value={`${dailyAverageLiters.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} L`}
          subtitle="Litros por dia no período"
          icon={<CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />}
          iconBg="bg-indigo-50 dark:bg-indigo-950/20"
        />
        <MetaKpiCard
          title="Consumo por Ave"
          value={hasData ? `${mlPerBirdPerDay.toFixed(0)} ml` : "—"}
          subtitle="por ave/dia"
          targetLabel={`Meta: ${PER_BIRD_IDEAL_MIN}–${PER_BIRD_IDEAL_MAX} ml`}
          meta={perBirdMeta}
          icon={<Thermometer className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />}
          iconBg="bg-orange-50 dark:bg-orange-950/20"
          helpText="O guia recomenda de 200 a 320 ml por ave por dia, variando com a temperatura do galpão."
        />
        <MetaKpiCard
          title="Relação Água : Ração"
          value={waterFeedRatio !== null ? `${waterFeedRatio.toFixed(1)} : 1` : "—"}
          subtitle={waterFeedRatio !== null ? "litros de água por kg de ração" : "Registre a ração do período"}
          targetLabel="Ideal: ~1,8 : 1"
          meta={ratioMeta}
          icon={<Scale className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/20"
          helpText="As aves bebem cerca de 1,8 vez mais do que comem. Valores muito altos podem indicar calor ou vazamentos; muito baixos, restrição de água."
        />
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Left Column: Chart */}
        <section className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 dark:border-white/10 dark:bg-slate-900">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Evolução do Consumo</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Litros registrados por dia</p>
            </div>
            {idealBand && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-4 rounded-full bg-emerald-200 dark:bg-emerald-900/50" />
                Zona ideal
              </div>
            )}
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, yAxisMax]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<WaterChartTooltip />} />
                <Area type="monotone" dataKey="liters" stroke="#3b82f6" strokeWidth={2} fill="url(#waterFill)" />
                {idealBand && (
                  <ReferenceArea
                    y1={idealBand.min}
                    y2={idealBand.max}
                    fill="#10b981"
                    fillOpacity={0.14}
                    stroke="#10b981"
                    strokeOpacity={0.45}
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                    label={{ value: "Zona ideal", position: "insideTopRight", fill: "#059669", fontSize: 10, fontWeight: 600 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Assistente de Granja */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 dark:border-white/10 dark:bg-slate-900 flex flex-col">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Assistente de Granja</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500">Baseado nos dados do período</p>
            </div>
          </div>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {waterInsights.map((ins, index) => {
              const link = insightHref(`${ins.title} ${ins.action}`);
              return (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-xl border-l-[3px]",
                  ins.type === "success" && "bg-emerald-50/50 border-l-emerald-500 dark:bg-emerald-950/20",
                  ins.type === "warning" && "bg-amber-50/50 border-l-amber-500 dark:bg-amber-950/20",
                  ins.type === "info" && "bg-blue-50/50 border-l-blue-500 dark:bg-blue-950/20"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                      ins.type === "success" && "bg-emerald-100 dark:bg-emerald-900/40",
                      ins.type === "warning" && "bg-amber-100 dark:bg-amber-900/40",
                      ins.type === "info" && "bg-blue-100 dark:bg-blue-900/40"
                    )}
                  >
                    {ins.type === "success" && <TrendingUp className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />}
                    {ins.type === "warning" && <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />}
                    {ins.type === "info" && <Lightbulb className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">{ins.title}</span>
                </div>
                <div className="ml-7 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <p className={cn("text-[11px] font-medium", ins.type === "success" ? "text-emerald-600 dark:text-emerald-400" : ins.type === "warning" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400")}>→ {ins.action}</p>
                  <Link href={link.href} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400">
                    {link.label}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Records Log */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm dark:border-white/10 dark:bg-slate-900 flex flex-col overflow-hidden">
          <div className="border-b border-gray-100 p-4 dark:border-white/10 flex-shrink-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Registros Recentes</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{records.length} lançamento(s) no período</p>
          </div>
          <div className="max-h-[352px] overflow-y-auto divide-y divide-gray-50 dark:divide-white/5" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {records.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-slate-400 text-center">Nenhum consumo de água registrado neste período.</p>
            ) : (
              records
                .slice()
                .sort((left, right) => right.date.localeCompare(left.date))
                .map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{Number(record.quantity_liters).toFixed(0)} L</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{formatDate(record.date)}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {record.flock_id ? `Lote ${flockById.get(record.flock_id)?.code ?? "-"}` : "Sem lote"} · {record.barn_id ? barnNameById.get(record.barn_id) ?? "Aviário" : "Sem aviário"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditModal(record)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteRecordId(record.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>

      {/* Comparativo entre galpões */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center flex-shrink-0">
            <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Comparativo entre galpões</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500">Consumo por ave e relação água:ração</p>
          </div>
        </div>

        {barnComparison.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">Cadastre galpões para comparar o consumo.</p>
        ) : (
          <div className="space-y-2.5">
            {barnComparison.map((row) => (
              <div key={row.id} className="rounded-xl border border-gray-200 dark:border-white/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{row.name}</span>
                  <span className={cn("inline-flex flex-shrink-0 items-center rounded-lg px-2 py-0.5 text-xs font-semibold", COMPARE_BADGE[row.tone])}>
                    {row.statusLabel}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500">Consumo por ave</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                      {row.mlPerBird > 0 ? `${row.mlPerBird.toFixed(0)} ml` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500">Água:ração</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                      {row.mlPerBird > 0 ? `${row.ratio.toFixed(1).replace(".", ",")} : 1` : "—"}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">{row.observation}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Painel educativo - "como interpretar" baseado no guia de manejo */}
      <section className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-1">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Como interpretar o consumo de água</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Referências do guia de manejo Novogen Brown</p>
          <ul className="space-y-3">
            <GuideTip
              icon={<Droplets className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
              title="A água é o nutriente nº 1"
              text="As aves bebem cerca de 1,8 vez mais do que comem. Água limpa e disponível o tempo todo é essencial para a produção."
            />
            <GuideTip
              icon={<Thermometer className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
              title="Temperatura importa"
              text="Mantenha a água entre 20 e 25 °C. Em dias quentes, prefira água fresca (abaixo de 20 °C) — as aves bebem mais e comem menos."
            />
            <GuideTip
              icon={<TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />}
              title="Queda no consumo é sinal de alerta"
              text="Uma redução pode indicar falha no abastecimento ou problema sanitário no lote. Investigue pressão, vazão e a saúde das aves."
            />
            <GuideTip
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              title="Cuide da qualidade"
              text="Colha amostras de água 1 a 2 vezes por ano, limpe o sistema entre lotes e higienize os bebedouros regularmente."
            />
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-1">
            <Thermometer className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Consumo por temperatura</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Aves em produção (ITAVI, 2012)</p>
          <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Galpão</th>
                  <th className="px-3 py-2 font-semibold">Água:Ração</th>
                  <th className="px-3 py-2 font-semibold text-right">ml/ave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {TEMPERATURE_REFERENCE.map((row) => (
                  <tr key={row.temp} className="text-gray-700 dark:text-slate-300">
                    <td className="px-3 py-2 font-medium">{row.temp}</td>
                    <td className="px-3 py-2">{row.ratio} : 1</td>
                    <td className="px-3 py-2 text-right font-semibold">{row.perBird}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-400 dark:text-slate-500">
            Quanto mais quente o galpão, mais água as aves consomem em relação à ração.
          </p>
        </div>
      </section>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 dark:border dark:border-white/10" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{editingRecord ? "Editar Consumo" : "Registrar Consumo"}</h3>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <Field label="Data">
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    className="w-full border border-gray-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </Field>
                <Field label="Lote">
                  <select
                    value={form.flockId}
                    onChange={(event) => {
                      const flock = flockById.get(event.target.value);
                      setForm({ ...form, flockId: event.target.value, barnId: flock?.barn_id ?? form.barnId });
                    }}
                    className="w-full border border-gray-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white dark:bg-slate-800 cursor-pointer"
                  >
                    <option value="">Sem lote</option>
                    {flocks.map((flock) => <option key={flock.id} value={flock.id}>{flock.code}</option>)}
                  </select>
                </Field>
                <Field label="Aviário">
                  <select
                    value={form.barnId}
                    onChange={(event) => setForm({ ...form, barnId: event.target.value })}
                    className="w-full border border-gray-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white dark:bg-slate-800 cursor-pointer"
                  >
                    <option value="">Sem aviário</option>
                    {barns.map((barn) => <option key={barn.id} value={barn.id}>{barn.name}</option>)}
                  </select>
                </Field>
                <Field label="Quantidade (L)">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.quantityLiters}
                    onChange={(event) => setForm({ ...form, quantityLiters: event.target.value })}
                    placeholder="500"
                    className="w-full border border-gray-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">Cancelar</button>
                <button
                  onClick={saveRecord}
                  disabled={isSaving || !form.date || Number(form.quantityLiters) <= 0}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-4 py-2 transition-colors cursor-pointer shadow-sm shadow-brand-600/20 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteRecordId && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4 dark:border dark:border-white/10">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Excluir registro?</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">Essa ação remove o lançamento de consumo de água permanentemente.</p>
              <div className="flex justify-center gap-2 pt-2">
                <button onClick={() => setDeleteRecordId(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">Cancelar</button>
                <button onClick={confirmDelete} disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer shadow-sm shadow-red-600/20 disabled:bg-gray-300">Excluir</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

interface MetaState {
  progress: number;
  color: string;
  label: string;
}

function describePerBird(mlPerBird: number, hasData: boolean): MetaState {
  if (!hasData || mlPerBird <= 0) return { progress: 0, color: "bg-gray-300 dark:bg-slate-700", label: "Sem dados" };
  const progress = Math.min((mlPerBird / PER_BIRD_IDEAL_MAX) * 100, 100);
  if (mlPerBird < PER_BIRD_LOW_LIMIT) return { progress, color: "bg-red-500", label: "Abaixo do ideal" };
  if (mlPerBird > PER_BIRD_HIGH_LIMIT) return { progress: 100, color: "bg-amber-500", label: "Acima do ideal" };
  if (mlPerBird < PER_BIRD_IDEAL_MIN) return { progress, color: "bg-amber-500", label: "Quase na meta" };
  return { progress, color: "bg-emerald-500", label: "Dentro da meta" };
}

function describeRatio(ratio: number | null): MetaState {
  if (ratio === null) return { progress: 0, color: "bg-gray-300 dark:bg-slate-700", label: "Sem ração" };
  const progress = Math.min((ratio / 3.1) * 100, 100);
  if (ratio < RATIO_IDEAL_MIN) return { progress, color: "bg-amber-500", label: "Relação baixa" };
  if (ratio > RATIO_IDEAL_MAX) return { progress, color: "bg-amber-500", label: "Relação alta" };
  return { progress, color: "bg-emerald-500", label: "Dentro do esperado" };
}

function WaterChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:bg-slate-800">
      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-base font-bold text-gray-900 dark:text-slate-100">
        {point.liters.toFixed(0)} L <span className="text-xs font-medium text-gray-400 dark:text-slate-500">no total</span>
      </p>
      <div className="mt-2 space-y-1 border-t border-gray-100 pt-2 dark:border-white/10">
        {point.breakdown.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 text-xs">
            <span className="text-gray-500 dark:text-slate-400">{item.label}</span>
            <span className="font-semibold text-gray-700 dark:text-slate-200">{item.liters.toFixed(0)} L</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ title, value, subtitle, icon, iconBg = "bg-blue-50 dark:bg-blue-950/20" }: { title: string; value: string; subtitle: string; icon: ReactNode; iconBg?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-all duration-200 dark:bg-slate-900 dark:border-white/10">
      <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5 sm:mb-3">
        <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">{title}</span>
      </div>
      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

function MetaKpiCard({
  title,
  value,
  subtitle,
  targetLabel,
  meta,
  icon,
  iconBg,
  helpText,
}: {
  title: string;
  value: string;
  subtitle: string;
  targetLabel: string;
  meta: MetaState;
  icon: ReactNode;
  iconBg: string;
  helpText: string;
}) {
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-all duration-200 dark:bg-slate-900 dark:border-white/10">
      <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5 sm:mb-3">
        <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 flex-1">{title}</span>
        <span className="relative flex-shrink-0">
          <Info className="h-3.5 w-3.5 text-gray-300 dark:text-slate-600" />
          <span className="pointer-events-none absolute right-0 top-5 z-10 hidden w-52 rounded-xl bg-gray-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg group-hover:block dark:bg-slate-700">
            {helpText}
          </span>
        </span>
      </div>
      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
        <div className={cn("h-full rounded-full transition-all duration-700", meta.color)} style={{ width: `${meta.progress}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">{targetLabel}</span>
        <span className="text-[10px] font-semibold text-gray-600 dark:text-slate-300">{meta.label}</span>
      </div>
    </div>
  );
}

function GuideTip({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-800">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</p>
        <p className="text-xs leading-relaxed text-gray-500 dark:text-slate-400">{text}</p>
      </div>
    </li>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
