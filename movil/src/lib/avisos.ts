// Notificaciones de lluvia, arroyos, mucho calor y aire limpio (sin React, probado con node:test).
//
// No hay servidor: cada vez que llega un pronóstico se calculan los avisos de las próximas 24 h
// y el celular los programa como notificaciones locales, que suenan aunque la app esté cerrada.

import { CATEGORIAS } from "./aire/ica.ts";
import type { Aire } from "./aire/openMeteoAire.ts";
import { ahoraLocal, grados, proximasHoras } from "./clima/formato.ts";
import { aLas, cuando, fraseArroyos, rangoHoras, type Ventana, ventanasArroyos, ventanasLluvia } from "./clima/resumen.ts";
import type { Hora, HoraLocal, Pronostico } from "./clima/tipos.ts";

export const RUTAS_AVISO = ["/clima", "/aire"] as const;
export type RutaAviso = (typeof RUTAS_AVISO)[number];

export interface Aviso {
  /** Estable por ventana ("arroyos:2026-10-12T15:00"): reprogramar no duplica. */
  id: string;
  titulo: string;
  cuerpo: string;
  /** Momento de la notificación (ms desde 1970). */
  fecha: number;
  /** Pantalla que se abre al tocarla. */
  ruta: RutaAviso;
}

export interface QueAvisar {
  lluvia: boolean;
  /** Umbral de arroyos, o `null` si no se avisa (desactivado o fuera del área de Barranquilla). */
  arroyos: { probabilidad: number; mm: number } | null;
  calor: boolean;
  /** Pronóstico de calidad del aire, o `null` si no se avisa (desactivado o aún sin datos). */
  aire: Aire | null;
}

/** Con cuánta anticipación se avisa. */
export const ANTES_ARROYOS = 60 * 60_000;
export const ANTES_LLUVIA = 30 * 60_000;
/** Los avisos de lluvia no suenan entre las 10 p. m. y las 6 a. m. (los de arroyos sí). */
const SILENCIO = { desde: 22, hasta: 6 };
export const ANTES_CALOR = 60 * 60_000;
/**
 * Sensación térmica desde la que se avisa "mucho calor". En Barranquilla la máxima diaria suele
 * rondar 40–41° (Open-Meteo, sept.–oct. 2026); 42° o más se dio en 9 de 32 días.
 */
export const UMBRAL_CALOR = 42;
/** Los avisos de calor y de aire limpio no suenan antes de esta hora. */
export const HORA_MANANA = 7;
/** El aire se juzga en las horas de la calle (7 a. m. a 6 p. m.); con menos datos no se avisa. */
const HORAS_AIRE = { desde: 7, hasta: 18, minimo: 10 };
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
      avisos.push({ id: `lluvia:${v.desde}`, titulo: "Posible lluvia", cuerpo: fraseAviso(v, diaDe(fecha)), fecha, ruta: "/clima" });
    }
  }

  if (que.calor) avisos.push(...avisosCalor(p, horas, futuro));
  if (que.aire) avisos.push(...avisosAire(que.aire, ahora, futuro));

  return avisos.sort((a, b) => a.fecha - b.fecha);
}

/** Uno por día: 1 h antes de la primera hora con sensación ≥ `UMBRAL_CALOR`, nunca antes de las 7 a. m. */
function avisosCalor(p: Pronostico, horas: Hora[], futuro: (fecha: number) => boolean): Aviso[] {
  const avisos: Aviso[] = [];
  const dias = [...new Set(horas.map((h) => h.hora.slice(0, 10)))];
  for (const dia of dias) {
    const calientes = horas.filter((h) => h.hora.startsWith(dia) && (h.sensacion ?? h.temperatura) >= UMBRAL_CALOR);
    if (calientes.length === 0) continue;
    const pico = calientes.reduce((a, b) => ((b.sensacion ?? b.temperatura) > (a.sensacion ?? a.temperatura) ? b : a));
    const manana = instante(`${dia}T${String(HORA_MANANA).padStart(2, "0")}:00`, p.desfaseUtc);
    const fecha = Math.max(instante(calientes[0].hora, p.desfaseUtc) - ANTES_CALOR, manana);
    if (!futuro(fecha)) continue;
    avisos.push({
      id: `calor:${dia}`,
      titulo: "Mucho calor",
      cuerpo: `${conPunto(`La sensación térmica llegará a ${grados(pico.sensacion ?? pico.temperatura)} ${aLas(pico.hora, true)}`)} Toma agua y busca la sombra.`,
      fecha,
      ruta: "/clima",
    });
  }
  return avisos;
}

/** A las 7 a. m. de los días en que todas las horas de la calle tienen aire "Bueno" (ICA de Colombia). */
function avisosAire(a: Aire, ahora: number, futuro: (fecha: number) => boolean): Aviso[] {
  const buena = CATEGORIAS[0];
  const avisos: Aviso[] = [];
  const dias = [...new Set(a.horas.map((h) => h.hora.slice(0, 10)))];
  for (const dia of dias) {
    const fecha = instante(`${dia}T${String(HORA_MANANA).padStart(2, "0")}:00`, a.desfaseUtc);
    // Solo lo que toca en las próximas 24 h: más adelante el pronóstico del aire cambia mucho.
    if (!futuro(fecha) || fecha > ahora + 24 * 3600_000) continue;
    const calle = a.horas.filter((h) => {
      const n = Number(h.hora.slice(11, 13));
      return h.hora.startsWith(dia) && n >= HORAS_AIRE.desde && n <= HORAS_AIRE.hasta && h.pm25 !== null && h.pm10 !== null;
    });
    if (calle.length < HORAS_AIRE.minimo) continue;
    if (!calle.every((h) => h.pm25! <= buena.pm25[1] && h.pm10! <= buena.pm10[1])) continue;
    avisos.push({
      id: `aire:${dia}`,
      titulo: "¡Respira, el aire está limpio!",
      cuerpo: "Hoy la calidad del aire es buena. Buen día para salir a caminar o abrir las ventanas.",
      fecha,
      ruta: "/aire",
    });
  }
  return avisos;
}

/**
 * "Posible lluvia entre 2 y 5 p. m.; lo más fuerte, a las 3." o "Mañana, posible lluvia a las 4 a. m."
 * ("posible": en un punto concreto la mayoría de los anuncios no se cumplen; ver resumen.ts).
 */
function fraseAviso(v: Ventana, hoy: string): string {
  const dia = cuando(v.desde, hoy);
  const cuandoTexto = v.horas.length === 1 ? aLas(v.desde, true) : rangoHoras(v.desde, v.hasta);
  let t = dia ? `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, posible lluvia ${cuandoTexto}` : `Posible lluvia ${cuandoTexto}`;
  if (v.horas.length > 1 && v.pico.mm >= 0.5 && v.pico.hora !== v.desde) t += `; lo más fuerte, ${aLas(v.pico.hora)}`;
  return conPunto(t);
}

/** Cierra la oración sin duplicar el punto de "p. m." o "m.". */
const conPunto = (t: string) => (t.endsWith(".") ? t : `${t}.`);
