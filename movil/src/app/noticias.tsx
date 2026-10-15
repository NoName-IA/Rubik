// Noticias locales (acceso rápido) según la ubicación: en Barranquilla, El Heraldo + Zona Cero (todas
// con foto) de Barranquilla y el Atlántico; en otro lugar, Bing y Google Noticias del municipio y del departamento.

import { StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import { Esqueleto, MensajeError } from "@/components/Estados";
import { TarjetaNoticia } from "@/components/noticias/TarjetaNoticia";
import { Pantalla } from "@/components/Pantalla";
import { Panel } from "@/components/Panel";
import { Segmentos } from "@/components/Segmentos";
import { useNoticias, useZonasNoticias } from "@/hooks/useNoticias";
import { useRecordado } from "@/hooks/useRecordado";
import { deCuando } from "@/lib/clima/formato";
import { espacio, radio, useColores } from "@/theme";


export default function Noticias() {
  const c = useColores();
  const zonas = useZonasNoticias();
  const [clave, setClave] = useRecordado<"cerca" | "region">("noticias:alcance", "cerca", ["cerca", "region"]);
  const zona = zonas.find((z) => z.clave === clave) ?? zonas[0];
  const { data, error, isPending, isRefetching, refetch } = useNoticias(zona.destino);
  // Referencia para "hace 2 h": la hora de la descarga (se renueva cada 15 min).
  const ahora = data?.obtenido ?? 0;

  return (
    <Pantalla bordeSuperior={false} alRefrescar={() => refetch()} refrescando={isRefetching} botonArriba>
      {zonas.length > 1 ? <Segmentos opciones={zonas} valor={zona.clave} alCambiar={setClave} /> : null}

      {data?.guardado ? (
        <Aviso texto={`Sin conexión · noticias ${deCuando(data.obtenido, -new Date(data.obtenido).getTimezoneOffset() * 60)}`} />
      ) : data && data.caidas.length > 0 ? (
        <Aviso texto={"Algunas noticias no se pudieron cargar. Se muestran las demás."} />
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
        Al tocar una noticia se abre en el sitio del medio.
      </Text>
    </Pantalla>
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
  esqueleto: { gap: espacio.s, marginHorizontal: espacio.l },
  aviso: { marginHorizontal: espacio.l, padding: espacio.s, borderRadius: radio.s, borderWidth: 1 },
  pie: { fontSize: 12, paddingHorizontal: espacio.l },
});
