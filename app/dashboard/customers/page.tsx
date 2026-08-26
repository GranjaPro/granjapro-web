"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ModalPortal from "@/components/ui/modal-portal";
import { insightHref } from "@/lib/insight-links";
import {
  Users,
  Search,
  Plus,
  Pencil,
  Archive,
  RotateCcw,
  Check,
  X,
  Phone,
  MapPin,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  ArrowRight,
  CalendarDays,
  Eye,
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Receipt,
  UserCheck,
  UserX,
  ShieldAlert,
  Zap,
  Lightbulb,
  Crown,
  Trophy,
  StickyNote,
  Store,
  UtensilsCrossed,
  Truck,
  UserCircle,
  BarChart3,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { hasMinimumPlan } from "@/lib/plans";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/plan/locked-overlay";
import { RequiredPlanBadge } from "@/components/plan/plan-badge";
import { AssistantLockedPreview } from "@/components/dashboard/assistant-card";
import { CustomersPageSkeleton } from "@/components/dashboard/page-loading-skeletons";
import { useDateFilter, CalendarFilter } from "@/components/date-filter";
import { CustomerModal } from "@/components/customers/customer-modal";
import { archiveCustomer, createCustomer, getCustomers, restoreCustomer, updateCustomer } from "@/lib/services/customers";
import { getSales } from "@/lib/services/sales";
import { calculateCustomerCommercialMetrics, type SaleFinancialRecord } from "@/lib/domain/commercial-financial";
import { formatCnpj, validateCustomerForm, type CustomerFormErrors, type CustomerFormState, type CustomerType } from "@/lib/domain/customer";
import type { Tables } from "@/lib/database.types";

/* ══════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════ */

type ClienteStatus = "pago" | "a_receber" | "atrasado" | "inadimplente" | "inativo";
type ClienteTipo = CustomerType;

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cnpj: string;
  localizacao: string;
  postalCode: string;
  street: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
  tipo: ClienteTipo;
  observacoes: string;
  payment_terms_days: number;
  archivedAt: string | null;
  status: ClienteStatus;
  ultimaCompra: string | null;
  frequencia: number; // purchases per month
  receitaMensal: number;
  ticketMedio: number;
  totalCompras: number;
  recebido: number;
  aReceber: number;
  vencido: number;
}

const tipoLabels: Record<ClienteTipo, string> = {
  market: "Mercado",
  restaurant: "Restaurante",
  distributor: "Distribuidor",
  direct: "Venda Direta",
};

const tipoIcons: Record<ClienteTipo, typeof Store> = {
  market: Store,
  restaurant: UtensilsCrossed,
  distributor: Truck,
  direct: UserCircle,
};

const statusConfig: Record<ClienteStatus, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  pago: { label: "Pago", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2 },
  a_receber: { label: "A Receber", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: Receipt },
  atrasado: { label: "Atrasado", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: Clock },
  inadimplente: { label: "Inadimplente", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: ShieldAlert },
  inativo: { label: "Inativo", color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", icon: XCircle },
};

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

export default function ClientesPage() {
  const { farm } = useAuth();
  const searchParams = useSearchParams();
  const { plan, hideAdvancedFeatures } = usePlan();
  const { dateRange } = useDateFilter();
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState<CustomerFormState>({ name: "", phone: "", email: "", cnpj: "", postalCode: "", street: "", addressNumber: "", addressComplement: "", neighborhood: "", city: "", state: "", type: "", notes: "", paymentTermsDays: "0" });
  const [formErrors, setFormErrors] = useState<CustomerFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ClienteStatus | "todos">("todos");
  const [filterTipo, setFilterTipo] = useState<ClienteTipo | "todos">("todos");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [cobrancaModal, setCobrancaModal] = useState<"atrasado" | "inadimplente" | null>(null);

  /* ── Fetch Data ── */
  const fetchData = useCallback(async () => {
    if (!farm?.id) {
      setClientes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [customersData, salesData] = await Promise.all([
        getCustomers(farm.id, true),
        getSales(farm.id),
      ]);
      const salesByCustomer = new Map<string, Tables<"sales">[]>();
      salesData.forEach((sale) => {
        if (!sale.customer_id) return;
        const current = salesByCustomer.get(sale.customer_id) ?? [];
        current.push(sale);
        salesByCustomer.set(sale.customer_id, current);
      });
      const today = new Date().toISOString().slice(0, 10);

      const mappedClientes: Cliente[] = customersData.map((c) => {
        const customerSales = salesByCustomer.get(c.id) ?? [];
        const totalCompras = customerSales.length;
        const financialSales: SaleFinancialRecord[] = customerSales.map((sale) => ({
          customerId: sale.customer_id,
          date: sale.date,
          dueDate: sale.due_date,
          paidAt: sale.paid_at,
          paymentStatus: sale.payment_status,
          total: Number(sale.total),
        }));
        const metrics = calculateCustomerCommercialMetrics(financialSales, dateRange.startDate, dateRange.endDate, today);
        const statusMap = { paid: "pago", pending: "a_receber", overdue: "atrasado", delinquent: "inadimplente", inactive: "inativo" } as const;
        const firstSaleDate = customerSales.reduce<string | null>((earliest, sale) => !earliest || sale.date < earliest ? sale.date : earliest, null);
        const monthsDiff = firstSaleDate ? Math.max(1, (new Date().getTime() - new Date(`${firstSaleDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 1;

        return {
          id: c.id,
          nome: c.name,
          telefone: c.phone || "",
          email: c.email || "",
          cnpj: c.cnpj || "",
          localizacao: c.location || "",
          postalCode: c.postal_code || "",
          street: c.street || "",
          addressNumber: c.address_number || "",
          addressComplement: c.address_complement || "",
          neighborhood: c.neighborhood || "",
          city: c.city || "",
          state: c.state || "",
          tipo: c.type as ClienteTipo || "market",
          observacoes: c.notes || "",
          payment_terms_days: c.payment_terms_days,
          archivedAt: c.archived_at,
          status: c.archived_at ? "inativo" : statusMap[metrics.status],
          ultimaCompra: metrics.lastSaleDate,
          frequencia: totalCompras / monthsDiff,
          receitaMensal: metrics.billed,
          ticketMedio: metrics.averageTicket,
          totalCompras,
          recebido: metrics.received,
          aReceber: metrics.receivable,
          vencido: metrics.overdue + metrics.delinquent,
        };
      });

      setClientes(mappedClientes);
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os clientes.");
    } finally {
      setLoading(false);
    }
  }, [farm?.id, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const customerId = searchParams.get("customer");
    if (!customerId) return;
    const customer = clientes.find((item) => item.id === customerId);
    if (customer) setSelectedCliente(customer);
  }, [clientes, searchParams]);

  /* ── Derived data ── */
  const filteredClientes = useMemo(() => {
    let list = clientes;
    if (filterStatus !== "todos") list = list.filter((c) => c.status === filterStatus);
    if (filterTipo !== "todos") list = list.filter((c) => c.tipo === filterTipo);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          c.localizacao.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.cnpj.includes(q.replace(/\D/g, "")) ||
          c.telefone.includes(q)
      );
    }
    const statusPriority: Record<ClienteStatus, number> = { inadimplente: 0, atrasado: 1, a_receber: 2, pago: 3, inativo: 4 };
    list = [...list].sort((a, b) => {
      const pa = statusPriority[a.status];
      const pb = statusPriority[b.status];
      if (pa !== pb) return pa - pb;
      return b.receitaMensal - a.receitaMensal;
    });
    return list;
  }, [clientes, filterStatus, filterTipo, searchQuery]);

  const totalClientes = clientes.length;
  const clientesPagos = clientes.filter((c) => c.status === "pago").length;
  const clientesAReceber = clientes.filter((c) => c.status === "a_receber").length;
  const clientesAtrasados = clientes.filter((c) => c.status === "atrasado").length;
  const clientesInadimplentes = clientes.filter((c) => c.status === "inadimplente").length;
  const receitaTotal = clientes.reduce((s, c) => s + c.receitaMensal, 0);
  const ticketMedioGeral = clientes.filter((c) => c.ticketMedio > 0).length > 0
    ? clientes.filter((c) => c.ticketMedio > 0).reduce((s, c) => s + c.ticketMedio, 0) / clientes.filter((c) => c.ticketMedio > 0).length
    : 0;
  const valorAReceber = clientes.reduce((s, c) => s + c.aReceber, 0);
  const dividaAtrasados = clientes.filter((c) => c.status === "atrasado").reduce((s, c) => s + c.vencido, 0);
  const dividaInadimplentes = clientes.filter((c) => c.status === "inadimplente").reduce((s, c) => s + c.vencido, 0);
  const receitaRecebida = clientes.reduce((s, c) => s + c.recebido, 0);
  const receitaPotencial = receitaTotal;
  const pctRecebida = receitaPotencial > 0 ? (receitaRecebida / receitaPotencial) * 100 : 0;

  /* ── Top 5 Clientes ── */
  const top5 = useMemo(() => {
    return [...clientes]
      .filter((c) => c.receitaMensal > 0)
      .sort((a, b) => b.receitaMensal - a.receitaMensal)
      .slice(0, 5);
  }, [clientes]);
  const top5Revenue = top5.reduce((s, c) => s + c.receitaMensal, 0);
  const top5Pct = receitaPotencial > 0 ? (top5Revenue / receitaPotencial) * 100 : 0;

  /* ── Insights Comerciais ── */
  const insightsComerciais = useMemo(() => {
    const arr: { type: "success" | "warning" | "info"; title: string; action: string }[] = [];
    if (clientesInadimplentes > 0) arr.push({ type: "warning", title: `${clientesInadimplentes} cliente${clientesInadimplentes > 1 ? "s" : ""} inadimplente${clientesInadimplentes > 1 ? "s" : ""}`, action: `Dívida total: ${formatCurrency(dividaInadimplentes)} — Acione cobrança urgente` });
    if (clientesAtrasados > 0) arr.push({ type: "warning", title: `${clientesAtrasados} pagamento${clientesAtrasados > 1 ? "s" : ""} atrasado${clientesAtrasados > 1 ? "s" : ""}`, action: `Valor pendente: ${formatCurrency(dividaAtrasados)} — Enviar lembrete` });
    if (top5Pct > 70) arr.push({ type: "info", title: `Top 5 clientes representam ${top5Pct.toFixed(0)}% da receita`, action: "Diversifique a carteira para reduzir dependência" });
    if (clientesAReceber > 0) arr.push({ type: "info", title: `${formatCurrency(valorAReceber)} a receber dentro do prazo`, action: `${clientesAReceber} cliente${clientesAReceber > 1 ? "s" : ""} com pagamento pendente` });
    const inativos = clientes.filter((c) => c.status === "inativo").length;
    if (inativos > 0) arr.push({ type: "info", title: `${inativos} cliente${inativos > 1 ? "s" : ""} inativo${inativos > 1 ? "s" : ""}`, action: "Contatar para reativação — potencial de receita perdida" });
    if (pctRecebida >= 80) arr.push({ type: "success", title: `${pctRecebida.toFixed(0)}% da receita já recebida`, action: "Ótimo desempenho de recebimento este mês" });
    else if (pctRecebida > 0) arr.push({ type: "warning", title: `Apenas ${pctRecebida.toFixed(0)}% da receita recebida`, action: "Intensificar cobranças para melhorar fluxo de caixa" });
    else if (receitaPotencial === 0) arr.push({ type: "info", title: `Nenhuma receita potencial`, action: "Cadastre novas vendas para visualizar as métricas" });
    return arr;
  }, [clientesInadimplentes, clientesAtrasados, clientesAReceber, dividaInadimplentes, dividaAtrasados, valorAReceber, top5Pct, pctRecebida, clientes, receitaPotencial]);

  /* ── CRUD ── */
  function openAdd() {
    setForm({ name: "", phone: "", email: "", cnpj: "", postalCode: "", street: "", addressNumber: "", addressComplement: "", neighborhood: "", city: "", state: "", paymentTermsDays: "0", type: "", notes: "" });
    setFormErrors({});
    setSubmitError(null);
    setEditing(null);
    setModal("add");
  }

  function openEdit(c: Cliente) {
    setForm({ name: c.nome, phone: c.telefone, email: c.email, cnpj: c.cnpj, postalCode: c.postalCode, street: c.street, addressNumber: c.addressNumber, addressComplement: c.addressComplement, neighborhood: c.neighborhood, city: c.city, state: c.state, paymentTermsDays: String(c.payment_terms_days), type: c.tipo, notes: c.observacoes });
    setFormErrors({});
    setSubmitError(null);
    setEditing(c);
    setModal("edit");
  }

  function closeModal() {
    if (!submittingRef.current) setModal(null);
  }

  async function save() {
    if (submittingRef.current) return;
    const validation = validateCustomerForm(form);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }
    if (!farm?.id) {
      setSubmitError("Não foi possível identificar a granja atual.");
      return;
    }

    const record = {
      farm_id: farm.id,
      name: validation.value.name,
      type: validation.value.type,
      phone: validation.value.phone,
      email: validation.value.email,
      cnpj: validation.value.cnpj,
      location: validation.value.location,
      postal_code: validation.value.postalCode,
      street: validation.value.street,
      address_number: validation.value.addressNumber,
      address_complement: validation.value.addressComplement,
      neighborhood: validation.value.neighborhood,
      city: validation.value.city,
      state: validation.value.state,
      payment_terms: `${validation.value.paymentTermsDays} dias`,
      payment_terms_days: validation.value.paymentTermsDays,
      notes: validation.value.notes,
    };

    submittingRef.current = true;
    setSubmitting(true);
    setFormErrors({});
    setSubmitError(null);
    try {
      if (modal === "add") {
        await createCustomer(record);
      } else if (editing) {
        await updateCustomer(editing.id, record);
      }
      setModal(null);
      if (editing && selectedCliente?.id === editing.id) setSelectedCliente(null);
      await fetchData();
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        setFormErrors({ cnpj: "Já existe um cliente com este CNPJ nesta granja." });
        setSubmitError("Revise o CNPJ informado.");
      } else {
        setSubmitError(error instanceof Error ? error.message : "Não foi possível salvar o cliente. Tente novamente.");
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function archiveCliente(id: string) {
    try {
      await archiveCustomer(id);
      setDeleteConfirm(null);
      if (selectedCliente?.id === id) setSelectedCliente(null);
      await fetchData();
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível arquivar o cliente.");
    }
  }

  async function restoreCliente(id: string) {
    try {
      await restoreCustomer(id);
      await fetchData();
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível restaurar o cliente.");
    }
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return "Nunca comprou";
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

  function daysSince(dateStr: string | null) {
    if (!dateStr) return -1;
    const d = new Date(dateStr + "T00:00:00");
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (loading) return <CustomersPageSkeleton />;

  /* ══════════════════════════════════════════════
     CLIENT PROFILE VIEW
     ══════════════════════════════════════════════ */

  if (selectedCliente) {
    const c = selectedCliente;
    const sc = statusConfig[c.status];
    const TipoIcon = tipoIcons[c.tipo];
    const days = daysSince(c.ultimaCompra);

    return (
      <div className="space-y-6">
        {/* Back */}
        <button
          onClick={() => setSelectedCliente(null)}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Clientes
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                <TipoIcon className="w-7 h-7 text-brand-600" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{c.nome}</h1>
                  <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border", sc.color, sc.bg, sc.border)}>
                    <sc.icon className="w-3 h-3" />
                    {sc.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5" />
                    {c.telefone || "Não informado"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />
                    {c.localizacao || "Não informado"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                    <TipoIcon className="w-3.5 h-3.5" />
                    {tipoLabels[c.tipo]}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { openEdit(c); }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl px-4 py-2.5 transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
                Editar
              </button>
            </div>
          </div>
        </div>

        {/* Profile KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(c.receitaMensal)}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Faturado no período</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(c.recebido)}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Recebido no período</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(c.aReceber + c.vencido)}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Saldo em aberto</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-brand-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{c.totalCompras}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Total de Compras</p>
          </div>
        </div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Informações</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Última Compra</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{formatDate(c.ultimaCompra || "")}</span>
                  {days !== -1 && (
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-md",
                      days <= 7 ? "text-emerald-700 bg-emerald-50" : days <= 21 ? "text-amber-700 bg-amber-50" : "text-red-600 bg-red-50"
                    )}>
                      {days === 0 ? "Hoje" : `${days}d atrás`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Tipo</span>
                <span className="text-sm font-medium text-gray-900">{tipoLabels[c.tipo]}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Pagamento</span>
                <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border", sc.color, sc.bg, sc.border)}>
                  <sc.icon className="w-3 h-3" />
                  {sc.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">Telefone</span>
                <span className="text-sm font-medium text-gray-900">{c.telefone || "—"}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-50 py-2">
                <span className="text-sm text-gray-500">E-mail</span>
                <span className="text-sm font-medium text-gray-900">{c.email || "—"}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-50 py-2">
                <span className="text-sm text-gray-500">CNPJ</span>
                <span className="text-sm font-medium text-gray-900">{c.cnpj ? formatCnpj(c.cnpj) : "—"}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-50 py-2">
                <span className="text-sm text-gray-500">Prazo padrão</span>
                <span className="text-sm font-medium text-gray-900">{c.payment_terms_days === 0 ? "À vista" : `${c.payment_terms_days} dias`}</span>
              </div>
            </div>
          </div>

          {/* Observations */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <StickyNote className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900">Observações</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{c.observacoes || "Nenhuma observação registrada."}</p>
          </div>
        </div>
        {modal && (
          <CustomerModal mode={modal} form={form} errors={formErrors} submitError={submitError} submitting={submitting} onChange={(nextForm) => { setForm(nextForm); setFormErrors({}); }} onClose={closeModal} onSubmit={save} />
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════════
     CLIENT LIST VIEW
     ══════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clientes</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestão de clientes e compradores</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CalendarFilter />
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={fetchData} className="font-semibold underline underline-offset-2">Tentar novamente</button>
        </div>
      )}

      {/* KPI Cards */}
      {plan === "essencial" ? (
        <LockedOverlay message="Desbloqueie os indicadores financeiros de clientes" targetPlan="pro">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        {/* Receita Recebida (30d) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 flex flex-col">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Receita Recebida</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{formatCurrency(receitaRecebida)}</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />{clientesPagos} pagos
            </span>
          </div>
          <p className="text-xs text-emerald-600 font-semibold mt-2">Potencial: {formatCurrency(receitaPotencial)}</p>
          <div className="mt-auto pt-3 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 bg-emerald-500" style={{ width: `${totalClientes > 0 ? (clientesPagos / totalClientes) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
              <span className="text-[10px] text-gray-500 font-medium">{clientesPagos} de {totalClientes} clientes</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600">{pctRecebida.toFixed(0)}% recebido</span>
          </div>
        </div>

        {/* A Receber */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 flex flex-col">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Receipt className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">A Receber</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{formatCurrency(valorAReceber)}</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              {clientesAReceber} cliente{clientesAReceber !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-blue-600 font-semibold mt-2">Dentro do prazo</p>
          <div className="mt-auto pt-3 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 bg-blue-500" style={{ width: `${totalClientes > 0 ? (clientesAReceber / totalClientes) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[10px] text-gray-500 font-medium">{clientesAReceber} de {totalClientes} clientes</span>
            </div>
            <span className="text-[10px] font-semibold text-blue-600">Aguardando</span>
          </div>
        </div>

        {/* Se Todos Pagassem */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 flex flex-col">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Se Todos Pagassem</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{formatCurrency(receitaPotencial)}</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {totalClientes - clientes.filter(c => c.status === "inativo").length} ativos
            </span>
          </div>
          <p className="text-xs text-amber-600 font-semibold mt-2">Falta Receber: {formatCurrency(receitaPotencial - receitaRecebida)}</p>
          <div className="mt-auto pt-3 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 bg-blue-500" style={{ width: `${totalClientes > 0 ? ((totalClientes - clientes.filter(c => c.status === "inativo").length) / totalClientes) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
              <span className="text-[10px] text-gray-500 font-medium">{totalClientes - clientes.filter(c => c.status === "inativo").length} de {totalClientes} clientes</span>
            </div>
            <span className="text-[10px] font-semibold text-blue-600">Ticket: {formatCurrency(ticketMedioGeral)}</span>
          </div>
        </div>

        {/* Atrasados */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 flex flex-col">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Atrasados</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{formatCurrency(dividaAtrasados)}</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              {clientesAtrasados} cliente{clientesAtrasados !== 1 ? "s" : ""}
            </span>
          </div>
          {dividaAtrasados > 0 && (
            <button onClick={() => setCobrancaModal("atrasado")} className="mt-3 self-start px-3 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold transition-colors duration-200 cursor-pointer">
              Cobrar agora
            </button>
          )}
          <div className="mt-auto pt-4 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 bg-amber-500" style={{ width: `${totalClientes > 0 ? (clientesAtrasados / totalClientes) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] text-gray-500 font-medium">{clientesAtrasados} de {totalClientes} clientes</span>
            </div>
            <span className={cn("text-[10px] font-semibold", dividaAtrasados > 0 ? "text-amber-600" : "text-emerald-600")}>{dividaAtrasados > 0 ? "Risco médio" : "Nenhuma"}</span>
          </div>
        </div>

        {/* Inadimplentes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 flex flex-col">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <ShieldAlert className="w-4.5 h-4.5 text-red-500" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Inadimplentes</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{formatCurrency(dividaInadimplentes)}</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              {clientesInadimplentes} cliente{clientesInadimplentes !== 1 ? "s" : ""}
            </span>
          </div>
          {dividaInadimplentes > 0 && (
            <button onClick={() => setCobrancaModal("inadimplente")} className="mt-3 self-start px-3 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold transition-colors duration-200 cursor-pointer">
              Cobrar agora
            </button>
          )}
          <div className="mt-auto pt-4 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 bg-red-500" style={{ width: `${totalClientes > 0 ? (clientesInadimplentes / totalClientes) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-[10px] text-gray-500 font-medium">{clientesInadimplentes} de {totalClientes} clientes</span>
            </div>
            <span className={cn("text-[10px] font-semibold", dividaInadimplentes > 0 ? "text-red-500" : "text-emerald-600")}>{dividaInadimplentes > 0 ? "Risco alto" : "Nenhuma"}</span>
          </div>
        </div>

        {/* Inativos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 flex flex-col">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <UserX className="w-4.5 h-4.5 text-gray-500" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Inativos</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{clientes.filter(c => c.status === "inativo").length}</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              <XCircle className="w-3 h-3" />sem compras
            </span>
          </div>
          <div className="mt-auto pt-4 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 bg-gray-400" style={{ width: `${totalClientes > 0 ? (clientes.filter(c => c.status === "inativo").length / totalClientes) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <span className="text-[10px] text-gray-500 font-medium">{clientes.filter(c => c.status === "inativo").length} de {totalClientes} clientes</span>
            </div>
            <span className="text-[10px] font-semibold text-gray-500">Reativar</span>
          </div>
        </div>
          </div>
        </LockedOverlay>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
          {/* Receita Recebida (30d) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Receita Recebida</span>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{formatCurrency(receitaRecebida)}</p>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />{clientesPagos} pagos
              </span>
            </div>
            <p className="text-xs text-emerald-600 font-semibold mt-2">Potencial: {formatCurrency(receitaPotencial)}</p>
            <div className="mt-auto pt-3 relative">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 bg-emerald-500" style={{ width: `${totalClientes > 0 ? (clientesPagos / totalClientes) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                <span className="text-[10px] text-gray-500 font-medium">{clientesPagos} de {totalClientes} clientes</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600">{pctRecebida.toFixed(0)}% recebido</span>
            </div>
          </div>

          {/* A Receber */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Receipt className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">A Receber</span>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{formatCurrency(valorAReceber)}</p>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {clientesAReceber} cliente{clientesAReceber !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-blue-600 font-semibold mt-2">Dentro do prazo</p>
            <div className="mt-auto pt-3 relative">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 bg-blue-500" style={{ width: `${totalClientes > 0 ? (clientesAReceber / totalClientes) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[10px] text-gray-500 font-medium">{clientesAReceber} de {totalClientes} clientes</span>
              </div>
              <span className="text-[10px] font-semibold text-blue-600">Aguardando</span>
            </div>
          </div>

          {/* Se Todos Pagassem */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Se Todos Pagassem</span>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{formatCurrency(receitaPotencial)}</p>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {totalClientes - clientes.filter(c => c.status === "inativo").length} ativos
              </span>
            </div>
            <p className="text-xs text-amber-600 font-semibold mt-2">Falta Receber: {formatCurrency(receitaPotencial - receitaRecebida)}</p>
            <div className="mt-auto pt-3 relative">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 bg-blue-500" style={{ width: `${totalClientes > 0 ? ((totalClientes - clientes.filter(c => c.status === "inativo").length) / totalClientes) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                <span className="text-[10px] text-gray-500 font-medium">{totalClientes - clientes.filter(c => c.status === "inativo").length} de {totalClientes} clientes</span>
              </div>
              <span className="text-[10px] font-semibold text-blue-600">Ticket: {formatCurrency(ticketMedioGeral)}</span>
            </div>
          </div>

          {/* Atrasados */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Atrasados</span>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{formatCurrency(dividaAtrasados)}</p>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                {clientesAtrasados} cliente{clientesAtrasados !== 1 ? "s" : ""}
              </span>
            </div>
            {dividaAtrasados > 0 && (
              <button onClick={() => setCobrancaModal("atrasado")} className="mt-3 self-start px-3 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold transition-colors duration-200 cursor-pointer">
                Cobrar agora
              </button>
            )}
            <div className="mt-auto pt-4 relative">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 bg-amber-500" style={{ width: `${totalClientes > 0 ? (clientesAtrasados / totalClientes) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-[10px] text-gray-500 font-medium">{clientesAtrasados} de {totalClientes} clientes</span>
              </div>
              <span className={cn("text-[10px] font-semibold", dividaAtrasados > 0 ? "text-amber-600" : "text-emerald-600")}>{dividaAtrasados > 0 ? "Risco médio" : "Nenhuma"}</span>
            </div>
          </div>

          {/* Inadimplentes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <ShieldAlert className="w-4.5 h-4.5 text-red-500" />
              </div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Inadimplentes</span>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{formatCurrency(dividaInadimplentes)}</p>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {clientesInadimplentes} cliente{clientesInadimplentes !== 1 ? "s" : ""}
              </span>
            </div>
            {dividaInadimplentes > 0 && (
              <button onClick={() => setCobrancaModal("inadimplente")} className="mt-3 self-start px-3 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold transition-colors duration-200 cursor-pointer">
                Cobrar agora
              </button>
            )}
            <div className="mt-auto pt-4 relative">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 bg-red-500" style={{ width: `${totalClientes > 0 ? (clientesInadimplentes / totalClientes) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-[10px] text-gray-500 font-medium">{clientesInadimplentes} de {totalClientes} clientes</span>
              </div>
              <span className={cn("text-[10px] font-semibold", dividaInadimplentes > 0 ? "text-red-500" : "text-emerald-600")}>{dividaInadimplentes > 0 ? "Risco alto" : "Nenhuma"}</span>
            </div>
          </div>

          {/* Inativos */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <UserX className="w-4.5 h-4.5 text-gray-500" />
              </div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Inativos</span>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{clientes.filter(c => c.status === "inativo").length}</p>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                <XCircle className="w-3 h-3" />sem compras
              </span>
            </div>
            <div className="mt-auto pt-4 relative">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 bg-gray-400" style={{ width: `${totalClientes > 0 ? (clientes.filter(c => c.status === "inativo").length / totalClientes) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <span className="text-[10px] text-gray-500 font-medium">{clientes.filter(c => c.status === "inativo").length} de {totalClientes} clientes</span>
              </div>
              <span className="text-[10px] font-semibold text-gray-500">Reativar</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Assistente de Granja + Top 5 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assistente Comercial */}
        {!(hideAdvancedFeatures && !hasMinimumPlan(plan, "premium")) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm"><Zap className="w-5 h-5 text-white" /></div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Assistente de Granja</h3>
                <p className="text-[11px] text-gray-400 font-medium">Análise comercial dos últimos 30 dias</p>
              </div>
            </div>
            <RequiredPlanBadge requiredPlan="premium" className="flex-shrink-0" />
          </div>
          {plan !== "premium" ? (
            <AssistantLockedPreview lockedMessage="Desbloqueie o Assistente de Granja" />
          ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {insightsComerciais.length > 0 ? insightsComerciais.map((ins, i) => {
              const link = insightHref(`${ins.title} ${ins.action}`);
              if (plan !== "premium" && i >= 2) {
                return (
                  <LockedOverlay key={i} message="Desbloqueie o Assistente de Granja" targetPlan="premium">
                    <div className={cn("p-3.5 rounded-xl border-l-[3px]", ins.type === "success" && "bg-emerald-50/50 border-l-emerald-500", ins.type === "warning" && "bg-amber-50/50 border-l-amber-500", ins.type === "info" && "bg-blue-50/50 border-l-blue-500")}>
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
                  </LockedOverlay>
                );
              }
              return (
                <div key={i} className={cn("p-3.5 rounded-xl border-l-[3px]", ins.type === "success" && "bg-emerald-50/50 border-l-emerald-500", ins.type === "warning" && "bg-amber-50/50 border-l-amber-500", ins.type === "info" && "bg-blue-50/50 border-l-blue-500")}>
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
            }) : (
              <div className="text-center py-8">
                <Lightbulb className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Sem dados suficientes para insights.</p>
              </div>
            )}
          </div>
          )}
        </div>
        )}

        {/* Top 5 Clientes */}
        {plan !== "premium" ? (
          <LockedOverlay message="Desbloqueie o ranking Top 5 Clientes" targetPlan="premium" className="h-full" preserveFirstChild>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col h-full min-h-[310px]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-bold text-gray-900">Top 5 Clientes</h3>
                  <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">{top5Pct.toFixed(0)}% da receita</span>
                </div>
                <div className="flex items-center gap-2">
                  <RequiredPlanBadge requiredPlan="premium" className="flex-shrink-0" />
                  <span className="text-xs font-semibold text-gray-400">{formatCurrency(top5Revenue)}</span>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center py-8">
                <Store className="w-8 h-8 text-gray-300" />
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">Outros {totalClientes - 5 > 0 ? totalClientes - 5 : 0} clientes</span>
                    <span className="text-[11px] text-gray-300 font-bold bg-gray-50 px-1.5 py-0.5 rounded">{(100 - top5Pct).toFixed(0)}%</span>
                  </div>
                  <span className="text-[11px] font-medium text-gray-400 tabular-nums">{formatCurrency(receitaPotencial - top5Revenue)}</span>
                </div>
              </div>
            </div>
          </LockedOverlay>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col h-full min-h-[310px]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-bold text-gray-900">Top 5 Clientes</h3>
                <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">{top5Pct.toFixed(0)}% da receita</span>
              </div>
              <div className="flex items-center gap-2">
                <RequiredPlanBadge requiredPlan="premium" className="flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-400">{formatCurrency(top5Revenue)}</span>
              </div>
            </div>
            <div className="space-y-2.5 flex-1">
              {top5.length > 0 ? top5.map((c, i) => {
                const pct = receitaPotencial > 0 ? (c.receitaMensal / receitaPotencial) * 100 : 0;
                return (
                  <div key={c.id} className="group cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold text-gray-300 w-4 flex-shrink-0">{i + 1}</span>
                        <p className="text-sm font-medium text-gray-700 truncate group-hover:text-gray-900 transition-colors">{c.nome}</p>
                      </div>
                      <div className="flex items-baseline gap-1.5 flex-shrink-0 ml-3">
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(c.receitaMensal)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-400 tabular-nums w-10 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8">
                  <Store className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Sem clientes ativos no período.</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">Outros {totalClientes - 5 > 0 ? totalClientes - 5 : 0} clientes</span>
                  <span className="text-[11px] text-gray-300 font-bold bg-gray-50 px-1.5 py-0.5 rounded">{(100 - top5Pct).toFixed(0)}%</span>
                </div>
                <span className="text-[11px] font-medium text-gray-400 tabular-nums">{formatCurrency(receitaPotencial - top5Revenue)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto scrollbar-none">
          {([
            { key: "todos" as const, label: "Todos" },
            { key: "pago" as const, label: "Pagos" },
            { key: "a_receber" as const, label: "A Receber" },
            { key: "atrasado" as const, label: "Atrasados" },
            { key: "inadimplente" as const, label: "Inadimplentes" },
            { key: "inativo" as const, label: "Inativos" },
          ]).map((s) => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap",
                filterStatus === s.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto scrollbar-none">
          {([
            { key: "todos" as const, label: "Todos" },
            { key: "market" as const, label: "Mercado" },
            { key: "restaurant" as const, label: "Restaurante" },
            { key: "distributor" as const, label: "Distribuidor" },
            { key: "direct" as const, label: "Direto" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterTipo(t.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap",
                filterTipo === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all w-full sm:w-64"
          />
        </div>
      </div>

      {/* Client Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 overflow-visible">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Lista de Clientes</h3>
            <p className="text-xs text-gray-400 mt-0.5">{filteredClientes.length} clientes encontrados</p>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-visible min-h-[300px]">
          {loading ? (
             <div className="flex items-center justify-center h-full py-16 text-gray-400 text-sm">Carregando dados...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pagamento</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Última Compra</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1">
                      Frequência
                      <span className="relative group">
                        <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 transition-colors cursor-help" />
                        <span className="absolute top-full right-1/2 translate-x-1/2 mt-2 w-48 px-3 py-2.5 text-xs text-center font-normal normal-case tracking-normal text-gray-700 bg-white border border-gray-200 rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50">
                          Média de compras por mês deste cliente
                        </span>
                      </span>
                    </span>
                  </th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Receita/Mês</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1">
                      Ticket Médio
                      <span className="relative group">
                        <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 transition-colors cursor-help" />
                        <span className="absolute top-full right-1/2 translate-x-1/2 mt-2 w-48 px-3 py-2.5 text-xs text-center font-normal normal-case tracking-normal text-gray-700 bg-white border border-gray-200 rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50">
                          Valor médio por compra deste cliente
                        </span>
                      </span>
                    </span>
                  </th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((c) => {
                  const sc = statusConfig[c.status];
                  const TipoIcon = tipoIcons[c.tipo];
                  const days = daysSince(c.ultimaCompra);
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                            <TipoIcon className="w-4 h-4 text-brand-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{c.nome}</p>
                            <p className="text-xs text-gray-400 truncate">{c.localizacao}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md">{tipoLabels[c.tipo]}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border", sc.color, sc.bg, sc.border)}>
                          <sc.icon className="w-3 h-3" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div>
                          <p className="text-sm text-gray-600">{formatDate(c.ultimaCompra || "")}</p>
                          {days !== -1 && (
                            <p className={cn(
                              "text-xs font-medium",
                              days <= 7 ? "text-emerald-600" : days <= 21 ? "text-amber-600" : "text-red-500"
                            )}>
                              {days === 0 ? "Hoje" : `${days}d atrás`}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                            c.frequencia >= 4 ? "bg-emerald-50 text-emerald-700" :
                            c.frequencia >= 2 ? "bg-blue-50 text-blue-700" :
                            c.frequencia > 0 ? "bg-amber-50 text-amber-700" :
                            "bg-gray-50 text-gray-400"
                          )}>
                            {c.frequencia >= 4 ? "Compra frequente" : c.frequencia >= 2 ? "Compra semanal" : c.frequencia > 0 ? "Compra irregular" : "Inativo"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900">{c.receitaMensal > 0 ? formatCurrency(c.receitaMensal) : "—"}</td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900">{c.ticketMedio > 0 ? formatCurrency(c.ticketMedio) : "—"}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-1">
                          {c.archivedAt ? (
                            <button onClick={() => restoreCliente(c.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600" aria-label={`Restaurar ${c.nome}`} title="Restaurar cliente">
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : deleteConfirm === c.id ? (
                            <>
                              <button onClick={() => archiveCliente(c.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-amber-600 transition-colors hover:bg-amber-50" aria-label={`Confirmar arquivamento de ${c.nome}`} title="Confirmar arquivamento">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteConfirm(null)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100" aria-label="Cancelar arquivamento" title="Cancelar">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setSelectedCliente(c)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600" aria-label={`Ver perfil de ${c.nome}`} title="Ver perfil">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => openEdit(c)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600" aria-label={`Editar ${c.nome}`} title="Editar">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteConfirm(c.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600" aria-label={`Arquivar ${c.nome}`} title="Arquivar cliente">
                                <Archive className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredClientes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <CustomerModal mode={modal} form={form} errors={formErrors} submitError={submitError} submitting={submitting} onChange={(nextForm) => { setForm(nextForm); setFormErrors({}); }} onClose={closeModal} onSubmit={save} />
      )}
      {/* ── Cobrança Modal ── */}
      {cobrancaModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCobrancaModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className={cn("px-6 py-4 flex items-center justify-between", cobrancaModal === "atrasado" ? "bg-amber-50" : "bg-red-50")}>
              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", cobrancaModal === "atrasado" ? "bg-amber-100" : "bg-red-100")}>
                  {cobrancaModal === "atrasado" ? <Clock className="w-4.5 h-4.5 text-amber-600" /> : <ShieldAlert className="w-4.5 h-4.5 text-red-500" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Cobrar {cobrancaModal === "atrasado" ? "Atrasados" : "Inadimplentes"}</h3>
                  <p className="text-[11px] text-gray-500">Contate os clientes abaixo</p>
                </div>
              </div>
              <button onClick={() => setCobrancaModal(null)} className="w-8 h-8 rounded-lg hover:bg-white/60 flex items-center justify-center transition-colors cursor-pointer"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
              {clientes.filter((c) => c.status === cobrancaModal).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(c.receitaMensal)} · {c.telefone}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                    <a href={`https://wa.me/55${c.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors duration-200" title="WhatsApp">
                      <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    </a>
                    <a href={`tel:${c.telefone.replace(/\D/g, "")}`} className="w-9 h-9 rounded-lg bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors duration-200" title="Ligar">
                      <Phone className="w-4.5 h-4.5 text-white" />
                    </a>
                  </div>
                </div>
              ))}
              {clientes.filter((c) => c.status === cobrancaModal).length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nenhum cliente nesta categoria</p>
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[11px] text-gray-400 text-center">Total: {formatCurrency(cobrancaModal === "atrasado" ? dividaAtrasados : dividaInadimplentes)} de {clientes.filter((c) => c.status === cobrancaModal).length} cliente{clientes.filter((c) => c.status === cobrancaModal).length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
