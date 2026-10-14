/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  codigoActual,
  codigoMetar,
  elegirObservacion,
  lluviaMetar,
  type Metar,
  type Observacion,
  RADIO_KM,
  urlMetar,
  VIGENCIA_MS,
} from "../src/lib/clima/metar.ts";
import { BARRANQUILLA } from "../src/lib/ubicacion.ts";

test("tiempo presente del METAR", () => {
  assert.equal(lluviaMetar(undefined), "seco"); // sin `wxString`: no está pasando nada
  assert.equal(lluviaMetar(""), "seco");
  assert.equal(lluviaMetar("BR"), "seco"); // neblina
  assert.equal(lluviaMetar("-RA"), "llueve");
  assert.equal(lluviaMetar("+TSRA"), "llueve");
  assert.equal(lluviaMetar("SHRA BR"), "llueve");
  assert.equal(lluviaMetar("-DZ"), "llueve");
  assert.equal(lluviaMetar("VCSH"), "cerca");
  assert.equal(lluviaMetar("TS"), "cerca"); // tormenta sin lluvia en la estación
  assert.equal(lluviaMetar("VCTS BR"), "cerca");
  assert.equal(lluviaMetar("VCFG"), "seco"); // niebla en los alrededores no es lluvia
});

test("código WMO de lo observado y estado actual", () => {
  assert.equal(codigoMetar(undefined, "SCT"), 2); // el reporte real del 13 de oct., 4 p. m.
  assert.equal(codigoMetar(undefined, "FEW"), 1);
  assert.equal(codigoMetar(undefined, "CAVOK"), 0);
  assert.equal(codigoMetar(undefined, "OVC"), 3);
  assert.equal(codigoMetar(undefined, undefined), 3);
  assert.equal(codigoMetar("-RA", "BKN"), 61);
  assert.equal(codigoMetar("SHRA", "BKN"), 63);
  assert.equal(codigoMetar("+RA", "OVC"), 65);
  assert.equal(codigoMetar("-DZ", "OVC"), 53);
  assert.equal(codigoMetar("TSRA", "BKN"), 95);
  assert.equal(codigoMetar("VCSH", "SCT"), 2);

  const o = (lluvia: Observacion["lluvia"], codigo: number): Observacion => ({ estacion: "SKBQ", distanciaKm: 9, lluvia, codigo, hora: 0 });
  assert.equal(codigoActual(80, null), 80); // sin aeropuerto: el pronóstico
  assert.equal(codigoActual(80, o("seco", 2)), 2); // pronóstico "chubascos", aeropuerto seco
  assert.equal(codigoActual(1, o("seco", 2)), 1); // no se contradicen: queda el pronóstico
  assert.equal(codigoActual(2, o("llueve", 61)), 61); // llueve aunque el pronóstico no lo diga
  assert.equal(codigoActual(3, o("cerca", 3)), 3);
});

test("la URL busca en un recuadro alrededor del punto", () => {
  const url = new URL(urlMetar(BARRANQUILLA));
  assert.equal(url.searchParams.get("bbox"), "10.76,-75.00,11.16,-74.60");
  assert.equal(url.searchParams.get("format"), "json");
});

// 4:00 p. m. en Barranquilla del 13 de oct. de 2026 (21:00 UTC), como el reporte real de SKBQ.
const AHORA = Date.UTC(2026, 9, 13, 21, 20);
const SKBQ: Metar = { icaoId: "SKBQ", obsTime: Date.UTC(2026, 9, 13, 21, 0) / 1000, lat: 10.883, lon: -74.78, cover: "SCT" };
const SKCG: Metar = { icaoId: "SKCG", obsTime: SKBQ.obsTime, lat: 10.447, lon: -75.516, wxString: "-RA" };

test("elige el aeropuerto cercano con reporte vigente", () => {
  const o = elegirObservacion([SKCG, SKBQ], BARRANQUILLA, AHORA);
  assert.ok(o);
  assert.equal(o.estacion, "SKBQ");
  assert.equal(o.lluvia, "seco");
  assert.equal(o.codigo, 2);
  assert.ok(o.distanciaKm > 8 && o.distanciaKm < 10, String(o.distanciaKm));
  assert.equal(o.hora, SKBQ.obsTime * 1000);
});

test("sin aeropuerto cerca o con reporte viejo no hay observación", () => {
  // Cartagena está a ~100 km.
  assert.equal(elegirObservacion([SKCG], BARRANQUILLA, AHORA), null);
  assert.ok(RADIO_KM < 100);
  // Reporte de hace más de 90 minutos.
  assert.equal(elegirObservacion([SKBQ], BARRANQUILLA, SKBQ.obsTime * 1000 + VIGENCIA_MS + 1), null);
  assert.equal(elegirObservacion([], BARRANQUILLA, AHORA), null);
});
