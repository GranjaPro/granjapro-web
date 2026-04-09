"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ModalPortal from "@/components/ui/modal-portal";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
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
  ShieldCheck,
  ShoppingCart,
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useDateFilter, CalendarFilter } from "@/components/date-filter";

interface Transaction {
  id: string;
  date: string;
  type: "revenue" | "expense";
  category: string;
  description: string;
  amount: number;
  payment_method: string | null;
  reference: string | null;
}

const CATEGORY_COLORS: Record<string, { color: string; icon: any }> = {
  "Ração": { color: "#f59e0b", icon: Wheat },
  "Funcionários": { color: "#3b82f6", icon: Users },
  "Energia": { color: "#f97316", icon: Zap },
  "Água": { color: "#06b6d4", icon: Droplets },
  "Medicamentos": { color: "#ef4444", icon: Pill },
  "Manutenção": { color: "#8b5cf6", icon: Wrench },
  "Venda de Ovos": { color: "#10b981", icon: ShoppingCart },
  "Venda de Aves": { color: "#34d399", icon: ShoppingCart },
  "Outros": { color: "#6b7280", icon: MoreHorizontal },
};

const EXPENSE_CATEGORIES = ["Ração", "Funcionários", "Energia", "Água", "Medicamentos", "Manutenção", "Outros"];
const REVENUE_CATEGORIES = ["Venda de Ovos", "Venda de Aves", "Outros"];

export default function FinancasPage() {
  const searchParams = useSearchParams();
  const { farm } = useAuth();
  const farmRef = useRef(farm);
  farmRef.current = farm;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  
  const [form, setForm] = useState<{
    date: string;
    type: "revenue" | "expense";
    category: string;
    description: string;
    amount: string;
    payment_method: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    type: "expense",
    category: "",
    description: "",
    amount: "",
    payment_method: "Pix",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("farm_id", currentFarm.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (error) throw error;
      setTransactions(data as Transaction[] || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Computed Metrics ── */
  const totalRevenue = transactions.filter(t => t.type === "revenue").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netProfit = totalRevenue - totalExpense;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Aggregated Expenses by Category
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === "expense") {
        const cat = t.category || "Outros";
        map[cat] = (map[cat] || 0) + t.amount;
      }
    });
    return Object.entries(map)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        porcentagem: totalExpense > 0 ? (valor / totalExpense) * 100 : 0,
        color: CATEGORY_COLORS[categoria]?.color || "#cbd5e1",
        icon: CATEGORY_COLORS[categoria]?.icon || MoreHorizontal
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [transactions, totalExpense]);

  // Aggregated Revenues by Category
  const revenuesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === "revenue") {
        const cat = t.category || "Outros";
        map[cat] = (map[cat] || 0) + t.amount;
      }
    });
    return Object.entries(map)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        porcentagem: totalRevenue > 0 ? (valor / totalRevenue) * 100 : 0,
        color: CATEGORY_COLORS[categoria]?.color || "#10b981",
        icon: CATEGORY_COLORS[categoria]?.icon || DollarSign
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [transactions, totalRevenue]);

  // Chart Data: daily or monthly flow based on filterMode
  const chartData = useMemo(() => {
    const { startDate, endDate } = dateRange;
    if (filterMode === "intervalo" && rangeStart && rangeEnd && (rangeEnd.getTime() - rangeStart.getTime() > 1000 * 60 * 60 * 24 * 60)) {
       // Group by month if range > 60 days
       const map: Record<string, { dia: string; receita: number; despesa: number; lucro: number }> = {};
       transactions.forEach(t => {
         const ym = t.date.substring(0, 7);
         if (!map[ym]) map[ym] = { dia: ym, receita: 0, despesa: 0, lucro: 0 };
         if (t.type === "revenue") map[ym].receita += t.amount;
         else map[ym].despesa += t.amount;
         map[ym].lucro = map[ym].receita - map[ym].despesa;
       });
       return Object.values(map).sort((a,b) => a.dia.localeCompare(b.dia));
    } else {
       // Group by day
       const map: Record<string, { dia: string; receita: number; despesa: number }> = {};
       transactions.forEach(t => {
         const d = t.date.substring(5, 10).replace("-", "/"); // MM/DD
         if (!map[d]) map[d] = { dia: d, receita: 0, despesa: 0 };
         if (t.type === "revenue") map[d].receita += t.amount;
         else map[d].despesa += t.amount;
       });
       // Create contiguous days array
       const arr = [];
       const start = new Date(startDate + "T12:00:00");
       const end = new Date(endDate + "T12:00:00");
       for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
         const dStr = String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
         arr.push({ dia: dStr, receita: map[dStr]?.receita || 0, despesa: map[dStr]?.despesa || 0 });
       }
       return arr;
    }
  }, [transactions, filterMode, rangeStart, rangeEnd, dateRange]);

  /* ── Filter & Search ── */
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter(
      (t) =>
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.date.includes(q)
    );
  }, [transactions, searchQuery]);

  /* ── Health Score & Action Items ── */
  const healthScore = Math.max(0, Math.min(100, margin > 20 ? 90 : margin > 10 ? 70 : margin > 0 ? 50 : 20));
  const healthLabel = healthScore >= 70 ? "Saudável" : healthScore >= 40 ? "Atenção" : "Crítico";
  const healthColor = healthScore >= 70 ? "emerald" : healthScore >= 40 ? "amber" : "red";

  const actionItems = useMemo(() => {
    const items = [];
    if (margin < 10) items.push({ icon: AlertTriangle, text: "Margem abaixo de 10% — revise custos com ração", type: "warning" });
    if (totalExpense > totalRevenue) items.push({ icon: AlertTriangle, text: `Despesas superam receitas no período`, type: "warning" });
    if (netProfit > 0) items.push({ icon: CheckCircle2, text: `Lucro líquido positivo no período`, type: "success" });
    return items;
  }, [margin, totalExpense, totalRevenue, netProfit]);


  /* ── CRUD Methods ── */
  function openAdd() {
    setForm({ date: new Date().toISOString().split('T')[0], type: "expense", category: "", description: "", amount: "", payment_method: "Pix" });
    setEditing(null);
    setModal("add");
  }

  function openEdit(t: Transaction) {
    setForm({
      date: t.date,
      type: t.type,
      category: t.category,
      description: t.description || "",
      amount: String(t.amount),
      payment_method: t.payment_method || "Pix",
    });
    setEditing(t);
    setModal("edit");
  }

  async function save() {
    if (!form.date || !form.category || !form.amount) return;
    const currentFarm = farmRef.current;
    if (!currentFarm) return;

    const record = {
      farm_id: currentFarm.id,
      date: form.date,
      type: form.type,
      category: form.category,
      description: form.description,
      amount: Number(form.amount) || 0,
      payment_method: form.payment_method,
    };

    const supabase = createClient();
    try {
      if (modal === "add") {
        await supabase.from("financial_transactions").insert(record);
      } else if (editing) {
        await supabase.from("financial_transactions").update(record).eq("id", editing.id);
      }
      setModal(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteRecord(id: string) {
    const supabase = createClient();
    try {
      await supabase.from("financial_transactions").delete().eq("id", id);
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

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finanças</h1>
            <p className="text-sm text-gray-500 mt-0.5">Controle financeiro e fluxo de caixa</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CalendarFilter />
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            Nova Transação
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
              <p className="text-xs text-gray-500 mt-0.5">Margem: {margin.toFixed(1)}%</p>
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
            {actionItems.length === 0 && (
              <p className="text-sm text-gray-500">Sem alertas no momento.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Main KPI Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Receitas</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{formatCurrency(totalRevenue)}</p>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Despesas</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tracking-tight">{formatCurrency(totalExpense)}</p>
        </div>

        {/* Net Profit */}
        <div className={cn(
          "rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg",
          netProfit >= 0
            ? "bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200/60 hover:shadow-emerald-200/30"
            : "bg-gradient-to-br from-red-50/80 to-white border-red-200/60 hover:shadow-red-200/30"
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              netProfit >= 0 ? "bg-emerald-100" : "bg-red-100"
            )}>
              <PiggyBank className={cn("w-5 h-5", netProfit >= 0 ? "text-emerald-600" : "text-red-500")} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Lucro Líquido</p>
            </div>
          </div>
          <p className={cn(
            "text-3xl font-bold tracking-tight",
            netProfit >= 0 ? "text-emerald-700" : "text-red-600"
          )}>{formatCurrency(netProfit)}</p>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-900">Fluxo de Caixa</h3>
            <p className="text-xs text-gray-400 mt-0.5">Evolução de receitas e despesas no período</p>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
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
                  formatter={((value: any, name: any) => [
                    `R$ ${Number(value).toLocaleString("pt-BR")}`,
                    String(name) === "receita" ? "Receita" : "Despesa"
                  ]) as any}
                />
                <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2.5} fill="url(#colorReceitaFin)" dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#10b981" }} />
                <Area type="monotone" dataKey="despesa" stroke="#f87171" strokeWidth={2} fill="url(#colorDespesaFin)" dot={{ fill: "#f87171", r: 2, strokeWidth: 0 }} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">Sem dados suficientes no período</div>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-900">Despesas por Categoria</h3>
            <p className="text-xs text-gray-400 mt-0.5">Distribuição dos custos</p>
          </div>
          <div className="flex-1 flex items-center gap-4">
            <div className="flex-1 max-w-[200px]">
              {expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="valor" nameKey="categoria" paddingAngle={3} strokeWidth={0}>
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                      formatter={((value: any, name: any) => [formatCurrency(Number(value)), String(name)]) as any}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                 <div className="h-[180px] flex items-center justify-center text-xs text-gray-400">Nenhuma despesa</div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              {expensesByCategory.slice(0, 5).map((d) => (
                <div key={d.categoria} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{d.categoria}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">{d.porcentagem.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Transactions Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Transações</h3>
            <p className="text-xs text-gray-400 mt-0.5">{filteredTransactions.length} registros no período</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100/80 rounded-xl px-3 py-2 w-full sm:w-72 transition-colors focus-within:bg-gray-100 focus-within:ring-2 focus-within:ring-brand-500/20">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por categoria, descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
          {loading ? (
             <div className="p-8 text-center text-sm text-gray-500">Carregando dados...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-3 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="text-left py-3 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-left py-3 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="text-left py-3 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th className="text-right py-3 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="text-right py-3 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm text-gray-600 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="py-4 px-6">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold",
                        t.type === "revenue" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                      )}>
                        {t.type === "revenue" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {t.type === "revenue" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs font-semibold text-gray-700 px-2.5 py-1 rounded-lg bg-gray-100 whitespace-nowrap">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600 max-w-[200px] truncate" title={t.description}>{t.description || "—"}</td>
                    <td className={cn(
                      "py-4 px-6 text-right text-sm font-bold whitespace-nowrap",
                      t.type === "revenue" ? "text-emerald-600" : "text-red-500"
                    )}>
                      {t.type === "revenue" ? "+" : "-"} {formatCurrency(t.amount)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      Nenhuma transação encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Form Modal ── */}
      {modal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Nova Transação" : "Editar Transação"}
              </h3>
              <button onClick={() => setModal(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo</label>
                  <div className="flex items-center bg-gray-100 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "revenue", category: "" })}
                      className={cn("flex-1 py-2 text-xs font-semibold rounded-lg transition-all", form.type === "revenue" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500")}
                    >
                      Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "expense", category: "" })}
                      className={cn("flex-1 py-2 text-xs font-semibold rounded-lg transition-all", form.type === "expense" ? "bg-white text-red-600 shadow-sm" : "text-gray-500")}
                    >
                      Despesa
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Categoria</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {(form.type === "expense" ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descrição</label>
                <input
                  type="text"
                  placeholder="Detalhes (opcional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all placeholder:text-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Forma de Pagto.</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all cursor-pointer"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Transferência">Transferência Bancária</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-8">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={!form.date || !form.category || !form.amount}
                className={cn(
                  "flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm",
                  form.date && form.category && form.amount
                    ? "text-white bg-brand-600 hover:bg-brand-700"
                    : "text-gray-400 bg-gray-200 cursor-not-allowed"
                )}
              >
                {modal === "add" ? "Registrar" : "Salvar"}
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
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir esta transação?</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={() => deleteRecord(deleteConfirm)} className="px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
