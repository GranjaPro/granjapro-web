"use client";

import { useState } from "react";
import ModalPortal from "@/components/ui/modal-portal";
import {
  Wrench,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Search,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  Package,
  Cog,
  Zap,
  Droplets,
  Thermometer,
  Fan,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TipoEquipamento = "alimentacao" | "climatizacao" | "iluminacao" | "hidraulico" | "geral";
type StatusEquipamento = "operacional" | "manutencao" | "inativo";

interface Equipamento {
  id: number;
  nome: string;
  localizacao: string;
  tipo: TipoEquipamento;
  status: StatusEquipamento;
  marca: string;
  modelo: string;
  dataInstalacao: string;
  proximaManutencao: string;
  observacoes: string;
}

const tipoLabel: Record<TipoEquipamento, string> = {
  alimentacao: "Alimentação",
  climatizacao: "Climatização",
  iluminacao: "Iluminação",
  hidraulico: "Hidráulico",
  geral: "Geral",
};

const tipoColor: Record<TipoEquipamento, string> = {
  alimentacao: "text-amber-700 bg-amber-50",
  climatizacao: "text-blue-700 bg-blue-50",
  iluminacao: "text-yellow-700 bg-yellow-50",
  hidraulico: "text-cyan-700 bg-cyan-50",
  geral: "text-gray-700 bg-gray-100",
};

const tipoIcons: Record<TipoEquipamento, typeof Wrench> = {
  alimentacao: Cog,
  climatizacao: Fan,
  iluminacao: Zap,
  hidraulico: Droplets,
  geral: Wrench,
};

const statusLabel: Record<StatusEquipamento, string> = {
  operacional: "Operacional",
  manutencao: "Manutenção",
  inativo: "Inativo",
};

const statusColor: Record<StatusEquipamento, string> = {
  operacional: "text-emerald-700 bg-emerald-50",
  manutencao: "text-amber-700 bg-amber-50",
  inativo: "text-gray-500 bg-gray-100",
};

const initialEquipamentos: Equipamento[] = [
  { id: 1, nome: "Comedouro Automático", localizacao: "Galpão Vale Verde", tipo: "alimentacao", status: "operacional", marca: "AviTech", modelo: "CA-500", dataInstalacao: "2024-03-15", proximaManutencao: "2026-06-15", observacoes: "Sistema automático com sensor de nível." },
  { id: 2, nome: "Ventilador Industrial", localizacao: "Galpão Central", tipo: "climatizacao", status: "operacional", marca: "CoolFarm", modelo: "VF-1200", dataInstalacao: "2023-11-20", proximaManutencao: "2026-05-20", observacoes: "4 unidades instaladas. Funcionamento 24h no verão." },
  { id: 3, nome: "Sistema de Iluminação LED", localizacao: "Galpão Nascente", tipo: "iluminacao", status: "manutencao", marca: "LuxAviar", modelo: "LED-PRO", dataInstalacao: "2024-07-10", proximaManutencao: "2026-04-10", observacoes: "Troca de lâmpadas programada." },
  { id: 4, nome: "Bebedouro Nipple", localizacao: "Galpão Vale Verde", tipo: "hidraulico", status: "operacional", marca: "HydroFarm", modelo: "NP-300", dataInstalacao: "2024-01-05", proximaManutencao: "2026-07-05", observacoes: "Linha principal com 200 bicos." },
  { id: 5, nome: "Gerador de Emergência", localizacao: "Setor C", tipo: "geral", status: "inativo", marca: "PowerGen", modelo: "PG-50KVA", dataInstalacao: "2022-06-01", proximaManutencao: "2026-04-01", observacoes: "Necessita revisão completa antes de reativar." },
];

const tipoOptions: TipoEquipamento[] = ["alimentacao", "climatizacao", "iluminacao", "hidraulico", "geral"];

type ModalMode = "add" | "edit" | null;

const emptyForm = {
  nome: "",
  localizacao: "",
  tipo: "geral" as TipoEquipamento,
  status: "operacional" as StatusEquipamento,
  marca: "",
  modelo: "",
  dataInstalacao: "",
  proximaManutencao: "",
  observacoes: "",
};

export default function EquipamentosPage() {
  const [search, setSearch] = useState("");
  const [equipamentos, setEquipamentos] = useState(initialEquipamentos);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Equipamento | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [filterTipo, setFilterTipo] = useState<TipoEquipamento | "todos">("todos");

  function openAdd() {
    setForm({ ...emptyForm });
    setEditing(null);
    setModal("add");
  }

  function openEdit(item: Equipamento) {
    setForm({
      nome: item.nome,
      localizacao: item.localizacao,
      tipo: item.tipo,
      status: item.status,
      marca: item.marca,
      modelo: item.modelo,
      dataInstalacao: item.dataInstalacao,
      proximaManutencao: item.proximaManutencao,
      observacoes: item.observacoes,
    });
    setEditing(item);
    setModal("edit");
  }

  function save() {
    if (!form.nome.trim()) return;
    const item: Equipamento = {
      id: editing?.id || Date.now(),
      nome: form.nome,
      localizacao: form.localizacao,
      tipo: form.tipo,
      status: form.status,
      marca: form.marca,
      modelo: form.modelo,
      dataInstalacao: form.dataInstalacao,
      proximaManutencao: form.proximaManutencao,
      observacoes: form.observacoes,
    };
    if (modal === "add") setEquipamentos((prev) => [...prev, item]);
    else if (editing) setEquipamentos((prev) => prev.map((i) => (i.id === editing.id ? item : i)));
    setModal(null);
  }

  function deleteItem(id: number) {
    setEquipamentos((prev) => prev.filter((i) => i.id !== id));
    setDeleteConfirm(null);
  }

  const filtered = equipamentos.filter((i) => {
    const matchSearch = i.nome.toLowerCase().includes(search.toLowerCase()) || i.localizacao.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "todos" || i.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const totalOperacional = equipamentos.filter((i) => i.status === "operacional").length;
  const totalManutencao = equipamentos.filter((i) => i.status === "manutencao").length;
  const totalInativo = equipamentos.filter((i) => i.status === "inativo").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Equipamentos</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gerencie os equipamentos da sua granja</p>
          </div>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20">
          <Plus className="w-4 h-4" />
          Novo Equipamento
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{equipamentos.length}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Total de Equipamentos</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{totalOperacional}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Operacionais</p>
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
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-gray-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{totalInativo}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Inativos</p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: "todos" as const, label: "Todos" },
            { key: "alimentacao" as const, label: "Alimentação" },
            { key: "climatizacao" as const, label: "Climatização" },
            { key: "iluminacao" as const, label: "Iluminação" },
            { key: "hidraulico" as const, label: "Hidráulico" },
            { key: "geral" as const, label: "Geral" },
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
          <input type="text" placeholder="Buscar equipamento..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full" />
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
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.status === "operacional" && "bg-blue-50", item.status === "manutencao" && "bg-amber-50", item.status === "inativo" && "bg-gray-100")}>
                    <TipoIcon className={cn("w-5 h-5", item.status === "operacional" && "text-blue-600", item.status === "manutencao" && "text-amber-600", item.status === "inativo" && "text-gray-400")} />
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
                  <span className="text-gray-500">Marca / Modelo</span>
                  <span className="font-semibold text-gray-700">{item.marca} {item.modelo}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Instalação</span>
                  <span className="font-semibold text-gray-700">{item.dataInstalacao ? new Date(item.dataInstalacao).toLocaleDateString("pt-BR") : "—"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Próx. Manutenção</span>
                  <span className="font-semibold text-gray-700">{item.proximaManutencao ? new Date(item.proximaManutencao).toLocaleDateString("pt-BR") : "—"}</span>
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
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400 text-sm">Nenhum equipamento encontrado.</div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Novo Equipamento" : "Editar Equipamento"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome</label>
                <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Comedouro Automático" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Localização</label>
                <input type="text" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Ex: Galpão Vale Verde" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoEquipamento })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    {tipoOptions.map((t) => <option key={t} value={t}>{tipoLabel[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusEquipamento })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="operacional">Operacional</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Marca</label>
                  <input type="text" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Ex: AviTech" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Modelo</label>
                  <input type="text" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="Ex: CA-500" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data de Instalação</label>
                  <input type="date" value={form.dataInstalacao} onChange={(e) => setForm({ ...form, dataInstalacao: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Próxima Manutenção</label>
                  <input type="date" value={form.proximaManutencao} onChange={(e) => setForm({ ...form, proximaManutencao: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Notas sobre o equipamento..." rows={2} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all resize-none" />
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
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir este equipamento? Esta ação não pode ser desfeita.</p>
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
