// Colores, tipografía y medidas de la app. Estilo tomado de portfolio_web (VSCODEX):
// fondo índigo liso con lluvia de código, acento violeta, Space Grotesk en títulos e Inter en texto.
// Cada modo (claro/oscuro) tiene sus propios valores; los contrastes de texto son ≥ 4,5:1.

import { useColorScheme } from "react-native";

import { usePreferenciasOpcional } from "@/contexto/Preferencias";

const oscuro = {
  // portfolio_web "default-dark": background #0F0D29, accent #A78BFA, subtext #b2bed1.
  fondo: "#0F0D29",
  /** Tarjetas: el acento al 7 % sobre el fondo (bg-accent/5 del portfolio, en color sólido). */
  superficie: "#1A1638",
  borde: "#302957",
  tinta: "#FFFFFF",
  tinta2: "#B2BED1",
  apagado: "#8E8CB0",
  enfasis: "#A78BFA",
  enfasisSuave: "#2A244F",
  /** Texto sobre un fondo de color `enfasis` (botones). */
  sobreEnfasis: "#0F0D29",
  /** Caracteres de la "lluvia de código" del fondo (textrain del portfolio). */
  codigo: "#7D7B9C",
  /** Navbar inferior: fondo casi opaco y borde superior tenue. */
  barra: "rgba(15, 13, 41, 0.92)",
  bordeBarra: "rgba(255, 255, 255, 0.15)",
  inactivo: "rgba(167, 139, 250, 0.6)",
  alerta: "#F5A55C",
  alertaSuave: "#342531",
  /** Rojo del modo IA del Rubo (barra, falla de pantalla) y su fondo de cancha. */
  peligro: "#FF5C6C",
  peligroSuave: "#36182A",
  // Rampa secuencial de intensidad de lluvia (validada contra la superficie). En oscuro se invierte:
  // más claro = más fuerte.
  lluvia: { sin: "#33608C", ligera: "#4A8BCB", moderada: "#78B8F4", fuerte: "#BADDFF" },
};

const claro: typeof oscuro = {
  // portfolio_web "default-light": background #F5F3FF, accent #7C3AED, maintext #1E1B4B.
  fondo: "#F5F3FF",
  superficie: "#FBF9FE",
  borde: "#DFD2FC",
  tinta: "#1E1B4B",
  tinta2: "#4B5563",
  apagado: "#6E6A99",
  enfasis: "#7C3AED",
  enfasisSuave: "#E6DDFD",
  sobreEnfasis: "#FFFFFF",
  codigo: "#97A7DC",
  barra: "rgba(245, 243, 255, 0.94)",
  bordeBarra: "rgba(30, 27, 75, 0.15)",
  inactivo: "rgba(124, 58, 237, 0.6)",
  alerta: "#B54708",
  alertaSuave: "#F8EDE6",
  peligro: "#C62839",
  peligroSuave: "#FBE9EC",
  lluvia: { sin: "#86B6E6", ligera: "#4F93DA", moderada: "#2163B0", fuerte: "#0D3B70" },
};

export type Colores = typeof oscuro;

/** Familias cargadas en _layout.tsx (Space Grotesk para títulos, Inter para texto). */
export const fuente = {
  titulo: "SpaceGrotesk_700Bold",
  tituloMedio: "SpaceGrotesk_500Medium",
  texto: "Inter_400Regular",
  textoMedio: "Inter_500Medium",
  textoSemi: "Inter_600SemiBold",
  textoNegrita: "Inter_700Bold",
  /** Caracteres de la lluvia de código (font-extralight del portfolio). */
  codigo: "SpaceGrotesk_300Light",
} as const;

/**
 * Colores oficiales del Índice de Calidad del Aire (Res. 2254 de 2017): iguales en ambos modos
 * porque la gente los reconoce. Se usan solo como punto de color junto al nombre de la categoría.
 */
export const COLORES_ICA = {
  buena: "#00E400",
  aceptable: "#FFFF00",
  sensibles: "#FF7E00",
  danina: "#FF0000",
  muyDanina: "#8F3F97",
  peligrosa: "#7E0023",
} as const;

/** Modo oscuro según la preferencia del usuario ("sistema" sigue al celular). */
export function useOscuro(): boolean {
  const sistema = useColorScheme();
  const tema = usePreferenciasOpcional()?.tema ?? "sistema";
  return tema === "sistema" ? sistema === "dark" : tema === "oscuro";
}

export function useColores(): Colores {
  return useOscuro() ? oscuro : claro;
}

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;
/** Esquinas: 16 como las tarjetas del portfolio (rounded-2xl). */
export const radio = { s: 8, m: 16, l: 24 } as const;
