// "📍 El Prado, Barranquilla" y, si no hay GPS, un enlace para activarlo.

import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { Presionable } from "@/components/Movimiento";
import { Text } from "@/components/Texto";
import { useUbicacion } from "@/contexto/Ubicacion";
import { espacio, useColores } from "@/theme";

export function LineaUbicacion() {
  const c = useColores();
  const { nombre, origen, pedirPermiso } = useUbicacion();
  return (
    <View style={styles.fila}>
      <Ionicons name={origen === "gps" ? "location" : "location-outline"} size={16} color={c.tinta2} />
      <Text style={{ color: c.tinta2 }}>{nombre}</Text>
      {origen === "predeterminada" ? (
        <Presionable onPress={pedirPermiso} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.enlace, { color: c.enfasis }]}>· Usar mi ubicación</Text>
        </Presionable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", gap: espacio.xs, flexWrap: "wrap" },
  enlace: { fontWeight: "600" },
});
