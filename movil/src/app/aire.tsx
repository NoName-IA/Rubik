// Detalle de la calidad del aire (se abre desde Clima › Hoy o desde Inicio).

import { ScrollView, StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import { CategoriaIca } from "@/components/aire/CategoriaIca";
import { Esqueleto, MensajeError } from "@/components/Estados";
import { Pantalla } from "@/components/Pantalla";
import { Panel } from "@/components/Panel";
import { useAire } from "@/hooks/useAire";
import { categoria, type Contaminante, LIMITES, NOMBRE_CONTAMINANTE, textoOms, valorIca } from "@/lib/aire/ica";
import { type Aire, promedio24h, proximasHorasAire, valorActual } from "@/lib/aire/openMeteoAire";
import { formatoHora, haceCuanto } from "@/lib/clima/formato";
import { espacio, radio, useColores } from "@/theme";

const DESCRIPCION: Record<Contaminante, string> = {
  pm25: "Partículas finas: humo, tráfico, quemas. Entran hasta los pulmones.",
  pm10: "Partículas gruesas: polvo, construcción, vías destapadas.",
};

export default function DetalleAire() {
  const c = useColores();
  const { data, error, isPending, isRefetching, refetch } = useAire();

  return (
    <Pantalla bordeSuperior={false} alRefrescar={() => refetch()} refrescando={isRefetching}>
      {data ? (
        <>
          <SeccionContaminante a={data} c="pm25" />
          <Pronostico24h a={data} />
          <SeccionContaminante a={data} c="pm10" />
          <Panel titulo="Cómo leer esto">
            <Text style={[styles.nota, { color: c.tinta2 }]}>
              Las categorías son las del Índice de Calidad del Aire de Colombia (Resolución 2254 de 2017) y se
              calculan con el promedio de las últimas 24 horas. La guía de la OMS (2021) es más estricta que la
              norma colombiana.
            </Text>
            <Text style={[styles.nota, { color: c.apagado }]}>
              Datos modelados por CAMS (Copernicus) a través de Open-Meteo, no medidos por estaciones de la ciudad.
              Actualizado {haceCuanto(data.obtenido)}.
            </Text>
          </Panel>
        </>
      ) : error && !isPending ? (
        <MensajeError mensaje={error.message} alReintentar={() => refetch()} />
      ) : (
        <Panel>
          <Esqueleto alto={28} ancho="50%" />
          <Esqueleto alto={60} />
        </Panel>
      )}
    </Pantalla>
  );
}

function SeccionContaminante({ a, c: cont }: { a: Aire; c: Contaminante }) {
  const c = useColores();
  const prom = promedio24h(a, cont);
  const ahora = valorActual(a, cont);
  const nombre = NOMBRE_CONTAMINANTE[cont];
  if (prom === null) {
    return (
      <Panel titulo={nombre}>
        <Text style={{ color: c.tinta2 }}>Sin datos suficientes para el promedio de 24 h.</Text>
      </Panel>
    );
  }
  const cat = categoria(cont, prom);
  return (
    <Panel titulo={nombre}>
      <CategoriaIca cat={cat} grande />
      <Text style={{ color: c.tinta, fontSize: 15 }}>
        Promedio de 24 h: <Text style={{ fontWeight: "700" }}>{prom} µg/m³</Text> · ICA {valorIca(cont, prom)}
        {ahora !== null ? ` · ahora ${Math.round(ahora)} µg/m³` : ""}
      </Text>
      <Escala c={cont} valor={prom} />
      <Text style={{ color: c.tinta2, fontSize: 14 }}>{textoOms(cont, prom)}</Text>
      <Text style={{ color: c.tinta2, fontSize: 13 }}>{cat.efecto}</Text>
      <Text style={{ color: c.apagado, fontSize: 12 }}>{DESCRIPCION[cont]}</Text>
    </Panel>
  );
}

/** Barra horizontal con el valor y las marcas de la guía OMS y la norma colombiana. */
function Escala({ c: cont, valor }: { c: Contaminante; valor: number }) {
  const c = useColores();
  const { oms24h, norma24h } = LIMITES[cont];
  const max = Math.max(norma24h * 1.4, valor * 1.1);
  const pos = (v: number) => `${Math.min((v / max) * 100, 100)}%` as const;
  return (
    <View
      style={styles.escala}
      accessible
      accessibilityLabel={`${Math.round(valor)} microgramos por metro cúbico. Guía OMS ${oms24h}, norma colombiana ${norma24h}.`}
    >
      <View style={[styles.pista, { backgroundColor: c.borde }]}>
        <View style={[styles.relleno, { width: pos(valor), backgroundColor: c.enfasis }]} />
      </View>
      {[
        { v: oms24h, t: `OMS ${oms24h}` },
        { v: norma24h, t: `Norma ${norma24h}` },
      ].map((m) => (
        <View key={m.t} style={[styles.marca, { left: pos(m.v) }]}>
          <View style={[styles.palito, { backgroundColor: c.tinta2 }]} />
          <Text style={[styles.textoMarca, { color: c.tinta2 }]}>{m.t}</Text>
        </View>
      ))}
    </View>
  );
}

const ALTO = 90;

/** PM2.5 de las próximas 24 horas, con líneas de referencia de la OMS y la norma. */
function Pronostico24h({ a }: { a: Aire }) {
  const c = useColores();
  const horas = proximasHorasAire(a, 24).filter((h) => h.pm25 !== null);
  if (horas.length === 0) return null;
  const { oms24h, norma24h } = LIMITES.pm25;
  const max = Math.max(norma24h, ...horas.map((h) => h.pm25 ?? 0)) * 1.15;
  const y = (v: number) => (v / max) * ALTO;
  const ancho = horas.length * 18;
  return (
    <Panel titulo="PM2.5 · próximas 24 horas">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: ancho, height: ALTO + 22 }}>
          {[
            { v: oms24h, t: "OMS" },
            { v: norma24h, t: "Norma" },
          ].map((r) => (
            <View key={r.t} style={[styles.referencia, { bottom: 22 + y(r.v), width: ancho, borderColor: c.tinta2 }]}>
              <Text style={[styles.textoReferencia, { color: c.tinta2, backgroundColor: c.superficie }]}>
                {r.t} {r.v}
              </Text>
            </View>
          ))}
          <View style={styles.barras}>
            {horas.map((h, i) => (
              <View
                key={h.hora}
                style={styles.columna}
                accessible
                accessibilityLabel={`${formatoHora(h.hora)}: ${Math.round(h.pm25 ?? 0)} microgramos por metro cúbico`}
              >
                <View style={[styles.barra, { height: Math.max(2, y(h.pm25 ?? 0)), backgroundColor: c.enfasis }]} />
                <Text style={[styles.hora, { color: c.tinta2 }, i === 0 && styles.primeraHora]}>{i % 4 === 0 ? formatoHora(h.hora) : ""}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <Text style={{ color: c.apagado, fontSize: 12 }}>
        Valores por hora (µg/m³). Las líneas son referencias de 24 h: sirven para ver la tendencia, no para
        calificar una sola hora.
      </Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  nota: { fontSize: 13, lineHeight: 19 },
  escala: { height: 40, marginTop: espacio.s },
  pista: { height: 8, borderRadius: radio.s, overflow: "hidden" },
  relleno: { height: 8, borderRadius: radio.s },
  marca: { position: "absolute", top: 0, alignItems: "center", width: 70, marginLeft: -35 },
  palito: { width: 2, height: 14, marginTop: -3 },
  textoMarca: { fontSize: 11 },
  referencia: { position: "absolute", left: 0, borderTopWidth: 1, borderStyle: "dashed" },
  textoReferencia: { position: "absolute", right: 0, top: -15, fontSize: 10, paddingHorizontal: 2 },
  barras: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "flex-end" },
  columna: { width: 18, alignItems: "center" },
  barra: { width: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  hora: { height: 18, marginTop: 4, fontSize: 10, width: 50, textAlign: "center" },
  // La primera etiqueta se alinea a la izquierda para que no se salga de la gráfica.
  primeraHora: { alignSelf: "flex-start", textAlign: "left" },
});
