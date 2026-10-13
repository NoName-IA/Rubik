// Último pronóstico guardado en el celular para mostrarlo sin señal (sin React, probado).

import type { Coordenadas, Pronostico } from "./tipos.ts";

export interface Almacen {
  getItem(clave: string): Promise<string | null>;
  setItem(clave: string, valor: string): Promise<void>;
}

export const CLAVE_RESPALDO = "pronostico:ultimo";
/** Un pronóstico guardado sirve hasta 24 h (después las horas ya pasaron). */
export const EDAD_MAXIMA_MS = 24 * 3600_000;
/** Solo se usa si es del mismo sector (no mostrar el de otra ciudad). */
export const DISTANCIA_MAXIMA_KM = 25;

interface Guardado {
  coordenadas: Coordenadas;
  pronostico: Pronostico;
}

export function distanciaKm(a: Coordenadas, b: Coordenadas): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitud - a.latitud);
  const dLon = rad(b.longitud - a.longitud);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Pide el pronóstico; si sale bien lo guarda. Si falla, devuelve el guardado (marcado con
 * `guardado: true`) cuando es reciente y del mismo sector; si no, propaga el error.
 */
export async function conRespaldo(
  obtener: () => Promise<Pronostico>,
  coordenadas: Coordenadas,
  almacen: Almacen,
  ahora: () => number = Date.now,
): Promise<Pronostico> {
  try {
    const p = await obtener();
    almacen.setItem(CLAVE_RESPALDO, JSON.stringify({ coordenadas, pronostico: p } satisfies Guardado)).catch(() => {});
    return p;
  } catch (error) {
    const previo = await leerRespaldo(coordenadas, almacen, ahora);
    if (previo) return previo;
    throw error;
  }
}

export async function leerRespaldo(
  coordenadas: Coordenadas,
  almacen: Almacen,
  ahora: () => number = Date.now,
): Promise<Pronostico | null> {
  try {
    const texto = await almacen.getItem(CLAVE_RESPALDO);
    if (!texto) return null;
    const g = JSON.parse(texto) as Guardado;
    if (ahora() - g.pronostico.obtenido > EDAD_MAXIMA_MS) return null;
    if (distanciaKm(g.coordenadas, coordenadas) > DISTANCIA_MAXIMA_KM) return null;
    return { ...g.pronostico, guardado: true };
  } catch {
    return null;
  }
}
