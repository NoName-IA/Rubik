/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import { indiceActivo, medirCarrusel } from "../src/lib/carrusel.ts";
import { fechaLarga, saludo } from "../src/lib/fecha.ts";

test("en un celular típico caben dos tarjetas y se asoma la tercera", () => {
  const { ancho, paso } = medirCarrusel(390, 16, 12);
  const visibles = (390 - 16) / paso;
  assert.ok(visibles > 2 && visibles < 3, `visibles=${visibles}`);
  assert.equal(paso, ancho + 12);
});

test("el ancho de tarjeta tiene límites en pantallas muy pequeñas o grandes", () => {
  assert.equal(medirCarrusel(300, 16, 12).ancho, 128);
  assert.equal(medirCarrusel(1200, 16, 12).ancho, 200);
});

test("índice activo según el desplazamiento", () => {
  assert.equal(indiceActivo(0, 160, 400, 5), 0);
  assert.equal(indiceActivo(150, 160, 400, 5), 1);
  assert.equal(indiceActivo(330, 160, 400, 5), 2);
});

test("al final del recorrido se marca la última tarjeta aunque no quede alineada", () => {
  assert.equal(indiceActivo(170, 160, 170, 3), 2);
});

test("índice dentro de rango con valores raros", () => {
  assert.equal(indiceActivo(-50, 160, 400, 3), 0);
  assert.equal(indiceActivo(9999, 160, 0, 3), 2);
  assert.equal(indiceActivo(100, 160, 400, 0), 0);
});

test("saludo según la hora", () => {
  assert.equal(saludo(new Date(2026, 9, 12, 6)), "Buenos días");
  assert.equal(saludo(new Date(2026, 9, 12, 13)), "Buenas tardes");
  assert.equal(saludo(new Date(2026, 9, 12, 21)), "Buenas noches");
  assert.equal(saludo(new Date(2026, 9, 12, 2)), "Buenas noches");
});

test("fecha larga en español", () => {
  assert.equal(fechaLarga(new Date(2026, 9, 12)), "lunes 12 de octubre");
  assert.equal(fechaLarga(new Date(2026, 8, 30)), "miércoles 30 de septiembre");
});
