/// <reference types="node" />

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { iconoClima, textoClima } from "../src/lib/clima/codigos.ts";
import {
  ahoraLocal,
  categoriaUv,
  formatoHora,
  formatoHoraMinutos,
  grados,
  haceCuanto,
  proximasHoras,
} from "../src/lib/clima/formato.ts";
import { convertir, type RespuestaOpenMeteo, urlPronostico } from "../src/lib/clima/openMeteo.ts";
import { BARRANQUILLA, nombreLugar, redondear } from "../src/lib/ubicacion.ts";

// Respuesta real de Open-Meteo para Barranquilla (2026-10-12, 17:15 hora local).
const respuesta: RespuestaOpenMeteo = JSON.parse(
  readFileSync(new URL("./fixtures/open-meteo.json", import.meta.url), "utf-8"),
);
const p = convertir(respuesta, 0);
// 17:30 en Barranquilla = 22:30 UTC.
const AHORA = Date.UTC(2026, 9, 12, 22, 30);

test("la URL pide la zona horaria del lugar y redondea las coordenadas", () => {
  const url = new URL(urlPronostico({ latitud: 10.96391234, longitud: -74.79641234 }));
  assert.equal(url.searchParams.get("latitude"), "10.9639");
  assert.equal(url.searchParams.get("longitude"), "-74.7964");
  assert.equal(url.searchParams.get("timezone"), "auto");
  assert.equal(url.searchParams.get("forecast_days"), "7");
  assert.ok(url.searchParams.get("hourly")!.includes("precipitation_probability"));
});

test("convierte la respuesta de Open-Meteo al modelo de la app", () => {
  assert.equal(p.zona, "America/Bogota");
  assert.equal(p.desfaseUtc, -18000);
  assert.equal(p.horas.length, respuesta.hourly.time.length);
  assert.equal(p.dias.length, respuesta.daily.time.length);
  assert.equal(p.actual.temperatura, respuesta.current.temperature_2m);
  assert.equal(p.actual.esDia, respuesta.current.is_day === 1);
  for (const h of p.horas) {
    assert.ok(h.mm >= 0);
    assert.ok(h.probabilidad === null || (h.probabilidad >= 0 && h.probabilidad <= 100));
  }
});

test("los valores nulos de lluvia se vuelven 0 mm y probabilidad nula", () => {
  const r = structuredClone(respuesta);
  r.hourly.precipitation[0] = null;
  r.hourly.precipitation_probability[0] = null;
  const h = convertir(r, 0).horas[0];
  assert.equal(h.mm, 0);
  assert.equal(h.probabilidad, null);
});

test("hora local del lugar sin importar la zona del celular", () => {
  assert.equal(ahoraLocal(-18000, AHORA), "2026-10-12T17:30");
  // Cerca de medianoche UTC sigue siendo el día anterior en Colombia.
  assert.equal(ahoraLocal(-18000, Date.UTC(2026, 9, 13, 3, 0)), "2026-10-12T22:00");
});

test("próximas horas empiezan en la hora en curso", () => {
  const horas = proximasHoras(p, 12, AHORA);
  assert.equal(horas.length, 12);
  assert.equal(horas[0].hora, "2026-10-12T17:00");
  assert.equal(horas[11].hora, "2026-10-13T04:00");
});

test("sin horas futuras devuelve una lista vacía", () => {
  assert.deepEqual(proximasHoras(p, 12, Date.UTC(2030, 0, 1)), []);
});

test("formato de horas al estilo colombiano", () => {
  assert.equal(formatoHora("2026-10-12T00:00"), "12 a. m.");
  assert.equal(formatoHora("2026-10-12T07:00"), "7 a. m.");
  assert.equal(formatoHora("2026-10-12T12:00"), "12 m.");
  assert.equal(formatoHora("2026-10-12T15:00"), "3 p. m.");
  assert.equal(formatoHoraMinutos("2026-10-12T05:48"), "5:48 a. m.");
  assert.equal(formatoHoraMinutos("2026-10-12T17:31"), "5:31 p. m.");
  assert.equal(formatoHoraMinutos("2026-10-12T12:05"), "12:05 p. m.");
});

test("categorías de UV de la OMS", () => {
  assert.equal(categoriaUv(0), "bajo");
  assert.equal(categoriaUv(2.9), "bajo");
  assert.equal(categoriaUv(3), "moderado");
  assert.equal(categoriaUv(7), "alto");
  assert.equal(categoriaUv(9), "muy alto");
  assert.equal(categoriaUv(11), "extremo");
});

test("grados y tiempo transcurrido", () => {
  assert.equal(grados(26.6), "27°");
  assert.equal(grados(-0.4), "0°");
  assert.equal(haceCuanto(0, 20_000), "justo ahora");
  assert.equal(haceCuanto(0, 5 * 60_000), "hace 5 min");
  assert.equal(haceCuanto(0, 2 * 3600_000), "hace 2 h");
});

test("códigos de tiempo: texto e ícono de día y de noche", () => {
  assert.equal(textoClima(0), "Despejado");
  assert.equal(textoClima(81), "Chubascos");
  assert.equal(textoClima(95), "Tormenta eléctrica");
  // Fuera de Europa Central, Open-Meteo no pronostica granizo de forma confiable.
  assert.equal(textoClima(96), "Tormenta eléctrica fuerte");
  assert.equal(textoClima(12345), "Sin dato");
  assert.equal(iconoClima(0, true), "sunny-outline");
  assert.equal(iconoClima(0, false), "moon-outline");
  assert.equal(iconoClima(2, false), "cloudy-night-outline");
  assert.equal(iconoClima(63), "rainy-outline");
  assert.equal(iconoClima(82), "rainy-outline");
  assert.equal(iconoClima(96), "thunderstorm-outline");
  assert.equal(iconoClima(73), "snow-outline");
  // Todos los códigos de la respuesta real tienen texto.
  for (const h of p.horas) assert.notEqual(textoClima(h.codigo), "Sin dato", `código ${h.codigo}`);
});

test("nombre del lugar a partir de la dirección", () => {
  assert.equal(nombreLugar({ district: "El Prado", city: "Barranquilla" }), "El Prado, Barranquilla");
  assert.equal(nombreLugar({ district: null, city: "Barranquilla" }), "Barranquilla");
  assert.equal(nombreLugar({ district: "Soledad", city: "Soledad" }), "Soledad");
  assert.equal(nombreLugar({ subregion: "Puerto Colombia" }), "Puerto Colombia");
  assert.equal(nombreLugar({}), "Tu ubicación");
  assert.equal(nombreLugar(undefined), "Tu ubicación");
});

test("redondeo de coordenadas para la caché", () => {
  assert.deepEqual(redondear({ latitud: 10.96391, longitud: -74.79641 }), { latitud: 10.96, longitud: -74.8 });
  assert.deepEqual(redondear(BARRANQUILLA), { latitud: 10.96, longitud: -74.8 });
});
