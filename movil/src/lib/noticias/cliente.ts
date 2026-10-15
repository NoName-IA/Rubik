// Descarga las fuentes en paralelo y las combina (sin React, probado con node:test).
//
// En el área de Barranquilla se usan sus medios (El Heraldo, Zona Cero y Google Noticias por zona).
// En cualquier otro lugar, Google Noticias y Bing Noticias buscando el municipio o el departamento.

import type { Almacen } from "../clima/respaldo.ts";
import { ErrorRed } from "../http.ts";
import { combinar } from "./combinar.ts";
import { deBing, deElHeraldo, deGoogle, deZonaCero, type Fuente, type Noticia, URLS, urlBing, urlGoogleBusqueda, type Zona } from "./fuentes.ts";

/**
 * Qué noticias pedir: una zona de Barranquilla (con sus medios) o una búsqueda de cualquier lugar.
 * `clave` identifica la búsqueda para la caché y lo guardado sin señal.
 */
export type Destino = Zona | { consulta: string; clave: string };

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

const TODAS: Fuente[] = ["elheraldo", "zonacero", "google", "bing"];
const APAGADA = Promise.resolve([] as Noticia[]);

/**
 * `activas`: fuentes a usar (por defecto, todas las que apliquen). En Barranquilla no se usa Bing; en
 * otro lugar solo Google y Bing (El Heraldo y Zona Cero son de Barranquilla y el Atlántico).
 */
export async function cargarNoticias(
  destino: Destino,
  p: Pedidos,
  ahora: () => number = Date.now,
  activas: Fuente[] = TODAS,
): Promise<ResultadoNoticias> {
  const zona = typeof destino === "string" ? destino : null;
  const consulta = typeof destino === "string" ? null : destino.consulta;
  const usar = (f: Fuente) => activas.includes(f) && (zona ? f !== "bing" : f === "google" || f === "bing");
  const [heraldo, zonaCero, google, bing] = await Promise.allSettled([
    usar("elheraldo") && zona ? p.texto(URLS.elheraldo[zona]).then((xml) => deElHeraldo(xml, zona)) : APAGADA,
    usar("zonacero") && zona ? p.json<Parameters<typeof deZonaCero>[0]>(URLS.zonacero[zona]).then(deZonaCero) : APAGADA,
    usar("google") ? p.texto(zona ? URLS.google[zona] : urlGoogleBusqueda(consulta!)).then(deGoogle) : APAGADA,
    usar("bing") && consulta ? p.texto(urlBing(consulta)).then(deBing) : APAGADA,
  ]);
  const caidas: Fuente[] = [];
  const listas: Noticia[][] = [];
  const directasOk: ("elheraldo" | "zonacero")[] = [];
  for (const [fuente, r] of [
    ["elheraldo", heraldo],
    ["zonacero", zonaCero],
    ["google", google],
    ["bing", bing],
  ] as const) {
    if (!usar(fuente)) continue;
    if (r.status === "fulfilled") {
      listas.push(r.value);
      if (fuente === "elheraldo" || fuente === "zonacero") directasOk.push(fuente);
    } else caidas.push(fuente);
  }
  if (listas.length === 0) throw new ErrorRed("No se pudo conectar con ninguna fuente de noticias");
  return { noticias: combinar(listas, { ahora: ahora(), directasOk }), caidas, obtenido: ahora() };
}

const clave = (d: Destino) => `noticias:${typeof d === "string" ? d : d.clave}`;
const EDAD_MAXIMA_MS = 7 * 24 * 3600_000;

/** Si todo falla, devuelve la última lista guardada (hasta 7 días); si no hay, propaga el error. */
export async function noticiasConRespaldo(
  zona: Destino,
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
