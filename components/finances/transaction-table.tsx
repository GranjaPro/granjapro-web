"use client";

import { Check, Pencil, Search, Trash2, X } from "lucide-react";
import { transactionCategories, type TransactionCategoryKey } from "@/lib/constants/transaction-categories";
import { cn } from "@/lib/utils";

export interface FinancialTransactionRow {
  id: string;
  date: string;
  type: "revenue" | "expense";
  category: string;
  description: string;
  amount: number;
  paymentMethod: string | null;
  reference: string | null;
  inventoryName: string | null;
}

interface TransactionTableProps {
  rows: FinancialTransactionRow[];
  loading: boolean;
  periodLabel: string;
  searchQuery: string;
  deleteConfirm: string | null;
  onSearchChange: (value: string) => void;
  onEdit: (row: FinancialTransactionRow) => void;
  onDeleteRequest: (id: string) => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: (id: string) => void;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function sourceLabel(reference: string | null): string | null {
  if (reference?.startsWith("sale:")) return "Gerado por venda";
  if (reference?.startsWith("inventory:")) return "Gerado pelo estoque";
  return null;
}

export function TransactionTable({
  rows,
  loading,
  periodLabel,
  searchQuery,
  deleteConfirm,
  onSearchChange,
  onEdit,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: TransactionTableProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Transações financeiras</h3>
          <p className="mt-0.5 text-xs text-gray-400">{rows.length} transações — {periodLabel}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="search" placeholder="Buscar transação..." value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:w-64" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Ações'].map((heading) => <th key={heading} className={cn("px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400", heading === 'Valor' || heading === 'Ações' ? "text-right" : "text-left")}>{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const generatedSource = sourceLabel(row.reference);
              const generated = Boolean(generatedSource);
              return (
                <tr key={row.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/50">
                  <td className="px-3 py-3 text-gray-600">{formatDate(row.date)}</td>
                  <td className="px-3 py-3"><span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-semibold", row.type === "revenue" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{row.type === "revenue" ? "Receita" : "Despesa"}</span></td>
                  <td className="px-3 py-3 text-gray-600">{transactionCategories[row.category as TransactionCategoryKey]?.label ?? row.category}</td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    <div>{row.description}</div>
                    {(row.inventoryName || generatedSource) && <div className="mt-0.5 text-[11px] font-normal text-gray-400">{row.inventoryName ? `Estoque: ${row.inventoryName}` : generatedSource}</div>}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-gray-900">{formatCurrency(row.amount)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {generated ? (
                        <span title="Edite este lançamento no módulo de origem" className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-500">Origem protegida</span>
                      ) : deleteConfirm === row.id ? (
                        <>
                          <button type="button" onClick={() => onDeleteConfirm(row.id)} aria-label="Confirmar exclusão" className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50"><Check className="h-4 w-4" /></button>
                          <button type="button" onClick={onDeleteCancel} aria-label="Cancelar exclusão" className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100"><X className="h-4 w-4" /></button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => onEdit(row)} aria-label="Editar transação" className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => onDeleteRequest(row.id)} aria-label="Excluir transação" className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-gray-400">Nenhuma transação encontrada</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
