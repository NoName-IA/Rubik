// Navbar inferior con efecto líquido: una "gota" detrás de la pestaña activa se desliza a la nueva
// opción estirándose y vuelve a su forma con un rebote. Estilo de la barra móvil de portfolio_web
// (esquinas superiores redondeadas, fondo casi opaco, activa en el color del texto, demás en violeta).
// Con "reducir movimiento" activado, la gota se mueve sin estirarse.

import type { BottomTabBarProps } from "expo-router/tabs";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, type LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import { fuente, useColores } from "@/theme";

const NATIVO = Platform.OS !== "web";
const MARGEN_GOTA = 10;

export function BarraLiquida({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const c = useColores();
  const [ancho, setAncho] = useState(0);
  const [posicion] = useState(() => new Animated.Value(state.index));
  const [estiramiento] = useState(() => new Animated.Value(1));
  const [quieto, setQuieto] = useState(false);
  const n = state.routes.length;
  const anchoTab = ancho / n;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setQuieto)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setQuieto);
    return () => sub.remove();
  }, []);

  // Al cambiar de pestaña: la gota viaja con un resorte y, mientras viaja, se estira a lo ancho y se
  // achata; luego rebota a su forma (efecto líquido).
  useEffect(() => {
    const mover = Animated.spring(posicion, {
      toValue: state.index,
      useNativeDriver: NATIVO,
      damping: 15,
      stiffness: 170,
      mass: 0.9,
    });
    if (quieto) {
      mover.start();
      return;
    }
    Animated.parallel([
      mover,
      Animated.sequence([
        Animated.timing(estiramiento, { toValue: 1.55, duration: 150, useNativeDriver: NATIVO }),
        Animated.spring(estiramiento, { toValue: 1, useNativeDriver: NATIVO, friction: 3.5, tension: 120 }),
      ]),
    ]).start();
  }, [state.index, quieto, posicion, estiramiento]);

  return (
    <View
      style={[
        styles.barra,
        { backgroundColor: c.barra, borderTopColor: c.bordeBarra, paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.fila} role="tablist" onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}>
        {ancho > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.gota,
              {
                width: anchoTab - MARGEN_GOTA * 2,
                left: MARGEN_GOTA,
                backgroundColor: c.enfasisSuave,
                borderColor: c.enfasis,
                transform: [
                  { translateX: posicion.interpolate({ inputRange: [0, Math.max(n - 1, 1)], outputRange: [0, anchoTab * Math.max(n - 1, 1)] }) },
                  { scaleX: estiramiento },
                  { scaleY: estiramiento.interpolate({ inputRange: [1, 1.55], outputRange: [1, 0.8] }) },
                ],
              },
            ]}
          />
        ) : null}
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
            <Pressable
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
            </Pressable>
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
  gota: { position: "absolute", top: 0, bottom: 0, borderRadius: 22, borderWidth: 1 },
  boton: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, minHeight: 52, paddingVertical: 4 },
  etiqueta: { fontSize: 11, fontFamily: fuente.textoSemi },
});
