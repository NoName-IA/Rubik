// Tarjeta del estilo portfolio_web: fondo con un toque del acento, borde violeta tenue y esquinas
// de 16. El título es una etiqueta corta en mayúsculas del color de acento.

import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import { espacio, radio, useColores } from "@/theme";

interface Props {
  titulo?: string;
  children: ReactNode;
}

export function Panel({ titulo, children }: Props) {
  const c = useColores();
  return (
    <View style={[styles.panel, { backgroundColor: c.superficie, borderColor: c.borde }]}>
      {titulo ? <Text style={[styles.titulo, { color: c.enfasis }]}>{titulo}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: espacio.l,
    padding: espacio.l,
    borderRadius: radio.m,
    borderWidth: 1,
    gap: espacio.s,
  },
  titulo: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.5 },
});
