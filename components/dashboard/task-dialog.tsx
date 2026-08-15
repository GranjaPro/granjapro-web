"use client";

import { X } from "lucide-react";
import ModalPortal from "@/components/ui/modal-portal";

export type TaskCategory = "coleta" | "alimentacao" | "limpeza" | "inspecao" | "saude" | "geral";
export type TaskPriority = "alta" | "media" | "baixa";
export type TaskRecurrence = "diaria" | "semanal" | "mensal" | "unica";

export interface TaskDialogValues {
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  scheduledTime: string;
  recurrence: TaskRecurrence;
  notes: string;
}

interface TaskDialogOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface TaskDialogProps {
  open: boolean;
  mode: "create" | "edit";
  values: TaskDialogValues;
  scopeLabel?: string;
  scopeValue?: string;
  scopeOptions?: TaskDialogOption<string>[];
  categoryOptions: TaskDialogOption<TaskCategory>[];
  priorityOptions: TaskDialogOption<TaskPriority>[];
  recurrenceOptions: TaskDialogOption<TaskRecurrence>[];
  onScopeChange?: (value: string) => void;
  onChange: (values: TaskDialogValues) => void;
  onClose: () => void;
  onSave: () => void;
}

export function TaskDialog({
  open,
  mode,
  values,
  scopeLabel,
  scopeValue,
  scopeOptions,
  categoryOptions,
  priorityOptions,
  recurrenceOptions,
  onScopeChange,
  onChange,
  onClose,
  onSave,
}: TaskDialogProps) {
  if (!open) return null;

  const canSave = values.title.trim().length > 0;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900">{mode === "edit" ? "Editar tarefa" : "Nova tarefa"}</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer" type="button">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {scopeOptions && scopeValue !== undefined && onScopeChange && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{scopeLabel ?? "Escopo"}</label>
                <select
                  value={scopeValue}
                  onChange={(event) => onScopeChange(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                >
                  {scopeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Titulo</label>
              <input
                value={values.title}
                onChange={(event) => onChange({ ...values, title: event.target.value })}
                placeholder="Ex: Coletar ovos - tarde"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Categoria</label>
                <select
                  value={values.category}
                  onChange={(event) => onChange({ ...values, category: event.target.value as TaskCategory })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prioridade</label>
                <select
                  value={values.priority}
                  onChange={(event) => onChange({ ...values, priority: event.target.value as TaskPriority })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Horario</label>
                <input
                  type="time"
                  value={values.scheduledTime}
                  onChange={(event) => onChange({ ...values, scheduledTime: event.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Recorrencia</label>
                <select
                  value={values.recurrence}
                  onChange={(event) => onChange({ ...values, recurrence: event.target.value as TaskRecurrence })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                >
                  {recurrenceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas</label>
              <textarea
                value={values.notes}
                onChange={(event) => onChange({ ...values, notes: event.target.value })}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 p-5 border-t border-gray-100">
            <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer" type="button">
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={!canSave}
              className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              type="button"
            >
              {mode === "edit" ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
