import { useQuery } from "@tanstack/react-query";

import { useUbicacion } from "@/contexto/Ubicacion";
import { obtenerAire } from "@/lib/aire/openMeteoAire";
import { redondear } from "@/lib/ubicacion";

export function useAire() {
  const { coordenadas } = useUbicacion();
  const punto = redondear(coordenadas);
  return useQuery({
    queryKey: ["aire", punto.latitud, punto.longitud],
    queryFn: () => obtenerAire(punto),
    // El modelo CAMS se actualiza pocas veces al día.
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
    placeholderData: (previo) => previo,
  });
}
