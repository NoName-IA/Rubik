/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import type { Aire } from "../src/lib/aire/openMeteoAire.ts";
import { ANTES_CALOR, ANTES_LLUVIA, instante, planearAvisos } from "../src/lib/avisos.ts";
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
const TODO = { lluvia: true, calor: true, aire: null };
const NADA = { lluvia: false, calor: false, aire: null };

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
  assert.equal(a.titulo, "Posible lluvia");
  assert.equal(a.cuerpo, "Posible lluvia entre 2 y 5 p. m.; lo más fuerte, a las 3.");
});

test("un aguacero fuerte avisa como cualquier lluvia; con la lluvia apagada no avisa", () => {
  const p = pronostico("2026-10-12T08:00", { "2026-10-12T16:00": [80, 6, 95] });
  assert.deepEqual(planearAvisos(p, TODO, ahora).map((a) => a.id), ["lluvia:2026-10-12T16:00"]);
  assert.deepEqual(planearAvisos(p, NADA, ahora), []);
});

test("no avisa lo que ya empezó o tocaría en menos de un minuto", () => {
  const p = pronostico("2026-10-12T08:00", { "2026-10-12T08:00": [90, 8], "2026-10-12T09:00": [90, 8] });
  // Lluvia desde las 8: el aviso habría sido a las 7:30, ya pasó.
  assert.deepEqual(planearAvisos(p, TODO, ahora), []);
});

test("la lluvia de madrugada no suena, aunque sea fuerte", () => {
  const p = pronostico("2026-10-12T08:00", { "2026-10-13T03:00": [80, 1], "2026-10-13T00:00": [90, 10, 95] });
  assert.deepEqual(planearAvisos(p, TODO, ahora), []);
});

test("preferencias: las de versiones anteriores con avisos apagados ya no los guardan", () => {
  const leidas = leerPreferencias(JSON.stringify({ tema: "oscuro", avisos: { lluvia: false } }));
  assert.equal(leidas.tema, "oscuro");
  assert.equal("avisos" in leidas, false);
});

/** Pronóstico sin lluvia con la sensación térmica de algunas horas. */
function conCalor(inicio: string, sensaciones: Record<string, number>): Pronostico {
  const p = pronostico(inicio, {});
  for (const h of p.horas) h.sensacion = sensaciones[h.hora] ?? 33;
  return p;
}

test("calor: 1 h antes de la primera hora ≥ 42°, con el pico, uno por día", () => {
  const p = conCalor("2026-10-12T08:00", { "2026-10-12T12:00": 42.4, "2026-10-12T13:00": 43.6, "2026-10-12T14:00": 42 });
  const avisos = planearAvisos(p, { ...NADA, calor: true }, ahora);
  assert.deepEqual(avisos.map((a) => a.id), ["calor:2026-10-12"]);
  assert.equal(avisos[0].fecha, instante("2026-10-12T12:00", COLOMBIA) - ANTES_CALOR);
  assert.equal(avisos[0].titulo, "Mucho calor");
  assert.equal(avisos[0].cuerpo, "La sensación térmica llegará a 44° a la 1 p. m. Toma agua y busca la sombra.");
  assert.equal(avisos[0].ruta, "/clima");
  // 41,9° no alcanza; apagado no avisa.
  assert.deepEqual(planearAvisos(conCalor("2026-10-12T08:00", { "2026-10-12T13:00": 41.9 }), { ...NADA, calor: true }, ahora), []);
  assert.deepEqual(planearAvisos(p, NADA, ahora), []);
});

test("calor: nunca antes de las 7 a. m.; sin sensación usa la temperatura", () => {
  const p = conCalor("2026-10-12T08:00", { "2026-10-13T07:00": 42 });
  assert.deepEqual(planearAvisos(p, { ...NADA, calor: true }, ahora).map((a) => a.fecha), [instante("2026-10-13T07:00", COLOMBIA)]);
  const viejo = pronostico("2026-10-12T08:00", {});
  viejo.horas[5].temperatura = 42;
  assert.equal(planearAvisos(viejo, { ...NADA, calor: true }, ahora).length, 1);
});

/** Calidad del aire de 48 h desde el 12 de oct. a medianoche, con PM2.5 y PM10 iguales en todas las horas. */
function aire(pm25: number, pm10: number, cambios: Record<string, [number, number]> = {}): Aire {
  const base = Date.parse("2026-10-12T00:00:00Z");
  const horas = Array.from({ length: 48 }, (_, i) => {
    const hora = new Date(base + i * 3600_000).toISOString().slice(0, 16);
    const [a, b] = cambios[hora] ?? [pm25, pm10];
    return { hora, pm25: a, pm10: b };
  });
  return { horas, desfaseUtc: COLOMBIA, obtenido: 0 };
}

test("aire limpio: a las 7 a. m. del día siguiente si todo el día es 'Bueno'", () => {
  const p = pronostico("2026-10-12T08:00", {});
  // A las 8:10 ya pasaron las 7 de hoy: el aviso es el de mañana.
  const avisos = planearAvisos(p, { ...NADA, aire: aire(8, 20) }, ahora);
  assert.deepEqual(avisos.map((a) => a.id), ["aire:2026-10-13"]);
  assert.equal(avisos[0].fecha, instante("2026-10-13T07:00", COLOMBIA));
  assert.equal(avisos[0].titulo, "¡Respira, el aire está limpio!");
  assert.equal(avisos[0].ruta, "/aire");
  // Una sola hora de la calle por encima del límite de "Buena" (PM2.5 12) lo descarta; de noche no cuenta.
  assert.deepEqual(planearAvisos(p, { ...NADA, aire: aire(8, 20, { "2026-10-13T15:00": [13, 20] }) }, ahora), []);
  assert.equal(planearAvisos(p, { ...NADA, aire: aire(8, 20, { "2026-10-13T22:00": [30, 80] }) }, ahora).length, 1);
  // Sin datos del aire no avisa.
  assert.deepEqual(planearAvisos(p, { ...NADA, aire: { ...aire(8, 20), horas: [] } }, ahora), []);
});
