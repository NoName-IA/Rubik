// Botón flotante para volver arriba, igual al "to-top" de portfolio_web: un círculo con un anillo que
// aparece subiendo pasada la mitad y se llena desde ahí hasta el final de la lista, la flecha rebota
// dos veces (cada 5,6 s) al llegar al final y al tocarlo sale disparada hacia arriba.

import { useEffect, useState } from "react";
import { Animated, Easing, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { movimientoReducido, Presionable } from "@/components/Movimiento";
import { UMBRAL_FINAL, UMBRAL_VISIBLE } from "@/lib/desplazamiento";
import { espacio, useColores } from "@/theme";

const NATIVO = Platform.OS !== "web";
const TAMANO = 56;
const RADIO = 24;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

const CirculoAnimado = Animated.createAnimatedComponent(Circle);

interface Props {
  /** De 0 (arriba) a 1 (al final). Lo actualiza la pantalla al desplazarse. */
  progreso: Animated.Value;
  alTocar: () => void;
}

export function BotonArriba({ progreso, alTocar }: Props) {
  const c = useColores();
  const insets = useSafeAreaInsets();
  const [aparicion] = useState(() => new Animated.Value(0));
  const [rebote] = useState(() => new Animated.Value(0));
  const [lanzamiento] = useState(() => new Animated.Value(0));
  // Solo cambian al cruzar los umbrales, así no se vuelve a dibujar en cada cuadro del desplazamiento.
  const [visible, setVisible] = useState(false);
  const [alFinal, setAlFinal] = useState(false);

  useEffect(() => {
    const id = progreso.addListener(({ value }) => {
      setVisible(value > UMBRAL_VISIBLE);
      setAlFinal(value > UMBRAL_FINAL);
    });
    return () => progreso.removeListener(id);
  }, [progreso]);

  // Entra subiendo 80 px y desvaneciéndose (translate-y-20 → 0, 500 ms).
  useEffect(() => {
    if (visible) lanzamiento.setValue(0);
    const animacion = Animated.timing(aparicion, {
      toValue: visible ? 1 : 0,
      duration: movimientoReducido() ? 0 : 500,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: NATIVO,
    });
    animacion.start();
    return () => animacion.stop();
  }, [visible, aparicion, lanzamiento]);

  // Doble rebote con pausa (double-bounce-pause de 5,6 s: dos saltos de 8 px y luego quieta).
  useEffect(() => {
    rebote.setValue(0);
    if (!alFinal || movimientoReducido()) return;
    const salto = (a: number) => Animated.timing(rebote, { toValue: a, duration: 148, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVO });
    const animacion = Animated.loop(Animated.sequence([salto(-8), salto(0), salto(-8), salto(0), Animated.delay(5000)]));
    animacion.start();
    return () => animacion.stop();
  }, [alFinal, rebote]);

  const tocar = () => {
    if (!movimientoReducido()) {
      // La flecha "despega": sube 50 px, se achica a la mitad y se desvanece (launch, 0,5 s). Vuelve a
      // los 750 ms (lo que dura la subida en el portfolio) por si se interrumpe antes de esconderse.
      lanzamiento.setValue(0);
      Animated.sequence([
        Animated.timing(lanzamiento, { toValue: 1, duration: 500, easing: Easing.in(Easing.ease), useNativeDriver: NATIVO }),
        Animated.delay(250),
        Animated.timing(lanzamiento, { toValue: 0, duration: 0, useNativeDriver: NATIVO }),
      ]).start();
    }
    alTocar();
  };

  return (
    <Animated.View
      pointerEvents={visible ? "box-none" : "none"}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      style={[
        styles.contenedor,
        {
          bottom: insets.bottom + espacio.xl,
          opacity: aparicion,
          transform: [{ translateY: aparicion.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
        },
      ]}
    >
      <Presionable
        onPress={tocar}
        accessibilityRole="button"
        accessibilityLabel="Volver arriba"
        hitSlop={8}
        style={[styles.boton, { backgroundColor: c.fondo, borderColor: c.borde }]}
      >
        {/* Girado -90° para que el anillo empiece arriba (el -rotate-90 del portfolio). */}
        <Svg width={TAMANO} height={TAMANO} style={[StyleSheet.absoluteFill, styles.anillo]}>
          <Circle cx={TAMANO / 2} cy={TAMANO / 2} r={RADIO} fill="none" stroke={c.enfasisSuave} strokeWidth={3} />
          <CirculoAnimado
            cx={TAMANO / 2}
            cy={TAMANO / 2}
            r={RADIO}
            fill="none"
            stroke={c.enfasis}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={CIRCUNFERENCIA}
            // Empieza vacío cuando el botón aparece (a la mitad) y se llena al llegar al final.
            strokeDashoffset={progreso.interpolate({
              inputRange: [UMBRAL_VISIBLE, 1],
              outputRange: [CIRCUNFERENCIA, 0],
              extrapolate: "clamp",
            })}
          />
        </Svg>
        <Flecha rebote={rebote} lanzamiento={lanzamiento} color={c.enfasis} />
      </Presionable>
    </Animated.View>
  );
}

function Flecha({ rebote, lanzamiento, color }: { rebote: Animated.Value; lanzamiento: Animated.Value; color: string }) {
  return (
    <Animated.View
      style={{
        opacity: lanzamiento.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [
          { translateY: Animated.add(rebote, lanzamiento.interpolate({ inputRange: [0, 1], outputRange: [0, -50] })) },
          { scale: lanzamiento.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) },
        ],
      }}
    >
      {/* Flecha "arrow-up-line" de Remix Icon, la misma del portfolio. */}
      <Svg viewBox="0 0 24 24" width={20} height={20} fill={color}>
        <Path d="M13.0001 7.82843V20H11.0001V7.82843L5.63614 13.1924L4.22192 11.7782L12.0001 4L19.7783 11.7782L18.3641 13.1924L13.0001 7.82843Z" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contenedor: { position: "absolute", right: espacio.xl },
  anillo: { transform: [{ rotate: "-90deg" }] },
  boton: {
    width: TAMANO,
    height: TAMANO,
    borderRadius: TAMANO / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    // shadow-2xl
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
});
