// Carrusel de accesos rápidos: se desliza con el dedo y encaja en cada tarjeta.

import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, useWindowDimensions, View } from "react-native";

import { Presionable } from "@/components/Movimiento";
import { Text } from "@/components/Texto";
import type { Acceso } from "@/lib/accesos";
import { indiceActivo, medirCarrusel } from "@/lib/carrusel";
import { espacio, fuente, radio, useColores } from "@/theme";

const SEPARACION = espacio.m;

/** `detalles`: dato vivo por clave de acceso (p. ej. "30 recientes"); si falta, se usa el fijo. */
export function Carrusel({ accesos, detalles = {} }: { accesos: Acceso[]; detalles?: Record<string, string> }) {
  const c = useColores();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { ancho, paso } = medirCarrusel(width, espacio.l, SEPARACION);
  const [activo, setActivo] = useState(0);

  const alDesplazar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const maximo = contentSize.width - layoutMeasurement.width;
    setActivo(indiceActivo(contentOffset.x, paso, maximo, accesos.length));
  };

  return (
    <View style={styles.raiz}>
      <FlatList
        data={accesos}
        keyExtractor={(a) => a.clave}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={paso}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ width: SEPARACION }} />}
        onScroll={alDesplazar}
        scrollEventThrottle={32}
        renderItem={({ item }) => {
          const disponible = item.ruta !== undefined;
          return (
            <Presionable
              onPress={() => item.ruta && router.push(item.ruta)}
              disabled={!disponible}
              accessibilityRole="button"
              accessibilityLabel={`${item.titulo}. ${detalles[item.clave] ?? item.detalle}`}
              accessibilityState={{ disabled: !disponible }}
              style={({ pressed }) => [
                styles.tarjeta,
                {
                  width: ancho,
                  backgroundColor: disponible ? c.superficie : "transparent",
                  borderColor: c.borde,
                  borderStyle: disponible ? "solid" : "dashed",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.icono, { backgroundColor: disponible ? c.enfasisSuave : "transparent" }]}>
                <Ionicons name={item.icono} size={26} color={disponible ? c.enfasis : c.apagado} />
              </View>
              <Text style={[styles.titulo, { color: disponible ? c.tinta : c.tinta2 }]}>{item.titulo}</Text>
              <Text style={[styles.detalle, { color: c.tinta2 }]} numberOfLines={2}>
                {detalles[item.clave] ?? item.detalle}
              </Text>
            </Presionable>
          );
        }}
      />
      <View style={styles.puntos} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {accesos.map((a, i) => (
          <View
            key={a.clave}
            style={[styles.punto, { backgroundColor: i === activo ? c.enfasis : c.borde, width: i === activo ? 18 : 8 }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { gap: espacio.m },
  lista: { paddingHorizontal: espacio.l },
  tarjeta: {
    minHeight: 140,
    padding: espacio.l,
    borderRadius: radio.m,
    borderWidth: 1,
    gap: espacio.s,
  },
  icono: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  titulo: { fontSize: 18, fontFamily: fuente.titulo },
  detalle: { fontSize: 13 },
  puntos: { flexDirection: "row", justifyContent: "center", gap: 6 },
  punto: { height: 8, borderRadius: 4 },
});
