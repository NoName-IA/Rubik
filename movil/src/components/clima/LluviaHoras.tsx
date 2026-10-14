// Clima › Lluvia: gráfica de las próximas 48 horas.
// Altura de la barra = probabilidad (escala fija 0–100 %); color = intensidad esperada (mm/h).
// Tocar una barra muestra sus valores; debajo hay una tabla equivalente.

import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Presionable } from "@/components/Movimiento";
import { Text } from "@/components/Texto";
import { Panel } from "@/components/Panel";
import { diaCorto } from "@/lib/fecha";
import { formatoHora, proximasHoras } from "@/lib/clima/formato";
import { INTENSIDADES, intensidad, milimetros, nombreIntensidad, resumirLluvia } from "@/lib/clima/lluvia";
import { horaConRiesgo } from "@/lib/clima/resumen";
import type { Hora, Pronostico } from "@/lib/clima/tipos";
import { useUmbralArroyos } from "@/hooks/useUmbralArroyos";
import { espacio, radio, useColores } from "@/theme";

const ALTO = 140;
const ANCHO_BARRA = 14;
const COLUMNA = 22; // zona táctil más ancha que la barra
const MARCAS = [100, 50, 0];

export function LluviaHoras({ p }: { p: Pronostico }) {
  const c = useColores();
  const umbral = useUmbralArroyos();
  // Sin umbral (ciudad sin arroyos) no se marca ninguna hora.
  const riesgo = (h: Hora) => (umbral ? horaConRiesgo(h, umbral) : false);
  const horas = proximasHoras(p, 48);
  const [elegida, setElegida] = useState(0);
  const [verTabla, setVerTabla] = useState(false);
  const r = resumirLluvia(horas);
  const sel: Hora | undefined = horas[Math.min(elegida, horas.length - 1)];
  const hoy = horas[0]?.hora.slice(0, 10);

  const etiquetaHora = (h: Hora, i: number) => {
    if (i === 0) return "Ahora";
    return h.hora.slice(0, 10) === hoy ? formatoHora(h.hora) : `${diaCorto(h.hora)} ${formatoHora(h.hora)}`;
  };

  if (horas.length === 0) return null;

  return (
    <>
      <Panel titulo="Próximas 48 horas">
        <Text style={{ color: c.tinta, fontSize: 15 }}>
          {r.horasProbables === 0
            ? "No se espera lluvia importante."
            : `Más probable: ${etiquetaHora(r.masProbable!, horas.indexOf(r.masProbable!))} (${r.masProbable!.probabilidad} %)` +
              (r.masFuerte ? ` · Más fuerte: ${etiquetaHora(r.masFuerte, horas.indexOf(r.masFuerte))}` : "")}
        </Text>
        <Text style={{ color: c.tinta2, fontSize: 13 }}>
          {r.horasProbables} {r.horasProbables === 1 ? "hora" : "horas"} con 50 % o más · {milimetros(r.totalMm)} en total
        </Text>

        {sel ? (
          <View style={[styles.detalle, { backgroundColor: c.enfasisSuave }]} accessibilityLiveRegion="polite">
            <Text style={[styles.detalleHora, { color: c.tinta }]}>{etiquetaHora(sel, elegida)}</Text>
            <Text style={{ color: c.tinta }}>
              <Text style={styles.detalleValor}>{sel.probabilidad ?? 0} %</Text> de probabilidad ·{" "}
              {milimetros(sel.mm)} ({nombreIntensidad(sel.mm).toLowerCase()})
            </Text>
            {riesgo(sel) ? (
              <Text style={{ color: c.alerta, fontWeight: "700" }}>⚠ Riesgo de arroyos</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.grafica}>
          <View style={styles.eje}>
            {MARCAS.map((m) => (
              <Text key={m} style={[styles.ejeTexto, { color: c.tinta2, top: ALTO - (m / 100) * ALTO - 7 }]}>
                {m} %
              </Text>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {MARCAS.map((m) => (
                <View
                  key={m}
                  style={[styles.linea, { top: 14 + ALTO - (m / 100) * ALTO, backgroundColor: c.borde, width: horas.length * COLUMNA }]}
                />
              ))}
              <View style={styles.columnas}>
                {horas.map((h, i) => {
                  const prob = h.probabilidad ?? 0;
                  const alto = prob === 0 ? 0 : Math.max(3, (prob / 100) * ALTO);
                  const medianoche = i > 0 && h.hora.endsWith("T00:00");
                  return (
                    <Presionable
                      key={h.hora}
                      onPress={() => setElegida(i)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: i === elegida }}
                      accessibilityLabel={`${etiquetaHora(h, i)}: ${prob} por ciento de probabilidad, ${milimetros(h.mm)}, ${nombreIntensidad(h.mm)}${riesgo(h) ? ", riesgo de arroyos" : ""}`}
                      style={[
                        styles.columna,
                        i === elegida && { backgroundColor: c.enfasisSuave },
                        medianoche && { borderLeftWidth: 1, borderLeftColor: c.tinta2 },
                      ]}
                    >
                      <Text style={[styles.dia, { color: c.tinta2 }]} numberOfLines={1}>
                        {medianoche ? diaCorto(h.hora) : " "}
                      </Text>
                      <View style={styles.zonaBarra}>
                        {riesgo(h) ? <Ionicons name="warning" size={12} color={c.alerta} style={styles.riesgo} /> : null}
                        <View
                          style={[
                            styles.barra,
                            { height: alto, backgroundColor: c.lluvia[intensidad(h.mm)] },
                          ]}
                        />
                      </View>
                    </Presionable>
                  );
                })}
              </View>
              {/* Etiquetas de hora cada 3 h, en su propia fila (encima de las columnas) para que no las corte ni las tape la selección. */}
              <View style={[styles.filaHoras, { width: horas.length * COLUMNA }]} pointerEvents="none">
                {horas.map((h, i) =>
                  i % 3 === 0 ? (
                    <Text key={h.hora} style={[styles.hora, { color: c.tinta2, ...(i === 0 ? { left: 0, textAlign: "left" as const } : { left: i * COLUMNA + COLUMNA / 2 - 30 }) }]}>
                      {formatoHora(h.hora)}
                    </Text>
                  ) : null,
                )}
              </View>
            </View>
          </ScrollView>
        </View>

        <View style={styles.leyenda} accessibilityLabel="Color de la barra: intensidad de la lluvia">
          {INTENSIDADES.map((i) => (
            <View key={i.clave} style={styles.itemLeyenda}>
              <View style={[styles.muestra, { backgroundColor: c.lluvia[i.clave] }]} />
              <Text style={{ color: c.tinta2, fontSize: 12 }}>
                {i.nombre} <Text style={{ color: c.apagado }}>{i.rango}</Text>
              </Text>
            </View>
          ))}
        </View>
        {horas.some(riesgo) ? (
          <View style={styles.itemLeyenda}>
            <Ionicons name="warning" size={12} color={c.alerta} />
            <Text style={{ color: c.tinta2, fontSize: 12 }}>Riesgo de arroyos (≥ {umbral?.probabilidad} % con aguacero o tormenta)</Text>
          </View>
        ) : null}
        <Text style={{ color: c.apagado, fontSize: 12 }}>
          Altura: probabilidad de lluvia. Color: milímetros esperados en esa hora. Toca una barra para ver el detalle.
        </Text>
      </Panel>

      <Panel>
        <Presionable onPress={() => setVerTabla((v) => !v)} accessibilityRole="button" style={styles.botonTabla}>
          <Text style={{ color: c.enfasis, fontWeight: "600" }}>{verTabla ? "Ocultar tabla" : "Ver como tabla"}</Text>
        </Presionable>
        {verTabla ? (
          <View>
            <View style={[styles.fila, { borderBottomColor: c.borde }]}>
              <Text style={[styles.celda, styles.celdaHora, styles.cabecera, { color: c.tinta2 }]}>Hora</Text>
              <Text style={[styles.celda, styles.cabecera, { color: c.tinta2 }]}>Probabilidad</Text>
              <Text style={[styles.celda, styles.cabecera, { color: c.tinta2 }]}>Lluvia</Text>
            </View>
            {horas.map((h, i) => (
              <View key={h.hora} style={[styles.fila, { borderBottomColor: c.borde }]} accessible>
                <Text style={[styles.celda, styles.celdaHora, { color: c.tinta }]}>{etiquetaHora(h, i)}</Text>
                <Text style={[styles.celda, { color: c.tinta }]}>{h.probabilidad ?? 0} %</Text>
                <Text style={[styles.celda, { color: c.tinta }]}>{milimetros(h.mm)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Panel>
    </>
  );
}

const styles = StyleSheet.create({
  detalle: { borderRadius: radio.s, padding: espacio.m, gap: 2, marginTop: espacio.xs },
  detalleHora: { fontSize: 13, fontWeight: "600" },
  detalleValor: { fontSize: 18, fontWeight: "700" },
  grafica: { flexDirection: "row", marginTop: espacio.s },
  eje: { width: 40, height: ALTO + 40, marginTop: 14 },
  ejeTexto: { position: "absolute", right: 6, fontSize: 11 },
  linea: { position: "absolute", left: 0, height: StyleSheet.hairlineWidth },
  columnas: { flexDirection: "row" },
  columna: { width: COLUMNA, alignItems: "center", borderRadius: 4 },
  dia: { fontSize: 10, height: 14, fontWeight: "700" },
  zonaBarra: { height: ALTO, justifyContent: "flex-end", marginBottom: 22 },
  // Extremo superior redondeado; la base queda apoyada en el eje.
  riesgo: { marginBottom: 2 },
  barra: { width: ANCHO_BARRA, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  filaHoras: { position: "absolute", top: 14 + ALTO + 4, height: 16 },
  hora: { position: "absolute", width: 60, fontSize: 10, textAlign: "center" },
  leyenda: { flexDirection: "row", flexWrap: "wrap", gap: espacio.m, marginTop: espacio.s },
  itemLeyenda: { flexDirection: "row", alignItems: "center", gap: 6 },
  muestra: { width: 12, height: 12, borderRadius: 3 },
  botonTabla: { minHeight: 40, justifyContent: "center" },
  fila: { flexDirection: "row", paddingVertical: espacio.s, borderBottomWidth: StyleSheet.hairlineWidth },
  celda: { flex: 1, fontSize: 14, textAlign: "right" },
  celdaHora: { flex: 1.4, textAlign: "left" },
  cabecera: { fontSize: 12, fontWeight: "600" },
});
