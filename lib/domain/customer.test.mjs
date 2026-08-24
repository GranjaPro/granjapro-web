import assert from "node:assert/strict";
import test from "node:test";

import {
  formatBrazilianPhone,
  formatCnpj,
  formatPostalCode,
  isValidCnpj,
  normalizeBrazilianPhone,
  validateCustomerForm,
} from "./customer.ts";

const validForm = {
  name: "Mercado Central",
  type: "market",
  phone: "(11) 99999-8888",
  email: "COMPRAS@EXEMPLO.COM",
  cnpj: "11.222.333/0001-81",
  postalCode: "13010-001",
  street: " Rua das Flores ",
  addressNumber: "123",
  addressComplement: " Sala 2 ",
  neighborhood: " Centro ",
  city: " Campinas ",
  state: "SP",
  paymentTermsDays: "15",
  notes: " Entregar pela manhã ",
};

test("normalizes and validates a customer form", () => {
  const result = validateCustomerForm(validForm);
  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.deepEqual(result.value, {
    name: "Mercado Central",
    type: "market",
    phone: "11999998888",
    email: "compras@exemplo.com",
    cnpj: "11222333000181",
    postalCode: "13010001",
    street: "Rua das Flores",
    addressNumber: "123",
    addressComplement: "Sala 2",
    neighborhood: "Centro",
    city: "Campinas",
    state: "SP",
    location: "Rua das Flores, 123, Sala 2 - Centro, Campinas - SP, CEP 13010-001",
    paymentTermsDays: 15,
    notes: "Entregar pela manhã",
  });
});

test("rejects invalid customer contact and payment terms", () => {
  const result = validateCustomerForm({
    ...validForm,
    name: " ",
    type: "",
    phone: "abc",
    email: "invalido",
    paymentTermsDays: "366",
  });
  assert.equal(result.valid, false);
  if (result.valid) return;
  assert.deepEqual(Object.keys(result.errors).sort(), ["email", "name", "paymentTermsDays", "phone", "type"]);
});

test("formats Brazilian landline and mobile numbers", () => {
  assert.equal(normalizeBrazilianPhone("+55 (11) 99999-8888"), "11999998888");
  assert.equal(formatBrazilianPhone("11999998888"), "(11) 99999-8888");
  assert.equal(formatBrazilianPhone("1133334444"), "(11) 3333-4444");
});

test("formats and validates CNPJ and postal code", () => {
  assert.equal(formatCnpj("11222333000181"), "11.222.333/0001-81");
  assert.equal(isValidCnpj("11.222.333/0001-81"), true);
  assert.equal(isValidCnpj("11.111.111/1111-11"), false);
  assert.equal(formatPostalCode("13010001"), "13010-001");
});

test("requires CNPJ for business customers and allows it empty for direct sales", () => {
  const businessResult = validateCustomerForm({ ...validForm, cnpj: "" });
  assert.equal(businessResult.valid, false);
  if (!businessResult.valid) assert.equal(Boolean(businessResult.errors.cnpj), true);

  const directResult = validateCustomerForm({ ...validForm, type: "direct", cnpj: "" });
  assert.equal(directResult.valid, true);
});

test("requires every essential address field", () => {
  const result = validateCustomerForm({
    ...validForm,
    postalCode: "",
    street: "",
    addressNumber: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  assert.equal(result.valid, false);
  if (result.valid) return;
  assert.deepEqual(
    Object.keys(result.errors).sort(),
    ["addressNumber", "city", "neighborhood", "postalCode", "state", "street"],
  );
});
