// Notificaciones de lluvia y arroyos (sin React, probado con node:test).
//
// No hay servidor: cada vez que llega un pronóstico se calculan los avisos de las próximas 24 h
// y el celular los programa como notificaciones locales, que suenan aunque la app esté cerrada.

import { ahoraLocal, proximasHoras } from "./clima/formato.ts";
import { aLas, cuando, fraseArroyos, rangoHoras, type Ventana, ventanasArroyos, ventanasLluvia } from "./clima/resumen.ts";
import type { HoraLocal, Pronostico } from "./clima/tipos.ts";

export interface Aviso {
  /** Estable por ventana ("arroyos:2026-10-12T15:00"): reprogramar no duplica. */
  id: string;
  titulo: string;
  cuerpo: string;
  /** Momento de la notificación (ms desde 1970). */
  fecha: number;
  /** Pantalla que se abre al tocarla. */
  ruta: "/clima";
}

export interface QueAvisar {
  lluvia: boolean;
  /** Umbral de arroyos, o `null` si no se avisa (desactivado o fuera del área de Barranquilla). */
  arroyos: { probabilidad: number; mm: number } | null;
}

/** Con cuánta anticipación se avisa. */
export const ANTES_ARROYOS = 60 * 60_000;
export const ANTES_LLUVIA = 30 * 60_000;
/** Los avisos de lluvia no suenan entre las 10 p. m. y las 6 a. m. (los de arroyos sí). */
const SILENCIO = { desde: 22, hasta: 6 };
/** Un aviso que tocaría en menos de esto se omite: la alerta ya se ve dentro de la app. */
const MARGEN = 60_000;

/** Instante (ms) de una hora local del lugar del pronóstico. */
export function instante(hora: HoraLocal, desfaseUtc: number): number {
  return Date.parse(`${hora}:00Z`) - desfaseUtc * 1000;
}

const seSolapan = (a: Ventana, b: Ventana) => a.desde < b.hasta && b.desde < a.hasta;

export function planearAvisos(p: Pronostico, que: QueAvisar, ahora: number = Date.now()): Aviso[] {
  const horas = proximasHoras(p, 24, ahora);
  const avisos: Aviso[] = [];
  const futuro = (fecha: number) => fecha >= ahora + MARGEN;
  /** Fecha local del momento del aviso: "mañana" se dice respecto a cuando suena. */
  const diaDe = (fecha: number) => ahoraLocal(p.desfaseUtc, fecha).slice(0, 10);

  const arroyos = que.arroyos ? ventanasArroyos(horas, que.arroyos) : [];
  for (const v of arroyos) {
    const fecha = instante(v.desde, p.desfaseUtc) - ANTES_ARROYOS;
    if (!futuro(fecha)) continue;
    avisos.push({
      id: `arroyos:${v.desde}`,
      titulo: "Riesgo de arroyos",
      cuerpo: `${conPunto(fraseArroyos(v, diaDe(fecha)))} No cruces calles con corriente.`,
      fecha,
      ruta: "/clima",
    });
  }

  if (que.lluvia) {
    for (const v of ventanasLluvia(horas)) {
      // Si ya hay aviso de arroyos para esa lluvia, otro sería repetido.
      if (arroyos.some((a) => seSolapan(a, v))) continue;
      const fecha = instante(v.desde, p.desfaseUtc) - ANTES_LLUVIA;
      const hora = Number(ahoraLocal(p.desfaseUtc, fecha).slice(11, 13));
      if (!futuro(fecha) || hora >= SILENCIO.desde || hora < SILENCIO.hasta) continue;
      avisos.push({ id: `lluvia:${v.desde}`, titulo: "Va a llover", cuerpo: fraseAviso(v, diaDe(fecha)), fecha, ruta: "/clima" });
    }
  }

  return avisos.sort((a, b) => a.fecha - b.fecha);
}

/** "Lloverá entre 2 y 5 p. m.; lo más fuerte, a las 3." o "Puede llover a las 4 p. m." */
function fraseAviso(v: Ventana, hoy: string): string {
  const dia = cuando(v.desde, hoy);
  const prefijo = dia ? `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ` : "";
  let t =
    v.horas.length === 1
      ? `${prefijo}${prefijo ? "p" : "P"}uede llover ${aLas(v.desde, true)}`
      : `${prefijo}${prefijo ? "l" : "L"}loverá ${rangoHoras(v.desde, v.hasta)}`;
  if (v.horas.length > 1 && v.pico.mm >= 0.5 && v.pico.hora !== v.desde) t += `; lo más fuerte, ${aLas(v.pico.hora)}`;
  return conPunto(t);
}

/** Cierra la oración sin duplicar el punto de "p. m." o "m.". */
const conPunto = (t: string) => (t.endsWith(".") ? t : `${t}.`);
