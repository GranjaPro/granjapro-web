"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ModalPortal from "@/components/ui/modal-portal";
import { insightHref } from "@/lib/insight-links";
import {
  Skull,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Activity,
  Heart,
  Plus,
  X,
  Check,
  Pencil,
  Trash2,
  Calendar,
  Search,
  Minus,
  Eye,
  Zap,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Shield,
  Bug,
  Thermometer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { hasMinimumPlan } from "@/lib/plans";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/plan/locked-overlay";
import { RequiredPlanBadge } from "@/components/plan/plan-badge";
import { AssistantLockedPreview } from "@/components/dashboard/assistant-card";
import { useDateFilter, CalendarFilter } from "@/components/date-filter";
import { FarmHealthBanner, type FarmHealthInsight } from "@/components/dashboard/farm-health-banner";
import type { Tables } from "@/lib/database.types";

interface RegistroMortalidade {
  id: string;
  data: string;
  quantidade: number;
  causa: string;
  tipo: "natural" | "culling";
  loteId: string | null;
  galpaoId: string | null;
  lote: string;
  galpao: string;
  observacao: string;
}
type MortalityRow = Tables<"mortality"> & {
  flocks: Pick<Tables<"flocks">, "code"> | null;
  barns: Pick<Tables<"barns">, "name"> | null;
};
type TooltipFormatter = (value: unknown, name: unknown) => [string, string];

interface Lote {
  id: string;
  code: string;
  bird_count: number;
}

interface Barn {
  id: string;
  name: string;
}

const causaOptions = ["Natural", "Doença", "Respiratório", "Predadores", "Estresse Térmico", "Canibalismo/Bicagem", "Descarte Técnico", "Desconhecido", "Outros"];

const causaColor: Record<string, { badge: string }> = {
  "Natural": { badge: "bg-gray-100 text-gray-600" },
  "Doença": { badge: "bg-red-50 text-red-600" },
  "Respiratório": { badge: "bg-orange-50 text-orange-600" },
  "Predadores": { badge: "bg-amber-50 text-amber-700" },
  "Estresse Térmico": { badge: "bg-violet-50 text-violet-600" },
  "Canibalismo/Bicagem": { badge: "bg-rose-50 text-rose-600" },
  "Descarte Técnico": { badge: "bg-slate-100 text-slate-700" },
  "Desconhecido": { badge: "bg-gray-100 text-gray-500" },
  "Outros": { badge: "bg-slate-100 text-slate-600" },
};

const causaHexColors: Record<string, string> = {
  "Natural": "#94a3b8",
  "Doença": "#ef4444",
  "Respiratório": "#f97316",
  "Predadores": "#f59e0b",
  "Estresse Térmico": "#a78bfa",
  "Canibalismo/Bicagem": "#e11d48",
  "Descarte Técnico": "#475569",
  "Desconhecido": "#cbd5e1",
  "Outros": "#64748b"
};

function getMortalityType(causa: string): "natural" | "culling" {
  return causa === "Descarte Técnico" ? "culling" : "natural";
}

export default function MortalidadePage() {
  const searchParams = useSearchParams();
  const { farm } = useAuth();
  const { plan, hideAdvancedFeatures } = usePlan();
  const showMortalityProFeatures = !(hideAdvancedFeatures && !hasMinimumPlan(plan, "pro"));
  const showMortalityPremiumFeatures = !(hideAdvancedFeatures && !hasMinimumPlan(plan, "premium"));
  const farmRef = useRef(farm);
  farmRef.current = farm;

  const [registros, setRegistros] = useState<RegistroMortalidade[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [barns, setBarns] = useState<Barn[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<RegistroMortalidade | null>(null);
  const [form, setForm] = useState({ data: new Date().toISOString().split('T')[0], quantidade: "1", causa: "", tipo: "natural" as "natural" | "culling", loteId: "", galpaoId: "", observacao: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { dateRange } = useDateFilter();

  useEffect(() => {
    if (searchParams.get("register") === "true") setModal("add");
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    const currentFarm = farmRef.current;
    if (!currentFarm) return;
    setLoading(true);

    const supabase = createClient();
    try {
      const { startDate, endDate } = dateRange;

      const [flocksRes, barnsRes, mortalityRes] = await Promise.all([
        supabase.from("flocks").select("id, code, bird_count").eq("farm_id", currentFarm.id),
        supabase.from("barns").select("id, name").eq("farm_id", currentFarm.id),
        supabase.from("mortality")
          .select("*, flocks(code), barns(name)")
          .eq("farm_id", currentFarm.id)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false })
      ]);

      if (flocksRes.data) setLotes(flocksRes.data);
      if (barnsRes.data) setBarns(barnsRes.data);

      if (mortalityRes.data) {
        setRegistros(((mortalityRes.data as MortalityRow[] | null) ?? []).map((m) => ({
          id: m.id,
          data: m.date,
          quantidade: m.dead_birds,
          causa: m.cause,
          tipo: m.mortality_type,
          loteId: m.flock_id,
          galpaoId: m.barn_id,
          lote: m.flocks?.code || "—",
          galpao: m.barns?.name || "—",
          observacao: m.notes || ""
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const derivedTipo = getMortalityType(form.causa);
    if (form.tipo === derivedTipo) return;
    setForm((current) => ({ ...current, tipo: derivedTipo }));
  }, [form.causa, form.tipo]);


  /* ── Computed ── */
  const totalMortes = registros.reduce((s, r) => s + r.quantidade, 0);
  
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const monthAgo = new Date();
  monthAgo.setDate(today.getDate() - 30);
  const monthAgoStr = monthAgo.toISOString().split('T')[0];

  const mortesSemana = registros.filter((r) => r.data >= weekAgoStr).reduce((s, r) => s + r.quantidade, 0);
  const mortesMes = registros.filter((r) => r.data >= monthAgoStr).reduce((s, r) => s + r.quantidade, 0);
  
  const totalAves = lotes.reduce((s, l) => s + (l.bird_count || 0), 0) || 1; // avoid division by zero
  const taxaMensal = ((mortesMes / totalAves) * 100);
  const taxaSemanal = ((mortesSemana / totalAves) * 100);

  /* ── Mortality Score (inverse of health — lower mortality = higher score) ── */
  const mortalityScore = Math.max(0, Math.min(100, Math.round(100 - (taxaMensal * 20))));

  /* ── Causas Aggregate ── */
  const causasAgg = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;
    registros.forEach(r => {
      const c = r.causa || "Desconhecido";
      map[c] = (map[c] || 0) + r.quantidade;
      total += r.quantidade;
    });
    
    return Object.entries(map).map(([causa, quantidade]) => ({
      causa,
      quantidade,
      porcentagem: total > 0 ? Math.round((quantidade / total) * 100) : 0,
      color: causaHexColors[causa] || "#cbd5e1"
    })).sort((a,b) => b.quantidade - a.quantidade);
  }, [registros]);

  const topCausa = causasAgg[0];
  const causasCriticas = causasAgg.filter(c => c.causa === "Doença" || c.causa === "Respiratório").reduce((s, c) => s + c.quantidade, 0);

  /* ── Lotes KPIs Aggregate ── */
  const porLote = useMemo(() => {
    const map: Record<string, { mortes: number; codigo: string, bird_count: number }> = {};
    lotes.forEach(l => {
      map[l.id] = { mortes: 0, codigo: l.code, bird_count: l.bird_count || 1 };
    });
    registros.forEach(r => {
      if (r.loteId && map[r.loteId]) {
        map[r.loteId].mortes += r.quantidade;
      }
    });

    return Object.entries(map).map(([loteId, data]) => {
      const taxa = (data.mortes / data.bird_count) * 100;
      let tendencia: "up" | "down" | "stable" = "stable";
      if (taxa > 0.5) tendencia = "up";
      else if (taxa < 0.2) tendencia = "down";

      return {
        loteId,
        codigo: data.codigo,
        mortes: data.mortes,
        taxa,
        tendencia
      };
    }).sort((a, b) => b.mortes - a.mortes).filter(l => l.mortes > 0);
  }, [registros, lotes]);

  /* ── Chart Data: Semanal ── */
  const mortalidadeSemanal = useMemo(() => {
    // Generate last 7 days
    const arr: { dateFull: string; dia: string; mortes: number; taxa: number }[] = [];
    const t = new Date();
    for(let i=6; i>=0; i--) {
      const d = new Date(t);
      d.setDate(d.getDate() - i);
      const diaStr = d.toISOString().split('T')[0];
      const diaDisplay = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      arr.push({ dateFull: diaStr, dia: diaDisplay, mortes: 0, taxa: 0 });
    }
    
    registros.forEach(r => {
      const match = arr.find(a => a.dateFull === r.data);
      if (match) match.mortes += r.quantidade;
    });

    arr.forEach(a => {
      a.taxa = totalAves > 0 ? (a.mortes / totalAves) * 100 : 0;
    });

    return arr;
  }, [registros, totalAves]);

  /* ── Chart Data: Mensal ── */
  const mensal = useMemo(() => {
    // Group by YYYY-MM
    const map: Record<string, number> = {};
    registros.forEach(r => {
      const ym = r.data.substring(0, 7); // "2024-04"
      map[ym] = (map[ym] || 0) + r.quantidade;
    });

    const monthsMap = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    return Object.entries(map).sort().map(([ym, mortes]) => {
      const [, m] = ym.split('-');
      return {
        mes: monthsMap[parseInt(m, 10) - 1],
        mortes,
        taxa: totalAves > 0 ? (mortes / totalAves) * 100 : 0
      };
    }).slice(-6); // show last 6 months
  }, [registros, totalAves]);

  /* ── KPIs ── */
  const kpis = [
    { title: "Mortalidade Semanal", value: `${mortesSemana} aves`, icon: Bug, iconBg: "bg-red-50", iconColor: "text-red-500", actual: mortesSemana, expectedVal: Math.ceil(totalAves * 0.005), expectedLabel: `${Math.ceil(totalAves * 0.005)} aves`, diff: mortesSemana > 0 ? ((mortesSemana / Math.max(1, Math.ceil(totalAves * 0.005))) * 100) - 100 : 0, progressColor: mortesSemana <= Math.ceil(totalAves * 0.005) ? "bg-emerald-500" : "bg-red-500" },
    { title: "Taxa Mensal", value: `${taxaMensal.toFixed(1).replace(".", ",")}%`, icon: Activity, iconBg: "bg-amber-50", iconColor: "text-amber-600", actual: taxaMensal, expectedVal: 2, expectedLabel: "2%", diff: ((taxaMensal / 2) * 100) - 100, progressColor: taxaMensal <= 2 ? "bg-emerald-500" : taxaMensal <= 5 ? "bg-amber-500" : "bg-red-500" },
    { title: "Total Acumulado", value: String(totalMortes), icon: Calendar, iconBg: "bg-orange-50", iconColor: "text-orange-600", actual: totalMortes, expectedVal: Math.ceil(totalAves * 0.02), expectedLabel: `${Math.ceil(totalAves * 0.02)} aves`, diff: totalMortes > 0 ? ((totalMortes / Math.max(1, Math.ceil(totalAves * 0.02))) * 100) - 100 : 0, progressColor: totalMortes <= Math.ceil(totalAves * 0.02) ? "bg-emerald-500" : "bg-red-500" },
    { title: "Aves Vivas", value: totalAves > 1 ? (totalAves - totalMortes).toLocaleString('pt-BR') : "—", icon: Heart, iconBg: "bg-brand-50", iconColor: "text-brand-600", actual: totalAves - totalMortes, expectedVal: totalAves, expectedLabel: `${totalAves}`, diff: totalAves > 1 ? (((totalAves - totalMortes) / totalAves) * 100) - 100 : 0, progressColor: "bg-emerald-500" },
  ];

  /* ── Insights ── */
  const insights = useMemo(() => {
    const arr: { type: "success" | "warning" | "info"; title: string; action: string }[] = [];
    if (taxaMensal <= 0.5) arr.push({ type: "success", title: "Mortalidade mensal dentro do esperado", action: "Manter protocolos atuais de biossegurança" });
    else arr.push({ type: "warning", title: `Taxa mensal de ${taxaMensal.toFixed(1)}% — acima do ideal`, action: "Investigar causas e reforçar biossegurança" });
    if (causasCriticas > 0) arr.push({ type: "warning", title: `${causasCriticas} mortes por doença/respiratório`, action: "Avaliar necessidade de tratamento e isolamento" });
    const lotesCriticos = porLote.filter(l => l.tendencia === "up");
    if (lotesCriticos.length > 0) arr.push({ type: "warning", title: `${lotesCriticos.length} lote${lotesCriticos.length > 1 ? "s" : ""} com tendência de alta`, action: `Monitorar: ${lotesCriticos.map(l => l.codigo).join(", ")}` });
    if (topCausa) arr.push({ type: "info", title: `Causa mais frequente: ${topCausa.causa} (${topCausa.porcentagem}%)`, action: "Mortalidade natural é esperada — manter vigilância" });
    if (mortesSemana <= Math.ceil(totalAves * 0.005)) arr.push({ type: "success", title: `${mortesSemana} mortes nesta semana — dentro do limite`, action: "Continuar monitoramento regular" });
    return arr;
  }, [taxaMensal, causasCriticas, mortesSemana, porLote, topCausa, totalAves]);
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
  const farmHealthSummary = `Semana: ${mortesSemana} | Mês: ${mortesMes} | Total: ${totalMortes}`;

  const filteredRegistros = useMemo(() => {
    if (!searchQuery.trim()) return registros;
    const q = searchQuery.toLowerCase();
    return registros.filter((r) =>
      r.causa.toLowerCase().includes(q) ||
      r.galpao.toLowerCase().includes(q) ||
      r.lote.toLowerCase().includes(q) ||
      r.observacao.toLowerCase().includes(q) ||
      r.data.includes(q)
    );
  }, [registros, searchQuery]);

  function openAdd() {
    setForm({ data: new Date().toISOString().split('T')[0], quantidade: "1", causa: "", tipo: "natural", loteId: "", galpaoId: "", observacao: "" });
    setEditing(null);
    setModal("add");
  }

  function openEdit(r: RegistroMortalidade) {
    setForm({
      data: r.data,
      quantidade: String(r.quantidade),
      causa: r.causa,
      tipo: r.tipo,
      loteId: r.loteId || "",
      galpaoId: r.galpaoId || "",
      observacao: r.observacao,
    });
    setEditing(r);
    setModal("edit");
  }

  async function save() {
    if (!form.data.trim() || !form.causa.trim() || !form.loteId.trim()) return;
    const currentFarm = farmRef.current;
    if (!currentFarm) return;

    const record = {
      farm_id: currentFarm.id,
      barn_id: form.galpaoId || null,
      flock_id: form.loteId,
      date: form.data,
      dead_birds: Number(form.quantidade) || 1,
      cause: form.causa,
      mortality_type: getMortalityType(form.causa),
      notes: form.observacao
    };

    const supabase = createClient();
    try {
      if (modal === "add") {
        await supabase.from("mortality").insert(record);
      } else if (editing) {
        await supabase.from("mortality").update(record).eq("id", editing.id);
      }
      setModal(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteRegistro(id: string) {
    const supabase = createClient();
    try {
      await supabase.from("mortality").delete().eq("id", id);
      setDeleteConfirm(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  }

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <Skull className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mortalidade</h1>
            <p className="text-sm text-gray-500 mt-0.5">Controle e análise de mortalidade de todos os lotes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CalendarFilter />
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-red-500/20"
          >
            <Plus className="w-4 h-4" />
            Registrar Mortalidade
          </button>
        </div>
      </div>

      {/* ── Mortality Status Banner ── */}
      {plan === "essencial" ? (
        <LockedOverlay message="Desbloqueie o status da mortalidade" targetPlan="pro">
          <FarmHealthBanner
            score={mortalityScore}
            summary={farmHealthSummary}
            insights={farmHealthInsights}
          />
        </LockedOverlay>
      ) : (
        <FarmHealthBanner
          score={mortalityScore}
          summary={farmHealthSummary}
          insights={farmHealthInsights}
        />
      )}

      {/* ── KPI Cards with Progress Bars ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const isInverse = kpi.title !== "Aves Vivas";
          const maxVal = Math.max(kpi.actual, kpi.expectedVal) * 1.15 || 1;
          const fillPct = Math.min((kpi.actual / maxVal) * 100, 100);
          const markerPct = Math.min((kpi.expectedVal / maxVal) * 100, 100);
          const diffLabel = `${kpi.diff > 0 ? "+" : ""}${kpi.diff.toFixed(1)}%`;
          const isGood = isInverse ? kpi.diff <= 0 : kpi.diff >= 0;
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

      {/* ── AI Insights + Causas de Mortalidade ── */}
      <div className={cn("grid grid-cols-1 gap-4", showMortalityPremiumFeatures && "lg:grid-cols-2")}>
        {/* AI Insights */}
        {showMortalityPremiumFeatures && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-sm"><Zap className="w-5 h-5 text-white" /></div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Análise de Mortalidade</h3>
                <p className="text-[11px] text-gray-400 font-medium">Baseado no período</p>
              </div>
            </div>
            <RequiredPlanBadge requiredPlan="premium" className="flex-shrink-0" />
          </div>
          {plan !== "premium" ? (
            <AssistantLockedPreview lockedMessage="Desbloqueie a análise de mortalidade" />
          ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {insights.map((ins, i) => {
              const link = insightHref(`${ins.title} ${ins.action}`);
              return (
              <div key={i} className={cn("p-3.5 rounded-xl border-l-[3px]", ins.type === "success" && "bg-emerald-50/50 border-l-emerald-500", ins.type === "warning" && "bg-amber-50/50 border-l-amber-500", ins.type === "info" && "bg-blue-50/50 border-l-blue-500")}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", ins.type === "success" && "bg-emerald-100", ins.type === "warning" && "bg-amber-100", ins.type === "info" && "bg-blue-100")}>
                    {ins.type === "success" && <TrendingDown className="w-2.5 h-2.5 text-emerald-600" />}
                    {ins.type === "warning" && <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />}
                    {ins.type === "info" && <Lightbulb className="w-2.5 h-2.5 text-blue-600" />}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{ins.title}</span>
                </div>
                <div className="ml-7 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <p className={cn("text-xs font-medium", ins.type === "success" ? "text-emerald-600" : ins.type === "warning" ? "text-amber-600" : "text-blue-600")}>&rarr; {ins.action}</p>
                  <Link href={link.href} className="inline-flex items-center gap-0.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                    {link.label}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              );
            })}
            {plan !== "premium" ? (
              <LockedOverlay message="Desbloqueie a análise avançada de mortalidade" targetPlan="premium">
                <div className="p-3.5 rounded-xl border-l-[3px] bg-violet-50/50 border-l-violet-500">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-violet-100">
                      <Activity className="w-2.5 h-2.5 text-violet-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">Previsão de risco para os próximos 7 dias</span>
                  </div>
                  <p className="text-xs font-medium ml-7 text-violet-600">&rarr; Análise preditiva baseada no histórico do lote</p>
                </div>
              </LockedOverlay>
            ) : (
              <div className="p-3.5 rounded-xl border-l-[3px] bg-violet-50/50 border-l-violet-500">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-violet-100">
                    <Activity className="w-2.5 h-2.5 text-violet-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">Previsão de risco para os próximos 7 dias</span>
                </div>
                <p className="text-xs font-medium ml-7 text-violet-600">&rarr; Análise preditiva baseada no histórico do lote</p>
              </div>
            )}
          </div>
          )}
        </div>
        )}

        {/* Causas Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-gray-900">Causas de Mortalidade</h3>
            </div>
            <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">{totalMortes} total</span>
          </div>
          {causasAgg.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={causasAgg} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="quantidade" nameKey="causa" paddingAngle={3} strokeWidth={0}>
                    {causasAgg.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", fontSize: "13px", padding: "14px 18px" }}
                    formatter={((value: unknown, name: unknown) => [`${Number(value)} mortes`, String(name)]) satisfies TooltipFormatter}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-2.5 mt-2">
                {causasAgg.map((c) => (
                  <div key={c.causa} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-sm text-gray-600">{c.causa}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{c.quantidade}</span>
                      <span className="text-sm font-bold text-gray-900">{c.porcentagem}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">Nenhum dado de causa no período.</div>
          )}
        </div>
      </div>

      {/* ── Charts Row — 2/3 + 1/3 ── */}
      <div className={cn("grid grid-cols-1 gap-4", showMortalityProFeatures && "lg:grid-cols-3")}>
        {/* Mortalidade x Taxa Composed Chart */}
        {plan === "essencial" ? (
        <LockedOverlay message="Desbloqueie o gráfico Mortalidade x Taxa" targetPlan="pro" className="lg:col-span-2" preserveFirstChild>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Mortalidade x Taxa</h3>
              <p className="text-xs text-gray-400 mt-0.5">Últimos 7 dias</p>
            </div>
            <div className="flex items-center gap-4">
              <RequiredPlanBadge requiredPlan="pro" />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500" /><span className="text-[10px] font-medium text-gray-400">Mortes</span></div>
                <div className="flex items-center gap-1.5"><div className="w-5 h-[3px] rounded-full bg-amber-500" /><span className="text-[10px] font-medium text-gray-400">Taxa (%)</span></div>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={mortalidadeSemanal} margin={{ top: 10, right: 50, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradMortesBarMort" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: 500 }} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} dx={-4} domain={[0, 'auto']} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#d97706", fontSize: 11, fontWeight: 600 }} dx={4} domain={[0, 'auto']} tickFormatter={(v: number) => (v).toFixed(1) + "%"} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", fontSize: "13px", padding: "14px 18px" }}
                labelStyle={{ fontWeight: 800, color: "#111827", marginBottom: "8px" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: unknown, name: unknown) => {
                  if (name === "mortes") return [Number(value) + " aves", "Mortes"];
                  if (name === "taxa") return [(Number(value)).toFixed(2) + "%", "Taxa"];
                  return [String(value), String(name)];
                }) satisfies TooltipFormatter}
              />
              <Bar yAxisId="left" dataKey="mortes" fill="url(#gradMortesBarMort)" radius={[6, 6, 0, 0]} barSize={24} name="mortes" />
              <Line yAxisId="right" type="monotone" dataKey="taxa" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: "#fff", stroke: "#f59e0b", strokeWidth: 3 }} activeDot={{ r: 7, fill: "#f59e0b", stroke: "#fff", strokeWidth: 3 }} name="taxa" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        </LockedOverlay>
        ) : (
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Mortalidade x Taxa</h3>
              <p className="text-xs text-gray-400 mt-0.5">Últimos 7 dias</p>
            </div>
            <div className="flex items-center gap-4">
              <RequiredPlanBadge requiredPlan="pro" />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500" /><span className="text-[10px] font-medium text-gray-400">Mortes</span></div>
                <div className="flex items-center gap-1.5"><div className="w-5 h-[3px] rounded-full bg-amber-500" /><span className="text-[10px] font-medium text-gray-400">Taxa (%)</span></div>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={mortalidadeSemanal} margin={{ top: 10, right: 50, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradMortesBarMort2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12, fontWeight: 500 }} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} dx={-4} domain={[0, 'auto']} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#d97706", fontSize: 11, fontWeight: 600 }} dx={4} domain={[0, 'auto']} tickFormatter={(v: number) => (v).toFixed(1) + "%"} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", fontSize: "13px", padding: "14px 18px" }}
                labelStyle={{ fontWeight: 800, color: "#111827", marginBottom: "8px" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: unknown, name: unknown) => {
                  if (name === "mortes") return [Number(value) + " aves", "Mortes"];
                  if (name === "taxa") return [(Number(value)).toFixed(2) + "%", "Taxa"];
                  return [String(value), String(name)];
                }) satisfies TooltipFormatter}
              />
              <Bar yAxisId="left" dataKey="mortes" fill="url(#gradMortesBarMort2)" radius={[6, 6, 0, 0]} barSize={24} name="mortes" />
              <Line yAxisId="right" type="monotone" dataKey="taxa" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: "#fff", stroke: "#f59e0b", strokeWidth: 3 }} activeDot={{ r: 7, fill: "#f59e0b", stroke: "#fff", strokeWidth: 3 }} name="taxa" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        )}

        {/* Evolução Mensal */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900">Evolução Mensal</h3>
            <p className="text-xs text-gray-400 mt-0.5">Mortes acumuladas por mês</p>
          </div>
          <div className="flex-1" style={{ minHeight: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mensal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradMortesArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", fontSize: "13px", padding: "14px 18px" }}
                  formatter={(value: unknown) => [Number(value) + " mortes", "Total"]}
                />
                <Area type="monotone" dataKey="mortes" stroke="#ef4444" strokeWidth={2.5} fill="url(#gradMortesArea)" dot={{ r: 4, fill: "#fff", stroke: "#ef4444", strokeWidth: 2.5 }} activeDot={{ r: 6, fill: "#ef4444", stroke: "#fff", strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Mortalidade por Lote ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-gray-900">Mortalidade por Lote</h3>
          <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">{porLote.length} lotes</span>
        </div>
        {porLote.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {porLote.map((l) => (
              <div key={l.loteId} className="flex items-center justify-between p-4 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border",
                    l.tendencia === "up" ? "bg-red-50 border-red-200" : l.tendencia === "down" ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"
                  )}>
                    <Skull className={cn("w-4 h-4", l.tendencia === "up" ? "text-red-500" : l.tendencia === "down" ? "text-emerald-500" : "text-gray-400")} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{l.codigo}</p>
                    <p className="text-xs text-gray-400">{l.mortes} mortes total</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={cn("text-sm font-bold", l.taxa <= 0.3 ? "text-emerald-600" : l.taxa <= 0.5 ? "text-amber-600" : "text-red-500")}>
                      {l.taxa.toFixed(1).replace(".", ",")}%
                    </p>
                    <span className={cn(
                      "inline-flex items-center gap-0.5 text-[10px] font-semibold",
                      l.tendencia === "up" ? "text-red-500" : l.tendencia === "down" ? "text-emerald-600" : "text-gray-400"
                    )}>
                      {l.tendencia === "up" && <ArrowUpRight className="w-3 h-3" />}
                      {l.tendencia === "down" && <ArrowDownRight className="w-3 h-3" />}
                      {l.tendencia === "stable" && <Minus className="w-3 h-3" />}
                      {l.tendencia === "up" ? "Subindo" : l.tendencia === "down" ? "Caindo" : "Estável"}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/flocks/detalhes/${l.loteId}/mortalidade`}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
           <div className="text-sm text-gray-400 py-6 text-center">Nenhuma mortalidade registrada neste período para os lotes.</div>
        )}
      </div>

      {/* ── Records Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Registros de Mortalidade</h3>
            <p className="text-xs text-gray-400 mt-0.5">{registros.length} registros</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100/80 rounded-xl px-3 py-2 w-full sm:w-72 transition-colors focus-within:bg-gray-100 focus-within:ring-2 focus-within:ring-red-500/20">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por causa, lote, galpão..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
          {loading ? (
             <div className="p-8 text-center text-sm text-gray-500">Carregando dados...</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Data</th>
                  <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Qtd</th>
                  <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Lote</th>
                  <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Causa</th>
                  <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Tipo</th>
                  <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Galpão</th>
                  <th className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Observação</th>
                  <th className="text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider px-6 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistros.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredRegistros.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatDate(r.data)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                          {r.quantidade}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg">
                          {r.lote}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap", causaColor[r.causa]?.badge || "bg-gray-100 text-gray-600")}>
                          {r.causa}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg whitespace-nowrap">
                          {r.tipo === "culling" ? "Descarte Técnico" : "Mortalidade Natural"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.galpao}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">{r.observacao || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(r.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal — Add/Edit ── */}
      {modal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <Skull className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{modal === "add" ? "Registrar Mortalidade" : "Editar Registro"}</h2>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lote</label>
                  <select
                    value={form.loteId}
                    onChange={(e) => setForm({ ...form, loteId: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all bg-white cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {lotes.map((l) => (
                      <option key={l.id} value={l.id}>{l.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Causa</label>
                  <select
                    value={form.causa}
                    onChange={(e) => setForm({ ...form, causa: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all bg-white cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {causaOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observação</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes sobre a ocorrência..."
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button
                onClick={save}
                disabled={!form.data || !form.causa || !form.loteId}
                className={cn(
                  "inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm",
                  form.data && form.causa && form.loteId
                    ? "text-white bg-red-500 hover:bg-red-600"
                    : "text-gray-400 bg-gray-200 cursor-not-allowed"
                )}
              >
                <Check className="w-4 h-4" />{modal === "add" ? "Registrar" : "Salvar"}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
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
