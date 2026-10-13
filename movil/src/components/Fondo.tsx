// Fondo de todas las pantallas: color liso (sin el degradado del portfolio, que dejaba una sombra
// en una esquina), un solo cubo de Rubik grande en líneas tenues recostado a la derecha, y la
// "lluvia" de caracteres de código de portfolio_web. Con "reducir movimiento" activado en el
// celular, los caracteres quedan quietos.

import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { fuente, useColores, useOscuro } from "@/theme";

const CARACTERES = "{}[]()<>/\\=+*01;";
const CANTIDAD = 20;

interface Gota {
  id: number;
  caracter: string;
  x: number;
  tamano: number;
  duracion: number;
  retraso: number;
  opacidad: number;
  y: number;
}

function nuevaGota(id: number, ancho: number, alto: number): Gota {
  return {
    id,
    caracter: CARACTERES[Math.floor(Math.random() * CARACTERES.length)],
    x: Math.random() * ancho,
    tamano: 10 + Math.random() * 10,
    duracion: 5000 + Math.random() * 7000,
    retraso: Math.random() * 4000,
    opacidad: 0.3 + Math.random() * 0.2,
    y: Math.random() * alto,
  };
}

type Punto = [number, number];

const medio = (a: Punto, b: Punto): Punto => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const linea = (a: Punto, b: Punto) => `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;

/**
 * Trazo de un cubo de Rubik 2×2×2 en perspectiva isométrica (como el logo): el hexágono del contorno,
 * las tres aristas internas y una línea a mitad de cada cara para dividirla en 2×2.
 */
export function trazoRubik(cx: number, cy: number, r: number): string {
  const v = (grados: number): Punto => {
    const a = (grados * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const [arriba, arribaDer, abajoDer, abajo, abajoIzq, arribaIzq] = [-90, -30, 30, 90, 150, 210].map(v);
  const centro: Punto = [cx, cy];
  const caras: [Punto, Punto, Punto, Punto][] = [
    [arriba, arribaDer, centro, arribaIzq], // superior
    [arribaIzq, centro, abajo, abajoIzq], // izquierda
    [centro, arribaDer, abajoDer, abajo], // derecha
  ];
  const contorno = `M${[arriba, arribaDer, abajoDer, abajo, abajoIzq, arribaIzq].map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L")} Z`;
  const aristas = [linea(centro, arribaIzq), linea(centro, arribaDer), linea(centro, abajo)];
  const divisiones = caras.flatMap(([a, b, c, d]) => [linea(medio(a, b), medio(d, c)), linea(medio(b, c), medio(a, d))]);
  return [contorno, ...aristas, ...divisiones].join(" ");
}

/** Un solo cubo grande y tenue, recostado a la derecha y cortado por el borde (no un mosaico). */
function CuboRubik({ ancho, alto, color, opacidad }: { ancho: number; alto: number; color: string; opacidad: number }) {
  const r = Math.min(ancho * 0.62, alto * 0.42);
  return (
    <Svg style={StyleSheet.absoluteFill} width={ancho} height={alto}>
      <Path d={trazoRubik(ancho * 0.82, alto * 0.6, r)} stroke={color} strokeOpacity={opacidad} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function GotaAnimada({ g, alto, quieta, color }: { g: Gota; alto: number; quieta: boolean; color: string }) {
  const [avance] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (quieta) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(g.retraso),
        Animated.timing(avance, {
          toValue: 1,
          duration: g.duracion,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [avance, g, quieta]);

  const estilo = quieta
    ? { top: g.y, opacity: g.opacidad }
    : {
        top: 0,
        opacity: avance.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, g.opacidad, g.opacidad * 0.6, 0] }),
        transform: [{ translateY: avance.interpolate({ inputRange: [0, 1], outputRange: [-30, alto * 0.9] }) }],
      };
  return (
    <Animated.Text
      style={[styles.gota, { left: g.x, fontSize: g.tamano, color, textShadowColor: color }, estilo]}
      accessible={false}
    >
      {g.caracter}
    </Animated.Text>
  );
}

export function Fondo() {
  const c = useColores();
  const oscuro = useOscuro();
  const { width, height } = useWindowDimensions();
  const [quieta, setQuieta] = useState(false);
  const [gotas] = useState(() => Array.from({ length: CANTIDAD }, (_, i) => nuevaGota(i, width, height)));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setQuieta)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setQuieta);
    return () => sub.remove();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.fondo }]} />
      <CuboRubik ancho={width} alto={height} color={c.enfasis} opacidad={oscuro ? 0.14 : 0.18} />
      {gotas.map((g) => (
        <GotaAnimada key={g.id} g={g} alto={height} quieta={quieta} color={c.codigo} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gota: { position: "absolute", fontFamily: fuente.codigo, textShadowRadius: 5 },
});
