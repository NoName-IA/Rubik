/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  aLas,
  hastaLas,
  fraseArroyos,
  fraseLluvia,
  horaConRiesgo,
  rangoHoras,
  ventanasArroyos,
  ventanasLluvia,
} from "../src/lib/clima/resumen.ts";
import type { Hora } from "../src/lib/clima/tipos.ts";

/** Horas desde `inicio` ("2026-10-12T13") con [probabilidad, mm, código?]. */
function serie(inicio: string, datos: [number, number, number?][]): Hora[] {
  const base = new Date(`${inicio}:00:00Z`);
  return datos.map(([probabilidad, mm, codigo = 61], i) => {
    const d = new Date(base.getTime() + i * 3600_000);
    return { hora: d.toISOString().slice(0, 16), temperatura: 28, probabilidad, mm, codigo, esDia: true };
  });
}

test("horas y rangos en español", () => {
  assert.equal(aLas("2026-10-12T15:00"), "a las 3");
  assert.equal(aLas("2026-10-12T13:00", true), "a la 1 p. m.");
  assert.equal(aLas("2026-10-12T12:00", true), "a las 12 m.");
  assert.equal(rangoHoras("2026-10-12T14:00", "2026-10-12T17:00"), "entre 2 y 5 p. m.");
  assert.equal(rangoHoras("2026-10-12T22:00", "2026-10-13T02:00"), "entre 10 p. m. y 2 a. m.");
  assert.equal(rangoHoras("2026-10-12T11:00", "2026-10-12T12:00"), "entre 11 a. m. y 12 m.");
  assert.equal(rangoHoras("2026-10-12T12:00", "2026-10-12T15:00"), "entre 12 m. y 3 p. m.");
  assert.equal(rangoHoras("2026-10-12T00:00", "2026-10-12T02:00"), "entre 12 a. m. y 2 a. m.");
  assert.equal(rangoHoras("2026-10-12T21:00", "2026-10-13T00:00"), "entre 9 p. m. y la medianoche");
  assert.equal(hastaLas("2026-10-13T00:00"), "la medianoche");
  assert.equal(hastaLas("2026-10-12T12:00"), "el mediodía");
  assert.equal(hastaLas("2026-10-12T13:00"), "la 1 p. m.");
});

test("ventanas de lluvia: horas seguidas con 50 % o más", () => {
  const v = ventanasLluvia(serie("2026-10-12T12", [[10, 0], [60, 1], [80, 4], [55, 2], [20, 0], [70, 1]]));
  assert.equal(v.length, 2);
  assert.equal(v[0].desde, "2026-10-12T13:00");
  assert.equal(v[0].hasta, "2026-10-12T16:00");
  assert.equal(v[0].pico.hora, "2026-10-12T14:00");
  assert.equal(v[1].desde, "2026-10-12T17:00");
});

test("frase: una ventana con hora más fuerte", () => {
  const h = serie("2026-10-12T12", [[10, 0], [10, 0], [60, 1], [80, 4], [70, 2], [30, 0]]);
  assert.equal(fraseLluvia(h), "Lloverá entre 2 y 5 p. m.; lo más fuerte, a las 3.");
});

test("frase: lluvia que ya empezó", () => {
  assert.equal(fraseLluvia(serie("2026-10-12T17", [[90, 2], [80, 1], [40, 0]])), "Puede llover desde ya y hasta las 7 p. m.");
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[90, 2], [40, 0]])), "Puede llover ahora mismo.");
  assert.equal(fraseLluvia(serie("2026-10-12T11", [[90, 2], [80, 1], [10, 0]])), "Puede llover desde ya y hasta la 1 p. m.");
  // Ningún texto termina con dos puntos seguidos.
  for (const f of [fraseLluvia(serie("2026-10-12T10", [[90, 2], [80, 1]])), fraseLluvia(serie("2026-10-12T22", [[10, 0], [80, 1], [80, 1]]))])
    assert.ok(!f.includes(".."), f);
});

test("frase: una sola hora y lluvia mañana", () => {
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[10, 0], [70, 1], [10, 0]])), "Puede llover a la 1 p. m.");
  const h = serie("2026-10-12T22", [[10, 0], [10, 0], [10, 0], [10, 0], [10, 0], [10, 0], [10, 0], [10, 0], [10, 0], [10, 0], [10, 0], [10, 0], [10, 0], [10, 0], [10, 0], [10, 0], [70, 1], [80, 3], [20, 0]]);
  assert.equal(fraseLluvia(h), "Mañana lloverá entre 2 y 4 p. m.; lo más fuerte, a las 3.");
});

test("frase: dos ventanas", () => {
  const h = serie("2026-10-12T12", [[60, 1], [70, 2], [10, 0], [10, 0], [10, 0], [10, 0], [65, 1], [70, 1], [10, 0]]);
  assert.equal(fraseLluvia(h), "Puede llover desde ya y hasta las 2 p. m.; lo más fuerte, a la 1. Otra vez entre 6 y 8 p. m.");
});

test("frase: sin lluvia o poca probabilidad", () => {
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[0, 0], [10, 0]])), "No se espera lluvia.");
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[10, 0], [35, 0.2], [20, 0]])), "Poca probabilidad de lluvia (máx. 35 % a la 1 p. m.).");
  assert.equal(fraseLluvia([]), "Sin datos de lluvia.");
});

test("arroyos: mm fuertes o tormenta, siempre con probabilidad alta", () => {
  const [a, b, c, d, e] = serie("2026-10-12T14", [[70, 6], [70, 1, 95], [50, 9, 95], [65, 1, 81], [60, 0.2, 99]]);
  assert.equal(horaConRiesgo(a), true); // 6 mm con 70 %
  assert.equal(horaConRiesgo(b), true); // tormenta con 70 %
  assert.equal(horaConRiesgo(c), false); // probabilidad baja
  assert.equal(horaConRiesgo(d), false); // chubasco débil
  assert.equal(horaConRiesgo(e), true);
  const v = ventanasArroyos([a, b, c, d, e]);
  assert.equal(v.length, 2);
  assert.equal(fraseArroyos(v[0], "2026-10-12"), "Riesgo de arroyos entre 2 y 4 p. m.");
  assert.equal(fraseArroyos(v[1], "2026-10-12"), "Riesgo de arroyos a las 6 p. m.");
  assert.equal(fraseArroyos(v[1], "2026-10-11"), "Riesgo de arroyos mañana a las 6 p. m.");
  // Si el riesgo empieza en la hora en curso se dice "ahora".
  assert.equal(fraseArroyos(v[1], "2026-10-12", "2026-10-12T18:00"), "Riesgo de arroyos ahora");
  assert.equal(fraseArroyos(v[0], "2026-10-12", "2026-10-12T14:00"), "Riesgo de arroyos desde ya y hasta las 4 p. m.");
  assert.equal(fraseLluvia(serie("2026-10-12T22", [[80, 1], [80, 1], [10, 0]])), "Puede llover desde ya y hasta la medianoche.");
});
