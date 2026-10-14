// Noticias de Barranquilla y el Atlántico (acceso rápido): El Heraldo + Zona Cero, todas con foto.

import { StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import { Esqueleto, MensajeError } from "@/components/Estados";
import { TarjetaNoticia } from "@/components/noticias/TarjetaNoticia";
import { Pantalla } from "@/components/Pantalla";
import { Panel } from "@/components/Panel";
import { Segmentos } from "@/components/Segmentos";
import { useNoticias } from "@/hooks/useNoticias";
import { useRecordado } from "@/hooks/useRecordado";
import { ahoraLocal, formatoHoraMinutos } from "@/lib/clima/formato";
import { NOMBRE_FUENTE, type Zona } from "@/lib/noticias/fuentes";
import { espacio, radio, useColores } from "@/theme";

const ZONAS = [
  { clave: "barranquilla", titulo: "Barranquilla" },
  { clave: "atlantico", titulo: "Atlántico" },
] as const;

export default function Noticias() {
  const c = useColores();
  const [zona, setZona] = useRecordado<Zona>("noticias:zona", "barranquilla", ZONAS.map((z) => z.clave));
  const { data, error, isPending, isRefetching, refetch } = useNoticias(zona);
  // Referencia para "hace 2 h": la hora de la descarga (se renueva cada 15 min).
  const ahora = data?.obtenido ?? 0;

  return (
    <Pantalla bordeSuperior={false} alRefrescar={() => refetch()} refrescando={isRefetching} botonArriba>
      <Segmentos opciones={ZONAS} valor={zona} alCambiar={setZona} />

      {data?.guardado ? (
        <Aviso texto={`Sin conexión · noticias de las ${horaDelCelular(data.obtenido)}`} />
      ) : data && data.caidas.length > 0 ? (
        <Aviso texto={`No respondió: ${data.caidas.map((f) => NOMBRE_FUENTE[f]).join(", ")}. Se muestran las demás fuentes.`} />
      ) : null}

      {data ? (
        data.noticias.length === 0 ? (
          <Panel>
            <Text style={{ color: c.tinta2 }}>No hay noticias recientes de esta zona.</Text>
          </Panel>
        ) : (
          data.noticias.map((n) => <TarjetaNoticia key={n.id} n={n} ahora={ahora} />)
        )
      ) : error && !isPending ? (
        <MensajeError titulo="No se pudieron cargar las noticias" mensaje={error.message} alReintentar={() => refetch()} />
      ) : (
        [0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.esqueleto}>
            <Esqueleto alto={190} />
            <Esqueleto alto={18} />
            <Esqueleto alto={18} ancho="70%" />
          </View>
        ))
      )}

      <Text style={[styles.pie, { color: c.apagado }]}>
        Fuentes: El Heraldo y Zona Cero. Al tocar una noticia se abre en el sitio del medio.
      </Text>
    </Pantalla>
  );
}

/** "6:40 p. m." en la zona horaria del celular. */
function horaDelCelular(ms: number): string {
  return formatoHoraMinutos(ahoraLocal(-new Date(ms).getTimezoneOffset() * 60, ms));
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
  esqueleto: { gap: espacio.s, marginHorizontal: espacio.l },
  aviso: { marginHorizontal: espacio.l, padding: espacio.s, borderRadius: radio.s, borderWidth: 1 },
  pie: { fontSize: 12, paddingHorizontal: espacio.l },
});
