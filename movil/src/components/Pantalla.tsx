// Contenedor común: fondo con lluvia de código (estilo portfolio_web), respeta la barra de
// estado y permite desplazar el contenido. Al entrar, el encabezado y luego el contenido aparecen
// escalonados (animación de entrada de WOOD). Opcionalmente muestra el botón para volver arriba.

import { type ReactNode, useRef, useState } from "react";
import { Animated, type NativeScrollEvent, type NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BotonArriba } from "@/components/BotonArriba";
import { Fondo } from "@/components/Fondo";
import { Entrada } from "@/components/Movimiento";
import { Text } from "@/components/Texto";
import { progresoDesplazamiento } from "@/lib/desplazamiento";
import { espacio, fuente, useColores } from "@/theme";

interface Props {
  titulo?: string;
  subtitulo?: ReactNode;
  /** Con `false` no agrega margen superior (para pantallas apiladas que ya tienen encabezado). */
  bordeSuperior?: boolean;
  /** Si se pasa, se puede deslizar hacia abajo para actualizar. */
  alRefrescar?: () => void;
  refrescando?: boolean;
  /** Muestra el botón flotante para volver arriba (como el de portfolio_web) en listas largas. */
  botonArriba?: boolean;
  children: ReactNode;
}

/** Retraso del contenido respecto al encabezado, como los `delay={60}` de WOOD. */
const PASO = 60;

export function Pantalla({
  titulo,
  subtitulo,
  bordeSuperior = true,
  alRefrescar,
  refrescando = false,
  botonArriba = false,
  children,
}: Props) {
  const c = useColores();
  const desplazable = useRef<ScrollView>(null);
  const [progreso] = useState(() => new Animated.Value(0));

  const alDesplazar = ({ nativeEvent: e }: NativeSyntheticEvent<NativeScrollEvent>) =>
    progreso.setValue(progresoDesplazamiento(e.contentOffset.y, e.contentSize.height, e.layoutMeasurement.height));

  return (
    <View style={[styles.raiz, { backgroundColor: c.fondo }]}>
      <Fondo />
      <SafeAreaView style={styles.raiz} edges={bordeSuperior ? ["top"] : []}>
      <ScrollView
        ref={desplazable}
        onScroll={botonArriba ? alDesplazar : undefined}
        scrollEventThrottle={botonArriba ? 16 : undefined}
        contentContainerStyle={styles.contenido}
        refreshControl={
          alRefrescar ? (
            <RefreshControl refreshing={refrescando} onRefresh={alRefrescar} colors={[c.enfasis]} tintColor={c.enfasis} />
          ) : undefined
        }
      >
        {titulo ? (
          <Entrada>
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
          </Entrada>
        ) : null}
        {/* Todo el contenido en un solo bloque con el mismo `gap`: así las tarjetas que salen de un
            fragmento quedan separadas y los componentes que no muestran nada no dejan hueco. */}
        <Entrada retraso={titulo ? PASO : 0} style={styles.cuerpo}>
          {children}
        </Entrada>
      </ScrollView>
      </SafeAreaView>
      {botonArriba ? (
        <BotonArriba progreso={progreso} alTocar={() => desplazable.current?.scrollTo({ y: 0, animated: true })} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  contenido: { paddingVertical: espacio.l, gap: espacio.l },
  cuerpo: { gap: espacio.l },
  encabezado: { paddingHorizontal: espacio.l, gap: espacio.xs },
  titulo: { fontSize: 32, fontFamily: fuente.titulo, letterSpacing: -0.5 },
  subtitulo: { fontSize: 15 },
});
