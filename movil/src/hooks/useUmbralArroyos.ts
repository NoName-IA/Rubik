import { usePreferencias } from "@/contexto/Preferencias";
import { useUbicacion } from "@/contexto/Ubicacion";
import { umbralArroyos } from "@/lib/preferencias";

/**
 * Umbral de la alerta de arroyos según la sensibilidad elegida en Usuario, o `null` si la alerta
 * no aplica en la ubicación actual (fuera del área metropolitana de Barranquilla).
 */
export function useUmbralArroyos() {
  const { arroyos } = useUbicacion();
  const { preferencias } = usePreferencias();
  return arroyos ? umbralArroyos(preferencias.arroyos) : null;
}
