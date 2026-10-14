import { useUbicacion } from "@/contexto/Ubicacion";
import { umbralArroyos } from "@/lib/preferencias";

/**
 * Umbral de la alerta de arroyos (siempre el "normal": Usuario ya no deja cambiar la sensibilidad, así
 * que una elegida antes no queda escondida), o `null` si la alerta no aplica en la ubicación actual
 * (fuera del área metropolitana de Barranquilla).
 */
export function useUmbralArroyos() {
  const { arroyos } = useUbicacion();
  return arroyos ? umbralArroyos("normal") : null;
}
