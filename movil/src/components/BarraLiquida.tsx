// Navbar inferior. Estilo de la barra móvil de portfolio_web (esquinas superiores redondeadas, fondo
// casi opaco, activa en el color del texto, demás en violeta).

import type { BottomTabBarProps } from "expo-router/tabs";
import { StyleSheet, View } from "react-native";

import { Presionable } from "@/components/Movimiento";
import { Text } from "@/components/Texto";
import { fuente, useColores } from "@/theme";

export function BarraLiquida({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const c = useColores();

  return (
    <View
      style={[
        styles.barra,
        { backgroundColor: c.barra, borderTopColor: c.bordeBarra, paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.fila} role="tablist">
        {state.routes.map((ruta, i) => {
          const { options } = descriptors[ruta.key];
          const enfocada = state.index === i;
          const color = enfocada ? c.tinta : c.inactivo;
          const titulo = typeof options.title === "string" ? options.title : ruta.name;
          const alTocar = () => {
            const evento = navigation.emit({ type: "tabPress", target: ruta.key, canPreventDefault: true });
            if (!enfocada && !evento.defaultPrevented) navigation.navigate(ruta.name, ruta.params);
          };
          return (
            <Presionable
              key={ruta.key}
              onPress={alTocar}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: ruta.key })}
              role="tab"
              aria-selected={enfocada}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? titulo}
              style={styles.boton}
            >
              {options.tabBarIcon?.({ focused: enfocada, color, size: 24 })}
              <Text style={[styles.etiqueta, { color }]}>{titulo}</Text>
            </Presionable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  fila: { flexDirection: "row", alignItems: "center" },
  boton: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, minHeight: 52, paddingVertical: 4 },
  etiqueta: { fontSize: 11, fontFamily: fuente.textoSemi },
});
