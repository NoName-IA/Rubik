// Lógica de ubicación sin React (probada con node:test).

import type { Coordenadas } from "./clima/tipos.ts";

/** Centro de Barranquilla: se usa si no hay permiso de ubicación. */
export const BARRANQUILLA: Coordenadas = { latitud: 10.9639, longitud: -74.7964 };

/** Campos de la dirección que devuelve expo-location (todos pueden venir vacíos). */
export interface Direccion {
  district?: string | null;
  subregion?: string | null;
  city?: string | null;
  region?: string | null;
}

/** "El Prado, Barranquilla", "Barranquilla" o, si no hay nada, "Tu ubicación". */
export function nombreLugar(d: Direccion | undefined): string {
  if (!d) return "Tu ubicación";
  const ciudad = d.city || d.subregion || d.region || "";
  const barrio = d.district && d.district !== ciudad ? d.district : "";
  return [barrio, ciudad].filter(Boolean).join(", ") || "Tu ubicación";
}

/**
 * Redondea a 2 decimales (~1 km) para la caché: moverse unos metros no debe
 * volver a pedir el pronóstico.
 */
export function redondear({ latitud, longitud }: Coordenadas): Coordenadas {
  const r = (n: number) => Math.round(n * 100) / 100;
  return { latitud: r(latitud), longitud: r(longitud) };
}
