export function isValidMortalityQuantity(value: string): boolean {
  if (value.trim() === "") return false;

  const quantity = Number(value);
  return Number.isFinite(quantity) && Number.isInteger(quantity) && quantity >= 1;
}
