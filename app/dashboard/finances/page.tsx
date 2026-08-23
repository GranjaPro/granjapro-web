"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { insightHref } from "@/lib/insight-links";
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  BarChart3,
  Plus,
  Zap,
  Droplets,
  Wrench,
  Users,
  Wheat,
  Pill,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  Scale,
  CircleDollarSign,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/plan/locked-overlay";
import { RequiredPlanBadge } from "@/components/plan/plan-badge";
import { FarmHealthBanner, type FarmHealthInsight } from "@/components/dashboard/farm-health-banner";
import { TransactionModal, type TransactionFormState, type InventoryOption } from "@/components/finances/transaction-modal";
import { TransactionTable, type FinancialTransactionRow } from "@/components/finances/transaction-table";
import { useDateFilter, CalendarFilter } from "@/components/date-filter";
import { hasMinimumPlan } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { getTransactionsByDateRange, getFinancialSummaryInRange, createTransaction, updateTransaction, deleteTransaction, type FinancialTransaction, type FinancialSummaryData } from "@/lib/services/finances";
import { getFarmBirdCount } from "@/lib/services/farms";
import { getFeedInventory, type FeedInventoryCompatibilityRow } from "@/lib/services/inventory";
import { getSalesByDateRange } from "@/lib/services/sales";
import { transactionCategories, type TransactionCategoryKey } from "@/lib/constants/transaction-categories";
import { inventoryLinkFromSelection, inventorySelectionKey, parseInventorySelectionKey, parsePositiveAmount } from "@/lib/domain/financial-transaction";
import { calculateSalesFinancialMetrics, getSixMonthDateRange, groupMonthlySalesMetrics } from "@/lib/domain/financial-kpi-metrics";
import { calculateKpiVariation, getComparisonPeriod } from "@/lib/domain/kpi-comparison";
import type { Tables } from "@/lib/database.types";
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


type FinanceSale = Tables<"sales"> & { customers: { name: string } | null };

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

export default function FinancasPage() {
  const { farm } = useAuth();
  const { plan, hideAdvancedFeatures } = usePlan();
  const showFinancesProFeatures = !(hideAdvancedFeatures && !hasMinimumPlan(plan, "pro"));
  const { dateRange, filterMode } = useDateFilter();

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [historicalTransactions, setHistoricalTransactions] = useState<FinancialTransaction[]>([]);
  const [sales, setSales] = useState<FinanceSale[]>([]);
  const [historicalSales, setHistoricalSales] = useState<FinanceSale[]>([]);
  const [inventoryItems, setInventoryItems] = useState<FeedInventoryCompatibilityRow[]>([]);
  const [summary, setSummary] = useState<FinancialSummaryData | null>(null);
  const [previousSummary, setPreviousSummary] = useState<FinancialSummaryData | null>(null);
  const [totalAves, setTotalAves] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<FinancialTransactionRow | null>(null);
  const [form, setForm] = useState<TransactionFormState>({
    date: "",
    type: "expense",
    category: "feed",
    description: "",
    amount: "",
    paymentMethod: "",
    inventorySelection: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;
    if (!farm?.id) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const comparisonPeriod = getComparisonPeriod({
      mode: filterMode,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      todayDate: new Date().toISOString().slice(0, 10),
    });
    const historyRange = getSixMonthDateRange(dateRange.endDate);
    setLoading(true);
    setLoadError(null);
    try {
      const [transRes, summaryRes, previousSummaryRes, historyTransRes, salesRes, historySalesRes, inventoryRes, birdCount] = await Promise.all([
        getTransactionsByDateRange(farm.id, dateRange.startDate, dateRange.endDate),
        getFinancialSummaryInRange(farm.id, dateRange.startDate, dateRange.endDate),
        getFinancialSummaryInRange(farm.id, comparisonPeriod.previousStartDate, comparisonPeriod.previousEndDate),
        getTransactionsByDateRange(farm.id, historyRange.startDate, historyRange.endDate),
        getSalesByDateRange(farm.id, dateRange.startDate, dateRange.endDate),
        getSalesByDateRange(farm.id, historyRange.startDate, historyRange.endDate),
        getFeedInventory(farm.id),
        getFarmBirdCount(farm.id),
      ]);

      if (requestVersion !== requestVersionRef.current) return;
      setTransactions(transRes);
      setHistoricalTransactions(historyTransRes);
      setSales(salesRes as unknown as FinanceSale[]);
      setHistoricalSales(historySalesRes as unknown as FinanceSale[]);
      setInventoryItems(inventoryRes);
      setSummary(summaryRes);
      setPreviousSummary(previousSummaryRes);
      setTotalAves(birdCount);
    } catch (error: unknown) {
      if (requestVersion === requestVersionRef.current) {
        setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os dados financeiros.");
      }
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false);
    }
  }, [farm?.id, dateRange, filterMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const periodoLabel = filterMode === "dia" ? "Dia selecionado" : filterMode === "intervalo" ? "Período selecionado" : "Mês selecionado";

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
      const key = t.date.substring(0, 10);
      if (!map[key]) map[key] = { dia: key, receita: 0, despesa: 0 };
      if (t.type === "revenue") map[key].receita += Number(t.amount);
      else if (t.type === "expense") map[key].despesa += Number(t.amount);
    });
    return Object.values(map).sort((a, b) => a.dia.localeCompare(b.dia));
  }, [transactions]);

  const fluxoMensalData = useMemo(() => {
    if (!historicalTransactions.length) return [];
    const map: Record<string, { mes: string; receita: number; despesa: number; lucro: number }> = {};
    historicalTransactions.forEach((t) => {
      const ym = t.date.substring(0, 7);
      if (!map[ym]) map[ym] = { mes: ym, receita: 0, despesa: 0, lucro: 0 };
      if (t.type === "revenue") map[ym].receita += Number(t.amount);
      else if (t.type === "expense") map[ym].despesa += Number(t.amount);
    });
    return Object.values(map)
      .map((m) => ({ ...m, lucro: m.receita - m.despesa }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [historicalTransactions]);

  const historicoPrecosData = useMemo(
    () => groupMonthlySalesMetrics(historicalSales).map((metric) => ({ mes: metric.month, preco: metric.averagePricePerDozen ?? 0 })),
    [historicalSales],
  );

  const totalDespesasFiltradas = summary?.expenses ?? 0;
  const receitaPeriodo = summary?.revenue ?? 0;
  const despesaPeriodo = summary?.expenses ?? 0;
  const lucroLiquido = summary?.profit ?? 0;
  const margem = receitaPeriodo > 0 ? ((lucroLiquido / receitaPeriodo) * 100) : 0;
  const lucroPorAve = totalAves > 0 ? lucroLiquido / totalAves : 0;
  const salesMetrics = useMemo(() => calculateSalesFinancialMetrics(sales), [sales]);
  const volumeTotal = salesMetrics.dozensSold;
  const precoMedio = salesMetrics.averagePricePerDozen ?? 0;
  const periodoRef = "vs período anterior";

  const revenueVariation = calculateKpiVariation(receitaPeriodo, previousSummary?.revenue ?? 0);
  const expenseVariation = calculateKpiVariation(despesaPeriodo, previousSummary?.expenses ?? 0);
  const profitVariation = calculateKpiVariation(lucroLiquido, previousSummary?.profit ?? 0);
  const varReceita = { pct: revenueVariation.label, dir: revenueVariation.direction === "down" ? "down" as const : "up" as const };
  const varDespesa = { pct: expenseVariation.label, dir: expenseVariation.direction === "down" ? "down" as const : "up" as const };
  const varLucro = { pct: profitVariation.label, dir: profitVariation.direction === "down" ? "down" as const : "up" as const };

  const inventoryNameByKey = useMemo(
    () => new Map(inventoryItems.map((item) => [inventorySelectionKey({ table: item.inventory_table, id: item.id }), item.name])),
    [inventoryItems],
  );

  const transactionRows = useMemo<FinancialTransactionRow[]>(() => transactions.map((transaction) => {
    const inventoryKey = transaction.feed_inventory_id
      ? inventorySelectionKey({ table: "feed", id: transaction.feed_inventory_id })
      : transaction.medicine_inventory_id
        ? inventorySelectionKey({ table: "medicine", id: transaction.medicine_inventory_id })
        : transaction.packaging_inventory_id
          ? inventorySelectionKey({ table: "packaging", id: transaction.packaging_inventory_id })
          : transaction.equipment_inventory_id
            ? inventorySelectionKey({ table: "equipment", id: transaction.equipment_inventory_id })
            : null;

    return {
      id: transaction.id,
      date: transaction.date,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: Number(transaction.amount),
      paymentMethod: transaction.payment_method,
      reference: transaction.reference,
      inventoryName: inventoryKey ? inventoryNameByKey.get(inventoryKey) ?? null : null,
    };
  }), [inventoryNameByKey, transactions]);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactionRows;
    const q = searchQuery.toLowerCase();
    return transactionRows.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.inventoryName?.toLowerCase().includes(q) ||
        t.date.includes(q)
    );
  }, [transactionRows, searchQuery]);

  const receitaPorCliente = useMemo(() => {
    const map = new Map<string, { valor: number; vendas: number }>();
    sales.forEach((sale) => {
      const customerName = sale.customers?.name ?? "Cliente não informado";
      const current = map.get(customerName) ?? { valor: 0, vendas: 0 };
      map.set(customerName, { valor: current.valor + Number(sale.total), vendas: current.vendas + 1 });
    });
    return Array.from(map.entries()).map(([nome, d]) => ({ nome, ...d })).sort((a, b) => b.valor - a.valor);
  }, [sales]);

  const healthScore = useMemo(() => {
    let score = 0;
    if (margem > 15) score += 40; else if (margem > 5) score += 20; else if (margem > 0) score += 10;
    if (varReceita.dir === "up") score += 25; else score += 5;
    if (varDespesa.dir === "down") score += 25; else score += 5;
    if (lucroPorAve > 0) score += 10; else score += 0;
    return Math.min(score, 100);
  }, [margem, varReceita, varDespesa, lucroPorAve]);

  const actionItems = useMemo(() => {
    const items: { icon: typeof AlertTriangle; text: string; type: "warning" | "success" | "info" }[] = [];
    if (margem < 10) items.push({ icon: AlertTriangle, text: "Margem abaixo de 10% — revise custos com ração", type: "warning" });
    if (varDespesa.dir === "up") items.push({ icon: AlertTriangle, text: `Despesas subiram ${varDespesa.pct} — investigue ração e energia`, type: "warning" });
    if (lucroLiquido > 0 && varLucro.dir === "up") items.push({ icon: CheckCircle2, text: `Lucro cresceu ${varLucro.pct} — tendência positiva`, type: "success" });
    if (varReceita.dir === "up") items.push({ icon: CheckCircle2, text: `Receita subiu ${varReceita.pct} — bom ritmo de vendas`, type: "success" });
    return items;
  }, [margem, varDespesa, lucroLiquido, varLucro, varReceita]);
  const farmHealthInsights = useMemo<FarmHealthInsight[]>(
    () =>
      actionItems.map((item) => {
        const link = insightHref(item.text);

        return {
          level: item.type,
          title: item.text,
          action: "Abrir indicador relacionado",
          href: link.href,
          hrefLabel: link.label,
        };
      }),
    [actionItems]
  );
  const farmHealthSummary = `Margem: ${margem.toFixed(1)}% | Resultado: ${formatCurrency(lucroLiquido)}`;

  const inventoryOptions = useMemo<InventoryOption[]>(() => {
    const groupLabels: Record<FeedInventoryCompatibilityRow["inventory_table"], string> = {
      feed: "Ração",
      medicine: "Medicamentos",
      packaging: "Embalagens",
      equipment: "Equipamentos",
    };
    return inventoryItems.map((item) => ({
      key: inventorySelectionKey({ table: item.inventory_table, id: item.id }),
      label: item.name,
      group: groupLabels[item.inventory_table],
    }));
  }, [inventoryItems]);

  function openAdd() {
    setForm({ date: "", type: "expense", category: "feed", description: "", amount: "", paymentMethod: "", inventorySelection: "" });
    setFormError(null);
    setEditing(null);
    setModal("add");
  }

  function openEdit(transaction: FinancialTransactionRow) {
    const source = transactions.find((item) => item.id === transaction.id);
    const selection = source?.feed_inventory_id
      ? { table: "feed" as const, id: source.feed_inventory_id }
      : source?.medicine_inventory_id
        ? { table: "medicine" as const, id: source.medicine_inventory_id }
        : source?.packaging_inventory_id
          ? { table: "packaging" as const, id: source.packaging_inventory_id }
          : source?.equipment_inventory_id
            ? { table: "equipment" as const, id: source.equipment_inventory_id }
            : null;
    setForm({
      date: transaction.date,
      type: "expense",
      category: transaction.category,
      description: transaction.description,
      amount: String(transaction.amount),
      paymentMethod: transaction.paymentMethod ?? "",
      inventorySelection: selection ? inventorySelectionKey(selection) : "",
    });
    setFormError(null);
    setEditing(transaction);
    setModal("edit");
  }

  async function save() {
    if (submittingRef.current) return;
    const amountResult = parsePositiveAmount(form.amount);
    if (!amountResult.valid) {
      setFormError(amountResult.message);
      return;
    }
    if (!farm?.id) return;

    const inventorySelection = parseInventorySelectionKey(form.inventorySelection);

    const record = {
      farm_id: farm.id,
      date: form.date,
      type: "expense" as const,
      category: form.category,
      description: form.description,
      amount: amountResult.amount,
      payment_method: form.paymentMethod || null,
      ...inventoryLinkFromSelection(inventorySelection),
    };

    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      if (modal === "add") {
        await createTransaction(record);
      } else if (editing) {
        await updateTransaction(editing.id, record);
      }
      setModal(null);
      await fetchData();
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "Não foi possível salvar a transação.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTransaction(id);
      setDeleteConfirm(null);
      await fetchData();
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível excluir a transação.");
    }
  }

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <div className="space-y-6 relative">
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
          <Link href="/dashboard/sales" className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50">
            Registrar venda
          </Link>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            Registrar despesa
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Financial Health Banner */}
      {plan === "essencial" ? (
        <LockedOverlay message="Desbloqueie a saúde financeira" targetPlan="pro">
          <FarmHealthBanner
            score={healthScore}
            summary={farmHealthSummary}
            insights={farmHealthInsights}
            emptyMessage={loading ? "Carregando indicadores..." : "Sem alertas no momento."}
          />
        </LockedOverlay>
      ) : (
        <FarmHealthBanner
          score={healthScore}
          summary={farmHealthSummary}
          insights={farmHealthInsights}
          emptyMessage={loading ? "Carregando indicadores..." : "Sem alertas no momento."}
        />
      )}

      {/* Main KPI Row */}
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", showFinancesProFeatures ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
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

        {plan === "essencial" ? (
          <LockedOverlay message="Desbloqueie o lucro por ave" targetPlan="pro">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
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
          </LockedOverlay>
        ) : (
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
        )}
      </div>

      {/* Charts Row 1 */}
      <div className={cn("grid grid-cols-1 gap-6", showFinancesProFeatures && "lg:grid-cols-2")}>
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
                formatter={(value, name) => [
                  `R$ ${Number(value).toLocaleString("pt-BR")}`,
                  String(name) === "receita" ? "Receita" : "Despesa"
                ]}
              />
              <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2.5} fill="url(#colorReceitaFin)" dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#10b981" }} />
              <Area type="monotone" dataKey="despesa" stroke="#f87171" strokeWidth={2} fill="url(#colorDespesaFin)" dot={{ fill: "#f87171", r: 2, strokeWidth: 0 }} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {plan === "essencial" ? (
          <LockedOverlay message="Desbloqueie o fluxo de caixa mensal" targetPlan="pro" preserveFirstChild>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Fluxo de Caixa Mensal</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Receita, despesa e lucro por mês</p>
                </div>
                <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
              </div>
              <div className="h-[240px]" />
            </div>
          </LockedOverlay>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Fluxo de Caixa Mensal</h3>
                <p className="text-xs text-gray-400 mt-0.5">Receita, despesa e lucro por mês</p>
              </div>
              <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={fluxoMensalData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                  formatter={(value, name) => [
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
        )}
      </div>

      {/* Charts Row 2 */}
      <div className={cn("grid grid-cols-1 gap-6", showFinancesProFeatures ? "lg:grid-cols-12" : "lg:grid-cols-2")}>
        <div className={cn("bg-white rounded-2xl border border-gray-100 p-6", showFinancesProFeatures && "lg:col-span-3")}>
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
                formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
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

        <div className={cn("bg-white rounded-2xl border border-gray-100 p-6", showFinancesProFeatures && "lg:col-span-4")}>
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

        {plan === "essencial" ? (
          <LockedOverlay message="Desbloqueie as receitas por cliente" targetPlan="pro" className="lg:col-span-5 h-full" preserveFirstChild>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 h-full min-h-[304px]">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Receitas por Cliente</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Somente vendas registradas — {periodoLabel}</p>
                </div>
                <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
              </div>
              <div className="h-[214px]" />
            </div>
          </LockedOverlay>
        ) : (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 p-6 h-full min-h-[304px]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Receitas por Cliente</h3>
                <p className="text-xs text-gray-400 mt-0.5">Somente vendas registradas — {periodoLabel}</p>
              </div>
              <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
            </div>
            <div className="space-y-3">
              {receitaPorCliente.map((d, i) => {
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
                        <span className="text-sm font-medium text-gray-800 truncate">{d.nome}</span>
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
              {!loading && receitaPorCliente.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Nenhuma venda neste período</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Price History */}
      <div className={cn("grid grid-cols-1 gap-6", showFinancesProFeatures && "lg:grid-cols-3")}>
        {plan === "essencial" ? (
          <LockedOverlay message="Desbloqueie o histórico de preço" targetPlan="pro" className="lg:col-span-2 h-full" preserveFirstChild>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 h-full min-h-[320px]">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Histórico de Preço / Dúzia</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Evolução do preço médio por dúzia</p>
                </div>
                <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
              </div>
              <div className="h-[200px]" />
            </div>
          </LockedOverlay>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 h-full min-h-[320px]">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Histórico de Preço / Dúzia</h3>
                <p className="text-xs text-gray-400 mt-0.5">Evolução do preço médio por dúzia</p>
              </div>
              <RequiredPlanBadge requiredPlan="pro" className="flex-shrink-0" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historicoPrecosData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis domain={["auto", "auto"]} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `R$ ${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                  formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Preço/dz"]}
                />
                <Line type="monotone" dataKey="preco" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: "#f59e0b" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col h-full min-h-[320px]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-gray-900">Resumo do Período</h3>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-600">{periodoLabel}</span>
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
              <p className="ml-10 rounded-lg bg-emerald-50/50 p-2 text-[11px] leading-relaxed text-emerald-700/80">Baseado em {totalAves} aves cadastradas</p>
            </div>

            <div className="group relative p-4 rounded-xl bg-white border border-blue-100 hover:border-blue-200 hover:shadow-md hover:shadow-blue-100/40 transition-all duration-200 cursor-default">
              <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-blue-400" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Scale className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-bold text-gray-800">Resultado Líquido</span>
                </div>
                <p className={cn("text-2xl font-extrabold tracking-tight", lucroLiquido >= 0 ? "text-emerald-700" : "text-red-600")}>{formatCurrency(lucroLiquido)}</p>
              </div>
              <p className="ml-10 rounded-lg bg-blue-50/50 p-2 text-[11px] leading-relaxed text-blue-700/80">Receitas menos despesas do período selecionado</p>
            </div>
          </div>
        </div>
      </div>

      <TransactionTable
        rows={filteredTransactions}
        loading={loading}
        periodLabel={periodoLabel}
        searchQuery={searchQuery}
        deleteConfirm={deleteConfirm}
        onSearchChange={setSearchQuery}
        onEdit={openEdit}
        onDeleteRequest={setDeleteConfirm}
        onDeleteCancel={() => setDeleteConfirm(null)}
        onDeleteConfirm={handleDelete}
      />

      {modal && (
        <TransactionModal
          mode={modal}
          form={form}
          inventoryOptions={inventoryOptions}
          error={formError}
          submitting={submitting}
          onChange={(nextForm) => {
            setForm(nextForm);
            setFormError(null);
          }}
          onClose={() => {
            if (!submitting) setModal(null);
          }}
          onSubmit={save}
        />
      )}
    </div>
  );
}
