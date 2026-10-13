// Dólar: TRM oficial (Superintendencia Financiera) desde datos.gov.co (sin React, probado).
// https://www.datos.gov.co/d/32sa-8pi3

import { ahoraLocal } from "./clima/formato.ts";
import type { Almacen } from "./clima/respaldo.ts";
import { obtenerJson } from "./http.ts";

export const URL_TRM =
  "https://www.datos.gov.co/resource/32sa-8pi3.json?$select=valor,vigenciadesde,vigenciahasta&$order=vigenciadesde%20DESC&$limit=400";

export interface DiaTrm {
  /** "2026-10-10" */
  desde: string;
  hasta: string;
  valor: number;
}

export interface Trm {
  /** De la más reciente a la más antigua. */
  serie: DiaTrm[];
  obtenido: number;
  guardado?: boolean;
}

interface FilaApi {
  valor?: string;
  vigenciadesde?: string;
  vigenciahasta?: string;
}

export function convertirTrm(filas: FilaApi[], obtenido: number): Trm {
  const serie = filas
    .map((f) => ({ desde: (f.vigenciadesde ?? "").slice(0, 10), hasta: (f.vigenciahasta ?? "").slice(0, 10), valor: Number(f.valor) }))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.desde) && Number.isFinite(d.valor) && d.valor > 0)
    .sort((a, b) => b.desde.localeCompare(a.desde));
  if (serie.length === 0) throw new Error("La TRM llegó sin datos");
  return { serie, obtenido };
}

export async function obtenerTrm(): Promise<Trm> {
  return convertirTrm(await obtenerJson<FilaApi[]>(URL_TRM), Date.now());
}

/** Fecha de hoy en Colombia ("2026-10-12"), sin importar la zona del celular. */
export function hoyColombia(ahora: number = Date.now()): string {
  return ahoraLocal(-18000, ahora).slice(0, 10);
}

export interface Vigente {
  actual: DiaTrm;
  anterior: DiaTrm | null;
  /** Pesos de diferencia con la TRM anterior. */
  cambio: number | null;
  /** Porcentaje de cambio. */
  cambioPct: number | null;
  /** `false` si la más reciente ya no cubre hoy (datos desactualizados). */
  alDia: boolean;
}

/** TRM vigente hoy (o la más reciente si no hay una que cubra hoy) y su cambio frente a la anterior. */
export function vigente(t: Trm, hoy: string): Vigente {
  const i = t.serie.findIndex((d) => d.desde <= hoy && hoy <= (d.hasta || d.desde));
  const idx = i === -1 ? t.serie.findIndex((d) => d.desde <= hoy) : i;
  const k = idx === -1 ? 0 : idx;
  const actual = t.serie[k];
  const anterior = t.serie[k + 1] ?? null;
  const cambio = anterior ? actual.valor - anterior.valor : null;
  return {
    actual,
    anterior,
    cambio,
    cambioPct: anterior && cambio !== null ? (cambio / anterior.valor) * 100 : null,
    alDia: i !== -1,
  };
}

export interface Periodo {
  puntos: DiaTrm[];
  minimo: DiaTrm;
  maximo: DiaTrm;
  /** Cambio % entre el primer y el último punto del período. */
  cambioPct: number;
}

/** TRM de los últimos `dias` días calendario (en orden cronológico). */
export function periodo(t: Trm, dias: number, hoy: string): Periodo | null {
  const limite = new Date(`${hoy}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() - dias);
  const desde = limite.toISOString().slice(0, 10);
  const puntos = t.serie.filter((d) => d.desde > desde && d.desde <= hoy).reverse();
  if (puntos.length < 2) return null;
  const minimo = puntos.reduce((a, b) => (b.valor < a.valor ? b : a));
  const maximo = puntos.reduce((a, b) => (b.valor > a.valor ? b : a));
  return { puntos, minimo, maximo, cambioPct: ((puntos[puntos.length - 1].valor - puntos[0].valor) / puntos[0].valor) * 100 };
}

// --- Formato colombiano ----------------------------------------------------------------

function miles(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "$3.194,44" (o "$3.194" con `decimales = 0`). */
export function pesos(v: number, decimales = 2): string {
  const signo = v < 0 ? "-" : "";
  const [e, d] = Math.abs(v).toFixed(decimales).split(".");
  return `${signo}$${miles(e)}${d ? `,${d}` : ""}`;
}

/** "US$1.250,50" */
export function dolares(v: number): string {
  return pesos(v).replace("$", "US$");
}

/** "+0,76 %" / "−0,76 %" */
export function porcentaje(v: number): string {
  const s = Math.abs(v).toFixed(2).replace(".", ",");
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${s} %`;
}

/** Lee un número escrito a la colombiana o con punto decimal: "1.250,5", "1250.5", "1250". */
export function leerNumero(texto: string): number | null {
  const t = texto.replace(/[^\d.,]/g, "");
  if (!t) return null;
  let normal: string;
  if (t.includes(",")) normal = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) normal = t.replace(/\./g, "");
  else normal = t;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/** "10 de oct." (o "10 de oct. de 2025" con `conAnio`) */
const MESES = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];
export function fechaCorta(iso: string, conAnio = false): string {
  return `${Number(iso.slice(8, 10))} de ${MESES[Number(iso.slice(5, 7)) - 1]}${conAnio ? ` de ${iso.slice(0, 4)}` : ""}`;
}

/** "del 10 al 13 de oct." o "del 12 de oct." */
export function vigencia(d: DiaTrm): string {
  if (!d.hasta || d.hasta === d.desde) return `del ${fechaCorta(d.desde)}`;
  const mismoMes = d.desde.slice(0, 7) === d.hasta.slice(0, 7);
  return mismoMes ? `del ${Number(d.desde.slice(8, 10))} al ${fechaCorta(d.hasta)}` : `del ${fechaCorta(d.desde)} al ${fechaCorta(d.hasta)}`;
}

// --- Respaldo sin conexión ---------------------------------------------------------------


const CLAVE_RESPALDO = "trm:ultima";
/** La TRM cambia una vez por día hábil: lo guardado sirve hasta 7 días. */
const EDAD_MAXIMA_MS = 7 * 24 * 3600_000;

export async function trmConRespaldo(obtener: () => Promise<Trm>, almacen: Almacen, ahora: () => number = Date.now): Promise<Trm> {
  try {
    const t = await obtener();
    almacen.setItem(CLAVE_RESPALDO, JSON.stringify(t)).catch(() => {});
    return t;
  } catch (error) {
    try {
      const texto = await almacen.getItem(CLAVE_RESPALDO);
      const g = texto ? (JSON.parse(texto) as Trm) : null;
      if (g && Array.isArray(g.serie) && g.serie.length > 0 && ahora() - g.obtenido <= EDAD_MAXIMA_MS) return { ...g, guardado: true };
    } catch {
      /* dañado */
    }
    throw error;
  }
}
