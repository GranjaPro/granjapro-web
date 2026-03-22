"use client";

import { useState, useEffect, useCallback } from "react";
import { Layers, Plus, Pencil, Trash2, X, Check, Search, FileText, Loader2, Bird } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import ModalPortal from "@/components/ui/modal-portal";

type Status = "active" | "growing" | "declining" | "disposed";
type Sistema = "Convencional" | "Cage-Free" | "Free Range" | "Caipira" | "Orgânico";

interface Lote {
  id: string;
  code: string;
  breed: string;
  bird_count: number;
  age_weeks: number;
  production_system: string;
  status: Status;
  supplier: string | null;
  supplier_contact: string | null;
  arrival_date: string;
  origin: string | null;
  lineage: string | null;
  avg_weight_kg: number | null;
  barn_id: string | null;
  barn_name: string | null;
}

interface Barn {
  id: string;
  name: string;
}

const sistemaLabel: Record<string, string> = {
  "Convencional": "Convencional",
  "Cage-Free": "Cage-Free",
  "Free Range": "Free Range",
  "Caipira": "Caipira",
  "Orgânico": "Orgânico",
};

const sistemaColor: Record<string, string> = {
  "Convencional": "text-amber-800 bg-amber-100",
  "Cage-Free": "text-teal-800 bg-teal-100",
  "Free Range": "text-emerald-800 bg-emerald-100",
  "Caipira": "text-orange-800 bg-orange-100",
  "Orgânico": "text-green-800 bg-green-100",
};

const statusLabel: Record<Status, string> = {
  active: "Ativo",
  growing: "Crescimento",
  declining: "Declínio",
  disposed: "Descartado",
};

const statusColor: Record<Status, string> = {
  active: "text-white bg-brand-600",
  growing: "text-amber-800 bg-amber-300",
  declining: "text-gray-700 bg-gray-200 border border-gray-300",
  disposed: "text-red-700 bg-red-100",
};

type ModalMode = "add" | "edit" | null;

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function unformatPhone(value: string): string {
  return value.replace(/\D/g, "");
}

const emptyForm = {
  code: "",
  breed: "",
  bird_count: "",
  age_weeks: "",
  production_system: "Convencional" as string,
  status: "active" as Status,
  supplier: "",
  supplier_contact: "",
  arrival_date: "",
  origin: "",
  lineage: "",
  avg_weight_kg: "",
  barn_id: "",
};

export default function LotesPage() {
  const { farm } = useAuth();
  const supabase = createClient();

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [barns, setBarns] = useState<Barn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Lote | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!farm) return;
    setLoading(true);
    try {
      const [flocksRes, barnsRes] = await Promise.all([
        supabase
          .from("flocks")
          .select("*, barns(name)")
          .eq("farm_id", farm.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("barns")
          .select("id, name")
          .eq("farm_id", farm.id)
          .order("name"),
      ]);

      if (flocksRes.data) {
        setLotes(
          flocksRes.data.map((f: any) => ({
            id: f.id,
            code: f.code,
            breed: f.breed,
            bird_count: f.bird_count,
            age_weeks: f.age_weeks ?? 0,
            production_system: f.production_system ?? "Convencional",
            status: f.status as Status,
            supplier: f.supplier,
            supplier_contact: f.supplier_contact,
            arrival_date: f.arrival_date,
            origin: f.origin,
            lineage: f.lineage,
            avg_weight_kg: f.avg_weight_kg,
            barn_id: f.barn_id,
            barn_name: f.barns?.name ?? null,
          }))
        );
      }

      if (barnsRes.data) {
        setBarns(barnsRes.data as Barn[]);
      }
    } catch (err) {
      console.error("Error fetching flocks:", err);
    }
    setLoading(false);
  }, [farm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openAdd() {
    setForm({ ...emptyForm });
    setEditing(null);
    setError("");
    setModal("add");
  }

  function openEdit(l: Lote) {
    setForm({
      code: l.code,
      breed: l.breed,
      bird_count: String(l.bird_count),
      age_weeks: String(l.age_weeks),
      production_system: l.production_system,
      status: l.status,
      supplier: l.supplier ?? "",
      supplier_contact: l.supplier_contact ? formatPhone(l.supplier_contact) : "",
      arrival_date: l.arrival_date,
      origin: l.origin ?? "",
      lineage: l.lineage ?? "",
      avg_weight_kg: l.avg_weight_kg ? String(l.avg_weight_kg) : "",
      barn_id: l.barn_id ?? "",
    });
    setEditing(l);
    setError("");
    setModal("edit");
  }

  async function save() {
    if (!farm) return;
    if (!form.code.trim() || !form.breed.trim() || !form.arrival_date) {
      setError("Preencha código, raça e data de chegada.");
      return;
    }

    setSaving(true);
    setError("");

    const record: Record<string, any> = {
      farm_id: farm.id,
      code: form.code,
      breed: form.breed,
      bird_count: Number(form.bird_count) || 0,
      age_weeks: Number(form.age_weeks) || 0,
      production_system: form.production_system,
      status: form.status,
      supplier: form.supplier || null,
      supplier_contact: unformatPhone(form.supplier_contact) || null,
      arrival_date: form.arrival_date,
      origin: form.origin || null,
      lineage: form.lineage || null,
      avg_weight_kg: form.avg_weight_kg ? Number(form.avg_weight_kg) : null,
      barn_id: form.barn_id || null,
    };

    try {
      if (modal === "add") {
        const { error: insertErr } = await supabase
          .from("flocks")
          .insert(record);
        if (insertErr) throw insertErr;
      } else if (editing) {
        const { error: updateErr } = await supabase
          .from("flocks")
          .update(record)
          .eq("id", editing.id);
        if (updateErr) throw updateErr;
      }
      setModal(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar lote.");
    }
    setSaving(false);
  }

  async function deleteLote(id: string) {
    try {
      const { error: delErr } = await supabase
        .from("flocks")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;
      setDeleteConfirm(null);
      await fetchData();
    } catch (err: any) {
      console.error("Error deleting flock:", err);
    }
  }

  const filtered = lotes.filter(
    (l) =>
      l.code.toLowerCase().includes(search.toLowerCase()) ||
      l.breed.toLowerCase().includes(search.toLowerCase())
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

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : lotes.length === 0 && !search ? (
        /* Empty State — Day 0 */
        <div className="bg-white rounded-2xl border border-gray-100 py-20 px-6 text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Bird className="w-8 h-8 text-brand-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum lote cadastrado</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Cadastre seu primeiro lote de aves para começar a acompanhar produção, saúde e desempenho dos seus lotes.
          </p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-6 py-3 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Cadastrar primeiro lote
          </button>
        </div>
      ) : (
        /* Table */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Código</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Raça</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Aves</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Idade</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Galpão</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Sistema</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Status</th>
                  <th className="text-center text-xs font-bold text-gray-900 px-6 py-4">Detalhes</th>
                  <th className="text-right text-xs font-bold text-gray-900 px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{l.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{l.breed}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{l.bird_count.toLocaleString("pt-BR")}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{l.age_weeks} sem.</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{l.barn_name ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-[11px] font-semibold px-3 py-1 rounded-full", sistemaColor[l.production_system] ?? "text-gray-700 bg-gray-100")}>
                        {sistemaLabel[l.production_system] ?? l.production_system}
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
      )}

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

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            <div className="space-y-5">
              {/* Informações Básicas */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informações do Lote</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Código do Lote *</label>
                      <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Ex: L-2024-05" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Raça *</label>
                      <input type="text" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder="Ex: Hy-Line Brown" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Linhagem</label>
                      <input type="text" value={form.lineage} onChange={(e) => setForm({ ...form, lineage: e.target.value })} placeholder="Ex: Hy-Line International" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Galpão</label>
                      <select value={form.barn_id} onChange={(e) => setForm({ ...form, barn_id: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                        <option value="">Sem galpão</option>
                        {barns.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Aves</label>
                      <input type="number" value={form.bird_count} onChange={(e) => setForm({ ...form, bird_count: e.target.value })} placeholder="800" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Idade (semanas)</label>
                      <input type="number" value={form.age_weeks} onChange={(e) => setForm({ ...form, age_weeks: e.target.value })} placeholder="42" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Peso Médio (kg)</label>
                      <input type="number" step="0.01" value={form.avg_weight_kg} onChange={(e) => setForm({ ...form, avg_weight_kg: e.target.value })} placeholder="1.85" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sistema</label>
                      <select value={form.production_system} onChange={(e) => setForm({ ...form, production_system: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                        <option value="Convencional">Convencional</option>
                        <option value="Caipira">Caipira</option>
                        <option value="Orgânico">Orgânico</option>
                        <option value="Free Range">Free Range</option>
                        <option value="Cage-Free">Cage-Free</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                        <option value="active">Ativo</option>
                        <option value="growing">Crescimento</option>
                        <option value="declining">Declínio</option>
                        <option value="disposed">Descartado</option>
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
                      <input type="text" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Ex: Avícola São Paulo Ltda." className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contato do Fornecedor</label>
                      <input type="tel" value={form.supplier_contact} onChange={(e) => setForm({ ...form, supplier_contact: formatPhone(e.target.value) })} placeholder="(11) 99876-5432" maxLength={15} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Origem</label>
                      <input type="text" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="Ex: Campinas, SP" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data de Chegada *</label>
                      <input type="date" value={form.arrival_date} onChange={(e) => setForm({ ...form, arrival_date: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? "Salvando..." : "Salvar"}
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
