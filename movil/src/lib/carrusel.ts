// Cálculos del carrusel de accesos rápidos (sin React, para poder probarlos).

export interface MedidasCarrusel {
  /** Ancho de cada tarjeta. */
  ancho: number;
  /** Paso entre el inicio de una tarjeta y la siguiente (ancho + separación). */
  paso: number;
}

/**
 * Tarjetas de ~40 % de la pantalla: caben dos y se ve el borde de la tercera,
 * así se nota que se puede deslizar.
 */
export function medirCarrusel(anchoPantalla: number, margen: number, separacion: number): MedidasCarrusel {
  const util = anchoPantalla - margen * 2;
  const ancho = Math.round(Math.min(Math.max(util * 0.4, 128), 200));
  return { ancho, paso: ancho + separacion };
}

/**
 * Tarjeta activa según el desplazamiento. Al llegar al final del recorrido se marca la
 * última, aunque no quede alineada al borde (pasa cuando las últimas caben en pantalla).
 */
export function indiceActivo(desplazamiento: number, paso: number, maximo: number, total: number): number {
  if (total <= 0 || paso <= 0) return 0;
  if (maximo > 0 && desplazamiento >= maximo - 1) return total - 1;
  const i = Math.round(desplazamiento / paso);
  return Math.min(Math.max(i, 0), total - 1);
}
