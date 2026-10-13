import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

import { obtenerJson, obtenerTexto } from "@/lib/http";
import { noticiasConRespaldo } from "@/lib/noticias/cliente";
import type { Fuente, Zona } from "@/lib/noticias/fuentes";

const QUINCE_MIN = 15 * 60_000;

/**
 * Fuentes fijas (no se eligen en Usuario): solo las que traen foto. Google Noticias no trae imagen
 * y sus enlaces son redirecciones, así que queda fuera para que todas las noticias tengan foto.
 */
const FUENTES: Fuente[] = ["elheraldo", "zonacero"];

export function useNoticias(zona: Zona) {
  return useQuery({
    queryKey: ["noticias", zona, "con-foto"],
    queryFn: () => noticiasConRespaldo(zona, { texto: obtenerTexto, json: obtenerJson }, AsyncStorage, Date.now, FUENTES),
    // Caché de 15 minutos; lo guardado sin red se reintenta cada minuto.
    staleTime: (q) => (q.state.data?.guardado ? 60_000 : QUINCE_MIN),
    refetchInterval: (q) => (q.state.data?.guardado ? 60_000 : QUINCE_MIN),
    // Todas las noticias que se muestran tienen foto.
    select: (r) => ({ ...r, noticias: r.noticias.filter((n) => n.imagen) }),
  });
}
