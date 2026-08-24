export const CUSTOMER_TYPES = ["market", "restaurant", "distributor", "direct"] as const;
export const BRAZILIAN_STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export interface CustomerFormState {
  name: string;
  type: CustomerType | "";
  phone: string;
  email: string;
  cnpj: string;
  postalCode: string;
  street: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
  paymentTermsDays: string;
  notes: string;
}

export interface NormalizedCustomerForm {
  name: string;
  type: CustomerType;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  postalCode: string;
  street: string;
  addressNumber: string;
  addressComplement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  location: string;
  paymentTermsDays: number;
  notes: string | null;
}

export type CustomerFormErrors = Partial<Record<keyof CustomerFormState, string>>;

export type CustomerValidationResult =
  | { valid: true; value: NormalizedCustomerForm }
  | { valid: false; errors: CustomerFormErrors };

export function normalizeBrazilianPhone(value: string): string {
  return value.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
}

export function formatBrazilianPhone(value: string): string {
  const digits = normalizeBrazilianPhone(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

export function formatCnpj(value: string): string {
  const digits = normalizeCnpj(value);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function calculateCnpjDigit(base: string, weights: number[]): number {
  const sum = base.split("").reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: string): boolean {
  const digits = normalizeCnpj(value);
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false;
  const firstDigit = calculateCnpjDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateCnpjDigit(`${digits.slice(0, 12)}${firstDigit}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits.endsWith(`${firstDigit}${secondDigit}`);
}

export function normalizePostalCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function formatPostalCode(value: string): string {
  const digits = normalizePostalCode(value);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function formatCustomerLocation(input: Pick<CustomerFormState, "street" | "addressNumber" | "addressComplement" | "neighborhood" | "city" | "state" | "postalCode">): string {
  const complement = input.addressComplement.trim() ? `, ${input.addressComplement.trim()}` : "";
  return `${input.street.trim()}, ${input.addressNumber.trim()}${complement} - ${input.neighborhood.trim()}, ${input.city.trim()} - ${input.state.trim().toUpperCase()}, CEP ${formatPostalCode(input.postalCode)}`;
}

export function validateCustomerForm(form: CustomerFormState): CustomerValidationResult {
  const errors: CustomerFormErrors = {};
  const name = form.name.trim();
  const phone = normalizeBrazilianPhone(form.phone);
  const email = form.email.trim().toLowerCase();
  const cnpj = normalizeCnpj(form.cnpj);
  const postalCode = normalizePostalCode(form.postalCode);
  const state = form.state.trim().toUpperCase();
  const paymentTermsDays = Number(form.paymentTermsDays);

  if (name.length < 2 || name.length > 120) {
    errors.name = "Informe um nome entre 2 e 120 caracteres.";
  }
  if (!form.type || !CUSTOMER_TYPES.includes(form.type)) {
    errors.type = "Selecione o tipo de cliente.";
  }
  if (form.phone.trim() && !/^\d{10,11}$/.test(phone)) {
    errors.phone = "Informe um telefone com DDD e 10 ou 11 dígitos.";
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Informe um e-mail válido.";
  }
  if ((form.type !== "direct" || cnpj) && !isValidCnpj(cnpj)) {
    errors.cnpj = form.type === "direct" ? "Informe um CNPJ válido." : "O CNPJ é obrigatório e deve ser válido.";
  }
  if (!/^\d{8}$/.test(postalCode)) errors.postalCode = "Informe um CEP com 8 dígitos.";
  if (form.street.trim().length < 2) errors.street = "Informe o logradouro.";
  if (!form.addressNumber.trim()) errors.addressNumber = "Informe o número.";
  if (form.neighborhood.trim().length < 2) errors.neighborhood = "Informe o bairro.";
  if (form.city.trim().length < 2) errors.city = "Informe a cidade.";
  if (!BRAZILIAN_STATES.includes(state as (typeof BRAZILIAN_STATES)[number])) errors.state = "Selecione a UF.";
  if (!Number.isInteger(paymentTermsDays) || paymentTermsDays < 0 || paymentTermsDays > 365) {
    errors.paymentTermsDays = "Informe um prazo inteiro entre 0 e 365 dias.";
  }

  if (Object.keys(errors).length > 0 || !form.type) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      name,
      type: form.type,
      phone: phone || null,
      email: email || null,
      cnpj: cnpj || null,
      postalCode,
      street: form.street.trim(),
      addressNumber: form.addressNumber.trim(),
      addressComplement: form.addressComplement.trim() || null,
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      state,
      location: formatCustomerLocation(form),
      paymentTermsDays,
      notes: form.notes.trim() || null,
    },
  };
}
