// Estados de carga y error comunes.

import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { Text } from "@/components/Texto";
import { espacio, radio, useColores } from "@/theme";

/** Bloque gris que late mientras carga. */
export function Esqueleto({ alto, ancho = "100%", estilo }: { alto: number; ancho?: ViewStyle["width"]; estilo?: ViewStyle }) {
  const c = useColores();
  const [opacidad] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(opacidad, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacidad]);
  return (
    <Animated.View
      style={[{ height: alto, width: ancho, borderRadius: radio.s, backgroundColor: c.borde, opacity: opacidad }, estilo]}
    />
  );
}

export function MensajeError({
  titulo = "No se pudo cargar el pronóstico",
  mensaje,
  alReintentar,
}: {
  titulo?: string;
  mensaje: string;
  alReintentar: () => void;
}) {
  const c = useColores();
  return (
    <View style={[styles.caja, { borderColor: c.borde, backgroundColor: c.superficie }]} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={32} color={c.alerta} />
      <Text style={[styles.texto, { color: c.tinta }]}>{titulo}</Text>
      <Text style={[styles.detalle, { color: c.tinta2 }]}>{mensaje}</Text>
      <Pressable
        onPress={alReintentar}
        accessibilityRole="button"
        style={({ pressed }) => [styles.boton, { backgroundColor: c.enfasis, opacity: pressed ? 0.8 : 1 }]}
      >
        <Text style={[styles.textoBoton, { color: c.sobreEnfasis }]}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    marginHorizontal: espacio.l,
    padding: espacio.xl,
    borderRadius: radio.m,
    borderWidth: 1,
    alignItems: "center",
    gap: espacio.s,
  },
  texto: { fontSize: 16, fontWeight: "600" },
  detalle: { fontSize: 14, textAlign: "center" },
  boton: { marginTop: espacio.s, paddingHorizontal: espacio.xl, minHeight: 44, borderRadius: radio.s, justifyContent: "center" },
  textoBoton: { fontWeight: "700" },
});
