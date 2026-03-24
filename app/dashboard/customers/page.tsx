"use client";

import { useState, useMemo } from "react";
import ModalPortal from "@/components/ui/modal-portal";
import {
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Phone,
  MapPin,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
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
  StickyNote,
  Store,
  UtensilsCrossed,
  Truck,
  UserCircle,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════
   TYPES & MOCK DATA
   ══════════════════════════════════════════════ */

type ClienteStatus = "em_dia" | "atrasado" | "inadimplente" | "inativo";
type ClienteTipo = "mercado" | "restaurante" | "distribuidor" | "direto";

interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  localizacao: string;
  tipo: ClienteTipo;
  observacoes: string;
  status: ClienteStatus;
  ultimaCompra: string;
  frequencia: number; // purchases per month
  receitaMensal: number;
  ticketMedio: number;
  totalCompras: number;
}

const tipoLabels: Record<ClienteTipo, string> = {
  mercado: "Mercado",
  restaurante: "Restaurante",
  distribuidor: "Distribuidor",
  direto: "Venda Direta",
};

const tipoIcons: Record<ClienteTipo, typeof Store> = {
  mercado: Store,
  restaurante: UtensilsCrossed,
  distribuidor: Truck,
  direto: UserCircle,
};

const statusConfig: Record<ClienteStatus, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  em_dia: { label: "Em Dia", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2 },
  atrasado: { label: "Atrasado", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: Clock },
  inadimplente: { label: "Inadimplente", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: ShieldAlert },
  inativo: { label: "Inativo", color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", icon: XCircle },
};

const initialClientes: Cliente[] = [
  { id: 1, nome: "Mercado Central", telefone: "(31) 3333-1111", localizacao: "Belo Horizonte, MG", tipo: "mercado", observacoes: "Cliente desde 2022. Compra toda semana. Prefere ovos brancos.", status: "em_dia", ultimaCompra: "2024-04-17", frequencia: 4.2, receitaMensal: 6200, ticketMedio: 1475, totalCompras: 48 },
  { id: 2, nome: "Supermercado BH", telefone: "(31) 3333-2222", localizacao: "Contagem, MG", tipo: "mercado", observacoes: "Pagamento a prazo (15 dias). Volume alto.", status: "em_dia", ultimaCompra: "2024-04-15", frequencia: 3.5, receitaMensal: 4100, ticketMedio: 1171, totalCompras: 36 },
  { id: 3, nome: "Restaurante Sabor", telefone: "(31) 9999-3333", localizacao: "Belo Horizonte, MG", tipo: "restaurante", observacoes: "Aceita ovos caipira. Compra às terças e sextas.", status: "em_dia", ultimaCompra: "2024-04-16", frequencia: 8.0, receitaMensal: 2850, ticketMedio: 356, totalCompras: 72 },
  { id: 4, nome: "Padaria Boa Mesa", telefone: "(31) 9999-4444", localizacao: "Betim, MG", tipo: "restaurante", observacoes: "Compra pequena mas constante. Potencial para aumentar.", status: "em_dia", ultimaCompra: "2024-04-14", frequencia: 5.0, receitaMensal: 1680, ticketMedio: 336, totalCompras: 55 },
  { id: 5, nome: "Feira Livre Municipal", telefone: "(31) 9999-5555", localizacao: "Santa Luzia, MG", tipo: "direto", observacoes: "Sábados de manhã. Negocia muito preço.", status: "atrasado", ultimaCompra: "2024-03-30", frequencia: 1.2, receitaMensal: 865, ticketMedio: 721, totalCompras: 12 },
  { id: 6, nome: "Distribuidora Minas Ovos", telefone: "(31) 3333-6666", localizacao: "Ribeirão das Neves, MG", tipo: "distribuidor", observacoes: "Comprava em volume. Parou há 2 meses. Ligar para reativar.", status: "inativo", ultimaCompra: "2024-02-10", frequencia: 0, receitaMensal: 0, ticketMedio: 2800, totalCompras: 18 },
  { id: 7, nome: "Hotel Fazenda Sol", telefone: "(31) 9999-7777", localizacao: "Nova Lima, MG", tipo: "restaurante", observacoes: "Pedidos esporádicos. Último pedido atrasou pagamento.", status: "inadimplente", ultimaCompra: "2024-04-01", frequencia: 0.8, receitaMensal: 420, ticketMedio: 525, totalCompras: 8 },
  { id: 8, nome: "Mercearia do Zé", telefone: "(31) 9999-8888", localizacao: "Ibirité, MG", tipo: "mercado", observacoes: "Pequeno volume mas sempre paga em dia.", status: "em_dia", ultimaCompra: "2024-04-12", frequencia: 2.0, receitaMensal: 540, ticketMedio: 270, totalCompras: 22 },
];

const tipoOptions: ClienteTipo[] = ["mercado", "restaurante", "distribuidor", "direto"];

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */

export default function ClientesPage() {
  const [clientes, setClientes] = useState(initialClientes);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ nome: "", telefone: "", localizacao: "", tipo: "" as ClienteTipo | "", observacoes: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ClienteStatus | "todos">("todos");
  const [filterTipo, setFilterTipo] = useState<ClienteTipo | "todos">("todos");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

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
          c.telefone.includes(q)
      );
    }
    const statusPriority: Record<ClienteStatus, number> = { inadimplente: 0, atrasado: 1, em_dia: 2, inativo: 3 };
    list = [...list].sort((a, b) => {
      const pa = statusPriority[a.status];
      const pb = statusPriority[b.status];
      if (pa !== pb) return pa - pb;
      return b.receitaMensal - a.receitaMensal;
    });
    return list;
  }, [clientes, filterStatus, filterTipo, searchQuery]);

  const totalClientes = clientes.length;
  const clientesEmDia = clientes.filter((c) => c.status === "em_dia").length;
  const clientesAtrasados = clientes.filter((c) => c.status === "atrasado").length;
  const clientesInadimplentes = clientes.filter((c) => c.status === "inadimplente").length;
  const clientesInativos = clientes.filter((c) => c.status === "inativo").length;
  const receitaTotal = clientes.reduce((s, c) => s + c.receitaMensal, 0);
  const ticketMedioGeral = clientes.filter((c) => c.ticketMedio > 0).length > 0
    ? clientes.filter((c) => c.ticketMedio > 0).reduce((s, c) => s + c.ticketMedio, 0) / clientes.filter((c) => c.ticketMedio > 0).length
    : 0;

  /* ── CRUD ── */
  function openAdd() {
    setForm({ nome: "", telefone: "", localizacao: "", tipo: "", observacoes: "" });
    setEditing(null);
    setModal("add");
  }

  function openEdit(c: Cliente) {
    setForm({ nome: c.nome, telefone: c.telefone, localizacao: c.localizacao, tipo: c.tipo, observacoes: c.observacoes });
    setEditing(c);
    setModal("edit");
  }

  function save() {
    if (!form.nome.trim() || !form.tipo) return;
    const cliente: Cliente = {
      id: editing?.id || Date.now(),
      nome: form.nome,
      telefone: form.telefone,
      localizacao: form.localizacao,
      tipo: form.tipo as ClienteTipo,
      observacoes: form.observacoes,
      status: editing?.status || "em_dia",
      ultimaCompra: editing?.ultimaCompra || new Date().toISOString().split("T")[0],
      frequencia: editing?.frequencia || 0,
      receitaMensal: editing?.receitaMensal || 0,
      ticketMedio: editing?.ticketMedio || 0,
      totalCompras: editing?.totalCompras || 0,
    };
    if (modal === "add") setClientes((prev) => [cliente, ...prev]);
    else if (editing) setClientes((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...cliente } : c)));
    setModal(null);
  }

  function deleteCliente(id: number) {
    setClientes((prev) => prev.filter((c) => c.id !== id));
    setDeleteConfirm(null);
    if (selectedCliente?.id === id) setSelectedCliente(null);
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

  function daysSince(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    const now = new Date("2024-04-17T00:00:00");
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  }

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
                    {c.telefone}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />
                    {c.localizacao}
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
            <p className="text-xs text-gray-400 mt-1 font-medium">Receita / Mês</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(c.ticketMedio)}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Ticket Médio</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{c.frequencia.toFixed(1)}x</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Frequência / Mês</p>
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
                  <span className="text-sm font-medium text-gray-900">{formatDate(c.ultimaCompra)}</span>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-md",
                    days <= 7 ? "text-emerald-700 bg-emerald-50" : days <= 21 ? "text-amber-700 bg-amber-50" : "text-red-600 bg-red-50"
                  )}>
                    {days === 0 ? "Hoje" : `${days}d atrás`}
                  </span>
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
                <span className="text-sm font-medium text-gray-900">{c.telefone}</span>
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
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-brand-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{totalClientes}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Total de Clientes</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{clientesEmDia}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Em Dia</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{clientesAtrasados}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Atrasados</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{clientesInadimplentes}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Inadimplentes</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(receitaTotal)}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Receita Mensal</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(ticketMedioGeral)}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Ticket Médio</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: "todos" as const, label: "Todos" },
            { key: "em_dia" as const, label: "Em Dia" },
            { key: "atrasado" as const, label: "Atrasados" },
            { key: "inadimplente" as const, label: "Inadimplentes" },
            { key: "inativo" as const, label: "Inativos" },
          ]).map((s) => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                filterStatus === s.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: "todos" as const, label: "Todos" },
            { key: "mercado" as const, label: "Mercado" },
            { key: "restaurante" as const, label: "Restaurante" },
            { key: "distribuidor" as const, label: "Distribuidor" },
            { key: "direto" as const, label: "Direto" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterTipo(t.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
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

        <div className="overflow-x-auto overflow-y-visible">
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
                        <p className="text-sm text-gray-600">{formatDate(c.ultimaCompra)}</p>
                        <p className={cn(
                          "text-xs font-medium",
                          days <= 7 ? "text-emerald-600" : days <= 21 ? "text-amber-600" : "text-red-500"
                        )}>
                          {days === 0 ? "Hoje" : `${days}d atrás`}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-medium text-gray-900">{c.frequencia > 0 ? `${c.frequencia.toFixed(1)}x` : "—"}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-gray-900">{c.receitaMensal > 0 ? formatCurrency(c.receitaMensal) : "—"}</td>
                    <td className="py-3 px-3 text-right font-medium text-gray-900">{c.ticketMedio > 0 ? formatCurrency(c.ticketMedio) : "—"}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        {deleteConfirm === c.id ? (
                          <>
                            <button onClick={() => deleteCliente(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Confirmar">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Cancelar">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setSelectedCliente(c)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer" title="Ver perfil">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer" title="Editar">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Excluir">
                              <Trash2 className="w-4 h-4" />
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
                {modal === "add" ? "Novo Cliente" : "Editar Cliente"}
              </h3>
              <button onClick={() => setModal(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nome</label>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all placeholder:text-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Telefone</label>
                  <input
                    type="text"
                    placeholder="(00) 0000-0000"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tipo de Cliente</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as ClienteTipo })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {tipoOptions.map((t) => <option key={t} value={t}>{tipoLabels[t]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Localização</label>
                <input
                  type="text"
                  placeholder="Cidade, Estado"
                  value={form.localizacao}
                  onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Observações</label>
                <textarea
                  placeholder="Notas sobre o cliente..."
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all placeholder:text-gray-400 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer">
                Cancelar
              </button>
              <button onClick={save} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors cursor-pointer shadow-sm">
                {modal === "add" ? "Cadastrar" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
