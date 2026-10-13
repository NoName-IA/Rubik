// Inicio: resumen del día y accesos rápidos.

import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/Texto";
import { CategoriaIca } from "@/components/aire/CategoriaIca";
import { AvisoSinConexion } from "@/components/clima/Avisos";
import { Carrusel } from "@/components/Carrusel";
import { Encabezado } from "@/components/Encabezado";
import { LineaUbicacion } from "@/components/LineaUbicacion";
import { abrirNoticia } from "@/components/noticias/TarjetaNoticia";
import { Pantalla } from "@/components/Pantalla";
import { Panel } from "@/components/Panel";
import { usePreferencias } from "@/contexto/Preferencias";
import { useAire } from "@/hooks/useAire";
import { useDolar } from "@/hooks/useDolar";
import { useNoticias } from "@/hooks/useNoticias";
import { resumenDelDia, usePronostico } from "@/hooks/usePronostico";
import { ACCESOS } from "@/lib/accesos";
import { categoria } from "@/lib/aire/ica";
import { promedio24h } from "@/lib/aire/openMeteoAire";
import { iconoClima, textoClima } from "@/lib/clima/codigos";
import { grados } from "@/lib/clima/formato";
import { hoyColombia, pesos, porcentaje, vigente } from "@/lib/dolar";
import { fechaLarga, saludo } from "@/lib/fecha";
import { antiguedad } from "@/lib/noticias/combinar";
import { conNombre } from "@/lib/preferencias";
import { espacio, useColores } from "@/theme";

export default function Inicio() {
  const c = useColores();
  const router = useRouter();
  const { data: clima, error: errorClima } = usePronostico();
  // En Inicio no va el aviso de arroyos (está en Clima): solo la frase de lluvia.
  const resumen = clima ? resumenDelDia(clima, null) : null;
  const { nombre } = usePreferencias().preferencias;
  const { data: aire, error: errorAire } = useAire();
  const pm25 = aire ? promedio24h(aire, "pm25") : null;
  const { data: noticias, error: errorNoticias } = useNoticias("barranquilla");
  // Titular de un medio local directo (El Heraldo o Zona Cero); si no hay, el más reciente de cualquiera.
  const titular = noticias?.noticias.find((n) => n.fuente !== "google") ?? noticias?.noticias[0];
  const { data: trm, error: errorDolar } = useDolar();
  const dolar = trm ? vigente(trm, hoyColombia(trm.obtenido)) : null;
  const ahora = new Date();
  const fecha = fechaLarga(ahora);

  // Dato vivo de cada acceso rápido.
  const detalles: Record<string, string> = {};
  if (noticias) detalles.noticias = `${noticias.noticias.length} recientes`;

  return (
    <Pantalla titulo={conNombre(saludo(ahora), nombre)} subtitulo={fecha.charAt(0).toUpperCase() + fecha.slice(1)}>
      <View style={styles.ubicacion}>
        <LineaUbicacion />
      </View>

      {clima ? <AvisoSinConexion p={clima} /> : null}

      <Panel titulo="Resumen del día">
        <Linea
          icono={clima ? iconoClima(clima.actual.codigo, clima.actual.esDia) : "partly-sunny-outline"}
          alTocar={() => router.navigate("/clima")}
          texto={
            clima
              ? `${grados(clima.actual.temperatura)} · ${textoClima(clima.actual.codigo)} · se siente como ${grados(clima.actual.sensacion)}`
              : errorClima
                ? "Clima no disponible"
                : "Cargando el clima…"
          }
          apagado={!clima}
        />
        {resumen ? <Linea icono="umbrella-outline" alTocar={() => router.navigate("/clima")} texto={resumen.frase} /> : null}
        <Linea
          icono="leaf-outline"
          alTocar={() => router.push("/aire")}
          texto={pm25 === null ? (errorAire || aire ? "Aire: no disponible" : "Cargando el aire…") : undefined}
          apagado={pm25 === null}
        >
          {pm25 !== null ? <CategoriaIca cat={categoria("pm25", pm25)} prefijo="Aire:" /> : null}
        </Linea>
        <Linea
          icono="newspaper-outline"
          alTocar={titular ? () => abrirNoticia(titular) : () => router.push("/noticias")}
          texto={titular ? undefined : errorNoticias || noticias ? "Noticias no disponibles" : "Cargando noticias…"}
          apagado={!titular}
        >
          {titular ? (
            <View style={{ gap: 2 }}>
              <Text style={{ color: c.tinta, fontSize: 15 }} numberOfLines={2}>
                {titular.titulo}
              </Text>
              <Text style={{ color: c.tinta2, fontSize: 12 }}>
                {titular.medio} · {antiguedad(titular.fecha, noticias!.obtenido)}
              </Text>
            </View>
          ) : null}
        </Linea>
        <Linea
          icono="cash-outline"
          alTocar={() => router.navigate("/dolar")}
          texto={
            dolar
              ? `Dólar: ${pesos(dolar.actual.valor, 0)}${dolar.cambioPct !== null ? ` (${porcentaje(dolar.cambioPct)})` : ""}`
              : errorDolar
                ? "Dólar no disponible"
                : "Cargando el dólar…"
          }
          apagado={!dolar}
        />
      </Panel>

      <View style={styles.seccion}>
        <Encabezado>Accesos rápidos</Encabezado>
        <Carrusel accesos={ACCESOS} detalles={detalles} />
      </View>
    </Pantalla>
  );
}

/** Una línea del resumen: ícono, contenido y flecha; cada una lleva a su detalle. */
function Linea({
  icono,
  texto,
  apagado = false,
  alTocar,
  children,
}: {
  icono: ComponentProps<typeof Ionicons>["name"];
  texto?: string;
  apagado?: boolean;
  alTocar: () => void;
  children?: ReactNode;
}) {
  const c = useColores();
  return (
    <Pressable onPress={alTocar} accessibilityRole="link" style={({ pressed }) => [styles.linea, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={icono} size={20} color={c.enfasis} />
      <View style={styles.textoLinea}>
        {texto !== undefined ? <Text style={{ color: apagado ? c.tinta2 : c.tinta, fontSize: 15 }}>{texto}</Text> : children}
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.apagado} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ubicacion: { paddingHorizontal: espacio.l, marginTop: -espacio.s },
  linea: { flexDirection: "row", alignItems: "center", gap: espacio.m, paddingVertical: espacio.xs },
  textoLinea: { flex: 1 },
  seccion: { gap: espacio.m },
});
