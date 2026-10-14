// Códigos de tiempo WMO (los usa Open-Meteo) → texto en español y tipo de ícono (lo dibuja IconoTiempo).
// https://open-meteo.com/en/docs (sección "WMO Weather interpretation codes")

export type TipoIcono =
  | "sol"
  | "luna"
  | "casiDespejadoDia"
  | "casiDespejadoNoche"
  | "solNube"
  | "lunaNube"
  | "nube"
  | "niebla"
  | "llovizna"
  | "lluvia"
  | "lluviaFuerte"
  | "chubascoDia"
  | "chubascoNoche"
  | "nieve"
  | "nevadaFuerte"
  /** Tormenta leve o moderada (código 95): tormentas aisladas con sol o luna. */
  | "tormentaDia"
  | "tormentaNoche"
  | "tormentaFuerte";

const TEXTOS: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna",
  55: "Llovizna intensa",
  56: "Llovizna helada",
  57: "Llovizna helada intensa",
  61: "Lluvia ligera",
  63: "Lluvia",
  65: "Lluvia fuerte",
  66: "Lluvia helada",
  67: "Lluvia helada fuerte",
  71: "Nevada ligera",
  73: "Nevada",
  75: "Nevada fuerte",
  77: "Granizo fino",
  80: "Chubascos ligeros",
  81: "Chubascos",
  82: "Chubascos fuertes",
  85: "Chubascos de nieve",
  86: "Chubascos de nieve fuertes",
  95: "Tormenta eléctrica",
  // Open-Meteo solo pronostica granizo en Europa Central; en otras zonas estos códigos
  // indican una tormenta fuerte, no granizo confiable.
  96: "Tormenta eléctrica fuerte",
  99: "Tormenta eléctrica fuerte",
};

export function textoClima(codigo: number): string {
  return TEXTOS[codigo] ?? "Sin dato";
}

export function tipoIcono(codigo: number, esDia = true): TipoIcono {
  if (codigo === 0) return esDia ? "sol" : "luna";
  if (codigo === 1) return esDia ? "casiDespejadoDia" : "casiDespejadoNoche";
  if (codigo === 2) return esDia ? "solNube" : "lunaNube";
  if (codigo === 45 || codigo === 48) return "niebla";
  if (codigo === 95) return esDia ? "tormentaDia" : "tormentaNoche";
  if (codigo === 96 || codigo === 99) return "tormentaFuerte";
  if (codigo === 75 || codigo === 86) return "nevadaFuerte";
  if ((codigo >= 71 && codigo <= 77) || codigo === 85) return "nieve";
  if (codigo >= 51 && codigo <= 57) return "llovizna";
  if (codigo === 65 || codigo === 67 || codigo === 82) return "lluviaFuerte";
  if (codigo >= 61 && codigo <= 66) return "lluvia";
  if (codigo === 80 || codigo === 81) return esDia ? "chubascoDia" : "chubascoNoche";
  return "nube";
}
