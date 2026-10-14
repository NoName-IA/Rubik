// Preferencias del usuario, guardadas solo en el celular (sin React, probado con node:test).

import { CIUDAD_INICIAL, buscarCiudad } from "./ciudades.ts";
import { UMBRAL_ARROYOS } from "./clima/resumen.ts";

export type Tema = "sistema" | "claro" | "oscuro";
/** "gps": la posición del celular; "ciudad": la ciudad elegida en `ciudad`. */
export type ModoUbicacion = "gps" | "ciudad";
export type SensibilidadArroyos = "mas" | "normal" | "menos";

export interface Preferencias {
  nombre: string;
  ubicacion: ModoUbicacion;
  /** id de `CIUDADES` (se usa con `ubicacion: "ciudad"` y si no hay GPS). */
  ciudad: string;
  arroyos: SensibilidadArroyos;
  tema: Tema;
}

export const PREFERENCIAS_INICIALES: Preferencias = {
  nombre: "",
  ubicacion: "gps",
  ciudad: CIUDAD_INICIAL.id,
  arroyos: "normal",
  tema: "sistema",
};

/**
 * Umbrales de la alerta de arroyos. "Normal" es la regla contrastada con la prensa
 * (ver el README principal); las otras dos la hacen más o menos sensible.
 */
export const NIVELES_ARROYOS: Record<SensibilidadArroyos, { nombre: string; probabilidad: number; mm: number; descripcion: string }> = {
  mas: { nombre: "Más avisos", probabilidad: 50, mm: 4, descripcion: "Avisa desde 50 % de probabilidad con aguacero (≥ 4 mm/h) o tormenta." },
  normal: {
    nombre: "Normal",
    probabilidad: UMBRAL_ARROYOS.probabilidad,
    mm: UMBRAL_ARROYOS.mm,
    descripcion: "Avisa desde 60 % con aguacero (≥ 5 mm/h) o tormenta. Detectó los 5 días con arroyos reportados en ago.–sep. 2026.",
  },
  menos: { nombre: "Menos avisos", probabilidad: 70, mm: 7.6, descripcion: "Solo desde 70 % con lluvia fuerte (≥ 7,6 mm/h) o tormenta." },
};

export function umbralArroyos(s: SensibilidadArroyos): { probabilidad: number; mm: number } {
  const { probabilidad, mm } = NIVELES_ARROYOS[s];
  return { probabilidad, mm };
}

const uno = <T extends string>(v: unknown, validos: readonly T[], porDefecto: T): T =>
  typeof v === "string" && (validos as readonly string[]).includes(v) ? (v as T) : porDefecto;

/**
 * Lee lo guardado sin confiar en su forma: campos que falten o sean inválidos (p. ej. de una
 * versión anterior de la app) toman el valor inicial.
 */
export function leerPreferencias(texto: string | null): Preferencias {
  let g: Record<string, unknown> = {};
  try {
    const v = texto ? JSON.parse(texto) : {};
    if (v && typeof v === "object") g = v as Record<string, unknown>;
  } catch {
    /* dañado: valores iniciales */
  }
  // Versión anterior: "Barranquilla fija" se guardaba como ubicacion: "barranquilla".
  const antigua = g.ubicacion === "barranquilla";
  const ciudad = typeof g.ciudad === "string" && buscarCiudad(g.ciudad) ? g.ciudad : CIUDAD_INICIAL.id;
  return {
    nombre: typeof g.nombre === "string" ? g.nombre.trim().slice(0, 30) : "",
    ubicacion: antigua ? "ciudad" : uno(g.ubicacion, ["gps", "ciudad"] as const, "gps"),
    ciudad: antigua ? "barranquilla" : ciudad,
    arroyos: uno(g.arroyos, ["mas", "normal", "menos"] as const, "normal"),
    tema: uno(g.tema, ["sistema", "claro", "oscuro"] as const, "sistema"),
  };
}

/** "Buenas tardes" o "Buenas tardes, Ana". */
export function conNombre(saludo: string, nombre: string): string {
  return nombre ? `${saludo}, ${nombre}` : saludo;
}
