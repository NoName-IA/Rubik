// Lista para elegir la ciudad y luego el municipio (bienvenida y Usuario).

import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Presionable } from "@/components/Movimiento";
import { Text } from "@/components/Texto";
import { AREAS, buscarArea, buscarCiudad } from "@/lib/ciudades";
import { espacio, useColores } from "@/theme";

export function ListaCiudades({ elegida, alElegir }: { elegida: string | null; alElegir: (id: string) => void }) {
  const c = useColores();
  // Paso 1: la ciudad (área); paso 2: el municipio dentro de ella.
  const [idArea, setIdArea] = useState<string | null>(null);
  const area = buscarArea(idArea);
  const areaElegida = buscarCiudad(elegida)?.area ?? null;

  if (!area) {
    return (
      <View accessibilityRole="radiogroup">
        <Text style={[styles.paso, { color: c.tinta2 }]}>Elige la ciudad</Text>
        {AREAS.map((a, i) => (
          <Fila
            key={a.id}
            titulo={a.nombre}
            detalle={`${a.departamento} · ${a.municipios.length} municipios`}
            activa={a.id === areaElegida}
            separador={i > 0}
            flecha
            alTocar={() => setIdArea(a.id)}
          />
        ))}
      </View>
    );
  }

  return (
    <View accessibilityRole="radiogroup">
      <Presionable
        onPress={() => setIdArea(null)}
        accessibilityRole="button"
        accessibilityLabel="Volver a las ciudades"
        style={({ pressed }) => [styles.volver, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="chevron-back" size={18} color={c.enfasis} />
        <Text style={{ color: c.enfasis, fontWeight: "600" }}>Ciudades</Text>
      </Presionable>
      <Text style={[styles.paso, { color: c.tinta2 }]}>Elige el municipio · {area.nombre}</Text>
      {area.municipios.map((m, i) => (
        <Fila
          key={m.id}
          titulo={m.nombre}
          detalle={m.departamento}
          activa={m.id === elegida}
          separador={i > 0}
          alTocar={() => alElegir(m.id)}
        />
      ))}
    </View>
  );
}

function Fila({
  titulo,
  detalle,
  activa,
  separador,
  flecha = false,
  alTocar,
}: {
  titulo: string;
  detalle: string;
  activa: boolean;
  separador: boolean;
  flecha?: boolean;
  alTocar: () => void;
}) {
  const c = useColores();
  return (
    <Presionable
      onPress={alTocar}
      accessibilityRole={flecha ? "button" : "radio"}
      accessibilityState={flecha ? undefined : { checked: activa }}
      accessibilityLabel={`${titulo}, ${detalle}`}
      style={({ pressed }) => [
        styles.fila,
        separador && { borderTopColor: c.borde, borderTopWidth: StyleSheet.hairlineWidth },
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.tinta, fontSize: 15, fontWeight: activa ? "700" : "400" }}>{titulo}</Text>
        <Text style={{ color: c.tinta2, fontSize: 12 }}>{detalle}</Text>
      </View>
      {activa && !flecha ? <Ionicons name="checkmark-circle" size={22} color={c.enfasis} /> : null}
      {flecha ? <Ionicons name="chevron-forward" size={18} color={activa ? c.enfasis : c.tinta2} /> : null}
    </Presionable>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", minHeight: 52, paddingVertical: espacio.xs, gap: espacio.m },
  paso: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: espacio.xs },
  volver: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 40, alignSelf: "flex-start" },
});
