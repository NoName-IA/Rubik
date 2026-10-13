// Contenedor común: fondo con lluvia de código (estilo portfolio_web), respeta la barra de
// estado y permite desplazar el contenido.

import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Fondo } from "@/components/Fondo";
import { Text } from "@/components/Texto";
import { espacio, fuente, useColores } from "@/theme";

interface Props {
  titulo?: string;
  subtitulo?: ReactNode;
  /** Con `false` no agrega margen superior (para pantallas apiladas que ya tienen encabezado). */
  bordeSuperior?: boolean;
  /** Si se pasa, se puede deslizar hacia abajo para actualizar. */
  alRefrescar?: () => void;
  refrescando?: boolean;
  children: ReactNode;
}

export function Pantalla({ titulo, subtitulo, bordeSuperior = true, alRefrescar, refrescando = false, children }: Props) {
  const c = useColores();
  return (
    <View style={[styles.raiz, { backgroundColor: c.fondo }]}>
      <Fondo />
      <SafeAreaView style={styles.raiz} edges={bordeSuperior ? ["top"] : []}>
      <ScrollView
        contentContainerStyle={styles.contenido}
        refreshControl={
          alRefrescar ? (
            <RefreshControl refreshing={refrescando} onRefresh={alRefrescar} colors={[c.enfasis]} tintColor={c.enfasis} />
          ) : undefined
        }
      >
        {titulo ? (
          <View style={styles.encabezado}>
            <Text style={[styles.titulo, { color: c.tinta }]} accessibilityRole="header">
              {titulo}
            </Text>
            {typeof subtitulo === "string" ? (
              <Text style={[styles.subtitulo, { color: c.tinta2 }]}>{subtitulo}</Text>
            ) : (
              subtitulo
            )}
          </View>
        ) : null}
        {children}
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  contenido: { paddingVertical: espacio.l, gap: espacio.l },
  encabezado: { paddingHorizontal: espacio.l, gap: espacio.xs },
  titulo: { fontSize: 32, fontFamily: fuente.titulo, letterSpacing: -0.5 },
  subtitulo: { fontSize: 15 },
});
