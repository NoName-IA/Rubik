// Aviso para las partes que llegan en fases siguientes.

import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import { espacio, radio, useColores } from "@/theme";

interface Props {
  icono: ComponentProps<typeof Ionicons>["name"];
  texto: string;
}

export function Proximamente({ icono, texto }: Props) {
  const c = useColores();
  return (
    <View style={[styles.caja, { borderColor: c.borde }]}>
      <Ionicons name={icono} size={32} color={c.apagado} />
      <Text style={[styles.texto, { color: c.tinta2 }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    marginHorizontal: espacio.l,
    padding: espacio.xl,
    borderRadius: radio.m,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    gap: espacio.s,
  },
  texto: { fontSize: 15, textAlign: "center" },
});
