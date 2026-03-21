"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  UserCheck,
  UserX,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CargoFuncionario = "gerente" | "tratador" | "coletor" | "motorista" | "manutencao" | "administrativo";
type StatusFuncionario = "ativo" | "ferias" | "afastado" | "desligado";

interface Funcionario {
  id: number;
  nome: string;
  cargo: CargoFuncionario;
  status: StatusFuncionario;
  telefone: string;
  email: string;
  localizacao: string;
  dataAdmissao: string;
  salario: number;
  observacoes: string;
}

const cargoLabel: Record<CargoFuncionario, string> = {
  gerente: "Gerente",
  tratador: "Tratador",
  coletor: "Coletor de Ovos",
  motorista: "Motorista",
  manutencao: "Manutenção",
  administrativo: "Administrativo",
};

const cargoColor: Record<CargoFuncionario, string> = {
  gerente: "text-purple-700 bg-purple-50",
  tratador: "text-green-700 bg-green-50",
  coletor: "text-amber-700 bg-amber-50",
  motorista: "text-blue-700 bg-blue-50",
  manutencao: "text-orange-700 bg-orange-50",
  administrativo: "text-cyan-700 bg-cyan-50",
};

const statusLabel: Record<StatusFuncionario, string> = {
  ativo: "Ativo",
  ferias: "Férias",
  afastado: "Afastado",
  desligado: "Desligado",
};

const statusColor: Record<StatusFuncionario, string> = {
  ativo: "text-emerald-700 bg-emerald-50",
  ferias: "text-blue-700 bg-blue-50",
  afastado: "text-amber-700 bg-amber-50",
  desligado: "text-gray-500 bg-gray-100",
};

const initialFuncionarios: Funcionario[] = [
  { id: 1, nome: "Carlos Oliveira", cargo: "gerente", status: "ativo", telefone: "(11) 99876-5432", email: "carlos@granjapro.com", localizacao: "Escritório Central", dataAdmissao: "2020-03-10", salario: 5500, observacoes: "Responsável geral pela operação." },
  { id: 2, nome: "Maria Santos", cargo: "coletor", status: "ativo", telefone: "(11) 98765-4321", email: "maria@granjapro.com", localizacao: "Galpão Vale Verde", dataAdmissao: "2022-06-15", salario: 2200, observacoes: "Coleta matutina e vespertina." },
  { id: 3, nome: "José Pereira", cargo: "tratador", status: "ativo", telefone: "(11) 97654-3210", email: "jose@granjapro.com", localizacao: "Galpão Central", dataAdmissao: "2021-01-20", salario: 2400, observacoes: "Cuida da alimentação e saúde das aves." },
  { id: 4, nome: "Ana Costa", cargo: "administrativo", status: "ferias", telefone: "(11) 96543-2109", email: "ana@granjapro.com", localizacao: "Escritório Central", dataAdmissao: "2023-02-01", salario: 3000, observacoes: "Retorna em 2 semanas." },
  { id: 5, nome: "Pedro Lima", cargo: "motorista", status: "ativo", telefone: "(11) 95432-1098", email: "pedro@granjapro.com", localizacao: "Setor de Logística", dataAdmissao: "2022-09-12", salario: 2800, observacoes: "Responsável pelas entregas regionais." },
];

const cargoOptions: CargoFuncionario[] = ["gerente", "tratador", "coletor", "motorista", "manutencao", "administrativo"];

type ModalMode = "add" | "edit" | null;

const emptyForm = {
  nome: "",
  cargo: "tratador" as CargoFuncionario,
  status: "ativo" as StatusFuncionario,
  telefone: "",
  email: "",
  localizacao: "",
  dataAdmissao: "",
  salario: "",
  observacoes: "",
};

export default function FuncionariosPage() {
  const [search, setSearch] = useState("");
  const [funcionarios, setFuncionarios] = useState(initialFuncionarios);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Funcionario | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [filterCargo, setFilterCargo] = useState<CargoFuncionario | "todos">("todos");

  function openAdd() {
    setForm({ ...emptyForm });
    setEditing(null);
    setModal("add");
  }

  function openEdit(item: Funcionario) {
    setForm({
      nome: item.nome,
      cargo: item.cargo,
      status: item.status,
      telefone: item.telefone,
      email: item.email,
      localizacao: item.localizacao,
      dataAdmissao: item.dataAdmissao,
      salario: String(item.salario),
      observacoes: item.observacoes,
    });
    setEditing(item);
    setModal("edit");
  }

  function save() {
    if (!form.nome.trim()) return;
    const item: Funcionario = {
      id: editing?.id || Date.now(),
      nome: form.nome,
      cargo: form.cargo,
      status: form.status,
      telefone: form.telefone,
      email: form.email,
      localizacao: form.localizacao,
      dataAdmissao: form.dataAdmissao,
      salario: Number(form.salario) || 0,
      observacoes: form.observacoes,
    };
    if (modal === "add") setFuncionarios((prev) => [...prev, item]);
    else if (editing) setFuncionarios((prev) => prev.map((i) => (i.id === editing.id ? item : i)));
    setModal(null);
  }

  function deleteItem(id: number) {
    setFuncionarios((prev) => prev.filter((i) => i.id !== id));
    setDeleteConfirm(null);
  }

  const filtered = funcionarios.filter((i) => {
    const matchSearch = i.nome.toLowerCase().includes(search.toLowerCase()) || i.localizacao.toLowerCase().includes(search.toLowerCase());
    const matchCargo = filterCargo === "todos" || i.cargo === filterCargo;
    return matchSearch && matchCargo;
  });

  const totalAtivos = funcionarios.filter((i) => i.status === "ativo").length;
  const totalFerias = funcionarios.filter((i) => i.status === "ferias").length;
  const totalAfastados = funcionarios.filter((i) => i.status === "afastado").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Funcionários</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gerencie a equipe da sua granja</p>
          </div>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-5 py-2.5 transition-colors cursor-pointer shadow-sm shadow-brand-600/20">
          <Plus className="w-4 h-4" />
          Novo Funcionário
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{funcionarios.length}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Total de Funcionários</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{totalAtivos}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Ativos</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{totalFerias}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Em Férias</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{totalAfastados}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Afastados</p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {([
            { key: "todos" as const, label: "Todos" },
            { key: "gerente" as const, label: "Gerente" },
            { key: "tratador" as const, label: "Tratador" },
            { key: "coletor" as const, label: "Coletor" },
            { key: "motorista" as const, label: "Motorista" },
            { key: "manutencao" as const, label: "Manutenção" },
            { key: "administrativo" as const, label: "Admin" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterCargo(t.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap",
                filterCargo === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 w-full sm:w-72 sm:ml-auto focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input type="text" placeholder="Buscar funcionário..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.status === "ativo" && "bg-indigo-50", item.status === "ferias" && "bg-blue-50", item.status === "afastado" && "bg-amber-50", item.status === "desligado" && "bg-gray-100")}>
                  <Briefcase className={cn("w-5 h-5", item.status === "ativo" && "text-indigo-600", item.status === "ferias" && "text-blue-600", item.status === "afastado" && "text-amber-600", item.status === "desligado" && "text-gray-400")} />
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

            {/* Info */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</span>
                <span className="font-semibold text-gray-700">{item.telefone || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>
                <span className="font-semibold text-gray-700 truncate max-w-[160px]">{item.email || "—"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Admissão</span>
                <span className="font-semibold text-gray-700">{item.dataAdmissao ? new Date(item.dataAdmissao).toLocaleDateString("pt-BR") : "—"}</span>
              </div>
            </div>

            {item.observacoes && (
              <p className="text-xs text-gray-400 mt-3 line-clamp-2">{item.observacoes}</p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", statusColor[item.status])}>
                {statusLabel[item.status]}
              </span>
              <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg", cargoColor[item.cargo])}>
                {cargoLabel[item.cargo]}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400 text-sm">Nenhum funcionário encontrado.</div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === "add" ? "Novo Funcionário" : "Editar Funcionário"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome</label>
                <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: João da Silva" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cargo</label>
                  <select value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value as CargoFuncionario })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    {cargoOptions.map((c) => <option key={c} value={c}>{cargoLabel[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusFuncionario })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all bg-white cursor-pointer">
                    <option value="ativo">Ativo</option>
                    <option value="ferias">Férias</option>
                    <option value="afastado">Afastado</option>
                    <option value="desligado">Desligado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Telefone</label>
                  <input type="text" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-0000" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@granja.com" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Localização</label>
                <input type="text" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Ex: Galpão Central" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data de Admissão</label>
                  <input type="date" value={form.dataAdmissao} onChange={(e) => setForm({ ...form, dataAdmissao: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Salário (R$)</label>
                  <input type="number" value={form.salario} onChange={(e) => setForm({ ...form, salario: e.target.value })} placeholder="2500" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Notas sobre o funcionário..." rows={2} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-all resize-none" />
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
            <p className="text-sm text-gray-500">Tem certeza que deseja excluir este funcionário? Esta ação não pode ser desfeita.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">Cancelar</button>
              <button onClick={() => deleteItem(deleteConfirm)} className="px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
