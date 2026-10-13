// Fondo de todas las pantallas: color liso del tema, sin decoraciones.

import { StyleSheet, View } from "react-native";

import { useColores } from "@/theme";

export function Fondo() {
  const c = useColores();
  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: c.fondo }]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    />
  );
}
