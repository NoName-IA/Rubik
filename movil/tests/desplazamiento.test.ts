/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import { progresoDesplazamiento, UMBRAL_FINAL, UMBRAL_VISIBLE } from "../src/lib/desplazamiento.ts";

test("progreso del desplazamiento entre 0 y 1", () => {
  assert.equal(progresoDesplazamiento(0, 3000, 800), 0);
  assert.equal(progresoDesplazamiento(1100, 3000, 800), 0.5);
  assert.equal(progresoDesplazamiento(2200, 3000, 800), 1);
  // El rebote de Android/iOS puede dar valores fuera del recorrido.
  assert.equal(progresoDesplazamiento(-40, 3000, 800), 0);
  assert.equal(progresoDesplazamiento(2300, 3000, 800), 1);
});

test("si todo cabe en pantalla el progreso es 0 (el botón no aparece)", () => {
  assert.equal(progresoDesplazamiento(0, 600, 800), 0);
  assert.equal(progresoDesplazamiento(10, 800, 800), 0);
  assert.ok(progresoDesplazamiento(0, 600, 800) <= UMBRAL_VISIBLE);
  assert.ok(UMBRAL_VISIBLE < UMBRAL_FINAL);
});
