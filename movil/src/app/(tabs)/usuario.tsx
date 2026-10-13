// Usuario: preferencias guardadas en el celular (sin cuenta ni inicio de sesión).

import Constants from "expo-constants";
import { Pressable, StyleSheet, Switch, TextInput, View } from "react-native";

import { Text } from "@/components/Texto";
import { ListaCiudades } from "@/components/ListaCiudades";
import { Pantalla } from "@/components/Pantalla";
import { Panel } from "@/components/Panel";
import { Segmentos } from "@/components/Segmentos";
import { usePreferencias } from "@/contexto/Preferencias";
import { useUbicacion } from "@/contexto/Ubicacion";
import { usePermisoAvisos } from "@/hooks/useAvisos";
import { NIVELES_ARROYOS, type SensibilidadArroyos } from "@/lib/preferencias";
import { espacio, fuente, radio, useColores } from "@/theme";

const UBICACIONES = [
  { clave: "gps", titulo: "Mi ubicación (GPS)" },
  { clave: "ciudad", titulo: "Elegir ciudad" },
] as const;

const SENSIBILIDADES = (Object.keys(NIVELES_ARROYOS) as SensibilidadArroyos[]).map((clave) => ({
  clave,
  titulo: NIVELES_ARROYOS[clave].nombre,
}));

const TEMAS = [
  { clave: "sistema", titulo: "Sistema" },
  { clave: "claro", titulo: "Claro" },
  { clave: "oscuro", titulo: "Oscuro" },
] as const;

export default function Usuario() {
  const c = useColores();
  const { preferencias: p, cambiar } = usePreferencias();
  const { permiso, pedirPermiso, origen, nombre: lugar, arroyos } = useUbicacion();
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
          <Pressable onPress={pedirPermiso} accessibilityRole="button" style={styles.boton}>
            <Text style={{ color: c.enfasis, fontWeight: "600" }}>
              {permiso === "denegado" ? "Dar permiso de ubicación" : "Usar mi ubicación"}
            </Text>
          </Pressable>
        ) : null}
        {p.ubicacion === "ciudad" ? <ListaCiudades elegida={p.ciudad} alElegir={(ciudad) => cambiar({ ciudad })} /> : null}
      </Panel>

      <Panel titulo="Alerta de arroyos">
        {arroyos ? (
          <>
            <Segmentos opciones={SENSIBILIDADES} valor={p.arroyos} alCambiar={(a) => cambiar({ arroyos: a })} dentroDePanel />
            <Text style={[styles.nota, { color: c.tinta2 }]}>{NIVELES_ARROYOS[p.arroyos].descripcion}</Text>
          </>
        ) : (
          <Text style={[styles.nota, { color: c.tinta2 }]}>
            Los arroyos son propios del área metropolitana de Barranquilla (Barranquilla, Soledad, Malambo, Puerto
            Colombia y Galapa). En {lugar} la alerta no aplica.
          </Text>
        )}
      </Panel>

      <Panel titulo="Notificaciones">
        <Interruptor
          titulo="Antes de que llueva"
          detalle="30 minutos antes, entre 6 a. m. y 10 p. m."
          valor={p.avisos.lluvia}
          alCambiar={(lluvia) => cambiar((x) => ({ ...x, avisos: { ...x.avisos, lluvia } }))}
        />
        {arroyos ? (
          <Interruptor
            titulo="Riesgo de arroyos"
            detalle="1 hora antes, a cualquier hora, con la sensibilidad de arriba."
            valor={p.avisos.arroyos}
            alCambiar={(a) => cambiar((x) => ({ ...x, avisos: { ...x.avisos, arroyos: a } }))}
          />
        ) : null}
        {(p.avisos.lluvia || (arroyos && p.avisos.arroyos)) && permisoAvisos.estado && permisoAvisos.estado !== "concedido" ? (
          <>
            <Text style={[styles.nota, { color: c.tinta2 }]}>
              {permisoAvisos.estado === "denegado"
                ? "Las notificaciones están bloqueadas para Rubik en los ajustes del celular."
                : "Falta el permiso para mostrar notificaciones."}
            </Text>
            <Pressable onPress={permisoAvisos.pedir} accessibilityRole="button" style={styles.boton}>
              <Text style={{ color: c.enfasis, fontWeight: "600" }}>
                {permisoAvisos.estado === "denegado" ? "Abrir ajustes" : "Permitir notificaciones"}
              </Text>
            </Pressable>
          </>
        ) : null}
      </Panel>

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

function Interruptor({ titulo, detalle, valor, alCambiar }: { titulo: string; detalle: string; valor: boolean; alCambiar: (v: boolean) => void }) {
  const c = useColores();
  return (
    <View style={styles.fila}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.tinta, fontWeight: "600" }}>{titulo}</Text>
        <Text style={[styles.nota, { color: c.tinta2 }]}>{detalle}</Text>
      </View>
      <Switch
        value={valor}
        onValueChange={alCambiar}
        accessibilityLabel={titulo}
        trackColor={{ false: c.borde, true: c.enfasis }}
        thumbColor={c.tinta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  entrada: { fontFamily: fuente.texto, borderWidth: 1, borderRadius: radio.s, paddingHorizontal: espacio.m, minHeight: 44, fontSize: 16 },
  nota: { fontSize: 13, lineHeight: 18 },
  boton: { minHeight: 40, justifyContent: "center" },
  fila: { flexDirection: "row", alignItems: "center", gap: espacio.m, minHeight: 48 },
});
