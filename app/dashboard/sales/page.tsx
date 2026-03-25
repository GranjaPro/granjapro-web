"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ModalPortal from "@/components/ui/modal-portal";
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Package,
  BarChart3,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  Sparkles,
  Hash,
  Zap,
  Lightbulb,
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Target,
  Minus,
  Percent,
  Wallet,
  PiggyBank,
  HelpCircle,
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

/* ══════════════════════════════════════════════
   MOCK DATA
   ══════════════════════════════════════════════ */

interface Venda {
  id: number;
  data: string;
  cliente: string;
  lote: string;
  galpao: string;
  quantidade: number;
  precoUn: number;
  total: number;
}

const initialVendas: Venda[] = [
  { id: 1, data: "2024-04-17", cliente: "Mercado Central", lote: "L-2024-01", galpao: "Galpão A1", quantidade: 200, precoUn: 12.5, total: 2500 },
  { id: 2, data: "2024-04-16", cliente: "Padaria Boa Mesa", lote: "L-2024-02", galpao: "Galpão B1", quantidade: 80, precoUn: 13.0, total: 1040 },
  { id: 3, data: "2024-04-15", cliente: "Restaurante Sabor", lote: "L-2024-01", galpao: "Galpão A2", quantidade: 150, precoUn: 12.0, total: 1800 },
  { id: 4, data: "2024-04-14", cliente: "Mercado Central", lote: "L-2024-04", galpao: "Galpão D1", quantidade: 300, precoUn: 11.5, total: 3450 },
  { id: 5, data: "2024-04-12", cliente: "Feira Livre", lote: "L-2024-03", galpao: "Galpão C1", quantidade: 120, precoUn: 14.0, total: 1680 },
  { id: 6, data: "2024-04-10", cliente: "Padaria Boa Mesa", lote: "L-2024-01", galpao: "Galpão A1", quantidade: 90, precoUn: 12.5, total: 1125 },
  { id: 7, data: "2024-04-08", cliente: "Supermercado BH", lote: "L-2024-02", galpao: "Galpão B2", quantidade: 250, precoUn: 11.0, total: 2750 },
  { id: 8, data: "2024-04-05", cliente: "Restaurante Sabor", lote: "L-2024-03", galpao: "Galpão C1", quantidade: 100, precoUn: 13.5, total: 1350 },
];

/* ── Revenue chart (daily with volume) ── */
const receitaDiaria = [
  { dia: "01", receita: 1200, volume: 96 },
  { dia: "03", receita: 2100, volume: 175 },
  { dia: "05", receita: 1350, volume: 100 },
  { dia: "08", receita: 2750, volume: 250 },
  { dia: "10", receita: 1125, volume: 90 },
  { dia: "12", receita: 1680, volume: 120 },
  { dia: "14", receita: 3450, volume: 300 },
  { dia: "15", receita: 1800, volume: 150 },
  { dia: "16", receita: 1040, volume: 80 },
  { dia: "17", receita: 2500, volume: 200 },
];

/* ── Price history ── */
const historicoPreco = [
  { mes: "Jan", preco: 13.2, meta: 13.0 },
  { mes: "Fev", preco: 12.8, meta: 13.0 },
  { mes: "Mar", preco: 12.5, meta: 13.0 },
  { mes: "Abr", preco: 12.0, meta: 13.0 },
];

/* ── Profit & Margin history ── */
const lucratividadeAll: Record<number, { mes: string; receita: number; custo: number; lucro: number; margem: number }[]> = {
  2022: [
    { mes: "Set", receita: 8200, custo: 5740, lucro: 2460, margem: 30.0 },
    { mes: "Out", receita: 9100, custo: 6188, lucro: 2912, margem: 32.0 },
    { mes: "Nov", receita: 9800, custo: 6664, lucro: 3136, margem: 32.0 },
    { mes: "Dez", receita: 10500, custo: 7140, lucro: 3360, margem: 32.0 },
  ],
  2023: [
    { mes: "Jan", receita: 10800, custo: 7560, lucro: 3240, margem: 30.0 },
    { mes: "Fev", receita: 11200, custo: 7616, lucro: 3584, margem: 32.0 },
    { mes: "Mar", receita: 11500, custo: 7820, lucro: 3680, margem: 32.0 },
    { mes: "Abr", receita: 11900, custo: 7973, lucro: 3927, margem: 33.0 },
    { mes: "Mai", receita: 12300, custo: 8118, lucro: 4182, margem: 34.0 },
    { mes: "Jun", receita: 12000, custo: 8160, lucro: 3840, margem: 32.0 },
    { mes: "Jul", receita: 12800, custo: 8576, lucro: 4224, margem: 33.0 },
    { mes: "Ago", receita: 13100, custo: 8646, lucro: 4454, margem: 34.0 },
    { mes: "Set", receita: 13500, custo: 9045, lucro: 4455, margem: 33.0 },
    { mes: "Out", receita: 13800, custo: 9108, lucro: 4692, margem: 34.0 },
    { mes: "Nov", receita: 14200, custo: 9372, lucro: 4828, margem: 34.0 },
    { mes: "Dez", receita: 14500, custo: 9570, lucro: 4930, margem: 34.0 },
  ],
  2024: [
    { mes: "Jan", receita: 14800, custo: 9620, lucro: 5180, margem: 35.0 },
    { mes: "Fev", receita: 13500, custo: 9180, lucro: 4320, margem: 32.0 },
    { mes: "Mar", receita: 14200, custo: 9940, lucro: 4260, margem: 30.0 },
    { mes: "Abr", receita: 15695, custo: 10345, lucro: 5350, margem: 34.1 },
  ],
};
const signupYear = 2022;
const availableYears = Object.keys(lucratividadeAll).map(Number).sort();

const clienteOptions = ["Mercado Central", "Padaria Boa Mesa", "Restaurante Sabor", "Supermercado BH", "Feira Livre"];
const loteOptions = ["L-2024-01", "L-2024-02", "L-2024-03", "L-2024-04"];

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

export default function VendasPage() {
  const searchParams = useSearchParams();
  const [vendas, setVendas] = useState(initialVendas);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);

  useEffect(() => {
    if (searchParams.get("register") === "true") setModal("add");
  }, [searchParams]);
  const [editing, setEditing] = useState<Venda | null>(null);
  const [form, setForm] = useState({ data: "", cliente: "", lote: "", galpao: "", quantidade: "", precoUn: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [breakdownTab, setBreakdownTab] = useState<"cliente" | "lote" | "galpao">("cliente");
  const [periodo, setPeriodo] = useState<"dia" | "semana" | "mes">("mes");
  const [unidade, setUnidade] = useState<"duzia" | "unidade" | "bandeja">("duzia");
  const [anoLucro, setAnoLucro] = useState(2024);
  const [margemDesejada, setMargemDesejada] = useState(35);
  const lucratividade = lucratividadeAll[anoLucro] || [];

  /* ── Period-filtered vendas ── */
  const periodoVendas = useMemo(() => {
    if (periodo === "dia") {
      return vendas.filter((v) => v.data === "2024-04-17");
    } else if (periodo === "semana") {
      return vendas.filter((v) => v.data >= "2024-04-11" && v.data <= "2024-04-17");
    } else {
      return vendas.filter((v) => v.data.startsWith("2024-04"));
    }
  }, [vendas, periodo]);

  const periodoLabel = periodo === "dia" ? "Hoje" : periodo === "semana" ? "Esta Semana" : "Este Mês";

  /* ── Derived KPIs ── */
  const receitaPeriodo = periodoVendas.reduce((s, v) => s + v.total, 0);
  const volumeTotal = periodoVendas.reduce((s, v) => s + v.quantidade, 0);
  const precoMedio = periodoVendas.length > 0 ? (receitaPeriodo / volumeTotal) : 0;
  const totalVendas = periodoVendas.length;

  const receitaMesAnterior = 14200;
  const metaReceita = 18000;
  const variacaoReceita = (((receitaPeriodo - (periodo === "mes" ? receitaMesAnterior : periodo === "semana" ? 3550 : 1800)) / (periodo === "mes" ? receitaMesAnterior : periodo === "semana" ? 3550 : 1800)) * 100).toFixed(1);
  const pctMeta = Math.min((receitaPeriodo / metaReceita) * 100, 100);

  /* ── Profit & Margin ── */
  const custoMedio = 6.8; // R$/dz cost
  const custoTotal = volumeTotal * custoMedio;
  const lucro = receitaPeriodo - custoTotal;
  const margem = receitaPeriodo > 0 ? (lucro / receitaPeriodo) * 100 : 0;
  const lucroAnterior = lucratividade.length >= 2 ? lucratividade[lucratividade.length - 2].lucro : lucro;
  const margemAnterior = lucratividade.length >= 2 ? lucratividade[lucratividade.length - 2].margem : margem;
  const varLucro = lucroAnterior > 0 ? ((lucro - lucroAnterior) / lucroAnterior * 100).toFixed(1) : "0";
  const varMargem = (margem - margemAnterior).toFixed(1);

  /* ── Unit conversion ── */
  const unidadeLabel = unidade === "duzia" ? "Dúzia" : unidade === "unidade" ? "Unidade" : "Bandeja 30";
  const unidadeSuffix = unidade === "duzia" ? "/dz" : unidade === "unidade" ? "/un" : "/bd";
  const divisor = unidade === "duzia" ? 1 : unidade === "unidade" ? 12 : 12 / 30;
  const receitaUn = precoMedio / divisor;
  const custoUn = custoMedio / divisor;
  const lucroUn = receitaUn - custoUn;

  const filteredVendas = useMemo(() => {
    const base = periodoVendas;
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(
      (v) =>
        v.cliente.toLowerCase().includes(q) ||
        v.lote.toLowerCase().includes(q) ||
        v.galpao.toLowerCase().includes(q) ||
        v.data.includes(q)
    );
  }, [periodoVendas, searchQuery]);

  /* ── Dynamic breakdown from period vendas ── */
  const dynamicReceitaPorCliente = useMemo(() => {
    const map = new Map<string, { valor: number; vendas: number }>();
    periodoVendas.forEach((v) => {
      const existing = map.get(v.cliente) || { valor: 0, vendas: 0 };
      map.set(v.cliente, { valor: existing.valor + v.total, vendas: existing.vendas + 1 });
    });
    return Array.from(map.entries()).map(([cliente, d]) => ({ cliente, ...d })).sort((a, b) => b.valor - a.valor);
  }, [periodoVendas]);

  const dynamicReceitaPorLote = useMemo(() => {
    const map = new Map<string, { valor: number; volume: number }>();
    periodoVendas.forEach((v) => {
      const existing = map.get(v.lote) || { valor: 0, volume: 0 };
      map.set(v.lote, { valor: existing.valor + v.total, volume: existing.volume + v.quantidade });
    });
    return Array.from(map.entries()).map(([lote, d]) => ({ lote, ...d })).sort((a, b) => b.valor - a.valor);
  }, [periodoVendas]);

  const dynamicReceitaPorGalpao = useMemo(() => {
    const map = new Map<string, number>();
    periodoVendas.forEach((v) => {
      map.set(v.galpao, (map.get(v.galpao) || 0) + v.total);
    });
    return Array.from(map.entries()).map(([galpao, valor]) => ({ galpao, valor })).sort((a, b) => b.valor - a.valor);
  }, [periodoVendas]);

  /* ── Insights ── */
  const insights = useMemo(() => {
    const arr: { type: "success" | "warning" | "info"; title: string; action: string }[] = [];
    const topCliente = dynamicReceitaPorCliente[0];
    if (topCliente) {
      const pct = ((topCliente.valor / receitaPeriodo) * 100).toFixed(1);
      if (Number(pct) > 30) arr.push({ type: "warning", title: `${topCliente.cliente} concentra ${pct}% da receita`, action: "Diversifique a carteira para reduzir dependência" });
    }
    if (Number(variacaoReceita) >= 0) arr.push({ type: "success", title: `Volume cresceu ${variacaoReceita}% no período`, action: "Bom desempenho — mantenha o ritmo de vendas" });
    else arr.push({ type: "warning", title: `Receita caiu ${variacaoReceita}% vs período anterior`, action: "Intensifique ações comerciais e prospecção" });
    if (precoMedio < 12.5) arr.push({ type: "warning", title: `Preço médio em R$ ${precoMedio.toFixed(2)} — abaixo da meta`, action: "Negocie contratos com preço fixo para proteger margem" });
    const bestPrice = periodoVendas.reduce((best, v) => v.precoUn > best.precoUn ? v : best, periodoVendas[0]);
    if (bestPrice) arr.push({ type: "info", title: `${bestPrice.cliente} paga R$ ${bestPrice.precoUn.toFixed(2)}/dz — melhor preço`, action: "Priorize este canal para maximizar margem" });
    if (pctMeta < 80) arr.push({ type: "warning", title: `${pctMeta.toFixed(0)}% da meta atingida`, action: `Faltam ${formatCurrency(metaReceita - receitaPeriodo)} para bater a meta` });
    return arr;
  }, [dynamicReceitaPorCliente, receitaPeriodo, variacaoReceita, precoMedio, periodoVendas, pctMeta]);

  /* ── CRUD ── */
  function openAdd() {
    setForm({ data: "", cliente: "", lote: "", galpao: "", quantidade: "", precoUn: "" });
    setEditing(null);
    setModal("add");
  }

  function openEdit(v: Venda) {
    setForm({
      data: v.data,
      cliente: v.cliente,
      lote: v.lote,
      galpao: v.galpao,
      quantidade: String(v.quantidade),
      precoUn: String(v.precoUn),
    });
    setEditing(v);
    setModal("edit");
  }

  function save() {
    if (!form.data.trim() || !form.cliente.trim() || !form.lote.trim()) return;
    const quantidade = Number(form.quantidade) || 0;
    const precoUn = Number(form.precoUn) || 0;
    const venda: Venda = {
      id: editing?.id || Date.now(),
      data: form.data,
      cliente: form.cliente,
      lote: form.lote,
      galpao: form.galpao,
      quantidade,
      precoUn,
      total: quantidade * precoUn,
    };
    if (modal === "add") {
      setVendas((prev) => [venda, ...prev]);
    } else if (editing) {
      setVendas((prev) => prev.map((v) => (v.id === editing.id ? venda : v)));
    }
    setModal(null);
  }

  function deleteVenda(id: number) {
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

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */

  const breakdownMax = breakdownTab === "cliente"
    ? Math.max(...dynamicReceitaPorCliente.map((d) => d.valor), 1)
    : breakdownTab === "lote"
    ? Math.max(...dynamicReceitaPorLote.map((d) => d.valor), 1)
    : Math.max(...dynamicReceitaPorGalpao.map((d) => d.valor), 1);

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
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20"
        >
          <Plus className="w-4 h-4" />
          Registrar Venda
        </button>
      </div>

      {/* ── Period Filter ── */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: "dia" as const, label: "Dia" },
            { key: "semana" as const, label: "Semana" },
            { key: "mes" as const, label: "Mês" },
          ]).map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                periodo === p.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 flex-shrink-0">
          <Sparkles className="w-3 h-3" />
          Premium
        </span>
      </div>

      {/* ── Revenue Banner ── */}
      <div className={cn("rounded-2xl border p-5 transition-all duration-300", pctMeta >= 80 ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/60" : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/60")}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 lg:min-w-[280px]">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
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
                Preço médio <span className="font-bold text-gray-900">R$ {precoMedio.toFixed(2).replace(".", ",")}</span>/dz {precoMedio < 12.5 && <span className="text-amber-600 font-semibold">— abaixo da meta</span>}
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
              <ArrowUpRight className="w-3 h-3" />+8%
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
              <ArrowDownRight className="w-3 h-3" />-4%
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
              {periodoLabel}
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
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Análise de custos e margens — {periodoLabel}</p>
            </div>
          </div>
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full", margem >= 35 ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : margem >= 28 ? "text-amber-700 bg-amber-50 border border-amber-200" : "text-red-600 bg-red-50 border border-red-200")}>
            <Percent className="w-3 h-3" />
            {margem.toFixed(1)}% margem
          </span>
        </div>

        {/* Top row: 3 metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Receita */}
          <div className="rounded-xl bg-gray-50 p-4 hover:bg-gray-100/80 transition-colors duration-200 cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center"><DollarSign className="w-3.5 h-3.5 text-blue-600" /></div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Receita</span>
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">{formatCurrency(receitaPeriodo)}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-1">100% da composição</p>
          </div>
          {/* Custo */}
          <div className="rounded-xl bg-gray-50 p-4 hover:bg-gray-100/80 transition-colors duration-200 cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center"><Wallet className="w-3.5 h-3.5 text-red-500" /></div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Custo</span>
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">{formatCurrency(custoTotal)}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-1">{(100 - margem).toFixed(1)}% da receita</p>
          </div>
          {/* Lucro */}
          <div className="rounded-xl bg-emerald-50 p-4 hover:bg-emerald-100/60 transition-colors duration-200 cursor-pointer ring-1 ring-emerald-200/60">
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
            <div className="h-full bg-emerald-500 rounded-l-xl transition-all duration-700 flex items-center justify-center" style={{ width: `${margem}%` }}>
              <span className="text-[10px] font-bold text-white px-1 whitespace-nowrap">Lucro {margem.toFixed(1)}%</span>
            </div>
            <div className="h-full bg-gray-200 rounded-r-xl transition-all duration-700 flex items-center justify-center" style={{ width: `${100 - margem}%` }}>
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
                {availableYears.map((y) => (
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
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assistente de Granja */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm"><Zap className="w-5 h-5 text-white" /></div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Assistente de Granja</h3>
                <p className="text-[11px] text-gray-400 font-medium">Análise comercial — {periodoLabel}</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 flex-shrink-0"><Sparkles className="w-3 h-3" />Premium</span>
          </div>
          <div className="space-y-2 overflow-y-auto pr-1 flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {insights.map((ins, i) => (
              <div key={i} className={cn("p-3.5 rounded-xl border-l-[3px]", ins.type === "success" && "bg-emerald-50/50 border-l-emerald-500", ins.type === "warning" && "bg-amber-50/50 border-l-amber-500", ins.type === "info" && "bg-blue-50/50 border-l-blue-500")}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", ins.type === "success" && "bg-emerald-100", ins.type === "warning" && "bg-amber-100", ins.type === "info" && "bg-blue-100")}>
                    {ins.type === "success" && <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />}
                    {ins.type === "warning" && <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />}
                    {ins.type === "info" && <Lightbulb className="w-2.5 h-2.5 text-blue-600" />}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{ins.title}</span>
                </div>
                <p className={cn("text-xs font-medium ml-7", ins.type === "success" ? "text-emerald-600" : ins.type === "warning" ? "text-amber-600" : "text-blue-600")}>&rarr; {ins.action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Preço Ideal Sugerido */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Preço Ideal Sugerido</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Baseado em custo + margem meta</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 flex-shrink-0"><Sparkles className="w-3 h-3" />Premium</span>
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
                    <span className="text-sm text-gray-700 font-semibold">Impacto na receita mensal</span>
                    <span className={cn("text-sm font-black tabular-nums", diff * volumeTotal >= 0 ? "text-emerald-700" : "text-red-600")}>{diff * volumeTotal >= 0 ? "+" : ""}{formatCurrency(diff * volumeTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Charts: Receita Diária + Histórico de Preço ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Receita Diária + Volume */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Receita Diária</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Receita × Volume — {periodoLabel}</p>
            </div>
            <div className="flex items-center gap-3">
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
                  formatter={(value: number, name: string) => [name === "receita" ? `R$ ${value.toLocaleString("pt-BR")}` : `${value} dz`, name === "receita" ? "Receita" : "Volume"]}
                  labelFormatter={(l: string) => `Dia ${l}`}
                />
                <Bar yAxisId="right" dataKey="volume" fill="#c4b5fd" radius={[4, 4, 0, 0]} barSize={20} opacity={0.6} />
                <Area yAxisId="left" type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2.5} fill="url(#receitaGrad)" dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Histórico de Preço */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Preço Médio / Dz</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Evolução vs meta</p>
            </div>
            <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full", precoMedio >= 12.5 ? "text-emerald-700 bg-emerald-50" : "text-amber-600 bg-amber-50")}>
              {precoMedio >= 12.5 ? "Na meta" : "Abaixo"}
            </span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicoPreco} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis domain={[11, 15]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v.toFixed(1)}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "12px", padding: "10px 14px" }}
                  formatter={(value: number, name: string) => [`R$ ${value.toFixed(2).replace(".", ",")}`, name === "preco" ? "Preço Médio" : "Meta"]}
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
      </div>

      {/* ── Selling Records Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-sm">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Registros de Vendas</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">{filteredVendas.length} vendas — {periodoLabel}</p>
            </div>
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

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/50">
                <th className="text-left py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Data</th>
                <th className="text-left py-3 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="text-left py-3 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Lote</th>
                <th className="text-left py-3 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Galpão</th>
                <th className="text-right py-3 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Qtd (dz)</th>
                <th className="text-right py-3 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Preço/dz</th>
                <th className="text-right py-3 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total</th>
                <th className="text-right py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendas.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-5 text-gray-500 font-medium">{formatDate(v.data)}</td>
                  <td className="py-3.5 px-3 font-semibold text-gray-900">{v.cliente}</td>
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-semibold">{v.lote}</span>
                  </td>
                  <td className="py-3.5 px-3 text-gray-500">{v.galpao}</td>
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
              ))}
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
                  <select value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all appearance-none cursor-pointer">
                    <option value="">Selecione...</option>
                    {clienteOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Lote</label>
                  <select value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all appearance-none cursor-pointer">
                    <option value="">Selecione...</option>
                    {loteOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Galpão</label>
                  <input type="text" placeholder="Ex: Galpão A1" value={form.galpao} onChange={(e) => setForm({ ...form, galpao: e.target.value })} className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all placeholder:text-gray-400" />
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
              <button onClick={save} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors cursor-pointer shadow-sm shadow-brand-600/20">
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
