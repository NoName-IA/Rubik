/// <reference types="node" />

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { convertir, type RespuestaOpenMeteo } from "../src/lib/clima/openMeteo.ts";
import {
  horasDelDia,
  intensidad,
  milimetros,
  nombreIntensidad,
  rangoSemana,
  resumirLluvia,
} from "../src/lib/clima/lluvia.ts";
import type { Dia, Hora } from "../src/lib/clima/tipos.ts";
import { diaCorto, nombreDia } from "../src/lib/fecha.ts";

const p = convertir(
  JSON.parse(readFileSync(new URL("./fixtures/open-meteo.json", import.meta.url), "utf-8")) as RespuestaOpenMeteo,
  0,
);

const hora = (h: string, probabilidad: number | null, mm: number): Hora => ({
  hora: `2026-10-12T${h}:00`,
  temperatura: 28,
  probabilidad,
  mm,
  codigo: 61,
  esDia: true,
});

test("intensidad según los umbrales de la AMS", () => {
  assert.equal(intensidad(0), "sin");
  assert.equal(intensidad(0.09), "sin");
  assert.equal(intensidad(0.1), "ligera");
  assert.equal(intensidad(2.49), "ligera");
  assert.equal(intensidad(2.5), "moderada");
  assert.equal(intensidad(7.6), "moderada");
  assert.equal(intensidad(7.7), "fuerte");
  assert.equal(nombreIntensidad(12), "Fuerte");
});

test("milímetros con coma decimal", () => {
  assert.equal(milimetros(4.25), "4,3 mm");
  assert.equal(milimetros(0), "0,0 mm");
});

test("resumen: hora más probable, más fuerte y total", () => {
  const r = resumirLluvia([hora("13", 20, 0), hora("14", 80, 1.2), hora("15", 80, 6.5), hora("16", 40, 0.05)]);
  assert.equal(r.masProbable?.hora, "2026-10-12T14:00"); // la primera del empate
  assert.equal(r.masFuerte?.hora, "2026-10-12T15:00");
  assert.equal(r.horasProbables, 2);
  assert.equal(r.totalMm, 7.8);
});

test("resumen sin lluvia", () => {
  const r = resumirLluvia([hora("13", 0, 0), hora("14", null, 0)]);
  assert.equal(r.masFuerte, null);
  assert.equal(r.horasProbables, 0);
  assert.equal(r.totalMm, 0);
  assert.deepEqual(resumirLluvia([]), { masProbable: null, masFuerte: null, totalMm: 0, horasProbables: 0 });
});

test("horas de un día del pronóstico real", () => {
  const h = horasDelDia(p, "2026-10-13");
  assert.equal(h.length, 24);
  assert.equal(h[0].hora, "2026-10-13T00:00");
  assert.equal(h[23].hora, "2026-10-13T23:00");
});

test("rango de temperaturas de la semana", () => {
  const dia = (minima: number, maxima: number) => ({ minima, maxima }) as Dia;
  assert.deepEqual(rangoSemana([dia(23, 31), dia(22, 33)]), { min: 22, max: 33 });
  // Sin variación no se divide por cero.
  assert.deepEqual(rangoSemana([dia(25, 25)]), { min: 25, max: 26 });
  assert.deepEqual(rangoSemana([]), { min: 0, max: 1 });
});

test("nombres de día relativos a hoy", () => {
  assert.equal(nombreDia("2026-10-12", "2026-10-12"), "Hoy");
  assert.equal(nombreDia("2026-10-13", "2026-10-12"), "Mañana");
  assert.equal(nombreDia("2026-10-14", "2026-10-12"), "Miércoles 14");
  // Cambio de mes.
  assert.equal(nombreDia("2026-11-01", "2026-10-31"), "Mañana");
  assert.equal(nombreDia("2026-11-02", "2026-10-31"), "Lunes 2");
  assert.equal(diaCorto("2026-10-17T00:00"), "Sáb");
  assert.equal(diaCorto("2026-10-14"), "Mié");
});
