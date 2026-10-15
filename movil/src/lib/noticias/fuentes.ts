// Fuentes de noticias locales: lectura de RSS y del JSON:API de Zona Cero (sin React, probado).

export type Zona = "barranquilla" | "atlantico";
export type Fuente = "elheraldo" | "zonacero" | "google" | "bing";

export interface Noticia {
  id: string;
  titulo: string;
  medio: string;
  /** ms desde 1970 */
  fecha: number;
  url: string;
  imagen: string | null;
  fuente: Fuente;
}

export const NOMBRE_FUENTE: Record<Fuente, string> = {
  elheraldo: "El Heraldo",
  zonacero: "Zona Cero",
  google: "Google Noticias",
  bing: "Bing Noticias",
};

/**
 * Búsquedas para cualquier lugar (fuera de Barranquilla): Google Noticias y Bing Noticias, las dos
 * del último día o semana, en español de Colombia. Bing sí trae foto.
 */
export function urlGoogleBusqueda(consulta: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(consulta)}+when:7d&hl=es-419&gl=CO&ceid=CO:es-419`;
}
export function urlBing(consulta: string): string {
  return `https://www.bing.com/news/search?q=${encodeURIComponent(consulta)}&format=rss&setlang=es&cc=CO`;
}

export const URLS: Record<"elheraldo" | "zonacero" | "google", Record<Zona, string>> = {
  // El feed de la sección Barranquilla quedó vacío el 2026-10-12 (responde solo la cabecera XML).
  // Se usa el de Atlántico para ambas zonas y en Barranquilla se filtran las notas de la ciudad.
  elheraldo: {
    barranquilla: "https://www.elheraldo.co/arc/outboundfeeds/rss/category/atlantico/?outputType=xml",
    atlantico: "https://www.elheraldo.co/arc/outboundfeeds/rss/category/atlantico/?outputType=xml",
  },
  // JSON:API de Drupal (no documentado por el medio): solo los campos necesarios y 15 noticias.
  zonacero: {
    barranquilla: urlZonaCero(23218),
    atlantico: urlZonaCero(23219),
  },
  google: {
    barranquilla: "https://news.google.com/rss/search?q=Barranquilla+when:1d&hl=es-419&gl=CO&ceid=CO:es-419",
    atlantico:
      "https://news.google.com/rss/search?q=Atl%C3%A1ntico+(Soledad+OR+Malambo+OR+%22Puerto+Colombia%22+OR+Sabanalarga+OR+Gobernaci%C3%B3n)+when:1d&hl=es-419&gl=CO&ceid=CO:es-419",
  },
};

function urlZonaCero(zona: number): string {
  const p = [
    "sort=-created",
    "page[limit]=15",
    `filter[field_zona.drupal_internal__tid]=${zona}`,
    "fields[node--news]=title,created,path,field_image",
    "include=field_image",
    "fields[file--file]=uri",
  ].map((x) => x.replace(/\[/g, "%5B").replace(/\]/g, "%5D"));
  return `https://zonacero.com/jsonapi/node/news?${p.join("&")}`;
}

// --- RSS -------------------------------------------------------------------------------

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodificar(t: string): string {
  return t
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTIDADES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function etiqueta(item: string, nombre: string): string | null {
  const m = item.match(new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</${nombre}>`));
  return m ? decodificar(m[1]) : null;
}

function atributo(item: string, nombre: string, attr: string): string | null {
  const m = item.match(new RegExp(`<${nombre}\\s[^>]*${attr}="([^"]*)"`));
  return m ? decodificar(m[1]) : null;
}

export interface ItemRss {
  titulo: string;
  enlace: string;
  fecha: number;
  imagen: string | null;
  medio: string | null;
}

/** Lector mínimo de RSS 2.0 (suficiente para los feeds usados; probado con respuestas reales). */
export function leerRss(xml: string): ItemRss[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.flatMap((item) => {
    const titulo = etiqueta(item, "title");
    const enlace = etiqueta(item, "link");
    const fecha = Date.parse(etiqueta(item, "pubDate") ?? "");
    if (!titulo || !enlace || Number.isNaN(fecha)) return [];
    return [{ titulo, enlace, fecha, imagen: atributo(item, "media:content", "url"), medio: etiqueta(item, "source") }];
  });
}

// --- Conversión por fuente -------------------------------------------------------------

/** Nota de Barranquilla: de su sección o con la ciudad en el título. */
export function esDeBarranquilla(n: Pick<Noticia, "url" | "titulo">): boolean {
  return n.url.includes("/barranquilla/") || /barranquilla/i.test(n.titulo);
}

/**
 * Un feed sin ninguna nota se trata como caído (así la app avisa "No respondió" en vez de
 * quedarse callada si el medio rompe o vacía el feed).
 */
function noVacio(items: ItemRss[], medio: string): ItemRss[] {
  if (items.length === 0) throw new Error(`${medio}: el feed llegó sin noticias`);
  return items;
}

export function deElHeraldo(xml: string, zona: Zona = "atlantico"): Noticia[] {
  const notas: Noticia[] = noVacio(leerRss(xml), "El Heraldo").map((i) => ({
    id: i.enlace,
    titulo: i.titulo,
    medio: "El Heraldo",
    fecha: i.fecha,
    url: i.enlace,
    imagen: i.imagen,
    fuente: "elheraldo",
  }));
  return zona === "barranquilla" ? notas.filter(esDeBarranquilla) : notas;
}

export function deGoogle(xml: string): Noticia[] {
  return noVacio(leerRss(xml), "Google Noticias").map((i) => {
    const medio = i.medio ?? "";
    // Google agrega " - Medio" al final del título.
    const titulo = medio && i.titulo.endsWith(` - ${medio}`) ? i.titulo.slice(0, -(medio.length + 3)) : i.titulo;
    return { id: i.enlace, titulo, medio: medio || "Google Noticias", fecha: i.fecha, url: i.enlace, imagen: null, fuente: "google" };
  });
}

/**
 * Bing Noticias: el enlace es un redireccionador con la nota real en `url=`, el medio va en
 * `News:Source` y la foto en `News:Image` (se pide en https y a 640 × 360).
 */
export function deBing(xml: string): Noticia[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const notas = items.flatMap((item): Noticia[] => {
    const titulo = etiqueta(item, "title");
    const enlace = etiqueta(item, "link");
    const fecha = Date.parse(etiqueta(item, "pubDate") ?? "");
    if (!titulo || !enlace || Number.isNaN(fecha)) return [];
    const real = enlace.match(/[?&]url=([^&]+)/);
    const url = real ? decodeURIComponent(real[1]) : enlace;
    const foto = etiqueta(item, "News:Image");
    const imagen = foto ? `${foto.replace(/^http:/, "https:")}&w=640&h=360&c=14` : null;
    return [{ id: url, titulo, medio: etiqueta(item, "News:Source") ?? "Bing Noticias", fecha, url, imagen, fuente: "bing" }];
  });
  if (notas.length === 0) throw new Error("Bing Noticias: el feed llegó sin noticias");
  return notas;
}

interface RespuestaZonaCero {
  data: {
    id: string;
    attributes: { title: string; created: string; path: { alias: string } };
    relationships?: { field_image?: { data: { id: string } | null } };
  }[];
  included?: { id: string; attributes: { uri: { url: string } } }[];
}

export function deZonaCero(r: RespuestaZonaCero): Noticia[] {
  const BASE = "https://zonacero.com";
  const imagenes = new Map((r.included ?? []).map((f) => [f.id, BASE + f.attributes.uri.url]));
  return r.data.flatMap((n) => {
    const fecha = Date.parse(n.attributes.created);
    if (!n.attributes.title || Number.isNaN(fecha) || !n.attributes.path?.alias) return [];
    const imagenId = n.relationships?.field_image?.data?.id;
    return [
      {
        id: n.id,
        titulo: decodificar(n.attributes.title),
        medio: "Zona Cero",
        fecha,
        url: BASE + n.attributes.path.alias,
        imagen: imagenId ? (imagenes.get(imagenId) ?? null) : null,
        fuente: "zonacero",
      },
    ];
  });
}
