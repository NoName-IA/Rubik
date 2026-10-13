/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import { ANTES_ARROYOS, ANTES_LLUVIA, instante, planearAvisos } from "../src/lib/avisos.ts";
import { UMBRAL_ARROYOS } from "../src/lib/clima/resumen.ts";
import type { Hora, Pronostico } from "../src/lib/clima/tipos.ts";
import { leerPreferencias } from "../src/lib/preferencias.ts";

const COLOMBIA = -18000;

/** Pronóstico de Barranquilla con 36 horas desde `inicio` (hora local); por defecto, sin lluvia. */
function pronostico(inicio: string, lluvia: Record<string, [number, number, number?]>): Pronostico {
  const base = Date.parse(`${inicio}:00Z`);
  const horas: Hora[] = Array.from({ length: 36 }, (_, i) => {
    const hora = new Date(base + i * 3600_000).toISOString().slice(0, 16);
    const [probabilidad, mm, codigo = 61] = lluvia[hora] ?? [5, 0, 1];
    return { hora, temperatura: 30, probabilidad, mm, codigo, esDia: true };
  });
  return { actual: {} as Pronostico["actual"], horas, dias: [], desfaseUtc: COLOMBIA, zona: "America/Bogota", obtenido: 0 };
}

const ahora = instante("2026-10-12T08:10", COLOMBIA);
const TODO = { lluvia: true, arroyos: UMBRAL_ARROYOS };

test("hora local → instante (Colombia es UTC−5)", () => {
  assert.equal(new Date(instante("2026-10-12T15:00", COLOMBIA)).toISOString(), "2026-10-12T20:00:00.000Z");
});

test("sin lluvia no hay avisos", () => {
  assert.deepEqual(planearAvisos(pronostico("2026-10-12T08:00", {}), TODO, ahora), []);
});

test("lluvia: 30 min antes, con el rango y la hora más fuerte", () => {
  const p = pronostico("2026-10-12T08:00", { "2026-10-12T14:00": [70, 1], "2026-10-12T15:00": [80, 3], "2026-10-12T16:00": [60, 0.5] });
  const [a, ...resto] = planearAvisos(p, TODO, ahora);
  assert.equal(resto.length, 0);
  assert.equal(a.id, "lluvia:2026-10-12T14:00");
  assert.equal(a.fecha, instante("2026-10-12T14:00", COLOMBIA) - ANTES_LLUVIA);
  assert.equal(a.cuerpo, "Lloverá entre 2 y 5 p. m.; lo más fuerte, a las 3.");
});

test("arroyos: 1 h antes y reemplaza al aviso de lluvia de esas horas", () => {
  const p = pronostico("2026-10-12T08:00", { "2026-10-12T15:00": [70, 2], "2026-10-12T16:00": [80, 6], "2026-10-12T17:00": [70, 1] });
  const avisos = planearAvisos(p, TODO, ahora);
  assert.deepEqual(avisos.map((a) => a.id), ["arroyos:2026-10-12T16:00"]);
  assert.equal(avisos[0].fecha, instante("2026-10-12T16:00", COLOMBIA) - ANTES_ARROYOS);
  assert.equal(avisos[0].cuerpo, "Riesgo de arroyos a las 4 p. m. No cruces calles con corriente.");
});

test("sin umbral de arroyos (fuera del área o desactivado) solo avisa la lluvia", () => {
  const p = pronostico("2026-10-12T08:00", { "2026-10-12T16:00": [80, 6] });
  assert.deepEqual(planearAvisos(p, { lluvia: true, arroyos: null }, ahora).map((a) => a.id), ["lluvia:2026-10-12T16:00"]);
  assert.deepEqual(planearAvisos(p, { lluvia: false, arroyos: null }, ahora), []);
});

test("no avisa lo que ya empezó o tocaría en menos de un minuto", () => {
  const p = pronostico("2026-10-12T08:00", { "2026-10-12T08:00": [90, 8], "2026-10-12T09:00": [90, 8] });
  // Riesgo desde las 8: el aviso habría sido a las 7, ya pasó.
  assert.deepEqual(planearAvisos(p, TODO, ahora), []);
});

test("la lluvia de madrugada no suena; los arroyos sí, y dicen 'mañana' si cruzan la medianoche", () => {
  const p = pronostico("2026-10-12T08:00", { "2026-10-13T03:00": [80, 1], "2026-10-13T00:00": [90, 10, 95] });
  const avisos = planearAvisos(p, TODO, ahora);
  assert.deepEqual(avisos.map((a) => a.id), ["arroyos:2026-10-13T00:00"]);
  assert.match(avisos[0].cuerpo, /^Riesgo de arroyos mañana a las 12 a\. m\./);
});

test("preferencias: avisos activados por defecto y se leen sin confiar en la forma", () => {
  assert.deepEqual(leerPreferencias(null).avisos, { lluvia: true, arroyos: true });
  assert.deepEqual(leerPreferencias(JSON.stringify({ avisos: { lluvia: false, arroyos: "no" } })).avisos, { lluvia: false, arroyos: true });
  assert.deepEqual(leerPreferencias(JSON.stringify({ avisos: 3 })).avisos, { lluvia: true, arroyos: true });
});
