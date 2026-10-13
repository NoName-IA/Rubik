/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import { categoria, comparar, textoOms, valorIca } from "../src/lib/aire/ica.ts";
import { type Aire, convertirAire, promedio24h, proximasHorasAire, urlAire, valorActual } from "../src/lib/aire/openMeteoAire.ts";

test("categorías del ICA colombiano (Res. 2254, tabla 6)", () => {
  assert.equal(categoria("pm25", 0).clave, "buena");
  assert.equal(categoria("pm25", 12).clave, "buena");
  assert.equal(categoria("pm25", 12.4).clave, "aceptable");
  assert.equal(categoria("pm25", 37).clave, "aceptable");
  assert.equal(categoria("pm25", 38).clave, "sensibles");
  assert.equal(categoria("pm25", 56).clave, "danina");
  assert.equal(categoria("pm25", 151).clave, "muyDanina");
  assert.equal(categoria("pm25", 251).clave, "peligrosa");
  assert.equal(categoria("pm25", 900).clave, "peligrosa");
  assert.equal(categoria("pm10", 54).clave, "buena");
  assert.equal(categoria("pm10", 55).clave, "aceptable");
  assert.equal(categoria("pm10", 155).clave, "sensibles");
  assert.equal(categoria("pm10", 425).clave, "peligrosa");
});

test("valor del ICA por interpolación", () => {
  assert.equal(valorIca("pm25", 0), 0);
  assert.equal(valorIca("pm25", 12), 50);
  assert.equal(valorIca("pm25", 13), 51);
  assert.equal(valorIca("pm25", 37), 100);
  assert.equal(valorIca("pm25", 12.4), 51); // entre puntos de corte: inicio del tramo
  assert.equal(valorIca("pm10", 54), 50);
  assert.equal(valorIca("pm10", 104.5), 76);
  assert.equal(valorIca("pm25", 1000), 500);
});

test("comparación con la OMS y la norma", () => {
  assert.deepEqual(comparar("pm25", 9), { vecesOms: 0.6, sobreOms: false, sobreNorma: false });
  assert.equal(textoOms("pm25", 9), "Por debajo de la guía de la OMS (15 µg/m³)");
  assert.equal(textoOms("pm25", 31.5), "2,1 veces la guía de la OMS (15 µg/m³), dentro de la norma colombiana");
  assert.equal(textoOms("pm25", 45), "3,0 veces la guía de la OMS y por encima de la norma colombiana (37 µg/m³)");
  assert.equal(textoOms("pm10", 50), "1,1 veces la guía de la OMS (45 µg/m³), dentro de la norma colombiana");
});

// 48 horas: ayer 00:00 → hoy 23:00 en Bogotá; PM2.5 = número de la hora del día.
function aire(): Aire {
  const time: string[] = [];
  const pm25: (number | null)[] = [];
  for (const dia of ["2026-10-11", "2026-10-12"]) {
    for (let h = 0; h < 24; h++) {
      time.push(`${dia}T${String(h).padStart(2, "0")}:00`);
      pm25.push(h);
    }
  }
  return convertirAire({ utc_offset_seconds: -18000, hourly: { time, pm2_5: pm25, pm10: pm25.map((v) => (v === null ? null : v * 2)) } }, 0);
}
// 2026-10-12 10:30 en Bogotá.
const AHORA = Date.UTC(2026, 9, 12, 15, 30);

test("valor actual y promedio de 24 h", () => {
  const a = aire();
  assert.equal(valorActual(a, "pm25", AHORA), 10);
  assert.equal(valorActual(a, "pm10", AHORA), 20);
  // Últimas 24 h: ayer 11..23 y hoy 0..10 → media de 0..23 = 11,5 → 12 (entero, como los cortes).
  assert.equal(promedio24h(a, "pm25", AHORA), 12);
});

test("sin datos suficientes no hay promedio", () => {
  const a = aire();
  a.horas.forEach((h, i) => {
    if (i % 3 !== 0) h.pm25 = null; // dos de cada tres vacías
  });
  assert.equal(promedio24h(a, "pm25", AHORA), null);
  assert.equal(promedio24h(aire(), "pm25", Date.UTC(2030, 0, 1)), null);
});

test("próximas horas de aire y URL", () => {
  const h = proximasHorasAire(aire(), 5, AHORA);
  assert.deepEqual(h.map((x) => x.hora.slice(11, 13)), ["10", "11", "12", "13", "14"]);
  const url = new URL(urlAire({ latitud: 10.96391, longitud: -74.79641 }));
  assert.equal(url.searchParams.get("hourly"), "pm2_5,pm10");
  assert.equal(url.searchParams.get("past_days"), "1");
  assert.equal(url.searchParams.get("timezone"), "auto");
});
