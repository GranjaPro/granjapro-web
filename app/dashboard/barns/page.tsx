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
  ChevronDown,
  ChevronUp,
  Sparkles,
  Thermometer,
  Droplets,
  Sun,
  Ruler,
  Lock,
  Bird,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/plan/locked-overlay";
import { UpgradePopup } from "@/components/plan/upgrade-popup";

type DbStatus = "active" | "maintenance" | "inactive";
type SistemaAvicola = "gaiola" | "caipira" | "organico" | "cage-free";

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
  "cage-free": "Cage-Free",
};

const sistemaColor: Record<SistemaAvicola, string> = {
  gaiola: "text-blue-700 bg-blue-50",
  caipira: "text-orange-700 bg-orange-50",
  organico: "text-green-700 bg-green-50",
  "cage-free": "text-teal-700 bg-teal-50",
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

/* ── Custom Select ── */
interface SelectOption { value: string; label: string; dot?: string }

function CustomSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between border rounded-xl px-3.5 py-2.5 text-sm text-gray-800 bg-white cursor-pointer transition-all duration-200",
          open
            ? "border-brand-300 ring-2 ring-brand-500/20 shadow-sm"
            : "border-gray-200 hover:border-gray-300"
        )}
      >
        <span className="flex items-center gap-2">
          {selected?.dot && <span className={cn("w-2 h-2 rounded-full", selected.dot)} />}
          {selected?.label}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1.5 w-full bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-200/60 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm cursor-pointer transition-colors duration-150",
                  opt.value === value
                    ? "bg-brand-50 text-brand-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {opt.dot && <span className={cn("w-2 h-2 rounded-full", opt.dot)} />}
                <span>{opt.label}</span>
                {opt.value === value && <Check className="w-3.5 h-3.5 ml-auto text-brand-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type ModalMode = "add" | "edit" | null;

const emptyForm = {
  name: "",
  status: "active" as DbStatus,
  capacity: "",
  production_system: "gaiola" as SistemaAvicola,
  area_m2: "",
  current_birds: "",
  notes: "",
  density_barn: "",
  density_pasture: "",
  birds_per_feeder: "",
  birds_per_drinker: "",
  nest_count: "",
  birds_per_perch: "",
  temperature: "",
  humidity: "",
  light_intensity: "",
};

const supabase = createClient();

export default function BarnsPage() {
  const { farm } = useAuth();
  const { plan } = usePlan();
  const [showEnvUpgrade, setShowEnvUpgrade] = useState(false);
  const [search, setSearch] = useState("");
  const [barns, setBarns] = useState<Barn[]>([]);
  const [flocksByBarn, setFlocksByBarn] = useState<Record<string, { id: string; code: string; breed: string; bird_count: number; status: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Barn | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterSistema, setFilterSistema] = useState<SistemaAvicola | "todos">("todos");
  const [showStructural, setShowStructural] = useState(false);
  const [showEnvironmental, setShowEnvironmental] = useState(false);

  const fetchBarns = useCallback(async () => {
    if (!farm?.id) return;
    setLoading(true);
    const [barnsRes, flocksRes] = await Promise.all([
      supabase.from("barns").select("*").eq("farm_id", farm.id).order("created_at", { ascending: true }),
      supabase.from("flocks").select("id, code, breed, bird_count, status, barn_id").eq("farm_id", farm.id),
    ]);
    if (!barnsRes.error && barnsRes.data) setBarns(barnsRes.data);
    // Group flocks by barn_id
    const grouped: Record<string, { id: string; code: string; breed: string; bird_count: number; status: string }[]> = {};
    (flocksRes.data ?? []).forEach((f: any) => {
      if (f.barn_id) {
        if (!grouped[f.barn_id]) grouped[f.barn_id] = [];
        grouped[f.barn_id].push({ id: f.id, code: f.code, breed: f.breed, bird_count: f.bird_count, status: f.status });
      }
    });
    setFlocksByBarn(grouped);
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

  function openEdit(g: any) {
    setForm({
      name: g.name,
      status: g.status,
      capacity: String(g.capacity ?? ""),
      production_system: (g.production_system || "gaiola") as SistemaAvicola,
      area_m2: String(g.area_m2 ?? ""),
      current_birds: String(g.current_birds ?? ""),
      notes: g.notes ?? "",
      density_barn: String(g.density_barn ?? ""),
      density_pasture: String(g.density_pasture ?? ""),
      birds_per_feeder: String(g.birds_per_feeder ?? ""),
      birds_per_drinker: String(g.birds_per_drinker ?? ""),
      nest_count: String(g.nest_count ?? ""),
      birds_per_perch: String(g.birds_per_perch ?? ""),
      temperature: String(g.temperature ?? ""),
      humidity: String(g.humidity ?? ""),
      light_intensity: String(g.light_intensity ?? ""),
    });
    setEditing(g);
    setModal("edit");
  }

  async function save() {
    if (!form.name.trim() || !farm?.id) return;
    setSaving(true);

    const payload: Record<string, any> = {
      name: form.name,
      capacity: Number(form.capacity) || 0,
      current_birds: Number(form.current_birds) || 0,
      production_system: form.production_system,
      status: form.status,
      farm_id: farm.id,
    };

    // Extended fields — only include if non-empty (columns may not exist yet)
    const ext: Record<string, any> = {};
    if (form.area_m2) ext.area_m2 = Number(form.area_m2);
    if (form.notes) ext.notes = form.notes;
    if (form.density_barn) ext.density_barn = Number(form.density_barn);
    if (form.density_pasture) ext.density_pasture = Number(form.density_pasture);
    if (form.birds_per_feeder) ext.birds_per_feeder = Number(form.birds_per_feeder);
    if (form.birds_per_drinker) ext.birds_per_drinker = Number(form.birds_per_drinker);
    if (form.nest_count) ext.nest_count = Number(form.nest_count);
    if (form.birds_per_perch) ext.birds_per_perch = Number(form.birds_per_perch);
    if (form.temperature) ext.temperature = Number(form.temperature);
    if (form.humidity) ext.humidity = Number(form.humidity);
    if (form.light_intensity) ext.light_intensity = Number(form.light_intensity);
    Object.assign(payload, ext);

    async function tryInsertOrUpdate(p: Record<string, any>) {
      if (modal === "add") {
        return supabase.from("barns").insert(p).select().single();
      } else if (editing) {
        return supabase.from("barns").update(p).eq("id", editing.id).select().single();
      }
      return { data: null, error: null };
    }

    let { data, error } = await tryInsertOrUpdate(payload);

    // Fallback: if error (likely missing columns), retry with base fields only
    if (error && Object.keys(ext).length > 0) {
      const base = { name: payload.name, capacity: payload.capacity, current_birds: payload.current_birds, production_system: payload.production_system, status: payload.status, farm_id: payload.farm_id };
      ({ data, error } = await tryInsertOrUpdate(base));
    }

    if (!error && data) {
      if (modal === "add") setBarns((prev) => [...prev, data]);
      else if (editing) setBarns((prev) => prev.map((g) => (g.id === editing.id ? data : g)));
    }

    setSaving(false);
    setModal(null);
  }

  async function changeStatus(id: string, newStatus: DbStatus) {
    const { data, error } = await supabase
      .from("barns")
      .update({ status: newStatus })
      .eq("id", id)
      .select()
      .single();
    if (!error && data) setBarns((prev) => prev.map((g) => (g.id === id ? data : g)));
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
  const totalAves = barns.reduce((s, g) => (flocksByBarn[g.id] ?? []).reduce((a, f) => a + f.bird_count, 0) + s, 0);
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
              {(() => {
                const barnFlocks = flocksByBarn[g.id] ?? [];
                const totalBirds = barnFlocks.reduce((s, f) => s + f.bird_count, 0);
                const ocp = g.capacity > 0 ? Math.round((totalBirds / g.capacity) * 100) : 0;
                return (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Capacidade</span>
                      <span className="font-semibold text-gray-700">{g.capacity.toLocaleString("pt-BR")} aves</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Ocupação</span>
                      <span className="font-semibold text-gray-700">{totalBirds.toLocaleString("pt-BR")} / {g.capacity.toLocaleString("pt-BR")} ({ocp}%)</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          ocp > 80 ? "bg-red-400" : ocp > 50 ? "bg-amber-400" : "bg-brand-500"
                        )}
                        style={{ width: Math.min(ocp, 100) + "%" }}
                      />
                    </div>
                    {/* Flocks in this barn */}
                    {barnFlocks.length > 0 ? (
                      <div className="pt-2 space-y-1.5">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Lotes</p>
                        {barnFlocks.map((f) => (
                          <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
                            <div className="flex items-center gap-2">
                              <Bird className="w-3.5 h-3.5 text-brand-500" />
                              <span className="text-[12px] font-semibold text-gray-700">{f.code}</span>
                              <span className="text-[11px] text-gray-400">{f.breed}</span>
                            </div>
                            <span className="text-[11px] font-semibold text-gray-600">{f.bird_count.toLocaleString("pt-BR")} aves</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 pt-1 italic">Nenhum lote associado</p>
                    )}
                  </div>
                );
              })()}

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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-0">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Novo Galpão" : "Editar Galpão"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 dashboard-scroll">
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Galpão Norte" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>

              {/* Status + Sistema */}
              <div className="grid grid-cols-2 gap-3">
                <CustomSelect
                  label="Status"
                  value={form.status}
                  onChange={(v) => setForm({ ...form, status: v as DbStatus })}
                  options={[
                    { value: "active", label: "Ativo", dot: "bg-emerald-500" },
                    { value: "inactive", label: "Vazio", dot: "bg-gray-400" },
                    { value: "maintenance", label: "Manutenção", dot: "bg-amber-500" },
                  ]}
                />
                <CustomSelect
                  label="Sistema"
                  value={form.production_system}
                  onChange={(v) => setForm({ ...form, production_system: v as SistemaAvicola })}
                  options={[
                    { value: "gaiola", label: "Gaiola" },
                    { value: "caipira", label: "Caipira" },
                    { value: "organico", label: "Orgânico" },
                    { value: "cage-free", label: "Cage-Free" },
                  ]}
                />
              </div>

              {/* Capacidade + Área */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Capacidade de aves</label>
                  <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="5000" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Área (m²)</label>
                  <input type="number" value={form.area_m2} onChange={(e) => setForm({ ...form, area_m2: e.target.value })} placeholder="Ex: 500" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>

              {/* Lotes associados (read-only) */}
              {editing && (flocksByBarn[editing.id] ?? []).length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lotes neste galpão</label>
                  <div className="space-y-1.5 bg-gray-50 rounded-xl p-3">
                    {(flocksByBarn[editing.id] ?? []).map((f) => (
                      <div key={f.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bird className="w-3.5 h-3.5 text-brand-500" />
                          <span className="text-[12px] font-semibold text-gray-700">{f.code}</span>
                          <span className="text-[11px] text-gray-400">{f.breed}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-600">{f.bird_count.toLocaleString("pt-BR")} aves</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 pt-1.5 mt-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-500">Total</span>
                      <span className="text-[12px] font-bold text-gray-700">
                        {(flocksByBarn[editing.id] ?? []).reduce((s, f) => s + f.bird_count, 0).toLocaleString("pt-BR")} aves
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas sobre o galpão..." rows={2} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all resize-none" />
              </div>

              {/* ── Parâmetros Estruturais (collapsible) ── */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowStructural(!showStructural)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-gray-400" />
                    Parâmetros Estruturais
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Opcional</span>
                  </span>
                  {showStructural ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {showStructural && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Densidade no galpão (aves/m²)</label>
                        <input type="number" step="0.1" value={form.density_barn} onChange={(e) => setForm({ ...form, density_barn: e.target.value })} placeholder="Ex: 12" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Densidade no pasto (aves/m²)</label>
                        <input type="number" step="0.1" value={form.density_pasture} onChange={(e) => setForm({ ...form, density_pasture: e.target.value })} placeholder="Ex: 4" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Aves por comedouro</label>
                        <input type="number" value={form.birds_per_feeder} onChange={(e) => setForm({ ...form, birds_per_feeder: e.target.value })} placeholder="Ex: 25" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Aves por bebedouro</label>
                        <input type="number" value={form.birds_per_drinker} onChange={(e) => setForm({ ...form, birds_per_drinker: e.target.value })} placeholder="Ex: 10" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Número de ninhos</label>
                        <input type="number" value={form.nest_count} onChange={(e) => setForm({ ...form, nest_count: e.target.value })} placeholder="Ex: 200" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">Aves por poleiro</label>
                        <input type="number" value={form.birds_per_perch} onChange={(e) => setForm({ ...form, birds_per_perch: e.target.value })} placeholder="Ex: 15" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Condições Ambientais (collapsible + PRO) ── */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (plan === "essencial") {
                      setShowEnvUpgrade(true);
                    } else {
                      setShowEnvironmental(!showEnvironmental);
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-gray-400" />
                    Condições Ambientais
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Opcional</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/25">
                      <Sparkles className="w-2.5 h-2.5" />Pro
                    </span>
                  </span>
                  {showEnvironmental ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {showEnvironmental && plan !== "essencial" && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1">
                          <Thermometer className="w-3 h-3" /> Temperatura (°C)
                        </label>
                        <input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} placeholder="25" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1">
                          <Droplets className="w-3 h-3" /> Umidade (%)
                        </label>
                        <input type="number" step="0.1" value={form.humidity} onChange={(e) => setForm({ ...form, humidity: e.target.value })} placeholder="65" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1">
                          <Sun className="w-3 h-3" /> Luz (lux)
                        </label>
                        <input type="number" step="0.1" value={form.light_intensity} onChange={(e) => setForm({ ...form, light_intensity: e.target.value })} placeholder="20" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                      </div>
                    </div>
                  </div>
                )}
                {showEnvironmental && plan === "essencial" && (
                  <div className="border-t border-gray-100">
                    <LockedOverlay message="Desbloqueie as condições ambientais" targetPlan="pro">
                      <div className="px-4 pb-4 pt-3 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          {[1,2,3].map(n => (
                            <div key={n}>
                              <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
                              <div className="h-9 bg-gray-100 rounded-lg w-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </LockedOverlay>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-6 pt-4 border-t border-gray-100">
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
      <UpgradePopup open={showEnvUpgrade} onClose={() => setShowEnvUpgrade(false)} targetPlan="pro" />
    </div>
  );
}
