import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

import { obtenerPagina } from "@/lib/http";
import { buscarFoto, type FotoNoticia, limitador } from "@/lib/noticias/foto";
import type { Noticia } from "@/lib/noticias/fuentes";

const CLAVE = "noticias:fotos";
const MAXIMO_GUARDADAS = 200;
const DIA = 24 * 3600_000;

// Hasta 4 noticias a la vez; las fotos encontradas se guardan en el celular para no buscarlas de nuevo.
const turno = limitador(4);
let guardadas: Promise<Record<string, FotoNoticia>> | null = null;

function leerGuardadas() {
  guardadas ??= AsyncStorage.getItem(CLAVE)
    .then((t) => (t ? (JSON.parse(t) as Record<string, FotoNoticia>) : {}))
    .catch(() => ({}));
  return guardadas;
}

async function fotoDe(n: Noticia): Promise<FotoNoticia> {
  const mapa = await leerGuardadas();
  if (mapa[n.id]) return mapa[n.id];
  const foto = await turno(() => buscarFoto(n, obtenerPagina));
  mapa[n.id] = foto;
  const claves = Object.keys(mapa);
  for (const k of claves.slice(0, Math.max(0, claves.length - MAXIMO_GUARDADAS))) delete mapa[k];
  AsyncStorage.setItem(CLAVE, JSON.stringify(mapa)).catch(() => {});
  return foto;
}

/** Foto (y enlace directo) de una noticia que llegó sin imagen. `null` mientras no haga falta. */
export function useFotoNoticia(n: Noticia) {
  const buscar = !n.imagen && (n.fuente === "google" || n.fuente === "bing");
  return useQuery({
    queryKey: ["foto", n.id],
    queryFn: () => fotoDe(n),
    enabled: buscar,
    staleTime: Infinity,
    gcTime: DIA,
    retry: false,
  });
}
