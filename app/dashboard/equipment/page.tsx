"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ModalPortal from "@/components/ui/modal-portal";
import {
  Wrench,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Search,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  Package,
  Cog,
  Zap,
  Droplets,
  Fan,
  Clock,
  ShieldAlert,
  CalendarDays,
  TrendingDown,
  ArrowUpRight,
  Activity,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";

type TipoEquipamento = "alimentacao" | "climatizacao" | "iluminacao" | "hidraulico" | "geral";
type StatusEquipamento = "operacional" | "manutencao" | "inativo";

interface Equipamento {
  id: string;
  nome: string;
  localizacao: string;
  tipo: TipoEquipamento;
  status: StatusEquipamento;
  marca: string;
  modelo: string;
  dataInstalacao: string;
  proximaManutencao: string;
  observacoes: string;
  valorEquipamento: number;
  horasUso: number;
  vidaUtilHoras: number;
  empresaInstalacao: string;
  contatoEmpresa: string;
}

const tipoLabel: Record<TipoEquipamento, string> = {
  alimentacao: "Alimentação",
  climatizacao: "Climatização",
  iluminacao: "Iluminação",
  hidraulico: "Hidráulico",
  geral: "Geral",
};

const tipoColor: Record<TipoEquipamento, string> = {
  alimentacao: "text-amber-700 bg-amber-50",
  climatizacao: "text-blue-700 bg-blue-50",
  iluminacao: "text-yellow-700 bg-yellow-50",
  hidraulico: "text-cyan-700 bg-cyan-50",
  geral: "text-gray-700 bg-gray-100",
};

const tipoIcons: Record<TipoEquipamento, typeof Wrench> = {
  alimentacao: Cog,
  climatizacao: Fan,
  iluminacao: Zap,
  hidraulico: Droplets,
  geral: Wrench,
};

const statusLabel: Record<StatusEquipamento, string> = {
  operacional: "Operacional",
  manutencao: "Manutenção",
  inativo: "Inativo",
};

const statusColor: Record<StatusEquipamento, string> = {
  operacional: "text-emerald-700 bg-emerald-50",
  manutencao: "text-amber-700 bg-amber-50",
  inativo: "text-gray-500 bg-gray-100",
};

const tipoOptions: TipoEquipamento[] = ["alimentacao", "climatizacao", "iluminacao", "hidraulico", "geral"];

type ModalMode = "add" | "edit" | null;

const emptyForm = {
  nome: "",
  localizacao: "",
  tipo: "geral" as TipoEquipamento,
  status: "operacional" as StatusEquipamento,
  marca: "",
  modelo: "",
  dataInstalacao: "",
  proximaManutencao: "",
  observacoes: "",
  valorEquipamento: "",
  horasUso: "",
  vidaUtilHoras: "",
  empresaInstalacao: "",
  contatoEmpresa: "",
};

export default function EquipamentosPage() {
  const { farm } = useAuth();
  const farmRef = useRef(farm);
  farmRef.current = farm;

  const [search, setSearch] = useState("");
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Equipamento | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState<TipoEquipamento | "todos">("todos");

  const fetchData = useCallback(async () => {
    const currentFarm = farmRef.current;
    if (!currentFarm) return;
    setLoading(true);

    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("farm_id", currentFarm.id);

      if (error) throw error;

      const mapped: Equipamento[] = (data || []).map((i: any) => ({
        id: i.id,
        nome: i.name || "",
        localizacao: i.location || "",
        tipo: (i.type as TipoEquipamento) || "geral",
        status: (i.status as StatusEquipamento) || "operacional",
        marca: i.brand || "",
        modelo: i.model || "",
        dataInstalacao: i.installation_date || "",
        proximaManutencao: i.next_maintenance_date || "",
        observacoes: i.notes || "",
        valorEquipamento: i.equipment_value || 0,
        horasUso: i.usage_hours || 0,
        vidaUtilHoras: i.lifespan_hours || 0,
        empresaInstalacao: i.installation_company || "",
        contatoEmpresa: i.support_contact || "",
      }));

      setEquipamentos(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openAdd() {
    setForm({ ...emptyForm });
    setEditing(null);
    setModal("add");
  }

  function openEdit(item: Equipamento) {
    setForm({
      nome: item.nome,
      localizacao: item.localizacao,
      tipo: item.tipo,
      status: item.status,
      marca: item.marca,
      modelo: item.modelo,
      dataInstalacao: item.dataInstalacao,
      proximaManutencao: item.proximaManutencao,
      observacoes: item.observacoes,
      valorEquipamento: String(item.valorEquipamento),
      horasUso: String(item.horasUso),
      vidaUtilHoras: String(item.vidaUtilHoras),
      empresaInstalacao: item.empresaInstalacao,
      contatoEmpresa: item.contatoEmpresa,
    });
    setEditing(item);
    setModal("edit");
  }

  async function save() {
    if (!form.nome.trim()) return;
    const currentFarm = farmRef.current;
    if (!currentFarm) return;

    const record = {
      farm_id: currentFarm.id,
      name: form.nome,
      location: form.localizacao,
      type: form.tipo,
      status: form.status,
      brand: form.marca,
      model: form.modelo,
      installation_date: form.dataInstalacao || null,
      next_maintenance_date: form.proximaManutencao || null,
      notes: form.observacoes,
      equipment_value: Number(form.valorEquipamento) || 0,
      usage_hours: Number(form.horasUso) || 0,
      lifespan_hours: Number(form.vidaUtilHoras) || 0,
      installation_company: form.empresaInstalacao,
      support_contact: form.contatoEmpresa,
    };

    const supabase = createClient();
    try {
      if (modal === "add") {
        await supabase.from("equipment").insert(record);
      } else if (editing) {
        await supabase.from("equipment").update(record).eq("id", editing.id);
      }
      setModal(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteItem(id: string) {
    const supabase = createClient();
    try {
      await supabase.from("equipment").delete().eq("id", id);
      setDeleteConfirm(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  }

  const filtered = equipamentos.filter((i) => {
    const matchSearch = i.nome.toLowerCase().includes(search.toLowerCase()) || i.localizacao.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "todos" || i.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const today = new Date();
  function formatCurrency(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  function diasAteManutencao(d: string) {
    if (!d) return Infinity;
    return Math.ceil((new Date(d + "T00:00:00").getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  function vidaUtilPercent(item: Equipamento) {
    if (item.vidaUtilHoras <= 0) return 0;
    return Math.min(100, Math.round((item.horasUso / item.vidaUtilHoras) * 100));
  }

  const totalOperacional = equipamentos.filter((i) => i.status === "operacional").length;
  const totalManutencao = equipamentos.filter((i) => i.status === "manutencao").length;
  const totalInativo = equipamentos.filter((i) => i.status === "inativo").length;
  const patrimonioTotal = equipamentos.reduce((s, i) => s + i.valorEquipamento, 0);
  const disponibilidade = equipamentos.length > 0 ? Math.round((totalOperacional / equipamentos.length) * 100) : 0;

  const comManutencao = equipamentos.map((i) => ({ ...i, diasManut: diasAteManutencao(i.proximaManutencao) })).sort((a, b) => a.diasManut - b.diasManut);
  const manutencaoProxima = comManutencao.filter((i) => i.diasManut <= 30 && i.diasManut >= 0);
  const manutencaoAtrasada = comManutencao.filter((i) => i.diasManut < 0);
  const vidaUtilCritica = equipamentos.filter((i) => vidaUtilPercent(i) >= 80);
  const custoManutencaoRisco = [...manutencaoProxima, ...manutencaoAtrasada].reduce((s, i) => s + i.valorEquipamento, 0);
  const custoVidaUtilRisco = vidaUtilCritica.reduce((s, i) => s + i.valorEquipamento, 0);
  const totalAlertas = manutencaoProxima.length + manutencaoAtrasada.length + vidaUtilCritica.length + totalInativo;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Carregando equipamentos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Equipamentos</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gerencie os equipamentos da sua granja</p>
          </div>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20">
          <Plus className="w-4 h-4" />
          Novo Equipamento
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {/* Patrimônio */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Patrimônio</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{formatCurrency(patrimonioTotal)}</p>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full"><ArrowUpRight className="w-3 h-3" />{equipamentos.length} equip.</span>
            <span className="text-[10px] text-gray-400">cadastrados</span>
          </div>
        </div>

        {/* Operacionais */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Operacionais</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{totalOperacional}<span className="text-sm text-gray-400 font-medium">/{equipamentos.length}</span></p>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">Ativos</span>
          </div>
          <div className="mt-3 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${(totalOperacional / Math.max(equipamentos.length, 1)) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Disponibilidade */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-purple-600" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Disponibilidade</span>
          </div>
          <p className={cn("text-2xl font-bold tracking-tight leading-none", disponibilidade >= 80 ? "text-emerald-700" : disponibilidade >= 50 ? "text-amber-600" : "text-red-600")}>{disponibilidade}%</p>
          <div className="mt-3 relative">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700", disponibilidade >= 80 ? "bg-emerald-500" : disponibilidade >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${disponibilidade}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-gray-400 font-medium">{totalManutencao} manut. · {totalInativo} inativo{totalInativo !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Próxima Manutenção */}
        <div className={cn("rounded-2xl border p-5 hover:shadow-lg transition-all duration-300 cursor-pointer", manutencaoAtrasada.length > 0 ? "bg-gradient-to-br from-red-50/80 to-white border-red-200/60 hover:shadow-red-200/30" : manutencaoProxima.length > 0 ? "bg-gradient-to-br from-amber-50/80 to-white border-amber-200/60 hover:shadow-amber-200/30" : "bg-white border-gray-100 hover:shadow-gray-200/50 hover:border-gray-200")}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", manutencaoAtrasada.length > 0 ? "bg-red-100" : manutencaoProxima.length > 0 ? "bg-amber-100" : "bg-emerald-50")}>
              <CalendarDays className={cn("w-4.5 h-4.5", manutencaoAtrasada.length > 0 ? "text-red-500" : manutencaoProxima.length > 0 ? "text-amber-600" : "text-emerald-600")} />
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Manutenção</span>
          </div>
          {comManutencao.length > 0 && comManutencao[0].diasManut < Infinity ? (
            <>
              <p className={cn("text-2xl font-bold tracking-tight leading-none", comManutencao[0].diasManut < 0 ? "text-red-600" : comManutencao[0].diasManut <= 15 ? "text-amber-600" : "text-gray-900")}>{comManutencao[0].diasManut < 0 ? `${Math.abs(comManutencao[0].diasManut)}d atrasada` : `${comManutencao[0].diasManut}d`}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-1 truncate">{comManutencao[0].nome}</p>
              {custoManutencaoRisco > 0 && (
                <div className="mt-2 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-red-500" />
                  <span className="text-[10px] font-bold text-red-600">{formatCurrency(custoManutencaoRisco)} em risco</span>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-emerald-700 tracking-tight leading-none">OK</p>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">Sem manutenções pendentes</p>
            </>
          )}
        </div>

        {/* Alertas */}
        <div className={cn("rounded-2xl border p-5 hover:shadow-lg transition-all duration-300 cursor-pointer", totalAlertas > 0 ? "bg-gradient-to-br from-amber-50/80 to-white border-amber-200/60 hover:shadow-amber-200/30" : "bg-white border-gray-100 hover:shadow-gray-200/50 hover:border-gray-200")}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", totalAlertas > 0 ? "bg-amber-100" : "bg-emerald-50")}>
              {totalAlertas > 0 ? <ShieldAlert className="w-4.5 h-4.5 text-amber-600" /> : <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />}
            </div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Alertas</span>
          </div>
          <p className={cn("text-2xl font-bold tracking-tight leading-none", totalAlertas > 0 ? "text-amber-700" : "text-emerald-700")}>{totalAlertas}</p>
          <div className="mt-2 space-y-0.5">
            {(custoManutencaoRisco + custoVidaUtilRisco) > 0 && <p className="text-[10px] text-red-600 font-bold">{formatCurrency(custoManutencaoRisco + custoVidaUtilRisco)} em risco</p>}
            {manutencaoAtrasada.length > 0 && <p className="text-[10px] text-red-500 font-medium">{manutencaoAtrasada.length} manut. atrasada{manutencaoAtrasada.length > 1 ? "s" : ""}</p>}
            {manutencaoProxima.length > 0 && <p className="text-[10px] text-amber-600 font-medium">{manutencaoProxima.length} manut. em 30d</p>}
            {vidaUtilCritica.length > 0 && <p className="text-[10px] text-orange-600 font-medium">{vidaUtilCritica.length} vida útil &gt;80%</p>}
            {totalInativo > 0 && <p className="text-[10px] text-gray-500 font-medium">{totalInativo} inativo{totalInativo > 1 ? "s" : ""}</p>}
            {totalAlertas === 0 && <p className="text-[10px] text-emerald-600 font-medium">Tudo em ordem</p>}
          </div>
        </div>
      </div>

      {/* ── Riscos Críticos ── */}
      {(manutencaoAtrasada.length > 0 || manutencaoProxima.length > 0 || vidaUtilCritica.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Riscos Críticos</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Equipamentos que requerem ação imediata</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {manutencaoAtrasada.map((item) => (
              <div key={`atr-${item.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 border border-red-100">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.nome}</p>
                    <span className="text-[11px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-md flex-shrink-0">{formatCurrency(item.valorEquipamento)}</span>
                  </div>
                  <p className="text-[11px] text-red-500 font-medium">Manutenção atrasada {Math.abs(item.diasManut)} dias — {new Date(item.proximaManutencao + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 text-white bg-red-500">{Math.abs(item.diasManut)}d</span>
              </div>
            ))}
            {manutencaoProxima.map((item) => (
              <div key={`man-${item.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.nome}</p>
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md flex-shrink-0">{formatCurrency(item.valorEquipamento)}</span>
                  </div>
                  <p className="text-[11px] text-amber-600 font-medium">Manutenção em {item.diasManut} dias — {new Date(item.proximaManutencao + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0", item.diasManut <= 7 ? "text-white bg-amber-500" : "text-amber-700 bg-amber-100")}>{item.diasManut}d</span>
              </div>
            ))}
            {vidaUtilCritica.map((item) => {
              const pct = vidaUtilPercent(item);
              return (
                <div key={`vida-${item.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.nome}</p>
                      <span className="text-[11px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-md flex-shrink-0">{formatCurrency(item.valorEquipamento)}</span>
                    </div>
                    <p className="text-[11px] text-orange-600 font-medium">Vida útil em {pct}% — {item.horasUso.toLocaleString("pt-BR")}h de {item.vidaUtilHoras.toLocaleString("pt-BR")}h</p>
                  </div>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0", pct >= 90 ? "text-white bg-red-500" : "text-orange-700 bg-orange-100")}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: "todos" as const, label: "Todos" },
            { key: "alimentacao" as const, label: "Alimentação" },
            { key: "climatizacao" as const, label: "Climatização" },
            { key: "iluminacao" as const, label: "Iluminação" },
            { key: "hidraulico" as const, label: "Hidráulico" },
            { key: "geral" as const, label: "Geral" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterTipo(t.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                filterTipo === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 w-full sm:w-72 sm:ml-auto focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Buscar equipamento..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const TipoIcon = tipoIcons[item.tipo];
          const diasManut = diasAteManutencao(item.proximaManutencao);
          const pctVida = vidaUtilPercent(item);
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.status === "operacional" && "bg-blue-50", item.status === "manutencao" && "bg-amber-50", item.status === "inativo" && "bg-gray-100")}>
                    <TipoIcon className={cn("w-5 h-5", item.status === "operacional" && "text-blue-600", item.status === "manutencao" && "text-amber-600", item.status === "inativo" && "text-gray-400")} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{item.nome}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{item.localizacao}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Value + Brand */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 mt-1">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Valor</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(item.valorEquipamento)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Marca</p>
                  <p className="text-sm font-bold text-gray-900">{item.marca} <span className="text-[10px] text-gray-400 font-medium">{item.modelo}</span></p>
                </div>
              </div>

              {/* Vida útil bar */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Vida útil</span>
                  <span className="font-semibold text-gray-700">{pctVida}% <span className="text-[10px] text-gray-400 font-normal">({item.horasUso.toLocaleString("pt-BR")}h)</span></span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      pctVida >= 90 ? "bg-red-400" : pctVida >= 70 ? "bg-amber-400" : "bg-brand-500"
                    )}
                    style={{ width: pctVida + "%" }}
                  />
                </div>
              </div>

              {/* Maintenance + Installation dates */}
              <div className="mt-3 flex items-center gap-2">
                {item.proximaManutencao && (
                  <div className={cn("flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg", diasManut < 0 ? "text-red-600 bg-red-50" : diasManut <= 15 ? "text-amber-600 bg-amber-50" : "text-gray-500 bg-gray-50")}>
                    <Clock className="w-3 h-3" />
                    {diasManut < 0 ? `${Math.abs(diasManut)}d atrasada` : `${diasManut}d p/ manut.`}
                  </div>
                )}
                {item.dataInstalacao && (
                  <div className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg text-gray-500 bg-gray-50">
                    <CalendarDays className="w-3 h-3" />
                    {new Date(item.dataInstalacao + "T00:00:00").toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>

              {/* Suporte */}
              {(item.empresaInstalacao || item.contatoEmpresa) && (
                <div className="mt-3 border-t border-dashed border-gray-100 pt-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Suporte</p>
                  <div className="space-y-1">
                    {item.empresaInstalacao && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Empresa</span>
                        <span className="font-semibold text-gray-700">{item.empresaInstalacao}</span>
                      </div>
                    )}
                    {item.contatoEmpresa && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Contato</span>
                        <span className="font-semibold text-blue-600">{item.contatoEmpresa}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", statusColor[item.status])}>
                  {statusLabel[item.status]}
                </span>
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", tipoColor[item.tipo])}>
                  {tipoLabel[item.tipo]}
                </span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400 text-sm">Nenhum equipamento encontrado.</div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Novo Equipamento" : "Editar Equipamento"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome</label>
                <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Comedouro Automático" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Localização</label>
                <input type="text" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Ex: Galpão Vale Verde" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoEquipamento })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    {tipoOptions.map((t) => <option key={t} value={t}>{tipoLabel[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusEquipamento })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="operacional">Operacional</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Marca</label>
                  <input type="text" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Ex: AviTech" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Modelo</label>
                  <input type="text" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="Ex: CA-500" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data de Instalação</label>
                  <input type="date" value={form.dataInstalacao} onChange={(e) => setForm({ ...form, dataInstalacao: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Próxima Manutenção</label>
                  <input type="date" value={form.proximaManutencao} onChange={(e) => setForm({ ...form, proximaManutencao: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Valor (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.valorEquipamento} onChange={(e) => setForm({ ...form, valorEquipamento: e.target.value })} placeholder="18500" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Horas de Uso</label>
                  <input type="number" min="0" value={form.horasUso} onChange={(e) => setForm({ ...form, horasUso: e.target.value })} placeholder="14200" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Vida Útil (h)</label>
                  <input type="number" min="0" value={form.vidaUtilHoras} onChange={(e) => setForm({ ...form, vidaUtilHoras: e.target.value })} placeholder="25000" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>

              {/* Suporte */}
              <div className="border-t border-dashed border-gray-200 pt-4">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Suporte</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Empresa de Suporte</label>
                    <input type="text" value={form.empresaInstalacao} onChange={(e) => setForm({ ...form, empresaInstalacao: e.target.value })} placeholder="Ex: AviTech Soluções" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contato do Suporte</label>
                    <input type="text" value={form.contatoEmpresa} onChange={(e) => setForm({ ...form, contatoEmpresa: e.target.value })} placeholder="(11) 98765-4321" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Notas sobre o equipamento..." rows={2} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all resize-none" />
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
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir este equipamento? Esta ação não pode ser desfeita.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={() => deleteItem(deleteConfirm)} className="px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
