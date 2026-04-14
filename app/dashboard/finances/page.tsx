"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import ModalPortal from "@/components/ui/modal-portal";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  BarChart3,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  Sparkles,
  Zap,
  Droplets,
  Wrench,
  Users,
  Wheat,
  Pill,
  MoreHorizontal,
  Target,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Receipt,
  ShieldCheck,
  Scale,
  CircleDollarSign,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useDateFilter, CalendarFilter } from "@/components/date-filter";
import { cn } from "@/lib/utils";
import { getTransactionsByDateRange, getFinancialSummaryInRange, type FinancialTransaction, type FinancialSummaryData } from "@/lib/services/finances";
import { getFarmBirdCount } from "@/lib/services/farms";
import { transactionCategories, type TransactionCategoryKey } from "@/lib/constants/transaction-categories";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";


interface Venda {
  id: string | number;
  data: string;
  cliente: string;
  lote: string;
  galpao: string;
  quantidade: number;
  precoUn: number;
  total: number;
}

const clienteOptions = ["Mercado Central", "Padaria Boa Mesa", "Restaurante Sabor", "Supermercado BH", "Feira Livre"];
const loteOptions = ["L-2024-01", "L-2024-02", "L-2024-03", "L-2024-04"];

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

export default function FinancasPage() {
  const { farm } = useAuth();
  const { dateRange, filterMode } = useDateFilter();

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummaryData | null>(null);
  const [totalAves, setTotalAves] = useState(0);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Venda | null>(null);
  const [form, setForm] = useState({ data: "", cliente: "", lote: "", galpao: "", quantidade: "", precoUn: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<string | number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [breakdownTab, setBreakdownTab] = useState<"cliente" | "lote" | "galpao">("cliente");

  const fetchData = useCallback(async () => {
    if (!farm?.id) return;
    setLoading(true);
    try {
      const [transRes, summaryRes, birdCount] = await Promise.all([
        getTransactionsByDateRange(farm.id, dateRange.startDate, dateRange.endDate),
        getFinancialSummaryInRange(farm.id, dateRange.startDate, dateRange.endDate),
        getFarmBirdCount(farm.id),
      ]);

      setTransactions(transRes);

      const mappedVendas: Venda[] = transRes
        .filter(t => t.type === "revenue")
        .map(t => ({
          id: t.id,
          data: t.date,
          cliente: t.description,
          lote: t.reference || "N/A",
          galpao: "Geral",
          quantidade: 0,
          precoUn: 0,
          total: Number(t.amount),
        }));

      setVendas(mappedVendas);
      setSummary(summaryRes);
      setTotalAves(birdCount);
    } catch (err) {
      console.error("Error fetching financial data:", err);
    } finally {
      setLoading(false);
    }
  }, [farm?.id, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const periodoVendas = useMemo(() => vendas, [vendas]);

  const periodoLabel = filterMode === "dia" ? "Hoje" : filterMode === "intervalo" ? "Esta Semana" : "Este Mês";

  const despesasFiltradas = useMemo(() => {
    if (!summary) return [];
    return (Object.entries(summary.categoryTotals) as [TransactionCategoryKey, number][]).map(([key, valor]) => {
      const cat = transactionCategories[key];
      const porcentagem = summary.expenses > 0 ? Math.round((valor / summary.expenses) * 100) : 0;
      
      let color = "#6b7280";
      let icon = MoreHorizontal;
      if (key === "feed") { color = "#f59e0b"; icon = Wheat; }
      else if (key === "labor") { color = "#3b82f6"; icon = Users; }
      else if (key === "energy") { color = "#f97316"; icon = Zap; }
      else if (key === "water") { color = "#06b6d4"; icon = Droplets; }
      else if (key === "medicines") { color = "#ef4444"; icon = Pill; }
      else if (key === "maintenance") { color = "#8b5cf6"; icon = Wrench; }

      return { categoria: cat.label, valor, porcentagem, color, icon };
    }).filter(d => d.valor > 0).sort((a, b) => b.valor - a.valor);
  }, [summary]);

  const revenueVsExpenseChartData = useMemo(() => {
    if (!transactions.length) return [];
    const map: Record<string, { dia: string; receita: number; despesa: number }> = {};
    transactions.forEach((t) => {
      const key = filterMode === "mes"
        ? t.date.substring(0, 7)
        : t.date.substring(0, 10);
      if (!map[key]) map[key] = { dia: key, receita: 0, despesa: 0 };
      if (t.type === "revenue") map[key].receita += Number(t.amount);
      else if (t.type === "expense") map[key].despesa += Number(t.amount);
    });
    return Object.values(map).sort((a, b) => a.dia.localeCompare(b.dia));
  }, [transactions, filterMode]);

  const fluxoMensalData = useMemo(() => {
    if (!transactions.length) return [];
    const map: Record<string, { mes: string; receita: number; despesa: number; lucro: number }> = {};
    transactions.forEach((t) => {
      const ym = t.date.substring(0, 7);
      if (!map[ym]) map[ym] = { mes: ym, receita: 0, despesa: 0, lucro: 0 };
      if (t.type === "revenue") map[ym].receita += Number(t.amount);
      else if (t.type === "expense") map[ym].despesa += Number(t.amount);
    });
    return Object.values(map)
      .map((m) => ({ ...m, lucro: m.receita - m.despesa }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [transactions]);

  const historicoPrecosData = useMemo(() => {
    if (!transactions.length) return [];
    const revenueByMonth: Record<string, { total: number; count: number }> = {};
    transactions.filter(t => t.type === "revenue").forEach((t) => {
      const ym = t.date.substring(0, 7);
      if (!revenueByMonth[ym]) revenueByMonth[ym] = { total: 0, count: 0 };
      revenueByMonth[ym].total += Number(t.amount);
      revenueByMonth[ym].count += 1;
    });
    return Object.entries(revenueByMonth)
      .map(([mes, d]) => ({ mes, preco: d.count > 0 ? d.total / d.count : 0 }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [transactions]);

  const totalDespesasFiltradas = summary?.expenses ?? 0;
  const receitaPeriodo = summary?.revenue ?? 0;
  const despesaPeriodo = summary?.expenses ?? 0;
  const lucroLiquido = summary?.profit ?? 0;
  const margem = receitaPeriodo > 0 ? ((lucroLiquido / receitaPeriodo) * 100) : 0;
  const lucroPorAve = totalAves > 0 ? lucroLiquido / totalAves : 0;
  const volumeTotal = periodoVendas.reduce((s, v) => s + v.quantidade, 0);
  const precoMedio = volumeTotal > 0 ? receitaPeriodo / volumeTotal : 0;
  const custoOvo = despesaPeriodo > 0 && volumeTotal > 0 ? despesaPeriodo / (volumeTotal * 12) : 0;

  const metaReceita = summary?.revenueGoal ?? 20000;
  const progressoMeta = Math.min((receitaPeriodo / metaReceita) * 100, 100);

  const prev = {
    receita: filterMode === "dia" ? 1800 : filterMode === "intervalo" ? 8900 : 14200,
    despesa: filterMode === "dia" ? 520 : filterMode === "intervalo" ? 3600 : 15200,
    lucro: filterMode === "dia" ? 1280 : filterMode === "intervalo" ? 5300 : -1000,
    lucroPorAve: filterMode === "dia" ? 0.45 : filterMode === "intervalo" ? 1.86 : -0.35,
    precoMedio: filterMode === "dia" ? 13.0 : filterMode === "intervalo" ? 12.8 : 13.2,
    volume: filterMode === "dia" ? 150 : filterMode === "intervalo" ? 720 : 1180,
  };
  const periodoRef = filterMode === "dia" ? "vs ontem" : filterMode === "intervalo" ? "vs semana anterior" : "vs mês anterior";

  function calcVar(current: number, previous: number): { pct: string; dir: "up" | "down" } {
    if (previous === 0) return { pct: "+0.0%", dir: "up" };
    const v = ((current - previous) / Math.abs(previous)) * 100;
    return { pct: `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`, dir: v >= 0 ? "up" : "down" };
  }

  const varReceita = calcVar(receitaPeriodo, prev.receita);
  const varDespesa = calcVar(despesaPeriodo, prev.despesa);
  const varLucro = calcVar(lucroLiquido, prev.lucro);

  const filteredVendas = useMemo(() => {
    if (!searchQuery.trim()) return periodoVendas;
    const q = searchQuery.toLowerCase();
    return periodoVendas.filter(
      (v) =>
        v.cliente.toLowerCase().includes(q) ||
        v.lote.toLowerCase().includes(q) ||
        v.galpao.toLowerCase().includes(q) ||
        v.data.includes(q)
    );
  }, [periodoVendas, searchQuery]);

  const receitaPorCliente = useMemo(() => {
    const map = new Map<string, { valor: number; vendas: number }>();
    periodoVendas.forEach((v) => {
      const e = map.get(v.cliente) || { valor: 0, vendas: 0 };
      map.set(v.cliente, { valor: e.valor + v.total, vendas: e.vendas + 1 });
    });
    return Array.from(map.entries()).map(([nome, d]) => ({ nome, ...d })).sort((a, b) => b.valor - a.valor);
  }, [periodoVendas]);

  const receitaPorLote = useMemo(() => {
    const map = new Map<string, { valor: number; volume: number }>();
    periodoVendas.forEach((v) => {
      const e = map.get(v.lote) || { valor: 0, volume: 0 };
      map.set(v.lote, { valor: e.valor + v.total, volume: e.volume + v.quantidade });
    });
    return Array.from(map.entries()).map(([nome, d]) => ({ nome, ...d })).sort((a, b) => b.valor - a.valor);
  }, [periodoVendas]);

  const receitaPorGalpao = useMemo(() => {
    const map = new Map<string, number>();
    periodoVendas.forEach((v) => { map.set(v.galpao, (map.get(v.galpao) || 0) + v.total); });
    return Array.from(map.entries()).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  }, [periodoVendas]);

  const breakdownData = breakdownTab === "cliente" ? receitaPorCliente : breakdownTab === "lote" ? receitaPorLote : receitaPorGalpao;

  const healthScore = useMemo(() => {
    let score = 0;
    if (margem > 15) score += 30; else if (margem > 5) score += 15; else if (margem > 0) score += 5;
    if (varReceita.dir === "up") score += 20; else score += 5;
    if (varDespesa.dir === "down") score += 20; else score += 5;
    if (progressoMeta > 75) score += 20; else if (progressoMeta > 50) score += 10;
    if (lucroPorAve > 0) score += 10; else score += 0;
    return Math.min(score, 100);
  }, [margem, varReceita, varDespesa, progressoMeta, lucroPorAve]);

  const healthLabel = healthScore >= 70 ? "Saudável" : healthScore >= 40 ? "Atenção" : "Crítico";
  const healthColor = healthScore >= 70 ? "emerald" : healthScore >= 40 ? "amber" : "red";

  const actionItems = useMemo(() => {
    const items: { icon: typeof AlertTriangle; text: string; type: "warning" | "success" | "info" }[] = [];
    if (margem < 10) items.push({ icon: AlertTriangle, text: "Margem abaixo de 10% — revise custos com ração", type: "warning" });
    if (varDespesa.dir === "up") items.push({ icon: AlertTriangle, text: `Despesas subiram ${varDespesa.pct} — investigue ração e energia`, type: "warning" });
    if (precoMedio < 12.5 && precoMedio > 0) items.push({ icon: TrendingDown, text: "Preço médio em queda — renegocie com clientes", type: "warning" });
    if (progressoMeta < 50 && filterMode === "mes") items.push({ icon: Target, text: `Meta de receita em ${progressoMeta.toFixed(0)}% — acelere vendas`, type: "info" });
    if (lucroLiquido > 0 && varLucro.dir === "up") items.push({ icon: CheckCircle2, text: `Lucro cresceu ${varLucro.pct} — tendência positiva`, type: "success" });
    if (varReceita.dir === "up") items.push({ icon: CheckCircle2, text: `Receita subiu ${varReceita.pct} — bom ritmo de vendas`, type: "success" });
    return items;
  }, [margem, varDespesa, precoMedio, progressoMeta, lucroLiquido, varLucro, varReceita, filterMode]);

  function openAdd() {
    setForm({ data: "", cliente: "", lote: "", galpao: "", quantidade: "", precoUn: "" });
    setEditing(null);
    setModal("add");
  }

  function openEdit(v: Venda) {
    setForm({ data: v.data, cliente: v.cliente, lote: v.lote, galpao: v.galpao, quantidade: String(v.quantidade), precoUn: String(v.precoUn) });
    setEditing(v);
    setModal("edit");
  }

  function save() {
    if (!form.data.trim() || !form.cliente.trim() || !form.lote.trim()) return;
    const quantidade = Number(form.quantidade) || 0;
    const precoUn = Number(form.precoUn) || 0;
    const venda: Venda = { id: editing?.id || Date.now(), data: form.data, cliente: form.cliente, lote: form.lote, galpao: form.galpao, quantidade, precoUn, total: quantidade * precoUn };
    if (modal === "add") setVendas((prev) => [venda, ...prev]);
    else if (editing) setVendas((prev) => prev.map((v) => (v.id === editing.id ? venda : v)));
    setModal(null);
  }

  function deleteVenda(id: string | number) {
    setVendas((prev) => prev.filter((v) => v.id !== id));
    setDeleteConfirm(null);
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

  return (
    <div className="space-y-6 relative">
      {loading && (
        <div className="absolute inset-0 z-[55] flex items-start justify-center pt-32 bg-white/60 backdrop-blur-[2px] transition-all duration-300">
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white shadow-xl border border-gray-100">
            <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
            <p className="text-sm font-bold text-gray-600 tracking-tight">Carregando dados financeiros...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finanças</h1>
            <p className="text-sm text-gray-500 mt-0.5">Controle financeiro completo da granja</p>
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

      {/* Financial Health Banner */}
      <div className={cn(
        "rounded-2xl p-5 border transition-all duration-300",
        healthColor === "emerald" && "bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-white border-emerald-200/60",
        healthColor === "amber" && "bg-gradient-to-r from-amber-50 via-amber-50/50 to-white border-amber-200/60",
        healthColor === "red" && "bg-gradient-to-r from-red-50 via-red-50/50 to-white border-red-200/60",
      )}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 lg:min-w-[280px]">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                <circle
                  cx="32" cy="32" r="28" fill="none"
                  stroke={healthColor === "emerald" ? "#10b981" : healthColor === "amber" ? "#f59e0b" : "#ef4444"}
                  strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${(healthScore / 100) * 175.9} 175.9`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn(
                  "text-base font-bold",
                  healthColor === "emerald" && "text-emerald-700",
                  healthColor === "amber" && "text-amber-700",
                  healthColor === "red" && "text-red-700",
                )}>{healthScore}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn(
                  "w-4 h-4",
                  healthColor === "emerald" && "text-emerald-600",
                  healthColor === "amber" && "text-amber-600",
                  healthColor === "red" && "text-red-600",
                )} />
                <span className="text-sm font-bold text-gray-900">Saúde Financeira</span>
              </div>
              <p className={cn(
                "text-xl font-bold mt-0.5",
                healthColor === "emerald" && "text-emerald-700",
                healthColor === "amber" && "text-amber-700",
                healthColor === "red" && "text-red-700",
              )}>{healthLabel}</p>
              <p className="text-xs text-gray-500 mt-0.5">Margem: {margem.toFixed(1)}% | Custo/ovo: {formatCurrency(custoOvo)}</p>
            </div>
          </div>

          <div className="hidden lg:block w-px h-14 bg-gray-200" />

          <div className="flex-1 space-y-2">
            {actionItems.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                  item.type === "warning" && "bg-amber-100",
                  item.type === "success" && "bg-emerald-100",
                  item.type === "info" && "bg-blue-100",
                )}>
                  <item.icon className={cn(
                    "w-3.5 h-3.5",
                    item.type === "warning" && "text-amber-600",
                    item.type === "success" && "text-emerald-600",
                    item.type === "info" && "text-blue-600",
                  )} />
                </div>
                <p className="text-sm text-gray-700">{item.text}</p>
              </div>
            ))}
            {!loading && actionItems.length === 0 && (
              <p className="text-sm text-gray-500">Sem alertas no momento.</p>
            )}
          </div>
        </div>
      </div>

      {/* Main KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-lg",
              varReceita.dir === "up" ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
            )}>
              {varReceita.dir === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {varReceita.pct}
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Receita</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(receitaPeriodo)}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Receita — {periodoLabel}</p>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Meta: {formatCurrency(metaReceita)}</span>
              <span className="font-semibold text-gray-600">{progressoMeta.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${progressoMeta}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-red-500" />
            </div>
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-lg",
              varDespesa.dir === "up" ? "text-red-600 bg-red-50" : "text-emerald-700 bg-emerald-50"
            )}>
              {varDespesa.dir === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {varDespesa.pct}
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Despesas</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(despesaPeriodo)}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Despesas — {periodoLabel}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <Wheat className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-gray-500">
              {despesasFiltradas.length > 0 ? `${despesasFiltradas[0].categoria} = ${despesasFiltradas[0].porcentagem}% do total` : "Sem despesas"}
            </span>
          </div>
        </div>

        <div className={cn(
          "rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg",
          lucroLiquido >= 0
            ? "bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200/60 hover:shadow-emerald-200/30"
            : "bg-gradient-to-br from-red-50/80 to-white border-red-200/60 hover:shadow-red-200/30"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              lucroLiquido >= 0 ? "bg-emerald-100" : "bg-red-100"
            )}>
              <PiggyBank className={cn("w-5 h-5", lucroLiquido >= 0 ? "text-emerald-600" : "text-red-500")} />
            </div>
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-lg",
              varLucro.dir === "up" ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
            )}>
              {varLucro.dir === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {varLucro.pct}
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Lucro Líquido</p>
          <p className={cn(
            "text-2xl font-bold tracking-tight",
            lucroLiquido >= 0 ? "text-emerald-700" : "text-red-600"
          )}>{formatCurrency(lucroLiquido)}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Margem: {margem.toFixed(1)}%</p>
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              <Scale className={cn("w-3.5 h-3.5", lucroLiquido >= 0 ? "text-emerald-500" : "text-red-400")} />
              <span className="text-xs text-gray-500">Margem: <span className="font-semibold">{margem.toFixed(1)}%</span></span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-brand-600" />
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Lucro por Ave</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">R$ {lucroPorAve.toFixed(2).replace(".", ",")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="text-center p-1.5 rounded-lg bg-gray-50">
              <p className="text-xs font-bold text-gray-900">{precoMedio > 0 ? `R$ ${precoMedio.toFixed(2).replace(".", ",")}` : "—"}</p>
              <p className="text-[10px] text-gray-400">Preço/dz</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-gray-50">
              <p className="text-xs font-bold text-gray-900">{volumeTotal.toLocaleString("pt-BR")} dz</p>
              <p className="text-[10px] text-gray-400">Volume</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insight */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50/50 to-white border border-amber-200/60 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-400/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Assistente Financeiro</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-white/60 border border-amber-100">
                <TrendingDown className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Preço médio caiu 4%</p>
                  <p className="text-xs text-gray-500 mt-0.5">Impacto: <span className="font-semibold text-red-600">- R$ 1.000</span> na receita mensal</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-white/60 border border-amber-100">
                <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Volume cresceu 8%</p>
                  <p className="text-xs text-gray-500 mt-0.5">Compensa parcialmente a queda de preço</p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-brand-50/50 border border-brand-100">
              <ArrowRight className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <p className="text-xs text-brand-800 font-medium">Sugestão: Negocie preços fixos com Mercado Central e Supermercado BH para proteger a margem</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-900">Receita vs Despesa {filterMode === "intervalo" ? "Semanal" : filterMode === "mes" ? "Mensal" : "Diária"}</h3>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Receita</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Despesa</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">{filterMode === "intervalo" ? "Comparativo desta semana" : filterMode === "mes" ? "Comparativo mensal" : "Comparativo diário"}</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueVsExpenseChartData}>
              <defs>
                <linearGradient id="colorReceitaFin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDespesaFin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                formatter={(value: any, name: any) => [
                  `R$ ${Number(value).toLocaleString("pt-BR")}`,
                  String(name) === "receita" ? "Receita" : "Despesa"
                ]}
              />
              <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2.5} fill="url(#colorReceitaFin)" dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#10b981" }} />
              <Area type="monotone" dataKey="despesa" stroke="#f87171" strokeWidth={2} fill="url(#colorDespesaFin)" dot={{ fill: "#f87171", r: 2, strokeWidth: 0 }} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Fluxo de Caixa Mensal</h3>
          <p className="text-xs text-gray-400 mb-4">Receita, despesa e lucro por mês</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={fluxoMensalData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                formatter={(value: any, name: any) => [
                  formatCurrency(Number(value)),
                  String(name) === "receita" ? "Receita" : String(name) === "despesa" ? "Despesa" : "Lucro"
                ]}
              />
              <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="despesa" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="lucro" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {fluxoMensalData.map((entry, i) => (
                  <Cell key={i} fill={entry.lucro >= 0 ? "#34d399" : "#fca5a5"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Despesas — {periodoLabel}</h3>
          <p className="text-2xl font-bold text-gray-900 tracking-tight mb-3">{formatCurrency(totalDespesasFiltradas)}</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={despesasFiltradas} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="valor" nameKey="categoria" paddingAngle={3} strokeWidth={0}>
                {despesasFiltradas.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                formatter={(value: any, name: any) => [formatCurrency(Number(value)), String(name)]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {despesasFiltradas.slice(0, 4).map((d) => (
              <div key={d.categoria} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-gray-600">{d.categoria}</span>
                </div>
                <span className="text-xs font-semibold text-gray-800">{d.porcentagem}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-5">Detalhamento — {periodoLabel}</h3>
          <div className="space-y-3">
            {despesasFiltradas.map((d) => (
              <div key={d.categoria} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${d.color}15` }}>
                  <d.icon className="w-4 h-4" style={{ color: d.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-700">{d.categoria}</span>
                    <span className="text-xs font-bold text-gray-900">{formatCurrency(d.valor)}</span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${d.porcentagem}%`, backgroundColor: d.color }} />
                  </div>
                </div>
              </div>
            ))}
            {!loading && despesasFiltradas.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma despesa neste período</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Receitas por Categoria</h3>
              <p className="text-xs text-gray-400 mt-0.5">Receita por categoria — {periodoLabel}</p>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {([
                { key: "cliente" as const, label: "Cliente" },
                { key: "lote" as const, label: "Lote" },
                { key: "galpao" as const, label: "Galpão" },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setBreakdownTab(t.key)}
                  className={cn(
                    "px-3 py-1 text-[11px] font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                    breakdownTab === t.key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {breakdownData.map((d: any, i: number) => {
              const pct = receitaPeriodo > 0 ? (d.valor / receitaPeriodo) * 100 : 0;
              return (
                <div key={d.nome} className="flex items-center gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                    i === 0 && "bg-amber-100 text-amber-700",
                    i === 1 && "bg-gray-100 text-gray-600",
                    i === 2 && "bg-orange-50 text-orange-600",
                    i > 2 && "bg-gray-50 text-gray-400",
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      {breakdownTab === "lote" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-semibold">{d.nome}</span>
                      ) : (
                        <span className="text-sm font-medium text-gray-800 truncate">{d.nome}</span>
                      )}
                      <span className="text-sm font-bold text-gray-900 ml-2">{formatCurrency(d.valor)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-brand-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium w-8 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && breakdownData.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma venda neste período</p>
            )}
          </div>
        </div>
      </div>

      {/* Price History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Histórico de Preço / Dúzia</h3>
          <p className="text-xs text-gray-400 mb-4">Evolução do preço médio por dúzia</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={historicoPrecosData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis domain={["auto", "auto"]} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `R$ ${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, "Preço/dz"]}
              />
              <Line type="monotone" dataKey="preco" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: "#f59e0b" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-gray-900">Resumo de Hoje</h3>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tempo real
            </span>
          </div>

          <div className="space-y-3 flex-1">
            <div className="group relative p-4 rounded-xl bg-white border border-emerald-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/40 transition-all duration-200 cursor-default">
              <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-emerald-400" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CircleDollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-bold text-gray-800">Receita / Ave</span>
                </div>
                <p className="text-2xl font-extrabold text-emerald-700 tracking-tight">
                  R$ {totalAves > 0 ? (receitaPeriodo / totalAves).toFixed(2).replace(".", ",") : "0,00"}
                </p>
              </div>
              <div className="ml-10 flex items-start gap-1.5 p-2 rounded-lg bg-emerald-50/50">
                <Sparkles className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-emerald-700/80 leading-relaxed">Métricas reais baseadas em {totalAves} aves</p>
              </div>
            </div>

            <div className="group relative p-4 rounded-xl bg-white border border-red-100 hover:border-red-200 hover:shadow-md hover:shadow-red-100/40 transition-all duration-200 cursor-default">
              <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-red-400" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-sm font-bold text-gray-800">Custo / Ovo</span>
                </div>
                <p className="text-2xl font-extrabold text-red-600 tracking-tight">
                  {formatCurrency(custoOvo)}
                </p>
              </div>
              <div className="ml-10 flex items-start gap-1.5 p-2 rounded-lg bg-red-50/50">
                <Sparkles className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-red-600/80 leading-relaxed">Custo operacional dinâmico</p>
              </div>
            </div>

            <div className="group relative p-4 rounded-xl bg-white border border-amber-100 hover:border-amber-200 hover:shadow-md hover:shadow-amber-100/40 transition-all duration-200 cursor-default">
              <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-amber-400" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Target className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-sm font-bold text-gray-800">Meta Mensal</span>
                </div>
                <p className="text-2xl font-extrabold text-amber-700 tracking-tight">{progressoMeta.toFixed(0)}%</p>
              </div>
              <div className="ml-10">
                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                  <span>{formatCurrency(receitaPeriodo)}</span>
                  <span>{formatCurrency(metaReceita)}</span>
                </div>
                <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
                    style={{ width: `${progressoMeta}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selling Records Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Registros de Vendas</h3>
            <p className="text-xs text-gray-400 mt-0.5">{filteredVendas.length} vendas — {periodoLabel}</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, lote..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Lote</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Galpão</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Qtd (dz)</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Preço/dz</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendas.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-3 text-gray-600">{formatDate(v.data)}</td>
                  <td className="py-3 px-3 font-medium text-gray-900">{v.cliente}</td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-semibold">{v.lote}</span>
                  </td>
                  <td className="py-3 px-3 text-gray-600">{v.galpao}</td>
                  <td className="py-3 px-3 text-right font-medium text-gray-900">{v.quantidade}</td>
                  <td className="py-3 px-3 text-right text-gray-600">R$ {v.precoUn.toFixed(2).replace(".", ",")}</td>
                  <td className="py-3 px-3 text-right font-bold text-gray-900">{formatCurrency(v.total)}</td>
                  <td className="py-3 px-3">
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
              ))}
              {!loading && filteredVendas.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Nenhuma venda encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Registrar Venda" : "Editar Venda"}
              </h3>
              <button onClick={() => setModal(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Data</label>
                  <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cliente</label>
                  <select value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all appearance-none cursor-pointer">
                    <option value="">Selecione...</option>
                    {clienteOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Lote</label>
                  <select value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all appearance-none cursor-pointer">
                    <option value="">Selecione...</option>
                    {loteOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Galpão</label>
                  <input type="text" placeholder="Ex: Galpão A1" value={form.galpao} onChange={(e) => setForm({ ...form, galpao: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all placeholder:text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Quantidade (dúzias)</label>
                  <input type="number" min="1" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Preço / Dúzia (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.precoUn} onChange={(e) => setForm({ ...form, precoUn: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>

              {form.quantidade && form.precoUn && (
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <p className="text-xs text-emerald-600 font-medium">Total estimado</p>
                  <p className="text-lg font-bold text-emerald-700">{formatCurrency((Number(form.quantidade) || 0) * (Number(form.precoUn) || 0))}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer">
                Cancelar
              </button>
              <button onClick={save} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors cursor-pointer shadow-sm">
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
