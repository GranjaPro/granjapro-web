import assert from "node:assert/strict";
import test from "node:test";

import { isValidMortalityQuantity } from "./mortality-validation.ts";

test("accepts positive integer mortality quantities", () => {
  assert.equal(isValidMortalityQuantity("1"), true);
  assert.equal(isValidMortalityQuantity("42"), true);
});

test("rejects empty mortality quantities", () => {
  assert.equal(isValidMortalityQuantity(""), false);
  assert.equal(isValidMortalityQuantity("   "), false);
});

test("rejects zero and negative mortality quantities", () => {
  assert.equal(isValidMortalityQuantity("0"), false);
  assert.equal(isValidMortalityQuantity("-1"), false);
});

test("rejects decimal mortality quantities", () => {
  assert.equal(isValidMortalityQuantity("1.5"), false);
});

test("rejects non-numeric and non-finite mortality quantities", () => {
  assert.equal(isValidMortalityQuantity("invalid"), false);
  assert.equal(isValidMortalityQuantity("NaN"), false);
  assert.equal(isValidMortalityQuantity("Infinity"), false);
  assert.equal(isValidMortalityQuantity("1e309"), false);
});
