// Animaciones base, iguales a `motion.tsx` de WOOD (allá con Reanimated, acá con Animated):
// - `Entrada` (MotionView): el contenido aparece subiendo 25 px mientras se desvanece, en 460 ms.
//   Se repite cada vez que se entra a la pantalla, sin volver a montar el contenido (no se pierde lo
//   escrito ni lo elegido).
// - `Presionable` (MotionPressable): un Pressable que se encoge a 0,97 con un resorte al tocarlo.
// Con "reducir movimiento" activado no animan.

import { useFocusEffect } from "expo-router";
import { type ReactNode, useCallback, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const NATIVO = Platform.OS !== "web";
const DURACION = 460;
const DESPLAZAMIENTO = 25;
/** Igual que WOOD: el retraso escalonado no pasa de 360 ms. */
const RETRASO_MAXIMO = 360;
/** Resorte de MotionPressable. */
const RESORTE = { damping: 18, stiffness: 280, mass: 1 };
const ESCALA_PRESIONADO = 0.97;

// Se lee una vez para toda la app (y se actualiza si cambia), así la pantalla no parpadea al entrar.
let quietoGlobal = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => (quietoGlobal = v))
  .catch(() => {});
AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => (quietoGlobal = v));

/** `true` si el usuario pidió reducir el movimiento. */
export function movimientoReducido(): boolean {
  return quietoGlobal;
}

export function Entrada({ retraso = 0, style, children }: { retraso?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const [avance] = useState(() => new Animated.Value(quietoGlobal ? 1 : 0));

  useFocusEffect(
    useCallback(() => {
      if (quietoGlobal) {
        avance.setValue(1);
        return;
      }
      avance.setValue(0);
      const animacion = Animated.timing(avance, {
        toValue: 1,
        duration: DURACION,
        delay: Math.min(retraso, RETRASO_MAXIMO),
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: NATIVO,
      });
      animacion.start();
      return () => animacion.stop();
    }, [avance, retraso]),
  );

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: avance,
          transform: [{ translateY: avance.interpolate({ inputRange: [0, 1], outputRange: [DESPLAZAMIENTO, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const PressableAnimado = Animated.createAnimatedComponent(Pressable);

/** Se usa igual que `Pressable` (también acepta `style` como función de `pressed`). */
export function Presionable({ style, disabled, onPressIn, onPressOut, ...props }: PressableProps) {
  const [escala] = useState(() => new Animated.Value(1));
  // El estilo animado no puede salir de la función de `style`, así que `pressed` se lleva acá.
  const [presionado, setPresionado] = useState(false);

  const llevarA = (valor: number) => {
    if (quietoGlobal) return;
    Animated.spring(escala, { toValue: valor, ...RESORTE, useNativeDriver: NATIVO }).start();
  };

  return (
    <PressableAnimado
      {...props}
      disabled={disabled}
      onPressIn={(e) => {
        setPresionado(true);
        if (!disabled) llevarA(ESCALA_PRESIONADO);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPresionado(false);
        llevarA(1);
        onPressOut?.(e);
      }}
      style={[typeof style === "function" ? style({ pressed: presionado }) : style, { transform: [{ scale: escala }] }]}
    />
  );
}
