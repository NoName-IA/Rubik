// Lluvia observada ahora en el aeropuerto más cercano (METAR, sin React, probado con node:test).
//
// El pronóstico no ve el cielo real. Comparado con las estaciones del IDEAM de Barranquilla y Soledad
// (sept.–oct. 2026), cuando el pronóstico anunciaba lluvia para la hora en curso llovió el 13 % de
// las veces si el aeropuerto estaba seco y el 40 % si reportaba lluvia. Por eso, cerca de un
// aeropuerto, su reporte manda sobre el pronóstico para la hora en curso.
// Fuente: https://aviationweather.gov/data/api/ (gratis, sin clave, reportes cada hora).

import { obtenerTexto } from "../http.ts";
import { distanciaKm } from "./respaldo.ts";
import type { Coordenadas } from "./tipos.ts";

/** Solo se usa un aeropuerto así de cerca (las estaciones del IDEAM comparadas estaban a 3–11 km). */
export const RADIO_KM = 15;
/** Un reporte más viejo que esto ya no dice nada de "ahora" (salen cada hora). */
export const VIGENCIA_MS = 90 * 60_000;
/** Medio lado del recuadro de búsqueda, en grados (~22 km). */
const MARGEN = 0.2;

/** Campos usados del METAR de aviationweather.gov. `wxString` falta si no está pasando nada. */
export interface Metar {
  icaoId: string;
  /** Segundos desde 1970. */
  obsTime: number;
  lat: number;
  lon: number;
  wxString?: string | null;
  /** Nubosidad mayor: SKC, CLR, CAVOK, FEW, SCT, BKN, OVC… */
  cover?: string | null;
}

export type LluviaObservada = "llueve" | "cerca" | "seco";

export interface Observacion {
  estacion: string;
  distanciaKm: number;
  lluvia: LluviaObservada;
  /** Lo observado como código WMO (el mismo idioma del pronóstico), p. ej. 2 = parcialmente nublado. */
  codigo: number;
  /** Momento del reporte (ms desde 1970). */
  hora: number;
}

export function urlMetar({ latitud, longitud }: Coordenadas): string {
  const caja = [latitud - MARGEN, longitud - MARGEN, latitud + MARGEN, longitud + MARGEN].map((n) => n.toFixed(2)).join(",");
  return `https://aviationweather.gov/api/data/metar?bbox=${caja}&format=json`;
}

/**
 * Tiempo presente del METAR, p. ej. "-RA", "+TSRA", "VCSH", "TS BR":
 * precipitación en la estación (RA lluvia, DZ llovizna, GR/GS granizo, UP desconocida) → "llueve";
 * en los alrededores (VC…) o tormenta sin precipitación (TS) → "cerca"; si no → "seco".
 */
export function lluviaMetar(wx: string | null | undefined): LluviaObservada {
  let cerca = false;
  for (const grupo of (wx ?? "").split(/\s+/).filter(Boolean)) {
    if (grupo.startsWith("VC")) cerca ||= /SH|TS/.test(grupo);
    else if (/RA|DZ|GR|GS|UP/.test(grupo)) return "llueve";
    else if (grupo.includes("TS")) cerca = true;
  }
  return cerca ? "cerca" : "seco";
}

/**
 * Código WMO de lo que reporta el METAR: tormenta 95; llovizna 53; lluvia 61/63/65 según la
 * intensidad (-, normal, +); sin precipitación, según las nubes (0 despejado … 3 nublado).
 */
export function codigoMetar(wx: string | null | undefined, cover: string | null | undefined): number {
  const grupos = (wx ?? "").split(/\s+/).filter((g) => g && !g.startsWith("VC"));
  const lluvia = grupos.find((g) => /RA|DZ|GR|GS|UP/.test(g));
  if (lluvia) {
    if (lluvia.includes("TS")) return 95;
    if (lluvia.includes("DZ") && !lluvia.includes("RA")) return 53;
    return lluvia.startsWith("+") ? 65 : lluvia.startsWith("-") ? 61 : 63;
  }
  if (grupos.some((g) => g.includes("TS"))) return 95;
  switch (cover) {
    case "SKC":
    case "CLR":
    case "CAVOK":
    case "NSC":
      return 0;
    case "FEW":
      return 1;
    case "SCT":
      return 2;
    default:
      return 3;
  }
}

/**
 * Código del estado actual: el del pronóstico, salvo que el aeropuerto lo contradiga
 * (reporta lluvia, o está seco mientras el pronóstico dice que llueve).
 */
export function codigoActual(codigoPronostico: number, obs: Observacion | null): number {
  if (!obs || obs.lluvia === "cerca") return codigoPronostico;
  if (obs.lluvia === "llueve") return obs.codigo;
  return codigoPronostico >= 51 ? obs.codigo : codigoPronostico;
}

/** El aeropuerto más cercano dentro de `RADIO_KM` con un reporte vigente, o `null`. */
export function elegirObservacion(metars: Metar[], punto: Coordenadas, ahora: number = Date.now()): Observacion | null {
  let mejor: Observacion | null = null;
  for (const m of metars) {
    const km = distanciaKm(punto, { latitud: m.lat, longitud: m.lon });
    const hora = m.obsTime * 1000;
    if (km > RADIO_KM || ahora - hora > VIGENCIA_MS || hora - ahora > VIGENCIA_MS) continue;
    if (!mejor || km < mejor.distanciaKm) {
      mejor = { estacion: m.icaoId, distanciaKm: km, lluvia: lluviaMetar(m.wxString), codigo: codigoMetar(m.wxString, m.cover), hora };
    }
  }
  return mejor;
}

/** Sin aeropuertos en el recuadro el servicio responde vacío (204). */
export async function obtenerMetars(punto: Coordenadas): Promise<Metar[]> {
  const texto = await obtenerTexto(urlMetar(punto));
  return texto.trim() ? (JSON.parse(texto) as Metar[]) : [];
}
