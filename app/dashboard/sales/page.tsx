"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ModalPortal from "@/components/ui/modal-portal";
import { insightHref } from "@/lib/insight-links";
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  DollarSign,
  Package,
  BarChart3,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  Hash,
  Zap,
  Lightbulb,
  AlertTriangle,
  Target,
  Minus,
  Percent,
  Wallet,
  PiggyBank,
  HelpCircle,
  Receipt,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  LineChart,
  Line,
  ComposedChart,
} from "recharts";
import { useAuth } from "@/components/auth/auth-provider";
import { hasMinimumPlan } from "@/lib/plans";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/plan/locked-overlay";
import { RequiredPlanBadge } from "@/components/plan/plan-badge";
import { AssistantLockedPreview } from "@/components/dashboard/assistant-card";
import { createClient } from "@/lib/supabase/client";
import { createRevenueFromSale } from "@/lib/services/finances";
import { useDateFilter, CalendarFilter } from "@/components/date-filter";

/* ══════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════ */

interface Venda {
  id: string;
  data: string;
  clienteId: string;
  clienteNome: string;
  egg_type: string;
  quantidade: number;
  precoUn: number;
  total: number;
  payment_status: "pending" | "paid" | "overdue";
  notes: string;
}

interface Customer {
  id: string;
  name: string;
}

const EGG_TYPES = ["Branco", "Caipira", "Codorna", "Vermelho", "Jumbo", "Outros"];

const STATUS_CONFIG = {
  paid: { label: "Pago", color: "text-emerald-700", bg: "bg-emerald-50", icon: CheckCircle2 },
  pending: { label: "A Receber", color: "text-blue-700", bg: "bg-blue-50", icon: Receipt },
  overdue: { label: "Atrasado", color: "text-amber-700", bg: "bg-amber-50", icon: Clock },
};

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

export default function VendasPage() {
  const searchParams = useSearchParams();
  const { farm } = useAuth();
  const { plan, hideAdvancedFeatures } = usePlan();
  const showSalesProFeatures = !(hideAdvancedFeatures && !hasMinimumPlan(plan, "pro"));
  const showSalesPremiumFeatures = !(hideAdvancedFeatures && !hasMinimumPlan(plan, "premium"));
  const farmRef = useRef(farm);
  farmRef.current = farm;

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Venda | null>(null);
  const [form, setForm] = useState({
    data: new Date().toISOString().split("T")[0],
    clienteId: "",
    egg_type: "Branco",
    quantidade: "",
    precoUn: "",
    payment_status: "paid" as "pending" | "paid" | "overdue",
    notes: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [breakdownTab, setBreakdownTab] = useState<"cliente" | "tipo" | "status">("cliente");
  const [unidade, setUnidade] = useState<"duzia" | "unidade" | "bandeja">("duzia");
  const [anoLucro, setAnoLucro] = useState(new Date().getFullYear());
  const [margemDesejada, setMargemDesejada] = useState(35);

  const { dateRange, filterMode, rangeStart, rangeEnd } = useDateFilter();

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
      
      const [salesRes, customersRes] = await Promise.all([
        supabase
          .from("sales")
          .select("*, customers(name)")
          .eq("farm_id", currentFarm.id)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false }),
        supabase
          .from("customers")
          .select("id, name")
          .eq("farm_id", currentFarm.id)
          .order("name", { ascending: true })
      ]);

      if (salesRes.error) throw salesRes.error;
      if (customersRes.error) throw customersRes.error;

      setCustomers(customersRes.data || []);
      
      const mappedVendas: Venda[] = (salesRes.data || []).map((s: any) => ({
        id: s.id,
        data: s.date,
        clienteId: s.customer_id || "",
        clienteNome: s.customers?.name || "Cliente não encontrado",
        egg_type: s.egg_type || "Branco",
        quantidade: s.quantity || 0,
        precoUn: s.unit_price || 0,
        total: s.total || 0,
        payment_status: s.payment_status || "paid",
        notes: s.notes || "",
      }));
      setVendas(mappedVendas);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Search filter ── */
  const filteredVendas = useMemo(() => {
    if (!searchQuery.trim()) return vendas;
    const q = searchQuery.toLowerCase();
    return vendas.filter(
      (v) =>
        v.clienteNome.toLowerCase().includes(q) ||
        v.egg_type.toLowerCase().includes(q) ||
        v.data.includes(q) ||
        v.notes.toLowerCase().includes(q)
    );
  }, [vendas, searchQuery]);

  /* ── Derived KPIs ── */
  const receitaPeriodo = vendas.reduce((s, v) => s + v.total, 0);
  const volumeTotal = vendas.reduce((s, v) => s + v.quantidade, 0);
  const precoMedio = vendas.length > 0 ? (receitaPeriodo / volumeTotal) : 0;
  const totalVendas = vendas.length;

  const metaReceita = 18000;
  // Simplification for variation: we don't have past period data fetched currently, so assume 0% or fake it for UI placeholder, or calculate a simpler metric.
  // We will set variation to 0 to avoid breaking UI without previous data.
  const variacaoReceita = "0.0";
  const pctMeta = Math.min((receitaPeriodo / metaReceita) * 100, 100);

  /* ── Profit & Margin ── */
  const custoMedio = 6.8; // R$/dz cost assumption
  const custoTotal = volumeTotal * custoMedio;
  const lucro = receitaPeriodo - custoTotal;
  const margem = receitaPeriodo > 0 ? (lucro / receitaPeriodo) * 100 : 0;
  const varLucro = "0.0";
  const varMargem = "0.0";

  /* ── Unit conversion ── */
  const unidadeLabel = unidade === "duzia" ? "Dúzia" : unidade === "unidade" ? "Unidade" : "Bandeja 30";
  const unidadeSuffix = unidade === "duzia" ? "/dz" : unidade === "unidade" ? "/un" : "/bd";
  const divisor = unidade === "duzia" ? 1 : unidade === "unidade" ? 12 : 12 / 30;
  const receitaUn = precoMedio / divisor;
  const custoUn = custoMedio / divisor;
  const lucroUn = receitaUn - custoUn;

  /* ── Dynamic breakdown from period vendas ── */
  const dynamicReceitaPorCliente = useMemo(() => {
    const map = new Map<string, { valor: number; vendas: number }>();
    vendas.forEach((v) => {
      const existing = map.get(v.clienteNome) || { valor: 0, vendas: 0 };
      map.set(v.clienteNome, { valor: existing.valor + v.total, vendas: existing.vendas + 1 });
    });
    return Array.from(map.entries()).map(([cliente, d]) => ({ cliente, ...d })).sort((a, b) => b.valor - a.valor);
  }, [vendas]);

  const dynamicReceitaPorTipo = useMemo(() => {
    const map = new Map<string, { valor: number; volume: number }>();
    vendas.forEach((v) => {
      const existing = map.get(v.egg_type) || { valor: 0, volume: 0 };
      map.set(v.egg_type, { valor: existing.valor + v.total, volume: existing.volume + v.quantidade });
    });
    return Array.from(map.entries()).map(([tipo, d]) => ({ tipo, ...d })).sort((a, b) => b.valor - a.valor);
  }, [vendas]);

  const dynamicReceitaPorStatus = useMemo(() => {
    const map = new Map<string, number>();
    vendas.forEach((v) => {
      map.set(v.payment_status, (map.get(v.payment_status) || 0) + v.total);
    });
    return Array.from(map.entries()).map(([status, valor]) => ({ status, valor })).sort((a, b) => b.valor - a.valor);
  }, [vendas]);

  /* ── Charts Data ── */
  const receitaDiaria = useMemo(() => {
    const { startDate, endDate } = dateRange;
    if (filterMode === "intervalo" && rangeStart && rangeEnd && (rangeEnd.getTime() - rangeStart.getTime() > 1000 * 60 * 60 * 24 * 60)) {
       // Group by month
       const map: Record<string, { dia: string; receita: number; volume: number }> = {};
       vendas.forEach(v => {
         const ym = v.data.substring(0, 7);
         if (!map[ym]) map[ym] = { dia: ym, receita: 0, volume: 0 };
         map[ym].receita += v.total;
         map[ym].volume += v.quantidade;
       });
       return Object.values(map).sort((a,b) => a.dia.localeCompare(b.dia));
    } else {
       // Group by day
       const map: Record<string, { dia: string; receita: number; volume: number }> = {};
       vendas.forEach(v => {
         const d = v.data.substring(5, 10).replace("-", "/"); // MM/DD
         if (!map[d]) map[d] = { dia: d, receita: 0, volume: 0 };
         map[d].receita += v.total;
         map[d].volume += v.quantidade;
       });
       const arr = [];
       const start = new Date(startDate + "T12:00:00");
       const end = new Date(endDate + "T12:00:00");
       for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
         const dStr = String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
         arr.push({ dia: dStr, receita: map[dStr]?.receita || 0, volume: map[dStr]?.volume || 0 });
       }
       return arr;
    }
  }, [vendas, filterMode, rangeStart, rangeEnd, dateRange]);

  const historicoPreco = useMemo(() => {
    // Generate a simple monthly trend based on the fetched data (all time or active view)
    const map: Record<string, { totalVolume: number; totalReceita: number }> = {};
    vendas.forEach(v => {
      const ym = v.data.substring(0, 7);
      if (!map[ym]) map[ym] = { totalVolume: 0, totalReceita: 0 };
      map[ym].totalVolume += v.quantidade;
      map[ym].totalReceita += v.total;
    });
    
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([mes, d]) => ({
      mes: mes.substring(5, 7) + "/" + mes.substring(0, 4),
      preco: d.totalVolume > 0 ? d.totalReceita / d.totalVolume : 0,
      meta: 13.0
    })).slice(-6); // last 6 months present in current filter
  }, [vendas]);

  const lucratividade = useMemo(() => {
    // We group current view sales into months for the history selector
    const map: Record<string, { receita: number; custo: number; lucro: number; margem: number }> = {};
    vendas.forEach(v => {
      const ym = v.data.substring(0, 7);
      if (ym.startsWith(String(anoLucro))) {
        const mesStr = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][parseInt(ym.substring(5, 7)) - 1];
        if (!map[mesStr]) map[mesStr] = { receita: 0, custo: 0, lucro: 0, margem: 0 };
        map[mesStr].receita += v.total;
        map[mesStr].custo += v.quantidade * custoMedio;
      }
    });
    return Object.entries(map).map(([mes, d]) => {
      d.lucro = d.receita - d.custo;
      d.margem = d.receita > 0 ? (d.lucro / d.receita) * 100 : 0;
      return { mes, ...d };
    });
  }, [vendas, anoLucro]);


  /* ── Insights ── */
  const insights = useMemo(() => {
    const arr: { type: "success" | "warning" | "info"; title: string; action: string }[] = [];
    const topCliente = dynamicReceitaPorCliente[0];
    if (topCliente) {
      const pct = ((topCliente.valor / receitaPeriodo) * 100).toFixed(1);
      if (Number(pct) > 30) arr.push({ type: "warning", title: `${topCliente.cliente} concentra ${pct}% da receita`, action: "Diversifique a carteira para reduzir dependência" });
    }
    if (precoMedio > 0 && precoMedio < 12.5) arr.push({ type: "warning", title: `Preço médio em R$ ${precoMedio.toFixed(2)} — abaixo da meta`, action: "Negocie contratos com preço fixo para proteger margem" });
    const bestPrice = vendas.reduce((best, v) => v.precoUn > best?.precoUn ? v : best, vendas[0]);
    if (bestPrice) arr.push({ type: "info", title: `${bestPrice.clienteNome} paga R$ ${bestPrice.precoUn.toFixed(2)}/dz — melhor preço`, action: "Priorize este canal para maximizar margem" });
    if (pctMeta < 80 && metaReceita - receitaPeriodo > 0) arr.push({ type: "warning", title: `${pctMeta.toFixed(0)}% da meta atingida`, action: `Faltam ${formatCurrency(metaReceita - receitaPeriodo)} para bater a meta` });
    return arr;
  }, [dynamicReceitaPorCliente, receitaPeriodo, precoMedio, vendas, pctMeta]);

  /* ── CRUD ── */
  function openAdd() {
    setForm({ data: new Date().toISOString().split("T")[0], clienteId: "", egg_type: "Branco", quantidade: "", precoUn: "", payment_status: "paid", notes: "" });
    setEditing(null);
    setModal("add");
  }

  function openEdit(v: Venda) {
    setForm({
      data: v.data,
      clienteId: v.clienteId,
      egg_type: v.egg_type,
      quantidade: String(v.quantidade),
      precoUn: String(v.precoUn),
      payment_status: v.payment_status,
      notes: v.notes,
    });
    setEditing(v);
    setModal("edit");
  }

  async function save() {
    if (!form.data.trim() || !form.clienteId || !form.quantidade || !form.precoUn) return;
    const currentFarm = farmRef.current;
    if (!currentFarm) return;

    const quantidade = Number(form.quantidade) || 0;
    const precoUn = Number(form.precoUn) || 0;
    
    const record = {
      farm_id: currentFarm.id,
      customer_id: form.clienteId,
      date: form.data,
      quantity: quantidade,
      egg_type: form.egg_type,
      unit_price: precoUn,
      total: quantidade * precoUn,
      payment_status: form.payment_status,
      notes: form.notes || null,
    };

    const supabase = createClient();
    try {
      if (modal === "add") {
        const { data: newSale, error } = await supabase
          .from("sales")
          .insert(record)
          .select()
          .single();

        if (error) throw error;

        const customerName = customers.find(c => c.id === form.clienteId)?.name || "Venda";
        await createRevenueFromSale(
          currentFarm.id,
          newSale.id,
          record.date,
          record.total,
          `Venda - ${customerName}`
        );
      } else if (editing) {
        const { error } = await supabase.from("sales").update(record).eq("id", editing.id);
        if (error) throw error;
      }
      setModal(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteVenda(id: string) {
    const supabase = createClient();
    try {
      await supabase.from("sales").delete().eq("id", id);
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

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vendas</h1>
            <p className="text-sm text-gray-500 mt-0.5">Registro de vendas, receitas e análise comercial</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CalendarFilter />
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            Registrar Venda
          </button>
        </div>
      </div>

      {/* ── Revenue Banner ── */}
      {plan === "essencial" ? (
        <LockedOverlay message="Desbloqueie a meta de receita" targetPlan="pro">
          <div className={cn("rounded-2xl border p-5 transition-all duration-300", pctMeta >= 80 ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/60" : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/60")}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-center gap-4 lg:min-w-[280px]">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5" className="text-gray-200 dark:text-[#334155]" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke={pctMeta >= 80 ? "#10b981" : "#f59e0b"} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(pctMeta / 100) * 175.9} 175.9`} className="transition-all duration-700" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn("text-base font-bold", pctMeta >= 80 ? "text-emerald-700" : "text-amber-700")}>{pctMeta.toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-bold text-gray-900">Meta de Receita</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">{formatCurrency(receitaPeriodo)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">de {formatCurrency(metaReceita)} · {totalVendas} vendas · {volumeTotal.toLocaleString("pt-BR")} dz</p>
                </div>
              </div>
              <div className="hidden lg:block w-px h-14 bg-gray-200/80" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0", Number(variacaoReceita) >= 0 ? "bg-emerald-100" : "bg-red-100")}>
                    {Number(variacaoReceita) >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingDown className="w-3.5 h-3.5 text-red-600" />}
                  </div>
                  <p className="text-sm text-gray-700">Receita <span className={cn("font-semibold", Number(variacaoReceita) >= 0 ? "text-emerald-700" : "text-red-600")}>{Number(variacaoReceita) >= 0 ? "cresceu" : "caiu"} {variacaoReceita}%</span> vs período anterior</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0", precoMedio >= 12.5 ? "bg-emerald-100" : "bg-amber-100")}>
                    <DollarSign className={cn("w-3.5 h-3.5", precoMedio >= 12.5 ? "text-emerald-600" : "text-amber-600")} />
                  </div>
                  <p className="text-sm text-gray-700">Preço médio <span className="font-bold text-gray-900">R$ {precoMedio.toFixed(2).replace(".", ",")}</span>/dz</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-purple-100">
                    <Package className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-700">Faltam <span className="font-semibold text-purple-700">{formatCurrency(Math.max(metaReceita - receitaPeriodo, 0))}</span> para bater a meta</p>
                </div>
              </div>
            </div>
          </div>
        </LockedOverlay>
      ) : (
        <div className={cn("rounded-2xl border p-5 transition-all duration-300", pctMeta >= 80 ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/60" : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/60")}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-4 lg:min-w-[280px]">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5" className="text-gray-200 dark:text-[#334155]" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke={pctMeta >= 80 ? "#10b981" : "#f59e0b"} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(pctMeta / 100) * 175.9} 175.9`} className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn("text-base font-bold", pctMeta >= 80 ? "text-emerald-700" : "text-amber-700")}>{pctMeta.toFixed(0)}%</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-bold text-gray-900">Meta de Receita</span>
                </div>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{formatCurrency(receitaPeriodo)}</p>
                <p className="text-xs text-gray-500 mt-0.5">de {formatCurrency(metaReceita)} · {totalVendas} vendas · {volumeTotal.toLocaleString("pt-BR")} dz</p>
              </div>
            </div>
            <div className="hidden lg:block w-px h-14 bg-gray-200/80" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0", Number(variacaoReceita) >= 0 ? "bg-emerald-100" : "bg-red-100")}>
                  {Number(variacaoReceita) >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingDown className="w-3.5 h-3.5 text-red-600" />}
                </div>
                <p className="text-sm text-gray-700">
                  Receita <span className={cn("font-semibold", Number(variacaoReceita) >= 0 ? "text-emerald-700" : "text-red-600")}>{Number(variacaoReceita) >= 0 ? "cresceu" : "caiu"} {variacaoReceita}%</span> vs período anterior
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0", precoMedio >= 12.5 ? "bg-emerald-100" : "bg-amber-100")}>
                  <DollarSign className={cn("w-3.5 h-3.5", precoMedio >= 12.5 ? "text-emerald-600" : "text-amber-600")} />
                </div>
                <p className="text-sm text-gray-700">
                  Preço médio <span className="font-bold text-gray-900">R$ {precoMedio.toFixed(2).replace(".", ",")}</span>/dz {precoMedio > 0 && precoMedio < 12.5 && <span className="text-amber-600 font-semibold">— abaixo da meta</span>}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-purple-100">
                  <Package className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <p className="text-sm text-gray-700">
                  Faltam <span className="font-semibold text-purple-700">{formatCurrency(Math.max(metaReceita - receitaPeriodo, 0))}</span> para bater a meta
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Receita */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Receita</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{formatCurrency(receitaPeriodo)}</p>
            <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full", Number(variacaoReceita) >= 0 ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50")}>
              {Number(variacaoReceita) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Number(variacaoReceita) >= 0 ? "+" : ""}{variacaoReceita}%
            </span>
          </div>
          <div className="mt-4 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 bg-emerald-500" style={{ width: `${pctMeta}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-gray-500 font-medium">Meta: {formatCurrency(metaReceita)}</span>
            </div>
            <span className={cn("text-[10px] font-semibold", pctMeta >= 80 ? "text-emerald-600" : "text-amber-600")}>{pctMeta.toFixed(0)}% atingido</span>
          </div>
        </div>

        {/* Volume */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Volume</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{volumeTotal.toLocaleString("pt-BR")} dz</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50">
              <ArrowUpRight className="w-3 h-3" />+0%
            </span>
          </div>
          <div className="mt-4 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 bg-blue-500" style={{ width: `${Math.min((volumeTotal / 1500) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[10px] text-gray-500 font-medium">Capacidade: 1.500 dz</span>
            </div>
            <span className="text-[10px] font-semibold text-blue-600">{((volumeTotal / 1500) * 100).toFixed(0)}% utilizado</span>
          </div>
        </div>

        {/* Preço Médio */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Preço Médio / Dz</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{precoMedio > 0 ? `R$ ${precoMedio.toFixed(2).replace(".", ",")}` : "—"}</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-red-600 bg-red-50">
              <ArrowDownRight className="w-3 h-3" />0%
            </span>
          </div>
          <div className="mt-4 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700", precoMedio >= 12.5 ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${Math.min((precoMedio / 15) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] text-gray-500 font-medium">Meta: R$ 13,00</span>
            </div>
            <span className={cn("text-[10px] font-semibold", precoMedio >= 12.5 ? "text-emerald-600" : "text-amber-600")}>{precoMedio >= 12.5 ? "Dentro" : "Abaixo"} da meta</span>
          </div>
        </div>

        {/* Total Vendas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <Hash className="w-4.5 h-4.5 text-purple-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Vendas</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{totalVendas}</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-gray-500 bg-gray-50">
              No período
            </span>
          </div>
          <div className="mt-4 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 bg-purple-500" style={{ width: `${Math.min((totalVendas / 12) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span className="text-[10px] text-gray-500 font-medium">{dynamicReceitaPorCliente.length} clientes ativos</span>
            </div>
            <span className="text-[10px] font-semibold text-purple-600">{(receitaPeriodo / Math.max(totalVendas, 1)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/venda</span>
          </div>
        </div>
      </div>

      {/* ── Profit & Margin ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <PiggyBank className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Lucratividade</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Análise de custos e margens no período</p>
            </div>
          </div>
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full", margem >= 35 ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : margem >= 28 ? "text-amber-700 bg-amber-50 border border-amber-200" : "text-red-600 bg-red-50 border border-red-200")}>
            <Percent className="w-3 h-3" />
            {margem.toFixed(1)}% margem
          </span>
        </div>

        {/* Top row: 3 metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {/* Receita */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 hover:border-gray-200 transition-colors duration-200 cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center"><DollarSign className="w-3.5 h-3.5 text-blue-600" /></div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Receita</span>
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">{formatCurrency(receitaPeriodo)}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-1">100% da composição</p>
          </div>
          {/* Custo */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 hover:border-gray-200 transition-colors duration-200 cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center"><Wallet className="w-3.5 h-3.5 text-red-500" /></div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Custo</span>
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">{formatCurrency(custoTotal)}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-1">{(100 - margem).toFixed(1)}% da receita</p>
          </div>
          {/* Lucro */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 hover:border-gray-200 transition-colors duration-200 cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center"><PiggyBank className="w-3.5 h-3.5 text-emerald-600" /></div>
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Lucro</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-emerald-700 tracking-tight">{formatCurrency(lucro)}</p>
              <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-bold", Number(varLucro) >= 0 ? "text-emerald-600" : "text-red-500")}>
                {Number(varLucro) >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}{Number(varLucro) >= 0 ? "+" : ""}{varLucro}%
              </span>
            </div>
            <p className="text-[10px] text-emerald-600/70 font-medium mt-1">{margem.toFixed(1)}% da receita</p>
          </div>
        </div>

        {/* Stacked bar visual */}
        <div className="mb-5">
          <div className="flex items-center gap-1 h-8 rounded-xl overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-l-xl transition-all duration-700 flex items-center justify-center" style={{ width: `${Math.max(margem, 0)}%` }}>
              {margem > 0 && <span className="text-[10px] font-bold text-white px-1 whitespace-nowrap">Lucro {margem.toFixed(1)}%</span>}
            </div>
            <div className="h-full bg-gray-200 rounded-r-xl transition-all duration-700 flex items-center justify-center" style={{ width: `${Math.max(100 - margem, 0)}%` }}>
              <span className="text-[10px] font-bold text-gray-500 px-1 whitespace-nowrap">Custo {(100 - margem).toFixed(1)}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={cn("text-xs font-bold", margem >= 35 ? "text-emerald-600" : margem >= 28 ? "text-amber-600" : "text-red-500")}>{margem >= 35 ? "Acima da meta" : margem >= 28 ? "Próximo da meta" : "Abaixo da meta"}</span>
            <span className="text-[11px] text-gray-400 font-medium">Meta: 35%</span>
          </div>
        </div>

        {/* Bottom row: per-unit + history */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 border-t border-gray-100 pt-5">
          {/* Per unit */}
          <div className="pr-20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Por {unidadeLabel}</p>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {([
                  { key: "duzia" as const, label: "Dúzia" },
                  { key: "unidade" as const, label: "Unidade" },
                  { key: "bandeja" as const, label: "Bandeja 30" },
                ]).map((u) => (
                  <button
                    key={u.key}
                    onClick={() => setUnidade(u.key)}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all duration-200 cursor-pointer",
                      unidade === u.key
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { label: `Receita${unidadeSuffix}`, value: `R$ ${receitaUn.toFixed(2).replace(".", ",")}`, color: "bg-blue-500" },
                { label: `Custo${unidadeSuffix}`, value: `R$ ${custoUn.toFixed(2).replace(".", ",")}`, color: "bg-gray-300" },
                { label: `Lucro${unidadeSuffix}`, value: `R$ ${lucroUn.toFixed(2).replace(".", ",")}`, color: "bg-emerald-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={cn("w-1.5 h-6 rounded-full", item.color)} />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm text-gray-600 font-medium">{item.label}</span>
                    <span className="text-sm font-bold text-gray-900 tabular-nums">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Evolução Mensal da Margem</p>
                <span className="relative group">
                  <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 transition-colors cursor-help" />
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 px-3 py-2.5 text-xs text-center font-normal normal-case tracking-normal text-gray-700 bg-white border border-gray-200 rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50">
                    Margem = Lucro / Receita × 100
                  </span>
                </span>
              </div>
              <select
                value={anoLucro}
                onChange={(e) => setAnoLucro(Number(e.target.value))}
                className="text-[11px] font-semibold text-gray-600 bg-gray-100 border-none rounded-lg px-2.5 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none pr-6"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 4px center", backgroundRepeat: "no-repeat", backgroundSize: "16px" }}
              >
                {[new Date().getFullYear() - 1, new Date().getFullYear()].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="max-h-[180px] overflow-y-auto overflow-x-hidden pr-1 space-y-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
              {lucratividade.map((m, i) => {
                const isLast = i === lucratividade.length - 1;
                return (
                  <div key={m.mes} className={cn("flex items-center gap-3 p-2 -mx-2 rounded-lg transition-colors", isLast && "bg-emerald-50/50")}>
                    <span className={cn("text-[11px] font-bold w-7", isLast ? "text-emerald-600" : "text-gray-400")}>{m.mes}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-500", m.margem >= 35 ? "bg-emerald-400" : m.margem >= 28 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${(m.margem / 50) * 100}%` }} />
                      </div>
                      <span className={cn("text-[11px] font-semibold tabular-nums w-10 text-right", isLast ? "text-emerald-700" : "text-gray-600")}>{m.margem.toFixed(1)}%</span>
                    </div>
                    <span className={cn("text-[11px] font-semibold tabular-nums w-16 text-right", isLast ? "text-emerald-700" : "text-gray-600")}>{formatCurrency(m.lucro)}</span>
                  </div>
                );
              })}
              {lucratividade.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">Sem dados para {anoLucro}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Insights ── */}
      {showSalesPremiumFeatures && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assistente de Granja */}
        {showSalesPremiumFeatures && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm"><Zap className="w-5 h-5 text-white" /></div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Assistente de Granja</h3>
                <p className="text-[11px] text-gray-400 font-medium">Análise comercial — Período Selecionado</p>
              </div>
            </div>
            <RequiredPlanBadge requiredPlan="premium" className="flex-shrink-0" />
          </div>
          {plan !== "premium" ? (
            <AssistantLockedPreview
              lockedMessage="Desbloqueie o Assistente de Granja"
              overlayClassName="flex-1"
              className="h-full min-h-[360px] flex flex-col"
              itemClassName="flex-1"
            />
          ) : (
          <div className="space-y-2 overflow-y-auto pr-1 flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {[
              ...insights,
              { type: "info" as const, title: "Sazonalidade detectada em ovos Caipira", action: "Aumente o estoque 20% nos meses de pico para maximizar receita" },
              { type: "success" as const, title: "Mix de clientes está bem distribuído", action: "Mantenha a diversificação atual para reduzir risco de concentração" },
              { type: "warning" as const, title: "Previsão: queda de 12% na receita no próximo mês", action: "Antecipe negociações com clientes recorrentes para garantir volume" },
            ].map((ins, i) => {
              const link = insightHref(`${ins.title} ${ins.action}`);
              const card = (
                <div className={cn("p-3.5 rounded-xl border-l-[3px]", ins.type === "success" && "bg-emerald-50/50 border-l-emerald-500", ins.type === "warning" && "bg-amber-50/50 border-l-amber-500", ins.type === "info" && "bg-blue-50/50 border-l-blue-500")}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", ins.type === "success" && "bg-emerald-100", ins.type === "warning" && "bg-amber-100", ins.type === "info" && "bg-blue-100")}>
                      {ins.type === "success" && <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />}
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
              if (plan !== "premium" && i >= 2) {
                return (
                  <LockedOverlay key={i} message="Desbloqueie mais análises comerciais" targetPlan="premium">
                    {card}
                  </LockedOverlay>
                );
              }
              return <div key={i}>{card}</div>;
            })}
            {insights.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">Sem insights suficientes no período</div>
            )}
          </div>
          )}
        </div>
        )}

        {/* Preço Ideal Sugerido */}
        {plan !== "premium" ? (
        <LockedOverlay message="Desbloqueie o preço ideal sugerido" targetPlan="premium" preserveFirstChild>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Preço Ideal Sugerido</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Baseado em custo + margem meta</p>
            </div>
            <div className="flex items-center gap-2">
              <RequiredPlanBadge requiredPlan="premium" className="flex-shrink-0" />
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {([
                { key: "duzia" as const, label: "Dúzia" },
                { key: "unidade" as const, label: "Unidade" },
                { key: "bandeja" as const, label: "Bd 30" },
              ]).map((u) => (
                <button
                  key={u.key}
                  onClick={() => setUnidade(u.key)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all duration-200 cursor-pointer",
                    unidade === u.key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  {u.label}
                </button>
              ))}
              </div>
            </div>
          </div>
          {(() => {
            const custoBase = custoUn;
            const precoIdeal = custoBase / (1 - margemDesejada / 100);
            const lucroIdeal = precoIdeal - custoBase;
            const diff = Math.round((precoIdeal - receitaUn) * 100) / 100;
            const sliderColor = margemDesejada >= 35 ? "#10b981" : margemDesejada >= 28 ? "#f59e0b" : "#ef4444";
            const sliderPct = ((margemDesejada - 10) / 50) * 100;
            return (
              <div className="space-y-5 flex-1">
                {/* Slider */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">Margem desejada</span>
                    <span className="text-3xl font-black tabular-nums tracking-tight" style={{ color: sliderColor }}>{margemDesejada.toFixed(1)}%</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={10}
                      max={60}
                      step={0.1}
                      value={margemDesejada}
                      onChange={(e) => setMargemDesejada(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${sliderPct}%, #f1f5f9 ${sliderPct}%, #f1f5f9 100%)`, accentColor: sliderColor }}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-400">10%</span>
                      <span className="text-[10px] text-gray-400">60%</span>
                    </div>
                  </div>
                </div>

                {/* Result */}
                <div className={cn("rounded-xl p-4 border-2 transition-colors duration-300", margemDesejada >= 35 ? "bg-emerald-50/50 border-emerald-200" : margemDesejada >= 28 ? "bg-amber-50/50 border-amber-200" : "bg-red-50/50 border-red-200")}>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Preço ideal{unidadeSuffix}</p>
                  <div className="flex items-end justify-between mb-3">
                    <p className="text-3xl font-bold text-gray-900 tracking-tight tabular-nums">R$ {precoIdeal.toFixed(2).replace(".", ",")}</p>
                    <span className={cn("text-sm font-bold", diff > 0 ? "text-red-500" : "text-emerald-600")}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(2).replace(".", ",")} vs atual
                    </span>
                  </div>
                  <div className="h-px bg-gray-200/60 mb-3" />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium mb-0.5">Custo</p>
                      <p className="text-sm font-bold text-gray-900 tabular-nums">R$ {custoBase.toFixed(2).replace(".", ",")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium mb-0.5">Lucro{unidadeSuffix}</p>
                      <p className="text-sm font-bold text-emerald-700 tabular-nums">R$ {lucroIdeal.toFixed(2).replace(".", ",")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium mb-0.5">Lucro atual</p>
                      <p className="text-sm font-bold text-gray-500 tabular-nums">R$ {lucroUn.toFixed(2).replace(".", ",")}</p>
                    </div>
                  </div>
                </div>

                {/* Comparison */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-medium">Preço atual</span>
                    <span className="text-sm font-bold text-gray-900 tabular-nums">R$ {receitaUn.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-medium">Margem atual</span>
                    <span className={cn("text-sm font-bold", margem >= 35 ? "text-emerald-600" : margem >= 28 ? "text-amber-600" : "text-red-500")}>{margem.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-medium flex-shrink-0">Ajuste necessário</span>
                    <span className={cn("text-sm font-bold tabular-nums text-right", diff > 0 ? "text-red-500" : "text-emerald-600")}>{diff > 0 ? `+R$ ${diff.toFixed(2).replace(".", ",")}` : diff < -0.01 ? `−R$ ${Math.abs(diff).toFixed(2).replace(".", ",")}` : "Nenhum"}</span>
                  </div>
                  <div className="h-px bg-gray-100 my-1" />
                  <div className={cn("flex items-center justify-between p-2.5 rounded-lg", diff * volumeTotal >= 0 ? "bg-emerald-50/60" : "bg-red-50/60")}>
                    <span className="text-sm text-gray-700 font-semibold">Impacto na receita</span>
                    <span className={cn("text-sm font-black tabular-nums", diff * volumeTotal >= 0 ? "text-emerald-700" : "text-red-600")}>{diff * volumeTotal >= 0 ? "+" : ""}{formatCurrency(diff * volumeTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
        </LockedOverlay>
        ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Preço Ideal Sugerido</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Baseado em custo + margem meta</p>
            </div>
            <div className="flex items-center gap-2">
              <RequiredPlanBadge requiredPlan="premium" className="flex-shrink-0" />
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {([
                { key: "duzia" as const, label: "Dúzia" },
                { key: "unidade" as const, label: "Unidade" },
                { key: "bandeja" as const, label: "Bd 30" },
              ]).map((u) => (
                <button
                  key={u.key}
                  onClick={() => setUnidade(u.key)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all duration-200 cursor-pointer",
                    unidade === u.key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  {u.label}
                </button>
              ))}
              </div>
            </div>
          </div>
          {(() => {
            const custoBase = custoUn;
            const precoIdeal = custoBase / (1 - margemDesejada / 100);
            const lucroIdeal = precoIdeal - custoBase;
            const diff = Math.round((precoIdeal - receitaUn) * 100) / 100;
            const sliderColor = margemDesejada >= 35 ? "#10b981" : margemDesejada >= 28 ? "#f59e0b" : "#ef4444";
            const sliderPct = ((margemDesejada - 10) / 50) * 100;
            return (
              <div className="space-y-5 flex-1">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">Margem desejada</span>
                    <span className="text-3xl font-black tabular-nums tracking-tight" style={{ color: sliderColor }}>{margemDesejada.toFixed(1)}%</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={10}
                      max={60}
                      step={0.1}
                      value={margemDesejada}
                      onChange={(e) => setMargemDesejada(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${sliderPct}%, #f1f5f9 ${sliderPct}%, #f1f5f9 100%)`, accentColor: sliderColor }}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-400">10%</span>
                      <span className="text-[10px] text-gray-400">60%</span>
                    </div>
                  </div>
                </div>
                <div className={cn("rounded-xl p-4 border-2 transition-colors duration-300", margemDesejada >= 35 ? "bg-emerald-50/50 border-emerald-200" : margemDesejada >= 28 ? "bg-amber-50/50 border-amber-200" : "bg-red-50/50 border-red-200")}>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Preço ideal{unidadeSuffix}</p>
                  <div className="flex items-end justify-between mb-3">
                    <p className="text-3xl font-bold text-gray-900 tracking-tight tabular-nums">R$ {precoIdeal.toFixed(2).replace(".", ",")}</p>
                    <span className={cn("text-sm font-bold", diff > 0 ? "text-red-500" : "text-emerald-600")}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(2).replace(".", ",")} vs atual
                    </span>
                  </div>
                  <div className="h-px bg-gray-200/60 mb-3" />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium mb-0.5">Custo</p>
                      <p className="text-sm font-bold text-gray-900 tabular-nums">R$ {custoBase.toFixed(2).replace(".", ",")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium mb-0.5">Lucro{unidadeSuffix}</p>
                      <p className="text-sm font-bold text-emerald-700 tabular-nums">R$ {lucroIdeal.toFixed(2).replace(".", ",")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium mb-0.5">Lucro atual</p>
                      <p className="text-sm font-bold text-gray-500 tabular-nums">R$ {lucroUn.toFixed(2).replace(".", ",")}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-medium">Preço atual</span>
                    <span className="text-sm font-bold text-gray-900 tabular-nums">R$ {receitaUn.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-medium">Margem atual</span>
                    <span className={cn("text-sm font-bold", margem >= 35 ? "text-emerald-600" : margem >= 28 ? "text-amber-600" : "text-red-500")}>{margem.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 font-medium flex-shrink-0">Ajuste necessário</span>
                    <span className={cn("text-sm font-bold tabular-nums text-right", diff > 0 ? "text-red-500" : "text-emerald-600")}>{diff > 0 ? `+R$ ${diff.toFixed(2).replace(".", ",")}` : diff < -0.01 ? `−R$ ${Math.abs(diff).toFixed(2).replace(".", ",")}` : "Nenhum"}</span>
                  </div>
                  <div className="h-px bg-gray-100 my-1" />
                  <div className={cn("flex items-center justify-between p-2.5 rounded-lg", diff * volumeTotal >= 0 ? "bg-emerald-50/60" : "bg-red-50/60")}>
                    <span className="text-sm text-gray-700 font-semibold">Impacto na receita</span>
                    <span className={cn("text-sm font-black tabular-nums", diff * volumeTotal >= 0 ? "text-emerald-700" : "text-red-600")}>{diff * volumeTotal >= 0 ? "+" : ""}{formatCurrency(diff * volumeTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
        )}
      </div>
      )}

      {/* ── Charts: Receita Diária + Histórico de Preço ── */}
      {showSalesProFeatures && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Receita Diária + Volume */}
        {plan === "essencial" ? (
        <LockedOverlay message="Desbloqueie a receita diária" targetPlan="pro" className="lg:col-span-2 h-full" preserveFirstChild>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 h-full min-h-[360px]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Receita Diária</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Receita × Volume — Período Selecionado</p>
            </div>
            <div className="flex items-center gap-3">
              <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-gray-400 font-medium">Receita</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-purple-200" />
                <span className="text-[10px] text-gray-400 font-medium">Volume</span>
              </div>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={receitaDiaria} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "12px", padding: "10px 14px" }}
                  formatter={((value: any, name: any) => [name === "receita" ? `R$ ${Number(value).toLocaleString("pt-BR")}` : `${value} dz`, name === "receita" ? "Receita" : "Volume"]) as any}
                  labelFormatter={((l: any) => `Dia ${l}`) as any}
                />
                <Bar yAxisId="right" dataKey="volume" fill="#c4b5fd" radius={[4, 4, 0, 0]} barSize={20} opacity={0.6} />
                <Area yAxisId="left" type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2.5} fill="url(#receitaGrad)" dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        </LockedOverlay>
        ) : (
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 h-full min-h-[360px]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Receita Diária</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Receita × Volume — Período Selecionado</p>
            </div>
            <div className="flex items-center gap-3">
              <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-gray-400 font-medium">Receita</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-purple-200" />
                <span className="text-[10px] text-gray-400 font-medium">Volume</span>
              </div>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={receitaDiaria} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="receitaGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "12px", padding: "10px 14px" }}
                  formatter={((value: any, name: any) => [name === "receita" ? `R$ ${Number(value).toLocaleString("pt-BR")}` : `${value} dz`, name === "receita" ? "Receita" : "Volume"]) as any}
                  labelFormatter={((l: any) => `Dia ${l}`) as any}
                />
                <Bar yAxisId="right" dataKey="volume" fill="#c4b5fd" radius={[4, 4, 0, 0]} barSize={20} opacity={0.6} />
                <Area yAxisId="left" type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2.5} fill="url(#receitaGrad2)" dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {/* Histórico de Preço */}
        {plan === "essencial" ? (
        <LockedOverlay message="Desbloqueie o histórico de preço" targetPlan="pro" className="h-full" preserveFirstChild>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-full min-h-[360px]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Preço Médio / Dz</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Evolução vs meta</p>
            </div>
            <div className="flex items-center gap-2">
              <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
              <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full", precoMedio >= 12.5 ? "text-emerald-700 bg-emerald-50" : "text-amber-600 bg-amber-50")}>
                {precoMedio >= 12.5 ? "Na meta" : "Abaixo"}
              </span>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicoPreco} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={[11, 15]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v.toFixed(1)}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "12px", padding: "10px 14px" }}
                  formatter={((value: any, name: any) => [`R$ ${Number(value).toFixed(2).replace(".", ",")}`, name === "preco" ? "Preço Médio" : "Meta"]) as any}
                />
                <Line type="monotone" dataKey="meta" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="preco" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-gray-300 rounded-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, #d1d5db 0, #d1d5db 4px, transparent 4px, transparent 8px)" }} />
              <span className="text-[10px] text-gray-400 font-medium">Meta R$ 13,00</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-purple-500 rounded-full" />
              <span className="text-[10px] text-gray-400 font-medium">Preço real</span>
            </div>
          </div>
        </div>
        </LockedOverlay>
        ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-full min-h-[360px]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Preço Médio / Dz</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Evolução vs meta</p>
            </div>
            <div className="flex items-center gap-2">
              <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
              <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full", precoMedio >= 12.5 ? "text-emerald-700 bg-emerald-50" : "text-amber-600 bg-amber-50")}>
                {precoMedio >= 12.5 ? "Na meta" : "Abaixo"}
              </span>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicoPreco} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={[11, 15]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v.toFixed(1)}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "12px", padding: "10px 14px" }}
                  formatter={((value: any, name: any) => [`R$ ${Number(value).toFixed(2).replace(".", ",")}`, name === "preco" ? "Preço Médio" : "Meta"]) as any}
                />
                <Line type="monotone" dataKey="meta" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="preco" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-gray-300 rounded-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, #d1d5db 0, #d1d5db 4px, transparent 4px, transparent 8px)" }} />
              <span className="text-[10px] text-gray-400 font-medium">Meta R$ 13,00</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-purple-500 rounded-full" />
              <span className="text-[10px] text-gray-400 font-medium">Preço real</span>
            </div>
          </div>
        </div>
        )}
      </div>
      )}

      {/* ── Selling Records Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#101d3a] flex items-center justify-center shadow-sm">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Registros de Vendas</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">{filteredVendas.length} vendas — Período Selecionado</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, tipo, notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          {loading ? (
             <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Carregando dados...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/50">
                  <th className="text-left py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Data</th>
                  <th className="text-left py-3 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="text-left py-3 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tipo de Ovo</th>
                  <th className="text-left py-3 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status Pagto.</th>
                  <th className="text-right py-3 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Qtd (dz)</th>
                  <th className="text-right py-3 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Preço/dz</th>
                  <th className="text-right py-3 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="text-right py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendas.map((v) => {
                  const statusConf = STATUS_CONFIG[v.payment_status] || STATUS_CONFIG.paid;
                  return (
                    <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-5 text-gray-500 font-medium">{formatDate(v.data)}</td>
                      <td className="py-3.5 px-3 font-semibold text-gray-900">{v.clienteNome}</td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-semibold">{v.egg_type}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", statusConf.bg, statusConf.color)}>
                          <statusConf.icon className="w-3 h-3" />
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-semibold text-gray-900 tabular-nums">{v.quantidade}</td>
                      <td className="py-3.5 px-3 text-right text-gray-500 tabular-nums">R$ {v.precoUn.toFixed(2).replace(".", ",")}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-gray-900 tabular-nums">{formatCurrency(v.total)}</td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-end gap-1">
                          {deleteConfirm === v.id ? (
                            <>
                              <button onClick={() => deleteVenda(v.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Confirmar">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteConfirm(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Cancelar">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => openEdit(v)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer" title="Editar">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteConfirm(v.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Excluir">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredVendas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      Nenhuma venda encontrada
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredVendas.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                    <td className="py-3.5 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider" colSpan={4}>Total</td>
                    <td className="py-3.5 px-3 text-right font-bold text-gray-900 tabular-nums">{filteredVendas.reduce((s, v) => s + v.quantidade, 0).toLocaleString("pt-BR")}</td>
                    <td className="py-3.5 px-3 text-right text-gray-500 tabular-nums text-xs">média R$ {(filteredVendas.reduce((s, v) => s + v.precoUn, 0) / filteredVendas.length).toFixed(2).replace(".", ",")}</td>
                    <td className="py-3.5 px-3 text-right font-bold text-emerald-700 tabular-nums">{formatCurrency(filteredVendas.reduce((s, v) => s + v.total, 0))}</td>
                    <td className="py-3.5 px-5" />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                  <ShoppingCart className="w-4.5 h-4.5 text-purple-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {modal === "add" ? "Registrar Venda" : "Editar Venda"}
                </h3>
              </div>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Data</label>
                  <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Cliente</label>
                  <select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all appearance-none cursor-pointer">
                    <option value="">Selecione...</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tipo de Ovo</label>
                  <select value={form.egg_type} onChange={(e) => setForm({ ...form, egg_type: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all appearance-none cursor-pointer">
                    {EGG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status Pagamento</label>
                  <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value as any })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all appearance-none cursor-pointer">
                    <option value="paid">Pago</option>
                    <option value="pending">A Receber</option>
                    <option value="overdue">Atrasado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Quantidade (dúzias)</label>
                  <input type="number" min="1" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Preço / Dúzia (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.precoUn} onChange={(e) => setForm({ ...form, precoUn: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Observações</label>
                <textarea rows={2} placeholder="Notas adicionais..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all placeholder:text-gray-400 resize-none" />
              </div>

              {form.quantidade && form.precoUn && (
                <div className="p-3.5 bg-emerald-50 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-emerald-600 font-semibold">Total estimado</span>
                  <span className="text-lg font-bold text-emerald-700">{formatCurrency((Number(form.quantidade) || 0) * (Number(form.precoUn) || 0))}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
                Cancelar
              </button>
              <button onClick={save} disabled={!form.data || !form.clienteId || !form.quantidade || !form.precoUn} className={cn("flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors cursor-pointer shadow-sm shadow-brand-600/20", (!form.data || !form.clienteId || !form.quantidade || !form.precoUn) ? "bg-brand-300 cursor-not-allowed" : "bg-brand-600 hover:bg-brand-700")}>
                {modal === "add" ? "Registrar" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
