// La foto de una noticia que llegó sin ella (Google Noticias y algunas de Bing), sacada de la página
// del artículo (sin React, probado con node:test).
//
// Google Noticias no trae foto y sus enlaces son redirecciones (news.google.com/rss/articles/…): primero
// se pide a Google el enlace real del medio y después se lee la foto (og:image) de esa página.

import type { Noticia } from "./fuentes.ts";

export interface FotoNoticia {
  imagen: string | null;
  /** Enlace directo al medio (en Google, el real en vez de la redirección). */
  url: string;
}

/** `pagina(url)` hace GET; `pagina(url, formulario)`, POST de formulario. Los dos devuelven texto. */
export type PedirPagina = (url: string, formulario?: string) => Promise<string>;

const GOOGLE = /^https:\/\/news\.google\.com\/(?:rss\/)?articles\/([^?/]+)/;

export function idGoogle(url: string): string | null {
  return url.match(GOOGLE)?.[1] ?? null;
}

/** Cuerpo del POST con el que Google devuelve el enlace real (necesita la firma y la hora de la página). */
export function formularioGoogle(id: string, hora: string, firma: string): string {
  const pedido = `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${hora},"${firma}"]`;
  return "f.req=" + encodeURIComponent(JSON.stringify([[["Fbv4je", pedido, null, "generic"]]]));
}

export function urlDeRespuestaGoogle(texto: string): string | null {
  const url = texto.match(/garturlres\\",\\"(.*?)\\"/)?.[1];
  return url && /^https?:\/\//.test(url) ? url.replace(/\\u003d/g, "=").replace(/\\u0026/g, "&") : null;
}

async function enlaceReal(id: string, pagina: PedirPagina): Promise<string | null> {
  const html = await pagina(`https://news.google.com/articles/${id}`);
  const firma = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const hora = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!firma || !hora) return null;
  return urlDeRespuestaGoogle(
    await pagina("https://news.google.com/_/DotsSplashUi/data/batchexecute", formularioGoogle(id, hora, firma)),
  );
}

const atributo = (etiqueta: string, nombre: string) =>
  etiqueta
    .match(new RegExp(String.raw`\b${nombre}\s*=\s*(?:"([^"]*)"|'([^']*)')`, "i"))
    ?.slice(1)
    .find((v) => v !== undefined);

const PREFERENCIA = ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"];

/** La foto de portada de una página (og:image o twitter:image), como URL absoluta https. */
export function fotoDeHtml(html: string, base: string): string | null {
  const cabecera = html.slice(0, (html.search(/<\/head>/i) + 1 || 400_000) + 7);
  const encontradas = new Map<string, string>();
  for (const [etiqueta] of cabecera.matchAll(/<meta\b[^>]*>/gi)) {
    const clave = (atributo(etiqueta, "property") ?? atributo(etiqueta, "name"))?.toLowerCase();
    const valor = atributo(etiqueta, "content")?.trim();
    if (clave && valor && PREFERENCIA.includes(clave) && !encontradas.has(clave)) encontradas.set(clave, valor);
  }
  const cruda = PREFERENCIA.map((c) => encontradas.get(c)).find(Boolean);
  if (!cruda) return null;
  const url = cruda.replace(/&amp;/g, "&");
  const origen = base.match(/^https?:\/\/[^/]+/)?.[0];
  const absoluta = url.startsWith("//") ? "https:" + url : url.startsWith("/") && origen ? origen + url : url;
  return /^https?:\/\//.test(absoluta) ? absoluta.replace(/^http:/, "https:") : null;
}

/** Busca la foto de una noticia sin imagen. Si algo falla, devuelve lo que tenga (sin foto). */
export async function buscarFoto(n: Noticia, pagina: PedirPagina): Promise<FotoNoticia> {
  let url = n.url;
  try {
    const id = idGoogle(n.url);
    if (id) url = (await enlaceReal(id, pagina)) ?? n.url;
    if (idGoogle(url)) return { imagen: null, url };
    return { imagen: fotoDeHtml(await pagina(url), url), url };
  } catch {
    return { imagen: null, url };
  }
}

/** Limita cuántas fotos se buscan a la vez (la lista pide hasta 30 al abrirse). */
export function limitador(maximo: number) {
  let activos = 0;
  const cola: (() => void)[] = [];
  return async <T>(tarea: () => Promise<T>): Promise<T> => {
    // Al terminar, el cupo pasa directo al siguiente de la cola.
    if (activos >= maximo) await new Promise<void>((listo) => cola.push(listo));
    else activos++;
    try {
      return await tarea();
    } finally {
      const siguiente = cola.shift();
      if (siguiente) siguiente();
      else activos--;
    }
  };
}
