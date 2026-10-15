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
import { useIaDesbloqueada } from "@/hooks/useVictoriasRubo";
import { buscarArea, buscarCiudad, CIUDAD_INICIAL } from "@/lib/ciudades";
import { type Paleta, PALETAS, TEMAS } from "@/lib/temas";
import { espacio, fuente, radio, useColores, useOscuro } from "@/theme";

const UBICACIONES = [
  { clave: "gps", titulo: "Mi ubicación (GPS)" },
  { clave: "ciudad", titulo: "Elegir ciudad" },
] as const;

const RUBOKILL = [
  { clave: "no", titulo: "Desactivado" },
  { clave: "si", titulo: "Activado" },
] as const;

const MODOS = [
  { clave: "sistema", titulo: "Sistema" },
  { clave: "claro", titulo: "Claro" },
  { clave: "oscuro", titulo: "Oscuro" },
] as const;

export default function Usuario() {
  const c = useColores();
  const { preferencias: p, cambiar } = usePreferencias();
  const { permiso, pedirPermiso, origen, nombre: lugar } = useUbicacion();
  const permisoAvisos = usePermisoAvisos();
  // RuboKill solo aparece cuando ya desbloqueaste el modo IA del Rubo (2 victorias en normal).
  const iaDesbloqueada = useIaDesbloqueada();

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
              : "Falta el permiso para avisarte de lluvia, calor y aire limpio."}
          </Text>
          <Presionable onPress={permisoAvisos.pedir} accessibilityRole="button" style={styles.boton}>
            <Text style={{ color: c.enfasis, fontWeight: "600" }}>
              {permisoAvisos.estado === "denegado" ? "Abrir ajustes" : "Permitir notificaciones"}
            </Text>
          </Presionable>
        </Panel>
      ) : null}

      <Panel titulo="Tema">
        <MuestrasTema elegida={p.paleta} alElegir={(paleta) => cambiar({ paleta })} />
        <Segmentos opciones={MODOS} valor={p.tema} alCambiar={(tema) => cambiar({ tema })} dentroDePanel />
      </Panel>

      {iaDesbloqueada ? (
        <Panel titulo="RuboKill">
          <Segmentos
            opciones={RUBOKILL}
            valor={p.rubokill ? "si" : "no"}
            alCambiar={(v) => cambiar({ rubokill: v === "si" })}
            dentroDePanel
          />
          <Text style={[styles.nota, { color: c.tinta2 }]}>RuboKill...</Text>
        </Panel>
      ) : null}

      <Panel titulo="Acerca de">
        <Text style={[styles.nota, { color: c.tinta2 }]}>Versión {Constants.expoConfig?.version ?? "—"}</Text>
      </Panel>
    </Pantalla>
  );
}

/**
 * Los temas de color como muestras: una mini tarjeta con el fondo, el acento y un botón de cada tema
 * (en el modo claro u oscuro que se esté usando). Tocar una la aplica al instante.
 */
function MuestrasTema({ elegida, alElegir }: { elegida: Paleta; alElegir: (p: Paleta) => void }) {
  const c = useColores();
  const oscuro = useOscuro();
  return (
    <View style={styles.muestras} accessibilityRole="radiogroup">
      {PALETAS.map((paleta) => {
        const t = TEMAS[paleta][oscuro ? "oscuro" : "claro"];
        const activa = paleta === elegida;
        return (
          <Presionable
            key={paleta}
            onPress={() => alElegir(paleta)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={`Tema ${TEMAS[paleta].nombre}`}
            style={styles.muestra}
          >
            <View
              style={[
                styles.miniatura,
                { backgroundColor: t.fondo, borderColor: activa ? c.enfasis : c.borde, borderWidth: activa ? 2 : 1 },
              ]}
            >
              <View style={[styles.miniTarjeta, { backgroundColor: t.superficie, borderColor: t.borde }]}>
                <View style={[styles.miniLinea, { backgroundColor: t.tinta2 }]} />
                <View style={[styles.miniBoton, { backgroundColor: t.enfasis }]} />
              </View>
              {activa ? (
                <View style={[styles.marca, { backgroundColor: c.enfasis }]}>
                  <Ionicons name="checkmark" size={12} color={c.sobreEnfasis} />
                </View>
              ) : null}
            </View>
            <Text style={[styles.nombreTema, { color: activa ? c.tinta : c.tinta2 }]} numberOfLines={1}>
              {TEMAS[paleta].nombre}
            </Text>
          </Presionable>
        );
      })}
    </View>
  );
}

/** La ciudad elegida en una fila; la lista completa se despliega solo al tocar "Cambiar" y se cierra al elegir. */
function ElegirCiudad({ elegida, alElegir }: { elegida: string; alElegir: (id: string) => void }) {
  const c = useColores();
  const [abierta, setAbierta] = useState(false);
  const ciudad = buscarCiudad(elegida) ?? CIUDAD_INICIAL;
  const area = buscarArea(ciudad.area);
  // Un municipio que no es la ciudad misma dice a qué ciudad pertenece.
  const detalle = area && area.id !== ciudad.id ? `${area.nombre} · ${ciudad.departamento}` : ciudad.departamento;

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
      accessibilityLabel={`Municipio: ${ciudad.nombre}, ${detalle}. Cambiar`}
      style={[styles.ciudad, { borderColor: c.borde, backgroundColor: c.fondo }]}
    >
      <Ionicons name="location-outline" size={20} color={c.enfasis} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.tinta, fontSize: 15, fontWeight: "700" }}>{ciudad.nombre}</Text>
        <Text style={{ color: c.tinta2, fontSize: 12 }}>{detalle}</Text>
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
  // Muestras de tema: 5 en una fila (si no caben, bajan a la siguiente).
  muestras: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: espacio.m },
  muestra: { width: 56, alignItems: "center", gap: espacio.xs },
  miniatura: { width: 52, height: 64, borderRadius: radio.s, padding: 6, justifyContent: "flex-end" },
  miniTarjeta: { borderRadius: 4, borderWidth: 1, padding: 4, gap: 4 },
  miniLinea: { height: 3, width: "70%", borderRadius: 2 },
  miniBoton: { height: 8, borderRadius: 3 },
  marca: { position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  nombreTema: { fontSize: 11 },
});
