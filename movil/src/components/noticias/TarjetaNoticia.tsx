// Una noticia: foto grande arriba, titular, medio y hace cuánto. Abre el artículo original.

import { memo } from "react";
import { Image, Linking, StyleSheet, View } from "react-native";

import { Presionable } from "@/components/Movimiento";
import { Text } from "@/components/Texto";
import { antiguedad } from "@/lib/noticias/combinar";
import type { Noticia } from "@/lib/noticias/fuentes";
import { espacio, fuente, radio, useColores } from "@/theme";

export function abrirNoticia(n: Noticia) {
  Linking.openURL(n.url).catch(() => {});
}

/**
 * `ahora`: momento de referencia para "hace 2 h" (la hora de la descarga). Memorizada: al refrescar o
 * cambiar de zona solo se dibujan las tarjetas que cambiaron.
 */
export const TarjetaNoticia = memo(function TarjetaNoticia({ n, ahora }: { n: Noticia; ahora: number }) {
  const c = useColores();
  return (
    <Presionable
      onPress={() => abrirNoticia(n)}
      accessibilityRole="link"
      accessibilityLabel={`${n.titulo}. ${n.medio}, ${antiguedad(n.fecha, ahora)}`}
      accessibilityHint="Abre la noticia en el navegador"
      style={({ pressed }) => [styles.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde, opacity: pressed ? 0.8 : 1 }]}
    >
      {n.imagen ? (
        <Image
          source={{ uri: n.imagen }}
          style={[styles.imagen, { backgroundColor: c.borde }]}
          resizeMode="cover"
          // Android: decodifica la foto al tamaño de la tarjeta, no al original (menos memoria y menos tirones al bajar).
          resizeMethod="resize"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.textos}>
        <Text style={[styles.titulo, { color: c.tinta }]} numberOfLines={3}>
          {n.titulo}
        </Text>
        <Text style={{ color: c.tinta2, fontSize: 13 }} numberOfLines={1}>
          {n.medio} · {antiguedad(n.fecha, ahora)}
        </Text>
      </View>
    </Presionable>
  );
});

const styles = StyleSheet.create({
  tarjeta: {
    marginHorizontal: espacio.l,
    borderRadius: radio.m,
    borderWidth: 1,
    overflow: "hidden",
  },
  // Foto a todo el ancho, proporción 16:9.
  imagen: { width: "100%", aspectRatio: 16 / 9 },
  textos: { padding: espacio.m, gap: espacio.s },
  titulo: { fontSize: 18, fontFamily: fuente.titulo, lineHeight: 24 },
});
