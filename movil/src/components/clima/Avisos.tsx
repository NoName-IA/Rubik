// Avisos sobre el pronóstico: riesgo de arroyos y datos guardados sin conexión.

import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { Presionable } from "@/components/Movimiento";
import { Text } from "@/components/Texto";
import { ahoraLocal, formatoHoraMinutos } from "@/lib/clima/formato";
import { fraseArroyos, type Ventana } from "@/lib/clima/resumen";
import type { Pronostico } from "@/lib/clima/tipos";
import { espacio, radio, useColores } from "@/theme";

export function AlertaArroyos({
  ventanas,
  hoy,
  ahora,
  alTocar,
}: {
  ventanas: Ventana[];
  hoy: string;
  ahora?: string;
  alTocar?: () => void;
}) {
  const c = useColores();
  if (ventanas.length === 0) return null;
  const [v, ...resto] = ventanas;
  const contenido = (
    <>
      <Ionicons name="warning" size={22} color={c.alerta} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.titulo, { color: c.tinta }]}>
          {fraseArroyos(v, hoy, ahora)}
          {resto.length > 0 ? ` (y ${resto.length} ${resto.length === 1 ? "momento más" : "momentos más"})` : ""}
        </Text>
        <Text style={{ color: c.tinta2, fontSize: 13 }}>
          Se esperan aguaceros fuertes o con tormenta. No cruces arroyos ni calles inundadas.
        </Text>
      </View>
      {alTocar ? <Ionicons name="chevron-forward" size={18} color={c.tinta2} /> : null}
    </>
  );
  const estilo = [styles.caja, { backgroundColor: c.alertaSuave, borderColor: c.alerta }];
  return alTocar ? (
    <Presionable onPress={alTocar} accessibilityRole="alert" style={({ pressed }) => [...estilo, { opacity: pressed ? 0.7 : 1 }]}>
      {contenido}
    </Presionable>
  ) : (
    <View accessibilityRole="alert" style={estilo}>
      {contenido}
    </View>
  );
}

export function AvisoSinConexion({ p }: { p: Pronostico }) {
  const c = useColores();
  if (!p.guardado) return null;
  return (
    <View style={[styles.sinConexion, { backgroundColor: c.superficie, borderColor: c.borde }]} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={16} color={c.tinta2} />
      <Text style={{ color: c.tinta2, fontSize: 13 }}>
        Sin conexión · datos de las {formatoHoraMinutos(ahoraLocal(p.desfaseUtc, p.obtenido))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    marginHorizontal: espacio.l,
    padding: espacio.m,
    borderRadius: radio.m,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.m,
  },
  titulo: { fontSize: 15, fontWeight: "700" },
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
