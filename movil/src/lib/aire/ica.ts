// Índice de Calidad del Aire (ICA) de Colombia y comparación con la OMS (sin React, probado).
//
// Puntos de corte: Resolución 2254 de 2017 (MinAmbiente), artículo 20, tabla 6, según la hoja
// metodológica del IDEAM (GCI-OE-F002, v. 03). Se calculan sobre promedios de 24 horas.

export type Contaminante = "pm25" | "pm10";

export const NOMBRE_CONTAMINANTE: Record<Contaminante, string> = { pm25: "PM2.5", pm10: "PM10" };

export const LIMITES: Record<Contaminante, { norma24h: number; oms24h: number }> = {
  pm25: { norma24h: 37, oms24h: 15 },
  pm10: { norma24h: 75, oms24h: 45 },
};

export type ClaveCategoria = "buena" | "aceptable" | "sensibles" | "danina" | "muyDanina" | "peligrosa";

export interface Categoria {
  clave: ClaveCategoria;
  nombre: string;
  /** Rango del índice (0–500). */
  ica: [number, number];
  /** Concentraciones de 24 h en µg/m³ (límite superior incluido). */
  pm25: [number, number];
  pm10: [number, number];
  /** Recomendación para la población (tabla 1 de la hoja del IDEAM, resumida). */
  efecto: string;
}

export const CATEGORIAS: Categoria[] = [
  {
    clave: "buena",
    nombre: "Buena",
    ica: [0, 50],
    pm25: [0, 12],
    pm10: [0, 54],
    efecto: "La contaminación supone un riesgo bajo para la salud.",
  },
  {
    clave: "aceptable",
    nombre: "Aceptable",
    ica: [51, 100],
    pm25: [13, 37],
    pm10: [55, 154],
    efecto: "Posibles síntomas respiratorios en personas sensibles.",
  },
  {
    clave: "sensibles",
    nombre: "Dañina para grupos sensibles",
    ica: [101, 150],
    pm25: [38, 55],
    pm10: [155, 254],
    efecto: "Niños, adultos mayores y personas con enfermedad cardiaca o pulmonar pueden tener efectos en la salud.",
  },
  {
    clave: "danina",
    nombre: "Dañina para la salud",
    ica: [151, 200],
    pm25: [56, 150],
    pm10: [255, 354],
    efecto: "Todos pueden empezar a tener efectos en la salud; los grupos sensibles, más graves.",
  },
  {
    clave: "muyDanina",
    nombre: "Muy dañina para la salud",
    ica: [201, 300],
    pm25: [151, 250],
    pm10: [355, 424],
    efecto: "Alerta: todos pueden tener efectos graves en la salud.",
  },
  {
    clave: "peligrosa",
    nombre: "Peligrosa",
    ica: [301, 500],
    pm25: [251, 500],
    pm10: [425, 604],
    efecto: "Emergencia: toda la población puede verse afectada gravemente.",
  },
];

/**
 * Categoría para una concentración de 24 h. Los puntos de corte son enteros: un valor
 * entre dos (p. ej. 12,4) pertenece a la categoría cuyo límite superior aún no supera.
 */
export function categoria(c: Contaminante, concentracion: number): Categoria {
  return CATEGORIAS.find((cat) => concentracion <= cat[c][1]) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

/**
 * Valor del ICA con la fórmula del índice: ICA = (Ialto − Ibajo) / (PCalto − PCbajo) × (C − PCbajo) + Ibajo.
 * Una concentración entre dos puntos de corte enteros (p. ej. 12,4) queda en el inicio de su tramo.
 */
export function valorIca(c: Contaminante, concentracion: number): number {
  const cat = categoria(c, concentracion);
  const [pcBajo, pcAlto] = cat[c];
  const [iBajo, iAlto] = cat.ica;
  const x = Math.min(Math.max(concentracion, pcBajo), pcAlto);
  return Math.round(((iAlto - iBajo) / (pcAlto - pcBajo)) * (x - pcBajo) + iBajo);
}

export interface Comparacion {
  /** Veces la guía de la OMS (1 = justo en la guía). */
  vecesOms: number;
  sobreOms: boolean;
  sobreNorma: boolean;
}

export function comparar(c: Contaminante, concentracion: number): Comparacion {
  const l = LIMITES[c];
  return {
    vecesOms: concentracion / l.oms24h,
    sobreOms: concentracion > l.oms24h,
    sobreNorma: concentracion > l.norma24h,
  };
}

/** "Por debajo de la guía de la OMS (15 µg/m³)" / "2,1 veces la guía de la OMS…" */
export function textoOms(c: Contaminante, concentracion: number): string {
  const { vecesOms, sobreOms, sobreNorma } = comparar(c, concentracion);
  const guia = `${LIMITES[c].oms24h} µg/m³`;
  if (!sobreOms) return `Por debajo de la guía de la OMS (${guia})`;
  const veces = vecesOms.toFixed(1).replace(".", ",");
  return sobreNorma
    ? `${veces} veces la guía de la OMS y por encima de la norma colombiana (${LIMITES[c].norma24h} µg/m³)`
    : `${veces} veces la guía de la OMS (${guia}), dentro de la norma colombiana`;
}
