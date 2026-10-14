// Línea de la TRM en el período elegido. El eje no empieza en cero (el dólar se mueve en un
// rango estrecho), por eso es una línea y no barras; el mínimo y el máximo van rotulados.
// Al poner el dedo (o arrastrarlo) sobre la gráfica se ve la TRM y la fecha de ese punto.
// Sin fondo propio (el de la tarjeta), con una cuadrícula grande casi invisible, en el acento del tema.

import { useMemo, useState } from "react";
import { type GestureResponderEvent, type LayoutChangeEvent, PanResponder, StyleSheet, View } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";

import { Text } from "@/components/Texto";
import { fechaCorta, type Periodo, pesos, puntoCercano } from "@/lib/dolar";
import { espacio, radio, useColores } from "@/theme";

const ALTO = 150;
const MARGEN = 6;
/** Cuadrícula de fondo: cuadrados grandes y líneas apenas visibles, para no competir con la línea. */
const CUADRO = 40;
/** Opacidad de las líneas de la cuadrícula, sobre el color de la línea. */
const OPACIDAD_CUADRO = 0.1;
/** Ancho de la etiqueta con el valor del punto tocado. */
const ANCHO_ETIQUETA = 128;

export function GraficaTrm({ p }: { p: Periodo }) {
  const c = useColores();
  const linea = c.enfasis;
  const [ancho, setAncho] = useState(0);
  const [tocado, setTocado] = useState<number | null>(null);
  const { puntos, minimo, maximo } = p;
  const n = puntos.length;

  // Responde apenas se toca (así se ve el valor sin arrastrar) y suelta el gesto si la página quiere
  // desplazarse en vertical.
  const gesto = useMemo(() => {
    const elegir = (e: GestureResponderEvent) => setTocado(puntoCercano(e.nativeEvent.locationX, ancho, n, MARGEN));
    const soltar = () => setTocado(null);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => ancho > 0,
      onMoveShouldSetPanResponder: () => ancho > 0,
      onPanResponderGrant: elegir,
      onPanResponderMove: elegir,
      onPanResponderRelease: soltar,
      onPanResponderTerminate: soltar,
      onPanResponderTerminationRequest: () => true,
    });
  }, [ancho, n]);
  const rango = maximo.valor - minimo.valor || 1;
  const x = (i: number) => MARGEN + (i / (puntos.length - 1)) * (ancho - MARGEN * 2);
  const y = (v: number) => MARGEN + ((maximo.valor - v) / rango) * (ALTO - MARGEN * 2);
  const ultimo = puntos[puntos.length - 1];
  // Con períodos que cruzan de año (p. ej. "1 año") las fechas llevan el año.
  const conAnio = puntos[0].desde.slice(0, 4) !== ultimo.desde.slice(0, 4);
  const f = (iso: string) => fechaCorta(iso, conAnio);
  // Al cambiar de período el índice puede quedar fuera de la serie.
  const elegido = tocado !== null && tocado < n ? puntos[tocado] : null;

  return (
    <View>
      <View style={styles.lienzo}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern id="cuadricula-trm" width={CUADRO} height={CUADRO} patternUnits="userSpaceOnUse">
              <Path d={`M ${CUADRO} 0 H 0 V ${CUADRO}`} fill="none" stroke={linea} strokeOpacity={OPACIDAD_CUADRO} strokeWidth={1} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#cuadricula-trm)" />
        </Svg>
        <View
          style={{ height: ALTO }}
          onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
          accessible
          accessibilityLabel={`TRM entre ${f(puntos[0].desde)} y ${f(ultimo.desde)}: mínimo ${pesos(minimo.valor)} el ${f(minimo.desde)}, máximo ${pesos(maximo.valor)} el ${f(maximo.desde)}, último ${pesos(ultimo.valor)}.`}
        >
          {/* Líneas guía en el máximo y el mínimo */}
          {[maximo.valor, minimo.valor].map((v) => (
            <View key={v} style={[styles.guia, { top: y(v), backgroundColor: linea, opacity: 0.35 }]} />
          ))}
          {ancho > 0
            ? puntos.slice(1).map((d, k) => {
                const x1 = x(k);
                const y1 = y(puntos[k].valor);
                const x2 = x(k + 1);
                const y2 = y(d.valor);
                const largo = Math.hypot(x2 - x1, y2 - y1);
                return (
                  <View
                    key={d.desde}
                    style={[
                      styles.segmento,
                      {
                        width: largo + 1,
                        left: (x1 + x2) / 2 - (largo + 1) / 2,
                        top: (y1 + y2) / 2 - 1,
                        backgroundColor: linea,
                        transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }],
                      },
                    ]}
                  />
                );
              })
            : null}
          {ancho > 0 ? (
            <View
              style={[
                styles.punto,
                { left: x(puntos.length - 1) - 5, top: y(ultimo.valor) - 5, backgroundColor: linea, borderColor: c.superficie },
              ]}
            />
          ) : null}
          {elegido && tocado !== null ? (
            <>
              <View style={[styles.cursor, { left: x(tocado), backgroundColor: c.tinta2 }]} />
              <View
                style={[
                  styles.punto,
                  styles.puntoTocado,
                  { left: x(tocado) - 7, top: y(elegido.valor) - 7, backgroundColor: linea, borderColor: c.superficie },
                ]}
              />
              <View
                style={[
                  styles.etiqueta,
                  {
                    left: Math.min(Math.max(x(tocado) - ANCHO_ETIQUETA / 2, 0), ancho - ANCHO_ETIQUETA),
                    // Arriba si el punto está abajo, y al revés, para no tapar la línea.
                    ...(y(elegido.valor) > ALTO / 2 ? { top: 0 } : { bottom: 0 }),
                    backgroundColor: c.superficie,
                    borderColor: linea,
                  },
                ]}
              >
                <Text style={[styles.valorTocado, { color: c.tinta }]}>{pesos(elegido.valor)}</Text>
                <Text style={[styles.texto, { color: c.tinta2 }]}>{f(elegido.desde)}</Text>
              </View>
            </>
          ) : null}
          {/* Capa encima de todo que recibe el dedo (sin hijos, así locationX es siempre respecto a ella). */}
          <View style={StyleSheet.absoluteFill} {...gesto.panHandlers} />
        </View>
      </View>
      <View style={styles.pie}>
        <Text style={[styles.texto, { color: c.tinta2 }]}>{f(puntos[0].desde)}</Text>
        <Text style={[styles.texto, { color: c.tinta2 }]}>{f(ultimo.desde)}</Text>
      </View>
      <View style={styles.extremos}>
        <Text style={[styles.texto, { color: c.tinta2 }]}>
          Máx. <Text style={{ color: c.tinta, fontWeight: "700" }}>{pesos(maximo.valor, 0)}</Text> ({f(maximo.desde)})
        </Text>
        <Text style={[styles.texto, { color: c.tinta2 }]}>
          Mín. <Text style={{ color: c.tinta, fontWeight: "700" }}>{pesos(minimo.valor, 0)}</Text> ({f(minimo.desde)})
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lienzo: { borderRadius: radio.s, padding: espacio.s, overflow: "hidden" },
  guia: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth },
  segmento: { position: "absolute", height: 2, borderRadius: 1 },
  punto: { position: "absolute", width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  puntoTocado: { width: 14, height: 14, borderRadius: 7 },
  cursor: { position: "absolute", top: 0, bottom: 0, width: StyleSheet.hairlineWidth * 2, opacity: 0.6 },
  etiqueta: {
    position: "absolute",
    width: ANCHO_ETIQUETA,
    alignItems: "center",
    paddingVertical: espacio.xs,
    borderRadius: radio.s,
    borderWidth: 1,
  },
  valorTocado: { fontSize: 15, fontWeight: "700" },
  pie: { flexDirection: "row", justifyContent: "space-between", marginTop: espacio.xs },
  extremos: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: espacio.s, marginTop: espacio.s },
  texto: { fontSize: 12 },
});
