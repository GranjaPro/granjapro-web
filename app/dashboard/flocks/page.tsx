"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Layers, Plus, Pencil, Trash2, X, Check, Search, FileText, Loader2, Bird, AlertTriangle, Sparkles, TrendingDown, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import ModalPortal from "@/components/ui/modal-portal";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/plan/locked-overlay";

type ProductionStage = "cria" | "recria" | "pre-postura" | "producao" | "pico" | "estavel" | "declinio" | "descarte";

function getProductionStage(ageWeeks: number): ProductionStage {
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
  status: ProductionStage;
  supplier: string | null;
  supplier_contact: string | null;
  arrival_date: string;
  origin: string | null;
  lineage: string | null;
  avg_weight_kg: number | null;
  barn_id: string;
  barn_name: string | null;
}

interface Barn {
  id: string;
  name: string;
  capacity: number;
  current_birds: number;
  production_system?: string;
}

interface ActiveAlert {
  id: string;
  type: "danger" | "warning" | "info";
  msg: string;
  time: string;
  action: string;
  risk: string;
  href?: string;
  source: "db" | "setup" | "derived";
}

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

const stageLabel: Record<ProductionStage, string> = {
  cria: "Cria",
  recria: "Recria",
  "pre-postura": "Pré-Postura",
  producao: "Produção",
  pico: "Pico",
  estavel: "Estável",
  declinio: "Declínio",
  descarte: "Descarte",
};

const stageColor: Record<ProductionStage, string> = {
  cria: "text-purple-700 bg-purple-100",
  recria: "text-indigo-700 bg-indigo-100",
  "pre-postura": "text-cyan-700 bg-cyan-100",
  producao: "text-blue-700 bg-blue-100",
  pico: "text-emerald-700 bg-emerald-100",
  estavel: "text-brand-700 bg-brand-100",
  declinio: "text-amber-700 bg-amber-100",
  descarte: "text-red-700 bg-red-100",
};

const setupAlerts: ActiveAlert[] = [
  { id: "setup-1", type: "info", msg: "Registre a producao pela primeira vez", time: "Configuracao", action: "Registrar", risk: "Sem dados de producao, o dashboard nao podera exibir suas metricas.", href: "/dashboard/production?register=true", source: "setup" },
  { id: "setup-2", type: "info", msg: "Registre a racao pela primeira vez", time: "Configuracao", action: "Registrar", risk: "Sem controle de racao, voce nao sabera o custo real por ovo.", href: "/dashboard/racao?register=true", source: "setup" },
  { id: "setup-3", type: "info", msg: "Registre seus ganhos e gastos", time: "Configuracao", action: "Registrar", risk: "Sem dados financeiros, nao e possivel calcular seu lucro.", href: "/dashboard/finances", source: "setup" },
  { id: "setup-4", type: "info", msg: "Cadastre seus clientes", time: "Configuracao", action: "Cadastrar", risk: "Sem clientes cadastrados, voce nao podera registrar vendas.", href: "/dashboard/customers", source: "setup" },
  { id: "setup-5", type: "info", msg: "Registre suas vendas", time: "Configuracao", action: "Registrar", risk: "Sem vendas registradas, a receita nao aparecera no dashboard.", href: "/dashboard/sales", source: "setup" },
  { id: "setup-6", type: "info", msg: "Registre seus estoques", time: "Configuracao", action: "Registrar", risk: "Sem controle de estoque, voce pode ficar sem insumos.", href: "/dashboard/inventory", source: "setup" },
];

const DISMISSED_FLOCK_ALERTS_KEY = "granja-pro-dismissed-flock-alerts";

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
  const [filterStage, setFilterStage] = useState<ProductionStage | "todos">("todos");
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [closingAlertIds, setClosingAlertIds] = useState<string[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Lote | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");

  const farmRef = useRef(farm);
  farmRef.current = farm;
  const alertDismissTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DISMISSED_FLOCK_ALERTS_KEY);
      if (stored) setDismissedAlertIds(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    return () => {
      Object.values(alertDismissTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  const fetchData = useCallback(async () => {
    const currentFarm = farmRef.current;
    if (!currentFarm) { setLoading(false); return; }
    setLoading(true);
    const supabase = createClient();
    try {
      const [flocksRes, barnsRes, alertsRes, prodRes, feedRes, finRes, custRes, salesRes, invRes] = await Promise.all([
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
          .from("alerts")
          .select("*")
          .eq("farm_id", currentFarm.id)
          .eq("read", false)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("egg_production").select("id", { count: "exact", head: true }).eq("farm_id", currentFarm.id),
        supabase.from("feed_consumption").select("id", { count: "exact", head: true }).eq("farm_id", currentFarm.id),
        supabase.from("financial_transactions").select("id", { count: "exact", head: true }).eq("farm_id", currentFarm.id),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("farm_id", currentFarm.id),
        supabase.from("sales").select("id", { count: "exact", head: true }).eq("farm_id", currentFarm.id),
        supabase.from("feed_inventory").select("id", { count: "exact", head: true }).eq("farm_id", currentFarm.id),
      ]);

      const mappedLotes: Lote[] = (flocksRes.data ?? []).map((f: any) => ({
        id: f.id,
        code: f.code,
        breed: f.breed,
        bird_count: f.bird_count,
        arrival_age_weeks: f.arrival_age_weeks ?? 0,
        production_system: f.production_system,
        status: f.status as ProductionStage,
        supplier: f.supplier,
        supplier_contact: f.supplier_contact,
        arrival_date: f.arrival_date,
        origin: f.origin,
        lineage: f.lineage,
        avg_weight_kg: f.avg_weight_kg,
        barn_id: f.barn_id,
        barn_name: f.barns?.name ?? null,
      }));

      setLotes(mappedLotes);

      if (barnsRes.data) {
        setBarns(barnsRes.data as Barn[]);
      }

      const realAlerts: ActiveAlert[] = (alertsRes.data ?? []).map((alert: any) => ({
        id: String(alert.id),
        type: (alert.type === "error" ? "danger" : alert.type) as ActiveAlert["type"],
        msg: alert.message,
        time: new Date(alert.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        action: "Ver",
        risk: "",
        source: "db",
      }));

      const criaAlerts: ActiveAlert[] = mappedLotes
        .filter((lote) => getProductionStage(calculateCurrentAge(lote.arrival_date, lote.arrival_age_weeks)) === "cria")
        .map((lote) => ({
          id: `cria-${lote.id}`,
          type: "warning",
          msg: `O lote ${lote.code} está em estágio de cria`,
          time: "Monitoramento",
          action: "Ver lote",
          risk: "Observe O comportamento dos pintinhos. O agrupamento excessivo pode indicar frio, corrente de ar ou distribuição inadequada de aquecimento o afastamento excessivo pode indicar calor.",
          href: `/dashboard/flocks/detalhes/${lote.id}`,
          source: "derived",
        }));

      const pendingSetup = setupAlerts.filter((alert) => {
        if (alert.id === "setup-1" && (prodRes.count ?? 0) > 0) return false;
        if (alert.id === "setup-2" && (feedRes.count ?? 0) > 0) return false;
        if (alert.id === "setup-3" && (finRes.count ?? 0) > 0) return false;
        if (alert.id === "setup-4" && (custRes.count ?? 0) > 0) return false;
        if (alert.id === "setup-5" && (salesRes.count ?? 0) > 0) return false;
        if (alert.id === "setup-6" && (invRes.count ?? 0) > 0) return false;
        return true;
      });

      setActiveAlerts([...realAlerts, ...criaAlerts, ...pendingSetup]);
    } catch (err) {
      console.error("Error fetching flocks:", err);
      setActiveAlerts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || !farm) return;
    fetchData();
  }, [authLoading, farm, fetchData]);

  function dismissLocalAlert(alertId: string) {
    setDismissedAlertIds((prev) => {
      if (prev.includes(alertId)) return prev;
      const next = [...prev, alertId];
      try {
        window.localStorage.setItem(DISMISSED_FLOCK_ALERTS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  async function dismissAlert(alert: ActiveAlert) {
    if (closingAlertIds.includes(alert.id)) return;

    setClosingAlertIds((prev) => [...prev, alert.id]);

    alertDismissTimeoutsRef.current[alert.id] = setTimeout(async () => {
      setActiveAlerts((prev) => prev.filter((item) => item.id !== alert.id));

      if (alert.source === "db") {
        const supabase = createClient();
        const { error: updateErr } = await supabase
          .from("alerts")
          .update({ read: true, resolved: true })
          .eq("id", alert.id);

        if (updateErr) {
          await fetchData();
        }
      } else {
        dismissLocalAlert(alert.id);
      }

      setClosingAlertIds((prev) => prev.filter((id) => id !== alert.id));
      delete alertDismissTimeoutsRef.current[alert.id];
    }, 220);
  }

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
    const record: Record<string, any> = {
      farm_id: farm.id,
      code: form.code,
      breed: form.breed,
      bird_count: Number(form.bird_count) || 0,
      arrival_age_weeks: arrivalAgeWeeks,
      production_system: form.production_system,
      status: getProductionStage(currentAge),
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
    } catch (err: any) {
      setError(err.message || "Erro ao salvar lote.");
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
    } catch (err: any) {
      console.error("Error deleting flock:", err);
    }
  }

  const filtered = lotes.filter((l) => {
    const matchesSearch = l.code.toLowerCase().includes(search.toLowerCase()) || l.breed.toLowerCase().includes(search.toLowerCase());
    const stage = getProductionStage(calculateCurrentAge(l.arrival_date, l.arrival_age_weeks));
    const matchesStage = filterStage === "todos" || stage === filterStage;
    return matchesSearch && matchesStage;
  });
  const visibleActiveAlerts = activeAlerts.filter((alert) => !dismissedAlertIds.includes(alert.id));
  const urgentAlertsCount = visibleActiveAlerts.filter((alert) => alert.type === "danger").length;
  const productiveLotes = lotes.filter((l) => ["producao", "pico", "estavel"].includes(getProductionStage(calculateCurrentAge(l.arrival_date, l.arrival_age_weeks)))).length;
  const criticalLotes = lotes.filter((l) => ["declinio", "descarte"].includes(getProductionStage(calculateCurrentAge(l.arrival_date, l.arrival_age_weeks)))).length;
  const transitionLotes = lotes.length - productiveLotes - criticalLotes;
  const overcrowdedBarns = barns.filter((barn) => barn.capacity > 0 && barn.current_birds > barn.capacity).length;
  const performanceScore = lotes.length === 0
    ? 92
    : Math.max(35, Math.min(96, 92 - criticalLotes * 18 - overcrowdedBarns * 15 - (productiveLotes === 0 ? 10 : 0)));
  const performanceColor = performanceScore >= 80 ? "#10b981" : performanceScore >= 50 ? "#f59e0b" : "#ef4444";
  const performanceGradient = performanceScore >= 80 ? "from-emerald-50 via-emerald-50/50 to-white" : performanceScore >= 50 ? "from-amber-50 via-amber-50/50 to-white" : "from-red-50 via-red-50/50 to-white";
  const performanceBorder = performanceScore >= 80 ? "border-emerald-200/60" : performanceScore >= 50 ? "border-amber-200/60" : "border-red-200/60";
  const performanceStatus = performanceScore >= 80 ? "Saudável" : performanceScore >= 50 ? "Atenção" : "Crítico";
  const performanceStatusColor = performanceScore >= 80 ? "text-emerald-700" : performanceScore >= 50 ? "text-amber-700" : "text-red-700";

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
          <div className={cn("bg-gradient-to-r rounded-2xl border p-4 sm:p-5 transition-all duration-300", performanceGradient, performanceBorder)}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4 lg:min-w-[280px]">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
                  <svg className="w-14 h-14 sm:w-16 sm:h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke={performanceColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(performanceScore / 100) * 175.9} 175.9`} className="transition-all duration-700" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn("text-sm sm:text-base font-bold", performanceStatusColor)}>{performanceScore}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    <span className="text-sm font-bold text-gray-900">Desempenho dos Lotes</span>
                  </div>
                  <p className={cn("text-lg sm:text-xl font-bold mt-0.5", performanceStatusColor)}>{performanceStatus}</p>
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate">Lotes: {lotes.length} | Fase produtiva: {productiveLotes} | Críticos: {criticalLotes}</p>
                </div>
              </div>

              <div className="hidden lg:block w-px h-14 bg-gray-200" />

              <div className="flex-1 space-y-1.5 sm:space-y-2">
                {criticalLotes > 0 ? (
                  <div className="flex items-start sm:items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100 mt-0.5 sm:mt-0">
                      <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700">{criticalLotes} lotes em declínio ou descarte — revisar renovação</p>
                  </div>
                ) : (
                  <div className="flex items-start sm:items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-100 mt-0.5 sm:mt-0">
                      <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700">{productiveLotes} lotes em fase produtiva — operação equilibrada</p>
                  </div>
                )}
                {overcrowdedBarns > 0 ? (
                  <div className="flex items-start sm:items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100 mt-0.5 sm:mt-0">
                      <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700">{overcrowdedBarns} galpões acima da capacidade — redistribuir aves</p>
                  </div>
                ) : (
                  <div className="flex items-start sm:items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 mt-0.5 sm:mt-0">
                      <Bird className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700">{transitionLotes} lotes em formação — acompanhar avanço de estágio</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </LockedOverlay>
      ) : (
        <div className={cn("bg-gradient-to-r rounded-2xl border p-4 sm:p-5 transition-all duration-300", performanceGradient, performanceBorder)}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 lg:min-w-[280px]">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
                <svg className="w-14 h-14 sm:w-16 sm:h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke={performanceColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(performanceScore / 100) * 175.9} 175.9`} className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn("text-sm sm:text-base font-bold", performanceStatusColor)}>{performanceScore}</span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <span className="text-sm font-bold text-gray-900">Desempenho dos Lotes</span>
                </div>
                <p className={cn("text-lg sm:text-xl font-bold mt-0.5", performanceStatusColor)}>{performanceStatus}</p>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate">Lotes: {lotes.length} | Fase produtiva: {productiveLotes} | Críticos: {criticalLotes}</p>
              </div>
            </div>

            <div className="hidden lg:block w-px h-14 bg-gray-200" />

            <div className="flex-1 space-y-1.5 sm:space-y-2">
              {criticalLotes > 0 ? (
                <div className="flex items-start sm:items-center gap-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100 mt-0.5 sm:mt-0">
                    <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600" />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700">{criticalLotes} lotes em declínio ou descarte — revisar renovação</p>
                </div>
              ) : (
                <div className="flex items-start sm:items-center gap-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-100 mt-0.5 sm:mt-0">
                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700">{productiveLotes} lotes em fase produtiva — operação equilibrada</p>
                </div>
              )}
              {overcrowdedBarns > 0 ? (
                <div className="flex items-start sm:items-center gap-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100 mt-0.5 sm:mt-0">
                    <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700">{overcrowdedBarns} galpões acima da capacidade — redistribuir aves</p>
                </div>
              ) : (
                <div className="flex items-start sm:items-center gap-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 mt-0.5 sm:mt-0">
                    <Bird className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700">{transitionLotes} lotes em formação — acompanhar avanço de estágio</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search + Stage Filter */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 w-full sm:w-80 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Buscar lote ou raça..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full" />
        </div>
        {!loading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col max-h-[420px]">
            <div className="flex items-center justify-between mb-5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Alertas ativos</h3>
                  <p className="text-[11px] text-gray-400 font-medium">
                    {urgentAlertsCount > 0 && (
                      <span className="text-red-600 font-semibold">{urgentAlertsCount} urgente · </span>
                    )}
                    {visibleActiveAlerts.length} alertas no total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30 flex-shrink-0">
                  <Sparkles className="w-3 h-3" />
                  Pro
                </span>
                <span className="text-[11px] font-bold text-white bg-red-500 px-2.5 py-1 rounded-lg">{visibleActiveAlerts.length}</span>
              </div>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 -mr-1 py-1">
              {visibleActiveAlerts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                  Nenhum alerta ativo.
                </div>
              ) : visibleActiveAlerts.map((alert, alertIdx) => {
                const isClosing = closingAlertIds.includes(alert.id);
                const isLockedAlert = plan === "essencial" && alertIdx >= 2;
                if (isLockedAlert) {
                  return (
                    <LockedOverlay key={alert.id} message="Desbloqueie todos os alertas inteligentes" targetPlan="pro">
                      <div className={cn(
                        "rounded-xl p-4 border",
                        alert.type === "danger" && "bg-red-50 border-red-200",
                        alert.type === "warning" && "bg-amber-50 border-amber-200",
                        alert.type === "info" && "bg-blue-50 border-blue-200"
                      )}>
                        <div className="flex items-start gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", alert.type === "danger" && "bg-red-100", alert.type === "warning" && "bg-amber-100", alert.type === "info" && "bg-blue-100")}>
                            <AlertTriangle className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-gray-600">{alert.msg}</p>
                          </div>
                        </div>
                      </div>
                    </LockedOverlay>
                  );
                }
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "overflow-hidden transition-all duration-200 ease-out",
                      isClosing ? "max-h-0 opacity-0 -translate-y-1" : "max-h-64 opacity-100 translate-y-0"
                    )}
                  >
                    <div
                      className={cn(
                        "relative rounded-xl p-4 pr-12 border transition-all duration-200",
                        alert.type === "danger" && "bg-red-50 border-red-200",
                        alert.type === "warning" && "bg-amber-50 border-amber-200",
                        alert.type === "info" && "bg-blue-50 border-blue-200"
                      )}
                    >
                      <button
                        type="button"
                        aria-label="Excluir aviso"
                        onClick={() => void dismissAlert(alert)}
                        className="absolute right-3 top-3 rounded-md p-1 text-gray-400 transition-colors hover:bg-white/70 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                            alert.type === "danger" && "bg-red-100",
                            alert.type === "warning" && "bg-amber-100",
                            alert.type === "info" && "bg-blue-100"
                          )}
                        >
                          <AlertTriangle
                            className={cn(
                              "w-4 h-4",
                              alert.type === "danger" && "text-red-600",
                              alert.type === "warning" && "text-amber-600",
                              alert.type === "info" && "text-blue-600"
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-[13px] font-semibold leading-snug",
                              alert.type === "danger" && "text-red-800",
                              alert.type === "warning" && "text-amber-800",
                              alert.type === "info" && "text-blue-800"
                            )}
                          >
                            {alert.msg}
                          </p>
                          {alert.risk && (
                            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed italic">
                              Se ignorar: {alert.risk}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2.5">
                            <p className="text-[11px] text-gray-400">{alert.time}</p>
                            {alert.href ? (
                              <Link
                                href={alert.href}
                                className={cn(
                                  "text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors",
                                  alert.type === "danger" && "text-white bg-red-500 hover:bg-red-600",
                                  alert.type === "warning" && "text-amber-800 bg-amber-200 hover:bg-amber-300",
                                  alert.type === "info" && "text-blue-800 bg-blue-200 hover:bg-blue-300"
                                )}
                              >
                                {alert.action}
                              </Link>
                            ) : (
                              <button
                                type="button"
                                className={cn(
                                  "text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors",
                                  alert.type === "danger" && "text-white bg-red-500 hover:bg-red-600",
                                  alert.type === "warning" && "text-amber-800 bg-amber-200 hover:bg-amber-300",
                                  alert.type === "info" && "text-blue-800 bg-blue-200 hover:bg-blue-300"
                                )}
                              >
                                {alert.action}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-full p-1 w-fit">
          {(["todos", "cria", "recria", "pre-postura", "producao", "pico", "estavel", "declinio", "descarte"] as const).filter((s) => {
            if (s === "todos") return true;
            return lotes.some((l) => getProductionStage(calculateCurrentAge(l.arrival_date, l.arrival_age_weeks)) === s);
          }).map((s) => {
            const isActive = filterStage === s;
            const label = s === "todos" ? "Todos" : stageLabel[s];
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
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Código</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Raça</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Aves</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Idade</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Galpão</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Sistema</th>
                  <th className="text-left text-xs font-bold text-gray-900 px-6 py-4">Estágio</th>
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
                        const stage = getProductionStage(calculateCurrentAge(l.arrival_date, l.arrival_age_weeks));
                        return (
                          <span className={cn("text-[11px] font-semibold px-3 py-1 rounded-full", stageColor[stage])}>
                            {stageLabel[stage]}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(l.arrival_date).toLocaleDateString("pt-BR")}
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
                    <td colSpan={10} className="text-center py-16 text-gray-400 text-sm">Nenhum lote encontrado.</td>
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
