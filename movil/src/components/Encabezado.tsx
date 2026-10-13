// Título de sección como en portfolio_web: "/ Accesos rápidos" con la barra en el color de acento.

import { StyleSheet } from "react-native";

import { Text } from "@/components/Texto";
import { espacio, fuente, useColores } from "@/theme";

export function Encabezado({ children }: { children: string }) {
  const c = useColores();
  return (
    <Text style={[styles.titulo, { color: c.tinta }]} accessibilityRole="header" accessibilityLabel={children}>
      <Text style={{ color: c.enfasis, fontFamily: fuente.titulo }}>/ </Text>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: 22, fontFamily: fuente.titulo, paddingHorizontal: espacio.l },
});
