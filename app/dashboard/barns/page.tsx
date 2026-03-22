"use client";

import { useState, useEffect, useCallback } from "react";
import ModalPortal from "@/components/ui/modal-portal";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  Warehouse,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";

type DbStatus = "active" | "maintenance" | "inactive";
type SistemaAvicola = "gaiola" | "caipira" | "organico";

interface Barn {
  id: string;
  name: string;
  capacity: number;
  current_birds: number;
  production_system: string;
  status: DbStatus;
  farm_id: string;
}

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

const statusLabel: Record<DbStatus, string> = {
  active: "Ativo",
  inactive: "Vazio",
  maintenance: "Manutenção",
};

const statusColor: Record<DbStatus, string> = {
  active: "text-emerald-700 bg-emerald-50",
  inactive: "text-gray-500 bg-gray-100",
  maintenance: "text-amber-700 bg-amber-50",
};

type ModalMode = "add" | "edit" | null;

const emptyForm = {
  name: "",
  status: "active" as DbStatus,
  capacity: "",
  production_system: "gaiola" as SistemaAvicola,
};

const supabase = createClient();

export default function BarnsPage() {
  const { farm } = useAuth();
  const [search, setSearch] = useState("");
  const [barns, setBarns] = useState<Barn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Barn | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterSistema, setFilterSistema] = useState<SistemaAvicola | "todos">("todos");

  const fetchBarns = useCallback(async () => {
    if (!farm?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("barns")
      .select("*")
      .eq("farm_id", farm.id)
      .order("created_at", { ascending: true });
    if (!error && data) setBarns(data);
    setLoading(false);
  }, [farm?.id]);

  useEffect(() => {
    fetchBarns();
  }, [fetchBarns]);

  function openAdd() {
    setForm({ ...emptyForm });
    setEditing(null);
    setModal("add");
  }

  function openEdit(g: Barn) {
    setForm({
      name: g.name,
      status: g.status,
      capacity: String(g.capacity),
      production_system: (g.production_system || "gaiola") as SistemaAvicola,
    });
    setEditing(g);
    setModal("edit");
  }

  async function save() {
    if (!form.name.trim() || !farm?.id) return;
    setSaving(true);

    const payload = {
      name: form.name,
      capacity: Number(form.capacity) || 0,
      production_system: form.production_system,
      status: form.status,
      farm_id: farm.id,
    };

    if (modal === "add") {
      const { data, error } = await supabase
        .from("barns")
        .insert(payload)
        .select()
        .single();
      if (!error && data) setBarns((prev) => [...prev, data]);
    } else if (editing) {
      const { data, error } = await supabase
        .from("barns")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (!error && data) setBarns((prev) => prev.map((g) => (g.id === editing.id ? data : g)));
    }

    setSaving(false);
    setModal(null);
  }

  async function deleteBarn(id: string) {
    const { error } = await supabase.from("barns").delete().eq("id", id);
    if (!error) setBarns((prev) => prev.filter((g) => g.id !== id));
    setDeleteConfirm(null);
  }

  const filtered = barns.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchSistema = filterSistema === "todos" || g.production_system === filterSistema;
    return matchSearch && matchSistema;
  });

  const totalAtivos = barns.filter((g) => g.status === "active").length;
  const totalManutencao = barns.filter((g) => g.status === "maintenance").length;
  const totalAves = barns.reduce((s, g) => s + g.current_birds, 0);
  const totalCapacidade = barns.reduce((s, g) => s + g.capacity, 0);
  const mediaOcupacao = totalCapacidade > 0 ? Math.round((totalAves / totalCapacidade) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Galpões</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gerencie seus galpões de avicultura</p>
          </div>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20">
          <Plus className="w-4 h-4" />
          Novo Galpão
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-brand-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{barns.length}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Total de Galpões</p>
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
              <Building2 className="w-5 h-5 text-blue-600" />
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
            { key: "gaiola" as const, label: "Gaiola" },
            { key: "caipira" as const, label: "Caipira" },
            { key: "organico" as const, label: "Orgânico" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterSistema(t.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                filterSistema === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 w-full sm:w-72 sm:ml-auto focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Buscar galpão..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((g) => {
          const ocupacao = g.capacity > 0 ? Math.round((g.current_birds / g.capacity) * 100) : 0;
          const sistema = (g.production_system || "gaiola") as SistemaAvicola;
          return (
            <div key={g.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", g.status === "active" && "bg-brand-50", g.status === "inactive" && "bg-gray-100", g.status === "maintenance" && "bg-amber-50")}>
                    <Building2 className={cn("w-5 h-5", g.status === "active" && "text-brand-600", g.status === "inactive" && "text-gray-400", g.status === "maintenance" && "text-amber-600")} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{g.name}</h3>
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

              {/* Info */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Capacidade</span>
                  <span className="font-semibold text-gray-700">{g.capacity.toLocaleString("pt-BR")} aves</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Ocupação</span>
                  <span className="font-semibold text-gray-700">{g.current_birds.toLocaleString("pt-BR")} / {g.capacity.toLocaleString("pt-BR")} ({ocupacao}%)</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      ocupacao > 80 ? "bg-red-400" : ocupacao > 50 ? "bg-amber-400" : "bg-brand-500"
                    )}
                    style={{ width: ocupacao + "%" }}
                  />
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", statusColor[g.status])}>
                  {statusLabel[g.status]}
                </span>
                {sistemaLabel[sistema] && (
                  <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", sistemaColor[sistema])}>
                    {sistemaLabel[sistema]}
                  </span>
                )}
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
        <ModalPortal>
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
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Galpão Norte" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DbStatus })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="active">Ativo</option>
                    <option value="inactive">Vazio</option>
                    <option value="maintenance">Manutenção</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sistema</label>
                  <select value={form.production_system} onChange={(e) => setForm({ ...form, production_system: e.target.value as SistemaAvicola })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="gaiola">Gaiola</option>
                    <option value="caipira">Caipira</option>
                    <option value="organico">Orgânico</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Capacidade</label>
                <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="5000" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
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
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir este galpão? Esta ação não pode ser desfeita.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={() => deleteBarn(deleteConfirm)} className="px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
