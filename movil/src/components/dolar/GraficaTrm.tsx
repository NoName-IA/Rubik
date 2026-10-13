// Línea de la TRM en el período elegido. El eje no empieza en cero (el dólar se mueve en un
// rango estrecho), por eso es una línea y no barras; el mínimo y el máximo van rotulados.

import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import { fechaCorta, type Periodo, pesos } from "@/lib/dolar";
import { espacio, useColores } from "@/theme";

const ALTO = 150;
const MARGEN = 6;

export function GraficaTrm({ p }: { p: Periodo }) {
  const c = useColores();
  const [ancho, setAncho] = useState(0);
  const { puntos, minimo, maximo } = p;
  const rango = maximo.valor - minimo.valor || 1;
  const x = (i: number) => MARGEN + (i / (puntos.length - 1)) * (ancho - MARGEN * 2);
  const y = (v: number) => MARGEN + ((maximo.valor - v) / rango) * (ALTO - MARGEN * 2);
  const ultimo = puntos[puntos.length - 1];
  // Con períodos que cruzan de año (p. ej. "1 año") las fechas llevan el año.
  const conAnio = puntos[0].desde.slice(0, 4) !== ultimo.desde.slice(0, 4);
  const f = (iso: string) => fechaCorta(iso, conAnio);

  return (
    <View>
      <View
        style={{ height: ALTO }}
        onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
        accessible
        accessibilityLabel={`TRM entre ${f(puntos[0].desde)} y ${f(ultimo.desde)}: mínimo ${pesos(minimo.valor)} el ${f(minimo.desde)}, máximo ${pesos(maximo.valor)} el ${f(maximo.desde)}, último ${pesos(ultimo.valor)}.`}
      >
        {/* Líneas guía en el máximo y el mínimo */}
        {[maximo.valor, minimo.valor].map((v) => (
          <View key={v} style={[styles.guia, { top: y(v), backgroundColor: c.borde }]} />
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
                      backgroundColor: c.enfasis,
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
              { left: x(puntos.length - 1) - 5, top: y(ultimo.valor) - 5, backgroundColor: c.enfasis, borderColor: c.superficie },
            ]}
          />
        ) : null}
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
  guia: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth },
  segmento: { position: "absolute", height: 2, borderRadius: 1 },
  punto: { position: "absolute", width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  pie: { flexDirection: "row", justifyContent: "space-between", marginTop: espacio.xs },
  extremos: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: espacio.s, marginTop: espacio.s },
  texto: { fontSize: 12 },
});
