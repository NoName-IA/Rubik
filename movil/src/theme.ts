// Colores, tipografía y medidas de la app. Estilo tomado de portfolio_web (VSCODEX): fondo liso con
// lluvia de código, un color de acento, Space Grotesk en títulos e Inter en texto. Los colores salen del
// tema elegido en Usuario (lib/temas.ts), cada uno en modo claro y oscuro, con contrastes ≥ 4,5:1.

import { useColorScheme } from "react-native";

import { usePreferenciasOpcional } from "@/contexto/Preferencias";
import { type Colores, TEMAS } from "@/lib/temas";

// Las paletas de cada tema (Violeta, Océano, Bosque, Atardecer, Rosa) están en lib/temas.ts.
export type { Colores } from "@/lib/temas";

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
  /** Letra pixelada (8 bits) del cuadro de diálogo de Rubo. */
  pixel: "PressStart2P_400Regular",
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

/** Los colores del tema elegido (Violeta si no hay preferencias), en el modo claro u oscuro. */
export function useColores(): Colores {
  const tema = TEMAS[usePreferenciasOpcional()?.paleta ?? "violeta"];
  return useOscuro() ? tema.oscuro : tema.claro;
}

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;
/** Esquinas: 16 como las tarjetas del portfolio (rounded-2xl). */
export const radio = { s: 8, m: 16, l: 24 } as const;
