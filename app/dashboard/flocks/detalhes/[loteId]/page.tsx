"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
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
  ChevronRight,
  Droplets,
  ShieldCheck,
  Settings,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";

interface Lote {
  id: string;
  code: string;
  breed: string;
  bird_count: number;
  age_weeks: number;
  production_system: string;
  status: string;
  supplier: string | null;
  supplier_contact: string | null;
  arrival_date: string;
  origin: string | null;
  lineage: string | null;
  avg_weight_kg: number | null;
  barn_name: string | null;
}

const statusLabel: Record<string, string> = {
  active: "Ativo",
  growing: "Crescimento",
  declining: "Declínio",
  disposed: "Descartado",
};

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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

export default function DetalhesLotePage() {
  const params = useParams();
  const loteId = params.loteId as string;
  const { farm, loading: authLoading } = useAuth();

  const [lote, setLote] = useState<Lote | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!farm) { setFetching(false); return; }
    let cancelled = false;
    const supabase = createClient();

    async function fetchLote() {
      setFetching(true);
      const { data } = await supabase
        .from("flocks")
        .select("*, barns(name)")
        .eq("id", loteId)
        .eq("farm_id", farm!.id)
        .single();

      if (cancelled) return;

      if (data) {
        setLote({
          id: data.id,
          code: data.code,
          breed: data.breed,
          bird_count: data.bird_count,
          age_weeks: data.age_weeks ?? 0,
          production_system: data.production_system ?? "",
          status: data.status,
          supplier: data.supplier,
          supplier_contact: data.supplier_contact,
          arrival_date: data.arrival_date,
          origin: data.origin,
          lineage: data.lineage,
          avg_weight_kg: data.avg_weight_kg,
          barn_name: (data as any).barns?.name ?? null,
        });
      }
      setFetching(false);
    }

    fetchLote();
    return () => { cancelled = true; };
  }, [authLoading, farm, loteId]);

  if (authLoading || fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

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

  const dias = daysSinceArrival(lote.arrival_date);

  const kpiCards = [
    {
      label: "Produção",
      href: `/dashboard/flocks/detalhes/${loteId}/producao`,
      icon: Egg,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      sub: "Registre a produção diária de ovos",
    },
    {
      label: "Ração",
      href: `/dashboard/flocks/detalhes/${loteId}/racao`,
      icon: Wheat,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      sub: "Registre o consumo de ração",
    },
    {
      label: "Saúde",
      href: `/dashboard/flocks/detalhes/${loteId}/saude`,
      icon: HeartPulse,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      sub: "Registre procedimentos sanitários",
    },
    {
      label: "Mortalidade",
      href: `/dashboard/flocks/detalhes/${loteId}/mortalidade`,
      icon: Skull,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      sub: "Registre ocorrências de mortalidade",
    },
    {
      label: "Consumo de Água",
      href: `/dashboard/flocks/detalhes/${loteId}/producao`,
      icon: Droplets,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      sub: "Registre o consumo de água",
    },
    {
      label: "Histórico Sanitário",
      href: `/dashboard/flocks/detalhes/${loteId}/saude`,
      icon: ShieldCheck,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-600",
      sub: "Vacinas e procedimentos",
    },
    {
      label: "Operacional",
      href: `/dashboard/flocks/detalhes/${loteId}/producao`,
      icon: Settings,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      sub: "Alertas e equipe do lote",
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
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Detalhes do Lote — {lote.code}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{lote.breed} · {lote.production_system || "—"} · {statusLabel[lote.status] ?? lote.status}</p>
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
              { icon: Tag, label: "Código", value: lote.code },
              { icon: Bird, label: "Raça", value: lote.breed },
              { icon: Dna, label: "Linhagem", value: lote.lineage ?? "—" },
              { icon: Bird, label: "Quantidade de Aves", value: lote.bird_count.toLocaleString("pt-BR") },
              { icon: Clock, label: "Idade", value: `${lote.age_weeks} semanas` },
              { icon: Weight, label: "Peso Médio", value: lote.avg_weight_kg ? `${lote.avg_weight_kg.toLocaleString("pt-BR")} kg` : "—" },
              { icon: Building2, label: "Galpão", value: lote.barn_name ?? "—" },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <div className="flex items-center justify-between py-3.5 group">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors" />
                    <span className="text-sm text-gray-500">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
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
            {lote.supplier ? (
              <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-50/50 border border-gray-100 p-5 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Truck className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{lote.supplier}</p>
                    {lote.supplier_contact && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500">{formatPhone(lote.supplier_contact)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 mb-6 text-center">
                <p className="text-sm text-gray-400">Nenhum fornecedor informado</p>
              </div>
            )}
            <div className="space-y-0">
              {[
                { icon: MapPin, label: "Origem", value: lote.origin ?? "—" },
                { icon: Calendar, label: "Data de Chegada", value: formatDate(lote.arrival_date) },
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

      {/* KPI Cards — Day 0 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-100/60 hover:border-gray-200 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.iconBg)}>
                  <card.icon className={cn("w-[18px] h-[18px]", card.iconColor)} />
                </div>
                <span className="text-[13px] font-bold text-gray-900">{card.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-2xl font-bold text-gray-300 tracking-tight mb-1">—</p>
            <p className="text-xs text-gray-400">{card.sub}</p>
            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
              <div className="h-full rounded-full bg-gray-200 w-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
