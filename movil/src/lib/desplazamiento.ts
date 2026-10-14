// Cuentas del botón "volver arriba" (sin React, para poder probarlas).

/** Aparece pasada la mitad de lo que se puede bajar; la flecha rebota desde el 98 % (como portfolio_web). */
export const UMBRAL_VISIBLE = 0.5;
export const UMBRAL_FINAL = 0.98;

/** Cuánto se ha bajado, de 0 (arriba) a 1 (al final). */
export function progresoDesplazamiento(y: number, altoContenido: number, altoVisible: number): number {
  const recorrido = altoContenido - altoVisible;
  if (recorrido <= 0) return 0;
  return Math.min(1, Math.max(0, y / recorrido));
}
