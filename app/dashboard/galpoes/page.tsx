"use client";

import { useState } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Search,
  X,
  Check,
  Fence,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Finalidade = "avicultura" | "armazenamento";
type SistemaAvicola = "gaiola" | "caipira" | "organico";
type StatusGalpao = "ativo" | "vazio" | "manutencao";

interface Galpao {
  id: number;
  nome: string;
  localizacao: string;
  finalidade: Finalidade;
  area: string;
  status: StatusGalpao;
  /* Campos de avicultura */
  capacidade: number;
  aves: number;
  sistema: SistemaAvicola;
  /* Campos de armazenamento */
  tipoArmazenamento: string;
  capacidadeArmazenamento: string;
}

const initialGalpoes: Galpao[] = [
  {
    id: 1,
    nome: "Galpão Vale Verde",
    localizacao: "Setor A, Lote 1",
    finalidade: "avicultura",
    area: "1.200 m²",
    status: "ativo",
    capacidade: 5000,
    aves: 4850,
    sistema: "gaiola",
    tipoArmazenamento: "",
    capacidadeArmazenamento: "",
  },
  {
    id: 2,
    nome: "Galpão Nascente",
    localizacao: "Setor B, Lote 3",
    finalidade: "avicultura",
    area: "2.500 m²",
    status: "vazio",
    capacidade: 3000,
    aves: 0,
    sistema: "organico",
    tipoArmazenamento: "",
    capacidadeArmazenamento: "",
  },
  {
    id: 3,
    nome: "Galpão Central",
    localizacao: "Setor A, Lote 2",
    finalidade: "avicultura",
    area: "3.000 m²",
    status: "ativo",
    capacidade: 6000,
    aves: 5800,
    sistema: "caipira",
    tipoArmazenamento: "",
    capacidadeArmazenamento: "",
  },
  {
    id: 4,
    nome: "Galpão de Ração",
    localizacao: "Setor C, Lote 1",
    finalidade: "armazenamento",
    area: "800 m²",
    status: "ativo",
    capacidade: 0,
    aves: 0,
    sistema: "gaiola",
    tipoArmazenamento: "Ração e Insumos",
    capacidadeArmazenamento: "50 toneladas",
  },
  {
    id: 5,
    nome: "Galpão de Equipamentos",
    localizacao: "Setor C, Lote 2",
    finalidade: "armazenamento",
    area: "600 m²",
    status: "manutencao",
    capacidade: 0,
    aves: 0,
    sistema: "gaiola",
    tipoArmazenamento: "Equipamentos",
    capacidadeArmazenamento: "200 m³",
  },
];

const sistemaLabel: Record<SistemaAvicola, string> = {
  gaiola: "Gaiola",
  caipira: "Caipira",
  organico: "Orgânico",
};

const sistemaColor: Record<SistemaAvicola, string> = {
  gaiola: "text-blue-700 bg-blue-50",
  caipira: "text-orange-700 bg-orange-50",
  organico: "text-green-700 bg-green-50",
};

const statusLabel: Record<StatusGalpao, string> = {
  ativo: "Ativo",
  vazio: "Vazio",
  manutencao: "Manutenção",
};

const statusColor: Record<StatusGalpao, string> = {
  ativo: "text-emerald-700 bg-emerald-50",
  vazio: "text-gray-500 bg-gray-100",
  manutencao: "text-amber-700 bg-amber-50",
};

type ModalMode = "add" | "edit" | null;

const emptyForm = {
  nome: "",
  localizacao: "",
  finalidade: "avicultura" as Finalidade,
  area: "",
  status: "ativo" as StatusGalpao,
  capacidade: "",
  aves: "",
  sistema: "gaiola" as SistemaAvicola,
  tipoArmazenamento: "Ração e Insumos",
  capacidadeArmazenamento: "",
};

export default function GalpoesPage() {
  const [tab, setTab] = useState<Finalidade>("avicultura");
  const [search, setSearch] = useState("");
  const [galpoes, setGalpoes] = useState(initialGalpoes);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Galpao | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  function openAdd() {
    setForm({ ...emptyForm, finalidade: tab });
    setEditing(null);
    setModal("add");
  }

  function openEdit(g: Galpao) {
    setForm({
      nome: g.nome,
      localizacao: g.localizacao,
      finalidade: g.finalidade,
      area: g.area,
      status: g.status,
      capacidade: g.finalidade === "avicultura" ? String(g.capacidade) : "",
      aves: g.finalidade === "avicultura" ? String(g.aves) : "",
      sistema: g.sistema,
      tipoArmazenamento: g.tipoArmazenamento,
      capacidadeArmazenamento: g.capacidadeArmazenamento,
    });
    setEditing(g);
    setModal("edit");
  }

  function save() {
    if (!form.nome.trim()) return;
    const galpao: Galpao = {
      id: editing?.id || Date.now(),
      nome: form.nome,
      localizacao: form.localizacao,
      finalidade: form.finalidade,
      area: form.area,
      status: form.status,
      capacidade: form.finalidade === "avicultura" ? Number(form.capacidade) || 0 : 0,
      aves: form.finalidade === "avicultura" ? Number(form.aves) || 0 : 0,
      sistema: form.sistema,
      tipoArmazenamento: form.finalidade === "armazenamento" ? form.tipoArmazenamento : "",
      capacidadeArmazenamento: form.finalidade === "armazenamento" ? form.capacidadeArmazenamento : "",
    };
    if (modal === "add") {
      setGalpoes((prev) => [...prev, galpao]);
    } else if (editing) {
      setGalpoes((prev) => prev.map((g) => (g.id === editing.id ? galpao : g)));
    }
    setModal(null);
  }

  function deleteGalpao(id: number) {
    setGalpoes((prev) => prev.filter((g) => g.id !== id));
    setDeleteConfirm(null);
  }

  const filtered = galpoes.filter(
    (g) =>
      g.finalidade === tab &&
      (g.nome.toLowerCase().includes(search.toLowerCase()) ||
      g.localizacao.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Galpões</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gerencie seus galpões de avicultura e armazenamento</p>
          </div>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm">
          <Plus className="w-4 h-4" />
          Adicionar Galpão
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("avicultura")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer",
              tab === "avicultura" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Fence className="w-4 h-4" />
            Avicultura
          </button>
          <button
            onClick={() => setTab("armazenamento")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer",
              tab === "armazenamento" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Package className="w-4 h-4" />
            Armazenamento
          </button>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 w-full sm:w-72 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Buscar galpão..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((g) => {
          const isAvi = g.finalidade === "avicultura";
          const ocupacao = isAvi && g.capacidade > 0 ? Math.round((g.aves / g.capacidade) * 100) : 0;
          return (
            <div key={g.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", g.status === "ativo" && "bg-brand-50", g.status === "vazio" && "bg-gray-100", g.status === "manutencao" && "bg-amber-50")}>
                    {isAvi ? (
                      <Fence className={cn("w-5 h-5", g.status === "ativo" && "text-brand-600", g.status === "vazio" && "text-gray-400", g.status === "manutencao" && "text-amber-600")} />
                    ) : (
                      <Package className={cn("w-5 h-5", g.status === "ativo" && "text-brand-600", g.status === "vazio" && "text-gray-400", g.status === "manutencao" && "text-amber-600")} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{g.nome}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{g.localizacao}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteConfirm(g.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Avicultura: occupation bar */}
              {isAvi && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Ocupação</span>
                    <span className="font-semibold text-gray-700">{g.aves.toLocaleString("pt-BR")} / {g.capacidade.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div className={cn("h-1.5 rounded-full transition-all", g.status === "ativo" && "bg-brand-500", g.status === "vazio" && "bg-gray-300", g.status === "manutencao" && "bg-amber-400")} style={{ width: ocupacao + "%" }} />
                  </div>
                </div>
              )}

              {/* Armazenamento: info */}
              {!isAvi && (
                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Tipo</span>
                    <span className="font-semibold text-gray-700">{g.tipoArmazenamento}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Capacidade</span>
                    <span className="font-semibold text-gray-700">{g.capacidadeArmazenamento}</span>
                  </div>
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", statusColor[g.status])}>
                  {statusLabel[g.status]}
                </span>
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", isAvi ? "text-brand-700 bg-brand-50" : "text-purple-700 bg-purple-50")}>
                  {isAvi ? "Avicultura" : "Armazenamento"}
                </span>
                {isAvi && (
                  <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", sistemaColor[g.sistema])}>
                    {sistemaLabel[g.sistema]}
                  </span>
                )}
                <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {g.area}
                </span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400 text-sm">Nenhum galpão encontrado.</div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Novo Galpão" : "Editar Galpão"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome</label>
                <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Galpão Norte" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Localização</label>
                <input type="text" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Ex: Setor A, Lote 1" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Área total</label>
                  <input type="text" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ex: 1.200 m²" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusGalpao })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="ativo">Ativo</option>
                    <option value="vazio">Vazio</option>
                    <option value="manutencao">Manutenção</option>
                  </select>
                </div>
              </div>

              {/* Finalidade toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Finalidade</label>
                <div className="flex bg-gray-100 rounded-xl p-1 w-full">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, finalidade: "avicultura" })}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer",
                      form.finalidade === "avicultura"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <Fence className="w-4 h-4" />
                    Avicultura
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, finalidade: "armazenamento" })}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer",
                      form.finalidade === "armazenamento"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <Package className="w-4 h-4" />
                    Armazenamento
                  </button>
                </div>
              </div>

              {/* Avicultura fields */}
              {form.finalidade === "avicultura" && (
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Capacidade</label>
                      <input type="number" value={form.capacidade} onChange={(e) => setForm({ ...form, capacidade: e.target.value })} placeholder="5000" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Aves atuais</label>
                      <input type="number" value={form.aves} onChange={(e) => setForm({ ...form, aves: e.target.value })} placeholder="4850" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sistema</label>
                    <select value={form.sistema} onChange={(e) => setForm({ ...form, sistema: e.target.value as SistemaAvicola })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                      <option value="gaiola">Gaiola</option>
                      <option value="caipira">Caipira</option>
                      <option value="organico">Orgânico</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Armazenamento fields */}
              {form.finalidade === "armazenamento" && (
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Armazenamento</label>
                    <select value={form.tipoArmazenamento} onChange={(e) => setForm({ ...form, tipoArmazenamento: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                      <option>Ração e Insumos</option>
                      <option>Medicamentos</option>
                      <option>Equipamentos</option>
                      <option>Embalagens e Comercialização</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Capacidade de Armazenamento</label>
                    <input type="text" value={form.capacidadeArmazenamento} onChange={(e) => setForm({ ...form, capacidadeArmazenamento: e.target.value })} placeholder="Ex: 50 toneladas" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                  </div>
                </div>
              )}
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
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir este galpão? Esta ação não pode ser desfeita.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={() => deleteGalpao(deleteConfirm)} className="px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
