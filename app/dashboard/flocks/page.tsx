"use client";

import { useState } from "react";
import { Layers, Plus, Pencil, Trash2, X, Check, Search, FileText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import ModalPortal from "@/components/ui/modal-portal";

type Status = "ativo" | "crescimento" | "declinio" | "descartado";
type Sistema = "gaiola" | "caipira" | "organico" | "free-range" | "cage-free";

interface Lote {
  id: number;
  codigo: string;
  raca: string;
  aves: number;
  idade: string;
  postura: string;
  sistema: Sistema;
  status: Status;
  fornecedor: string;
  fornecedorContato: string;
  dataChegada: string;
  origem: string;
  linhagem: string;
  pesoMedio: string;
  galpao: string;
}

const initialLotes: Lote[] = [
  { id: 1, codigo: "L-2024-01", raca: "Hy-Line Brown", aves: 800, idade: "42 semanas", postura: "92%", sistema: "cage-free", status: "ativo", fornecedor: "Avícola São Paulo Ltda.", fornecedorContato: "(11) 99876-5432", dataChegada: "2023-06-15", origem: "Campinas, SP", linhagem: "Hy-Line International", pesoMedio: "1,85 kg", galpao: "Galpão Vale Verde" },
  { id: 2, codigo: "L-2024-02", raca: "Lohmann LSL", aves: 600, idade: "28 semanas", postura: "88%", sistema: "free-range", status: "ativo", fornecedor: "Granja Lohmann Brasil", fornecedorContato: "(41) 98765-4321", dataChegada: "2023-09-20", origem: "Curitiba, PR", linhagem: "Lohmann Tierzucht", pesoMedio: "1,72 kg", galpao: "Galpão Nascente" },
  { id: 3, codigo: "L-2024-03", raca: "ISA Brown", aves: 1000, idade: "18 semanas", postura: "—", sistema: "gaiola", status: "crescimento", fornecedor: "ISA Poultry Brasil", fornecedorContato: "(19) 97654-3210", dataChegada: "2023-11-10", origem: "Jundiaí, SP", linhagem: "Hendrix Genetics", pesoMedio: "1,45 kg", galpao: "Galpão Central" },
  { id: 4, codigo: "L-2024-04", raca: "Novogen Brown", aves: 500, idade: "60 semanas", postura: "78%", sistema: "organico", status: "declinio", fornecedor: "Novogen do Brasil", fornecedorContato: "(31) 96543-2109", dataChegada: "2023-03-05", origem: "Belo Horizonte, MG", linhagem: "Novogen SAS", pesoMedio: "2,10 kg", galpao: "Galpão Central" },
];

const sistemaLabel: Record<Sistema, string> = {
  gaiola: "Gaiola",
  caipira: "Caipira",
  organico: "Orgânico",
  "free-range": "Free Range",
  "cage-free": "Cage-Free",
};

const sistemaColor: Record<Sistema, string> = {
  gaiola: "text-amber-800 bg-amber-100",
  caipira: "text-orange-800 bg-orange-100",
  organico: "text-green-800 bg-green-100",
  "free-range": "text-emerald-800 bg-emerald-100",
  "cage-free": "text-teal-800 bg-teal-100",
};

const statusLabel: Record<Status, string> = {
  ativo: "Ativo",
  crescimento: "Crescimento",
  declinio: "Declínio",
  descartado: "Descartado",
};

const statusColor: Record<Status, string> = {
  ativo: "text-white bg-brand-600",
  crescimento: "text-amber-800 bg-amber-300",
  declinio: "text-gray-700 bg-gray-200 border border-gray-300",
  descartado: "text-red-700 bg-red-100",
};

type ModalMode = "add" | "edit" | null;

const emptyForm = {
  codigo: "",
  raca: "",
  aves: "",
  idade: "",
  postura: "",
  sistema: "gaiola" as Sistema,
  status: "ativo" as Status,
  fornecedor: "",
  fornecedorContato: "",
  dataChegada: "",
  origem: "",
  linhagem: "",
  pesoMedio: "",
  galpao: "",
};

export default function LotesPage() {
  const [lotes, setLotes] = useState(initialLotes);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Lote | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  function openAdd() {
    setForm({ ...emptyForm });
    setEditing(null);
    setModal("add");
  }

  function openEdit(l: Lote) {
    setForm({
      codigo: l.codigo,
      raca: l.raca,
      aves: String(l.aves),
      idade: l.idade,
      postura: l.postura,
      sistema: l.sistema,
      status: l.status,
      fornecedor: l.fornecedor,
      fornecedorContato: l.fornecedorContato,
      dataChegada: l.dataChegada,
      origem: l.origem,
      linhagem: l.linhagem,
      pesoMedio: l.pesoMedio,
      galpao: l.galpao,
    });
    setEditing(l);
    setModal("edit");
  }

  function save() {
    if (!form.codigo.trim() || !form.raca.trim()) return;
    const lote: Lote = {
      id: editing?.id || Date.now(),
      codigo: form.codigo,
      raca: form.raca,
      aves: Number(form.aves) || 0,
      idade: form.idade,
      postura: form.postura,
      sistema: form.sistema,
      status: form.status,
      fornecedor: form.fornecedor,
      fornecedorContato: form.fornecedorContato,
      dataChegada: form.dataChegada,
      origem: form.origem,
      linhagem: form.linhagem,
      pesoMedio: form.pesoMedio,
      galpao: form.galpao,
    };
    if (modal === "add") {
      setLotes((prev) => [...prev, lote]);
    } else if (editing) {
      setLotes((prev) => prev.map((l) => (l.id === editing.id ? lote : l)));
    }
    setModal(null);
  }

  function deleteLote(id: number) {
    setLotes((prev) => prev.filter((l) => l.id !== id));
    setDeleteConfirm(null);
  }

  const filtered = lotes.filter(
    (l) =>
      l.codigo.toLowerCase().includes(search.toLowerCase()) ||
      l.raca.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
            <Layers className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestão de Lotes</h1>
            <p className="text-sm text-gray-500 mt-0.5">Acompanhe e gerencie seus lotes de aves</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Lote
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 w-full sm:w-80 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input type="text" placeholder="Buscar lote ou raça..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Código do Lote</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Raça</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Aves</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Idade</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Postura %</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Sistema</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Status</th>
                <th className="text-center text-xs font-bold text-gray-900 px-6 py-4">Detalhes</th>
                <th className="text-right text-xs font-bold text-gray-900 px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{l.codigo}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{l.raca}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{l.aves.toLocaleString("pt-BR")}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{l.idade}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{l.postura}</td>
                  <td className="px-6 py-4">
                    <span className={cn("text-[11px] font-semibold px-3 py-1 rounded-full", sistemaColor[l.sistema])}>
                      {sistemaLabel[l.sistema]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("text-[11px] font-semibold px-3 py-1 rounded-full", statusColor[l.status])}>
                      {statusLabel[l.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link href={"/dashboard/flocks/detalhes/" + l.id} className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                      <FileText className="w-4 h-4" />
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(l.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400 text-sm">Nenhum lote encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Novo Lote" : "Editar Lote"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Informações Básicas */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informações do Lote</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Código do Lote</label>
                      <input type="text" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Ex: L-2024-05" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Raça</label>
                      <input type="text" value={form.raca} onChange={(e) => setForm({ ...form, raca: e.target.value })} placeholder="Ex: Hy-Line Brown" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Linhagem</label>
                      <input type="text" value={form.linhagem} onChange={(e) => setForm({ ...form, linhagem: e.target.value })} placeholder="Ex: Hy-Line International" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Galpão</label>
                      <input type="text" value={form.galpao} onChange={(e) => setForm({ ...form, galpao: e.target.value })} placeholder="Ex: Galpão Vale Verde" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Aves</label>
                      <input type="number" value={form.aves} onChange={(e) => setForm({ ...form, aves: e.target.value })} placeholder="800" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Idade</label>
                      <input type="text" value={form.idade} onChange={(e) => setForm({ ...form, idade: e.target.value })} placeholder="42 semanas" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Peso Médio</label>
                      <input type="text" value={form.pesoMedio} onChange={(e) => setForm({ ...form, pesoMedio: e.target.value })} placeholder="1,85 kg" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Postura %</label>
                      <input type="text" value={form.postura} onChange={(e) => setForm({ ...form, postura: e.target.value })} placeholder="92%" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sistema</label>
                      <select value={form.sistema} onChange={(e) => setForm({ ...form, sistema: e.target.value as Sistema })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                        <option value="gaiola">Gaiola</option>
                        <option value="caipira">Caipira</option>
                        <option value="organico">Orgânico</option>
                        <option value="free-range">Free Range</option>
                        <option value="cage-free">Cage-Free</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                        <option value="ativo">Ativo</option>
                        <option value="crescimento">Crescimento</option>
                        <option value="declinio">Declínio</option>
                        <option value="descartado">Descartado</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Fornecedor e Origem */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Fornecedor e Origem</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fornecedor</label>
                      <input type="text" value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} placeholder="Ex: Avícola São Paulo Ltda." className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contato do Fornecedor</label>
                      <input type="text" value={form.fornecedorContato} onChange={(e) => setForm({ ...form, fornecedorContato: e.target.value })} placeholder="(11) 99876-5432" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Origem</label>
                      <input type="text" value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} placeholder="Ex: Campinas, SP" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data de Chegada</label>
                      <input type="date" value={form.dataChegada} onChange={(e) => setForm({ ...form, dataChegada: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                  </div>
                </div>
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
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={() => deleteLote(deleteConfirm)} className="px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
