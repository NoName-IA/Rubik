// Frase de resumen de la lluvia y alerta de arroyos (sin React, probado con node:test).

import type { Observacion } from "./metar.ts";
import type { Hora, HoraLocal } from "./tipos.ts";

/** Horas seguidas que cumplen una condición (lluvia, arroyos). `hasta` es la hora siguiente a la última. */
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

/**
 * Una hora cuenta como lluvia con probabilidad ≥ 50 % y ≥ 0,2 mm.
 *
 * Contrastado con 10 estaciones automáticas del IDEAM en el Atlántico (13 sept.–12 oct. 2026,
 * 7.198 horas): sin exigir milímetros se anunciaba lluvia casi 3 veces más de lo que llovía; con
 * 0,2 mm el exceso baja a 1,3 veces. Probar otros modelos (ICON, ECMWF, GFS…), su promedio o
 * umbrales más altos no mejoró de forma clara. Aun así, en un punto concreto la mayoría de los
 * anuncios no se cumplen (los aguaceros son muy locales): por eso las frases dicen "posible".
 */
export const UMBRAL_LLUVIA = 50;
/** Con menos milímetros son gotas sueltas que casi no se notan, aunque la probabilidad sea alta. */
export const MM_LLUVIA = 0.2;

/** Hora con lluvia que se nota: probabilidad alta y milímetros reales. */
export function hayLluvia(h: Hora, umbral = UMBRAL_LLUVIA): boolean {
  return (h.probabilidad ?? 0) >= umbral && h.mm >= MM_LLUVIA;
}

/** Códigos WMO de llovizna (51–57): agua fina, no aguacero. */
const esLlovizna = (h: Hora) => h.codigo >= 51 && h.codigo <= 57;

export function ventanasLluvia(horas: Hora[], umbral = UMBRAL_LLUVIA): Ventana[] {
  return agrupar(horas, (h) => hayLluvia(h, umbral));
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

/** Lo más fuerte que trae un grupo de ventanas: tormenta eléctrica > lluvia > lloviznas. */
type TipoLluvia = "tormenta" | "lluvia" | "llovizna";

function tipoLluvia(ventanas: Ventana[]): TipoLluvia {
  const horas = ventanas.flatMap((v) => v.horas);
  if (horas.some((h) => h.codigo >= 95)) return "tormenta";
  return horas.every(esLlovizna) ? "llovizna" : "lluvia";
}

const PODRIA: Record<TipoLluvia, string> = {
  tormenta: "podría haber tormenta eléctrica",
  lluvia: "podría llover",
  llovizna: "podría haber lloviznas",
};

/** "a las 3 p. m.", "entre 2 y 5 p. m.", "desde ya hasta las 7 p. m.", unidas con "y". */
function cuandoLlueve(ventanas: Ventana[], ahora: HoraLocal | null): string {
  const partes = ventanas.map((v) => {
    if (v.desde === ahora) return v.horas.length === 1 ? "en la próxima hora" : `desde ya hasta ${hastaLas(v.hasta)}`;
    return v.horas.length === 1 ? aLas(v.desde, true) : rangoHoras(v.desde, v.hasta);
  });
  return partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/**
 * Resumen corto de la lluvia por días, p. ej. "Hoy podría llover entre 2 y 5 p. m. Mañana también
 * podría haber tormenta eléctrica a las 3 p. m." o "Hoy no llueve. Mañana tampoco."
 * `horas` empieza en la hora en curso; se usan las de hoy y las de mañana.
 *
 * El pronóstico no ve el cielo real. Si hay un aeropuerto cerca con reporte vigente (`obs`), su
 * observación manda para la hora en curso (ver metar.ts), pero la frase no lo menciona.
 */
export function fraseLluvia(horas: Hora[], obs: Observacion | null = null): string {
  if (horas.length === 0) return "Sin datos de lluvia.";
  const hoy = horas[0].hora.slice(0, 10);
  let ahora: HoraLocal | null = horas[0].hora;
  let deHoy = horas.filter((h) => h.hora.startsWith(hoy));
  const deManana = horas.filter((h) => cuando(h.hora, hoy) === "mañana");

  // Lo anunciado para esta hora casi nunca se cumple si el aeropuerto está seco: se omite.
  if (obs?.lluvia === "seco" && ventanasLluvia(deHoy)[0]?.desde === ahora) {
    deHoy = deHoy.slice(1);
    ahora = null;
  }

  const frases: string[] = [];
  const lluviaHoy = ventanasLluvia(deHoy);
  if (obs?.lluvia === "llueve") {
    const [primera, ...resto] = lluviaHoy;
    const sigue = primera?.desde === ahora;
    frases.push(
      sigue
        ? primera.horas.length === 1
          ? "Está lloviendo; podría parar pronto."
          : conPunto(`Está lloviendo y podría seguir hasta ${hastaLas(primera.hasta)}`)
        : "Está lloviendo, pero no se espera que dure.",
    );
    const despues = sigue ? resto : lluviaHoy;
    if (despues.length > 0) frases.push(conPunto(`Podría volver a llover ${cuandoLlueve(despues, null)}`));
  } else if (lluviaHoy.length > 0) {
    frases.push(conPunto(`Hoy ${PODRIA[tipoLluvia(lluviaHoy)]} ${cuandoLlueve(lluviaHoy, ahora)}`));
  } else {
    // Probabilidad alta pero casi sin milímetros: no es lluvia, son gotas.
    const gotas = deHoy.find((h) => (h.probabilidad ?? 0) >= UMBRAL_LLUVIA);
    frases.push(gotas ? conPunto(`Hoy no llueve; quizás unas gotas ${gotas.hora === ahora ? "en la próxima hora" : aLas(gotas.hora, true)}`) : "Hoy no llueve.");
  }
  const lloveraHoy = obs?.lluvia === "llueve" || lluviaHoy.length > 0;

  if (deManana.length > 0) {
    const lluviaManana = ventanasLluvia(deManana);
    if (lluviaManana.length > 0) {
      frases.push(conPunto(`Mañana ${lloveraHoy ? "también " : ""}${PODRIA[tipoLluvia(lluviaManana)]} ${cuandoLlueve(lluviaManana, null)}`));
    } else if (deManana.length === 24) {
      // Solo se descarta la lluvia de mañana si se tiene el día completo.
      frases.push(lloveraHoy ? "Mañana no se espera lluvia." : "Mañana tampoco.");
    }
  }
  return frases.join(" ");
}

/** Cierra la oración sin duplicar el punto de "p. m." o "m.". */
function conPunto(t: string): string {
  return t.endsWith(".") ? t : `${t}.`;
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
