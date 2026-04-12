export const transactionCategories = {
  feed:        { key: "feed",        label: "Ração" },
  labor:       { key: "labor",       label: "Funcionários" },
  energy:      { key: "energy",      label: "Energia" },
  water:       { key: "water",       label: "Água" },
  medicines:   { key: "medicines",   label: "Medicamentos" },
  maintenance: { key: "maintenance", label: "Manutenção" },
  other:       { key: "other",       label: "Outros" },
} as const;

export type TransactionCategoryKey = keyof typeof transactionCategories;
