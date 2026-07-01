"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ModalPortal from "@/components/ui/modal-portal";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Search,
  X,
  Check,
  Warehouse,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Wheat,
  Pill,
  Box,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldAlert,
  Sparkles,
  Zap,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import {
  createInventoryItem,
  deleteInventoryItem,
  getFeedInventory,
  updateInventoryItem,
  type FeedInventoryCompatibilityRow,
} from "@/lib/services/inventory";

type TipoArmazenamento = "racao" | "medicamentos" | "equipamentos" | "embalagens" | "outros";
type StatusEstoque = "ativo" | "vazio" | "manutencao";

interface ItemEstoque {
  id: string;
  nome: string;
  localizacao: string;
  area: string;
  status: StatusEstoque;
  tipo: TipoArmazenamento;
  capacidade: string;
  ocupacaoAtual: number; // percentage 0-100
  observacoes: string;
  quantidade: number;
  unidade: string;
  valorEstoque: number;
  vencimento: string | null; // ISO date or null
  consumoDiario: number; // units per day
}

const tipoLabel: Record<TipoArmazenamento, string> = {
  racao: "Ração e Insumos",
  medicamentos: "Medicamentos",
  equipamentos: "Equipamentos",
  embalagens: "Embalagens",
  outros: "Outros",
};

const tipoColor: Record<TipoArmazenamento, string> = {
  racao: "text-amber-700 bg-amber-50",
  medicamentos: "text-red-700 bg-red-50",
  equipamentos: "text-blue-700 bg-blue-50",
  embalagens: "text-purple-700 bg-purple-50",
  outros: "text-gray-700 bg-gray-50",
};

const tipoIcons: Record<TipoArmazenamento, typeof Wheat> = {
  racao: Wheat,
  medicamentos: Pill,
  equipamentos: Wrench,
  embalagens: Box,
  outros: Package,
};

const statusLabel: Record<StatusEstoque, string> = {
  ativo: "Ativo",
  vazio: "Vazio",
  manutencao: "Manutenção",
};

const statusColor: Record<StatusEstoque, string> = {
  ativo: "text-emerald-700 bg-emerald-50",
  vazio: "text-gray-500 bg-gray-100",
  manutencao: "text-amber-700 bg-amber-50",
};

const tipoOptions: TipoArmazenamento[] = ["racao", "medicamentos", "equipamentos", "embalagens", "outros"];

type ModalMode = "add" | "edit" | null;

function mapFeedStatusToStorageStatus(status: FeedInventoryCompatibilityRow["status"], quantity: number): StatusEstoque {
  if (quantity <= 0) return "vazio";
  if (status === "baixo" || status === "alerta") return "manutencao";
  return "ativo";
}

function mapStorageStatusToFeedStatus(status: StatusEstoque): FeedInventoryCompatibilityRow["status"] {
  if (status === "manutencao") return "alerta";
  if (status === "vazio") return "baixo";
  return "normal";
}

const emptyForm = {
  nome: "",
  localizacao: "",
  area: "",
  status: "ativo" as StatusEstoque,
  tipo: "racao" as TipoArmazenamento,
  capacidade: "",
  ocupacaoAtual: "",
  observacoes: "",
  quantidade: "",
  unidade: "",
  valorEstoque: "",
  vencimento: "",
  consumoDiario: "",
};

export default function EstoquePage() {
  const { farm } = useAuth();
  const farmRef = useRef(farm);
  farmRef.current = farm;

  const [search, setSearch] = useState("");
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<ItemEstoque | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState<TipoArmazenamento | "todos">("todos");

  const fetchData = useCallback(async () => {
    const currentFarm = farmRef.current;
    if (!currentFarm) return;
    setLoading(true);

    try {
      const data = await getFeedInventory(currentFarm.id);
      const mapped: ItemEstoque[] = data.map((i) => ({
        id: i.id,
        nome: i.name || "",
        localizacao: i.location || "",
        area: i.feed_category || "",
        status: mapFeedStatusToStorageStatus(i.status, Number(i.quantity)),
        tipo: "racao",
        capacidade: "",
        ocupacaoAtual: i.minimum_quantity > 0 ? Math.min(100, Math.round((Number(i.quantity) / Number(i.minimum_quantity)) * 100)) : 0,
        observacoes: i.notes || "",
        quantidade: i.quantity || 0,
        unidade: i.unit || "",
        valorEstoque: i.total_cost || 0,
        vencimento: i.expiration_date || null,
        consumoDiario: 0,
      }));

      setEstoque(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openAdd() {
    setForm({ ...emptyForm });
    setEditing(null);
    setModal("add");
  }

  function openEdit(item: ItemEstoque) {
    setForm({
      nome: item.nome,
      localizacao: item.localizacao,
      area: item.area,
      status: item.status,
      tipo: item.tipo,
      capacidade: item.capacidade,
      ocupacaoAtual: String(item.ocupacaoAtual),
      observacoes: item.observacoes,
      quantidade: String(item.quantidade),
      unidade: item.unidade,
      valorEstoque: String(item.valorEstoque),
      vencimento: item.vencimento || "",
      consumoDiario: String(item.consumoDiario),
    });
    setEditing(item);
    setModal("edit");
  }

  async function save() {
    if (!form.nome.trim()) return;
    const currentFarm = farmRef.current;
    if (!currentFarm) return;

    const record = {
      farm_id: currentFarm.id,
      name: form.nome,
      location: form.localizacao,
      status: mapStorageStatusToFeedStatus(form.status),
      type: form.tipo,
      feed_category: form.area || null,
      notes: form.observacoes,
      quantity: Number(form.quantidade) || 0,
      unit: form.unidade,
      total_cost: Number(form.valorEstoque) || null,
      expiration_date: form.vencimento || null,
      minimum_quantity: Number(form.ocupacaoAtual) || 0,
    };

    try {
      if (modal === "add") {
        await createInventoryItem(record);
      } else if (editing) {
        await updateInventoryItem(editing.id, record);
      }
      setModal(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteItem(id: string) {
    try {
      await deleteInventoryItem(id);
      setDeleteConfirm(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  }

  const filtered = estoque.filter((i) => {
    const matchSearch = i.nome.toLowerCase().includes(search.toLowerCase()) || i.localizacao.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "todos" || i.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const totalAtivos = estoque.filter((i) => i.status === "ativo").length;
  const totalManutencao = estoque.filter((i) => i.status === "manutencao").length;
  const mediaOcupacao = estoque.length > 0 ? Math.round(estoque.reduce((s, i) => s + i.ocupacaoAtual, 0) / estoque.length) : 0;
  const valorTotal = estoque.reduce((s, i) => s + i.valorEstoque, 0);
  const today = new Date();

  function formatCurrency(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  function diasAteVencimento(d: string | null) {
    if (!d) return Infinity;
    return Math.ceil((new Date(d + "T00:00:00").getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  function diasDeEstoque(item: ItemEstoque) {
    if (item.consumoDiario <= 0) return Infinity;
    return Math.floor(item.quantidade / item.consumoDiario);
  }

  const itensComVencimento = estoque.filter((i) => i.vencimento).map((i) => ({ ...i, diasVenc: diasAteVencimento(i.vencimento) })).sort((a, b) => a.diasVenc - b.diasVenc);
  const vencimentoCritico = itensComVencimento.filter((i) => i.diasVenc <= 30);
  const estoquesCriticos = estoque.filter((i) => i.consumoDiario > 0 && diasDeEstoque(i) <= 14);
  const estoqueBaixo = estoque.filter((i) => i.ocupacaoAtual <= 25 && i.status === "ativo");
  const totalAlertas = vencimentoCritico.length + estoquesCriticos.length + totalManutencao;
  const perdaVencimento = vencimentoCritico.reduce((s, i) => s + i.valorEstoque, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Estoque</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gerencie seus espaços de armazenamento</p>
          </div>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20">
          <Plus className="w-4 h-4" />
          Novo Espaço
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {/* Valor Total */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Package className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Valor em Estoque</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{formatCurrency(valorTotal)}</p>
        </div>

        {/* Espaços Ativos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <Warehouse className="w-4.5 h-4.5 text-purple-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Espaços</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{totalAtivos}<span className="text-sm text-gray-400 font-medium">/{estoque.length}</span></p>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">Ativos</span>
          </div>
          <div className="mt-3 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-purple-500 transition-all duration-700" style={{ width: `${(totalAtivos / Math.max(estoque.length, 1)) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Ocupação Média */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Box className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ocupação</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{mediaOcupacao}%</p>
          <div className="mt-3 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700", mediaOcupacao > 80 ? "bg-red-500" : mediaOcupacao > 50 ? "bg-blue-500" : "bg-amber-500")} style={{ width: `${mediaOcupacao}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-gray-400 font-medium">{estoqueBaixo.length > 0 ? `${estoqueBaixo.length} abaixo de 25%` : "Todos acima de 25%"}</span>
          </div>
        </div>

        {/* Próximo Vencimento */}
        <div className={cn("rounded-2xl border p-5 hover:shadow-lg transition-all duration-300 cursor-pointer", vencimentoCritico.length > 0 ? "bg-gradient-to-br from-red-50/80 to-white border-red-200/60 hover:shadow-red-200/30" : "bg-white border-gray-100 hover:shadow-gray-200/50 hover:border-gray-200")}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", vencimentoCritico.length > 0 ? "bg-red-100" : "bg-amber-50")}>
              <CalendarDays className={cn("w-4.5 h-4.5", vencimentoCritico.length > 0 ? "text-red-500" : "text-amber-600")} />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Vencimento</span>
          </div>
          {itensComVencimento.length > 0 ? (
            <>
              <p className={cn("text-2xl font-bold tracking-tight leading-none", itensComVencimento[0].diasVenc <= 15 ? "text-red-600" : itensComVencimento[0].diasVenc <= 30 ? "text-amber-600" : "text-gray-900")}>{itensComVencimento[0].diasVenc}d</p>
              <p className="text-[10px] text-gray-400 font-medium mt-1 truncate">{itensComVencimento[0].nome}</p>
              {perdaVencimento > 0 && (
                <div className="mt-2 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-red-500" />
                  <span className="text-[10px] font-bold text-red-600">{formatCurrency(perdaVencimento)} em risco</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">—</p>
          )}
        </div>

        {/* Alertas */}
        <div className={cn("rounded-2xl border p-5 hover:shadow-lg transition-all duration-300 cursor-pointer", totalAlertas > 0 ? "bg-gradient-to-br from-amber-50/80 to-white border-amber-200/60 hover:shadow-amber-200/30" : "bg-white border-gray-100 hover:shadow-gray-200/50 hover:border-gray-200")}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", totalAlertas > 0 ? "bg-amber-100" : "bg-emerald-50")}>
              {totalAlertas > 0 ? <ShieldAlert className="w-4.5 h-4.5 text-amber-600" /> : <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />}
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Alertas</span>
          </div>
          <p className={cn("text-2xl font-bold tracking-tight leading-none", totalAlertas > 0 ? "text-amber-700" : "text-emerald-700")}>{totalAlertas}</p>
          <div className="mt-2 space-y-0.5">
            {perdaVencimento > 0 && <p className="text-[10px] text-red-600 font-bold">{formatCurrency(perdaVencimento)} em risco</p>}
            {vencimentoCritico.length > 0 && <p className="text-[10px] text-red-500 font-medium">{vencimentoCritico.length} vencendo em 30d</p>}
            {estoquesCriticos.length > 0 && <p className="text-[10px] text-amber-600 font-medium">{estoquesCriticos.length} estoque &lt;14 dias</p>}
            {totalManutencao > 0 && <p className="text-[10px] text-gray-500 font-medium">{totalManutencao} em manutenção</p>}
            {totalAlertas === 0 && <p className="text-[10px] text-emerald-600 font-medium">Tudo em ordem</p>}
          </div>
        </div>
      </div>

      {/* ── Riscos Críticos ── */}
      {(vencimentoCritico.length > 0 || estoquesCriticos.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Riscos Críticos</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Itens que requerem ação imediata</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vencimentoCritico.map((item) => (
              <div key={`venc-${item.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 border border-red-100">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.nome}</p>
                    <span className="text-[11px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-md flex-shrink-0">{formatCurrency(item.valorEstoque)}</span>
                  </div>
                  <p className="text-[11px] text-red-500 font-medium">Vence em {item.diasVenc} dias — {new Date(item.vencimento! + "T00:00:00").toLocaleDateString("pt-BR")} — Perda: {formatCurrency(item.valorEstoque)}</p>
                </div>
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0", item.diasVenc <= 7 ? "text-white bg-red-500" : "text-red-700 bg-red-100")}>{item.diasVenc}d</span>
              </div>
            ))}
            {estoquesCriticos.map((item) => {
              const dias = diasDeEstoque(item);
              return (
                <div key={`est-${item.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.nome}</p>
                    <p className="text-[11px] text-amber-600 font-medium">Estoque para {dias} dias — {item.quantidade.toLocaleString("pt-BR")} {item.unidade} restantes</p>
                  </div>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0", dias <= 7 ? "text-white bg-amber-500" : "text-amber-700 bg-amber-100")}>{dias}d</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto scrollbar-none">
          {([
            { key: "todos" as const, label: "Todos" },
            { key: "racao" as const, label: "Ração" },
            { key: "medicamentos" as const, label: "Medicamentos" },
            { key: "equipamentos" as const, label: "Equipamentos" },
            { key: "embalagens" as const, label: "Embalagens" },
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

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 w-full sm:w-72 sm:ml-auto focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Buscar espaço..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-16 text-gray-400 text-sm">Carregando dados...</div>
        ) : filtered.map((item) => {
          const TipoIcon = tipoIcons[item.tipo] || Box;
          const diasVenc = diasAteVencimento(item.vencimento);
          const diasEst = diasDeEstoque(item);
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.status === "ativo" && "bg-purple-50", item.status === "vazio" && "bg-gray-100", item.status === "manutencao" && "bg-amber-50")}>
                    <TipoIcon className={cn("w-5 h-5", item.status === "ativo" && "text-purple-600", item.status === "vazio" && "text-gray-400", item.status === "manutencao" && "text-amber-600")} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{item.nome}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{item.localizacao}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Value + Quantity */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 mt-1">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Valor</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(item.valorEstoque)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Qtd</p>
                  <p className="text-sm font-bold text-gray-900">{item.quantidade.toLocaleString("pt-BR")} <span className="text-[10px] text-gray-400 font-medium">{item.unidade}</span></p>
                </div>
              </div>

              {/* Occupancy bar */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Ocupação</span>
                  <span className="font-semibold text-gray-700">{item.ocupacaoAtual}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      item.ocupacaoAtual > 80 ? "bg-red-400" : item.ocupacaoAtual > 50 ? "bg-amber-400" : "bg-brand-500"
                    )}
                    style={{ width: item.ocupacaoAtual + "%" }}
                  />
                </div>
              </div>

              {/* Expiration + Days of stock */}
              <div className="mt-3 flex items-center gap-2">
                {item.vencimento && (
                  <div className={cn("flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg", diasVenc <= 15 ? "text-red-600 bg-red-50" : diasVenc <= 30 ? "text-amber-600 bg-amber-50" : "text-gray-500 bg-gray-50")}>
                    <CalendarDays className="w-3 h-3" />
                    {diasVenc}d p/ vencer
                  </div>
                )}
                {item.consumoDiario > 0 && (
                  <div className={cn("flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg", diasEst <= 7 ? "text-red-600 bg-red-50" : diasEst <= 14 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50")}>
                    <Clock className="w-3 h-3" />
                    {diasEst}d de estoque
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", statusColor[item.status] || statusColor.ativo)}>
                  {statusLabel[item.status] || "Ativo"}
                </span>
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", tipoColor[item.tipo] || tipoColor.racao)}>
                  {tipoLabel[item.tipo] || "Outro"}
                </span>
                <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {item.area || "—"}
                </span>
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400 text-sm">Nenhum espaço encontrado.</div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Novo Espaço de Armazenamento" : "Editar Espaço"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome</label>
                <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Depósito de Ração" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Localização</label>
                <input type="text" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Ex: Setor C, Lote 1" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Área</label>
                  <input type="text" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ex: 800 m²" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusEstoque })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="ativo">Ativo</option>
                    <option value="vazio">Vazio</option>
                    <option value="manutencao">Manutenção</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Capacidade</label>
                <input type="text" value={form.capacidade} onChange={(e) => setForm({ ...form, capacidade: e.target.value })} placeholder="Ex: 50 toneladas" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantidade</label>
                  <input type="number" min="0" step="0.01" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} placeholder="0" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unidade</label>
                  <select value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="kg">kg</option>
                    <option value="sc">sc</option>
                    <option value="un">un</option>
                    <option value="L">L</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Valor Total (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.valorEstoque} onChange={(e) => setForm({ ...form, valorEstoque: e.target.value })} placeholder="0,00" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Notas sobre o espaço..." rows={2} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={save} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors cursor-pointer shadow-sm">
                <Check className="w-4 h-4" />
                Salvar
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Confirmar exclusão</h3>
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir este espaço? Esta ação não pode ser desfeita.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={() => deleteItem(deleteConfirm)} className="px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
