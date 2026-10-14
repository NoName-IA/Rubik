// Descarga las tres fuentes en paralelo y las combina (sin React, probado con node:test).

import type { Almacen } from "../clima/respaldo.ts";
import { ErrorRed } from "../http.ts";
import { combinar } from "./combinar.ts";
import { deElHeraldo, deGoogle, deZonaCero, type Fuente, type Noticia, URLS, type Zona } from "./fuentes.ts";

export interface ResultadoNoticias {
  noticias: Noticia[];
  /** Fuentes que no respondieron esta vez. */
  caidas: Fuente[];
  obtenido: number;
  /** `true` si viene del celular porque no hubo conexión. */
  guardado?: boolean;
}

export interface Pedidos {
  texto: (url: string) => Promise<string>;
  json: <T>(url: string) => Promise<T>;
}

const TODAS: Fuente[] = ["elheraldo", "zonacero", "google"];
const APAGADA = Promise.resolve([] as Noticia[]);

/** `activas`: fuentes elegidas en Usuario (por defecto, las tres). */
export async function cargarNoticias(
  zona: Zona,
  p: Pedidos,
  ahora: () => number = Date.now,
  activas: Fuente[] = TODAS,
): Promise<ResultadoNoticias> {
  const usar = (f: Fuente) => activas.includes(f);
  const [heraldo, zonaCero, google] = await Promise.allSettled([
    usar("elheraldo") ? p.texto(URLS.elheraldo[zona]).then((xml) => deElHeraldo(xml, zona)) : APAGADA,
    usar("zonacero") ? p.json<Parameters<typeof deZonaCero>[0]>(URLS.zonacero[zona]).then(deZonaCero) : APAGADA,
    usar("google") ? p.texto(URLS.google[zona]).then(deGoogle) : APAGADA,
  ]);
  const caidas: Fuente[] = [];
  const listas: Noticia[][] = [];
  const directasOk: ("elheraldo" | "zonacero")[] = [];
  for (const [fuente, r] of [
    ["elheraldo", heraldo],
    ["zonacero", zonaCero],
    ["google", google],
  ] as const) {
    if (!usar(fuente)) continue;
    if (r.status === "fulfilled") {
      listas.push(r.value);
      if (fuente !== "google") directasOk.push(fuente);
    } else caidas.push(fuente);
  }
  if (listas.length === 0) throw new ErrorRed("No se pudo conectar con ninguna fuente de noticias");
  return { noticias: combinar(listas, { ahora: ahora(), directasOk }), caidas, obtenido: ahora() };
}

const clave = (zona: Zona) => `noticias:${zona}`;
const EDAD_MAXIMA_MS = 7 * 24 * 3600_000;

/** Si todo falla, devuelve la última lista guardada (hasta 7 días); si no hay, propaga el error. */
export async function noticiasConRespaldo(
  zona: Zona,
  p: Pedidos,
  almacen: Almacen,
  ahora: () => number = Date.now,
  activas: Fuente[] = TODAS,
): Promise<ResultadoNoticias> {
  try {
    const r = await cargarNoticias(zona, p, ahora, activas);
    almacen.setItem(clave(zona), JSON.stringify(r)).catch(() => {});
    return r;
  } catch (error) {
    try {
      const texto = await almacen.getItem(clave(zona));
      const g = texto ? (JSON.parse(texto) as ResultadoNoticias) : null;
      if (g && ahora() - g.obtenido <= EDAD_MAXIMA_MS) return { ...g, guardado: true };
    } catch {
      /* guardado dañado: se propaga el error original */
    }
    throw error;
  }
}
