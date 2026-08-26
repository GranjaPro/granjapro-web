"use client";

import { useState, useMemo, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useSearchParams } from "next/navigation";
import ModalPortal from "@/components/ui/modal-portal";
import {
  Wheat,
  Egg,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  HelpCircle,
  Search,
  Zap,
  Lightbulb,
  Target,
  Activity,
  Package,
  FileText,
  ChevronRight,
  Droplets,
} from "lucide-react";
import Link from "next/link";
import { insightHref } from "@/lib/insight-links";
import { cn } from "@/lib/utils";
import {
  ComposedChart,
  BarChart,
  Bar,
  Area,
  AreaChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { getFeedByDateRange, createFeedRecord, updateFeedRecord, deleteFeedRecord } from "@/lib/services/feed";
import { getWaterByDateRange, type WaterConsumptionRow } from "@/lib/services/water";
import { getFeedInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem, type FeedInventoryCompatibilityRow, type StorageLocationRow } from "@/lib/services/inventory";
import { getProductionByDateRange } from "@/lib/services/production";
import { getBarns } from "@/lib/services/barns";
import { getFlocks } from "@/lib/services/flocks";
import type { Tables } from "@/lib/database.types";
import { useDateFilter, CalendarFilter } from "@/components/date-filter";
import { hasMinimumPlan } from "@/lib/plans";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/plan/locked-overlay";
import { RequiredPlanBadge } from "@/components/plan/plan-badge";
import { AssistantLockedPreview } from "@/components/dashboard/assistant-card";
import { FarmHealthBanner, type FarmHealthInsight } from "@/components/dashboard/farm-health-banner";
import { calculateFeedKpiMetrics, calculateFeedStockMetrics } from "@/lib/domain/feed-kpi-metrics";
import { calculateFeedFinancialMetrics } from "@/lib/domain/financial-kpi-metrics";
import { calculateKpiVariation, getComparisonPeriod, type KpiVariation } from "@/lib/domain/kpi-comparison";
import type { FlockMortality, ProductiveFlock } from "@/lib/domain/egg-production-metrics";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  getInventoryLowStockThresholdStorageKey,
  isInventoryStockOld,
  parseInventoryLowStockThreshold,
  resolveInventoryStockStatus,
} from "@/lib/domain/inventory-stock-status";

/* ── Types ── */
type TipoRacao = "milho" | "soja" | "comercial" | "custom";
type StatusEstoque = "normal" | "alerta" | "baixo";

interface RegistroRacao {
  id: string | number;
  data: string;
  tipo: TipoRacao;
  aviario: string;
  barn_id: string | null;
  flock_id: string | null;
  consumoKg: number;
  custoRS: number;
  qtdGalinhas: number;
  feedInventoryId: string | null;
}

interface ItemEstoque {
  id: string;
  locationId: string;
  nome: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  status: StatusEstoque;
  fornecedor?: string;
  localizacao?: string;
  lote?: string;
  dataChegada?: string;
  valorTotal: number;
  inventoryTable: string;
  unitCost: number;
  minimumQuantity: number;
}

interface Barn {
  id: string;
  name: string;
  current_birds: number;
}

interface Flock {
  id: string;
  code: string;
  breed: string;
  birdCount: number;
  arrivalAgeWeeks: number;
  arrivalDate: string;
  status: string;
  barnId: string;
}

interface DailyEfficiencyPoint {
  dia: string;
  kg: number;
  ovos: number;
  eficiencia: number;
  consumoAveG: number;
}

type FeedConsumptionWithBarn = Tables<"feed_consumption"> & {
  barns?: { name?: string | null; current_birds?: number | null } | null;
};
type ProductionRow = Tables<"egg_production">;
type FlockRow = Tables<"flocks">;
type FeedMetricKey = "cost" | "quantity_kg";
type FeedFinancialMetrics = ReturnType<typeof calculateFeedFinancialMetrics>;

const tipoLabel: Record<TipoRacao, string> = {
  milho: "Milho Mix",
  soja: "Soja Blend",
  comercial: "Comercial",
  custom: "Fórmula Custom",
};

const tipoColor: Record<TipoRacao, string> = {
  milho: "text-amber-800 bg-amber-100",
  soja: "text-orange-800 bg-orange-100",
  comercial: "text-emerald-800 bg-emerald-100",
  custom: "text-red-800 bg-red-100",
};

const statusColor: Record<StatusEstoque, string> = {
  normal: "text-emerald-700 bg-emerald-50",
  alerta: "text-amber-700 bg-amber-50",
  baixo: "text-red-700 bg-red-50",
};

const statusLabel: Record<StatusEstoque, string> = {
  normal: "Normal",
  alerta: "Alerta",
  baixo: "Baixo",
};

function KpiSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 animate-pulse">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gray-200" />
        <div className="w-20 h-4 bg-gray-200 rounded" />
      </div>
      <div className="w-24 h-6 bg-gray-200 rounded mb-2" />
      <div className="w-32 h-3 bg-gray-200 rounded mb-3" />
      <div className="w-full h-2 bg-gray-100 rounded-full mt-1" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="w-32 h-5 bg-gray-200 rounded" />
        <div className="w-48 h-8 bg-gray-200 rounded-xl" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-4">
            <div className="w-24 h-4 bg-gray-200 rounded" />
            <div className="w-20 h-6 bg-gray-200 rounded-lg" />
            <div className="w-16 h-4 bg-gray-200 rounded" />
            <div className="w-16 h-4 bg-gray-200 rounded" />
            <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

type ModalMode = "add" | "edit" | null;

function getTodayDateInputValue() {
  return new Date().toISOString().split("T")[0];
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

interface FeedCostTooltipProps {
  label: string;
  description: string;
  formula: string;
}

function FeedCostTooltip({ label, description, formula }: FeedCostTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const viewportPadding = 8;
    const gap = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipWidth = tooltipRef.current?.offsetWidth ?? 208;
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 144;
    const maximumLeft = Math.max(viewportPadding, window.innerWidth - tooltipWidth - viewportPadding);
    const left = Math.min(
      Math.max(triggerRect.right - tooltipWidth, viewportPadding),
      maximumLeft,
    );
    const preferredTop = triggerRect.bottom + gap;
    const top = preferredTop + tooltipHeight <= window.innerHeight - viewportPadding
      ? preferredTop
      : Math.max(viewportPadding, triggerRect.top - tooltipHeight - gap);

    setPosition({ top, left });
  }, []);

  const openTooltip = useCallback(() => {
    updatePosition();
    setIsOpen(true);
  }, [updatePosition]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <div className="flex-shrink-0" onMouseEnter={openTooltip} onMouseLeave={() => setIsOpen(false)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Fórmula de ${label}`}
        aria-expanded={isOpen}
        onFocus={openTooltip}
        onBlur={() => setIsOpen(false)}
        className="w-5 h-5 rounded-full border border-gray-200 bg-white hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer dark:border-white/10 dark:bg-[#101d3a] dark:hover:bg-slate-800"
      >
        <HelpCircle className="w-3 h-3 text-gray-500 dark:text-slate-300" />
      </button>
      {isOpen && (
        <ModalPortal>
          <div
            ref={tooltipRef}
            role="tooltip"
            className="fixed z-[100] w-52 pointer-events-none bg-white rounded-xl border border-gray-200 shadow-lg p-3"
            style={{ top: position.top, left: position.left }}
          >
            <p className="text-[11px] font-semibold text-gray-800 mb-1">Sobre {label}</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">{description}</p>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-[10px] text-gray-400">Fórmula: {formula}</p>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

function formatFeedCurrency(value: number | undefined, maximumFractionDigits = 3): string {
  if (value === undefined) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  });
}

export default function RacaoPage() {
  const { plan, hideAdvancedFeatures } = usePlan();
  const showProFeatures = !hideAdvancedFeatures || hasMinimumPlan(plan, "pro");
  const showPremiumFeatures = !hideAdvancedFeatures || hasMinimumPlan(plan, "premium");
  const searchParams = useSearchParams();
  const [registros, setRegistros] = useState<RegistroRacao[]>([]);
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [estoqueModal, setEstoqueModal] = useState<"add" | "view" | null>(null);
  const [storageLocations, setStorageLocations] = useState<StorageLocationRow[]>([]);
  const [estoqueForm, setEstoqueForm] = useState({ nome: "", categoria: "Ração", quantidade: "", unidade: "kg", fornecedor: "", localizacaoId: "", lote: "", dataChegada: "", custoUnitario: "", valorTotal: "" });
  const [viewingEstoque, setViewingEstoque] = useState<ItemEstoque | null>(null);
  const [editingEstoque, setEditingEstoque] = useState(false);
  const [editEstoqueForm, setEditEstoqueForm] = useState({ nome: "", categoria: "", quantidade: "", unidade: "", fornecedor: "", localizacaoId: "", lote: "", dataChegada: "", custoUnitario: "", valorTotal: "" });
  const [lowStockThreshold, setLowStockThreshold] = useState(DEFAULT_LOW_STOCK_THRESHOLD);
  const [modal, setModal] = useState<ModalMode>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [consumoMensalMode, setConsumoMensalMode] = useState<"rs" | "kg">("rs");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [barns, setBarns] = useState<Barn[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [mortalities, setMortalities] = useState<FlockMortality[]>([]);

  // Shared calendar filter
  const { dateRange, filterMode } = useDateFilter();

  // Dynamic Data States
  const [monthlyRS, setMonthlyRS] = useState<{ mes: string; valor: number }[]>([]);
  const [monthlyKg, setMonthlyKg] = useState<{ mes: string; valor: number }[]>([]);
  const [dailyChart, setDailyChart] = useState<DailyEfficiencyPoint[]>([]);
  const [productionRecords, setProductionRecords] = useState<ProductionRow[]>([]);
  const [waterRecords, setWaterRecords] = useState<WaterConsumptionRow[]>([]);
  const [distType, setDistType] = useState<{ tipo: string; kg: number; pct: number; color: string }[]>([]);
  const [feedFinancialMetrics, setFeedFinancialMetrics] = useState<{
    current: FeedFinancialMetrics;
    previous: FeedFinancialMetrics;
  } | null>(null);

  const calculateMonthly = useCallback((data: FeedConsumptionWithBarn[], key: FeedMetricKey) => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const map: Record<string, number> = {};
    
    // Last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map[`${months[d.getMonth()]}`] = 0;
    }

    data.forEach(r => {
      const date = new Date(r.date + "T00:00:00");
      const m = months[date.getMonth()];
      if (map[m] !== undefined) {
        map[m] += Number(r[key]) || 0;
      }
    });

    return Object.entries(map).map(([mes, valor]) => ({ mes, valor }));
  }, []);

  const mapDailyEfficiency = useCallback((feed: FeedConsumptionWithBarn[], prod: ProductionRow[], birdCount: number) => {
    const last7Days: DailyEfficiencyPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const displayDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const dayFeed = feed.filter(f => f.date === dateStr).reduce((s, f) => s + Number(f.quantity_kg), 0);
      const dayProd = prod.filter(p => p.date === dateStr).reduce((s, p) => s + Number(p.eggs_produced), 0);
      
      last7Days.push({
        dia: displayDate,
        kg: dayFeed,
        ovos: dayProd,
        eficiencia: dayProd > 0 ? (dayFeed / dayProd) : 0,
        consumoAveG: birdCount > 0 ? (dayFeed * 1000) / birdCount : 0,
      });
    }
    return last7Days;
  }, []);

  const calculateDistribution = useCallback((data: FeedConsumptionWithBarn[]) => {
    const totals: Record<string, number> = {};
    let grandTotal = 0;
    
    data.forEach(r => {
      const type = r.feed_type || "Comercial";
      totals[type] = (totals[type] || 0) + Number(r.quantity_kg);
      grandTotal += Number(r.quantity_kg);
    });

    const colors = ["#f59e0b", "#10b981", "#f97316", "#ef4444", "#3b82f6", "#8b5cf6"];
    return Object.entries(totals).map(([tipo, kg], i) => ({
      tipo,
      kg,
      pct: grandTotal > 0 ? Math.round((kg / grandTotal) * 100) : 0,
      color: colors[i % colors.length]
    })).sort((a, b) => b.kg - a.kg);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase.from("profiles").select("farm_id").eq("id", userData.user.id).single();
      if (!profile?.farm_id) throw new Error("Farm ID não encontrado");
      
      setFarmId(profile.farm_id);

      const { startDate, endDate } = dateRange;
      const comparisonPeriod = getComparisonPeriod({
        mode: filterMode,
        startDate,
        endDate,
        todayDate: getTodayDateInputValue(),
      });
      const currentEndDate = comparisonPeriod.currentEndDate;

      const mortalityEndDate = currentEndDate > getTodayDateInputValue() ? currentEndDate : getTodayDateInputValue();
      const [feedData, prodData, previousFeedData, previousProdData, inventoryData, barnsData, flocksData, waterData, locationsRes, mortalityRes] = await Promise.all([
        getFeedByDateRange(profile.farm_id, startDate, currentEndDate),
        getProductionByDateRange(profile.farm_id, startDate, currentEndDate),
        getFeedByDateRange(profile.farm_id, comparisonPeriod.previousStartDate, comparisonPeriod.previousEndDate),
        getProductionByDateRange(profile.farm_id, comparisonPeriod.previousStartDate, comparisonPeriod.previousEndDate),
        getFeedInventory(profile.farm_id),
        getBarns(profile.farm_id),
        getFlocks(profile.farm_id),
        showProFeatures ? getWaterByDateRange(profile.farm_id, startDate, endDate) : Promise.resolve([]),
        supabase
          .from("storage_locations")
          .select("*")
          .eq("farm_id", profile.farm_id)
          .eq("category", "feed")
          .order("is_default", { ascending: false })
          .order("name", { ascending: true }),
        supabase
          .from("mortality")
          .select("flock_id, date, dead_birds")
          .eq("farm_id", profile.farm_id)
          .lte("date", mortalityEndDate),
      ]);

      if (locationsRes.error) throw locationsRes.error;
      if (mortalityRes.error) throw mortalityRes.error;
      setStorageLocations((locationsRes.data ?? []) as StorageLocationRow[]);
      setMortalities((mortalityRes.data ?? []).map((mortality) => ({
        flockId: mortality.flock_id,
        date: mortality.date,
        deadBirds: mortality.dead_birds,
      })));

      const typedBarns = barnsData as Barn[];
      const typedFlocks = flocksData as FlockRow[];
      const typedFeedData = feedData as FeedConsumptionWithBarn[];
      const typedProdData = prodData as ProductionRow[];
      const typedPreviousFeedData = previousFeedData as FeedConsumptionWithBarn[];
      const typedPreviousProdData = previousProdData as ProductionRow[];

      setBarns(typedBarns.map((b) => ({
        id: b.id,
        name: b.name,
        current_birds: b.current_birds || 0
      })));
      const totalBirds = typedBarns.reduce((sum, barn) => sum + (barn.current_birds || 0), 0);
      setWaterRecords(waterData);

      setFlocks((typedFlocks || []).map((f) => ({
        id: f.id,
        code: f.code || "",
        breed: f.breed || "",
        birdCount: f.bird_count || 0,
        arrivalAgeWeeks: f.arrival_age_weeks || 0,
        arrivalDate: f.arrival_date,
        status: f.status || "",
        barnId: f.barn_id,
      })));
      const metricFlocks: ProductiveFlock[] = typedFlocks.map((flock) => ({
        id: flock.id,
        birdCount: flock.bird_count,
        arrivalAgeWeeks: flock.arrival_age_weeks,
        arrivalDate: flock.arrival_date,
      }));
      const metricMortalities = (mortalityRes.data ?? []).map((mortality) => ({
        flockId: mortality.flock_id,
        date: mortality.date,
        deadBirds: mortality.dead_birds,
      }));
      const mapFinancialFeed = (rows: FeedConsumptionWithBarn[]) => rows.map((row) => ({
        date: row.date,
        flockId: row.flock_id,
        quantityKg: Number(row.quantity_kg),
        cost: Number(row.cost),
      }));
      const mapFinancialProduction = (rows: ProductionRow[]) => rows.map((row) => ({
        date: row.date,
        flockId: row.flock_id,
        eggsProduced: row.eggs_produced,
      }));
      setFeedFinancialMetrics({
        current: calculateFeedFinancialMetrics({
          flocks: metricFlocks,
          mortalities: metricMortalities,
          feedRecords: mapFinancialFeed(typedFeedData),
          productionRecords: mapFinancialProduction(typedProdData),
          startDate,
          endDate: currentEndDate,
        }),
        previous: calculateFeedFinancialMetrics({
          flocks: metricFlocks,
          mortalities: metricMortalities,
          feedRecords: mapFinancialFeed(typedPreviousFeedData),
          productionRecords: mapFinancialProduction(typedPreviousProdData),
          startDate: comparisonPeriod.previousStartDate,
          endDate: comparisonPeriod.previousEndDate,
        }),
      });

      // Map Table
      const mapped: RegistroRacao[] = typedFeedData.map((d) => {
        const typeStr = d.feed_type.toLowerCase();
        let tipo: TipoRacao = "comercial";
        if (typeStr.includes("milho")) tipo = "milho";
        else if (typeStr.includes("soja")) tipo = "soja";
        else if (typeStr.includes("custom")) tipo = "custom";

        return {
          id: d.id,
          data: d.date,
          tipo,
          aviario: d.barns?.name || "Geral",
          barn_id: d.barn_id,
          flock_id: d.flock_id,
          consumoKg: Number(d.quantity_kg),
          custoRS: Number(d.cost),
          qtdGalinhas: d.barns?.current_birds || 1000,
          feedInventoryId: d.feed_inventory_id,
        };
      });
      
      setRegistros(mapped.sort((a, b) => b.data.localeCompare(a.data)));
      setProductionRecords(typedProdData);
      
      // Map Inventory
      const mappedInv: ItemEstoque[] = inventoryData
        .map((d: FeedInventoryCompatibilityRow) => ({
        id: d.id,
        locationId: d.location_id,
        nome: d.name,
        categoria: d.type,
        quantidade: Number(d.quantity),
        unidade: d.unit,
        status: d.status as StatusEstoque,
        fornecedor: d.notes || "",
        localizacao: d.location || "",
        lote: d.lot_number || "",
        dataChegada: d.arrival_date,
        valorTotal: Number(d.total_cost ?? 0),
        inventoryTable: d.inventory_table,
        unitCost: Number(d.unit_cost ?? 0),
        minimumQuantity: Number(d.minimum_quantity),
      }));
      setEstoque(mappedInv);

      // Egg total for cost-per-egg KPI
      setTotalEggs((typedProdData || []).reduce((s, p) => s + (p.eggs_produced || 0), 0));

      // Transformers
      setMonthlyRS(calculateMonthly(typedFeedData, "cost"));
      setMonthlyKg(calculateMonthly(typedFeedData, "quantity_kg"));
      setDailyChart(mapDailyEfficiency(typedFeedData, typedProdData, totalBirds));
      setDistType(calculateDistribution(typedFeedData));

    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, [calculateMonthly, mapDailyEfficiency, calculateDistribution, dateRange, filterMode, showProFeatures]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchParams.get("register") === "true") setModal("add");
  }, [searchParams]);

  useEffect(() => {
    if (!farmId) return;

    const savedThreshold = window.localStorage.getItem(
      getInventoryLowStockThresholdStorageKey(farmId),
    );
    setLowStockThreshold(
      parseInventoryLowStockThreshold(savedThreshold) ?? DEFAULT_LOW_STOCK_THRESHOLD,
    );
  }, [farmId]);

  const getEffectiveStockStatus = useCallback((item: ItemEstoque) => resolveInventoryStockStatus(
    item.status,
    item.quantidade,
    item.minimumQuantity,
    lowStockThreshold,
    item.dataChegada,
  ), [lowStockThreshold]);

  const isOldStock = useCallback((dataChegada?: string) => {
    return isInventoryStockOld(dataChegada);
  }, []);

  const [editing, setEditing] = useState<RegistroRacao | null>(null);
  const [form, setForm] = useState({ data: getTodayDateInputValue(), barn_id: "", flock_id: "", feedInventoryId: "", consumoKg: "" });
  const [feedFormError, setFeedFormError] = useState<string | null>(null);
  const [isSavingFeed, setIsSavingFeed] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | number | null>(null);

  const avgConsumoPorGalinha = useMemo(() => registros.length > 0 ? (registros.reduce((s, r) => s + (r.qtdGalinhas > 0 ? r.consumoKg / r.qtdGalinhas : 0), 0) / registros.length * 1000) : 0, [registros]);

  // Production data for cost-per-egg calculation
  const [totalEggs, setTotalEggs] = useState(0);

  const productiveFlocks = useMemo<ProductiveFlock[]>(() => flocks.map((flock) => ({
    id: flock.id,
    birdCount: flock.birdCount,
    arrivalAgeWeeks: flock.arrivalAgeWeeks,
    arrivalDate: flock.arrivalDate,
  })), [flocks]);
  const activeProductiveFlocks = useMemo<ProductiveFlock[]>(() => flocks
    .filter((flock) => flock.status !== "descarte")
    .map((flock) => ({
      id: flock.id,
      birdCount: flock.birdCount,
      arrivalAgeWeeks: flock.arrivalAgeWeeks,
      arrivalDate: flock.arrivalDate,
    })), [flocks]);

  const feedKpiMetrics = useMemo(() => calculateFeedKpiMetrics({
    flocks: productiveFlocks,
    mortalities,
    feedRecords: registros.map((record) => ({
      date: record.data,
      flockId: record.flock_id,
      quantityKg: record.consumoKg,
    })),
    productionRecords: productionRecords.map((record) => ({
      date: record.date,
      flockId: record.flock_id,
      eggsProduced: Number(record.eggs_produced),
    })),
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    targetFeedGramsPerBird: 130,
  }), [dateRange.endDate, dateRange.startDate, mortalities, productionRecords, productiveFlocks, registros]);

  const feedStockMetrics = useMemo(() => calculateFeedStockMetrics({
    activeFlocks: activeProductiveFlocks,
    mortalities,
    inventory: estoque.map((item) => ({
      inventoryTable: item.inventoryTable,
      quantity: item.quantidade,
      unit: item.unidade,
    })),
    currentDate: getTodayDateInputValue(),
    targetFeedGramsPerBird: 130,
  }), [activeProductiveFlocks, estoque, mortalities]);

  const selectableFeedInventory = useMemo(() => estoque.filter((item) =>
    item.inventoryTable === "feed"
    && ["kg", "g"].includes(item.unidade.toLowerCase())
    && (item.quantidade > 0 || item.id === editing?.feedInventoryId)
    && item.unitCost > 0
  ), [editing?.feedInventoryId, estoque]);
  const selectedFeedInventory = useMemo(
    () => selectableFeedInventory.find((item) => item.id === form.feedInventoryId),
    [form.feedInventoryId, selectableFeedInventory],
  );
  const estimatedConsumptionCost = selectedFeedInventory
    ? (Number(form.consumoKg) || 0) * (selectedFeedInventory.unidade.toLowerCase() === "g" ? 1000 : 1) * selectedFeedInventory.unitCost
    : 0;

  // Store daily consumption for "today" KPI
  const consumoHoje = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return registros.filter((r) => r.data === today).reduce((s, r) => s + r.consumoKg, 0);
  }, [registros]);

  /* KPIs */
  const kpis = useMemo(() => {
    const totalConsumo = registros.reduce((s, r) => s + r.consumoKg, 0);
    const totalCusto = registros.reduce((s, r) => s + r.custoRS, 0);
    const custoPorKg = totalConsumo > 0 ? (totalCusto / totalConsumo) : 0;
    const estoqueBaixo = estoque.filter((item) => {
      const status = getEffectiveStockStatus(item);
      return status === "baixo" || status === "alerta";
    }).length;
    const custoPerOvo = totalEggs > 0 ? totalCusto / totalEggs : 0;

    const numDays = registros.length > 0 ? new Set(registros.map((r) => r.data)).size : 1;
    const avgConsumoDiario = totalConsumo / numDays;

    const metaConsumoDiario = avgConsumoDiario > 0 ? Math.round(avgConsumoDiario) : 0;
    const metaConsumoPorGalinha = 120;
    const minConsumoPorGalinha = 110;
    const maxConsumoPorGalinha = 130;
    const metaCustoOvo = 0.04;

    const diffConsumo = metaConsumoDiario > 0 ? ((consumoHoje / metaConsumoDiario) * 100) - 100 : 0;
    const diffConsumoGalinha = metaConsumoPorGalinha > 0 ? ((avgConsumoPorGalinha / metaConsumoPorGalinha) * 100) - 100 : 0;

    return [
      {
        title: "Consumo Diário",
        value: consumoHoje > 0 ? consumoHoje.toFixed(0) + " kg" : "—",
        icon: Wheat,
        iconBg: "bg-brand-50",
        iconColor: "text-brand-600",
        actual: consumoHoje,
        expectedVal: metaConsumoDiario,
        expectedLabel: metaConsumoDiario > 0 ? metaConsumoDiario + " kg" : "—",
        unit: "kg",
        progress: metaConsumoDiario > 0 ? Math.min((consumoHoje / metaConsumoDiario) * 100, 100) : 0,
        progressColor: metaConsumoDiario === 0 ? "bg-gray-300" : consumoHoje <= metaConsumoDiario ? "bg-emerald-500" : consumoHoje <= metaConsumoDiario * 1.1 ? "bg-amber-500" : "bg-red-500",
        diff: diffConsumo,
        diffLabel: metaConsumoDiario > 0 ? `${diffConsumo > 0 ? "+" : ""}${diffConsumo.toFixed(1)}%` : "—",
        subtitle: metaConsumoDiario > 0 ? `${((consumoHoje / metaConsumoDiario) * 100).toFixed(0)}% da média` : "Sem dados",
      },
      {
        title: "Custo Total",
        value: totalCusto > 0 ? `R$ ${totalCusto.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—",
        icon: DollarSign,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        actual: totalCusto,
        expectedVal: totalCusto,
        expectedLabel: custoPorKg > 0 ? `R$ ${custoPorKg.toFixed(2).replace(".", ",")}/kg` : "—",
        unit: "",
        progress: 50,
        progressColor: "bg-amber-500",
        diff: 0,
        diffLabel: custoPorKg > 0 ? `R$ ${custoPorKg.toFixed(2)}/kg` : "—",
        subtitle: `${totalConsumo.toFixed(0)} kg no período`,
      },
      {
        title: "Consumo / Galinha",
        value: avgConsumoPorGalinha > 0 ? avgConsumoPorGalinha.toFixed(0) + " g" : "—",
        icon: Activity,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        actual: avgConsumoPorGalinha,
        expectedVal: metaConsumoPorGalinha,
        expectedLabel: `${minConsumoPorGalinha}-${maxConsumoPorGalinha} g`,
        unit: "g",
        progress: avgConsumoPorGalinha > 0 ? Math.min((avgConsumoPorGalinha / maxConsumoPorGalinha) * 100, 100) : 0,
        progressColor:
          avgConsumoPorGalinha === 0
            ? "bg-gray-300"
            : avgConsumoPorGalinha < minConsumoPorGalinha
              ? "bg-amber-500"
              : avgConsumoPorGalinha <= maxConsumoPorGalinha
                ? "bg-emerald-500"
                : "bg-red-500",
        diff: diffConsumoGalinha,
        diffLabel: avgConsumoPorGalinha > 0 ? `${diffConsumoGalinha > 0 ? "+" : ""}${diffConsumoGalinha.toFixed(1)}%` : "—",
        subtitle:
          avgConsumoPorGalinha === 0
            ? "Sem dados"
            : avgConsumoPorGalinha < minConsumoPorGalinha
              ? "Abaixo da meta 110-130g"
              : avgConsumoPorGalinha <= maxConsumoPorGalinha
                ? "Ideal: 110-130g"
                : "Acima da meta 110-130g",
      },
      {
        title: "Custo / Ovo",
        value: custoPerOvo > 0 ? `R$ ${custoPerOvo.toFixed(3).replace(".", ",")}` : "—",
        icon: Target,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        actual: custoPerOvo,
        expectedVal: metaCustoOvo,
        expectedLabel: "R$ " + metaCustoOvo.toFixed(2),
        unit: "",
        progress: custoPerOvo > 0 ? Math.min((custoPerOvo / (metaCustoOvo * 1.5)) * 100, 100) : 0,
        progressColor: custoPerOvo <= metaCustoOvo ? "bg-emerald-500" : custoPerOvo <= metaCustoOvo * 1.2 ? "bg-amber-500" : "bg-red-500",
        diff: custoPerOvo > 0 && metaCustoOvo > 0 ? ((custoPerOvo / metaCustoOvo) * 100) - 100 : 0,
        diffLabel: custoPerOvo > 0 ? `${((custoPerOvo / metaCustoOvo) * 100) - 100 > 0 ? "+" : ""}${(((custoPerOvo / metaCustoOvo) * 100) - 100).toFixed(1)}%` : "—",
        subtitle: `${estoqueBaixo} itens em alerta`,
      },
    ];
  }, [registros, estoque, totalEggs, consumoHoje, avgConsumoPorGalinha, getEffectiveStockStatus]);

  /* Insights */
  const insights = useMemo(() => {
    const arr: { type: "success" | "warning" | "info"; title: string; action: string }[] = [];
    const estoqueBaixo = estoque.filter((item) => getEffectiveStockStatus(item) === "baixo");
    const estoqueAlerta = estoque.filter((item) => getEffectiveStockStatus(item) === "alerta");

    if (estoqueBaixo.length > 0) {
      arr.push({ type: "warning", title: `${estoqueBaixo.length} itens com estoque crítico`, action: `Repor urgente: ${estoqueBaixo.map(e => e.nome).join(", ")}` });
    }

    if (estoqueAlerta.length > 0) {
      arr.push({ type: "warning", title: `${estoqueAlerta.length} itens em nível de alerta`, action: `Programar reposição: ${estoqueAlerta.map(e => e.nome).join(", ")}` });
    }

    const avgCusto = registros.length > 0 ? registros.reduce((s, r) => s + r.custoRS, 0) / registros.length : 0;
    if (avgCusto > 50) {
      arr.push({ type: "warning", title: "Custo médio por registro acima de R$ 50", action: "Avaliar fornecedores alternativos ou negociar preços" });
    } else {
      arr.push({ type: "success", title: "Custo médio dentro do esperado", action: "Manter fornecedores e fórmula atual" });
    }

    return arr;
  }, [registros, estoque, getEffectiveStockStatus]);
  const feedHealth = useMemo(() => {
    const lowStockCount = estoque.filter((item) => getEffectiveStockStatus(item) === "baixo").length;
    const alertStockCount = estoque.filter((item) => getEffectiveStockStatus(item) === "alerta").length;
    const totalProblems = lowStockCount + alertStockCount;

    return {
      score: totalProblems === 0 ? 92 : totalProblems <= 2 ? 65 : 35,
      lowStockCount,
    };
  }, [estoque, getEffectiveStockStatus]);
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
  const farmHealthSummary = `Consumo: ${consumoHoje.toFixed(0)} kg/dia | Meta: ${kpis[0]?.expectedLabel ?? "—"} | Estoque: ${feedHealth.lowStockCount} críticos`;

  const filteredRegistros = useMemo(() => {
    if (!searchQuery.trim()) return registros;
    const q = searchQuery.toLowerCase();
    return registros.filter(r =>
      r.aviario.toLowerCase().includes(q) ||
      r.data.includes(q) ||
      tipoLabel[r.tipo].toLowerCase().includes(q)
    );
  }, [registros, searchQuery]);

  function closeFeedModal() {
    setFeedFormError(null);
    setModal(null);
  }

  function openAdd() {
    setForm({ data: getTodayDateInputValue(), barn_id: "", flock_id: "", feedInventoryId: "", consumoKg: "" });
    setFeedFormError(null);
    setEditing(null);
    setModal("add");
  }

  function openEdit(r: RegistroRacao) {
    setFeedFormError(null);
    setForm({
      data: r.data,
      barn_id: r.barn_id ?? "",
      flock_id: r.flock_id ?? "",
      feedInventoryId: r.feedInventoryId ?? "",
      consumoKg: String(r.consumoKg),
    });
    setEditing(r);
    setModal("edit");
  }

  async function save() {
    if (!form.data.trim() || !form.flock_id || !form.feedInventoryId || !farmId) return;

    setFeedFormError(null);
    setIsSavingFeed(true);
    try {
      const payload = {
        farmId,
        date: form.data,
        barnId: form.barn_id || null,
        flockId: form.flock_id || null,
        feedInventoryId: form.feedInventoryId,
        quantityKg: Number(form.consumoKg) || 0,
      };

      if (modal === "add") {
        await createFeedRecord(payload);
      } else if (editing) {
        await updateFeedRecord(editing.id as string, payload);
      }
      
      setModal(null);
      await loadData(); // Reload to get fresh data
    } catch (err: unknown) {
      console.error(err);
      setFeedFormError(getErrorMessage(err, "Erro ao salvar registro"));
    } finally {
      setIsSavingFeed(false);
    }
  }

  async function deleteRegistro(id: string | number) {
    if (typeof id !== "string") return;
    setIsLoading(true);
    try {
      await deleteFeedRecord(id);
      setDeleteConfirm(null);
      await loadData();
    } catch (err: unknown) {
      console.error(err);
      alert(getErrorMessage(err, "Erro ao excluir registro"));
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "Data não informada";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Erro ao carregar dados</h2>
        <p className="text-gray-500 mt-1 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-brand-600 text-white rounded-xl cursor-pointer hover:bg-brand-700 transition-colors">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Wheat className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">Gestão de Ração</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">Acompanhe consumo, custos e estoque de alimentação</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <CalendarFilter />
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-3 sm:px-5 py-2 sm:py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20">
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Registrar Consumo</span>
            <span className="sm:hidden">Registrar</span>
          </button>
        </div>
      </div>

      {/* Resumo de Hoje — Saúde Alimentar */}
      {plan === "essencial" ? (
        <LockedOverlay message="Desbloqueie o resumo de saúde alimentar" targetPlan="pro">
          <FarmHealthBanner
            score={feedHealth.score}
            summary={farmHealthSummary}
            insights={farmHealthInsights}
          />
        </LockedOverlay>
      ) : (
        <FarmHealthBanner
          score={feedHealth.score}
          summary={farmHealthSummary}
          insights={farmHealthInsights}
        />
      )}

      {/* Status Cards — Simple Visual Indicators with Progress Bars */}
      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {isLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          (() => {
            const consumoStatus = avgConsumoPorGalinha <= 130 ? "good" : avgConsumoPorGalinha <= 150 ? "high" : "critical";
            const consumoPct = Math.min((avgConsumoPorGalinha / 180) * 100, 100);
            const hasProduction = feedKpiMetrics.registeredProductionDays > 0 && feedKpiMetrics.productionGoalAverage > 0;
            const producaoAtual = feedKpiMetrics.productionAverage;
            const producaoMeta = feedKpiMetrics.productionGoalAverage;
            const producaoPct = hasProduction ? Math.min(feedKpiMetrics.productionPerformancePercent / 1.1, 100) : 0;
            const producaoStatus = !hasProduction ? "neutral" : feedKpiMetrics.productionPerformancePercent >= 90 ? "good" : feedKpiMetrics.productionPerformancePercent >= 80 ? "attention" : "bad";
            const hasEfficiency = feedKpiMetrics.comparablePairCount > 0 && feedKpiMetrics.idealEfficiencyKgPerEgg > 0;
            const eficiencia = feedKpiMetrics.efficiencyKgPerEgg;
            const eficienciaIdeal = feedKpiMetrics.idealEfficiencyKgPerEgg;
            const eficienciaStatus = !hasEfficiency ? "neutral" : eficiencia <= eficienciaIdeal ? "good" : eficiencia <= eficienciaIdeal * 1.1 ? "attention" : "bad";
            const efficiencyScaleMaximum = eficienciaIdeal > 0 ? eficienciaIdeal * 1.3 : 1;
            const eficienciaPct = hasEfficiency ? Math.min((eficiencia / efficiencyScaleMaximum) * 100, 100) : 0;
            const totalEstoqueKg = feedStockMetrics.stockKg;
            const feedDaysLeft = feedStockMetrics.coverageDays;
            const hasStockCoverage = feedStockMetrics.dailyNeedKg > 0;
            const estoquePct = Math.min((feedDaysLeft / 14) * 100, 100);

            return (
              <>
                {/* Consumo */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5 sm:mb-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <Wheat className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                    </div>
                    <span className="text-xs font-semibold text-gray-500">Consumo</span>
                  </div>
                  <p className={cn("text-lg font-bold", consumoStatus === "good" ? "text-emerald-700" : consumoStatus === "high" ? "text-amber-700" : "text-red-700")}>
                    {consumoStatus === "good" ? "Normal" : consumoStatus === "high" ? "Acima do ideal" : "Muito alto"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 mb-2.5">{avgConsumoPorGalinha.toFixed(0)}g por ave/dia</p>
                  <div className="relative mt-1">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", consumoStatus === "good" ? "bg-emerald-500" : consumoStatus === "high" ? "bg-amber-500" : "bg-red-500")} style={{ width: `${consumoPct}%` }} />
                    </div>
                    <div className="absolute top-[-3px] w-0.5 h-4 bg-gray-800 rounded-full" style={{ left: `${(130 / 180) * 100}%` }} title="Meta: 130g" />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                      <span className="text-[10px] text-gray-500 font-medium">Meta: 130g</span>
                    </div>
                    <span className={cn("text-[10px] font-semibold", consumoStatus === "good" ? "text-emerald-600" : "text-red-500")}>
                      {consumoStatus === "good" ? "Dentro" : "Acima"}
                    </span>
                  </div>
                </div>

                {/* Produção */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5 sm:mb-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                    </div>
                    <span className="text-xs font-semibold text-gray-500">Produção</span>
                  </div>
                  <p className={cn("text-lg font-bold", producaoStatus === "good" ? "text-emerald-700" : producaoStatus === "attention" ? "text-amber-700" : producaoStatus === "bad" ? "text-red-700" : "text-gray-500")}>
                    {producaoStatus === "good" ? "Normal" : producaoStatus === "attention" ? "Atenção" : producaoStatus === "bad" ? "Abaixo do esperado" : "Sem dados"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 mb-2.5">
                    {hasProduction ? `${Math.round(producaoAtual).toLocaleString("pt-BR")} ovos/dia` : "Nenhuma produção registrada"}
                  </p>
                  <div className="relative mt-1">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", producaoStatus === "good" ? "bg-emerald-500" : producaoStatus === "attention" ? "bg-amber-500" : producaoStatus === "bad" ? "bg-red-500" : "bg-gray-300")} style={{ width: `${producaoPct}%` }} />
                    </div>
                    {hasProduction && <div className="absolute top-[-3px] w-0.5 h-4 bg-gray-800 rounded-full" style={{ left: "90.9%" }} title={`Meta: ${Math.round(producaoMeta).toLocaleString("pt-BR")}`} />}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                      <span className="text-[10px] text-gray-500 font-medium">Meta: {hasProduction ? Math.round(producaoMeta).toLocaleString("pt-BR") : "—"}</span>
                    </div>
                    <span className={cn("text-[10px] font-semibold", producaoStatus === "good" ? "text-emerald-600" : producaoStatus === "attention" ? "text-amber-600" : producaoStatus === "bad" ? "text-red-500" : "text-gray-400")}>
                      {hasProduction ? `${feedKpiMetrics.productionPerformancePercent.toFixed(0)}% · ${feedKpiMetrics.registeredProductionDays}/${feedKpiMetrics.totalPeriodDays} dias` : `0/${feedKpiMetrics.totalPeriodDays} dias`}
                    </span>
                  </div>
                </div>

                {/* Eficiência */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5 sm:mb-3">
                    <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0", eficienciaStatus === "good" ? "bg-emerald-50" : eficienciaStatus === "attention" ? "bg-amber-50" : eficienciaStatus === "bad" ? "bg-red-50" : "bg-gray-100")}>
                      <Activity className={cn("w-4 h-4 sm:w-5 sm:h-5", eficienciaStatus === "good" ? "text-emerald-600" : eficienciaStatus === "attention" ? "text-amber-600" : eficienciaStatus === "bad" ? "text-red-600" : "text-gray-500")} />
                    </div>
                    <span className="text-xs font-semibold text-gray-500">Eficiência</span>
                  </div>
                  <p className={cn("text-lg font-bold", eficienciaStatus === "good" ? "text-emerald-700" : eficienciaStatus === "attention" ? "text-amber-700" : eficienciaStatus === "bad" ? "text-red-700" : "text-gray-500")}>
                    {eficienciaStatus === "good" ? "Boa" : eficienciaStatus === "attention" ? "Atenção" : eficienciaStatus === "bad" ? "Ruim" : "Sem dados"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 mb-2.5">
                    {hasEfficiency ? `${eficiencia.toFixed(3).replace(".", ",")} kg de ração/ovo` : "Sem lote-dia comparável"}
                  </p>
                  <div className="relative mt-1">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", eficienciaStatus === "good" ? "bg-emerald-500" : eficienciaStatus === "attention" ? "bg-amber-500" : eficienciaStatus === "bad" ? "bg-red-500" : "bg-gray-300")} style={{ width: `${eficienciaPct}%` }} />
                    </div>
                    {hasEfficiency && <div className="absolute top-[-3px] w-0.5 h-4 bg-gray-800 rounded-full" style={{ left: `${(eficienciaIdeal / efficiencyScaleMaximum) * 100}%` }} title={`Ideal: ${eficienciaIdeal.toFixed(3)}`} />}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                      <span className="text-[10px] text-gray-500 font-medium">Ideal: {hasEfficiency ? eficienciaIdeal.toFixed(3).replace(".", ",") : "—"}</span>
                    </div>
                    <span className={cn("text-[10px] font-semibold", eficienciaStatus === "good" ? "text-emerald-600" : eficienciaStatus === "attention" ? "text-amber-500" : eficienciaStatus === "bad" ? "text-red-500" : "text-gray-400")}>
                      {hasEfficiency ? `${feedKpiMetrics.comparablePairCount} lote-dias` : "Sem cobertura"}
                    </span>
                  </div>
                </div>

                {/* Estoque */}
                <div className={cn(
                  "rounded-2xl border p-4 sm:p-5 hover:shadow-md transition-all duration-200",
                  !hasStockCoverage ? "bg-white border-gray-100" : feedDaysLeft > 7 ? "bg-white border-gray-100" : feedDaysLeft > 3 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
                )}>
                  <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5 sm:mb-3">
                    <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0", !hasStockCoverage ? "bg-gray-100" : feedDaysLeft > 7 ? "bg-blue-50" : feedDaysLeft > 3 ? "bg-amber-100" : "bg-red-100")}>
                      <Package className={cn("w-4 h-4 sm:w-5 sm:h-5", !hasStockCoverage ? "text-gray-500" : feedDaysLeft > 7 ? "text-blue-600" : feedDaysLeft > 3 ? "text-amber-600" : "text-red-600")} />
                    </div>
                    <span className="text-xs font-semibold text-gray-500">Estoque</span>
                  </div>
                  <p className={cn("text-lg font-bold", !hasStockCoverage ? "text-gray-500" : feedDaysLeft > 7 ? "text-blue-700" : feedDaysLeft > 3 ? "text-amber-700" : "text-red-700")}>
                    {hasStockCoverage ? `Dura ${feedDaysLeft} dias` : "Sem estimativa"}
                  </p>
                  {hasStockCoverage && feedDaysLeft <= 7 ? (
                    <p className="text-xs text-amber-600 font-semibold mt-0.5 mb-2.5">Compre em breve</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5 mb-2.5">{totalEstoqueKg.toLocaleString("pt-BR")} kg em estoque</p>
                  )}
                  <div className="relative mt-1">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", !hasStockCoverage ? "bg-gray-300" : feedDaysLeft > 7 ? "bg-blue-500" : feedDaysLeft > 3 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${hasStockCoverage ? estoquePct : 0}%` }} />
                    </div>
                    {hasStockCoverage && <div className="absolute top-[-3px] w-0.5 h-4 bg-gray-800 rounded-full" style={{ left: `${(7 / 14) * 100}%` }} title="Mínimo: 7 dias" />}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                      <span className="text-[10px] text-gray-500 font-medium">Mínimo: 7 dias</span>
                    </div>
                    <span className={cn("text-[10px] font-semibold", !hasStockCoverage ? "text-gray-400" : feedDaysLeft > 7 ? "text-blue-600" : "text-amber-500")}>
                      {hasStockCoverage ? `${feedDaysLeft} dias` : "—"}
                    </span>
                  </div>
                </div>
              </>
            );
          })()
        )}
      </div>

      {/* Chart + Assistente + Financeiro — aligned under KPIs */}
      {(showProFeatures || showPremiumFeatures) && (
      <div className={cn("grid grid-cols-1 gap-3 sm:gap-4", showPremiumFeatures ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        {/* Consumo Ração x Água — under Consumo + Produção KPIs (2 cols) */}
        {showProFeatures && (
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
          {plan === "essencial" ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Wheat className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Consumo Ração x Água</h3>
                    <p className="text-[11px] text-gray-400">Comparativo diário</p>
                  </div>
                </div>
                <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
              </div>
              <LockedOverlay message="Desbloqueie o comparativo de consumo" targetPlan="pro">
                <div className="h-[200px] bg-gray-50 rounded-xl flex items-end justify-around px-4 pb-4 pt-2 gap-2">
                  {[65, 45, 80, 55, 70, 40, 75].map((h, i) => (
                    <div key={i} className="flex gap-1 items-end flex-1">
                      <div className="flex-1 rounded-t bg-orange-300/60" style={{ height: `${h}%` }} />
                      <div className="flex-1 rounded-t bg-blue-300/60" style={{ height: `${h * 0.7}%` }} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-5 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="text-[10px] font-medium text-gray-500">Ração (kg)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-medium text-gray-500">Água (L)</span>
                  </div>
                </div>
              </LockedOverlay>
            </>
          ) : (
          (() => {
            const [chartPeriod, setChartPeriod] = useState<"7d" | "30d" | "meses" | "total">("7d");
            const isMonthly = chartPeriod === "meses" || chartPeriod === "total";
            const today = new Date();

            const chartData = (() => {
              if (!isMonthly) {
                const days = chartPeriod === "7d" ? 7 : 30;
                return Array.from({ length: days }, (_, i) => {
                  const d = new Date(today);
                  d.setDate(d.getDate() - (days - 1 - i));
                  const dateStr = d.toISOString().split("T")[0];
                  const dayRegistros = registros.filter(r => r.data === dateStr);
                  const racaoKg = dayRegistros.reduce((s, r) => s + r.consumoKg, 0);
                  const aguaLt = waterRecords
                    .filter((record) => record.date === dateStr)
                    .reduce((sum, record) => sum + Number(record.quantity_liters), 0);
                  return {
                    date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                    racao: racaoKg,
                    agua: aguaLt,
                  };
                });
              }
              // Monthly aggregation
              const monthCount = chartPeriod === "meses" ? 6 : 12;
              const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
              return Array.from({ length: monthCount }, (_, i) => {
                const d = new Date(today.getFullYear(), today.getMonth() - (monthCount - 1 - i), 1);
                const year = d.getFullYear();
                const month = d.getMonth();
                const monthStr = String(month + 1).padStart(2, "0");
                const prefix = `${year}-${monthStr}`;
                const monthRegistros = registros.filter(r => r.data.startsWith(prefix));
                const racaoKg = monthRegistros.reduce((s, r) => s + r.consumoKg, 0);
                const aguaLt = waterRecords
                  .filter((record) => record.date.startsWith(prefix))
                  .reduce((sum, record) => sum + Number(record.quantity_liters), 0);
                return {
                  date: `${monthNames[month]}/${String(year).slice(2)}`,
                  racao: racaoKg,
                  agua: aguaLt,
                };
              });
            })();
            return (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                      <Wheat className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Consumo Ração x Água</h3>
                      <p className="text-[11px] text-gray-400">Comparativo diário</p>
                    </div>
                  </div>
                  <div className="inline-flex rounded-xl bg-gray-100 p-1 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: "none" }}>
                    {[
                      { id: "7d" as const, label: "Últimos 7 dias" },
                      { id: "30d" as const, label: "Últimos 30 dias" },
                      { id: "meses" as const, label: "Meses" },
                      { id: "total" as const, label: "Tempo total" },
                    ].map((option) => (
                      <button key={option.id} type="button" onClick={() => setChartPeriod(option.id)} className={cn("rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-colors cursor-pointer whitespace-nowrap", chartPeriod === option.id ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="racaoFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="aguaFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "11px" }} formatter={(value: unknown, name: unknown) => [name === "racao" ? `${value} kg` : `${value} L`, name === "racao" ? "Ração" : "Água"]} />
                      <Area type="monotone" dataKey="racao" stroke="#f97316" strokeWidth={2} fill="url(#racaoFill)" name="racao" />
                      <Area type="monotone" dataKey="agua" stroke="#3b82f6" strokeWidth={2} fill="url(#aguaFill)" name="agua" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-5 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="text-[10px] font-medium text-gray-500">Ração (kg)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-medium text-gray-500">Água (L)</span>
                  </div>
                </div>
              </>
            );
          })()
          )}
        </div>

        )}

        {/* Assistente de Granja — under Eficiência */}
        {showPremiumFeatures && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm"><Zap className="w-4 h-4 text-white" /></div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Assistente de Granja</h3>
                <p className="text-[11px] text-gray-400 font-medium">Baseado nos dados do período</p>
              </div>
            </div>
            <RequiredPlanBadge requiredPlan="premium" className="flex-shrink-0 px-2 py-0.5 text-[10px]" />
          </div>
          {plan !== "premium" ? (
            <AssistantLockedPreview lockedMessage="Desbloqueie o Assistente de Granja" />
          ) : (
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {insights.map((ins, i) => {
              const link = insightHref(`${ins.title} ${ins.action}`);
              if (false) {
                return (
                  <LockedOverlay key={i} message="Desbloqueie o Assistente de Granja" targetPlan="premium">
                    <div className={cn("p-3 rounded-xl border-l-[3px]", ins.type === "success" && "bg-emerald-50/50 border-l-emerald-500", ins.type === "warning" && "bg-amber-50/50 border-l-amber-500", ins.type === "info" && "bg-blue-50/50 border-l-blue-500")}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", ins.type === "success" && "bg-emerald-100", ins.type === "warning" && "bg-amber-100", ins.type === "info" && "bg-blue-100")}>
                          {ins.type === "success" && <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />}
                          {ins.type === "warning" && <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />}
                          {ins.type === "info" && <Lightbulb className="w-2.5 h-2.5 text-blue-600" />}
                        </div>
                        <span className="text-xs font-semibold text-gray-800">{ins.title}</span>
                      </div>
                      <p className={cn("text-[11px] font-medium ml-7", ins.type === "success" ? "text-emerald-600" : ins.type === "warning" ? "text-amber-600" : "text-blue-600")}>→ {ins.action}</p>
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
                  <p className={cn("text-[11px] font-medium", ins.type === "success" ? "text-emerald-600" : ins.type === "warning" ? "text-amber-600" : "text-blue-600")}>→ {ins.action}</p>
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

        {/* Resumo Financeiro — compact 2x2 grid, under Estoque */}
        {showProFeatures && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <DollarSign className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-gray-900">Resumo de Custos da Ração</h3>
              <p className="text-[11px] text-gray-400 font-medium">Custos do consumo no período</p>
            </div>
            <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0 px-2 py-0.5 text-[10px]" />
          </div>
          {(() => {
            const current = feedFinancialMetrics?.current;
            const previous = feedFinancialMetrics?.previous;
            const financeCards = [
              {
                label: "Custo/Dúzia",
                value: formatFeedCurrency(current?.costPerDozen),
                detail: `${current?.comparableEggs.toLocaleString("pt-BR") ?? 0} ovos comparáveis`,
                currentValue: current?.costPerDozen,
                previousValue: previous?.costPerDozen,
                lowerIsBetter: true,
                description: "Custo alimentar necessário para produzir doze ovos nos mesmos lotes e datas com consumo registrado.",
                formula: "Custo alimentar/ovo × 12",
                icon: DollarSign,
                iconBg: "bg-orange-50",
                iconColor: "text-orange-600",
              },
              {
                label: "Custo/kg",
                value: formatFeedCurrency(current?.costPerKg),
                detail: `${current?.totalFeedKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) ?? 0} kg consumidos`,
                currentValue: current?.costPerKg,
                previousValue: previous?.costPerKg,
                lowerIsBetter: true,
                description: "Custo médio de cada quilograma de ração efetivamente consumido no período.",
                formula: "Custo total do consumo ÷ Quilogramas consumidos",
                icon: Wheat,
                iconBg: "bg-orange-50",
                iconColor: "text-orange-600",
              },
              {
                label: "Custo Alimentar/Ovo",
                value: formatFeedCurrency(current?.costPerEgg),
                detail: "Somente lotes-dias comparáveis",
                currentValue: current?.costPerEgg,
                previousValue: previous?.costPerEgg,
                lowerIsBetter: true,
                description: "Parcela do custo de ração atribuída a cada ovo, considerando apenas consumo e produção com o mesmo lote e data.",
                formula: "Custo da ração comparável ÷ Ovos correspondentes",
                icon: Egg,
                iconBg: "bg-orange-50",
                iconColor: "text-orange-600",
              },
              {
                label: "Custo/Ave/Dia",
                value: formatFeedCurrency(current?.costPerBirdDay),
                detail: `${current?.comparableBirdDays.toLocaleString("pt-BR") ?? 0} aves-dia comparáveis`,
                currentValue: current?.costPerBirdDay,
                previousValue: previous?.costPerBirdDay,
                lowerIsBetter: true,
                description: "Custo médio diário de ração por ave viva nos lotes e datas com produção correspondente.",
                formula: "Custo da ração comparável ÷ Aves vivas-dia",
                icon: Activity,
                iconBg: "bg-orange-50",
                iconColor: "text-orange-600",
              },
            ];
            const grid = (
              <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
                {financeCards.map((c) => {
                  const canCompare = c.currentValue !== undefined && c.previousValue !== undefined;
                  const variation: KpiVariation | null = canCompare
                    ? calculateKpiVariation(c.currentValue ?? 0, c.previousValue ?? 0)
                    : null;
                  const isNewValue = variation?.label === "Novo";
                  const isImprovement = variation?.direction === "up"
                    ? !c.lowerIsBetter
                    : variation?.direction === "down"
                      ? c.lowerIsBetter
                      : isNewValue
                        ? !c.lowerIsBetter
                        : null;
                  return (
                    <div key={c.label} className="bg-gray-50 rounded-xl border border-gray-100 p-3 flex flex-col transition-colors hover:border-gray-200">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0", c.iconBg)}>
                            <c.icon className={cn("w-3 h-3", c.iconColor)} />
                          </div>
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider leading-tight truncate">{c.label}</span>
                        </div>
                        <FeedCostTooltip
                          label={c.label}
                          description={c.description}
                          formula={c.formula}
                        />
                      </div>
                      <p className="text-base font-bold text-gray-900">{c.value}</p>
                      <div className="flex items-center justify-between mt-auto pt-1.5">
                        <span className="text-[9px] text-gray-400 truncate">{c.detail}</span>
                        {variation && (
                          <span className={cn(
                            "inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded-full",
                            isImprovement === true && "text-emerald-600 bg-emerald-50",
                            isImprovement === false && "text-red-600 bg-red-50",
                            isImprovement === null && "text-gray-600 bg-gray-100",
                          )}>
                            {variation.direction === "up" && <ArrowUpRight className="w-2.5 h-2.5" />}
                            {variation.direction === "down" && <ArrowDownRight className="w-2.5 h-2.5" />}
                            {variation.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
            return plan === "essencial" ? (
              <LockedOverlay message="Desbloqueie o resumo financeiro" targetPlan="pro" className="flex-1">
                {grid}
              </LockedOverlay>
            ) : grid;
          })()}
        </div>
        )}
      </div>
      )}

      {/* Charts Row — 2/3 + 1/3 */}
      <div className={cn("grid grid-cols-1 gap-3 sm:gap-4", showProFeatures ? "lg:grid-cols-3" : "lg:grid-cols-1")}>
        {/* Combined Chart — Consumo + Produção + Eficiência — 2/3 */}
        {showProFeatures && (
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Consumo x Produção x Eficiência</h3>
              <p className="text-xs text-gray-400 mt-0.5">Comparativo dos últimos 7 dias</p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-brand-600 flex-shrink-0" />
                <span className="text-[10px] font-medium text-gray-400">Consumo (kg)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500 flex-shrink-0" />
                <span className="text-[10px] font-medium text-gray-400">Produção (ovos)</span>
              </div>
              <div className="flex items-center gap-1.5 relative group">
                <div className="w-5 h-[3px] rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">Eficiência (kg/ovo)</span>
                <button className="w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0">
                  <HelpCircle className="w-2.5 h-2.5 text-gray-500" />
                </button>
                <div className="absolute right-0 top-7 w-60 bg-white rounded-xl border border-gray-200 shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                  <p className="text-[11px] font-semibold text-gray-800 mb-1">O que é Eficiência (kg/ovo)?</p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">Quantidade de ração (kg) necessária para produzir cada ovo. Quanto menor o valor, mais eficiente é a conversão alimentar.</p>
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400">Fórmula: Total Ração (kg) / Total Ovos</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Referência: 0,28 - 0,32 kg/ovo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {plan === "essencial" ? (
            <LockedOverlay message="Desbloqueie o comparativo de consumo, produção e eficiência" targetPlan="pro">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={dailyChart} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradConsumoBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2d7a4f" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#2d7a4f" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="gradOvosBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} dx={-4} domain={[0, 'auto']} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#d97706", fontSize: 10, fontWeight: 600 }} dx={4} domain={[0, 'auto']} tickFormatter={(v: number) => `${v.toFixed(0)}g`} />
                  <ReferenceLine yAxisId="right" y={110} stroke="#10b981" strokeDasharray="4 4" />
                  <ReferenceLine yAxisId="right" y={130} stroke="#ef4444" strokeDasharray="4 4" />
                  <Bar yAxisId="left" dataKey="kg" fill="url(#gradConsumoBar)" radius={[4, 4, 0, 0]} barSize={14} name="kg" />
                  <Bar yAxisId="left" dataKey="ovos" fill="url(#gradOvosBar)" radius={[4, 4, 0, 0]} barSize={14} name="ovos" />
                  <Line yAxisId="right" type="monotone" dataKey="consumoAveG" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: "#fff", stroke: "#f59e0b", strokeWidth: 3 }} name="consumoAveG" />
                </ComposedChart>
              </ResponsiveContainer>
            </LockedOverlay>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={dailyChart} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradConsumoBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2d7a4f" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#2d7a4f" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="gradOvosBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} dx={-4} domain={[0, 'auto']} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#d97706", fontSize: 10, fontWeight: 600 }} dx={4} domain={[0, 'auto']} tickFormatter={(v: number) => `${v.toFixed(0)}g`} />
                <ReferenceLine yAxisId="right" y={110} stroke="#10b981" strokeDasharray="4 4" label={{ value: "110g", position: "right", fill: "#059669", fontSize: 10 }} />
                <ReferenceLine yAxisId="right" y={130} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "130g", position: "right", fill: "#dc2626", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", fontSize: "13px", padding: "14px 18px" }}
                  labelStyle={{ fontWeight: 800, color: "#111827", marginBottom: "8px", fontSize: "14px" }}
                  itemStyle={{ padding: "2px 0" }}
                  formatter={(value: unknown, name: unknown) => {
                    const n = String(name);
                    if (n === "kg") return [Number(value) + " kg", "Consumo"];
                    if (n === "ovos") return [Number(value).toLocaleString("pt-BR") + " ovos", "Produção"];
                    if (n === "consumoAveG") return [Number(value).toFixed(0) + " g/ave", "Consumo / ave"];
                    return [String(value), String(name)];
                  }}
                  cursor={{ fill: "rgba(45, 122, 79, 0.04)" }}
                />
                <Bar yAxisId="left" dataKey="kg" fill="url(#gradConsumoBar)" radius={[4, 4, 0, 0]} barSize={14} name="kg" />
                <Bar yAxisId="left" dataKey="ovos" fill="url(#gradOvosBar)" radius={[4, 4, 0, 0]} barSize={14} name="ovos" />
                <Line yAxisId="right" type="monotone" dataKey="consumoAveG" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: "#fff", stroke: "#f59e0b", strokeWidth: 3 }} activeDot={{ r: 7, fill: "#f59e0b", stroke: "#fff", strokeWidth: 3 }} name="consumoAveG" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
        )}

        {/* Consumo por Tipo — 1/3 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 flex flex-col">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-sm font-bold text-gray-900">Consumo por Tipo</h3>
            <p className="text-xs text-gray-400 mt-0.5">Distribuição por tipo de ração</p>
          </div>
          <div className="flex-1 flex flex-col justify-evenly">
            {distType.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-400 italic">Sem dados de distribuição</div>
            ) : distType.map((item) => (
              <div key={item.tipo}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">{item.tipo}</span>
                    <span className="text-xs text-gray-400">{item.kg} kg</span>
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    item.pct >= 30 ? "text-emerald-600" : item.pct >= 20 ? "text-amber-600" : "text-gray-600"
                  )}>
                    {item.pct}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex-wrap">
              {distType.map((item) => (
                <div key={item.tipo} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.tipo}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Estoque + Consumo Mensal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Itens em Estoque */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900">Itens em Estoque</h3>
              <p className="text-xs text-gray-400 mt-0.5">Status de cada item</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-md whitespace-nowrap">
                {estoque.filter((item) => getEffectiveStockStatus(item) === "normal").length}/{estoque.length} normais
              </span>
              <button onClick={() => setEstoqueModal("add")} className="w-7 h-7 rounded-lg bg-brand-50 hover:bg-brand-100 flex items-center justify-center transition-colors cursor-pointer">
                <Plus className="w-3.5 h-3.5 text-brand-600" />
              </button>
            </div>
          </div>
          <div className="space-y-0 max-h-[320px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {estoque.map((item, i) => (
              <div key={item.id}>
                <button onClick={() => { setViewingEstoque(item); setEditingEstoque(false); setEditEstoqueForm({ nome: item.nome, categoria: item.categoria, quantidade: String(item.quantidade), unidade: item.unidade, fornecedor: item.fornecedor || "", localizacaoId: item.locationId, lote: item.lote || "", dataChegada: item.dataChegada || "", custoUnitario: String(item.unitCost || ""), valorTotal: String(item.valorTotal || "") }); setEstoqueModal("view"); }} className="flex items-center justify-between py-2.5 group cursor-pointer hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors w-full text-left">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      getEffectiveStockStatus(item) === "normal" ? "bg-emerald-50" : getEffectiveStockStatus(item) === "alerta" ? "bg-amber-50" : "bg-red-50"
                    )}>
                      <Package className={cn(
                        "w-4 h-4",
                        getEffectiveStockStatus(item) === "normal" ? "text-emerald-600" : getEffectiveStockStatus(item) === "alerta" ? "text-amber-600" : "text-red-600"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.nome}</p>
                        {isOldStock(item.dataChegada) && (
                          <span className="text-[9px] font-bold text-orange-700 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-0.5 flex-shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            +2 sem
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">{item.categoria}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                    <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">{item.quantidade} {item.unidade}</span>
                    <span className={cn("text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap", statusColor[getEffectiveStockStatus(item)])}>
                      {statusLabel[getEffectiveStockStatus(item)]}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0 hidden sm:block" />
                  </div>
                </button>
                {i < estoque.length - 1 && <div className="border-t border-gray-50" />}
              </div>
            ))}
          </div>
        </div>

        {/* Consumo Mensal — R$ / kg toggle */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Consumo Mensal</h3>
              <p className="text-xs text-gray-400 mt-0.5">{consumoMensalMode === "rs" ? "Custo total por mês" : "Quantidade total por mês"}</p>
            </div>
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setConsumoMensalMode("rs")} className={cn("px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-200 cursor-pointer", consumoMensalMode === "rs" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>R$</button>
              <button onClick={() => setConsumoMensalMode("kg")} className={cn("px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-200 cursor-pointer", consumoMensalMode === "kg" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>kg</button>
            </div>
          </div>
          <div className="flex-1" style={{ minHeight: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={consumoMensalMode === "rs" ? monthlyRS : monthlyKg} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} dx={-4} tickFormatter={(v) => (v / 1000).toFixed(1) + "k"} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                formatter={(value: unknown) => [consumoMensalMode === "rs" ? "R$ " + Number(value).toLocaleString("pt-BR") : Number(value).toLocaleString("pt-BR") + " kg", consumoMensalMode === "rs" ? "Custo" : "Consumo"]}
              />
              <Bar dataKey="valor" fill={consumoMensalMode === "rs" ? "#2d7a4f" : "#3b82f6"} radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Records Table — Production Style */}
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Registros Recentes</h3>
              <p className="text-xs text-gray-400 mt-0.5">{registros.length} registros</p>
            </div>
            <div className="flex items-center gap-2 bg-gray-100/80 rounded-xl px-3 py-2 w-full sm:w-56 transition-colors focus-within:bg-gray-100 focus-within:ring-2 focus-within:ring-brand-500/20">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar registro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none w-full"
              />
            </div>
          </div>
          <div className="overflow-x-auto max-h-[340px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {filteredRegistros.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                  <Wheat className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Nenhum consumo registrado</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-sm">Comece a registrar o consumo de ração para acompanhar custos e eficiência do seu lote.</p>
                <button onClick={openAdd} className="px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors cursor-pointer">
                  Registrar Consumo
                </button>
              </div>
            ) : (
              <table className="w-full min-w-[800px]">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Data</th>
                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Tipo</th>
                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Aviário</th>
                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Consumo</th>
                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        Custo
                        <span className="relative group">
                          <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                          <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 px-3 py-2 text-[11px] font-normal text-white bg-gray-900 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-lg pointer-events-none leading-relaxed">
                            Custo total (R$) da quantidade de ração consumida neste registro.
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900" />
                          </span>
                        </span>
                      </span>
                    </th>
                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        g/Galinha
                        <span className="relative group">
                          <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                          <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 px-3 py-2 text-[11px] font-normal text-white bg-gray-900 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-lg pointer-events-none leading-relaxed">
                            Quantidade de ração consumida dividida pelo número de galinhas (em gramas por ave).
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900" />
                          </span>
                        </span>
                      </span>
                    </th>
                    <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        R$/Galinha
                        <span className="relative group">
                          <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                          <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 px-3 py-2 text-[11px] font-normal text-white bg-gray-900 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-lg pointer-events-none leading-relaxed">
                            Custo total da ração dividido pelo número de galinhas (em R$ por ave).
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900" />
                          </span>
                        </span>
                      </span>
                    </th>
                    <th className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 py-3">Detalhes</th>
                    <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 py-3 pr-6">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistros.map((r) => {
                    const consumoGalinha = r.qtdGalinhas > 0 ? ((r.consumoKg / r.qtdGalinhas) * 1000).toFixed(0) : "—";
                    const custoGalinha = r.qtdGalinhas > 0 ? (r.custoRS / r.qtdGalinhas).toFixed(2).replace(".", ",") : "—";
                    return (
                      <tr key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">{formatDate(r.data)}</td>
                        <td className="px-6 py-4">
                          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap", tipoColor[r.tipo])}>
                            {tipoLabel[r.tipo]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{r.aviario}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{r.consumoKg} kg</td>
                        <td className="px-6 py-4 text-sm text-gray-700">R$ {r.custoRS.toFixed(2).replace(".", ",")}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-sm font-bold",
                            consumoGalinha !== "—" && Number(consumoGalinha) > 150 ? "text-red-600" : consumoGalinha !== "—" && Number(consumoGalinha) > 130 ? "text-amber-600" : "text-emerald-600"
                          )}>
                            {consumoGalinha !== "—" ? consumoGalinha + " g" : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700">{custoGalinha !== "—" ? "R$ " + custoGalinha : "—"}</td>
                        <td className="px-3 py-4 text-center">
                          <Link href={`/dashboard/racao/${r.id}`} className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer">
                            <FileText className="w-4 h-4" />
                          </Link>
                        </td>
                        <td className="px-3 pr-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={closeFeedModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Registrar Consumo" : "Editar Registro"}
              </h2>
              <button onClick={closeFeedModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data</label>
                  <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Item do estoque</label>
                  <select value={form.feedInventoryId} onChange={(e) => { setFeedFormError(null); setForm({ ...form, feedInventoryId: e.target.value }); }} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="">Selecione a ração...</option>
                    {selectableFeedInventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}{item.lote ? ` · lote ${item.lote}` : ""} · {item.quantidade.toLocaleString("pt-BR")} {item.unidade}
                      </option>
                    ))}
                  </select>
                  {selectableFeedInventory.length === 0 && (
                    <p className="text-[10px] text-red-500 mt-1 font-medium">
                      Cadastre uma ração em kg ou g, com saldo e custo unitário, antes de registrar o consumo.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lote</label>
                <select
                  value={form.flock_id}
                  onChange={(e) => {
                    const fId = e.target.value;
                    const flock = flocks.find(f => f.id === fId);
                    setForm({
                       ...form,
                       flock_id: fId,
                       barn_id: flock?.barnId || "",
                    });
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer"
                >
                  <option value="">Selecione um lote...</option>
                  {flocks.map((f) => (
                    <option key={f.id} value={f.id}>{f.code}{f.breed ? ` — ${f.breed}` : ""}</option>
                  ))}
                </select>
                {flocks.length === 0 && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium italic">
                    Nenhum lote cadastrado. Você precisa cadastrar um lote antes de registrar o consumo.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Consumo Ração (kg)</label>
                <input type="number" min="0.01" step="0.01" value={form.consumoKg} onChange={(e) => { setFeedFormError(null); setForm({ ...form, consumoKg: e.target.value }); }} placeholder="120" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                {selectedFeedInventory && Number(form.consumoKg) > 0 && (
                  <p className="text-[10px] text-gray-500 mt-1 font-medium">
                    Custo calculado: {estimatedConsumptionCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                )}
                {feedFormError && (
                  <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{feedFormError}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={closeFeedModal} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button
                onClick={save}
                disabled={isSavingFeed || !form.data || !form.flock_id || !form.feedInventoryId || Number(form.consumoKg) <= 0}
                className={cn(
                  "inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm",
                  !isSavingFeed && form.data && form.flock_id && form.feedInventoryId && Number(form.consumoKg) > 0
                    ? "text-white bg-brand-600 hover:bg-brand-700"
                    : "text-gray-400 bg-gray-200 cursor-not-allowed"
                )}
              >
                <Check className="w-4 h-4" />
                {isSavingFeed ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Confirmar exclusão</h3>
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={() => deleteRegistro(deleteConfirm)} className="px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Estoque Modal — Add */}
      {estoqueModal === "add" && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setEstoqueModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Adicionar Item ao Estoque</h2>
              <button onClick={() => setEstoqueModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome do Item</label>
                <input type="text" value={estoqueForm.nome} onChange={(e) => setEstoqueForm({ ...estoqueForm, nome: e.target.value })} placeholder="Ex: Farelo de Milho" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Categoria</label>
                <select value={estoqueForm.categoria} onChange={(e) => setEstoqueForm({ ...estoqueForm, categoria: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                  <option value="Ração">Ração</option>
                  <option value="Insumo">Insumo</option>
                  <option value="Suplemento">Suplemento</option>
                  <option value="Mineral">Mineral</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantidade</label>
                  <input type="number" value={estoqueForm.quantidade} onChange={(e) => setEstoqueForm({ ...estoqueForm, quantidade: e.target.value })} placeholder="500" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unidade</label>
                  <select value={estoqueForm.unidade} onChange={(e) => setEstoqueForm({ ...estoqueForm, unidade: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="un">un</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fornecedor</label>
                  <input type="text" value={estoqueForm.fornecedor} onChange={(e) => setEstoqueForm({ ...estoqueForm, fornecedor: e.target.value })} placeholder="Ex: AgroMix Ltda" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Localização</label>
                  <select value={estoqueForm.localizacaoId} onChange={(e) => setEstoqueForm({ ...estoqueForm, localizacaoId: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="">Sem local definido</option>
                    {storageLocations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nº Lote</label>
                  <input type="text" value={estoqueForm.lote} onChange={(e) => setEstoqueForm({ ...estoqueForm, lote: e.target.value })} placeholder="Ex: RM-2024-01" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data de Chegada</label>
                  <input type="date" value={estoqueForm.dataChegada} onChange={(e) => setEstoqueForm({ ...estoqueForm, dataChegada: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Custo Unitário (R$)</label>
                  <input type="number" min="0" step="0.000001" value={estoqueForm.custoUnitario} onChange={(e) => setEstoqueForm({ ...estoqueForm, custoUnitario: e.target.value })} placeholder="0,00" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Valor Total (R$)</label>
                  <input type="number" min="0" step="0.01" value={estoqueForm.valorTotal} onChange={(e) => setEstoqueForm({ ...estoqueForm, valorTotal: e.target.value })} placeholder="0,00" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setEstoqueModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button
                onClick={async () => {
                  if (!estoqueForm.nome.trim() || Number(estoqueForm.quantidade) <= 0 || Number(estoqueForm.custoUnitario) <= 0 || !farmId) return;
                  setIsLoading(true);
                  try {
                    await createInventoryItem({
                      farm_id: farmId,
                      name: estoqueForm.nome,
                      category: estoqueForm.categoria,
                      quantity: Number(estoqueForm.quantidade) || 0,
                      unit: estoqueForm.unidade,
                      supplier: estoqueForm.fornecedor || null,
                      location_id: estoqueForm.localizacaoId || undefined,
                      lot_number: estoqueForm.lote || null,
                      arrival_date: estoqueForm.dataChegada || null,
                      unit_cost: Number(estoqueForm.custoUnitario),
                      total_cost: Number(estoqueForm.valorTotal) || Number(estoqueForm.quantidade) * Number(estoqueForm.custoUnitario),
                    });
                    setEstoqueForm({ nome: "", categoria: "Ração", quantidade: "", unidade: "kg", fornecedor: "", localizacaoId: "", lote: "", dataChegada: "", custoUnitario: "", valorTotal: "" });
                    setEstoqueModal(null);
                    await loadData();
                  } catch (err) {
                    console.error(err);
                    alert("Erro ao salvar item");
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={!estoqueForm.nome.trim() || Number(estoqueForm.quantidade) <= 0 || Number(estoqueForm.custoUnitario) <= 0}
                className={cn(
                  "inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm",
                  estoqueForm.nome.trim() && Number(estoqueForm.quantidade) > 0 && Number(estoqueForm.custoUnitario) > 0
                    ? "text-white bg-brand-600 hover:bg-brand-700"
                    : "text-gray-400 bg-gray-200 cursor-not-allowed"
                )}
              >
                <Check className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Estoque Modal — View/Edit Details */}
      {estoqueModal === "view" && viewingEstoque && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { setEstoqueModal(null); setViewingEstoque(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Detalhes do Item</h3>
              <button onClick={() => { setEstoqueModal(null); setViewingEstoque(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {editingEstoque ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nome</label>
                  <input
                    type="text"
                    value={editEstoqueForm.nome}
                    onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, nome: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Categoria</label>
                    <select value={editEstoqueForm.categoria} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, categoria: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all bg-white cursor-pointer">
                      <option value="Ração">Ração</option>
                      <option value="Insumo">Insumo</option>
                      <option value="Suplemento">Suplemento</option>
                      <option value="Mineral">Mineral</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Unidade</label>
                    <select value={editEstoqueForm.unidade} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, unidade: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all bg-white cursor-pointer">
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="un">un</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Quantidade</label>
                  <input
                    type="number"
                    value={editEstoqueForm.quantidade}
                    onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, quantidade: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Fornecedor</label>
                    <input type="text" value={editEstoqueForm.fornecedor} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, fornecedor: e.target.value })} placeholder="Ex: AgroMix Ltda" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Localização</label>
                    <select value={editEstoqueForm.localizacaoId} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, localizacaoId: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all bg-white cursor-pointer">
                      <option value="">Sem local definido</option>
                      {storageLocations.map((location) => (
                        <option key={location.id} value={location.id}>{location.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nº Lote</label>
                    <input type="text" value={editEstoqueForm.lote} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, lote: e.target.value })} placeholder="Ex: RM-2024-01" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Data de Chegada</label>
                    <input type="date" value={editEstoqueForm.dataChegada} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, dataChegada: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Custo Unitário (R$)</label>
                    <input type="number" min="0" step="0.000001" value={editEstoqueForm.custoUnitario} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, custoUnitario: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Valor Total (R$)</label>
                    <input type="number" min="0" step="0.01" value={editEstoqueForm.valorTotal} onChange={(e) => setEditEstoqueForm({ ...editEstoqueForm, valorTotal: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setEditingEstoque(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!farmId || Number(editEstoqueForm.quantidade) <= 0 || Number(editEstoqueForm.custoUnitario) <= 0) return;
                      setIsLoading(true);
                      try {
                        await updateInventoryItem(viewingEstoque.id, {
                          name: editEstoqueForm.nome.trim() || viewingEstoque.nome,
                          category: editEstoqueForm.categoria || viewingEstoque.categoria,
                          quantity: Number(editEstoqueForm.quantidade) || viewingEstoque.quantidade,
                          unit: editEstoqueForm.unidade || viewingEstoque.unidade,
                          supplier: editEstoqueForm.fornecedor || null,
                          location_id: editEstoqueForm.localizacaoId || undefined,
                          lot_number: editEstoqueForm.lote || null,
                          arrival_date: editEstoqueForm.dataChegada || null,
                          unit_cost: Number(editEstoqueForm.custoUnitario),
                          total_cost: Number(editEstoqueForm.valorTotal) || Number(editEstoqueForm.quantidade) * Number(editEstoqueForm.custoUnitario),
                        });
                        setEditingEstoque(false);
                        await loadData();
                        setEstoqueModal(null);
                        setViewingEstoque(null);
                      } catch (err) {
                        console.error(err);
                        alert("Erro ao atualizar item");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={Number(editEstoqueForm.quantidade) <= 0 || Number(editEstoqueForm.custoUnitario) <= 0}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors cursor-pointer shadow-sm"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    viewingEstoque.status === "normal" ? "bg-emerald-50" : viewingEstoque.status === "alerta" ? "bg-amber-50" : "bg-red-50"
                  )}>
                    <Package className={cn(
                      "w-5 h-5",
                      viewingEstoque.status === "normal" ? "text-emerald-600" : viewingEstoque.status === "alerta" ? "text-amber-600" : "text-red-600"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{viewingEstoque.nome}</p>
                    <p className="text-xs text-gray-400">{viewingEstoque.categoria}</p>
                  </div>
                </div>

                {isOldStock(viewingEstoque.dataChegada) && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 border border-orange-200">
                    <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    <p className="text-xs font-semibold text-orange-700">Este item está no estoque há mais de 2 semanas</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Quantidade</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-800">{viewingEstoque.quantidade} {viewingEstoque.unidade}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Unidade</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-800">{viewingEstoque.unidade}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                    <span className={cn(
                      "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-lg",
                      statusColor[getEffectiveStockStatus(viewingEstoque)]
                    )}>
                      {statusLabel[getEffectiveStockStatus(viewingEstoque)]}
                    </span>
                  </div>
                </div>

                {(viewingEstoque.fornecedor || viewingEstoque.localizacao) && (
                  <div className="grid grid-cols-2 gap-3">
                    {viewingEstoque.fornecedor && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Fornecedor</p>
                        <p className="text-sm font-semibold text-gray-800">{viewingEstoque.fornecedor}</p>
                      </div>
                    )}
                    {viewingEstoque.localizacao && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Localização</p>
                        <p className="text-sm font-semibold text-gray-800">{viewingEstoque.localizacao}</p>
                      </div>
                    )}
                  </div>
                )}

                {(viewingEstoque.lote || viewingEstoque.dataChegada) && (
                  <div className="grid grid-cols-2 gap-3">
                    {viewingEstoque.lote && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Nº Lote</p>
                        <p className="text-sm font-semibold text-gray-800">{viewingEstoque.lote}</p>
                      </div>
                    )}
                    {viewingEstoque.dataChegada && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Data de Chegada</p>
                        <p className="text-sm font-semibold text-gray-800">{formatDate(viewingEstoque.dataChegada)}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setEditingEstoque(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        await deleteInventoryItem(viewingEstoque.id);
                        setEstoqueModal(null);
                        setViewingEstoque(null);
                        await loadData();
                      } catch (err) {
                        console.error(err);
                        alert("Erro ao excluir item");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
