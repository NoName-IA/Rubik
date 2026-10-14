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
import type { Observacion } from "../src/lib/clima/metar.ts";
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

test("ventanas de lluvia: horas seguidas con 50 % o más y milímetros reales", () => {
  const v = ventanasLluvia(serie("2026-10-12T12", [[10, 0], [60, 1], [80, 4], [55, 2], [20, 0], [70, 1]]));
  assert.equal(v.length, 2);
  assert.equal(v[0].desde, "2026-10-12T13:00");
  assert.equal(v[0].hasta, "2026-10-12T16:00");
  assert.equal(v[0].pico.hora, "2026-10-12T14:00");
  assert.equal(v[1].desde, "2026-10-12T17:00");
  // Con menos de 0,2 mm no cuenta aunque la probabilidad sea alta.
  const trazas = ventanasLluvia(serie("2026-10-12T12", [[80, 1], [63, 0.1], [50, 0]]));
  assert.equal(trazas.length, 1);
  assert.equal(trazas[0].hasta, "2026-10-12T13:00");
});

/** Observación del aeropuerto a 6 km. */
const obs = (lluvia: Observacion["lluvia"]): Observacion => ({ estacion: "SKBQ", distanciaKm: 6.3, lluvia, codigo: 2, hora: 0 });

/** Las 24 horas de mañana (13 de oct.) secas, salvo las que se indiquen: { hora: [prob, mm, código] }. */
function manana(lluvias: Record<number, [number, number, number?]> = {}): Hora[] {
  return serie("2026-10-13T00", Array.from({ length: 24 }, (_, h) => lluvias[h] ?? [10, 0]));
}
/** De `inicio` (hoy, 12 de oct.) hasta la medianoche, seco salvo las primeras horas que se den. */
function hoyDesde(hora: number, primeras: [number, number, number?][] = []): Hora[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  return serie(`2026-10-12T${pad(hora)}`, Array.from({ length: 24 - hora }, (_, i) => primeras[i] ?? [10, 0]));
}

test("frase: no menciona el aeropuerto, aunque use su reporte", () => {
  // Open-Meteo, Barranquilla, 4 p. m. del 13 de oct.: lluvia "desde ya" con el aeropuerto seco.
  const h = serie("2026-10-13T16", [[98, 1.4, 80], [89, 0.5, 53], [76, 0.3, 51], [63, 0.1, 51], [50, 0, 3], [36, 0, 1]]);
  assert.equal(fraseLluvia(h), "Hoy podría llover desde ya hasta las 7 p. m.");
  assert.equal(fraseLluvia(h, obs("seco")), "Hoy podría haber lloviznas entre 5 y 7 p. m.");
  for (const o of ["seco", "llueve", "cerca"] as const) assert.ok(!fraseLluvia(h, obs(o)).includes("aeropuerto"));
});

test("frase: hoy llueve o no, y mañana", () => {
  assert.equal(fraseLluvia([...hoyDesde(12), ...manana()]), "Hoy no llueve. Mañana tampoco.");
  assert.equal(
    fraseLluvia([...hoyDesde(12, [[10, 0], [10, 0], [60, 1], [80, 4], [70, 2]]), ...manana({ 15: [70, 1] })]),
    "Hoy podría llover entre 2 y 5 p. m. Mañana también podría llover a las 3 p. m.",
  );
  assert.equal(fraseLluvia([...hoyDesde(12, [[10, 0], [70, 1]]), ...manana()]), "Hoy podría llover a la 1 p. m. Mañana no se espera lluvia.");
  assert.equal(
    fraseLluvia([...hoyDesde(20), ...manana({ 14: [70, 1, 95], 15: [80, 3, 95] })]),
    "Hoy no llueve. Mañana podría haber tormenta eléctrica entre 2 y 4 p. m.",
  );
  // Sin el día completo de mañana no se descarta su lluvia.
  assert.equal(fraseLluvia(serie("2026-10-12T22", [[10, 0], [10, 0], [10, 0]])), "Hoy no llueve.");
  assert.equal(fraseLluvia([]), "Sin datos de lluvia.");
});

test("frase: tipo de lluvia (tormenta > lluvia > lloviznas)", () => {
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[10, 0], [70, 0.3, 51], [60, 0.2, 53], [10, 0]])), "Hoy podría haber lloviznas entre 1 y 3 p. m.");
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[10, 0], [70, 0.3, 51], [80, 2, 95], [10, 0]])), "Hoy podría haber tormenta eléctrica entre 1 y 3 p. m.");
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[10, 0], [70, 0.3, 51], [80, 2, 63], [10, 0]])), "Hoy podría llover entre 1 y 3 p. m.");
});

test("frase: lo que reporta el aeropuerto manda para la hora en curso", () => {
  assert.equal(fraseLluvia(serie("2026-10-12T17", [[90, 2], [80, 1], [40, 0]]), obs("llueve")), "Está lloviendo y podría seguir hasta las 7 p. m.");
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[90, 2], [40, 0]]), obs("llueve")), "Está lloviendo; podría parar pronto.");
  // Llueve aunque el pronóstico no lo esperaba.
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[10, 0], [10, 0]]), obs("llueve")), "Está lloviendo, pero no se espera que dure.");
  assert.equal(
    fraseLluvia(serie("2026-10-12T12", [[10, 0], [70, 1], [10, 0]]), obs("llueve")),
    "Está lloviendo, pero no se espera que dure. Podría volver a llover a la 1 p. m.",
  );
  // "Lluvia en los alrededores": se queda con el pronóstico.
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[0, 0]]), obs("cerca")), "Hoy no llueve.");
  // Seco: se omite lo anunciado para ahora.
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[90, 2], [40, 0]]), obs("seco")), "Hoy no llueve.");
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[10, 0], [70, 1], [10, 0]]), obs("seco")), "Hoy podría llover a la 1 p. m.");
});

test("frase: gotas, la hora en curso y varias ventanas", () => {
  // Probabilidad alta pero sin milímetros: no se anuncia lluvia.
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[60, 0.1], [20, 0]])), "Hoy no llueve; quizás unas gotas en la próxima hora.");
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[10, 0], [55, 0, 3], [20, 0]])), "Hoy no llueve; quizás unas gotas a la 1 p. m.");
  assert.equal(fraseLluvia(serie("2026-10-12T12", [[90, 2], [40, 0]])), "Hoy podría llover en la próxima hora.");
  assert.equal(fraseLluvia(serie("2026-10-12T11", [[90, 2], [80, 1], [10, 0]])), "Hoy podría llover desde ya hasta la 1 p. m.");
  const h = serie("2026-10-12T12", [[60, 1], [70, 2], [10, 0], [10, 0], [10, 0], [10, 0], [65, 1], [70, 1], [10, 0]]);
  assert.equal(fraseLluvia(h), "Hoy podría llover desde ya hasta las 2 p. m. y entre 6 y 8 p. m.");
  // Ningún texto termina con dos puntos seguidos.
  for (const f of [fraseLluvia(serie("2026-10-12T10", [[90, 2], [80, 1]])), fraseLluvia(serie("2026-10-12T22", [[10, 0], [80, 1], [80, 1]]))])
    assert.ok(!f.includes(".."), f);
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
  assert.equal(fraseLluvia(serie("2026-10-12T22", [[80, 1], [80, 1], [10, 0]])), "Hoy podría llover desde ya hasta la medianoche.");
});
