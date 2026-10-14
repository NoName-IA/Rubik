// Primer arranque: 1) el nombre para el saludo, 2) la ubicación (GPS o elegir ciudad),
// explicando para qué se pide antes del diálogo de Android.

import Ionicons from "@expo/vector-icons/Ionicons";
import { type ReactNode, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Presionable } from "@/components/Movimiento";
import { Text } from "@/components/Texto";
import { Fondo } from "@/components/Fondo";
import { ListaCiudades } from "@/components/ListaCiudades";
import { usePreferencias } from "@/contexto/Preferencias";
import { useUbicacion } from "@/contexto/Ubicacion";
import { espacio, fuente, radio, useColores } from "@/theme";

type Paso = "nombre" | "ubicacion" | "ciudad";

export function Bienvenida() {
  const c = useColores();
  const { pedirPermiso, terminarBienvenida } = useUbicacion();
  const { preferencias, cambiar } = usePreferencias();
  const [paso, setPaso] = useState<Paso>("nombre");
  const [nombre, setNombre] = useState(preferencias.nombre);
  const [pidiendo, setPidiendo] = useState(false);

  const usarGps = async () => {
    setPidiendo(true);
    cambiar({ ubicacion: "gps" });
    try {
      await pedirPermiso();
    } finally {
      await terminarBienvenida();
    }
  };

  const elegirCiudad = async (ciudad: string) => {
    cambiar({ ubicacion: "ciudad", ciudad });
    await terminarBienvenida();
  };

  if (paso === "nombre") {
    return (
      <Marco>
        <View style={styles.centro}>
          <Icono nombre="person" />
          <Text style={[styles.titulo, { color: c.tinta }]} accessibilityRole="header">
            ¡Hola! ¿Cómo te llamas?
          </Text>
          <Text style={[styles.texto, { color: c.tinta2 }]}>Para saludarte en Inicio. Es opcional y queda solo en tu celular.</Text>
          <TextInput
            value={nombre}
            onChangeText={(t) => setNombre(t.slice(0, 30))}
            placeholder="Tu nombre"
            placeholderTextColor={c.apagado}
            autoCapitalize="words"
            maxLength={30}
            returnKeyType="next"
            onSubmitEditing={() => {
              cambiar({ nombre: nombre.trim() });
              setPaso("ubicacion");
            }}
            accessibilityLabel="Tu nombre"
            style={[styles.entrada, { color: c.tinta, borderColor: c.borde, backgroundColor: c.superficie }]}
          />
        </View>
        <Boton
          texto={nombre.trim() ? "Continuar" : "Omitir"}
          alTocar={() => {
            cambiar({ nombre: nombre.trim() });
            setPaso("ubicacion");
          }}
        />
      </Marco>
    );
  }

  if (paso === "ciudad") {
    return (
      <Marco>
        <Text style={[styles.titulo, { color: c.tinta, marginBottom: espacio.s }]} accessibilityRole="header">
          Elige tu ciudad
        </Text>
        <ScrollView style={{ flex: 1 }}>
          <ListaCiudades elegida={null} alElegir={elegirCiudad} />
        </ScrollView>
        <Presionable onPress={() => setPaso("ubicacion")} accessibilityRole="button" style={styles.botonSecundario}>
          <Text style={[styles.textoSecundario, { color: c.enfasis }]}>Volver</Text>
        </Presionable>
      </Marco>
    );
  }

  return (
    <Marco>
      <View style={styles.centro}>
        <Icono nombre="location" />
        <Text style={[styles.titulo, { color: c.tinta }]} accessibilityRole="header">
          {preferencias.nombre ? `${preferencias.nombre}, ¿dónde` : "¿Dónde"} quieres el pronóstico?
        </Text>
        <Text style={[styles.texto, { color: c.tinta2 }]}>
          Con tu ubicación te mostramos la lluvia y el clima del lugar donde estás, no de toda la ciudad.
        </Text>
        <Text style={[styles.nota, { color: c.apagado }]}>
          Solo se usa con la app abierta y no sale de tu celular, salvo las coordenadas que se envían al servicio
          del pronóstico (Open-Meteo). Puedes cambiarlo después en Usuario.
        </Text>
      </View>
      <View style={styles.botones}>
        <Boton texto="Usar mi ubicación (GPS)" alTocar={usarGps} cargando={pidiendo} />
        <Presionable onPress={() => setPaso("ciudad")} accessibilityRole="button" style={styles.botonSecundario}>
          <Text style={[styles.textoSecundario, { color: c.enfasis }]}>Elegir mi ciudad</Text>
        </Presionable>
      </View>
    </Marco>
  );
}

function Marco({ children }: { children: ReactNode }) {
  const c = useColores();
  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Fondo />
      <SafeAreaView style={styles.raiz}>{children}</SafeAreaView>
    </View>
  );
}

function Icono({ nombre }: { nombre: "person" | "location" }) {
  const c = useColores();
  return (
    <View style={[styles.icono, { backgroundColor: c.enfasisSuave }]}>
      <Ionicons name={nombre} size={44} color={c.enfasis} />
    </View>
  );
}

function Boton({ texto, alTocar, cargando = false }: { texto: string; alTocar: () => void; cargando?: boolean }) {
  const c = useColores();
  return (
    <Presionable
      onPress={alTocar}
      disabled={cargando}
      accessibilityRole="button"
      style={({ pressed }) => [styles.boton, { backgroundColor: c.enfasis, opacity: pressed ? 0.8 : 1 }]}
    >
      {cargando ? (
        <ActivityIndicator color={c.sobreEnfasis} />
      ) : (
        <Text style={[styles.textoBoton, { color: c.sobreEnfasis }]}>{texto}</Text>
      )}
    </Presionable>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, padding: espacio.xl, justifyContent: "space-between" },
  centro: { flex: 1, justifyContent: "center", alignItems: "center", gap: espacio.l },
  icono: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  titulo: { fontSize: 28, fontFamily: fuente.titulo, textAlign: "center" },
  texto: { fontSize: 16, textAlign: "center", lineHeight: 23 },
  nota: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  entrada: { fontFamily: fuente.texto, alignSelf: "stretch", borderWidth: 1, borderRadius: radio.m, paddingHorizontal: espacio.l, minHeight: 52, fontSize: 18 },
  botones: { gap: espacio.s },
  boton: { minHeight: 52, borderRadius: radio.m, alignItems: "center", justifyContent: "center" },
  textoBoton: { fontSize: 16, fontWeight: "700" },
  botonSecundario: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  textoSecundario: { fontSize: 15, fontWeight: "600" },
});
