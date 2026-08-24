"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";
import {
  BRAZILIAN_STATES,
  formatCnpj,
  formatBrazilianPhone,
  formatPostalCode,
  type CustomerFormErrors,
  type CustomerFormState,
  type CustomerType,
} from "@/lib/domain/customer";
import { cn } from "@/lib/utils";

const CUSTOMER_TYPE_OPTIONS: Array<{ value: CustomerType; label: string }> = [
  { value: "market", label: "Mercado" },
  { value: "restaurant", label: "Restaurante" },
  { value: "distributor", label: "Distribuidor" },
  { value: "direct", label: "Venda direta" },
];

interface CustomerModalProps {
  mode: "add" | "edit";
  form: CustomerFormState;
  errors: CustomerFormErrors;
  submitError: string | null;
  submitting: boolean;
  onChange: (form: CustomerFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
}

interface FieldErrorProps {
  id: string;
  message?: string;
}

function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return <p id={id} className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

export function CustomerModal({
  mode,
  form,
  errors,
  submitError,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: CustomerModalProps) {
  function fieldClass(hasError: boolean) {
    return cn(
      "mt-1.5 w-full rounded-xl border bg-gray-50 px-3.5 py-2.5 text-sm normal-case tracking-normal outline-none transition-all placeholder:text-gray-400 focus:ring-2",
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-red-500/20"
        : "border-gray-200 focus:border-brand-300 focus:ring-brand-500/20",
    );
  }

  return (
    <AccessibleDialog titleId="customer-modal-title" onClose={onClose} preventClose={submitting} className="max-w-2xl">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 id="customer-modal-title" className="text-lg font-bold text-gray-900">
              {mode === "add" ? "Novo cliente" : "Editar cliente"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">Campos marcados com * são obrigatórios.</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Fechar formulário de cliente" className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <label htmlFor="customer-name" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Nome *
            <input id="customer-name" data-autofocus type="text" autoComplete="organization" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "customer-name-error" : undefined} className={fieldClass(Boolean(errors.name))} placeholder="Nome do cliente" />
            <FieldError id="customer-name-error" message={errors.name} />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label htmlFor="customer-cnpj" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              CNPJ {form.type === "direct" ? "(opcional)" : "*"}
              <input id="customer-cnpj" type="text" inputMode="numeric" autoComplete="off" value={form.cnpj} onChange={(event) => onChange({ ...form, cnpj: formatCnpj(event.target.value) })} aria-invalid={Boolean(errors.cnpj)} aria-describedby={errors.cnpj ? "customer-cnpj-error" : undefined} className={fieldClass(Boolean(errors.cnpj))} placeholder="00.000.000/0000-00" />
              <FieldError id="customer-cnpj-error" message={errors.cnpj} />
            </label>
            <label htmlFor="customer-type" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Tipo de cliente *
              <select id="customer-type" value={form.type} onChange={(event) => onChange({ ...form, type: event.target.value as CustomerType })} aria-invalid={Boolean(errors.type)} aria-describedby={errors.type ? "customer-type-error" : undefined} className={cn(fieldClass(Boolean(errors.type)), "cursor-pointer")}>
                <option value="">Selecione...</option>
                {CUSTOMER_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <FieldError id="customer-type-error" message={errors.type} />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label htmlFor="customer-phone" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Telefone
              <input id="customer-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => onChange({ ...form, phone: formatBrazilianPhone(event.target.value) })} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "customer-phone-error" : undefined} className={fieldClass(Boolean(errors.phone))} placeholder="(00) 00000-0000" />
              <FieldError id="customer-phone-error" message={errors.phone} />
            </label>
            <label htmlFor="customer-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              E-mail
              <input id="customer-email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(event) => onChange({ ...form, email: event.target.value })} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "customer-email-error" : undefined} className={fieldClass(Boolean(errors.email))} placeholder="email@exemplo.com" />
              <FieldError id="customer-email-error" message={errors.email} />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label htmlFor="customer-payment-terms" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Prazo de pagamento (dias) *
              <input id="customer-payment-terms" type="number" inputMode="numeric" min="0" max="365" step="1" value={form.paymentTermsDays} onChange={(event) => onChange({ ...form, paymentTermsDays: event.target.value })} aria-invalid={Boolean(errors.paymentTermsDays)} aria-describedby={errors.paymentTermsDays ? "customer-payment-error" : "customer-payment-help"} className={fieldClass(Boolean(errors.paymentTermsDays))} />
              <p id="customer-payment-help" className="mt-1 text-[11px] font-normal normal-case tracking-normal text-gray-400">Use 0 para pagamento à vista.</p>
              <FieldError id="customer-payment-error" message={errors.paymentTermsDays} />
            </label>
          </div>

          <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Endereço</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
              <label htmlFor="customer-postal-code" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                CEP *
                <input id="customer-postal-code" type="text" inputMode="numeric" autoComplete="postal-code" value={form.postalCode} onChange={(event) => onChange({ ...form, postalCode: formatPostalCode(event.target.value) })} aria-invalid={Boolean(errors.postalCode)} aria-describedby={errors.postalCode ? "customer-postal-code-error" : undefined} className={fieldClass(Boolean(errors.postalCode))} placeholder="00000-000" />
                <FieldError id="customer-postal-code-error" message={errors.postalCode} />
              </label>
              <label htmlFor="customer-state" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                UF *
                <select id="customer-state" autoComplete="address-level1" value={form.state} onChange={(event) => onChange({ ...form, state: event.target.value })} aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? "customer-state-error" : undefined} className={cn(fieldClass(Boolean(errors.state)), "cursor-pointer")}>
                  <option value="">UF</option>
                  {BRAZILIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
                <FieldError id="customer-state-error" message={errors.state} />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
              <label htmlFor="customer-street" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Logradouro *
                <input id="customer-street" type="text" autoComplete="address-line1" value={form.street} onChange={(event) => onChange({ ...form, street: event.target.value })} aria-invalid={Boolean(errors.street)} aria-describedby={errors.street ? "customer-street-error" : undefined} className={fieldClass(Boolean(errors.street))} placeholder="Rua, avenida..." />
                <FieldError id="customer-street-error" message={errors.street} />
              </label>
              <label htmlFor="customer-address-number" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Número *
                <input id="customer-address-number" type="text" autoComplete="address-line2" value={form.addressNumber} onChange={(event) => onChange({ ...form, addressNumber: event.target.value })} aria-invalid={Boolean(errors.addressNumber)} aria-describedby={errors.addressNumber ? "customer-address-number-error" : undefined} className={fieldClass(Boolean(errors.addressNumber))} placeholder="123" />
                <FieldError id="customer-address-number-error" message={errors.addressNumber} />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label htmlFor="customer-address-complement" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Complemento
                <input id="customer-address-complement" type="text" value={form.addressComplement} onChange={(event) => onChange({ ...form, addressComplement: event.target.value })} className={fieldClass(false)} placeholder="Sala, bloco..." />
              </label>
              <label htmlFor="customer-neighborhood" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Bairro *
                <input id="customer-neighborhood" type="text" value={form.neighborhood} onChange={(event) => onChange({ ...form, neighborhood: event.target.value })} aria-invalid={Boolean(errors.neighborhood)} aria-describedby={errors.neighborhood ? "customer-neighborhood-error" : undefined} className={fieldClass(Boolean(errors.neighborhood))} placeholder="Bairro" />
                <FieldError id="customer-neighborhood-error" message={errors.neighborhood} />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label htmlFor="customer-city" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Cidade *
                <input id="customer-city" type="text" autoComplete="address-level2" value={form.city} onChange={(event) => onChange({ ...form, city: event.target.value })} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "customer-city-error" : undefined} className={fieldClass(Boolean(errors.city))} placeholder="Cidade" />
                <FieldError id="customer-city-error" message={errors.city} />
              </label>
            </div>
          </fieldset>

          <label htmlFor="customer-notes" className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Observações
            <textarea id="customer-notes" rows={3} value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} className={cn(fieldClass(false), "resize-y")} placeholder="Notas sobre o cliente..." />
          </label>

          {submitError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
          <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={submitting} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Salvando..." : mode === "add" ? "Cadastrar" : "Salvar"}
          </button>
        </div>
      </form>
    </AccessibleDialog>
  );
}
