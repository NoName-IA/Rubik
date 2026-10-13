import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

import { useUbicacion } from "@/contexto/Ubicacion";
import { proximasHoras } from "@/lib/clima/formato";
import { openMeteo } from "@/lib/clima/openMeteo";
import { conRespaldo } from "@/lib/clima/respaldo";
import { fraseLluvia, UMBRAL_ARROYOS, ventanasArroyos } from "@/lib/clima/resumen";
import type { Pronostico, ProveedorClima } from "@/lib/clima/tipos";
import { ErrorRed } from "@/lib/http";
import { redondear } from "@/lib/ubicacion";

const proveedor: ProveedorClima = openMeteo;
const QUINCE_MIN = 15 * 60_000;
const UN_MIN = 60_000;

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
 * Frase y riesgo de arroyos de las próximas 24 horas, con el umbral elegido en Usuario.
 * Con `umbral: null` (ciudad sin arroyos) no se calcula riesgo.
 */
export function resumenDelDia(p: Pronostico, umbral: { probabilidad: number; mm: number } | null = UMBRAL_ARROYOS) {
  const horas = proximasHoras(p, 24);
  return {
    hoy: horas[0]?.hora.slice(0, 10) ?? "",
    ahora: horas[0]?.hora,
    frase: fraseLluvia(horas),
    arroyos: umbral ? ventanasArroyos(horas, umbral) : [],
  };
}
