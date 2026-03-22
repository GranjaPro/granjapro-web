"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ModalPortal from "@/components/ui/modal-portal";
import {
  Egg,
  TrendingUp,
  AlertTriangle,
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Check,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ── Lotes (shared mock data) ── */
interface Lote {
  id: number;
  codigo: string;
  raca: string;
  aves: number;
  postura: string;
}

const initialLotes: Lote[] = [
  { id: 1, codigo: "L-2024-01", raca: "Hy-Line Brown", aves: 800, postura: "92%" },
  { id: 2, codigo: "L-2024-02", raca: "Lohmann LSL", aves: 600, postura: "88%" },
  { id: 3, codigo: "L-2024-03", raca: "ISA Brown", aves: 1000, postura: "—" },
  { id: 4, codigo: "L-2024-04", raca: "Novogen Brown", aves: 500, postura: "78%" },
];

/* ── Chart Data ── */
const curvaProducao = [
  { day: "Seg", ovos: 2450 },
  { day: "Ter", ovos: 2620 },
  { day: "Qua", ovos: 2700 },
  { day: "Qui", ovos: 2650 },
  { day: "Sex", ovos: 2580 },
  { day: "Sáb", ovos: 2600 },
  { day: "Dom", ovos: 2500 },
];

/* ── Table Data ── */
interface Registro {
  id: number;
  loteId: number;
  loteCodigo: string;
  data: string;
  total: number;
  quebrados: number;
  sujos: number;
  descartados: number;
  taxa: string;
}

const initialRegistros: Registro[] = [
  { id: 1, loteId: 1, loteCodigo: "L-2024-01", data: "2024-03-17", total: 2450, quebrados: 12, sujos: 18, descartados: 5, taxa: "90.0%" },
  { id: 2, loteId: 2, loteCodigo: "L-2024-02", data: "2024-03-16", total: 2620, quebrados: 8, sujos: 14, descartados: 3, taxa: "95.3%" },
  { id: 3, loteId: 1, loteCodigo: "L-2024-01", data: "2024-03-15", total: 2700, quebrados: 15, sujos: 20, descartados: 7, taxa: "96.2%" },
];

type ModalMode = "add" | "edit" | null;

export default function ProducaoPage() {
  const searchParams = useSearchParams();
  const [lotes, setLotes] = useState(initialLotes);
  const [registros, setRegistros] = useState(initialRegistros);
  const [modal, setModal] = useState<ModalMode>(null);

  useEffect(() => {
    if (searchParams.get("register") === "true") setModal("add");
  }, [searchParams]);
  const [editing, setEditing] = useState<Registro | null>(null);
  const [form, setForm] = useState({ loteId: "", data: "", total: "", quebrados: "", sujos: "", descartados: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  /* Auto-calculate taxa de postura */
  const taxaCalculada = useMemo(() => {
    const selectedLote = lotes.find((l) => l.id === Number(form.loteId));
    const total = Number(form.total) || 0;
    if (!selectedLote || selectedLote.aves === 0 || total === 0) return "—";
    const taxa = (total / selectedLote.aves) * 100;
    return taxa.toFixed(1) + "%";
  }, [form.loteId, form.total, lotes]);

  /* KPI Data (derived from registros) */
  const kpis = useMemo(() => {
    const todayRegistros = registros.slice(0, 1);
    const todayTotal = todayRegistros.reduce((s, r) => s + r.total, 0);
    const todayQuebrados = todayRegistros.reduce((s, r) => s + r.quebrados, 0);
    const todaySujos = todayRegistros.reduce((s, r) => s + r.sujos, 0);
    const weeklyAvg = Math.round(registros.reduce((s, r) => s + r.total, 0) / (registros.length || 1));

    return [
      {
        title: "Produção Hoje",
        value: todayTotal.toLocaleString("pt-BR"),
        badge: "+3.2%",
        badgeDir: "up" as const,
        icon: Egg,
        iconBg: "bg-brand-50",
        iconColor: "text-brand-600",
      },
      {
        title: "Taxa de Postura",
        value: todayRegistros[0]?.taxa || "—",
        badge: "-2%",
        badgeDir: "down" as const,
        icon: TrendingUp,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
      },
      {
        title: "Quebrados / Sujos",
        value: String(todayQuebrados + todaySujos),
        badge: "1.2%",
        badgeDir: "neutral" as const,
        icon: AlertTriangle,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
      },
      {
        title: "Média Semanal",
        value: weeklyAvg.toLocaleString("pt-BR"),
        badge: "+5%",
        badgeDir: "up" as const,
        icon: Activity,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
      },
    ];
  }, [registros]);

  function openAdd() {
    setForm({ loteId: "", data: "", total: "", quebrados: "", sujos: "", descartados: "" });
    setEditing(null);
    setModal("add");
  }

  function openEdit(r: Registro) {
    setForm({
      loteId: String(r.loteId),
      data: r.data,
      total: String(r.total),
      quebrados: String(r.quebrados),
      sujos: String(r.sujos),
      descartados: String(r.descartados),
    });
    setEditing(r);
    setModal("edit");
  }

  function save() {
    const loteId = Number(form.loteId);
    const selectedLote = lotes.find((l) => l.id === loteId);
    if (!selectedLote || !form.data.trim()) return;

    const total = Number(form.total) || 0;
    const quebrados = Number(form.quebrados) || 0;
    const sujos = Number(form.sujos) || 0;
    const descartados = Number(form.descartados) || 0;
    const taxa = selectedLote.aves > 0 ? ((total / selectedLote.aves) * 100).toFixed(1) + "%" : "—";

    const registro: Registro = {
      id: editing?.id || Date.now(),
      loteId,
      loteCodigo: selectedLote.codigo,
      data: form.data,
      total,
      quebrados,
      sujos,
      descartados,
      taxa,
    };

    if (modal === "add") {
      setRegistros((prev) => [registro, ...prev]);
    } else if (editing) {
      setRegistros((prev) => prev.map((r) => (r.id === editing.id ? registro : r)));
    }

    /* Update lote postura */
    setLotes((prev) =>
      prev.map((l) => (l.id === loteId ? { ...l, postura: taxa } : l))
    );

    setModal(null);
  }

  function deleteRegistro(id: number) {
    setRegistros((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirm(null);
  }

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
            <Egg className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Produção de Ovos</h1>
            <p className="text-sm text-gray-500 mt-0.5">Acompanhe a produção diária e qualidade</p>
          </div>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm">
          <Plus className="w-4 h-4" />
          Registrar Produção
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", kpi.iconBg)}>
                <kpi.icon className={cn("w-5 h-5", kpi.iconColor)} />
              </div>
              <span className={cn(
                "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-lg",
                kpi.badgeDir === "up" && "text-emerald-700 bg-emerald-50",
                kpi.badgeDir === "down" && "text-red-600 bg-red-50",
                kpi.badgeDir === "neutral" && "text-amber-700 bg-amber-50"
              )}>
                {kpi.badgeDir === "up" && <ArrowUpRight className="w-3 h-3" />}
                {kpi.badgeDir === "down" && <ArrowDownRight className="w-3 h-3" />}
                {kpi.badge}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">{kpi.title}</p>
          </div>
        ))}
      </div>

      {/* Production Curve */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-6">Curva de Produção (Esta Semana)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={curvaProducao} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2d7a4f" stopOpacity={0.25} />
                <stop offset="60%" stopColor="#2d7a4f" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#2d7a4f" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} domain={[0, 2800]} ticks={[0, 700, 1400, 2100, 2800]} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
              labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
              formatter={(value: number) => [value.toLocaleString("pt-BR"), "Ovos"]}
            />
            <Area type="monotone" dataKey="ovos" stroke="#2d7a4f" strokeWidth={2.5} fill="url(#colorProd)" dot={{ r: 5, fill: "#fff", stroke: "#2d7a4f", strokeWidth: 2.5 }} activeDot={{ r: 7, fill: "#2d7a4f", stroke: "#fff", strokeWidth: 3 }} name="Ovos" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Entries Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Registros Recentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Lote</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Data</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Total</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Quebrados</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Sujos</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Descartados</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Taxa</th>
                <th className="text-center text-xs font-bold text-gray-900 px-6 py-3">Hist&#243;rico</th>
                <th className="text-right text-xs font-bold text-gray-900 px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg">{r.loteCodigo}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatDate(r.data)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.total.toLocaleString("pt-BR")}</td>
                  <td className="px-6 py-4 text-sm font-medium text-red-600">{r.quebrados}</td>
                  <td className="px-6 py-4 text-sm font-medium text-amber-600">{r.sujos}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.descartados}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-brand-600">{r.taxa}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link href={`/dashboard/production/historico/${r.loteId}`} className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                      <FileText className="w-4 h-4" />
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {registros.length === 0 && (
                <tr><td colSpan={9} className="text-center py-16 text-gray-400 text-sm">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Registrar Produção" : "Editar Registro"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {/* Lote + Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lote</label>
                  <select
                    value={form.loteId}
                    onChange={(e) => setForm({ ...form, loteId: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer"
                  >
                    <option value="">Selecionar lote...</option>
                    {lotes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.codigo} — {l.raca} ({l.aves.toLocaleString("pt-BR")} aves)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
              </div>

              {/* Total de Ovos */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Total de Ovos</label>
                <input
                  type="number"
                  value={form.total}
                  onChange={(e) => setForm({ ...form, total: e.target.value })}
                  placeholder="2450"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                />
              </div>

              {/* Quebrados, Sujos, Descartados */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quebrados</label>
                  <input
                    type="number"
                    value={form.quebrados}
                    onChange={(e) => setForm({ ...form, quebrados: e.target.value })}
                    placeholder="12"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sujos</label>
                  <input
                    type="number"
                    value={form.sujos}
                    onChange={(e) => setForm({ ...form, sujos: e.target.value })}
                    placeholder="18"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descartados</label>
                  <input
                    type="number"
                    value={form.descartados}
                    onChange={(e) => setForm({ ...form, descartados: e.target.value })}
                    placeholder="5"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all"
                  />
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button
                onClick={save}
                disabled={!form.loteId || !form.data}
                className={cn(
                  "inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm",
                  form.loteId && form.data
                    ? "text-white bg-brand-600 hover:bg-brand-700"
                    : "text-gray-400 bg-gray-200 cursor-not-allowed"
                )}
              >
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
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={() => deleteRegistro(deleteConfirm)} className="px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
