"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Layers, Plus, Pencil, Trash2, X, Check, Search, FileText, Loader2, Bird } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { insightHref } from "@/lib/insight-links";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import ModalPortal from "@/components/ui/modal-portal";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/plan/locked-overlay";
import { FarmHealthBanner, type FarmHealthInsight } from "@/components/dashboard/farm-health-banner";
import type { TablesInsert } from "@/lib/database.types";
import {
  calculateEggProductionMetrics,
  calculateRecordedFlockProductionMetrics,
  getProductionPhase,
  getProductionPhaseLabel,
  getProductionPhaseName,
  type ProductionPhase,
} from "@/lib/domain/egg-production-metrics";

type PersistedProductionStage = "cria" | "recria" | "pre-postura" | "producao" | "pico" | "estavel" | "declinio" | "descarte";

function getPersistedProductionStage(ageWeeks: number): PersistedProductionStage {
  if (ageWeeks <= 5) return "cria";
  if (ageWeeks <= 16) return "recria";
  if (ageWeeks <= 18) return "pre-postura";
  if (ageWeeks <= 28) return "producao";
  if (ageWeeks <= 40) return "pico";
  if (ageWeeks <= 60) return "estavel";
  if (ageWeeks <= 80) return "declinio";
  return "descarte";
}

function calculateCurrentAge(arrivalDate: string, arrivalAgeWeeks: number): number {
  const arrival = new Date(arrivalDate);
  const now = new Date();
  const diffMs = now.getTime() - arrival.getTime();
  const weeksSinceArrival = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return arrivalAgeWeeks + weeksSinceArrival;
}

interface Lote {
  id: string;
  code: string;
  breed: string;
  bird_count: number;
  arrival_age_weeks: number;
  production_system: string;
  status: PersistedProductionStage;
  supplier: string | null;
  supplier_contact: string | null;
  arrival_date: string;
  origin: string | null;
  lineage: string | null;
  avg_weight_kg: number | null;
  barn_id: string;
  barn_name: string | null;
  live_birds: number;
  laying_rate: number | null;
}

interface Barn {
  id: string;
  name: string;
  capacity: number;
  current_birds: number;
  production_system?: string;
}

type FlockWithBarnName = {
  id: string;
  code: string;
  breed: string;
  bird_count: number;
  arrival_age_weeks: number | null;
  production_system: string;
  status: string;
  supplier: string | null;
  supplier_contact: string | null;
  arrival_date: string;
  origin: string | null;
  lineage: string | null;
  avg_weight_kg: number | null;
  barn_id: string;
  barns?: { name?: string | null } | null;
};

const sistemaLabel: Record<string, string> = {
  "Cage-Free": "Cage-Free",
  "cage-free": "Cage-Free",
  "Gaiola": "Gaiola",
  "gaiola": "Gaiola",
  "Caipira": "Caipira",
  "caipira": "Caipira",
  "Orgânico": "Orgânico",
  "organico": "Orgânico",
};

const sistemaColor: Record<string, string> = {
  "Cage-Free": "text-teal-800 bg-teal-100",
  "cage-free": "text-teal-800 bg-teal-100",
  "Gaiola": "text-emerald-800 bg-emerald-100",
  "gaiola": "text-emerald-800 bg-emerald-100",
  "Caipira": "text-orange-800 bg-orange-100",
  "caipira": "text-orange-800 bg-orange-100",
  "Orgânico": "text-green-800 bg-green-100",
  "organico": "text-green-800 bg-green-100",
};

const stageColor: Record<ProductionPhase, string> = {
  cria: "text-purple-700 bg-purple-100",
  recria: "text-indigo-700 bg-indigo-100",
  "pre-postura": "text-cyan-700 bg-cyan-100",
  "inicio-producao": "text-blue-700 bg-blue-100",
  "subida-producao": "text-teal-700 bg-teal-100",
  pico: "text-emerald-800 bg-emerald-100",
  "producao-estavel": "text-brand-700 bg-brand-100",
  "declinio-inicial": "text-amber-700 bg-amber-100",
  "declinio-acentuado": "text-orange-700 bg-orange-100",
  "final-ciclo": "text-red-700 bg-red-100",
};

const filterPhases: ProductionPhase[] = [
  "cria",
  "recria",
  "pre-postura",
  "inicio-producao",
  "subida-producao",
  "pico",
  "producao-estavel",
  "declinio-inicial",
  "declinio-acentuado",
  "final-ciclo",
];

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
  arrival_age_weeks: "",
  production_system: "",
  supplier: "",
  supplier_contact: "",
  arrival_date: "",
  origin: "",
  lineage: "",
  avg_weight_kg: "",
  barn_id: "",
};

export default function LotesPage() {
  const { farm, loading: authLoading } = useAuth();
  const { plan } = usePlan();

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [barns, setBarns] = useState<Barn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<ProductionPhase | "todos">("todos");
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Lote | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");

  const farmRef = useRef(farm);
  farmRef.current = farm;

  const fetchData = useCallback(async () => {
    const currentFarm = farmRef.current;
    if (!currentFarm) { setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [flocksRes, barnsRes, productionRes, mortalityRes] = await Promise.all([
        supabase
          .from("flocks")
          .select("*, barns(name)")
          .eq("farm_id", currentFarm.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("barns")
          .select("id, name, capacity, current_birds, production_system")
          .eq("farm_id", currentFarm.id)
          .order("name"),
        supabase
          .from("egg_production")
          .select("flock_id, date, eggs_produced")
          .eq("farm_id", currentFarm.id)
          .lte("date", today),
        supabase
          .from("mortality")
          .select("flock_id, date, dead_birds")
          .eq("farm_id", currentFarm.id)
          .lte("date", today),
      ]);

      const productionRecords = (productionRes.data ?? []).map((record) => ({
        flockId: record.flock_id,
        date: record.date,
        eggsProduced: record.eggs_produced,
      }));
      const mortalities = (mortalityRes.data ?? []).map((mortality) => ({
        flockId: mortality.flock_id,
        date: mortality.date,
        deadBirds: mortality.dead_birds,
      }));
      const mappedLotes: Lote[] = ((flocksRes.data ?? []) as FlockWithBarnName[]).map((flock) => {
        const arrivalAgeWeeks = flock.arrival_age_weeks ?? 0;
        const stayStartDate = flock.arrival_date <= today ? flock.arrival_date : today;
        const flockMetric = {
          id: flock.id,
          birdCount: flock.bird_count,
          arrivalAgeWeeks,
          arrivalDate: flock.arrival_date,
        };
        const productionMetrics = calculateRecordedFlockProductionMetrics({
          flock: flockMetric,
          mortalities,
          productionRecords,
          startDate: stayStartDate,
          endDate: today,
        });
        const stayMetrics = calculateEggProductionMetrics({
          flocks: [flockMetric],
          mortalities,
          startDate: stayStartDate,
          endDate: today,
          totalEggs: productionMetrics.totalEggs,
        });

        return {
          id: flock.id,
          code: flock.code,
          breed: flock.breed,
          bird_count: flock.bird_count,
          arrival_age_weeks: arrivalAgeWeeks,
          production_system: flock.production_system,
          status: flock.status as PersistedProductionStage,
          supplier: flock.supplier,
          supplier_contact: flock.supplier_contact,
          arrival_date: flock.arrival_date,
          origin: flock.origin,
          lineage: flock.lineage,
          avg_weight_kg: flock.avg_weight_kg,
          barn_id: flock.barn_id,
          barn_name: flock.barns?.name ?? null,
          live_birds: productionMetrics.liveBirds,
          laying_rate: productionMetrics.recordedDays > 0 && stayMetrics.eligibleBirdDays > 0
            ? stayMetrics.layingRate
            : null,
        };
      });

      setLotes(mappedLotes);

      if (barnsRes.data) {
        setBarns(barnsRes.data as Barn[]);
      }

    } catch (err) {
      console.error("Error fetching flocks:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || !farm) return;
    fetchData();
  }, [authLoading, farm, fetchData]);

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
      arrival_age_weeks: String(Math.round(l.arrival_age_weeks * 7)),
      production_system: l.production_system,
      supplier: l.supplier ?? "",
      supplier_contact: l.supplier_contact ? formatPhone(l.supplier_contact) : "",
      arrival_date: l.arrival_date,
      origin: l.origin ?? "",
      lineage: l.lineage ?? "",
      avg_weight_kg: l.avg_weight_kg ? String(l.avg_weight_kg) : "",
      barn_id: l.barn_id,
    });
    setEditing(l);
    setError("");
    setModal("edit");
  }

  async function save() {
    if (!farm) return;
    if (!form.code.trim() || !form.breed.trim() || !form.arrival_date || !form.barn_id) {
      setError("Preencha código, raça, data de chegada e selecione um galpão.");
      return;
    }

    const newBirdCount = Number(form.bird_count) || 0;
    if (form.barn_id && newBirdCount > 0) {
      const barn = barns.find((b) => b.id === form.barn_id);
      if (barn && barn.capacity > 0) {
        const editingInSameBarn = editing && editing.barn_id === form.barn_id;
        const available = barn.capacity - barn.current_birds + (editingInSameBarn ? editing.bird_count : 0);
        if (newBirdCount > available) {
          const ocupado = barn.current_birds - (editingInSameBarn ? editing.bird_count : 0);
          setError(`Capacidade insuficiente no ${barn.name}. Você tentou adicionar ${newBirdCount.toLocaleString("pt-BR")} aves. Disponível: ${available.toLocaleString("pt-BR")} (capacidade: ${barn.capacity.toLocaleString("pt-BR")}, ocupado: ${ocupado.toLocaleString("pt-BR")}).`);
          return;
        }
      }
    }

    setSaving(true);
    setError("");

    const arrivalAgeDays = Number(form.arrival_age_weeks) || 0;
    const arrivalAgeWeeks = Math.round(arrivalAgeDays / 7);
    const currentAge = calculateCurrentAge(form.arrival_date, arrivalAgeWeeks);
    const record: TablesInsert<"flocks"> = {
      farm_id: farm.id,
      code: form.code,
      breed: form.breed,
      bird_count: Number(form.bird_count) || 0,
      arrival_age_weeks: arrivalAgeWeeks,
      production_system: form.production_system,
      status: getPersistedProductionStage(currentAge),
      supplier: form.supplier || null,
      supplier_contact: unformatPhone(form.supplier_contact) || null,
      arrival_date: form.arrival_date,
      origin: form.origin || null,
      lineage: form.lineage || null,
      avg_weight_kg: form.avg_weight_kg ? Number(form.avg_weight_kg) : null,
      barn_id: form.barn_id,
    };

    const supabase = createClient();
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

      // Sync current_birds on affected barns
      const affectedBarnIds = new Set<string>();
      if (form.barn_id) affectedBarnIds.add(form.barn_id);
      if (editing?.barn_id && editing.barn_id !== form.barn_id) affectedBarnIds.add(editing.barn_id);

      for (const barnId of affectedBarnIds) {
        const { data: barnFlocks } = await supabase
          .from("flocks")
          .select("bird_count")
          .eq("barn_id", barnId);
        const total = (barnFlocks ?? []).reduce((s, f) => s + (f.bird_count ?? 0), 0);
        await supabase.from("barns").update({ current_birds: total }).eq("id", barnId);
      }

      setModal(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar lote.");
    }
    setSaving(false);
  }

  async function deleteLote(id: string) {
    const supabase = createClient();
    try {
      // Get flock's barn before deleting
      const flock = lotes.find((f) => f.id === id);
      const { error: delErr } = await supabase
        .from("flocks")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;

      // Sync current_birds on barn
      if (flock?.barn_id) {
        const { data: barnFlocks } = await supabase
          .from("flocks")
          .select("bird_count")
          .eq("barn_id", flock.barn_id);
        const total = (barnFlocks ?? []).reduce((s, f) => s + (f.bird_count ?? 0), 0);
        await supabase.from("barns").update({ current_birds: total }).eq("id", flock.barn_id);
      }

      setDeleteConfirm(null);
      await fetchData();
    } catch (err: unknown) {
      console.error("Error deleting flock:", err);
    }
  }

  const filtered = lotes.filter((l) => {
    const matchesSearch = l.code.toLowerCase().includes(search.toLowerCase()) || l.breed.toLowerCase().includes(search.toLowerCase());
    const stage = getProductionPhase(calculateCurrentAge(l.arrival_date, l.arrival_age_weeks));
    const matchesStage = filterStage === "todos" || stage === filterStage;
    return matchesSearch && matchesStage;
  });
  const productiveLotes = lotes.filter((l) => ["inicio-producao", "subida-producao", "pico", "producao-estavel"].includes(getProductionPhase(calculateCurrentAge(l.arrival_date, l.arrival_age_weeks)))).length;
  const criticalLotes = lotes.filter((l) => ["declinio-inicial", "declinio-acentuado", "final-ciclo"].includes(getProductionPhase(calculateCurrentAge(l.arrival_date, l.arrival_age_weeks)))).length;
  const transitionLotes = lotes.length - productiveLotes - criticalLotes;
  const overcrowdedBarns = barns.filter((barn) => barn.capacity > 0 && barn.current_birds > barn.capacity).length;
  const performanceScore = lotes.length === 0
    ? 92
    : Math.max(35, Math.min(96, 92 - criticalLotes * 18 - overcrowdedBarns * 15 - (productiveLotes === 0 ? 10 : 0)));
  const flockHealthItems: Pick<FarmHealthInsight, "level" | "title" | "action">[] = [
    criticalLotes > 0
      ? {
          level: "critical",
          title: `${criticalLotes} lotes em declínio ou descarte`,
          action: "Revisar renovação",
        }
      : {
          level: "success",
          title: `${productiveLotes} lotes em fase produtiva`,
          action: "Manter operação equilibrada",
        },
    overcrowdedBarns > 0
      ? {
          level: "warning",
          title: `${overcrowdedBarns} galpões acima da capacidade`,
          action: "Redistribuir aves",
        }
      : {
          level: "info",
          title: `${transitionLotes} lotes em formação`,
          action: "Acompanhar avanço de estágio",
        },
  ];
  const farmHealthInsights: FarmHealthInsight[] = flockHealthItems.map((item) => {
    const link = insightHref(`${item.title} ${item.action}`);

    return {
      level: item.level,
      title: item.title,
      action: item.action,
      href: link.href,
      hrefLabel: link.label,
    };
  });
  const farmHealthSummary = `Lotes: ${lotes.length} | Fase produtiva: ${productiveLotes} | Críticos: ${criticalLotes}`;

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

      {plan === "essencial" ? (
        <LockedOverlay message="Desbloqueie o desempenho dos lotes" targetPlan="pro">
          <FarmHealthBanner
            score={performanceScore}
            summary={farmHealthSummary}
            insights={farmHealthInsights}
          />
        </LockedOverlay>
      ) : (
        <FarmHealthBanner
          score={performanceScore}
          summary={farmHealthSummary}
          insights={farmHealthInsights}
        />
      )}

      {/* Search + Stage Filter */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 w-full sm:w-80 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Buscar lote ou raça..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full" />
        </div>
        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-full p-1 w-fit">
          {(["todos", ...filterPhases] as const).filter((s) => {
            if (s === "todos" || s === "pico") return true;
            return lotes.some((l) => getProductionPhase(calculateCurrentAge(l.arrival_date, l.arrival_age_weeks)) === s);
          }).map((s) => {
            const isActive = filterStage === s;
            const label = s === "todos" ? "Todos" : getProductionPhaseName(s);
            return (
              <button
                key={s}
                onClick={() => setFilterStage(s)}
                className={cn(
                  "text-[13px] font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
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
            <table className="w-full min-w-[1500px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Código</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Raça</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      Aves iniciais
                      <InfoTooltip label="Aves iniciais" description="Quantidade de aves registrada na entrada do lote, antes das mortalidades." />
                    </span>
                  </th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      Aves vivas
                      <InfoTooltip label="Aves vivas" description="Quantidade inicial menos todas as mortalidades registradas até hoje." formula="Aves iniciais − mortalidades acumuladas" />
                    </span>
                  </th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">
                    <span className="inline-flex items-center gap-1.5">
                      Idade
                      <InfoTooltip label="Idade" description="Idade na chegada somada às semanas completas de permanência do lote na granja." />
                    </span>
                  </th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Galpão</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">
                    <span className="inline-flex items-center gap-1.5">
                      Sistema
                      <InfoTooltip label="Sistema" description="Sistema produtivo definido no galpão. Quando ausente, utiliza o sistema informado no cadastro do lote." />
                    </span>
                  </th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      Fase produtiva
                      <InfoTooltip label="Fase produtiva" description="Fase atual calculada pela idade do lote conforme as faixas produtivas definidas." />
                    </span>
                  </th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      Taxa de postura
                      <InfoTooltip
                        label="Taxa de postura"
                        description="Percentual acumulado de produção durante toda a fase produtiva do lote. Dias produtivos sem registro contam como produção zero."
                        formula="Ovos válidos acumulados ÷ soma das aves vivas em todos os dias produtivos × 100"
                      />
                    </span>
                  </th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Chegada</th>
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
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{l.live_birds.toLocaleString("pt-BR")}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{calculateCurrentAge(l.arrival_date, l.arrival_age_weeks)} sem.</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{l.barn_name ?? "—"}</td>
                    <td className="px-6 py-4">
                      {(() => {
                        const barn = barns.find((b) => b.id === l.barn_id);
                        const sys = barn?.production_system || l.production_system;
                        return (
                          <span className={cn("text-[11px] font-semibold px-3 py-1 rounded-full", sistemaColor[sys] ?? "text-gray-700 bg-gray-100")}>
                            {sistemaLabel[sys] ?? sys}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const ageWeeks = calculateCurrentAge(l.arrival_date, l.arrival_age_weeks);
                        const stage = getProductionPhase(ageWeeks);
                        return (
                          <span className={cn("text-[11px] font-semibold px-3 py-1 rounded-full", stageColor[stage])}>
                            {getProductionPhaseLabel(ageWeeks)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {l.laying_rate === null
                        ? "—"
                        : `${l.laying_rate.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(`${l.arrival_date}T12:00:00`).toLocaleDateString("pt-BR")}
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
                    <td colSpan={12} className="text-center py-16 text-gray-400 text-sm">Nenhum lote encontrado.</td>
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
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Galpão *</label>
                      <select value={form.barn_id} onChange={(e) => setForm({ ...form, barn_id: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                        <option value="">Selecione um galpão</option>
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
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Idade na Chegada (dias)</label>
                      <input type="number" value={form.arrival_age_weeks} onChange={(e) => setForm({ ...form, arrival_age_weeks: e.target.value })} placeholder="126" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Peso Médio (kg)</label>
                      <input type="number" step="0.01" value={form.avg_weight_kg} onChange={(e) => setForm({ ...form, avg_weight_kg: e.target.value })} placeholder="1.85" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sistema</label>
                    <select value={form.production_system} onChange={(e) => setForm({ ...form, production_system: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                      <option value="Caipira">Caipira</option>
                      <option value="Orgânico">Orgânico</option>
                      <option value="Gaiola">Gaiola</option>
                      <option value="Cage-Free">Cage-Free</option>
                    </select>
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
