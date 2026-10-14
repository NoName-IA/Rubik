// Franja horizontal de horas: hora, ícono, temperatura y probabilidad de lluvia.

import { ScrollView, StyleSheet, View } from "react-native";

import { IconoTiempo } from "@/components/clima/IconoTiempo";
import { Text } from "@/components/Texto";
import { textoClima } from "@/lib/clima/codigos";
import { formatoHora, grados } from "@/lib/clima/formato";
import type { Hora } from "@/lib/clima/tipos";
import { espacio, useColores } from "@/theme";

export function FranjaHoras({ horas, primeraEsAhora = false }: { horas: Hora[]; primeraEsAhora?: boolean }) {
  const c = useColores();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horas}>
      {horas.map((h, i) => {
        const etiqueta = primeraEsAhora && i === 0 ? "Ahora" : formatoHora(h.hora);
        return (
          <View
            key={h.hora}
            style={styles.hora}
            accessible
            accessibilityLabel={`${etiqueta}: ${Math.round(h.temperatura)} grados, ${textoClima(h.codigo)}, probabilidad de lluvia ${h.probabilidad ?? 0} por ciento`}
          >
            <Text style={[styles.horaTexto, { color: c.tinta2 }]}>{etiqueta}</Text>
            <IconoTiempo codigo={h.codigo} esDia={h.esDia} tamano={28} />
            <Text style={[styles.horaTemp, { color: c.tinta }]}>{grados(h.temperatura)}</Text>
            <Text style={[styles.horaLluvia, { color: (h.probabilidad ?? 0) >= 50 ? c.enfasis : c.apagado }]}>
              {h.probabilidad ?? 0} %
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  horas: { gap: espacio.l, paddingVertical: espacio.xs },
  hora: { alignItems: "center", gap: espacio.xs, minWidth: 48 },
  horaTexto: { fontSize: 13 },
  horaTemp: { fontSize: 16, fontWeight: "600" },
  horaLluvia: { fontSize: 12, fontWeight: "600" },
});
