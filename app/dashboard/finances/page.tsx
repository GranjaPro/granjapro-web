"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

/* ══════════════════════════════════════════════
   MOCK DATA
   ══════════════════════════════════════════════ */

/* ── Expenses breakdown ── */
const despesas = [
  { categoria: "Ração", valor: 8500, porcentagem: 52, color: "#f59e0b", icon: Wheat },
  { categoria: "Funcionários", valor: 3200, porcentagem: 20, color: "#3b82f6", icon: Users },
  { categoria: "Energia", valor: 1800, porcentagem: 11, color: "#f97316", icon: Zap },
  { categoria: "Água", valor: 650, porcentagem: 4, color: "#06b6d4", icon: Droplets },
  { categoria: "Medicamentos / Vacinas", valor: 1200, porcentagem: 7, color: "#ef4444", icon: Pill },
  { categoria: "Manutenção", valor: 600, porcentagem: 4, color: "#8b5cf6", icon: Wrench },
  { categoria: "Outros", valor: 350, porcentagem: 2, color: "#6b7280", icon: MoreHorizontal },
];

const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);

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

/* ── Selling Records ── */
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

const clienteOptions = ["Mercado Central", "Padaria Boa Mesa", "Restaurante Sabor", "Supermercado BH", "Feira Livre"];
const loteOptions = ["L-2024-01", "L-2024-02", "L-2024-03", "L-2024-04"];

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

export default function FinancasPage() {
  const [vendas, setVendas] = useState(initialVendas);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Venda | null>(null);
  const [form, setForm] = useState({ data: "", cliente: "", lote: "", galpao: "", quantidade: "", precoUn: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  /* ── Derived KPIs (from period) ── */
  const receitaPeriodo = periodoVendas.reduce((s, v) => s + v.total, 0);
  const despesaPeriodo = periodo === "dia" ? Math.round(totalDespesas / 30) : periodo === "semana" ? Math.round(totalDespesas / 4.3) : totalDespesas;
  const lucroLiquido = receitaPeriodo - despesaPeriodo;
  const margem = receitaPeriodo > 0 ? ((lucroLiquido / receitaPeriodo) * 100).toFixed(1) : "0";
  const totalAves = 2851;
  const lucroPorAve = (lucroLiquido / totalAves).toFixed(2).replace(".", ",");
  const volumeTotal = periodoVendas.reduce((s, v) => s + v.quantidade, 0);
  const precoMedio = periodoVendas.length > 0 ? (receitaPeriodo / volumeTotal).toFixed(2) : "0";

  /* ── Previous period reference values ── */
  const periodoRef = periodo === "dia" ? "vs ontem" : periodo === "semana" ? "vs semana anterior" : "vs mês anterior";
  const prev = {
    receita: periodo === "dia" ? 1800 : periodo === "semana" ? 8900 : 14200,
    despesa: periodo === "dia" ? 520 : periodo === "semana" ? 3600 : 15200,
    lucro: periodo === "dia" ? 1280 : periodo === "semana" ? 5300 : -1000,
    lucroPorAve: periodo === "dia" ? 0.45 : periodo === "semana" ? 1.86 : -0.35,
    precoMedio: periodo === "dia" ? 13.0 : periodo === "semana" ? 12.8 : 13.2,
    volume: periodo === "dia" ? 150 : periodo === "semana" ? 720 : 1180,
  };

  function calcVar(current: number, previous: number): { pct: string; dir: "up" | "down" } {
    if (previous === 0) return { pct: "+0.0%", dir: "up" };
    const v = ((current - previous) / Math.abs(previous)) * 100;
    return { pct: `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`, dir: v >= 0 ? "up" : "down" };
  }

  const varReceita = calcVar(receitaPeriodo, prev.receita);
  const varDespesa = calcVar(despesaPeriodo, prev.despesa);
  const varLucro = calcVar(lucroLiquido, prev.lucro);
  const varLucroPorAve = calcVar(Number((lucroLiquido / totalAves).toFixed(2)), prev.lucroPorAve);
  const varPreco = calcVar(Number(precoMedio), prev.precoMedio);
  const varVolume = calcVar(volumeTotal, prev.volume);

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
      badge: `${varReceita.pct} ${periodoRef}`,
      badgeDir: varReceita.dir,
    },
    {
      title: `Despesa — ${periodoLabel}`,
      value: formatCurrency(despesaPeriodo),
      icon: Wallet,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      badge: `${varDespesa.pct} ${periodoRef}`,
      badgeDir: varDespesa.dir === "up" ? ("down" as const) : ("up" as const),
    },
    {
      title: "Lucro Líquido",
      value: formatCurrency(lucroLiquido),
      icon: PiggyBank,
      iconBg: lucroLiquido >= 0 ? "bg-emerald-50" : "bg-red-50",
      iconColor: lucroLiquido >= 0 ? "text-emerald-600" : "text-red-500",
      badge: `${varLucro.pct} ${periodoRef}`,
      badgeDir: varLucro.dir,
    },
    {
      title: "Lucro por Ave",
      value: `R$ ${lucroPorAve}`,
      icon: BarChart3,
      iconBg: "bg-brand-50",
      iconColor: "text-brand-600",
      badge: `${varLucroPorAve.pct} ${periodoRef}`,
      badgeDir: varLucroPorAve.dir,
    },
    {
      title: "Preço Médio / Dúzia",
      value: periodoVendas.length > 0 ? `R$ ${precoMedio.replace(".", ",")}` : "—",
      icon: TrendingDown,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      badge: `${varPreco.pct} ${periodoRef}`,
      badgeDir: varPreco.dir,
    },
    {
      title: `Volume — ${periodoLabel}`,
      value: `${volumeTotal.toLocaleString("pt-BR")} dz`,
      icon: TrendingUp,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      badge: `${varVolume.pct} ${periodoRef}`,
      badgeDir: varVolume.dir,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finanças</h1>
            <p className="text-sm text-gray-500 mt-0.5">Receitas, despesas e análise financeira da granja</p>
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
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
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

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Assistente de Granja</h3>
            <div className="space-y-1.5">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-amber-700">Preço médio caiu 4% esse mês.</span>{" "}
                Impacto estimado: <span className="font-bold text-red-600">- R$ 1.000,00</span> na receita.
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-emerald-700">Volume vendido cresceu 8%.</span>{" "}
                Compensa parcialmente a queda de preço. Lucro líquido ainda positivo.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Sugestão: Negocie preços fixos com os 2 maiores clientes para proteger a margem.
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
                <linearGradient id="colorReceitaFin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Receita"]}
              />
              <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2.5} fill="url(#colorReceitaFin)" dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#10b981" }} />
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

      {/* ── Expenses Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Pie Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Despesas do Mês</h3>
          <p className="text-2xl font-bold text-gray-900 tracking-tight mb-4">{formatCurrency(totalDespesas)}</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={despesas} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="valor" nameKey="categoria" paddingAngle={3} strokeWidth={0}>
                {despesas.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Expense list */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-5">Detalhamento de Despesas</h3>
          <div className="space-y-3">
            {despesas.map((d) => (
              <div key={d.categoria} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${d.color}15` }}>
                  <d.icon className="w-4 h-4" style={{ color: d.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{d.categoria}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{d.porcentagem}%</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(d.valor)}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${d.porcentagem}%`, backgroundColor: d.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
      )}
    </div>
  );
}
