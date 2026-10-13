// Lista para elegir la ciudad (bienvenida y Usuario).

import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import { CIUDADES } from "@/lib/ciudades";
import { espacio, useColores } from "@/theme";

export function ListaCiudades({ elegida, alElegir }: { elegida: string | null; alElegir: (id: string) => void }) {
  const c = useColores();
  return (
    <View accessibilityRole="radiogroup">
      {CIUDADES.map((ciudad, i) => {
        const activa = ciudad.id === elegida;
        return (
          <Pressable
            key={ciudad.id}
            onPress={() => alElegir(ciudad.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: activa }}
            accessibilityLabel={`${ciudad.nombre}, ${ciudad.departamento}`}
            style={({ pressed }) => [
              styles.fila,
              i > 0 && { borderTopColor: c.borde, borderTopWidth: StyleSheet.hairlineWidth },
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.tinta, fontSize: 15, fontWeight: activa ? "700" : "400" }}>{ciudad.nombre}</Text>
              <Text style={{ color: c.tinta2, fontSize: 12 }}>{ciudad.departamento}</Text>
            </View>
            {activa ? <Ionicons name="checkmark-circle" size={22} color={c.enfasis} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", minHeight: 52, paddingVertical: espacio.xs, gap: espacio.m },
});
