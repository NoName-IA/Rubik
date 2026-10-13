/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import { type Almacen, CLAVE_RESPALDO, conRespaldo, distanciaKm } from "../src/lib/clima/respaldo.ts";
import type { Pronostico } from "../src/lib/clima/tipos.ts";

const BARRANQUILLA = { latitud: 10.96, longitud: -74.8 };
const SOLEDAD = { latitud: 10.91, longitud: -74.77 };
const CARTAGENA = { latitud: 10.39, longitud: -75.48 };

function almacenEnMemoria(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    async getItem(k) {
      return datos.get(k) ?? null;
    },
    async setItem(k, v) {
      datos.set(k, v);
    },
  };
}

const pronostico = (obtenido: number) => ({ obtenido, horas: [], dias: [], desfaseUtc: -18000, zona: "America/Bogota" }) as unknown as Pronostico;
const sinRed = async (): Promise<Pronostico> => {
  throw new Error("No hay conexión a internet");
};
const esperarGuardado = () => new Promise((r) => setTimeout(r, 0));

test("distancias aproximadas", () => {
  assert.ok(distanciaKm(BARRANQUILLA, SOLEDAD) < 10);
  assert.ok(distanciaKm(BARRANQUILLA, CARTAGENA) > 90);
});

test("con red: devuelve el pronóstico nuevo y lo guarda", async () => {
  const almacen = almacenEnMemoria();
  const p = await conRespaldo(async () => pronostico(1000), BARRANQUILLA, almacen);
  assert.equal(p.obtenido, 1000);
  assert.equal(p.guardado, undefined);
  await esperarGuardado();
  assert.ok(almacen.datos.has(CLAVE_RESPALDO));
});

test("sin red: usa el guardado, marcado como guardado", async () => {
  const almacen = almacenEnMemoria();
  await conRespaldo(async () => pronostico(1000), BARRANQUILLA, almacen);
  await esperarGuardado();
  const p = await conRespaldo(sinRed, SOLEDAD, almacen, () => 1000 + 3600_000);
  assert.equal(p.guardado, true);
  assert.equal(p.obtenido, 1000);
});

test("sin red y guardado muy viejo: propaga el error", async () => {
  const almacen = almacenEnMemoria();
  await conRespaldo(async () => pronostico(0), BARRANQUILLA, almacen);
  await esperarGuardado();
  await assert.rejects(conRespaldo(sinRed, BARRANQUILLA, almacen, () => 25 * 3600_000), /conexión/);
});

test("sin red y guardado de otra ciudad: propaga el error", async () => {
  const almacen = almacenEnMemoria();
  await conRespaldo(async () => pronostico(1000), CARTAGENA, almacen);
  await esperarGuardado();
  await assert.rejects(conRespaldo(sinRed, BARRANQUILLA, almacen, () => 2000), /conexión/);
});

test("sin red y nada guardado (o guardado dañado): propaga el error", async () => {
  const almacen = almacenEnMemoria();
  await assert.rejects(conRespaldo(sinRed, BARRANQUILLA, almacen), /conexión/);
  almacen.datos.set(CLAVE_RESPALDO, "{no es json");
  await assert.rejects(conRespaldo(sinRed, BARRANQUILLA, almacen), /conexión/);
});

test("si guardar falla, el pronóstico nuevo se muestra igual", async () => {
  const almacen: Almacen = {
    getItem: async () => null,
    setItem: async () => {
      throw new Error("almacenamiento lleno");
    },
  };
  const p = await conRespaldo(async () => pronostico(5), BARRANQUILLA, almacen);
  assert.equal(p.obtenido, 5);
});
