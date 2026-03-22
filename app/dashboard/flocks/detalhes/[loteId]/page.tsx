"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Layers,
  Truck,
  Calendar,
  MapPin,
  Bird,
  Weight,
  Egg,
  Clock,
  Building2,
  Phone,
  Tag,
  Dna,
  Wheat,
  HeartPulse,
  Skull,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Droplets,
  ShieldCheck,
  Wrench,
  Syringe,
  Bug,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LoteData {
  codigo: string;
  raca: string;
  aves: number;
  idade: string;
  postura: string;
  sistema: string;
  status: string;
  fornecedor: string;
  fornecedorContato: string;
  dataChegada: string;
  origem: string;
  linhagem: string;
  pesoMedio: string;
  galpao: string;
}

interface LoteKPIs {
  producao: { taxaPostura: number; mediaOvosDia: number; tendencia: "up" | "down" | "stable" };
  racao: { consumoDiario: number; consumoAve: number; tendencia: "up" | "down" | "stable" };
  saude: { score: number; tratamentosAtivos: number; tendencia: "up" | "down" | "stable" };
  mortalidade: { taxaMensal: number; mortesSemana: number; tendencia: "up" | "down" | "stable" };
}

const lotesData: Record<string, LoteData> = {
  "1": {
    codigo: "L-2024-01", raca: "Hy-Line Brown", aves: 800, idade: "42 semanas", postura: "92%",
    sistema: "Cage-Free", status: "Ativo", fornecedor: "Avícola São Paulo Ltda.",
    fornecedorContato: "(11) 99876-5432", dataChegada: "2023-06-15", origem: "Campinas, SP",
    linhagem: "Hy-Line International", pesoMedio: "1,85 kg", galpao: "Galpão Vale Verde",
  },
  "2": {
    codigo: "L-2024-02", raca: "Lohmann LSL", aves: 600, idade: "28 semanas", postura: "88%",
    sistema: "Free Range", status: "Ativo", fornecedor: "Granja Lohmann Brasil",
    fornecedorContato: "(41) 98765-4321", dataChegada: "2023-09-20", origem: "Curitiba, PR",
    linhagem: "Lohmann Tierzucht", pesoMedio: "1,72 kg", galpao: "Galpão Nascente",
  },
  "3": {
    codigo: "L-2024-03", raca: "ISA Brown", aves: 1000, idade: "18 semanas", postura: "—",
    sistema: "Gaiola", status: "Crescimento", fornecedor: "ISA Poultry Brasil",
    fornecedorContato: "(19) 97654-3210", dataChegada: "2023-11-10", origem: "Jundiaí, SP",
    linhagem: "Hendrix Genetics", pesoMedio: "1,45 kg", galpao: "Galpão Central",
  },
  "4": {
    codigo: "L-2024-04", raca: "Novogen Brown", aves: 500, idade: "60 semanas", postura: "78%",
    sistema: "Orgânico", status: "Declínio", fornecedor: "Novogen do Brasil",
    fornecedorContato: "(31) 96543-2109", dataChegada: "2023-03-05", origem: "Belo Horizonte, MG",
    linhagem: "Novogen SAS", pesoMedio: "2,10 kg", galpao: "Galpão Central",
  },
};

const lotesKPIs: Record<string, LoteKPIs> = {
  "1": {
    producao: { taxaPostura: 92, mediaOvosDia: 736, tendencia: "up" },
    racao: { consumoDiario: 96, consumoAve: 120, tendencia: "stable" },
    saude: { score: 96, tratamentosAtivos: 0, tendencia: "up" },
    mortalidade: { taxaMensal: 0.3, mortesSemana: 1, tendencia: "stable" },
  },
  "2": {
    producao: { taxaPostura: 88, mediaOvosDia: 528, tendencia: "up" },
    racao: { consumoDiario: 69, consumoAve: 115, tendencia: "up" },
    saude: { score: 82, tratamentosAtivos: 1, tendencia: "down" },
    mortalidade: { taxaMensal: 0.5, mortesSemana: 1, tendencia: "up" },
  },
  "3": {
    producao: { taxaPostura: 0, mediaOvosDia: 0, tendencia: "stable" },
    racao: { consumoDiario: 85, consumoAve: 85, tendencia: "up" },
    saude: { score: 91, tratamentosAtivos: 0, tendencia: "up" },
    mortalidade: { taxaMensal: 0.2, mortesSemana: 0, tendencia: "down" },
  },
  "4": {
    producao: { taxaPostura: 78, mediaOvosDia: 390, tendencia: "down" },
    racao: { consumoDiario: 62.5, consumoAve: 125, tendencia: "stable" },
    saude: { score: 88, tratamentosAtivos: 0, tendencia: "up" },
    mortalidade: { taxaMensal: 0.8, mortesSemana: 2, tendencia: "up" },
  },
};

export default function DetalhesLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const lote = lotesData[loteId];
  const kpis = lotesKPIs[loteId];

  if (!lote) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/flocks" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Lotes
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-gray-400">Lote não encontrado.</p>
        </div>
      </div>
    );
  }

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch { return dateStr; }
  }

  function daysSinceArrival(dateStr: string) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return Math.floor((new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    } catch { return 0; }
  }

  const dias = daysSinceArrival(lote.dataChegada);

  const allKpiCards = [
    {
      label: "Produção",
      href: `/dashboard/flocks/detalhes/${loteId}/producao`,
      icon: Egg,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      value: `${kpis.producao.taxaPostura}%`,
      sub: `${kpis.producao.mediaOvosDia.toLocaleString("pt-BR")} ovos/dia`,
      trend: kpis.producao.tendencia,
      trendGood: "up" as const,
      bar: kpis.producao.taxaPostura,
      barColor: kpis.producao.taxaPostura >= 85 ? "bg-emerald-500" : kpis.producao.taxaPostura >= 70 ? "bg-amber-500" : "bg-red-500",
    },
    {
      label: "Ração",
      href: `/dashboard/flocks/detalhes/${loteId}/racao`,
      icon: Wheat,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      value: `${kpis.racao.consumoDiario} kg`,
      sub: `${kpis.racao.consumoAve} g/ave/dia`,
      trend: kpis.racao.tendencia,
      trendGood: "down" as const,
      bar: Math.min((kpis.racao.consumoAve / 140) * 100, 100),
      barColor: "bg-orange-400",
    },
    {
      label: "Saúde",
      href: `/dashboard/flocks/detalhes/${loteId}/saude`,
      icon: HeartPulse,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      value: `${kpis.saude.score}%`,
      sub: kpis.saude.tratamentosAtivos > 0 ? `${kpis.saude.tratamentosAtivos} tratamento(s)` : "Saudável",
      trend: kpis.saude.tendencia,
      trendGood: "up" as const,
      bar: kpis.saude.score,
      barColor: kpis.saude.score >= 90 ? "bg-emerald-500" : kpis.saude.score >= 75 ? "bg-amber-500" : "bg-red-500",
    },
    {
      label: "Mortalidade",
      href: `/dashboard/flocks/detalhes/${loteId}/mortalidade`,
      icon: Skull,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      value: `${kpis.mortalidade.taxaMensal.toFixed(1).replace(".", ",")}%`,
      sub: `${kpis.mortalidade.mortesSemana} esta semana`,
      trend: kpis.mortalidade.tendencia,
      trendGood: "down" as const,
      bar: Math.min(kpis.mortalidade.taxaMensal * 20, 100),
      barColor: kpis.mortalidade.taxaMensal <= 0.5 ? "bg-emerald-500" : kpis.mortalidade.taxaMensal <= 1.0 ? "bg-amber-500" : "bg-red-500",
    },
    {
      label: "Consumo de Água",
      href: `/dashboard/flocks/detalhes/${loteId}/producao`,
      icon: Droplets,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      value: `${Math.round(lote.aves * 0.25)} L`,
      sub: "250 ml/ave/dia",
      trend: "stable" as const,
      trendGood: "down" as const,
      bar: 65,
      barColor: "bg-blue-400",
    },
    {
      label: "Histórico Sanitário",
      href: `/dashboard/flocks/detalhes/${loteId}/saude`,
      icon: ShieldCheck,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-600",
      value: "4",
      sub: "Procedimentos este mês",
      trend: "up" as const,
      trendGood: "up" as const,
      bar: 100,
      barColor: "bg-teal-500",
    },
    {
      label: "Operacional",
      href: `/dashboard/flocks/detalhes/${loteId}/producao`,
      icon: Users,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      value: "0",
      sub: "Alertas ativos · 3 funcionários",
      trend: "stable" as const,
      trendGood: "down" as const,
      bar: 95,
      barColor: "bg-violet-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/dashboard/flocks" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Lotes
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
            <Layers className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Detalhes do Lote — {lote.codigo}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{lote.raca} · {lote.sistema} · {lote.status}</p>
          </div>
        </div>
      </div>

      {/* Detail Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações do Lote */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Layers className="w-4 h-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Informações do Lote</h3>
          </div>
          <div className="p-6 space-y-0">
            {[
              { icon: Tag, label: "Código", value: lote.codigo },
              { icon: Bird, label: "Raça", value: lote.raca },
              { icon: Dna, label: "Linhagem", value: lote.linhagem },
              { icon: Bird, label: "Quantidade de Aves", value: lote.aves.toLocaleString("pt-BR") },
              { icon: Clock, label: "Idade", value: lote.idade },
              { icon: Weight, label: "Peso Médio", value: lote.pesoMedio },
              { icon: Egg, label: "Taxa de Postura", value: lote.postura, highlight: true },
              { icon: Building2, label: "Galpão", value: lote.galpao },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <div className="flex items-center justify-between py-3.5 group">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors" />
                    <span className="text-sm text-gray-500">{item.label}</span>
                  </div>
                  <span className={cn("text-sm font-semibold", item.highlight ? "text-brand-600" : "text-gray-900")}>
                    {item.value}
                  </span>
                </div>
                {i < arr.length - 1 && <div className="border-t border-gray-50" />}
              </div>
            ))}
          </div>
        </div>

        {/* Fornecedor e Origem */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Truck className="w-4 h-4 text-violet-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Fornecedor e Origem</h3>
          </div>
          <div className="p-6">
            <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-50/50 border border-gray-100 p-5 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Truck className="w-5 h-5 text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{lote.fornecedor}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">{lote.fornecedorContato}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-0">
              {[
                { icon: MapPin, label: "Origem", value: lote.origem },
                { icon: Calendar, label: "Data de Chegada", value: formatDate(lote.dataChegada) },
                { icon: Clock, label: "Dias na Granja", value: `${dias} dias` },
              ].map((item, i, arr) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between py-3.5 group">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors" />
                      <span className="text-sm text-gray-500">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                  </div>
                  {i < arr.length - 1 && <div className="border-t border-gray-50" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards — Top row: 4 cols, Bottom row: 3 cols */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {allKpiCards.slice(0, 4).map((card) => {
          const TrendEl = () => {
            if (card.trend === "stable") return <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Estável</span>;
            const isGood = card.trend === card.trendGood;
            const Icon = card.trend === "up" ? ArrowUpRight : ArrowDownRight;
            return (
              <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full", isGood ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50")}>
                <Icon className="w-3 h-3" />
                {isGood ? "Bom" : "Atenção"}
              </span>
            );
          };
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-100/60 hover:border-gray-200 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.iconBg)}>
                    <card.icon className={cn("w-[18px] h-[18px]", card.iconColor)} />
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">{card.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="flex items-end justify-between mb-1">
                <p className="text-2xl font-bold text-gray-900 tracking-tight">{card.value}</p>
                <TrendEl />
              </div>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              <div className="w-full h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", card.barColor)} style={{ width: `${card.bar}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {allKpiCards.slice(4).map((card) => {
          const TrendEl = () => {
            if (card.trend === "stable") return <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Estável</span>;
            const isGood = card.trend === card.trendGood;
            const Icon = card.trend === "up" ? ArrowUpRight : ArrowDownRight;
            return (
              <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full", isGood ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50")}>
                <Icon className="w-3 h-3" />
                {isGood ? "Bom" : "Atenção"}
              </span>
            );
          };
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-100/60 hover:border-gray-200 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.iconBg)}>
                    <card.icon className={cn("w-[18px] h-[18px]", card.iconColor)} />
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">{card.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="flex items-end justify-between mb-1">
                <p className="text-2xl font-bold text-gray-900 tracking-tight">{card.value}</p>
                <TrendEl />
              </div>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              <div className="w-full h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", card.barColor)} style={{ width: `${card.bar}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
