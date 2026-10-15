import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useUbicacion } from "@/contexto/Ubicacion";
import { obtenerJson, obtenerTexto } from "@/lib/http";
import { type Destino, noticiasConRespaldo } from "@/lib/noticias/cliente";
import type { Fuente } from "@/lib/noticias/fuentes";
import { zonasNoticias } from "@/lib/noticias/lugar";

const QUINCE_MIN = 15 * 60_000;

/**
 * Fuentes fijas (no se eligen en Usuario). En Barranquilla, solo las que traen foto: El Heraldo y
 * Zona Cero (Google Noticias no trae imagen y sus enlaces son redirecciones). En otro lugar, Bing
 * Noticias (con foto) y Google Noticias, buscando el municipio o el departamento.
 */
const FUENTES_BARRANQUILLA: Fuente[] = ["elheraldo", "zonacero"];
const FUENTES_BUSQUEDA: Fuente[] = ["bing", "google"];

/** Las pestañas de Noticias (la ciudad y el departamento) según dónde esté el usuario. */
export function useZonasNoticias() {
  const { lugar } = useUbicacion();
  const { municipio, departamento, barranquilla } = lugar;
  // Se arma solo cuando cambia el lugar, no en cada render.
  return useMemo(() => zonasNoticias({ municipio, departamento, barranquilla }), [municipio, departamento, barranquilla]);
}

export function useNoticias(destino: Destino) {
  const barranquilla = typeof destino === "string";
  const clave = barranquilla ? destino : destino.clave;
  return useQuery({
    queryKey: ["noticias", clave],
    queryFn: () =>
      noticiasConRespaldo(
        destino,
        { texto: obtenerTexto, json: obtenerJson },
        AsyncStorage,
        Date.now,
        barranquilla ? FUENTES_BARRANQUILLA : FUENTES_BUSQUEDA,
      ),
    // Caché de 15 minutos; lo guardado sin red se reintenta cada minuto.
    staleTime: (q) => (q.state.data?.guardado ? 60_000 : QUINCE_MIN),
    refetchInterval: (q) => (q.state.data?.guardado ? 60_000 : QUINCE_MIN),
    // En Barranquilla todas las noticias que se muestran tienen foto; en otro lugar, las de Google van sin foto.
    select: barranquilla ? (r) => ({ ...r, noticias: r.noticias.filter((n) => n.imagen) }) : undefined,
  });
}
