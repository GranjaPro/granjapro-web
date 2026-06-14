"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarDays,
  Droplets,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ModalPortal from "@/components/ui/modal-portal";
import { CalendarFilter, useDateFilter } from "@/components/date-filter";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";
import { getBarns } from "@/lib/services/barns";
import { getFlocks } from "@/lib/services/flocks";
import {
  createWaterRecord,
  deleteWaterRecord,
  getWaterByDateRange,
  updateWaterRecord,
  type WaterConsumptionRow,
  type WaterConsumptionUpdate,
} from "@/lib/services/water";
import type { Tables } from "@/lib/database.types";

type Barn = Pick<Tables<"barns">, "id" | "name" | "current_birds">;
type Flock = Pick<Tables<"flocks">, "id" | "code" | "bird_count" | "barn_id">;

interface WaterForm {
  date: string;
  barnId: string;
  flockId: string;
  quantityLiters: string;
}

interface ChartPoint {
  date: string;
  liters: number;
}

const emptyForm: WaterForm = {
  date: new Date().toISOString().split("T")[0],
  barnId: "",
  flockId: "",
  quantityLiters: "",
};

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro ao carregar dados";
}

export default function AguaPage() {
  const { farm } = useAuth();
  const { dateRange } = useDateFilter();
  const [records, setRecords] = useState<WaterConsumptionRow[]>([]);
  const [barns, setBarns] = useState<Barn[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [form, setForm] = useState<WaterForm>(emptyForm);
  const [editingRecord, setEditingRecord] = useState<WaterConsumptionRow | null>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!farm?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [waterData, barnsData, flocksData] = await Promise.all([
        getWaterByDateRange(farm.id, dateRange.startDate, dateRange.endDate),
        getBarns(farm.id),
        getFlocks(farm.id),
      ]);

      setRecords(waterData);
      setBarns(barnsData.map((barn) => ({
        id: barn.id,
        name: barn.name,
        current_birds: barn.current_birds,
      })));
      setFlocks(flocksData.map((flock) => ({
        id: flock.id,
        code: flock.code,
        bird_count: flock.bird_count,
        barn_id: flock.barn_id,
      })));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [dateRange.endDate, dateRange.startDate, farm?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const barnNameById = useMemo(
    () => new Map(barns.map((barn) => [barn.id, barn.name])),
    [barns]
  );
  const flockById = useMemo(
    () => new Map(flocks.map((flock) => [flock.id, flock])),
    [flocks]
  );

  const totalLiters = useMemo(
    () => records.reduce((sum, record) => sum + Number(record.quantity_liters), 0),
    [records]
  );

  const averageLitersPerBird = useMemo(() => {
    const totalBirds = records.reduce((sum, record) => {
      const flockBirds = record.flock_id ? flockById.get(record.flock_id)?.bird_count ?? 0 : 0;
      return sum + flockBirds;
    }, 0);
    const fallbackBirds = farm?.total_birds || barns.reduce((sum, barn) => sum + barn.current_birds, 0);
    const denominator = totalBirds || fallbackBirds;
    return denominator > 0 ? totalLiters / denominator : 0;
  }, [barns, farm?.total_birds, flockById, records, totalLiters]);

  const dailyAverage = useMemo(() => {
    const dayCount = new Set(records.map((record) => record.date)).size || 1;
    return totalLiters / dayCount;
  }, [records, totalLiters]);

  const status = useMemo(() => {
    if (dailyAverage === 0) return { label: "Sem dados", color: "text-gray-500", bg: "bg-gray-100" };
    if (averageLitersPerBird > 0 && averageLitersPerBird < 0.18) {
      return { label: "Alerta baixo", color: "text-amber-700", bg: "bg-amber-50" };
    }
    if (averageLitersPerBird > 0.35) {
      return { label: "Alerta alto", color: "text-red-700", bg: "bg-red-50" };
    }
    return { label: "Normal", color: "text-emerald-700", bg: "bg-emerald-50" };
  }, [averageLitersPerBird, dailyAverage]);

  const chartData = useMemo<ChartPoint[]>(() => {
    const totals = new Map<string, number>();
    records.forEach((record) => {
      totals.set(record.date, (totals.get(record.date) || 0) + Number(record.quantity_liters));
    });
    return Array.from(totals.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, liters]) => ({
        date: formatDate(date),
        liters,
      }));
  }, [records]);

  function openAddModal() {
    setEditingRecord(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(record: WaterConsumptionRow) {
    setEditingRecord(record);
    setForm({
      date: record.date,
      barnId: record.barn_id ?? "",
      flockId: record.flock_id ?? "",
      quantityLiters: String(record.quantity_liters),
    });
    setModalOpen(true);
  }

  async function saveRecord() {
    if (!farm?.id || !form.date || !form.quantityLiters) return;
    const quantityLiters = Number(form.quantityLiters);
    if (quantityLiters <= 0) return;

    const selectedFlock = form.flockId ? flockById.get(form.flockId) : undefined;
    const selectedBarnId = selectedFlock?.barn_id ?? (form.barnId || null);
    if (form.barnId && !barnNameById.has(form.barnId)) return;
    if (form.flockId && !selectedFlock) return;

    setIsSaving(true);
    try {
      if (editingRecord) {
        const updates: WaterConsumptionUpdate = {
          date: form.date,
          barn_id: selectedBarnId,
          flock_id: form.flockId || null,
          quantity_liters: quantityLiters,
        };
        await updateWaterRecord(editingRecord.id, updates);
      } else {
        await createWaterRecord({
          farm_id: farm.id,
          date: form.date,
          barn_id: selectedBarnId,
          flock_id: form.flockId || null,
          quantity_liters: quantityLiters,
        });
      }
      setModalOpen(false);
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRecordId) return;
    setIsSaving(true);
    try {
      await deleteWaterRecord(deleteRecordId);
      setDeleteRecordId(null);
      await loadData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center flex-shrink-0">
            <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight truncate">Consumo de Água</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5 truncate">Registre e analise o consumo hídrico da granja</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <CalendarFilter />
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-3 sm:px-5 py-2 sm:py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Registrar Consumo</span>
            <span className="sm:hidden">Registrar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard
          title="Consumo Total"
          value={`${totalLiters.toFixed(0)} L`}
          subtitle="No período filtrado"
          icon={<Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-50 dark:bg-blue-950/20"
        />
        <KpiCard
          title="Média por Ave"
          value={`${averageLitersPerBird.toFixed(2)} L/ave`}
          subtitle="Com base nos lotes registrados"
          icon={<CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />}
          iconBg="bg-orange-50 dark:bg-orange-950/20"
        />
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-all duration-200 cursor-pointer dark:bg-slate-900 dark:border-white/10">
          <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center flex-shrink-0">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Status</span>
          </div>
          <div className={cn("inline-flex rounded-full px-3 py-1 text-sm font-bold", status.bg, status.color)}>
            {status.label}
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Média diária: {dailyAverage.toFixed(0)} L</p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        {/* Left Column: Chart */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 dark:border-white/10 dark:bg-slate-900">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Evolução do Consumo</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Litros registrados por dia</p>
          </div>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", fontSize: "12px", padding: "12px 16px" }}
                  formatter={(value: unknown) => [`${Number(value).toFixed(0)} L`, "Água"]}
                />
                <Area type="monotone" dataKey="liters" stroke="#3b82f6" strokeWidth={2} fill="url(#waterFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Right Column: Records Log */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm dark:border-white/10 dark:bg-slate-900 flex flex-col overflow-hidden">
          <div className="border-b border-gray-100 p-4 dark:border-white/10 flex-shrink-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Registros Recentes</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{records.length} lançamento(s) no período</p>
          </div>
          <div className="max-h-[360px] sm:max-h-[420px] overflow-y-auto divide-y divide-gray-50 dark:divide-white/5" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
            {records.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-slate-400 text-center">Nenhum consumo de água registrado neste período.</p>
            ) : (
              records
                .slice()
                .sort((left, right) => right.date.localeCompare(left.date))
                .map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{Number(record.quantity_liters).toFixed(0)} L</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{formatDate(record.date)}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {record.flock_id ? `Lote ${flockById.get(record.flock_id)?.code ?? "-"}` : "Sem lote"} · {record.barn_id ? barnNameById.get(record.barn_id) ?? "Aviário" : "Sem aviário"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditModal(record)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteRecordId(record.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 dark:border dark:border-white/10" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{editingRecord ? "Editar Consumo" : "Registrar Consumo"}</h3>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                  <X className="h-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <Field label="Data">
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    className="w-full border border-gray-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </Field>
                <Field label="Lote">
                  <select
                    value={form.flockId}
                    onChange={(event) => {
                      const flock = flockById.get(event.target.value);
                      setForm({ ...form, flockId: event.target.value, barnId: flock?.barn_id ?? form.barnId });
                    }}
                    className="w-full border border-gray-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white dark:bg-slate-800 cursor-pointer"
                  >
                    <option value="">Sem lote</option>
                    {flocks.map((flock) => <option key={flock.id} value={flock.id}>{flock.code}</option>)}
                  </select>
                </Field>
                <Field label="Aviário">
                  <select
                    value={form.barnId}
                    onChange={(event) => setForm({ ...form, barnId: event.target.value })}
                    className="w-full border border-gray-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white dark:bg-slate-800 cursor-pointer"
                  >
                    <option value="">Sem aviário</option>
                    {barns.map((barn) => <option key={barn.id} value={barn.id}>{barn.name}</option>)}
                  </select>
                </Field>
                <Field label="Quantidade (L)">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.quantityLiters}
                    onChange={(event) => setForm({ ...form, quantityLiters: event.target.value })}
                    placeholder="500"
                    className="w-full border border-gray-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">Cancelar</button>
                <button
                  onClick={saveRecord}
                  disabled={isSaving || !form.date || Number(form.quantityLiters) <= 0}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-4 py-2 transition-colors cursor-pointer shadow-sm shadow-brand-600/20 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteRecordId && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4 dark:border dark:border-white/10">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Excluir registro?</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">Essa ação remove o lançamento de consumo de água permanentemente.</p>
              <div className="flex justify-center gap-2 pt-2">
                <button onClick={() => setDeleteRecordId(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">Cancelar</button>
                <button onClick={confirmDelete} disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer shadow-sm shadow-red-600/20 disabled:bg-gray-300">Excluir</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

function KpiCard({ title, value, subtitle, icon, iconBg = "bg-blue-50 dark:bg-blue-950/20" }: { title: string; value: string; subtitle: string; icon: ReactNode; iconBg?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-all duration-200 cursor-pointer dark:bg-slate-900 dark:border-white/10">
      <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5 sm:mb-3">
        <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">{title}</span>
      </div>
      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
