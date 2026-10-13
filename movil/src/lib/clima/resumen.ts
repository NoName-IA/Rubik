// Frase de resumen de la lluvia y alerta de arroyos (sin React, probado con node:test).

import type { Hora, HoraLocal } from "./tipos.ts";

/** Horas seguidas con probabilidad ≥ umbral. `hasta` es la hora siguiente a la última. */
export interface Ventana {
  desde: HoraLocal;
  hasta: HoraLocal;
  horas: Hora[];
  /** Hora con más milímetros dentro de la ventana. */
  pico: Hora;
}

function horaSiguiente(hora: HoraLocal): HoraLocal {
  const d = new Date(`${hora}:00Z`);
  d.setUTCHours(d.getUTCHours() + 1);
  return d.toISOString().slice(0, 16);
}

/** Agrupa horas consecutivas que cumplen `cumple`. */
export function agrupar(horas: Hora[], cumple: (h: Hora) => boolean): Ventana[] {
  const ventanas: Ventana[] = [];
  let actual: Hora[] = [];
  const cerrar = () => {
    if (actual.length === 0) return;
    const pico = actual.reduce((a, b) => (b.mm > a.mm ? b : a));
    ventanas.push({ desde: actual[0].hora, hasta: horaSiguiente(actual[actual.length - 1].hora), horas: actual, pico });
    actual = [];
  };
  for (const h of horas) {
    const seguida = actual.length > 0 && horaSiguiente(actual[actual.length - 1].hora) === h.hora;
    if (cumple(h) && (actual.length === 0 || seguida)) actual.push(h);
    else {
      cerrar();
      if (cumple(h)) actual.push(h);
    }
  }
  cerrar();
  return ventanas;
}

export const UMBRAL_LLUVIA = 50;

export function ventanasLluvia(horas: Hora[], umbral = UMBRAL_LLUVIA): Ventana[] {
  return agrupar(horas, (h) => (h.probabilidad ?? 0) >= umbral);
}

// --- Textos ------------------------------------------------------------------------

function partes(hora: HoraLocal): { n: number; sufijo: string } {
  const h = Number(hora.slice(11, 13));
  if (h === 0) return { n: 12, sufijo: "a. m." };
  if (h === 12) return { n: 12, sufijo: "m." };
  return h < 12 ? { n: h, sufijo: "a. m." } : { n: h - 12, sufijo: "p. m." };
}

/** "a las 3", "a la 1", "a las 12 m." (sin sufijo si se sobreentiende). */
export function aLas(hora: HoraLocal, conSufijo = false): string {
  const { n, sufijo } = partes(hora);
  return `${n === 1 ? "a la" : "a las"} ${n}${conSufijo ? ` ${sufijo}` : ""}`;
}

/** Final de un período: "las 7 p. m.", "la 1 p. m.", "la medianoche", "el mediodía". */
export function hastaLas(hora: HoraLocal): string {
  const h = Number(hora.slice(11, 13));
  if (h === 0) return "la medianoche";
  if (h === 12) return "el mediodía";
  return aLas(hora, true).replace(/^a /, "");
}

/** "entre 2 y 5 p. m.", "entre 10 p. m. y 2 a. m.", "entre 11 a. m. y 12 m.", "entre 9 p. m. y la medianoche" */
export function rangoHoras(desde: HoraLocal, hasta: HoraLocal): string {
  const a = partes(desde);
  const b = partes(hasta);
  if (Number(hasta.slice(11, 13)) === 0) return `entre ${a.n} ${a.sufijo} y la medianoche`;
  if (a.sufijo === b.sufijo && a.n !== 12) return `entre ${a.n} y ${b.n} ${b.sufijo}`;
  return `entre ${a.n} ${a.sufijo} y ${b.n} ${b.sufijo}`;
}

/** "" si es hoy, "mañana" o "pasado mañana" según la fecha respecto a `hoy`. */
export function cuando(hora: HoraLocal, hoy: string): string {
  const dias = Math.round((Date.parse(hora.slice(0, 10)) - Date.parse(hoy)) / 86_400_000);
  if (dias <= 0) return "";
  return dias === 1 ? "mañana" : "pasado mañana";
}

/**
 * Una frase para las próximas horas, p. ej.:
 * "Lloverá entre 2 y 5 p. m.; lo más fuerte, a las 3."
 * `horas` empieza en la hora en curso.
 */
export function fraseLluvia(horas: Hora[]): string {
  if (horas.length === 0) return "Sin datos de lluvia.";
  const hoy = horas[0].hora.slice(0, 10);
  const ventanas = ventanasLluvia(horas);

  if (ventanas.length === 0) {
    const max = horas.reduce((a, b) => ((b.probabilidad ?? 0) > (a.probabilidad ?? 0) ? b : a));
    const p = max.probabilidad ?? 0;
    if (p < 20) return "No se espera lluvia.";
    const dia = cuando(max.hora, hoy);
    return `Poca probabilidad de lluvia (máx. ${p} % ${dia ? `${dia} ` : ""}${aLas(max.hora, true)}).`;
  }

  const [v, otra] = ventanas;
  const dia = cuando(v.desde, hoy);
  const empiezaYa = v.desde === horas[0].hora;
  let frase: string;
  if (empiezaYa && v.horas.length === 1) frase = "Puede llover ahora mismo";
  else if (empiezaYa) frase = `Puede llover desde ya y hasta ${hastaLas(v.hasta)}`;
  else if (v.horas.length === 1) frase = `${dia ? `${capital(dia)} p` : "P"}uede llover ${aLas(v.desde, true)}`;
  else frase = `${dia ? `${capital(dia)} l` : "L"}loverá ${rangoHoras(v.desde, v.hasta)}`;

  if (v.horas.length > 1 && v.pico.mm >= 0.5 && v.pico.hora !== v.desde) frase += `; lo más fuerte, ${aLas(v.pico.hora)}`;
  frase = conPunto(frase);
  if (otra) {
    const diaOtra = cuando(otra.desde, hoy);
    frase += conPunto(
      ` Otra vez ${diaOtra && diaOtra !== dia ? `${diaOtra} ` : ""}${otra.horas.length === 1 ? aLas(otra.desde, true) : rangoHoras(otra.desde, otra.hasta)}`,
    );
  }
  return frase;
}

/** Cierra la oración sin duplicar el punto de "p. m." o "m.". */
function conPunto(t: string): string {
  return t.endsWith(".") ? t : `${t}.`;
}

function capital(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// --- Arroyos -----------------------------------------------------------------------

/**
 * Regla provisional, contrastada con 5 días de arroyos reportados por la prensa (ago.–sep. 2026):
 * el modelo subestima los aguaceros (el 20 de sept. marcó 1,3 mm/h), así que además de los
 * milímetros se usa el código de tormenta eléctrica (95–99), que sí aparece esos días.
 * Ver "Alerta de arroyos" en el README principal.
 */
export const UMBRAL_ARROYOS = { probabilidad: 60, mm: 5 };

export function horaConRiesgo(h: Hora, u = UMBRAL_ARROYOS): boolean {
  return (h.probabilidad ?? 0) >= u.probabilidad && (h.mm >= u.mm || h.codigo >= 95);
}

export function ventanasArroyos(horas: Hora[], u = UMBRAL_ARROYOS): Ventana[] {
  return agrupar(horas, (h) => horaConRiesgo(h, u));
}

/**
 * "Riesgo de arroyos entre 2 y 4 p. m." (o "a las 3 p. m.", "mañana …").
 * Si empieza en la hora en curso (`ahora`): "Riesgo de arroyos ahora" o "… desde ya y hasta …".
 */
export function fraseArroyos(v: Ventana, hoy: string, ahora?: HoraLocal): string {
  if (ahora && v.desde === ahora) {
    return v.horas.length === 1 ? "Riesgo de arroyos ahora" : `Riesgo de arroyos desde ya y hasta ${hastaLas(v.hasta)}`;
  }
  const dia = cuando(v.desde, hoy);
  const cuandoTexto = v.horas.length === 1 ? aLas(v.desde, true) : rangoHoras(v.desde, v.hasta);
  return `Riesgo de arroyos ${dia ? `${dia} ` : ""}${cuandoTexto}`;
}
