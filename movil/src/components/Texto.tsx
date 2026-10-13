// Text con la tipografía de la app (Inter). Se usa en lugar del Text de React Native.
//
// En Android una fuente propia no se "engrosa" con fontWeight: hay que usar el archivo de cada
// peso. Aquí se elige la variante de Inter según el fontWeight del estilo. Si el estilo ya trae
// un fontFamily (p. ej. Space Grotesk en títulos), se respeta.

import { StyleSheet, Text as TextoNativo, type TextProps } from "react-native";

import { fuente } from "@/theme";

function familia(peso: string | number | undefined): string {
  const p = peso === "bold" ? 700 : Number(peso ?? 400);
  if (p >= 700) return fuente.textoNegrita;
  if (p >= 600) return fuente.textoSemi;
  if (p >= 500) return fuente.textoMedio;
  return fuente.texto;
}

export function Text({ style, ...props }: TextProps) {
  const plano = StyleSheet.flatten(style) ?? {};
  if (plano.fontFamily) return <TextoNativo {...props} style={style} />;
  return <TextoNativo {...props} style={[style, { fontFamily: familia(plano.fontWeight), fontWeight: "normal" }]} />;
}
