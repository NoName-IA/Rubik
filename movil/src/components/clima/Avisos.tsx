// Aviso de pronóstico guardado: se muestra sin conexión, con la hora de los datos.

import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import { deCuando } from "@/lib/clima/formato";
import type { Pronostico } from "@/lib/clima/tipos";
import { espacio, radio, useColores } from "@/theme";

export function AvisoSinConexion({ p }: { p: Pronostico }) {
  const c = useColores();
  if (!p.guardado) return null;
  return (
    <View style={[styles.sinConexion, { backgroundColor: c.superficie, borderColor: c.borde }]} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={16} color={c.tinta2} />
      <Text style={{ color: c.tinta2, fontSize: 13 }}>
        Sin conexión · datos {deCuando(p.obtenido, p.desfaseUtc)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sinConexion: {
    marginHorizontal: espacio.l,
    paddingVertical: espacio.s,
    paddingHorizontal: espacio.m,
    borderRadius: radio.s,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.s,
  },
});
