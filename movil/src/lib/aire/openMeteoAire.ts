// Calidad del aire de Open-Meteo (modelo CAMS, gratis y sin clave).
// https://open-meteo.com/en/docs/air-quality-api

import { ahoraLocal } from "../clima/formato.ts";
import { type Almacen, distanciaKm } from "../clima/respaldo.ts";
import type { Coordenadas, HoraLocal } from "../clima/tipos.ts";
import { obtenerJson } from "../http.ts";
import type { Contaminante } from "./ica.ts";

const BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";

export interface HoraAire {
  hora: HoraLocal;
  pm25: number | null;
  pm10: number | null;
}

export interface Aire {
  horas: HoraAire[];
  desfaseUtc: number;
  obtenido: number;
  /** Viene de lo guardado en el celular (sin conexión). */
  guardado?: boolean;
}

export function urlAire({ latitud, longitud }: Coordenadas): string {
  const p = new URLSearchParams({
    latitude: latitud.toFixed(4),
    longitude: longitud.toFixed(4),
    hourly: "pm2_5,pm10",
    // Ayer completo para el promedio de 24 h, y dos días de pronóstico.
    past_days: "1",
    forecast_days: "2",
    timezone: "auto",
  });
  return `${BASE}?${p}`;
}

export interface RespuestaAire {
  utc_offset_seconds: number;
  hourly: { time: string[]; pm2_5: (number | null)[]; pm10: (number | null)[] };
}

export function convertirAire(r: RespuestaAire, obtenido: number): Aire {
  return {
    horas: r.hourly.time.map((hora, i) => ({ hora, pm25: r.hourly.pm2_5[i] ?? null, pm10: r.hourly.pm10[i] ?? null })),
    desfaseUtc: r.utc_offset_seconds,
    obtenido,
  };
}

export async function obtenerAire(coordenadas: Coordenadas): Promise<Aire> {
  return convertirAire(await obtenerJson<RespuestaAire>(urlAire(coordenadas)), Date.now());
}

export const CLAVE_RESPALDO_AIRE = "aire:ultimo";
/** Se piden hasta el final de mañana: lo guardado sirve 24 h (luego falta la hora en curso). */
const EDAD_MAXIMA_AIRE_MS = 24 * 3600_000;
const DISTANCIA_MAXIMA_AIRE_KM = 25;

/**
 * Pide la calidad del aire; si sale bien la guarda. Si falla, devuelve la guardada (marcada con
 * `guardado: true`) cuando es reciente y del mismo sector; si no, propaga el error.
 */
export async function aireConRespaldo(
  obtener: () => Promise<Aire>,
  coordenadas: Coordenadas,
  almacen: Almacen,
  ahora: () => number = Date.now,
): Promise<Aire> {
  try {
    const a = await obtener();
    almacen.setItem(CLAVE_RESPALDO_AIRE, JSON.stringify({ coordenadas, aire: a })).catch(() => {});
    return a;
  } catch (error) {
    try {
      const texto = await almacen.getItem(CLAVE_RESPALDO_AIRE);
      const g = texto ? (JSON.parse(texto) as { coordenadas: Coordenadas; aire: Aire }) : null;
      if (
        g &&
        ahora() - g.aire.obtenido <= EDAD_MAXIMA_AIRE_MS &&
        distanciaKm(g.coordenadas, coordenadas) <= DISTANCIA_MAXIMA_AIRE_KM
      ) {
        return { ...g.aire, guardado: true };
      }
    } catch {
      /* guardado dañado: se propaga el error original */
    }
    throw error;
  }
}

function horaEnCurso(a: Aire, ahora: number): HoraLocal {
  return `${ahoraLocal(a.desfaseUtc, ahora).slice(0, 13)}:00`;
}

/** Valor de la hora en curso. */
export function valorActual(a: Aire, c: Contaminante, ahora: number = Date.now()): number | null {
  return a.horas.find((h) => h.hora === horaEnCurso(a, ahora))?.[c] ?? null;
}

/**
 * Promedio de las últimas 24 horas (incluida la hora en curso), como pide la norma, redondeado a
 * entero porque los puntos de corte del ICA son enteros (así categoría, ICA y texto cuadran).
 * Exige al menos 18 valores (75 %, el mismo criterio de representatividad del IDEAM).
 */
export function promedio24h(a: Aire, c: Contaminante, ahora: number = Date.now()): number | null {
  const fin = horaEnCurso(a, ahora);
  const i = a.horas.findIndex((h) => h.hora === fin);
  if (i === -1) return null;
  const valores = a.horas
    .slice(Math.max(0, i - 23), i + 1)
    .map((h) => h[c])
    .filter((v): v is number => v !== null);
  if (valores.length < 18) return null;
  return Math.round(valores.reduce((s, v) => s + v, 0) / valores.length);
}

/** Próximas `n` horas desde la hora en curso. */
export function proximasHorasAire(a: Aire, n: number, ahora: number = Date.now()): HoraAire[] {
  const i = a.horas.findIndex((h) => h.hora >= horaEnCurso(a, ahora));
  return i === -1 ? [] : a.horas.slice(i, i + n);
}
