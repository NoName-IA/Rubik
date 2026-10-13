// Barra de segmentos (p. ej. Hoy · Lluvia · 7 días).

import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import { espacio, radio, useColores } from "@/theme";

export function Segmentos<T extends string>({
  opciones,
  valor,
  alCambiar,
  dentroDePanel = false,
}: {
  opciones: readonly { clave: T; titulo: string }[];
  valor: T;
  alCambiar: (v: T) => void;
  /** Sin margen lateral (cuando ya está dentro de un Panel). */
  dentroDePanel?: boolean;
}) {
  const c = useColores();
  return (
    <View
      style={[styles.segmentos, dentroDePanel && { marginHorizontal: 0 }, { backgroundColor: c.superficie, borderColor: c.borde }]}
      role="tablist"
    >
      {opciones.map((o) => {
        const elegida = o.clave === valor;
        return (
          <Pressable
            key={o.clave}
            onPress={() => alCambiar(o.clave)}
            role="tab"
            aria-selected={elegida}
            style={[styles.segmento, elegida && { backgroundColor: c.enfasisSuave, borderColor: c.enfasis }]}
          >
            <Text style={[styles.texto, { color: elegida ? c.tinta : c.tinta2 }]} numberOfLines={1}>
              {o.titulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segmentos: { flexDirection: "row", marginHorizontal: espacio.l, padding: 4, borderRadius: radio.s + 4, borderWidth: 1 },
  segmento: {
    flex: 1,
    alignItems: "center",
    paddingVertical: espacio.s,
    paddingHorizontal: espacio.xs,
    borderRadius: radio.s,
    borderWidth: 1,
    borderColor: "transparent",
  },
  texto: { fontSize: 14, fontWeight: "600" },
});
