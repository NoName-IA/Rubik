// Lo que dice Rubo en el modo IA y cómo lo escribe, letra por letra (sin React, probado con node:test).
// scripts/generar-voces.ts usa esto mismo para generar su "voz", así el sonido y el texto van juntos.

import { GOLES_FASE_2, GOLES_FASE_3, GOLES_FASE_4 } from "./pong.ts";

/**
 * Las frases, en orden; `voz` es el número de su archivo (assets/sonidos/voz-N.wav). Con tu 2.º gol se
 * pica, con el 4.º se enoja, y con el 6.º (le queda un corazón) dice dos frases seguidas y se vuelve
 * invencible.
 */
export const FRASES_RUBO: Record<number, { texto: string; voz: number }[]> = {
  [GOLES_FASE_2]: [{ texto: "¿Crees que puedes ganarme? -ja", voz: 1 }],
  [GOLES_FASE_3]: [{ texto: "¡¡Sal de aquí!!", voz: 2 }],
  [GOLES_FASE_4]: [
    { texto: "¿Así que así será?..", voz: 3 },
    { texto: "Bueno...", voz: 4 },
  ],
};
export const TODAS_LAS_FRASES = Object.values(FRASES_RUBO).flat();

/** Cada letra tarda esto en aparecer, con un bip. */
export const MS_POR_LETRA = 50;
/** Los puntos suspensivos se escriben despacio y en silencio: entre todos, al menos esto (ms). */
export const SILENCIO_PUNTOS = 1000;
/** Entre dos frases seguidas, la primera se queda esto antes de que empiece la siguiente (ms). */
export const PAUSA_ENTRE_FRASES = 2000;

export interface Letra {
  letra: string;
  /** Cuánto tarda en aparecer la siguiente (ms). */
  ms: number;
  /** Si suena un bip al aparecer (los espacios y los puntos suspensivos no suenan). */
  suena: boolean;
}

export function letras(texto: string): Letra[] {
  const todas = Array.from(texto);
  return todas.map((letra, i) => {
    if (letra === ".") {
      // Largo de la tanda de puntos en la que está este.
      let desde = i;
      while (desde > 0 && todas[desde - 1] === ".") desde--;
      let hasta = i;
      while (hasta < todas.length - 1 && todas[hasta + 1] === ".") hasta++;
      const tanda = hasta - desde + 1;
      if (tanda >= 2) return { letra, ms: Math.max(MS_POR_LETRA, Math.ceil(SILENCIO_PUNTOS / tanda)), suena: false };
    }
    return { letra, ms: MS_POR_LETRA, suena: letra !== " " };
  });
}

/** Cuánto tarda Rubo en escribir una frase (ms). */
export const tiempoEscribiendo = (texto: string) => letras(texto).reduce((t, l) => t + l.ms, 0);

/** Cuánto dura todo lo que dice de una vez: las frases y las pausas entre ellas (ms). */
export const tiempoHablando = (frases: { texto: string }[]) =>
  frases.reduce((t, f) => t + tiempoEscribiendo(f.texto), 0) + PAUSA_ENTRE_FRASES * Math.max(0, frases.length - 1);
