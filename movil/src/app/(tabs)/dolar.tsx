// Dólar: TRM oficial del día, su evolución y un conversor.

import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { Text } from "@/components/Texto";
import { GraficaTrm } from "@/components/dolar/GraficaTrm";
import { Esqueleto, MensajeError } from "@/components/Estados";
import { Pantalla } from "@/components/Pantalla";
import { Panel } from "@/components/Panel";
import { Segmentos } from "@/components/Segmentos";
import { useDolar } from "@/hooks/useDolar";
import { useRecordado } from "@/hooks/useRecordado";
import { dolares, fechaCorta, hoyColombia, leerNumero, periodo, pesos, porcentaje, type Trm, vigencia, vigente } from "@/lib/dolar";
import { espacio, fuente, radio, useColores } from "@/theme";

const PERIODOS = [
  { clave: "30", titulo: "30 días" },
  { clave: "90", titulo: "90 días" },
  { clave: "365", titulo: "1 año" },
] as const;

const SENTIDOS = [
  { clave: "usd", titulo: "Dólares → pesos" },
  { clave: "cop", titulo: "Pesos → dólares" },
] as const;

export default function Dolar() {
  const c = useColores();
  const { data, error, isPending, isRefetching, refetch } = useDolar();

  return (
    <Pantalla titulo="Dólar" subtitulo="TRM oficial" alRefrescar={() => refetch()} refrescando={isRefetching}>
      {data ? (
        <Contenido t={data} />
      ) : error && !isPending ? (
        <MensajeError titulo="No se pudo cargar la TRM" mensaje={error.message} alReintentar={() => refetch()} />
      ) : (
        <Panel>
          <Esqueleto alto={48} ancho="60%" />
          <Esqueleto alto={18} ancho="80%" />
          <Esqueleto alto={150} />
        </Panel>
      )}
      <Text style={[styles.fuente, { color: c.apagado }]}>
        La TRM es el promedio oficial del mercado; las casas de cambio y los bancos compran y venden a otros precios.
      </Text>
    </Pantalla>
  );
}

function Contenido({ t }: { t: Trm }) {
  const c = useColores();
  const hoy = hoyColombia(t.obtenido);
  const v = vigente(t, hoy);
  const [dias, setDias] = useRecordado<(typeof PERIODOS)[number]["clave"]>("dolar:periodo", "30", PERIODOS.map((p) => p.clave));
  const p = periodo(t, Number(dias), hoy);
  const sube = (v.cambio ?? 0) > 0;
  const baja = (v.cambio ?? 0) < 0;

  return (
    <>
      {t.guardado ? <Aviso texto={`Sin conexión · TRM guardada el ${fechaCorta(hoyColombia(t.obtenido))}`} /> : null}
      {!v.alDia ? <Aviso texto={`Aún no está publicada la TRM de hoy; esta es la más reciente (${vigencia(v.actual)}).`} /> : null}

      <Panel titulo={v.alDia ? "TRM de hoy" : "Última TRM"}>
        <Text style={[styles.valor, { color: c.tinta }]} accessibilityLabel={`${pesos(v.actual.valor)} pesos por dólar`}>
          {pesos(v.actual.valor)}
        </Text>
        <Text style={{ color: c.tinta2, fontSize: 14 }}>Vigente {vigencia(v.actual)}</Text>
        {v.cambio !== null && v.anterior ? (
          <View style={styles.cambio}>
            <Ionicons
              name={sube ? "trending-up" : baja ? "trending-down" : "remove"}
              size={20}
              color={c.tinta}
              accessibilityLabel={sube ? "Sube" : baja ? "Baja" : "Sin cambio"}
            />
            <Text style={{ color: c.tinta, fontSize: 15, flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>
                {sube ? "Sube" : baja ? "Baja" : "Igual"} {pesos(Math.abs(v.cambio))} ({porcentaje(v.cambioPct ?? 0)})
              </Text>{" "}
              frente a la anterior ({pesos(v.anterior.valor)})
            </Text>
          </View>
        ) : null}
      </Panel>

      <Panel titulo="Evolución">
        <Segmentos opciones={PERIODOS} valor={dias} alCambiar={setDias} dentroDePanel />
        {p ? (
          <>
            <Text style={{ color: c.tinta2, fontSize: 13 }}>
              En {PERIODOS.find((x) => x.clave === dias)!.titulo.replace("1 año", "el último año")}:{" "}
              <Text style={{ color: c.tinta, fontWeight: "700" }}>{porcentaje(p.cambioPct)}</Text>
            </Text>
            <GraficaTrm p={p} />
          </>
        ) : (
          <Text style={{ color: c.tinta2 }}>No hay datos suficientes para este período.</Text>
        )}
      </Panel>

      <Conversor trm={v.actual.valor} />
    </>
  );
}

function Conversor({ trm }: { trm: number }) {
  const c = useColores();
  const [sentido, setSentido] = useRecordado<(typeof SENTIDOS)[number]["clave"]>("dolar:sentido", "usd", SENTIDOS.map((s) => s.clave));
  const [texto, setTexto] = useState("100");
  const n = leerNumero(texto);
  const resultado = n === null ? null : sentido === "usd" ? pesos(n * trm) : dolares(n / trm);

  return (
    <Panel titulo="Conversor (con la TRM)">
      <Segmentos opciones={SENTIDOS} valor={sentido} alCambiar={setSentido} dentroDePanel />
      <View style={styles.fila}>
        <Text style={{ color: c.tinta2, fontSize: 16 }}>{sentido === "usd" ? "US$" : "$"}</Text>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          keyboardType="decimal-pad"
          accessibilityLabel={sentido === "usd" ? "Cantidad en dólares" : "Cantidad en pesos"}
          style={[styles.entrada, { color: c.tinta, borderColor: c.borde, backgroundColor: c.fondo }]}
        />
      </View>
      <Text style={[styles.resultado, { color: c.tinta }]} accessibilityLiveRegion="polite">
        {resultado ?? "Escribe una cantidad"}
      </Text>
    </Panel>
  );
}

function Aviso({ texto }: { texto: string }) {
  const c = useColores();
  return (
    <View style={[styles.aviso, { backgroundColor: c.superficie, borderColor: c.borde }]} accessibilityLiveRegion="polite">
      <Text style={{ color: c.tinta2, fontSize: 13 }}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  valor: { fontSize: 44, fontFamily: fuente.tituloMedio },
  cambio: { flexDirection: "row", alignItems: "center", gap: espacio.s, marginTop: espacio.xs },
  fila: { flexDirection: "row", alignItems: "center", gap: espacio.s },
  entrada: { fontFamily: fuente.texto, flex: 1, borderWidth: 1, borderRadius: radio.s, paddingHorizontal: espacio.m, minHeight: 44, fontSize: 18 },
  resultado: { fontSize: 26, fontFamily: fuente.titulo },
  aviso: { marginHorizontal: espacio.l, padding: espacio.s, borderRadius: radio.s, borderWidth: 1 },
  fuente: { fontSize: 12, paddingHorizontal: espacio.l, lineHeight: 17 },
});
