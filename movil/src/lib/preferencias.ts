// Preferencias del usuario, guardadas solo en el celular (sin React, probado con node:test).

import { CIUDAD_INICIAL, buscarCiudad } from "./ciudades.ts";

export type Tema = "sistema" | "claro" | "oscuro";
/** "gps": la posición del celular; "ciudad": la ciudad elegida en `ciudad`. */
export type ModoUbicacion = "gps" | "ciudad";

export interface Preferencias {
  nombre: string;
  ubicacion: ModoUbicacion;
  /** id de `CIUDADES` (se usa con `ubicacion: "ciudad"` y si no hay GPS). */
  ciudad: string;
  tema: Tema;
  /** RuboKill: al perder contra la IA en el Rubo, la foto de Rubo en toda la pantalla. Apagado al empezar. */
  rubokill: boolean;
}

export const PREFERENCIAS_INICIALES: Preferencias = {
  nombre: "",
  ubicacion: "gps",
  ciudad: CIUDAD_INICIAL.id,
  tema: "sistema",
  rubokill: false,
};

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
    tema: uno(g.tema, ["sistema", "claro", "oscuro"] as const, "sistema"),
    rubokill: g.rubokill === true,
  };
}

/** "Buenas tardes" o "Buenas tardes, Ana". */
export function conNombre(saludo: string, nombre: string): string {
  return nombre ? `${saludo}, ${nombre}` : saludo;
}
