/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import { buscarCiudad, CIUDADES } from "../src/lib/ciudades.ts";
import { conNombre, leerPreferencias, PREFERENCIAS_INICIALES } from "../src/lib/preferencias.ts";

test("sin nada guardado o dañado: valores iniciales", () => {
  assert.deepEqual(leerPreferencias(null), PREFERENCIAS_INICIALES);
  assert.deepEqual(leerPreferencias("{no es json"), PREFERENCIAS_INICIALES);
  assert.deepEqual(leerPreferencias("42"), PREFERENCIAS_INICIALES);
});

test("lee lo guardado y corrige lo inválido", () => {
  const p = leerPreferencias(JSON.stringify({ nombre: "  Ana  ", ubicacion: "luna", ciudad: "atlantida", arroyos: "mas", tema: "oscuro" }));
  // "arroyos" era de una versión anterior (la alerta ya no existe): se ignora.
  assert.ok(!("arroyos" in p));
  assert.equal(p.nombre, "Ana");
  assert.equal(p.ubicacion, "gps");
  assert.equal(p.ciudad, "barranquilla");
  assert.equal(p.tema, "oscuro");
  assert.equal(leerPreferencias(JSON.stringify({ nombre: "x".repeat(50) })).nombre.length, 30);
  assert.deepEqual(
    { ubicacion: leerPreferencias(JSON.stringify({ ubicacion: "ciudad", ciudad: "cartagena" })).ubicacion, ciudad: leerPreferencias(JSON.stringify({ ubicacion: "ciudad", ciudad: "cartagena" })).ciudad },
    { ubicacion: "ciudad", ciudad: "cartagena" },
  );
});

test("migra 'Barranquilla fija' de la versión anterior", () => {
  const p = leerPreferencias(JSON.stringify({ ubicacion: "barranquilla", fuentes: { google: false } }));
  assert.equal(p.ubicacion, "ciudad");
  assert.equal(p.ciudad, "barranquilla");
  assert.ok(!("fuentes" in p), "las fuentes de noticias ya no son una preferencia");
});

test("ciudades: ids únicos y búsqueda", () => {
  assert.equal(new Set(CIUDADES.map((c) => c.id)).size, CIUDADES.length);
  assert.equal(buscarCiudad("medellin")?.nombre, "Medellín");
  assert.equal(buscarCiudad("nada"), undefined);
});

test("saludo con nombre", () => {
  assert.equal(conNombre("Buenas tardes", ""), "Buenas tardes");
  assert.equal(conNombre("Buenas tardes", "Ana"), "Buenas tardes, Ana");
});
