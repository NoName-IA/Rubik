/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import { buscarCiudad, CIUDADES, hayArroyos } from "../src/lib/ciudades.ts";
import { horaConRiesgo, UMBRAL_ARROYOS } from "../src/lib/clima/resumen.ts";
import type { Hora } from "../src/lib/clima/tipos.ts";
import { conNombre, leerPreferencias, PREFERENCIAS_INICIALES, umbralArroyos } from "../src/lib/preferencias.ts";

test("sin nada guardado o dañado: valores iniciales", () => {
  assert.deepEqual(leerPreferencias(null), PREFERENCIAS_INICIALES);
  assert.deepEqual(leerPreferencias("{no es json"), PREFERENCIAS_INICIALES);
  assert.deepEqual(leerPreferencias("42"), PREFERENCIAS_INICIALES);
});

test("lee lo guardado y corrige lo inválido", () => {
  const p = leerPreferencias(JSON.stringify({ nombre: "  Ana  ", ubicacion: "luna", ciudad: "atlantida", arroyos: "mas", tema: "oscuro" }));
  assert.equal(p.nombre, "Ana");
  assert.equal(p.ubicacion, "gps");
  assert.equal(p.ciudad, "barranquilla");
  assert.equal(p.arroyos, "mas");
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

test("la alerta de arroyos solo aplica en el área de Barranquilla", () => {
  for (const c of CIUDADES) assert.equal(hayArroyos(c.coordenadas), c.arroyos, c.nombre);
  // El Prado (Barranquilla), por GPS
  assert.equal(hayArroyos({ latitud: 10.9965, longitud: -74.804 }), true);
  // Ciénaga (Magdalena): fuera del área
  assert.equal(hayArroyos({ latitud: 11.0069, longitud: -74.2475 }), false);
});

test("niveles de alerta de arroyos", () => {
  assert.deepEqual(umbralArroyos("normal"), UMBRAL_ARROYOS);
  const h: Hora = { hora: "2026-10-12T15:00", temperatura: 28, probabilidad: 55, mm: 4.5, codigo: 63, esDia: true };
  assert.equal(horaConRiesgo(h, umbralArroyos("mas")), true);
  assert.equal(horaConRiesgo(h, umbralArroyos("normal")), false);
  const tormenta: Hora = { ...h, probabilidad: 65, mm: 1, codigo: 95 };
  assert.equal(horaConRiesgo(tormenta, umbralArroyos("normal")), true);
  assert.equal(horaConRiesgo(tormenta, umbralArroyos("menos")), false);
});

test("saludo con nombre", () => {
  assert.equal(conNombre("Buenas tardes", ""), "Buenas tardes");
  assert.equal(conNombre("Buenas tardes", "Ana"), "Buenas tardes, Ana");
});
