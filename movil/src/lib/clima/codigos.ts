// Códigos de tiempo WMO (los usa Open-Meteo) → texto en español e ícono de Ionicons.
// https://open-meteo.com/en/docs (sección "WMO Weather interpretation codes")

export type IconoClima =
  | "sunny-outline"
  | "moon-outline"
  | "partly-sunny-outline"
  | "cloudy-night-outline"
  | "cloudy-outline"
  | "rainy-outline"
  | "thunderstorm-outline"
  | "snow-outline";

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

export function iconoClima(codigo: number, esDia = true): IconoClima {
  if (codigo === 0) return esDia ? "sunny-outline" : "moon-outline";
  if (codigo === 1 || codigo === 2) return esDia ? "partly-sunny-outline" : "cloudy-night-outline";
  if (codigo === 3 || codigo === 45 || codigo === 48) return "cloudy-outline";
  if (codigo >= 95) return "thunderstorm-outline";
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return "snow-outline";
  if (codigo >= 51 && codigo <= 82) return "rainy-outline";
  return "cloudy-outline";
}
