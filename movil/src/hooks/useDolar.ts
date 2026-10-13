import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

import { obtenerTrm, trmConRespaldo } from "@/lib/dolar";

const UNA_HORA = 3600_000;

export function useDolar() {
  return useQuery({
    queryKey: ["trm"],
    queryFn: () => trmConRespaldo(obtenerTrm, AsyncStorage),
    // La TRM cambia una vez por día hábil.
    staleTime: (q) => (q.state.data?.guardado ? 60_000 : UNA_HORA),
    refetchInterval: (q) => (q.state.data?.guardado ? 60_000 : UNA_HORA),
  });
}
