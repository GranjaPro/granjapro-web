"use client";

import { useState, useMemo } from "react";
import {
  Wheat,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ── Types ── */
type TipoRacao = "milho" | "soja" | "comercial" | "custom";
type StatusEstoque = "normal" | "alerta" | "baixo";

interface RegistroRacao {
  id: number;
  data: string;
  tipo: TipoRacao;
  aviario: string;
  consumoKg: number;
  custoRS: number;
  qtdGalinhas: number;
}

interface ItemEstoque {
  id: number;
  nome: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  status: StatusEstoque;
}

const tipoLabel: Record<TipoRacao, string> = {
  milho: "Milho Mix",
  soja: "Soja Blend",
  comercial: "Comercial",
  custom: "Fórmula Custom",
};

const tipoColor: Record<TipoRacao, string> = {
  milho: "text-amber-800 bg-amber-100",
  soja: "text-orange-800 bg-orange-100",
  comercial: "text-emerald-800 bg-emerald-100",
  custom: "text-red-800 bg-red-100",
};

const statusColor: Record<StatusEstoque, string> = {
  normal: "text-emerald-700 bg-emerald-50",
  alerta: "text-amber-700 bg-amber-50",
  baixo: "text-red-700 bg-red-50",
};

const statusLabel: Record<StatusEstoque, string> = {
  normal: "Normal",
  alerta: "Alerta",
  baixo: "Baixo",
};

/* ── Mock Data ── */
const initialRegistros: RegistroRacao[] = [
  { id: 1, data: "2024-03-12", tipo: "milho", aviario: "Aviário 1A", consumoKg: 120, custoRS: 48, qtdGalinhas: 800 },
  { id: 2, data: "2024-03-12", tipo: "comercial", aviario: "Aviário 1B", consumoKg: 95, custoRS: 52, qtdGalinhas: 600 },
  { id: 3, data: "2024-03-11", tipo: "soja", aviario: "Aviário 2A", consumoKg: 110, custoRS: 55, qtdGalinhas: 1000 },
  { id: 4, data: "2024-03-11", tipo: "custom", aviario: "Aviário 3A", consumoKg: 85, custoRS: 42, qtdGalinhas: 500 },
  { id: 5, data: "2024-03-10", tipo: "comercial", aviario: "Aviário 1A", consumoKg: 125, custoRS: 53, qtdGalinhas: 800 },
  { id: 6, data: "2024-03-10", tipo: "milho", aviario: "Aviário 3B", consumoKg: 100, custoRS: 40, qtdGalinhas: 500 },
];

const initialEstoque: ItemEstoque[] = [
  { id: 1, nome: "Ração Postura Comercial", categoria: "Ração", quantidade: 1200, unidade: "kg", status: "normal" },
  { id: 2, nome: "Farelo de Soja", categoria: "Insumo", quantidade: 450, unidade: "kg", status: "normal" },
  { id: 3, nome: "Milho Moído", categoria: "Insumo", quantidade: 35, unidade: "kg", status: "baixo" },
  { id: 4, nome: "Premix Vitaminas", categoria: "Suplemento", quantidade: 80, unidade: "kg", status: "normal" },
  { id: 5, nome: "Calcita", categoria: "Mineral", quantidade: 320, unidade: "kg", status: "alerta" },
  { id: 6, nome: "Fosfato Bicálcico", categoria: "Mineral", quantidade: 15, unidade: "kg", status: "baixo" },
];

const consumoMensal = [
  { mes: "Jan", valor: 4200 },
  { mes: "Fev", valor: 4500 },
  { mes: "Mar", valor: 4800 },
  { mes: "Abr", valor: 3800 },
  { mes: "Mai", valor: 4600 },
  { mes: "Jun", valor: 4700 },
];

const consumoDiario = [
  { dia: "06/03", kg: 780 },
  { dia: "07/03", kg: 800 },
  { dia: "08/03", kg: 818 },
  { dia: "09/03", kg: 790 },
  { dia: "10/03", kg: 825 },
  { dia: "11/03", kg: 800 },
  { dia: "12/03", kg: 818 },
];

type ModalMode = "add" | "edit" | null;

export default function RacaoPage() {
  const [registros, setRegistros] = useState(initialRegistros);
  const [estoque] = useState(initialEstoque);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<RegistroRacao | null>(null);
  const [form, setForm] = useState({ data: "", tipo: "comercial" as TipoRacao, aviario: "", consumoKg: "", custoRS: "", qtdGalinhas: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  /* KPIs */
  const kpis = useMemo(() => {
    const totalConsumo = registros.reduce((s, r) => s + r.consumoKg, 0);
    const totalCusto = registros.reduce((s, r) => s + r.custoRS, 0);
    const avgConsumoPorGalinha = registros.length > 0 ? (registros.reduce((s, r) => s + (r.qtdGalinhas > 0 ? r.consumoKg / r.qtdGalinhas : 0), 0) / registros.length * 1000).toFixed(0) : "—";
    const custoPorKg = totalConsumo > 0 ? (totalCusto / totalConsumo).toFixed(2) : "—";
    const estoqueBaixo = estoque.filter((e) => e.status === "baixo" || e.status === "alerta").length;

    return [
      { title: "Consumo Diário", value: "410 kg", icon: Wheat, iconBg: "bg-brand-50", iconColor: "text-brand-600", badge: undefined, badgeDir: undefined },
      { title: "Custo por kg", value: "R$ " + custoPorKg, icon: DollarSign, iconBg: "bg-amber-50", iconColor: "text-amber-600", badge: "-2%", badgeDir: "down" as const },
      { title: "Consumo Médio / Galinha (Mês)", value: avgConsumoPorGalinha + " g", icon: TrendingUp, iconBg: "bg-blue-50", iconColor: "text-blue-600", badge: undefined, badgeDir: undefined },
      { title: "Custo Médio / Ovo (Mês)", value: "R$ 0,05", icon: Wheat, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", badge: "+1%", badgeDir: "up" as const },
    ];
  }, [registros, estoque]);

  function openAdd() {
    setForm({ data: "", tipo: "comercial", aviario: "", consumoKg: "", custoRS: "", qtdGalinhas: "" });
    setEditing(null);
    setModal("add");
  }

  function openEdit(r: RegistroRacao) {
    setForm({ data: r.data, tipo: r.tipo, aviario: r.aviario, consumoKg: String(r.consumoKg), custoRS: String(r.custoRS), qtdGalinhas: String(r.qtdGalinhas) });
    setEditing(r);
    setModal("edit");
  }

  function save() {
    if (!form.data.trim() || !form.aviario.trim()) return;
    const registro: RegistroRacao = {
      id: editing?.id || Date.now(),
      data: form.data,
      tipo: form.tipo,
      aviario: form.aviario,
      consumoKg: Number(form.consumoKg) || 0,
      custoRS: Number(form.custoRS) || 0,
      qtdGalinhas: Number(form.qtdGalinhas) || 0,
    };
    if (modal === "add") {
      setRegistros((prev) => [registro, ...prev]);
    } else if (editing) {
      setRegistros((prev) => prev.map((r) => (r.id === editing.id ? registro : r)));
    }
    setModal(null);
  }

  function deleteRegistro(id: number) {
    setRegistros((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirm(null);
  }

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
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
            <Wheat className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestão de Ração</h1>
            <p className="text-sm text-gray-500 mt-0.5">Acompanhe consumo e custos de alimentação</p>
          </div>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm">
          <Plus className="w-4 h-4" />
          Registrar Consumo
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", kpi.iconBg)}>
                <kpi.icon className={cn("w-5 h-5", kpi.iconColor)} />
              </div>
              {kpi.badge && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-lg",
                  kpi.badgeDir === "up" ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
                )}>
                  {kpi.badgeDir === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {kpi.badge}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">{kpi.title}</p>
          </div>
        ))}
      </div>

      {/* Estoque + Consumo Mensal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Itens em Estoque */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Itens em Estoque</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {estoque.map((item) => (
              <div key={item.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.categoria}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">{item.quantidade} {item.unidade}</span>
                  <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full", statusColor[item.status])}>
                    {statusLabel[item.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Consumo Mensal Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Consumo Mensal (R$)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={consumoMensal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} tickFormatter={(v) => (v / 1000).toFixed(1) + "k"} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                formatter={(value: number) => ["R$ " + value.toLocaleString("pt-BR"), "Custo"]}
              />
              <Bar dataKey="valor" fill="#2d7a4f" radius={[6, 6, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Consumo Diário Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-6">Consumo de Ração (14 dias)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={consumoDiario} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2d7a4f" stopOpacity={0.25} />
                <stop offset="60%" stopColor="#2d7a4f" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#2d7a4f" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} domain={[0, 1000]} ticks={[0, 250, 500, 750, 1000]} />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px", padding: "10px 14px" }}
              labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
              formatter={(value: number) => [value + " kg", "Consumo"]}
            />
            <Area type="monotone" dataKey="kg" stroke="#2d7a4f" strokeWidth={2.5} fill="url(#colorConsumo)" dot={{ r: 5, fill: "#fff", stroke: "#2d7a4f", strokeWidth: 2.5 }} activeDot={{ r: 7, fill: "#2d7a4f", stroke: "#fff", strokeWidth: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-visible">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Registros Recentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Data</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Tipo de Ração</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Aviário</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">Consumo (kg)</th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    Custo
                    <span className="relative group">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 px-3 py-2 text-[11px] font-normal text-white bg-gray-900 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-lg pointer-events-none leading-relaxed">
                        Custo total (R$) da quantidade de ração consumida neste registro.
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900" />
                      </span>
                    </span>
                  </span>
                </th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    Consumo / Galinha / Dia
                    <span className="relative group">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 px-3 py-2 text-[11px] font-normal text-white bg-gray-900 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-lg pointer-events-none leading-relaxed">
                        Quantidade de ração consumida dividida pelo número de galinhas (em gramas por ave).
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900" />
                      </span>
                    </span>
                  </span>
                </th>
                <th className="text-left text-xs font-bold text-gray-900 px-6 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    Custo / Galinha
                    <span className="relative group">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 px-3 py-2 text-[11px] font-normal text-white bg-gray-900 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-lg pointer-events-none leading-relaxed">
                        Custo total da ração dividido pelo número de galinhas (em R$ por ave).
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900" />
                      </span>
                    </span>
                  </span>
                </th>
                <th className="text-right text-xs font-bold text-gray-900 px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatDate(r.data)}</td>
                  <td className="px-6 py-4">
                    <span className={cn("text-[11px] font-semibold px-3 py-1 rounded-full", tipoColor[r.tipo])}>
                      {tipoLabel[r.tipo]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.aviario}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.consumoKg}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">R$ {r.custoRS.toFixed(2).replace(".", ",")}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{r.qtdGalinhas > 0 ? ((r.consumoKg / r.qtdGalinhas) * 1000).toFixed(0) + " g" : "—"}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{r.qtdGalinhas > 0 ? "R$ " + (r.custoRS / r.qtdGalinhas).toFixed(2).replace(".", ",") : "—"}</td>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Registrar Consumo" : "Editar Registro"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data</label>
                  <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Ração</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoRacao })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="milho">Milho Mix</option>
                    <option value="soja">Soja Blend</option>
                    <option value="comercial">Comercial</option>
                    <option value="custom">Fórmula Custom</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Aviário</label>
                <input type="text" value={form.aviario} onChange={(e) => setForm({ ...form, aviario: e.target.value })} placeholder="Ex: Aviário 1A" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Consumo (kg)</label>
                  <input type="number" value={form.consumoKg} onChange={(e) => setForm({ ...form, consumoKg: e.target.value })} placeholder="120" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Custo (R$)</label>
                  <input type="number" value={form.custoRS} onChange={(e) => setForm({ ...form, custoRS: e.target.value })} placeholder="48" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Qtd. Galinhas</label>
                  <input type="number" value={form.qtdGalinhas} onChange={(e) => setForm({ ...form, qtdGalinhas: e.target.value })} placeholder="800" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
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
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Confirmar exclusão</h3>
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir este registro?</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={() => deleteRegistro(deleteConfirm)} className="px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
