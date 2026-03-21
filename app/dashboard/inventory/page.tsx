"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

type TipoArmazenamento = "racao" | "medicamentos" | "equipamentos" | "embalagens";
type StatusEstoque = "ativo" | "vazio" | "manutencao";

interface ItemEstoque {
  id: number;
  nome: string;
  localizacao: string;
  area: string;
  status: StatusEstoque;
  tipo: TipoArmazenamento;
  capacidade: string;
  ocupacaoAtual: number; // percentage 0-100
  observacoes: string;
}

const tipoLabel: Record<TipoArmazenamento, string> = {
  racao: "Ração e Insumos",
  medicamentos: "Medicamentos",
  equipamentos: "Equipamentos",
  embalagens: "Embalagens",
};

const tipoColor: Record<TipoArmazenamento, string> = {
  racao: "text-amber-700 bg-amber-50",
  medicamentos: "text-red-700 bg-red-50",
  equipamentos: "text-blue-700 bg-blue-50",
  embalagens: "text-purple-700 bg-purple-50",
};

const tipoIcons: Record<TipoArmazenamento, typeof Wheat> = {
  racao: Wheat,
  medicamentos: Pill,
  equipamentos: Wrench,
  embalagens: Box,
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

const initialEstoque: ItemEstoque[] = [
  { id: 1, nome: "Galpão de Ração", localizacao: "Setor C, Lote 1", area: "800 m²", status: "ativo", tipo: "racao", capacidade: "50 toneladas", ocupacaoAtual: 72, observacoes: "Estoque principal de ração. Reposição semanal." },
  { id: 2, nome: "Galpão de Equipamentos", localizacao: "Setor C, Lote 2", area: "600 m²", status: "manutencao", tipo: "equipamentos", capacidade: "200 m³", ocupacaoAtual: 45, observacoes: "Em manutenção — reforma do telhado prevista para maio." },
  { id: 3, nome: "Depósito de Medicamentos", localizacao: "Setor A, Lote 4", area: "120 m²", status: "ativo", tipo: "medicamentos", capacidade: "500 itens", ocupacaoAtual: 38, observacoes: "Ambiente climatizado. Controle de temperatura ativo." },
  { id: 4, nome: "Sala de Embalagens", localizacao: "Setor B, Lote 5", area: "250 m²", status: "ativo", tipo: "embalagens", capacidade: "10.000 unidades", ocupacaoAtual: 85, observacoes: "Estoque alto — próxima compra pode ser adiada." },
];

const tipoOptions: TipoArmazenamento[] = ["racao", "medicamentos", "equipamentos", "embalagens"];

type ModalMode = "add" | "edit" | null;

const emptyForm = {
  nome: "",
  localizacao: "",
  area: "",
  status: "ativo" as StatusEstoque,
  tipo: "racao" as TipoArmazenamento,
  capacidade: "",
  ocupacaoAtual: "",
  observacoes: "",
};

export default function EstoquePage() {
  const [search, setSearch] = useState("");
  const [estoque, setEstoque] = useState(initialEstoque);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<ItemEstoque | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [filterTipo, setFilterTipo] = useState<TipoArmazenamento | "todos">("todos");

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
    });
    setEditing(item);
    setModal("edit");
  }

  function save() {
    if (!form.nome.trim()) return;
    const item: ItemEstoque = {
      id: editing?.id || Date.now(),
      nome: form.nome,
      localizacao: form.localizacao,
      area: form.area,
      status: form.status,
      tipo: form.tipo,
      capacidade: form.capacidade,
      ocupacaoAtual: Number(form.ocupacaoAtual) || 0,
      observacoes: form.observacoes,
    };
    if (modal === "add") setEstoque((prev) => [...prev, item]);
    else if (editing) setEstoque((prev) => prev.map((i) => (i.id === editing.id ? item : i)));
    setModal(null);
  }

  function deleteItem(id: number) {
    setEstoque((prev) => prev.filter((i) => i.id !== id));
    setDeleteConfirm(null);
  }

  const filtered = estoque.filter((i) => {
    const matchSearch = i.nome.toLowerCase().includes(search.toLowerCase()) || i.localizacao.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "todos" || i.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const totalAtivos = estoque.filter((i) => i.status === "ativo").length;
  const totalManutencao = estoque.filter((i) => i.status === "manutencao").length;
  const mediaOcupacao = estoque.length > 0 ? Math.round(estoque.reduce((s, i) => s + i.ocupacaoAtual, 0) / estoque.length) : 0;

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{estoque.length}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Total de Espaços</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{totalAtivos}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Ativos</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{totalManutencao}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Em Manutenção</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{mediaOcupacao}%</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Ocupação Média</p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
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
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
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
        {filtered.map((item) => {
          const TipoIcon = tipoIcons[item.tipo];
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

              {/* Info */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Capacidade</span>
                  <span className="font-semibold text-gray-700">{item.capacidade}</span>
                </div>
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

              {item.observacoes && (
                <p className="text-xs text-gray-400 mt-3 line-clamp-2">{item.observacoes}</p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", statusColor[item.status])}>
                  {statusLabel[item.status]}
                </span>
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", tipoColor[item.tipo])}>
                  {tipoLabel[item.tipo]}
                </span>
                <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {item.area}
                </span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400 text-sm">Nenhum espaço encontrado.</div>
        )}
      </div>

      {/* Modal */}
      {modal && (
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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Armazenamento</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoArmazenamento })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                  {tipoOptions.map((t) => <option key={t} value={t}>{tipoLabel[t]}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Capacidade</label>
                  <input type="text" value={form.capacidade} onChange={(e) => setForm({ ...form, capacidade: e.target.value })} placeholder="Ex: 50 toneladas" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ocupação Atual (%)</label>
                  <input type="number" min="0" max="100" value={form.ocupacaoAtual} onChange={(e) => setForm({ ...form, ocupacaoAtual: e.target.value })} placeholder="72" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
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
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
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
      )}
    </div>
  );
}
