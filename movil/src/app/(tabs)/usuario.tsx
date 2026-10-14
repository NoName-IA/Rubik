// Usuario: preferencias guardadas en el celular (sin cuenta ni inicio de sesión).

import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { Presionable } from "@/components/Movimiento";
import { Text } from "@/components/Texto";
import { ListaCiudades } from "@/components/ListaCiudades";
import { Pantalla } from "@/components/Pantalla";
import { Panel } from "@/components/Panel";
import { Segmentos } from "@/components/Segmentos";
import { usePreferencias } from "@/contexto/Preferencias";
import { useUbicacion } from "@/contexto/Ubicacion";
import { usePermisoAvisos } from "@/hooks/useAvisos";
import { buscarCiudad, CIUDAD_INICIAL } from "@/lib/ciudades";
import { espacio, fuente, radio, useColores } from "@/theme";

const UBICACIONES = [
  { clave: "gps", titulo: "Mi ubicación (GPS)" },
  { clave: "ciudad", titulo: "Elegir ciudad" },
] as const;

const TEMAS = [
  { clave: "sistema", titulo: "Sistema" },
  { clave: "claro", titulo: "Claro" },
  { clave: "oscuro", titulo: "Oscuro" },
] as const;

export default function Usuario() {
  const c = useColores();
  const { preferencias: p, cambiar } = usePreferencias();
  const { permiso, pedirPermiso, origen, nombre: lugar } = useUbicacion();
  const permisoAvisos = usePermisoAvisos();

  return (
    <Pantalla titulo="Usuario" subtitulo="Tus preferencias se guardan solo en este celular.">
      <Panel titulo="Tu nombre">
        <TextInput
          value={p.nombre}
          onChangeText={(nombre) => cambiar({ nombre: nombre.slice(0, 30) })}
          placeholder="Opcional, para el saludo de Inicio"
          placeholderTextColor={c.apagado}
          autoCapitalize="words"
          maxLength={30}
          accessibilityLabel="Tu nombre"
          style={[styles.entrada, { color: c.tinta, borderColor: c.borde, backgroundColor: c.fondo }]}
        />
      </Panel>

      <Panel titulo="Ubicación">
        <Segmentos opciones={UBICACIONES} valor={p.ubicacion} alCambiar={(ubicacion) => cambiar({ ubicacion })} dentroDePanel />
        <Text style={[styles.nota, { color: c.tinta2 }]}>
          {p.ubicacion === "ciudad"
            ? `Pronóstico y aire de ${lugar}. La app no usa el GPS.`
            : origen === "gps"
              ? `Pronóstico de donde estás: ${lugar}.`
              : permiso === "denegado"
                ? `No hay permiso de ubicación: se usa ${lugar}.`
                : `Aún no hay ubicación: se usa ${lugar}.`}
        </Text>
        {p.ubicacion === "gps" && origen !== "gps" ? (
          <Presionable onPress={pedirPermiso} accessibilityRole="button" style={styles.boton}>
            <Text style={{ color: c.enfasis, fontWeight: "600" }}>
              {permiso === "denegado" ? "Dar permiso de ubicación" : "Usar mi ubicación"}
            </Text>
          </Presionable>
        ) : null}
        {p.ubicacion === "ciudad" ? <ElegirCiudad elegida={p.ciudad} alElegir={(ciudad) => cambiar({ ciudad })} /> : null}
      </Panel>

      {permisoAvisos.estado && permisoAvisos.estado !== "concedido" ? (
        <Panel titulo="Notificaciones">
          <Text style={[styles.nota, { color: c.tinta2 }]}>
            {permisoAvisos.estado === "denegado"
              ? "Las notificaciones están bloqueadas para Rubik en los ajustes del celular."
              : "Falta el permiso para avisarte de lluvia, arroyos, calor y aire limpio."}
          </Text>
          <Presionable onPress={permisoAvisos.pedir} accessibilityRole="button" style={styles.boton}>
            <Text style={{ color: c.enfasis, fontWeight: "600" }}>
              {permisoAvisos.estado === "denegado" ? "Abrir ajustes" : "Permitir notificaciones"}
            </Text>
          </Presionable>
        </Panel>
      ) : null}

      <Panel titulo="Tema">
        <Segmentos opciones={TEMAS} valor={p.tema} alCambiar={(tema) => cambiar({ tema })} dentroDePanel />
      </Panel>

      <Panel titulo="Acerca de">
        <Text style={[styles.nota, { color: c.tinta2 }]}>
          Pronóstico: Open-Meteo. Calidad del aire: CAMS (Copernicus) vía Open-Meteo. Dólar: TRM de la
          Superintendencia Financiera (datos.gov.co). Noticias: El Heraldo y Zona Cero; cada nota se abre en el
          sitio del medio.
        </Text>
        <Text style={[styles.nota, { color: c.apagado }]}>
          {Constants.expoConfig?.name ?? "Rubik"} · versión {Constants.expoConfig?.version ?? "—"}
        </Text>
      </Panel>
    </Pantalla>
  );
}

/** La ciudad elegida en una fila; la lista completa se despliega solo al tocar "Cambiar" y se cierra al elegir. */
function ElegirCiudad({ elegida, alElegir }: { elegida: string; alElegir: (id: string) => void }) {
  const c = useColores();
  const [abierta, setAbierta] = useState(false);
  const ciudad = buscarCiudad(elegida) ?? CIUDAD_INICIAL;

  if (abierta) {
    return (
      <ListaCiudades
        elegida={elegida}
        alElegir={(id) => {
          alElegir(id);
          setAbierta(false);
        }}
      />
    );
  }
  return (
    <Presionable
      onPress={() => setAbierta(true)}
      accessibilityRole="button"
      accessibilityLabel={`Ciudad: ${ciudad.nombre}, ${ciudad.departamento}. Cambiar`}
      style={[styles.ciudad, { borderColor: c.borde, backgroundColor: c.fondo }]}
    >
      <Ionicons name="location-outline" size={20} color={c.enfasis} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.tinta, fontSize: 15, fontWeight: "700" }}>{ciudad.nombre}</Text>
        <Text style={{ color: c.tinta2, fontSize: 12 }}>{ciudad.departamento}</Text>
      </View>
      <Text style={{ color: c.enfasis, fontWeight: "600" }}>Cambiar</Text>
    </Presionable>
  );
}

const styles = StyleSheet.create({
  entrada: { fontFamily: fuente.texto, borderWidth: 1, borderRadius: radio.s, paddingHorizontal: espacio.m, minHeight: 44, fontSize: 16 },
  nota: { fontSize: 13, lineHeight: 18 },
  boton: { minHeight: 40, justifyContent: "center" },
  ciudad: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.m,
    minHeight: 52,
    paddingHorizontal: espacio.m,
    borderWidth: 1,
    borderRadius: radio.s,
  },
});
