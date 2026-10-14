import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

import { useUbicacion } from "@/contexto/Ubicacion";
import { aireConRespaldo, obtenerAire } from "@/lib/aire/openMeteoAire";
import { redondear } from "@/lib/ubicacion";

export function useAire() {
  const { coordenadas } = useUbicacion();
  const punto = redondear(coordenadas);
  return useQuery({
    queryKey: ["aire", punto.latitud, punto.longitud],
    // Sin red se devuelve la última guardada (marcada `guardado`).
    queryFn: () => aireConRespaldo(() => obtenerAire(punto), punto, AsyncStorage),
    // El modelo CAMS se actualiza pocas veces al día; lo guardado se reintenta cada minuto.
    staleTime: (q) => (q.state.data?.guardado ? 60_000 : 30 * 60_000),
    refetchInterval: (q) => (q.state.data?.guardado ? 60_000 : 30 * 60_000),
    placeholderData: (previo) => previo,
  });
}
