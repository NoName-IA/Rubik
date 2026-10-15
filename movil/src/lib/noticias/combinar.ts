// Une las tres fuentes, quita duplicados y ordena (sin React, probado con node:test).

import type { Noticia } from "./fuentes.ts";

/** Medios que llegan directo (no por un buscador de noticias). */
export type Directa = "elheraldo" | "zonacero";

const VACIAS = new Set(
  "a al ante con contra de del desde el en entre es este esta estos estas hacia hasta la las lo los para por que se sin sobre su sus tras un una uno unos unas y o".split(
    " ",
  ),
);

/** Palabras significativas del título: sin tildes, signos ni palabras vacías. */
export function palabras(titulo: string): Set<string> {
  return new Set(
    titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9ñ ]+/g, " ")
      .split(/\s+/)
      .filter((p) => p.length > 1 && !VACIAS.has(p)),
  );
}

/** Similitud de Jaccard entre dos títulos (0 a 1). */
export function similitud(a: string, b: string): number {
  const x = palabras(a);
  const y = palabras(b);
  if (x.size === 0 || y.size === 0) return 0;
  let comunes = 0;
  for (const p of x) if (y.has(p)) comunes++;
  return comunes / (x.size + y.size - comunes);
}

export const UMBRAL_DUPLICADO = 0.8;
const MEDIO_DIRECTO: Record<Directa, RegExp> = {
  elheraldo: /el ?heraldo/i,
  zonacero: /zona ?cero/i,
};

export interface OpcionesCombinar {
  ahora?: number;
  /**
   * Ventana de tiempo (ms). Por defecto 48 h: la sección Barranquilla de El Heraldo publica pocas
   * notas al día (4 en las últimas 24 h el 2026-10-12) y con 24 h casi desaparecía.
   */
  ventana?: number;
  maximo?: number;
  /** Fuentes directas que sí respondieron: sus notas en Google se descartan. */
  directasOk?: Directa[];
}

/** Mínimo de cupos para Google Noticias (variedad de medios) cuando hay muchas notas directas. */
export const CUPO_MINIMO_GOOGLE = 10;

/**
 * - Descarta lo que Google repite de un medio que ya llegó directo.
 * - Dos noticias con títulos ≥ 80 % parecidos son la misma: se queda la directa (imagen y enlace limpio).
 * - Las directas (El Heraldo, Zona Cero) entran primero; Google completa los cupos que queden (al
 *   menos 10). Sin esto, Google (≈ 100 notas al día) llenaba la lista y desplazaba a los medios locales.
 * - Solo las de la ventana de tiempo (48 h), de la más nueva a la más vieja.
 */
export function combinar(listas: Noticia[][], o: OpcionesCombinar = {}): Noticia[] {
  const ahora = o.ahora ?? Date.now();
  const ventana = o.ventana ?? 48 * 3600_000;
  const directas = o.directasOk ?? [];
  const todas = listas
    .flat()
    .filter((n) => n.fecha <= ahora + 5 * 60_000 && ahora - n.fecha <= ventana)
    .filter((n) => n.fuente !== "google" || !directas.some((f) => MEDIO_DIRECTO[f].test(n.medio)))
    // Las directas primero, para que ganen en los duplicados.
    .sort((a, b) => Number(a.fuente === "google") - Number(b.fuente === "google") || b.fecha - a.fecha);

  const elegidas: Noticia[] = [];
  for (const n of todas) {
    if (elegidas.some((e) => e.url === n.url || similitud(e.titulo, n.titulo) >= UMBRAL_DUPLICADO)) continue;
    elegidas.push(n);
  }
  const maximo = o.maximo ?? 30;
  const directasElegidas = elegidas.filter((n) => n.fuente !== "google");
  const google = elegidas.filter((n) => n.fuente === "google");
  const reservaGoogle = Math.min(CUPO_MINIMO_GOOGLE, google.length, maximo);
  const d = directasElegidas.slice(0, maximo - reservaGoogle);
  const g = google.slice(0, maximo - d.length);
  return [...d, ...g].sort((a, b) => b.fecha - a.fecha);
}

/** "hace 5 min", "hace 2 h", "ayer" */
export function antiguedad(fecha: number, ahora: number = Date.now()): string {
  const min = Math.max(0, Math.round((ahora - fecha) / 60_000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return h < 48 ? "ayer" : `hace ${Math.round(h / 24)} días`;
}
