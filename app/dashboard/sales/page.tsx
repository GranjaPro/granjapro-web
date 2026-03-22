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

/* ── Revenue chart (daily) ── */
const receitaDiaria = [
  { dia: "01", receita: 1200 },
  { dia: "03", receita: 2100 },
  { dia: "05", receita: 1350 },
  { dia: "08", receita: 2750 },
  { dia: "10", receita: 1125 },
  { dia: "12", receita: 1680 },
  { dia: "14", receita: 3450 },
  { dia: "15", receita: 1800 },
  { dia: "16", receita: 1040 },
  { dia: "17", receita: 2500 },
];

/* ── Price history ── */
const historicoPreco = [
  { mes: "Jan", preco: 13.2 },
  { mes: "Fev", preco: 12.8 },
  { mes: "Mar", preco: 12.5 },
  { mes: "Abr", preco: 12.0 },
];

/* ── Revenue per client ── */
const receitaPorCliente = [
  { cliente: "Mercado Central", valor: 5950, vendas: 2 },
  { cliente: "Supermercado BH", valor: 2750, vendas: 1 },
  { cliente: "Restaurante Sabor", valor: 3150, vendas: 2 },
  { cliente: "Padaria Boa Mesa", valor: 2165, vendas: 2 },
  { cliente: "Feira Livre", valor: 1680, vendas: 1 },
];

/* ── Revenue per lote ── */
const receitaPorLote = [
  { lote: "L-2024-01", valor: 5425, volume: 490 },
  { lote: "L-2024-02", valor: 3790, volume: 330 },
  { lote: "L-2024-03", valor: 3030, volume: 220 },
  { lote: "L-2024-04", valor: 3450, volume: 300 },
];

/* ── Revenue per galpao ── */
const receitaPorGalpao = [
  { galpao: "Galpão A1", valor: 3625 },
  { galpao: "Galpão A2", valor: 1800 },
  { galpao: "Galpão B1", valor: 1040 },
  { galpao: "Galpão B2", valor: 2750 },
  { galpao: "Galpão C1", valor: 3030 },
  { galpao: "Galpão D1", valor: 3450 },
];

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
  const variacaoReceita = (((receitaPeriodo - (periodo === "mes" ? receitaMesAnterior : periodo === "semana" ? 3550 : 1800)) / (periodo === "mes" ? receitaMesAnterior : periodo === "semana" ? 3550 : 1800)) * 100).toFixed(1);

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

  const kpis = [
    {
      title: `Receita — ${periodoLabel}`,
      value: formatCurrency(receitaPeriodo),
      icon: DollarSign,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      badge: `${Number(variacaoReceita) >= 0 ? "+" : ""}${variacaoReceita}%`,
      badgeDir: Number(variacaoReceita) >= 0 ? ("up" as const) : ("down" as const),
    },
    {
      title: `Volume — ${periodoLabel}`,
      value: `${volumeTotal.toLocaleString("pt-BR")} dz`,
      icon: Package,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      badge: "+8%",
      badgeDir: "up" as const,
    },
    {
      title: "Preço Médio / Dúzia",
      value: precoMedio > 0 ? `R$ ${precoMedio.toFixed(2).replace(".", ",")}` : "—",
      icon: TrendingDown,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      badge: "-4% vs mês anterior",
      badgeDir: "down" as const,
    },
    {
      title: `Total de Vendas — ${periodoLabel}`,
      value: `${totalVendas}`,
      icon: Hash,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      badge: `${periodoVendas.length} registros`,
      badgeDir: "neutral" as const,
    },
  ];

  const breakdownMax = breakdownTab === "cliente"
    ? Math.max(...dynamicReceitaPorCliente.map((d) => d.valor), 1)
    : breakdownTab === "lote"
    ? Math.max(...dynamicReceitaPorLote.map((d) => d.valor), 1)
    : Math.max(...dynamicReceitaPorGalpao.map((d) => d.valor), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
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
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm"
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
        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-amber-50 text-amber-500 border border-amber-200">
          <Sparkles className="w-2.5 h-2.5" />
          Pro
        </span>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.title}
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", kpi.iconBg)}>
                <kpi.icon className={cn("w-5 h-5", kpi.iconColor)} />
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-lg",
                  kpi.badgeDir === "up" && "text-emerald-700 bg-emerald-50",
                  kpi.badgeDir === "down" && "text-red-600 bg-red-50",
                  kpi.badgeDir === "neutral" && "text-gray-500 bg-gray-50"
                )}
              >
                {kpi.badgeDir === "up" && <ArrowUpRight className="w-3 h-3" />}
                {kpi.badgeDir === "down" && <ArrowDownRight className="w-3 h-3" />}
                {kpi.badge}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">{kpi.title}</p>
          </div>
        ))}
      </div>

      {/* ── AI Insight ── */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/60 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Assistente de Granja</h3>
            <div className="space-y-1.5">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-purple-700">Mercado Central é seu maior cliente</span>{" "}
                responsável por <span className="font-bold text-gray-900">37,8%</span> da receita total. Diversifique para reduzir dependência.
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-emerald-700">Volume cresceu 8%,</span>{" "}
                mas preço médio caiu 4%. Negocie contratos com preço fixo para proteger sua margem.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Sugestão: Feira Livre paga o maior preço/dúzia (R$ 14,00). Priorize esse canal.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts: Revenue + Price History ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Area Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Receita Diária</h3>
          <p className="text-xs text-gray-400 mb-4">Evolução da receita ao longo do mês</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={receitaDiaria}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Receita"]}
              />
              <Area type="monotone" dataKey="receita" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#colorReceita)" dot={{ fill: "#8b5cf6", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#8b5cf6" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Price History Line Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Histórico de Preço / Dúzia</h3>
          <p className="text-xs text-gray-400 mb-4">Evolução do preço médio por dúzia</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={historicoPreco}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis domain={[10, 15]} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `R$ ${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Preço/dz"]}
              />
              <Line type="monotone" dataKey="preco" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: "#f59e0b" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Revenue Breakdown Tabs ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Receita por Categoria</h3>
            <p className="text-xs text-gray-400 mt-0.5">Distribuição da receita — {periodoLabel}</p>
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
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
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
          {breakdownTab === "cliente" &&
            dynamicReceitaPorCliente.map((d, i) => (
              <div key={d.cliente} className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{d.cliente}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{d.vendas} vendas</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(d.valor)}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-purple-500 transition-all duration-500" style={{ width: `${(d.valor / breakdownMax) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}

          {breakdownTab === "lote" &&
            dynamicReceitaPorLote.map((d, i) => (
              <div key={d.lote} className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{d.lote}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{d.volume} dz</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(d.valor)}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${(d.valor / breakdownMax) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}

          {breakdownTab === "galpao" &&
            dynamicReceitaPorGalpao.map((d, i) => (
              <div key={d.galpao} className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{d.galpao}</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(d.valor)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${(d.valor / breakdownMax) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}

          {((breakdownTab === "cliente" && dynamicReceitaPorCliente.length === 0) ||
            (breakdownTab === "lote" && dynamicReceitaPorLote.length === 0) ||
            (breakdownTab === "galpao" && dynamicReceitaPorGalpao.length === 0)) && (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma venda neste período</p>
          )}
        </div>
      </div>

      {/* ── Selling Records Table ── */}
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
              {filteredVendas.length === 0 && (
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

      {/* ── Modal ── */}
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
