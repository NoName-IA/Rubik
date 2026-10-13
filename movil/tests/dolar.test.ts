/// <reference types="node" />

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  convertirTrm,
  dolares,
  fechaCorta,
  hoyColombia,
  leerNumero,
  periodo,
  pesos,
  porcentaje,
  type Trm,
  URL_TRM,
  vigencia,
  vigente,
} from "../src/lib/dolar.ts";

// Respuesta real de datos.gov.co del 2026-10-12 (festivo: TRM del viernes 10 vigente hasta el martes 13).
const t = convertirTrm(JSON.parse(readFileSync(new URL("./fixtures/trm.json", import.meta.url), "utf-8")), 0);

test("convierte y ordena la serie; descarta filas inválidas", () => {
  assert.ok(t.serie.length >= 300);
  assert.ok(t.serie.every((d, i) => i === 0 || t.serie[i - 1].desde > d.desde));
  const r = convertirTrm([{ valor: "abc", vigenciadesde: "2026-01-01T00:00:00.000" }, { valor: "4000", vigenciadesde: "2026-01-02T00:00:00.000", vigenciahasta: "2026-01-02T00:00:00.000" }, { valor: "4100" }], 0);
  assert.equal(r.serie.length, 1);
  assert.throws(() => convertirTrm([], 0), /sin datos/);
  assert.match(URL_TRM, /32sa-8pi3/);
});

test("TRM vigente en un festivo y su cambio", () => {
  const v = vigente(t, "2026-10-12");
  assert.equal(v.actual.valor, 3194.44);
  assert.equal(v.actual.desde, "2026-10-10");
  assert.equal(v.anterior?.valor, 3218.75);
  assert.equal(Math.round(v.cambio! * 100) / 100, -24.31);
  assert.equal(v.cambioPct!.toFixed(2), "-0.76");
  assert.equal(v.alDia, true);
});

test("si no hay TRM que cubra hoy, usa la más reciente y lo indica", () => {
  const v = vigente(t, "2026-11-30");
  assert.equal(v.actual.desde, t.serie[0].desde);
  assert.equal(v.alDia, false);
  const viejo: Trm = { serie: [{ desde: "2026-01-02", hasta: "2026-01-02", valor: 4000 }], obtenido: 0 };
  assert.equal(vigente(viejo, "2026-01-05").anterior, null);
  assert.equal(vigente(viejo, "2026-01-05").cambio, null);
});

test("períodos: puntos cronológicos, mínimo y máximo", () => {
  const p30 = periodo(t, 30, "2026-10-12")!;
  assert.ok(p30.puntos.length >= 18 && p30.puntos.length <= 23, `${p30.puntos.length}`);
  assert.ok(p30.puntos.every((d, i) => i === 0 || p30.puntos[i - 1].desde < d.desde));
  assert.ok(p30.minimo.valor <= p30.maximo.valor);
  assert.ok(p30.puntos.every((d) => d.valor >= p30.minimo.valor && d.valor <= p30.maximo.valor));
  assert.equal(p30.puntos.at(-1)!.valor, 3194.44);
  const p365 = periodo(t, 365, "2026-10-12")!;
  assert.ok(p365.puntos.length > p30.puntos.length);
  assert.equal(periodo(t, 30, "2000-01-01"), null);
});

test("formato colombiano", () => {
  assert.equal(pesos(3194.44), "$3.194,44");
  assert.equal(pesos(3194.44, 0), "$3.194");
  assert.equal(pesos(1234567.891), "$1.234.567,89");
  assert.equal(pesos(-24.31), "-$24,31");
  assert.equal(dolares(1250.5), "US$1.250,50");
  assert.equal(porcentaje(-0.7598), "−0,76 %");
  assert.equal(porcentaje(1.5), "+1,50 %");
  assert.equal(porcentaje(0), "0,00 %");
  assert.equal(fechaCorta("2026-10-10"), "10 de oct.");
  assert.equal(fechaCorta("2025-10-15", true), "15 de oct. de 2025");
  assert.equal(vigencia({ desde: "2026-10-10", hasta: "2026-10-13", valor: 1 }), "del 10 al 13 de oct.");
  assert.equal(vigencia({ desde: "2026-10-09", hasta: "2026-10-09", valor: 1 }), "del 9 de oct.");
  assert.equal(vigencia({ desde: "2026-10-30", hasta: "2026-11-03", valor: 1 }), "del 30 de oct. al 3 de nov.");
});

test("leer lo que escribe el usuario", () => {
  assert.equal(leerNumero("100"), 100);
  assert.equal(leerNumero("1.250,5"), 1250.5);
  assert.equal(leerNumero("1250.5"), 1250.5);
  assert.equal(leerNumero("1.000.000"), 1000000);
  assert.equal(leerNumero("$ 50.000"), 50000);
  assert.equal(leerNumero(""), null);
  assert.equal(leerNumero("abc"), null);
});

test("fecha de hoy en Colombia", () => {
  // 03:00 UTC del 13 = 22:00 del 12 en Colombia.
  assert.equal(hoyColombia(Date.UTC(2026, 9, 13, 3, 0)), "2026-10-12");
});

import { trmConRespaldo } from "../src/lib/dolar.ts";

test("sin conexión usa la última TRM guardada (hasta 7 días)", async () => {
  const datos = new Map<string, string>();
  const almacen = { getItem: async (k: string) => datos.get(k) ?? null, setItem: async (k: string, v: string) => void datos.set(k, v) };
  const sinRed = async (): Promise<Trm> => {
    throw new Error("No hay conexión a internet");
  };
  await trmConRespaldo(async () => ({ ...t, obtenido: 1000 }), almacen);
  await new Promise((r) => setTimeout(r, 0));
  const g = await trmConRespaldo(sinRed, almacen, () => 1000 + 3 * 24 * 3600_000);
  assert.equal(g.guardado, true);
  assert.equal(g.serie[0].valor, 3194.44);
  await assert.rejects(trmConRespaldo(sinRed, almacen, () => 1000 + 8 * 24 * 3600_000), /conexión/);
});
