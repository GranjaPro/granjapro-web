"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  Legend,
} from "recharts";

/* ══════════════════════════════════════════════
   MOCK DATA
   ══════════════════════════════════════════════ */

const despesasMes = [
  { categoria: "Ração", valor: 8500, porcentagem: 52, color: "#f59e0b", icon: Wheat },
  { categoria: "Funcionários", valor: 3200, porcentagem: 20, color: "#3b82f6", icon: Users },
  { categoria: "Energia", valor: 1800, porcentagem: 11, color: "#f97316", icon: Zap },
  { categoria: "Água", valor: 650, porcentagem: 4, color: "#06b6d4", icon: Droplets },
  { categoria: "Medicamentos", valor: 1200, porcentagem: 7, color: "#ef4444", icon: Pill },
  { categoria: "Manutenção", valor: 600, porcentagem: 4, color: "#8b5cf6", icon: Wrench },
  { categoria: "Outros", valor: 350, porcentagem: 2, color: "#6b7280", icon: MoreHorizontal },
];

const despesasSemana = [
  { categoria: "Ração", valor: 1980, porcentagem: 52, color: "#f59e0b", icon: Wheat },
  { categoria: "Funcionários", valor: 745, porcentagem: 20, color: "#3b82f6", icon: Users },
  { categoria: "Energia", valor: 420, porcentagem: 11, color: "#f97316", icon: Zap },
  { categoria: "Água", valor: 150, porcentagem: 4, color: "#06b6d4", icon: Droplets },
  { categoria: "Medicamentos", valor: 280, porcentagem: 7, color: "#ef4444", icon: Pill },
  { categoria: "Manutenção", valor: 140, porcentagem: 4, color: "#8b5cf6", icon: Wrench },
  { categoria: "Outros", valor: 80, porcentagem: 2, color: "#6b7280", icon: MoreHorizontal },
];

const despesasDia = [
  { categoria: "Ração", valor: 283, porcentagem: 52, color: "#f59e0b", icon: Wheat },
  { categoria: "Funcionários", valor: 107, porcentagem: 20, color: "#3b82f6", icon: Users },
  { categoria: "Energia", valor: 60, porcentagem: 11, color: "#f97316", icon: Zap },
  { categoria: "Água", valor: 22, porcentagem: 4, color: "#06b6d4", icon: Droplets },
  { categoria: "Medicamentos", valor: 40, porcentagem: 7, color: "#ef4444", icon: Pill },
  { categoria: "Manutenção", valor: 20, porcentagem: 4, color: "#8b5cf6", icon: Wrench },
  { categoria: "Outros", valor: 12, porcentagem: 2, color: "#6b7280", icon: MoreHorizontal },
];

const totalDespesas = despesasMes.reduce((s, d) => s + d.valor, 0);

const receitaDiaria = [
  { dia: "01", receita: 1200, despesa: 540 },
  { dia: "03", receita: 2100, despesa: 520 },
  { dia: "05", receita: 1350, despesa: 560 },
  { dia: "08", receita: 2750, despesa: 530 },
  { dia: "10", receita: 1125, despesa: 550 },
  { dia: "12", receita: 1680, despesa: 510 },
  { dia: "14", receita: 3450, despesa: 580 },
  { dia: "15", receita: 1800, despesa: 540 },
  { dia: "16", receita: 1040, despesa: 520 },
  { dia: "17", receita: 2500, despesa: 560 },
];

const receitaSemanal = [
  { dia: "Seg", receita: 1680, despesa: 520 },
  { dia: "Ter", receita: 1040, despesa: 510 },
  { dia: "Qua", receita: 2500, despesa: 540 },
  { dia: "Qui", receita: 1800, despesa: 530 },
  { dia: "Sex", receita: 3450, despesa: 580 },
  { dia: "Sáb", receita: 1200, despesa: 490 },
  { dia: "Dom", receita: 650, despesa: 460 },
];

const receitaAnual = [
  { dia: "Jan", receita: 18500, despesa: 15200 },
  { dia: "Fev", receita: 17200, despesa: 14800 },
  { dia: "Mar", receita: 19800, despesa: 16300 },
  { dia: "Abr", receita: 15695, despesa: 16300 },
  { dia: "Mai", receita: 20100, despesa: 15900 },
  { dia: "Jun", receita: 21400, despesa: 16100 },
  { dia: "Jul", receita: 19200, despesa: 15500 },
  { dia: "Ago", receita: 22800, despesa: 16800 },
  { dia: "Set", receita: 20500, despesa: 16200 },
  { dia: "Out", receita: 21900, despesa: 16500 },
  { dia: "Nov", receita: 23100, despesa: 17000 },
  { dia: "Dez", receita: 24500, despesa: 17500 },
];

const historicoPreco = [
  { mes: "Jan", preco: 13.2 },
  { mes: "Fev", preco: 12.8 },
  { mes: "Mar", preco: 12.5 },
  { mes: "Abr", preco: 12.0 },
];

const fluxoMensal = [
  { mes: "Jan", receita: 18500, despesa: 15200, lucro: 3300 },
  { mes: "Fev", receita: 17200, despesa: 14800, lucro: 2400 },
  { mes: "Mar", receita: 19800, despesa: 16300, lucro: 3500 },
  { mes: "Abr", receita: 15695, despesa: 16300, lucro: -605 },
];


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
  const [chartPeriodo, setChartPeriodo] = useState<"semana" | "mes" | "ano">("mes");
  const [breakdownTab, setBreakdownTab] = useState<"cliente" | "lote" | "galpao">("cliente");

  const periodoVendas = useMemo(() => {
    if (periodo === "dia") return vendas.filter((v) => v.data === "2024-04-17");
    if (periodo === "semana") return vendas.filter((v) => v.data >= "2024-04-11" && v.data <= "2024-04-17");
    return vendas.filter((v) => v.data.startsWith("2024-04"));
  }, [vendas, periodo]);

  const periodoLabel = periodo === "dia" ? "Hoje" : periodo === "semana" ? "Esta Semana" : "Este Mês";

  const despesasFiltradas = useMemo(() => {
    if (periodo === "dia") return despesasDia;
    if (periodo === "semana") return despesasSemana;
    return despesasMes;
  }, [periodo]);

  const totalDespesasFiltradas = useMemo(() => despesasFiltradas.reduce((s, d) => s + d.valor, 0), [despesasFiltradas]);

  const receitaPeriodo = periodoVendas.reduce((s, v) => s + v.total, 0);
  const despesaPeriodo = totalDespesasFiltradas;
  const lucroLiquido = receitaPeriodo - despesaPeriodo;
  const margem = receitaPeriodo > 0 ? ((lucroLiquido / receitaPeriodo) * 100) : 0;
  const totalAves = 2851;
  const lucroPorAve = lucroLiquido / totalAves;
  const volumeTotal = periodoVendas.reduce((s, v) => s + v.quantidade, 0);
  const precoMedio = periodoVendas.length > 0 ? receitaPeriodo / volumeTotal : 0;
  const custoOvo = despesaPeriodo > 0 && volumeTotal > 0 ? despesaPeriodo / (volumeTotal * 12) : 0;

  const metaReceita = 20000;
  const progressoMeta = Math.min((receitaPeriodo / metaReceita) * 100, 100);

  const prev = {
    receita: periodo === "dia" ? 1800 : periodo === "semana" ? 8900 : 14200,
    despesa: periodo === "dia" ? 520 : periodo === "semana" ? 3600 : 15200,
    lucro: periodo === "dia" ? 1280 : periodo === "semana" ? 5300 : -1000,
    lucroPorAve: periodo === "dia" ? 0.45 : periodo === "semana" ? 1.86 : -0.35,
    precoMedio: periodo === "dia" ? 13.0 : periodo === "semana" ? 12.8 : 13.2,
    volume: periodo === "dia" ? 150 : periodo === "semana" ? 720 : 1180,
  };
  const periodoRef = periodo === "dia" ? "vs ontem" : periodo === "semana" ? "vs semana anterior" : "vs mês anterior";

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

  /* ── Revenue Breakdown ── */
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
  const breakdownMax = Math.max(...breakdownData.map((d) => d.valor), 1);

  /* ── Health Score ── */
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

  /* ── Action items ── */
  const actionItems = useMemo(() => {
    const items: { icon: typeof AlertTriangle; text: string; type: "warning" | "success" | "info" }[] = [];
    if (margem < 10) items.push({ icon: AlertTriangle, text: "Margem abaixo de 10% — revise custos com ração", type: "warning" });
    if (varDespesa.dir === "up") items.push({ icon: AlertTriangle, text: `Despesas subiram ${varDespesa.pct} — investigue ração e energia`, type: "warning" });
    if (precoMedio < 12.5) items.push({ icon: TrendingDown, text: "Preço médio em queda — renegocie com clientes", type: "warning" });
    if (progressoMeta < 50 && periodo === "mes") items.push({ icon: Target, text: `Meta de receita em ${progressoMeta.toFixed(0)}% — acelere vendas`, type: "info" });
    if (lucroLiquido > 0 && varLucro.dir === "up") items.push({ icon: CheckCircle2, text: `Lucro cresceu ${varLucro.pct} — tendência positiva`, type: "success" });
    if (varReceita.dir === "up") items.push({ icon: CheckCircle2, text: `Receita subiu ${varReceita.pct} — bom ritmo de vendas`, type: "success" });
    return items;
  }, [margem, varDespesa, precoMedio, progressoMeta, lucroLiquido, varLucro, varReceita, periodo]);

  /* ── CRUD ── */
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

  return (
    <div className="space-y-6">
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
                    periodo === p.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
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
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            Registrar Venda
          </button>
        </div>
      </div>

      {/* ── Financial Health Banner ── */}
      <div className={cn(
        "rounded-2xl p-5 border transition-all duration-300",
        healthColor === "emerald" && "bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-white border-emerald-200/60",
        healthColor === "amber" && "bg-gradient-to-r from-amber-50 via-amber-50/50 to-white border-amber-200/60",
        healthColor === "red" && "bg-gradient-to-r from-red-50 via-red-50/50 to-white border-red-200/60",
      )}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Health Score */}
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

          {/* Divider */}
          <div className="hidden lg:block w-px h-14 bg-gray-200" />

          {/* Action Items */}
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
            {actionItems.length === 0 && (
              <p className="text-sm text-gray-500">Sem alertas no momento.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Main KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
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
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(receitaPeriodo)}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Receita — {periodoLabel}</p>
          {/* Revenue goal progress */}
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

        {/* Expenses */}
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
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(despesaPeriodo)}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Despesas — {periodoLabel}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <Wheat className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-gray-500">Ração = {despesasFiltradas[0].porcentagem}% do total</span>
          </div>
        </div>

        {/* Net Profit */}
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
          <p className={cn(
            "text-2xl font-bold tracking-tight",
            lucroLiquido >= 0 ? "text-emerald-700" : "text-red-600"
          )}>{formatCurrency(lucroLiquido)}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Lucro Líquido</p>
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              <Scale className={cn("w-3.5 h-3.5", lucroLiquido >= 0 ? "text-emerald-500" : "text-red-400")} />
              <span className="text-xs text-gray-500">Margem: <span className="font-semibold">{margem.toFixed(1)}%</span></span>
            </div>
          </div>
        </div>

        {/* Profit per Bird */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-brand-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">R$ {lucroPorAve.toFixed(2).replace(".", ",")}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Lucro por Ave</p>
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

      {/* ── AI Insight ── */}
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

      {/* ── Charts Row 1: Cash Flow + Revenue vs Expenses ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Expenses */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-900">Receita vs Despesa {chartPeriodo === "semana" ? "Semanal" : chartPeriodo === "ano" ? "Anual" : "Diária"}</h3>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Receita</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Despesa</span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400">{chartPeriodo === "semana" ? "Comparativo desta semana" : chartPeriodo === "ano" ? "Comparativo mensal do ano" : "Comparativo diário do mês"}</p>
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              {([
                { key: "semana" as const, label: "Semana" },
                { key: "mes" as const, label: "Mês" },
                { key: "ano" as const, label: "Ano" },
              ]).map((p) => (
                <button
                  key={p.key}
                  onClick={() => setChartPeriodo(p.key)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all duration-200 cursor-pointer",
                    chartPeriodo === p.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >{p.label}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartPeriodo === "semana" ? receitaSemanal : chartPeriodo === "ano" ? receitaAnual : receitaDiaria}>
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
                formatter={(value: unknown, name: unknown) => [
                  `R$ ${Number(value).toLocaleString("pt-BR")}`,
                  String(name) === "receita" ? "Receita" : "Despesa"
                ]}
              />
              <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2.5} fill="url(#colorReceitaFin)" dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#10b981" }} />
              <Area type="monotone" dataKey="despesa" stroke="#f87171" strokeWidth={2} fill="url(#colorDespesaFin)" dot={{ fill: "#f87171", r: 2, strokeWidth: 0 }} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Cash Flow Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Fluxo de Caixa Mensal</h3>
          <p className="text-xs text-gray-400 mb-4">Receita, despesa e lucro por mês</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={fluxoMensal} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                formatter={(value: unknown, name: unknown) => [
                  formatCurrency(Number(value)),
                  String(name) === "receita" ? "Receita" : String(name) === "despesa" ? "Despesa" : "Lucro"
                ]}
              />
              <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="despesa" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="lucro" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {fluxoMensal.map((entry, i) => (
                  <Cell key={i} fill={entry.lucro >= 0 ? "#34d399" : "#fca5a5"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Charts Row 2: Expenses + Top Customers + Price History ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pie Chart */}
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
                formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value)), String(name)]}
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

        {/* Expense Detail List */}
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
          </div>
        </div>

        {/* Receitas por Categoria */}
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
            {(breakdownTab === "cliente" ? receitaPorCliente : breakdownTab === "lote" ? receitaPorLote : receitaPorGalpao).map((d, i) => {
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
            {breakdownData.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma venda neste período</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Price History + Quick Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price History */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Histórico de Preço / Dúzia</h3>
          <p className="text-xs text-gray-400 mb-4">Evolução do preço médio por dúzia</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={historicoPreco}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis domain={[10, 15]} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `R$ ${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                formatter={(value: unknown) => [`R$ ${Number(value).toFixed(2)}`, "Preço/dz"]}
              />
              <Line type="monotone" dataKey="preco" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: "#f59e0b" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Today's Snapshot — fixed, not affected by period filter */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-gray-900">Resumo de Hoje</h3>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tempo real
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {/* Receita / Ave */}
            <div className="group relative p-4 rounded-xl bg-white border border-emerald-100 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/40 transition-all duration-200 cursor-default">
              <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-emerald-400" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CircleDollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-bold text-gray-800">Receita / Ave</span>
                </div>
                <p className="text-2xl font-extrabold text-emerald-700 tracking-tight">R$ {(2500 / totalAves).toFixed(2).replace(".", ",")}</p>
              </div>
              <div className="ml-10 flex items-start gap-1.5 p-2 rounded-lg bg-emerald-50/50">
                <Sparkles className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-emerald-700/80 leading-relaxed">Venda direto a restaurantes — preço médio 15% maior que distribuidores</p>
              </div>
            </div>

            {/* Custo / Ovo */}
            <div className="group relative p-4 rounded-xl bg-white border border-red-100 hover:border-red-200 hover:shadow-md hover:shadow-red-100/40 transition-all duration-200 cursor-default">
              <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-red-400" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-sm font-bold text-gray-800">Custo / Ovo</span>
                </div>
                <p className="text-2xl font-extrabold text-red-600 tracking-tight">{formatCurrency(544 / (200 * 12))}</p>
              </div>
              <div className="ml-10 flex items-start gap-1.5 p-2 rounded-lg bg-red-50/50">
                <Sparkles className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-red-600/80 leading-relaxed">Ração é 52% do custo — negocie volume ou troque fornecedor</p>
              </div>
            </div>

            {/* Meta Mensal */}
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
