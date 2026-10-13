// Tarjeta de calidad del aire dentro de Clima › Hoy; abre el detalle.

import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import { CategoriaIca } from "@/components/aire/CategoriaIca";
import { Esqueleto } from "@/components/Estados";
import { useAire } from "@/hooks/useAire";
import { categoria, textoOms, valorIca } from "@/lib/aire/ica";
import { promedio24h } from "@/lib/aire/openMeteoAire";
import { espacio, radio, useColores } from "@/theme";

export function TarjetaAire() {
  const c = useColores();
  const router = useRouter();
  const { data, error } = useAire();
  const pm25 = data ? promedio24h(data, "pm25") : null;

  return (
    <Pressable
      onPress={() => router.push("/aire")}
      accessibilityRole="button"
      accessibilityHint="Abre el detalle de la calidad del aire"
      style={({ pressed }) => [styles.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.encabezado}>
        <Text style={[styles.titulo, { color: c.enfasis }]}>Calidad del aire</Text>
        <Ionicons name="chevron-forward" size={18} color={c.apagado} />
      </View>
      {pm25 !== null ? (
        <>
          <CategoriaIca cat={categoria("pm25", pm25)} />
          <Text style={{ color: c.tinta, fontSize: 14 }}>
            PM2.5: {pm25} µg/m³ en 24 h · ICA {valorIca("pm25", pm25)}
          </Text>
          <Text style={{ color: c.tinta2, fontSize: 13 }}>{textoOms("pm25", pm25)}</Text>
        </>
      ) : error || data ? (
        <Text style={{ color: c.tinta2 }}>No disponible por ahora</Text>
      ) : (
        <Esqueleto alto={40} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: { marginHorizontal: espacio.l, padding: espacio.l, borderRadius: radio.m, borderWidth: 1, gap: espacio.s },
  encabezado: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titulo: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.5 },
});
