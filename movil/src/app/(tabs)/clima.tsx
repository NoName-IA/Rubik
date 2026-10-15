// Clima: Hoy, Lluvia y 7 días (la calidad del aire irá dentro de Hoy).


import { AvisoSinConexion } from "@/components/clima/Avisos";
import { ClimaHoy } from "@/components/clima/ClimaHoy";
import { LluviaHoras } from "@/components/clima/LluviaHoras";
import { Semana } from "@/components/clima/Semana";
import { Esqueleto, MensajeError } from "@/components/Estados";
import { LineaUbicacion } from "@/components/LineaUbicacion";
import { Pantalla } from "@/components/Pantalla";
import { Panel } from "@/components/Panel";
import { Segmentos } from "@/components/Segmentos";
import { usePronostico } from "@/hooks/usePronostico";
import { useRecordado } from "@/hooks/useRecordado";

const VISTAS = [
  { clave: "hoy", titulo: "Hoy" },
  { clave: "lluvia", titulo: "Lluvia" },
  { clave: "semana", titulo: "7 días" },
] as const;

type Vista = (typeof VISTAS)[number]["clave"];

export default function Clima() {
  const [vista, setVista] = useRecordado<Vista>("clima:vista", "hoy", VISTAS.map((v) => v.clave));
  const { data, error, isPending, isRefetching, refetch } = usePronostico();

  return (
    <Pantalla titulo="Clima" subtitulo={<LineaUbicacion />} alRefrescar={() => refetch()} refrescando={isRefetching}>
      <Segmentos opciones={VISTAS} valor={vista} alCambiar={setVista} />

      {data ? <AvisoSinConexion p={data} /> : null}
      {data ? (
        vista === "hoy" ? (
          <ClimaHoy p={data} />
        ) : vista === "lluvia" ? (
          <LluviaHoras p={data} />
        ) : (
          <Semana p={data} />
        )
      ) : error && !isPending ? (
        <MensajeError mensaje={error.message} alReintentar={() => refetch()} />
      ) : (
        <Panel>
          <Esqueleto alto={64} ancho="60%" />
          <Esqueleto alto={18} ancho="80%" />
          <Esqueleto alto={90} />
        </Panel>
      )}
    </Pantalla>
  );
}
