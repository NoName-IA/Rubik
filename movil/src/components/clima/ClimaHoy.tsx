// Clima › Hoy: condiciones actuales, datos del día y próximas 12 horas.

import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import { TarjetaAire } from "@/components/aire/TarjetaAire";
import { FranjaHoras } from "@/components/clima/FranjaHoras";
import { resumenDelDia, useObservacion } from "@/hooks/usePronostico";
import { Panel } from "@/components/Panel";
import { IconoTiempo } from "@/components/clima/IconoTiempo";
import { textoClima } from "@/lib/clima/codigos";
import { codigoActual } from "@/lib/clima/metar";
import { ahoraLocal, categoriaUv, formatoHoraMinutos, grados, haceCuanto, proximasHoras } from "@/lib/clima/formato";
import type { Pronostico } from "@/lib/clima/tipos";
import { espacio, fuente, radio, useColores } from "@/theme";

export function ClimaHoy({ p }: { p: Pronostico }) {
  const c = useColores();
  const hoy = p.dias.find((d) => d.fecha === ahoraLocal(p.desfaseUtc).slice(0, 10)) ?? p.dias[0];
  const horas = proximasHoras(p, 12);
  const a = p.actual;
  const obs = useObservacion();
  // Si el aeropuerto cercano contradice al pronóstico, se muestra lo que reporta.
  const codigo = codigoActual(a.codigo, obs);

  return (
    <>
      <Panel>
        <View style={styles.principal}>
          <IconoTiempo codigo={codigo} esDia={a.esDia} tamano={64} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.temperatura, { color: c.tinta }]} accessibilityLabel={`${Math.round(a.temperatura)} grados`}>
              {grados(a.temperatura)}
            </Text>
            <Text style={[styles.descripcion, { color: c.tinta }]}>{textoClima(codigo)}</Text>
          </View>
        </View>
        <Text style={[styles.frase, { color: c.tinta }]}>{resumenDelDia(p, null, obs).frase}</Text>
        <Text style={{ color: c.tinta2, fontSize: 15 }}>
          Se siente como <Text style={{ color: c.tinta, fontWeight: "700" }}>{grados(a.sensacion)}</Text>
          {hoy ? ` · Máx. ${grados(hoy.maxima)} · Mín. ${grados(hoy.minima)}` : ""}
        </Text>
      </Panel>

      <View style={styles.rejilla}>
        <Dato icono="water-outline" titulo="Humedad" valor={`${Math.round(a.humedad)} %`} />
        <Dato icono="flag-outline" titulo="Viento" valor={`${Math.round(a.viento)} km/h`} />
        <Dato
          icono="sunny-outline"
          titulo="Índice UV"
          valor={`${Math.round(a.uv)} · ${categoriaUv(a.uv)}`}
          pie={hoy ? `Máx. hoy ${Math.round(hoy.uvMax)} (${categoriaUv(hoy.uvMax)})` : undefined}
        />
        <Dato
          icono="umbrella-outline"
          titulo="Lluvia hoy"
          valor={hoy?.probabilidad != null ? `${hoy.probabilidad} %` : "—"}
          pie={hoy ? `${hoy.mm.toFixed(1).replace(".", ",")} mm en el día` : undefined}
        />
      </View>

      <TarjetaAire />

      <Panel titulo="Próximas 12 horas">
        <FranjaHoras horas={horas} primeraEsAhora />
      </Panel>

      <View style={styles.pie}>
        {hoy ? (
          <Text style={[styles.pieTexto, { color: c.tinta2 }]}>
            Amanecer {formatoHoraMinutos(hoy.amanecer)} · Atardecer {formatoHoraMinutos(hoy.atardecer)}
          </Text>
        ) : null}
        <Text style={[styles.pieTexto, { color: c.apagado }]}>
          Actualizado {haceCuanto(p.obtenido)} · Pronóstico de Open-Meteo
        </Text>
      </View>
    </>
  );
}

function Dato({
  icono,
  titulo,
  valor,
  pie,
}: {
  icono: ComponentProps<typeof Ionicons>["name"];
  titulo: string;
  valor: string;
  pie?: string;
}) {
  const c = useColores();
  return (
    <View style={[styles.dato, { backgroundColor: c.superficie, borderColor: c.borde }]} accessible>
      <View style={styles.datoTitulo}>
        <Ionicons name={icono} size={16} color={c.tinta2} />
        <Text style={{ color: c.tinta2, fontSize: 13 }}>{titulo}</Text>
      </View>
      <Text style={[styles.datoValor, { color: c.tinta }]}>{valor}</Text>
      {pie ? <Text style={{ color: c.tinta2, fontSize: 12 }}>{pie}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  principal: { flexDirection: "row", alignItems: "center", gap: espacio.l },
  temperatura: { fontSize: 56, fontFamily: fuente.tituloMedio, lineHeight: 64 },
  descripcion: { fontSize: 18, fontWeight: "600" },
  frase: { fontSize: 15, lineHeight: 21 },
  rejilla: { flexDirection: "row", flexWrap: "wrap", gap: espacio.m, paddingHorizontal: espacio.l },
  dato: {
    flexGrow: 1,
    flexBasis: "45%",
    padding: espacio.m,
    borderRadius: radio.m,
    borderWidth: 1,
    gap: espacio.xs,
  },
  datoTitulo: { flexDirection: "row", alignItems: "center", gap: espacio.xs },
  datoValor: { fontSize: 20, fontWeight: "700" },
  pie: { paddingHorizontal: espacio.l, gap: 2 },
  pieTexto: { fontSize: 12 },
});
