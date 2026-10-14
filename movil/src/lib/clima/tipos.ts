// Modelo del pronóstico que usan las pantallas. No depende de ningún proveedor:
// Open-Meteo (u otra API local en el futuro) se traduce a esta forma.

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/** Fecha y hora local del lugar, sin zona: "2026-10-12T17:00". */
export type HoraLocal = string;

export interface Actual {
  hora: HoraLocal;
  temperatura: number;
  sensacion: number;
  humedad: number;
  viento: number;
  uv: number;
  codigo: number;
  esDia: boolean;
}

export interface Hora {
  hora: HoraLocal;
  temperatura: number;
  /** Sensación térmica. Falta en pronósticos guardados por versiones anteriores de la app. */
  sensacion?: number;
  probabilidad: number | null;
  mm: number;
  codigo: number;
  esDia: boolean;
}

export interface Dia {
  fecha: string;
  codigo: number;
  maxima: number;
  minima: number;
  probabilidad: number | null;
  mm: number;
  uvMax: number;
  amanecer: HoraLocal;
  atardecer: HoraLocal;
}

export interface Pronostico {
  actual: Actual;
  horas: Hora[];
  dias: Dia[];
  /** Diferencia con UTC del lugar, en segundos (Colombia: -18000). */
  desfaseUtc: number;
  zona: string;
  /** Momento de la consulta (ms desde 1970). */
  obtenido: number;
  /** `true` si viene del respaldo del celular porque no hubo conexión. */
  guardado?: boolean;
}

export interface ProveedorClima {
  pronostico(coordenadas: Coordenadas): Promise<Pronostico>;
}
