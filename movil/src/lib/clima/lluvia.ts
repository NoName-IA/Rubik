// Lluvia por hora y por día (sin React, probado con node:test).

import type { Dia, Hora, Pronostico } from "./tipos.ts";

/**
 * Intensidad de la lluvia por hora según la clasificación de la American Meteorological
 * Society: ligera < 2,5 mm/h, moderada 2,5–7,6 mm/h, fuerte > 7,6 mm/h.
 */
export type Intensidad = "sin" | "ligera" | "moderada" | "fuerte";

export const INTENSIDADES: { clave: Intensidad; nombre: string; rango: string }[] = [
  { clave: "sin", nombre: "Sin lluvia", rango: "< 0,1 mm" },
  { clave: "ligera", nombre: "Ligera", rango: "< 2,5 mm" },
  { clave: "moderada", nombre: "Moderada", rango: "2,5–7,6 mm" },
  { clave: "fuerte", nombre: "Fuerte", rango: "> 7,6 mm" },
];

export function intensidad(mm: number): Intensidad {
  if (mm < 0.1) return "sin";
  if (mm < 2.5) return "ligera";
  if (mm <= 7.6) return "moderada";
  return "fuerte";
}

export function nombreIntensidad(mm: number): string {
  return INTENSIDADES.find((i) => i.clave === intensidad(mm))!.nombre;
}

/** "4,2 mm" */
export function milimetros(mm: number): string {
  return `${mm.toFixed(1).replace(".", ",")} mm`;
}

export interface ResumenLluvia {
  /** Hora con mayor probabilidad (la primera si hay empate). */
  masProbable: Hora | null;
  /** Hora con más milímetros (null si no llueve nada). */
  masFuerte: Hora | null;
  totalMm: number;
  /** Horas con probabilidad ≥ 50 %. */
  horasProbables: number;
}

export function resumirLluvia(horas: Hora[]): ResumenLluvia {
  let masProbable: Hora | null = null;
  let masFuerte: Hora | null = null;
  let totalMm = 0;
  let horasProbables = 0;
  for (const h of horas) {
    const p = h.probabilidad ?? 0;
    if (p > (masProbable?.probabilidad ?? -1)) masProbable = h;
    if (h.mm >= 0.1 && h.mm > (masFuerte?.mm ?? 0)) masFuerte = h;
    totalMm += h.mm;
    if (p >= 50) horasProbables++;
  }
  return { masProbable, masFuerte, totalMm: Math.round(totalMm * 10) / 10, horasProbables };
}

/** Horas de un día ("2026-10-13"). */
export function horasDelDia(p: Pronostico, fecha: string): Hora[] {
  return p.horas.filter((h) => h.hora.startsWith(fecha));
}

/** Mínima y máxima de toda la semana, para dibujar los rangos de cada día en la misma escala. */
export function rangoSemana(dias: Dia[]): { min: number; max: number } {
  if (dias.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...dias.map((d) => d.minima));
  const max = Math.max(...dias.map((d) => d.maxima));
  return { min, max: max > min ? max : min + 1 };
}
