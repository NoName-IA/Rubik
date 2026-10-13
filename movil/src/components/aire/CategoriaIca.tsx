// Punto de color oficial + nombre de la categoría (el color nunca va solo).

import { StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import type { Categoria } from "@/lib/aire/ica";
import { COLORES_ICA, espacio, useColores } from "@/theme";

export function CategoriaIca({ cat, grande = false, prefijo }: { cat: Categoria; grande?: boolean; prefijo?: string }) {
  const c = useColores();
  const d = grande ? 14 : 10;
  return (
    <View style={styles.fila}>
      <View
        style={{
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: COLORES_ICA[cat.clave],
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.tinta2,
        }}
      />
      <Text style={{ color: c.tinta, fontSize: grande ? 20 : 15 }}>
        {prefijo ? `${prefijo} ` : ""}
        <Text style={{ fontWeight: "700" }}>{cat.nombre}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ fila: { flexDirection: "row", alignItems: "center", gap: espacio.s } });
