// Clima › 7 días: una fila por día; al tocarla se despliegan sus horas.

import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Presionable } from "@/components/Movimiento";
import { Text } from "@/components/Texto";
import { FranjaHoras } from "@/components/clima/FranjaHoras";
import { Panel } from "@/components/Panel";
import { IconoTiempo } from "@/components/clima/IconoTiempo";
import { textoClima } from "@/lib/clima/codigos";
import { ahoraLocal, grados, proximasHoras } from "@/lib/clima/formato";
import { horasDelDia, milimetros, rangoSemana } from "@/lib/clima/lluvia";
import type { Pronostico } from "@/lib/clima/tipos";
import { nombreDia } from "@/lib/fecha";
import { espacio, useColores } from "@/theme";

export function Semana({ p }: { p: Pronostico }) {
  const c = useColores();
  const hoy = ahoraLocal(p.desfaseUtc).slice(0, 10);
  const dias = p.dias.filter((d) => d.fecha >= hoy);
  const { min, max } = rangoSemana(dias);
  const [abierto, setAbierto] = useState<string | null>(null);

  return (
    <Panel titulo="Próximos 7 días">
      {dias.map((d, i) => {
        const nombre = nombreDia(d.fecha, hoy);
        const prob = d.probabilidad ?? 0;
        const desde = ((d.minima - min) / (max - min)) * 100;
        const hasta = ((d.maxima - min) / (max - min)) * 100;
        const estaAbierto = abierto === d.fecha;
        // Hoy: solo las horas que faltan.
        const horas = d.fecha === hoy ? proximasHoras(p, 24).filter((h) => h.hora.startsWith(hoy)) : horasDelDia(p, d.fecha);
        return (
          <View key={d.fecha} style={i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borde }}>
            <Presionable
              onPress={() => setAbierto(estaAbierto ? null : d.fecha)}
              accessibilityRole="button"
              accessibilityState={{ expanded: estaAbierto }}
              accessibilityLabel={`${nombre}: ${textoClima(d.codigo)}, mínima ${Math.round(d.minima)}, máxima ${Math.round(d.maxima)} grados, probabilidad de lluvia ${prob} por ciento, ${milimetros(d.mm)}`}
              style={({ pressed }) => [styles.fila, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.nombre, { color: c.tinta }]} numberOfLines={1}>
                {nombre}
              </Text>
              <IconoTiempo codigo={d.codigo} tamano={26} />
              <View style={styles.lluvia}>
                <Text style={[styles.prob, { color: prob >= 50 ? c.enfasis : c.apagado }]}>{prob} %</Text>
                <Text style={{ color: c.apagado, fontSize: 11 }}>{d.mm >= 0.1 ? milimetros(d.mm) : " "}</Text>
              </View>
              <Text style={[styles.temp, { color: c.tinta2 }]}>{grados(d.minima)}</Text>
              <View style={[styles.pista, { backgroundColor: c.borde }]}>
                <View style={[styles.rango, { left: `${desde}%`, width: `${Math.max(hasta - desde, 4)}%`, backgroundColor: c.enfasis }]} />
              </View>
              <Text style={[styles.temp, { color: c.tinta, fontWeight: "700" }]}>{grados(d.maxima)}</Text>
              <Ionicons name={estaAbierto ? "chevron-up" : "chevron-down"} size={16} color={c.apagado} />
            </Presionable>
            {estaAbierto ? (
              <View style={styles.detalle}>
                <Text style={{ color: c.tinta2, fontSize: 13 }}>{textoClima(d.codigo)}</Text>
                {horas.length > 0 ? <FranjaHoras horas={horas} /> : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </Panel>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", gap: espacio.s, minHeight: 56 },
  nombre: { width: 92, fontSize: 15, fontWeight: "600" },
  lluvia: { width: 54, alignItems: "flex-start" },
  prob: { fontSize: 13, fontWeight: "700" },
  temp: { width: 32, fontSize: 15, textAlign: "center" },
  pista: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  rango: { position: "absolute", top: 0, bottom: 0, borderRadius: 3 },
  detalle: { paddingBottom: espacio.m, gap: espacio.s },
});
