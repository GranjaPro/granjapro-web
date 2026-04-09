"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Skull,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Activity,
  AlertTriangle,
  Heart,
  Plus,
  X,
  Check,
  Pencil,
  Trash2,
  Calendar,
  Search,
  ChevronDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ── Mock Data ── */

interface RegistroMortalidade {
  id: number;
  data: string;
  quantidade: number;
  causa: string;
  galpao: string;
  observacao: string;
}

const lotesMortalidade: Record<
  string,
  {
    codigo: string;
    taxaMensal: number;
    totalMortes: number;
    mortesSemana: number;
    mortesMes: number;
    avesVivas: number;
    causaPrincipal: string;
    tendencia: "up" | "down" | "stable";
    semanal: { semana: string; mortes: number }[];
    causas: { causa: string; quantidade: number; porcentagem: number; color: string }[];
    mensal: { mes: string; mortes: number; taxa: number }[];
    registros: RegistroMortalidade[];
  }
> = {
  "1": {
    codigo: "L-2024-01",
    taxaMensal: 0.3,
    totalMortes: 12,
    mortesSemana: 1,
    mortesMes: 2,
    avesVivas: 788,
    causaPrincipal: "Natural",
    tendencia: "stable",
    semanal: [
      { semana: "S1", mortes: 1 },
      { semana: "S2", mortes: 0 },
      { semana: "S3", mortes: 1 },
      { semana: "S4", mortes: 0 },
      { semana: "S5", mortes: 1 },
      { semana: "S6", mortes: 0 },
    ],
    causas: [
      { causa: "Natural", quantidade: 8, porcentagem: 67, color: "#94a3b8" },
      { causa: "Predadores", quantidade: 2, porcentagem: 17, color: "#f59e0b" },
      { causa: "Doença", quantidade: 2, porcentagem: 16, color: "#ef4444" },
    ],
    mensal: [
      { mes: "Jan", mortes: 3, taxa: 0.38 },
      { mes: "Fev", mortes: 2, taxa: 0.25 },
      { mes: "Mar", mortes: 2, taxa: 0.25 },
      { mes: "Abr", mortes: 2, taxa: 0.25 },
    ],
    registros: [
      { id: 1, data: "2024-04-15", quantidade: 1, causa: "Natural", galpao: "Galpão A1", observacao: "Ave encontrada sem sinais de doença" },
      { id: 2, data: "2024-04-10", quantidade: 1, causa: "Predadores", galpao: "Galpão A1", observacao: "Possível ataque noturno" },
      { id: 3, data: "2024-03-28", quantidade: 1, causa: "Natural", galpao: "Galpão A2", observacao: "" },
      { id: 4, data: "2024-03-20", quantidade: 1, causa: "Doença", galpao: "Galpão A1", observacao: "Sintomas respiratórios detectados" },
      { id: 5, data: "2024-03-12", quantidade: 2, causa: "Doença", galpao: "Galpão A2", observacao: "Isolamento tardio" },
    ],
  },
  "2": {
    codigo: "L-2024-02",
    taxaMensal: 0.5,
    totalMortes: 9,
    mortesSemana: 1,
    mortesMes: 3,
    avesVivas: 591,
    causaPrincipal: "Respiratório",
    tendencia: "up",
    semanal: [
      { semana: "S1", mortes: 0 },
      { semana: "S2", mortes: 1 },
      { semana: "S3", mortes: 1 },
      { semana: "S4", mortes: 0 },
      { semana: "S5", mortes: 1 },
      { semana: "S6", mortes: 1 },
    ],
    causas: [
      { causa: "Respiratório", quantidade: 5, porcentagem: 56, color: "#ef4444" },
      { causa: "Natural", quantidade: 3, porcentagem: 33, color: "#94a3b8" },
      { causa: "Desconhecido", quantidade: 1, porcentagem: 11, color: "#a78bfa" },
    ],
    mensal: [
      { mes: "Jan", mortes: 1, taxa: 0.17 },
      { mes: "Fev", mortes: 2, taxa: 0.33 },
      { mes: "Mar", mortes: 3, taxa: 0.5 },
      { mes: "Abr", mortes: 3, taxa: 0.5 },
    ],
    registros: [
      { id: 1, data: "2024-04-16", quantidade: 1, causa: "Respiratório", galpao: "Galpão B1", observacao: "Coriza infecciosa" },
      { id: 2, data: "2024-04-12", quantidade: 1, causa: "Natural", galpao: "Galpão B1", observacao: "" },
      { id: 3, data: "2024-04-05", quantidade: 1, causa: "Respiratório", galpao: "Galpão B2", observacao: "Espirros frequentes" },
    ],
  },
  "3": {
    codigo: "L-2024-03",
    taxaMensal: 0.2,
    totalMortes: 4,
    mortesSemana: 0,
    mortesMes: 2,
    avesVivas: 996,
    causaPrincipal: "Natural",
    tendencia: "down",
    semanal: [
      { semana: "S1", mortes: 1 },
      { semana: "S2", mortes: 1 },
      { semana: "S3", mortes: 0 },
      { semana: "S4", mortes: 0 },
      { semana: "S5", mortes: 0 },
      { semana: "S6", mortes: 0 },
    ],
    causas: [
      { causa: "Natural", quantidade: 3, porcentagem: 75, color: "#94a3b8" },
      { causa: "Estresse", quantidade: 1, porcentagem: 25, color: "#f59e0b" },
    ],
    mensal: [
      { mes: "Jan", mortes: 2, taxa: 0.2 },
      { mes: "Fev", mortes: 1, taxa: 0.1 },
      { mes: "Mar", mortes: 1, taxa: 0.1 },
      { mes: "Abr", mortes: 0, taxa: 0.0 },
    ],
    registros: [
      { id: 1, data: "2024-03-18", quantidade: 1, causa: "Estresse", galpao: "Galpão C1", observacao: "Calor excessivo" },
      { id: 2, data: "2024-03-05", quantidade: 1, causa: "Natural", galpao: "Galpão C1", observacao: "" },
    ],
  },
  "4": {
    codigo: "L-2024-04",
    taxaMensal: 0.8,
    totalMortes: 24,
    mortesSemana: 2,
    mortesMes: 4,
    avesVivas: 476,
    causaPrincipal: "Natural",
    tendencia: "up",
    semanal: [
      { semana: "S1", mortes: 1 },
      { semana: "S2", mortes: 1 },
      { semana: "S3", mortes: 2 },
      { semana: "S4", mortes: 1 },
      { semana: "S5", mortes: 2 },
      { semana: "S6", mortes: 2 },
    ],
    causas: [
      { causa: "Natural", quantidade: 20, porcentagem: 83, color: "#94a3b8" },
      { causa: "Doença", quantidade: 4, porcentagem: 17, color: "#ef4444" },
    ],
    mensal: [
      { mes: "Jan", mortes: 5, taxa: 1.0 },
      { mes: "Fev", mortes: 4, taxa: 0.8 },
      { mes: "Mar", mortes: 4, taxa: 0.8 },
      { mes: "Abr", mortes: 4, taxa: 0.8 },
    ],
    registros: [
      { id: 1, data: "2024-04-17", quantidade: 2, causa: "Natural", galpao: "Galpão D1", observacao: "Aves encontradas sem sinais externos" },
      { id: 2, data: "2024-04-14", quantidade: 1, causa: "Doença", galpao: "Galpão D2", observacao: "Investigar contágio" },
      { id: 3, data: "2024-04-10", quantidade: 1, causa: "Natural", galpao: "Galpão D1", observacao: "" },
    ],
  },
};

const causaOptions = ["Natural", "Doença", "Respiratório", "Predadores", "Estresse", "Desconhecido"];

export default function MortalidadeLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const baseData =
    lotesMortalidade[loteId] ?? {
      codigo: "L003",
      taxaMensal: 0.6,
      totalMortes: 18,
      mortesSemana: 3,
      mortesMes: 6,
      avesVivas: 982,
      causaPrincipal: "Bicagem",
      tendencia: "up" as const,
      semanal: [
        { semana: "S1", mortes: 1 },
        { semana: "S2", mortes: 2 },
        { semana: "S3", mortes: 1 },
        { semana: "S4", mortes: 2 },
        { semana: "S5", mortes: 4 },
        { semana: "S6", mortes: 3 },
      ],
      causas: [
        { causa: "Bicagem", quantidade: 7, porcentagem: 39, color: "#f97316" },
        { causa: "Doença", quantidade: 5, porcentagem: 28, color: "#ef4444" },
        { causa: "Problema Nutricional", quantidade: 3, porcentagem: 17, color: "#eab308" },
        { causa: "Acidente", quantidade: 2, porcentagem: 11, color: "#06b6d4" },
        { causa: "Desconhecido", quantidade: 1, porcentagem: 5, color: "#94a3b8" },
      ],
      mensal: [
        { mes: "Jan", mortes: 3, taxa: 0.3 },
        { mes: "Fev", mortes: 4, taxa: 0.4 },
        { mes: "Mar", mortes: 5, taxa: 0.5 },
        { mes: "Abr", mortes: 6, taxa: 0.6 },
      ],
      registros: [
        { id: 1, data: "2026-04-05", quantidade: 2, causa: "Bicagem", galpao: "Galpão 1", observacao: "Bicagem entre aves jovens" },
        { id: 2, data: "2026-04-03", quantidade: 1, causa: "Doença", galpao: "Galpão 2", observacao: "Sintomas respiratórios" },
        { id: 3, data: "2026-04-01", quantidade: 1, causa: "Bicagem", galpao: "Galpão 1", observacao: "" },
        { id: 4, data: "2026-03-28", quantidade: 2, causa: "Problema Nutricional", galpao: "Galpão 3", observacao: "Deficiência de cálcio suspeita" },
      ],
    };

  const [registros, setRegistros] = useState<RegistroMortalidade[]>(baseData?.registros || []);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<RegistroMortalidade | null>(null);
  const [form, setForm] = useState({ data: "", quantidade: "", causa: "", galpao: "", observacao: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRegistros = useMemo(() => {
    if (!searchQuery.trim()) return registros;
    const q = searchQuery.toLowerCase();
    return registros.filter(
      (r) =>
        r.causa.toLowerCase().includes(q) ||
        r.galpao.toLowerCase().includes(q) ||
        r.observacao.toLowerCase().includes(q) ||
        r.data.includes(q)
    );
  }, [registros, searchQuery]);

  if (!baseData) {
    return (
      <div className="space-y-6">
        <Link
          href={`/dashboard/flocks/detalhes/${loteId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-gray-400">Dados não encontrados.</p>
        </div>
      </div>
    );
  }

  const data = baseData;

  function openAdd() {
    setForm({ data: "", quantidade: "1", causa: "", galpao: "", observacao: "" });
    setEditing(null);
    setModal("add");
  }

  function openEdit(r: RegistroMortalidade) {
    setForm({
      data: r.data,
      quantidade: String(r.quantidade),
      causa: r.causa,
      galpao: r.galpao,
      observacao: r.observacao,
    });
    setEditing(r);
    setModal("edit");
  }

  function save() {
    if (!form.data.trim() || !form.causa.trim() || !form.galpao.trim()) return;

    const registro: RegistroMortalidade = {
      id: editing?.id || Date.now(),
      data: form.data,
      quantidade: Number(form.quantidade) || 1,
      causa: form.causa,
      galpao: form.galpao,
      observacao: form.observacao,
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
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return dateStr;
    }
  }

  const PADRAO_LINHAGEM = 0.5;
  const totalInicial = data.avesVivas + data.totalMortes;
  const taxaTotal = (data.totalMortes / Math.max(1, totalInicial)) * 100;
  const ultimas3 = data.semanal.slice(-3).reduce((s, w) => s + w.mortes, 0);
  const media3Anteriores =
    data.semanal.slice(-6, -3).reduce((s, w) => s + w.mortes, 0) / 3 || 0;
  const picoAnormal = ultimas3 > Math.max(2, media3Anteriores * 2);
  const acimaPadrao = data.taxaMensal > PADRAO_LINHAGEM;
  const tendCresc = data.tendencia === "up";
  const desvioPadrao = ((data.taxaMensal - PADRAO_LINHAGEM) / PADRAO_LINHAGEM) * 100;

  const insightTendencia = useMemo(() => {
    if (data.tendencia === "down")
      return { label: "Estabilizando — quadro melhorando", tone: "emerald" };
    if (data.tendencia === "up")
      return { label: "Piorando — requer ação imediata", tone: "red" };
    return { label: "Estável — mantendo padrão atual", tone: "gray" };
  }, [data.tendencia]);

  const smartAlerts = useMemo(() => {
    const list: { level: "red" | "yellow"; text: string }[] = [];
    if (picoAnormal)
      list.push({ level: "red", text: "Pico anormal de mortalidade nos últimos 3 dias" });
    if (acimaPadrao)
      list.push({
        level: "red",
        text: `Acima do padrão da linhagem (${desvioPadrao > 0 ? "+" : ""}${desvioPadrao.toFixed(0)}%)`,
      });
    if (tendCresc && !picoAnormal)
      list.push({ level: "yellow", text: "Tendência de crescimento detectada" });
    return list;
  }, [picoAnormal, acimaPadrao, tendCresc, desvioPadrao]);

  const causasPadrao = useMemo(() => {
    const palette: Record<string, string> = {
      Doença: "#ef4444",
      Bicagem: "#f97316",
      "Problema Nutricional": "#eab308",
      Predador: "#a855f7",
      Acidente: "#06b6d4",
      Desconhecido: "#94a3b8",
      Outros: "#64748b",
    };
    const known = ["Doença", "Bicagem", "Problema Nutricional", "Predador", "Acidente", "Desconhecido", "Outros"];
    const map: Record<string, number> = {};
    data.causas.forEach((c) => {
      const key = known.includes(c.causa)
        ? c.causa
        : c.causa === "Respiratório"
        ? "Doença"
        : c.causa === "Estresse"
        ? "Outros"
        : c.causa === "Natural"
        ? "Outros"
        : "Outros";
      map[key] = (map[key] || 0) + c.quantidade;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return known
      .map((k) => ({
        causa: k,
        quantidade: map[k] || 0,
        porcentagem: Math.round(((map[k] || 0) / total) * 100),
        color: palette[k],
      }))
      .filter((c) => c.quantidade > 0);
  }, [data.causas]);

  const fasesMortalidade = useMemo(() => {
    const total = data.totalMortes || 1;
    return [
      { fase: "Inicial (0-6 sem)", pct: 25, mortes: Math.round(total * 0.25), color: "#fca5a5" },
      { fase: "Crescimento (6-18 sem)", pct: 35, mortes: Math.round(total * 0.35), color: "#f87171" },
      { fase: "Postura (18+ sem)", pct: 40, mortes: Math.round(total * 0.4), color: "#ef4444" },
    ];
  }, [data.totalMortes]);

  const correlations = useMemo(() => {
    const list: { titulo: string; descricao: string; impacto: "alto" | "médio" | "baixo" }[] = [];
    const temBicagem = data.causas.some((c) => /bicag/i.test(c.causa));
    const temDoenca = data.causas.some((c) => /(doen|respira)/i.test(c.causa));
    if (temBicagem)
      list.push({
        titulo: "Bicagem → Mortes",
        descricao: "Aumento de bicagem correlaciona com mortes recentes. Revisar densidade e enriquecimento ambiental.",
        impacto: "alto",
      });
    if (temDoenca)
      list.push({
        titulo: "Sintomas respiratórios → Mortalidade",
        descricao: "Casos respiratórios precedem aumento de mortes. Verificar ventilação e iniciar tratamento.",
        impacto: "alto",
      });
    list.push({
      titulo: "Inspeções regulares → Redução de mortes",
      descricao: "Lotes com inspeção semanal apresentam taxa até 30% menor.",
      impacto: "médio",
    });
    return list;
  }, [data.causas]);

  const mortalityScore = useMemo(() => {
    let score = 100;
    if (acimaPadrao) score -= Math.min(40, Math.max(10, desvioPadrao / 2));
    if (picoAnormal) score -= 25;
    if (tendCresc) score -= 15;
    else if (data.tendencia === "down") score += 5;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [acimaPadrao, desvioPadrao, picoAnormal, tendCresc, data.tendencia]);

  const mortalityStatus = useMemo(() => {
    if (mortalityScore >= 80)
      return {
        label: "Verde",
        text: "text-emerald-700",
        gradient: "from-emerald-50 to-emerald-50/40",
        border: "border-emerald-200",
      };
    if (mortalityScore >= 60)
      return {
        label: "Amarelo",
        text: "text-amber-700",
        gradient: "from-amber-50 to-amber-50/40",
        border: "border-amber-200",
      };
    return {
      label: "Vermelho",
      text: "text-red-700",
      gradient: "from-red-50 to-red-50/40",
      border: "border-red-200",
    };
  }, [mortalityScore]);

  const scoreColorMort =
    mortalityScore >= 80 ? "#10b981" : mortalityScore >= 60 ? "#f59e0b" : "#ef4444";

  const recomendacoesMort = useMemo(() => {
    const list: { text: string; impacto: "alto" | "médio" | "baixo" }[] = [];
    if (picoAnormal)
      list.push({ text: "Investigar causa do pico — isolar lote e coletar amostras", impacto: "alto" });
    if (acimaPadrao)
      list.push({ text: "Revisar manejo sanitário e ambiência do galpão", impacto: "alto" });
    if (causasPadrao.find((c) => c.causa === "Doença" && c.porcentagem >= 20))
      list.push({ text: "Acionar veterinário para diagnóstico clínico", impacto: "alto" });
    if (causasPadrao.find((c) => c.causa === "Bicagem" && c.porcentagem >= 15))
      list.push({ text: "Reduzir densidade e adicionar enriquecimento ambiental", impacto: "médio" });
    if (causasPadrao.find((c) => c.causa === "Problema Nutricional"))
      list.push({ text: "Revisar formulação da ração e qualidade da água", impacto: "médio" });
    if (tendCresc)
      list.push({ text: "Aumentar frequência de inspeções diárias", impacto: "médio" });
    if (causasPadrao.find((c) => c.causa === "Desconhecido" && c.porcentagem >= 20))
      list.push({ text: "Implementar necropsia para identificar causas ocultas", impacto: "médio" });
    if (list.length === 0)
      list.push({ text: "Manter monitoramento de rotina e registros diários", impacto: "baixo" });
    const order = { alto: 0, médio: 1, baixo: 2 } as const;
    return list.sort((a, b) => order[a.impacto] - order[b.impacto]).slice(0, 5);
  }, [picoAnormal, acimaPadrao, tendCresc, causasPadrao]);

  const TrendBadge = () => {
    if (data.tendencia === "stable")
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">
          <Minus className="w-3 h-3" /> Estável
        </span>
      );
    const isUp = data.tendencia === "up";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg",
          isUp ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
        )}
      >
        {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {isUp ? "Aumentando" : "Diminuindo"}
      </span>
    );
  };

  const kpis = [
    {
      title: "Mortalidade Total",
      value: `${taxaTotal.toFixed(2).replace(".", ",")}%`,
      icon: Activity,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      badge: `${data.totalMortes} de ${totalInicial.toLocaleString("pt-BR")} aves`,
      badgeDir: "neutral" as const,
    },
    {
      title: "Acumulada (mês)",
      value: `${data.taxaMensal.toFixed(2).replace(".", ",")}%`,
      icon: Skull,
      iconBg: data.taxaMensal <= 0.5 ? "bg-emerald-50" : data.taxaMensal <= 1.0 ? "bg-amber-50" : "bg-red-50",
      iconColor: data.taxaMensal <= 0.5 ? "text-emerald-600" : data.taxaMensal <= 1.0 ? "text-amber-600" : "text-red-500",
      badge: `${data.mortesMes} aves no mês`,
      badgeDir: "neutral" as const,
    },
    {
      title: "Hoje / Últimos 7 dias",
      value: `${data.semanal[data.semanal.length - 1]?.mortes ?? 0} / ${data.mortesSemana}`,
      icon: Calendar,
      iconBg: data.mortesSemana === 0 ? "bg-emerald-50" : "bg-amber-50",
      iconColor: data.mortesSemana === 0 ? "text-emerald-600" : "text-amber-600",
      badge: "aves perdidas",
      badgeDir: "neutral" as const,
    },
    {
      title: "Padrão da linhagem",
      value: `${PADRAO_LINHAGEM.toFixed(1).replace(".", ",")}%`,
      icon: Heart,
      iconBg: acimaPadrao ? "bg-red-50" : "bg-emerald-50",
      iconColor: acimaPadrao ? "text-red-500" : "text-emerald-600",
      badge: `${desvioPadrao > 0 ? "+" : ""}${desvioPadrao.toFixed(0)}% vs esperado`,
      badgeDir: acimaPadrao ? ("up" as const) : ("down" as const),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/flocks/detalhes/${loteId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Detalhes
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <Skull className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Mortalidade — {data.codigo}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-500">Análise detalhada de mortalidade</p>
                <TrendBadge />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status de Mortalidade */}
      <div
        className={cn(
          "bg-gradient-to-r rounded-2xl border p-5",
          mortalityStatus.gradient,
          mortalityStatus.border
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4 lg:min-w-[300px]">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={scoreColorMort}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${(mortalityScore / 100) * 175.9} 175.9`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn("text-base font-bold", mortalityStatus.text)}>
                  {mortalityScore}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-red-500" />
                <span className="text-sm font-bold text-gray-900">Status de mortalidade</span>
              </div>
              <p className={cn("text-xl font-bold mt-0.5", mortalityStatus.text)}>
                {mortalityStatus.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Taxa: {data.taxaMensal.toFixed(2).replace(".", ",")}% | Padrão: {PADRAO_LINHAGEM.toFixed(1).replace(".", ",")}%
              </p>
              <div className="mt-2">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                  Score baseado em:
                </p>
                <ul className="mt-1 space-y-0.5">
                  <li className="text-xs text-gray-600">• Desvio do padrão da linhagem</li>
                  <li className="text-xs text-gray-600">• Picos recentes de mortalidade</li>
                  <li className="text-xs text-gray-600">• Tendência de evolução</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="hidden lg:block w-px self-stretch bg-gray-200/70" />

          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
              Recomendações automáticas
            </p>
            <ul className="space-y-1.5">
              {recomendacoesMort.map((rec, i) => {
                const impactColor =
                  rec.impacto === "alto"
                    ? "text-red-600"
                    : rec.impacto === "médio"
                    ? "text-amber-600"
                    : "text-emerald-600";
                const dotColor =
                  rec.impacto === "alto"
                    ? "bg-red-500"
                    : rec.impacto === "médio"
                    ? "bg-amber-500"
                    : "bg-emerald-500";
                return (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0", dotColor)} />
                    <span>
                      {rec.text}{" "}
                      <span className={cn("font-semibold", impactColor)}>
                        (impacto: {rec.impacto})
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Smart Alerts */}
      {smartAlerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Alertas inteligentes</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Sinais detectados automaticamente
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {smartAlerts.map((a, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3",
                  a.level === "red"
                    ? "bg-red-50 border-red-200"
                    : "bg-amber-50 border-amber-200"
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 w-2 h-2 rounded-full flex-shrink-0",
                    a.level === "red" ? "bg-red-500" : "bg-amber-500"
                  )}
                />
                <p
                  className={cn(
                    "text-sm font-medium",
                    a.level === "red" ? "text-red-800" : "text-amber-800"
                  )}
                >
                  {a.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.title}
            className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", kpi.iconBg)}>
                <kpi.icon className={cn("w-5 h-5", kpi.iconColor)} />
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-lg",
                  kpi.badgeDir === "up" && "text-red-600 bg-red-50",
                  kpi.badgeDir === "down" && "text-emerald-700 bg-emerald-50",
                  kpi.badgeDir === "neutral" && "text-gray-500 bg-gray-50"
                )}
              >
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Area Chart - Mortes por Semana */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Tendência de mortalidade</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Pico:{" "}
                {Math.max(...data.semanal.map((s) => s.mortes))} aves ·{" "}
                <span
                  className={cn(
                    "font-semibold",
                    insightTendencia.tone === "red"
                      ? "text-red-600"
                      : insightTendencia.tone === "emerald"
                      ? "text-emerald-600"
                      : "text-gray-500"
                  )}
                >
                  {insightTendencia.label}
                </span>
              </p>
            </div>
            <TrendingDown className="w-4 h-4 text-gray-300" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.semanal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMortes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="60%" stopColor="#ef4444" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: "13px",
                  padding: "10px 14px",
                }}
                labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
                formatter={(value: unknown) => [Number(value), "Mortes"]}
              />
              <Area
                type="monotone"
                dataKey="mortes"
                stroke="#ef4444"
                strokeWidth={2.5}
                fill="url(#colorMortes)"
                dot={{ r: 5, fill: "#fff", stroke: "#ef4444", strokeWidth: 2.5 }}
                activeDot={{ r: 7, fill: "#ef4444", stroke: "#fff", strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Causas */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Causas de Mortalidade</h3>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={causasPadrao}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="quantidade"
                  nameKey="causa"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {causasPadrao.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: "13px",
                    padding: "10px 14px",
                  }}
                  formatter={((value: any, name: any) => [`${Number(value)} mortes`, String(name)]) as any}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2.5 mt-2">
              {causasPadrao.map((c) => (
                <div key={c.causa} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-sm text-gray-600">{c.causa}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{c.quantidade}</span>
                    <span className="text-sm font-bold text-gray-900">{c.porcentagem}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-6">Evolução Mensal</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.mensal} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dx={-4} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                fontSize: "13px",
                padding: "10px 14px",
              }}
              labelStyle={{ fontWeight: 700, color: "#111827", marginBottom: "6px" }}
              formatter={((value: any, name: any) => {
                if (String(name) === "mortes") return [Number(value), "Mortes"];
                return [`${Number(value)}%`, "Taxa"];
              }) as any}
            />
            <Bar dataKey="mortes" fill="#fca5a5" radius={[6, 6, 0, 0]} name="mortes" />
            <Bar dataKey="taxa" fill="#ef4444" radius={[6, 6, 0, 0]} name="taxa" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Fase do lote + Correlação saúde */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <Skull className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Mortalidade por fase do lote</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Distribuição estimada por estágio produtivo
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {fasesMortalidade.map((f) => (
              <div key={f.fase}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">{f.fase}</span>
                  <span className="text-xs font-semibold text-gray-500">
                    {f.mortes} aves · {f.pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${f.pct}%`, backgroundColor: f.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Heart className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Correlação com saúde</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Relações detectadas entre saúde e mortalidade
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {correlations.map((c, i) => {
              const tone =
                c.impacto === "alto"
                  ? { dot: "bg-red-500", text: "text-red-600" }
                  : c.impacto === "médio"
                  ? { dot: "bg-amber-500", text: "text-amber-600" }
                  : { dot: "bg-emerald-500", text: "text-emerald-600" };
              return (
                <div
                  key={i}
                  className="rounded-xl border border-gray-100 bg-gray-50/70 p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("w-2 h-2 rounded-full", tone.dot)} />
                    <p className="text-sm font-semibold text-gray-900">{c.titulo}</p>
                    <span className={cn("ml-auto text-[11px] font-semibold", tone.text)}>
                      Impacto {c.impacto}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{c.descricao}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Registrar Mortalidade" : "Editar Registro"}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Causa</label>
                  <select
                    value={form.causa}
                    onChange={(e) => setForm({ ...form, causa: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {causaOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Galpão</label>
                  <input
                    type="text"
                    placeholder="Ex: Galpão A1"
                    value={form.galpao}
                    onChange={(e) => setForm({ ...form, galpao: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Observação</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes sobre a ocorrência..."
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all placeholder:text-gray-400 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                {modal === "add" ? "Registrar" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
