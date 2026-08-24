"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";
import { transactionCategories } from "@/lib/constants/transaction-categories";
import { parsePositiveAmount } from "@/lib/domain/financial-transaction";
import { cn } from "@/lib/utils";

export interface TransactionFormState {
  date: string;
  type: "expense";
  category: string;
  description: string;
  amount: string;
  paymentMethod: string;
  inventorySelection: string;
}

export interface InventoryOption {
  key: string;
  label: string;
  group: string;
}

interface TransactionModalProps {
  mode: "add" | "edit";
  form: TransactionFormState;
  inventoryOptions: InventoryOption[];
  error: string | null;
  submitting: boolean;
  onChange: (form: TransactionFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function TransactionModal({
  mode,
  form,
  inventoryOptions,
  error,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: TransactionModalProps) {
  const amountResult = parsePositiveAmount(form.amount);
  const amountError = form.amount !== "" && !amountResult.valid ? amountResult.message : null;
  const invalid = !form.date.trim() || !form.description.trim() || !amountResult.valid;
  const groupedOptions = inventoryOptions.reduce((groups, option) => {
    const current = groups.get(option.group) ?? [];
    current.push(option);
    groups.set(option.group, current);
    return groups;
  }, new Map<string, InventoryOption[]>());

  return (
    <AccessibleDialog
      titleId="financial-transaction-title"
      onClose={onClose}
      preventClose={submitting}
      className="max-w-lg"
    >
        <form noValidate onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 id="financial-transaction-title" className="text-lg font-bold text-gray-900">
                {mode === "add" ? "Registrar despesa" : "Editar despesa"}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">Campos marcados com * são obrigatórios.</p>
            </div>
            <button type="button" onClick={onClose} disabled={submitting} aria-label="Fechar formulário de despesa" className="cursor-pointer rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label htmlFor="expense-date" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Data *
                <input id="expense-date" data-autofocus aria-required="true" type="date" value={form.date} onChange={(event) => onChange({ ...form, date: event.target.value })} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm normal-case tracking-normal focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </label>
              <label htmlFor="expense-category" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Categoria
                <select id="expense-category" value={form.category} onChange={(event) => onChange({ ...form, category: event.target.value })} className="mt-1.5 w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm normal-case tracking-normal focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                  {Object.entries(transactionCategories).map(([key, category]) => <option key={key} value={key}>{category.label}</option>)}
                </select>
              </label>
            </div>

            <label htmlFor="expense-description" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Descrição *
              <input id="expense-description" aria-required="true" type="text" value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} placeholder="Ex: Compra de ração" className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm normal-case tracking-normal placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </label>

            <label htmlFor="expense-inventory" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Item de estoque (opcional)
              <select id="expense-inventory" value={form.inventorySelection} onChange={(event) => onChange({ ...form, inventorySelection: event.target.value })} className="mt-1.5 w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm normal-case tracking-normal focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                <option value="">Nenhum item vinculado</option>
                {Array.from(groupedOptions.entries()).map(([group, options]) => (
                  <optgroup key={group} label={group}>
                    {options.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label htmlFor="expense-amount" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Valor (R$) *
                <input id="expense-amount" aria-required="true" type="number" step="0.01" min="0.01" value={form.amount} onChange={(event) => onChange({ ...form, amount: event.target.value })} aria-invalid={Boolean(amountError)} className={cn("mt-1.5 w-full rounded-xl border bg-gray-50 px-3.5 py-2.5 text-sm normal-case tracking-normal focus:outline-none focus:ring-2", amountError ? "border-red-300 focus:border-red-400 focus:ring-red-500/20" : "border-gray-200 focus:border-brand-300 focus:ring-brand-500/20")} />
              </label>
              <label htmlFor="expense-payment-method" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Método de pagamento
                <input id="expense-payment-method" type="text" value={form.paymentMethod} onChange={(event) => onChange({ ...form, paymentMethod: event.target.value })} placeholder="Ex: PIX, Dinheiro" className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm normal-case tracking-normal placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </label>
            </div>

            {(amountError || error) && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error ?? amountError}</span>
              </div>
            )}

            {amountResult.valid && (
              <div className="rounded-xl bg-red-50 p-3 text-center">
                <p className="text-xs font-medium text-red-600">Valor da despesa</p>
                <p className="text-lg font-bold text-red-700">{amountResult.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
            <button type="button" onClick={onClose} disabled={submitting} className="flex-1 cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">Cancelar</button>
            <button type="submit" disabled={invalid || submitting} className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Salvando..." : mode === "add" ? "Registrar" : "Salvar"}
            </button>
          </div>
        </form>
    </AccessibleDialog>
  );
}
