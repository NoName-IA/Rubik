import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

import { useUbicacion } from "@/contexto/Ubicacion";
import { proximasHoras } from "@/lib/clima/formato";
import { elegirObservacion, type Observacion, obtenerMetars } from "@/lib/clima/metar";
import { openMeteo } from "@/lib/clima/openMeteo";
import { conRespaldo } from "@/lib/clima/respaldo";
import { fraseLluvia, UMBRAL_ARROYOS, ventanasArroyos } from "@/lib/clima/resumen";
import type { Pronostico, ProveedorClima } from "@/lib/clima/tipos";
import { ErrorRed } from "@/lib/http";
import { redondear } from "@/lib/ubicacion";

const proveedor: ProveedorClima = openMeteo;
const QUINCE_MIN = 15 * 60_000;
const UN_MIN = 60_000;
const DIEZ_MIN = 10 * 60_000;

export function usePronostico() {
  const { coordenadas } = useUbicacion();
  const punto = redondear(coordenadas);
  return useQuery({
    queryKey: ["pronostico", punto.latitud, punto.longitud],
    // Sin red se devuelve el último pronóstico guardado (marcado `guardado`).
    queryFn: () => conRespaldo(() => proveedor.pronostico(punto), punto, AsyncStorage),
    // Lo guardado se vuelve a intentar pronto; lo nuevo dura 15 min.
    staleTime: (q) => (q.state.data?.guardado ? UN_MIN : QUINCE_MIN),
    // Con la app abierta mucho rato, "Ahora" y las próximas horas no se quedan atrás.
    refetchInterval: (q) => (q.state.data?.guardado ? UN_MIN : QUINCE_MIN),
    // Un error 4xx no se arregla reintentando; uno de red o 5xx sí puede.
    retry: (intentos, error) =>
      intentos < 2 && !(error instanceof ErrorRed && error.estado !== null && error.estado >= 400 && error.estado < 500),
    // Mientras llega el pronóstico del GPS se sigue mostrando el anterior.
    placeholderData: (previo) => previo,
  });
}

/**
 * Lluvia observada ahora en el aeropuerto más cercano (a 15 km o menos), o `null` si no hay uno
 * cerca, si su reporte es viejo o si no se pudo consultar: entonces solo se usa el pronóstico.
 */
export function useObservacion(): Observacion | null {
  const { coordenadas } = useUbicacion();
  const punto = redondear(coordenadas);
  const { data } = useQuery({
    queryKey: ["metar", punto.latitud, punto.longitud],
    queryFn: () => obtenerMetars(punto),
    // Los aeropuertos reportan cada hora; así no se queda atrás más de 10 min.
    staleTime: DIEZ_MIN,
    refetchInterval: DIEZ_MIN,
    retry: 1,
  });
  // La vigencia se revisa al mostrar: un reporte viejo guardado en memoria deja de contar.
  return data ? elegirObservacion(data, punto) : null;
}

/**
 * Frase de hoy y mañana y riesgo de arroyos de las próximas 24 horas, con el umbral elegido en Usuario.
 * Con `umbral: null` (ciudad sin arroyos) no se calcula riesgo. `obs` corrige la frase de la hora
 * en curso (el riesgo de arroyos no se toca: ante la duda, se avisa).
 */
export function resumenDelDia(
  p: Pronostico,
  umbral: { probabilidad: number; mm: number } | null = UMBRAL_ARROYOS,
  obs: Observacion | null = null,
) {
  const horas = proximasHoras(p, 24);
  return {
    hoy: horas[0]?.hora.slice(0, 10) ?? "",
    ahora: horas[0]?.hora,
    // Hasta 48 horas para alcanzar a cubrir todo mañana.
    frase: fraseLluvia(proximasHoras(p, 48), obs),
    arroyos: umbral ? ventanasArroyos(horas, umbral) : [],
  };
}
