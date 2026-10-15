// Barra de segmentos (p. ej. Hoy · Lluvia · 7 días). La opción elegida se marca con una pastilla que
// se desliza "líquida" hasta la nueva: viaja con un resorte casi sin rebote y se estira un poco
// mientras se mueve. Una opción puede ir bloqueada (no se puede elegir) y llevar un adorno encima,
// p. ej. las cadenas del modo IA del Rubo.

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Easing, type LayoutChangeEvent, Platform, StyleSheet, View } from "react-native";

import { movimientoReducido, Presionable } from "@/components/Movimiento";
import { Text } from "@/components/Texto";
import { espacio, radio, useColores } from "@/theme";

const NATIVO = Platform.OS !== "web";
/** Resorte del viaje, casi crítico (damping ≈ 2·√stiffness): llega rápido y casi no se pasa. */
const RESORTE = { damping: 26, stiffness: 200, mass: 1 };
/** Cuánto se estira a lo ancho a mitad del viaje (0,25 = 25 %). */
const ESTIRAMIENTO = 0.25;

export function Segmentos<T extends string>({
  opciones,
  valor,
  alCambiar,
  dentroDePanel = false,
  bloqueadas = [],
  adornos = {},
  alTocarBloqueada,
}: {
  opciones: readonly { clave: T; titulo: string }[];
  valor: T;
  alCambiar: (v: T) => void;
  /** Sin margen lateral (cuando ya está dentro de un Panel). */
  dentroDePanel?: boolean;
  /** Opciones que se ven apagadas y no se pueden elegir. */
  bloqueadas?: readonly T[];
  /** Algo que se dibuja encima de una opción (no recibe toques). */
  adornos?: Partial<Record<T, ReactNode>>;
  /** Si se da, tocar una opción bloqueada avisa aquí (sin elegirla); si no, no se puede tocar. */
  alTocarBloqueada?: (v: T) => void;
}) {
  const c = useColores();
  const indice = Math.max(0, opciones.findIndex((o) => o.clave === valor));
  const [ancho, setAncho] = useState(0);
  const [posicion] = useState(() => new Animated.Value(indice));
  const [estiramiento] = useState(() => new Animated.Value(0));
  const anterior = useRef(indice);

  useEffect(() => {
    if (anterior.current === indice) return;
    anterior.current = indice;
    if (movimientoReducido()) {
      posicion.setValue(indice);
      return;
    }
    const animacion = Animated.parallel([
      Animated.spring(posicion, { toValue: indice, ...RESORTE, useNativeDriver: NATIVO }),
      Animated.sequence([
        Animated.timing(estiramiento, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: NATIVO }),
        Animated.timing(estiramiento, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: NATIVO }),
      ]),
    ]);
    animacion.start();
    return () => animacion.stop();
  }, [indice, posicion, estiramiento]);

  const anchoSegmento = ancho / opciones.length;

  return (
    <View
      // Dentro de un Panel no lleva fondo propio: toma el del panel (que puede ser translúcido).
      style={[
        styles.segmentos,
        { backgroundColor: dentroDePanel ? "transparent" : c.superficie, borderColor: c.borde },
        dentroDePanel && { marginHorizontal: 0 },
      ]}
      role="tablist"
    >
      <View style={styles.fila} onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}>
        {ancho > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pastilla,
              {
                width: anchoSegmento,
                backgroundColor: c.enfasisSuave,
                borderColor: c.enfasis,
                transform: [
                  { translateX: Animated.multiply(posicion, anchoSegmento) },
                  { scaleX: estiramiento.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + ESTIRAMIENTO] }) },
                  { scaleY: estiramiento.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) },
                ],
              },
            ]}
          />
        ) : null}
        {opciones.map((o, i) => {
          const elegida = i === indice;
          const bloqueada = bloqueadas.includes(o.clave);
          return (
            <Presionable
              key={o.clave}
              onPress={() => (bloqueada ? alTocarBloqueada?.(o.clave) : alCambiar(o.clave))}
              disabled={bloqueada && !alTocarBloqueada}
              role="tab"
              aria-selected={elegida}
              aria-disabled={bloqueada}
              accessibilityLabel={bloqueada ? `${o.titulo}, bloqueado` : undefined}
              // Hasta medir el ancho no hay pastilla: se marca la opción como antes.
              style={[styles.segmento, elegida && ancho === 0 && { backgroundColor: c.enfasisSuave, borderColor: c.enfasis }]}
            >
              <Text style={[styles.texto, { color: bloqueada ? c.apagado : elegida ? c.tinta : c.tinta2 }]} numberOfLines={1}>
                {o.titulo}
              </Text>
              {adornos[o.clave] ? (
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  {adornos[o.clave]}
                </View>
              ) : null}
            </Presionable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segmentos: { marginHorizontal: espacio.l, padding: 4, borderRadius: radio.s + 4, borderWidth: 1 },
  fila: { flexDirection: "row" },
  pastilla: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: radio.s, borderWidth: 1 },
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
