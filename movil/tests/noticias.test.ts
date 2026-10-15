/// <reference types="node" />

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { antiguedad, combinar, CUPO_MINIMO_GOOGLE, palabras, similitud } from "../src/lib/noticias/combinar.ts";
import { deBing, decodificar, deElHeraldo, deGoogle, deZonaCero, esDeBarranquilla, leerRss, type Noticia, URLS } from "../src/lib/noticias/fuentes.ts";
import { buscarFoto, fotoDeHtml, limitador } from "../src/lib/noticias/foto.ts";
import { zonasNoticias } from "../src/lib/noticias/lugar.ts";

const leer = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf-8");
// Respuestas reales del 2026-10-12.
const heraldo = deElHeraldo(leer("elheraldo.xml"));
const google = deGoogle(leer("google-noticias.xml"));
const zona = deZonaCero(JSON.parse(leer("zonacero.json")));
const AHORA = Math.max(...[...heraldo, ...google, ...zona].map((n) => n.fecha)) + 60_000;

test("decodifica CDATA y entidades", () => {
  assert.equal(decodificar("<![CDATA[Corte de luz]]>"), "Corte de luz");
  assert.equal(decodificar("Air-e &amp; Triple A &#39;hoy&#39; &#x2013; ya"), "Air-e & Triple A 'hoy' – ya");
  assert.equal(decodificar("  varias \n líneas "), "varias líneas");
});

test("RSS mínimo: ignora ítems incompletos", () => {
  const xml = `<rss><channel>
    <item><title>Uno</title><link>https://a</link><pubDate>Mon, 12 Oct 2026 21:00:00 GMT</pubDate></item>
    <item><title>Sin enlace</title><pubDate>Mon, 12 Oct 2026 21:00:00 GMT</pubDate></item>
    <item><title>Fecha mala</title><link>https://b</link><pubDate>ayer</pubDate></item>
  </channel></rss>`;
  const items = leerRss(xml);
  assert.equal(items.length, 1);
  assert.equal(items[0].titulo, "Uno");
  assert.equal(items[0].imagen, null);
});

test("El Heraldo: título, enlace, fecha e imagen", () => {
  assert.ok(heraldo.length >= 10);
  for (const n of heraldo) {
    assert.equal(n.medio, "El Heraldo");
    assert.match(n.url, /^https:\/\/www\.elheraldo\.co\//);
    assert.ok(!n.titulo.includes("CDATA"));
  }
  assert.ok(heraldo.filter((n) => n.imagen).length >= heraldo.length / 2, "la mayoría trae imagen");
  assert.ok(!heraldo.some((n) => n.imagen?.includes("&amp;")), "la URL de la imagen queda decodificada");
});

test("El Heraldo: el feed de Atlántico se filtra para Barranquilla", () => {
  const xml = leer("elheraldo-atlantico.xml");
  const todas = deElHeraldo(xml, "atlantico");
  const bq = deElHeraldo(xml, "barranquilla");
  assert.equal(todas.length, 24);
  assert.equal(bq.length, 13); // 12 de la sección + 1 con "Barranquilla" en el título (corte de luz)
  assert.ok(bq.every(esDeBarranquilla));
  assert.ok(todas.some((n) => !esDeBarranquilla(n)), "Atlántico incluye otros municipios");
  assert.equal(esDeBarranquilla({ url: "https://www.elheraldo.co/atlantico/2026/10/12/x/", titulo: "Alcalde de Barranquilla anuncia obras" }), true);
  assert.equal(esDeBarranquilla({ url: "https://www.elheraldo.co/atlantico/2026/10/12/x/", titulo: "Malambo sin agua" }), false);
});

test("un feed vacío cuenta como caído", () => {
  const vacio = '<?xml version="1.0" encoding="UTF-8"?>';
  assert.throws(() => deElHeraldo(vacio), /sin noticias/);
  assert.throws(() => deGoogle(vacio), /sin noticias/);
});

test("Zona Cero: URL completa e imagen del archivo relacionado", () => {
  assert.ok(zona.length >= 5);
  for (const n of zona) assert.match(n.url, /^https:\/\/zonacero\.com\/[a-z]/);
  assert.ok(zona.some((n) => n.imagen?.startsWith("https://zonacero.com/sites/default/files/")));
});

test("Google: quita el sufijo ' - Medio' y toma el medio de <source>", () => {
  assert.ok(google.length >= 30);
  const t = google.find((n) => n.medio === "El Tiempo");
  assert.ok(t, "hay notas de El Tiempo");
  assert.ok(!t.titulo.endsWith(" - El Tiempo"));
  assert.ok(google.every((n) => n.imagen === null));
});

test("URLs de cada zona", () => {
  assert.match(URLS.zonacero.barranquilla, /23218/);
  assert.match(URLS.zonacero.atlantico, /23219/);
  assert.match(URLS.google.barranquilla, /q=Barranquilla/);
  assert.match(URLS.elheraldo.atlantico, /category\/atlantico\//);
});

test("similitud de títulos", () => {
  assert.deepEqual([...palabras("¡El arroyo de la 85 ya es historia!")], ["arroyo", "85", "ya", "historia"]);
  assert.equal(similitud("El arroyo de la 85 ya es historia", "Arroyo de la 85: ¡ya es historia!"), 1);
  assert.ok(similitud("Corte de luz en el norte", "Junior ganó el clásico") < 0.2);
});

const n = (titulo: string, fuente: Noticia["fuente"], medio: string, minutos: number, imagen: string | null = null): Noticia => ({
  id: titulo + fuente,
  titulo,
  medio,
  fecha: AHORA - minutos * 60_000,
  url: `https://x/${encodeURIComponent(titulo + fuente)}`,
  imagen,
  fuente,
});

test("combinar: la versión directa gana al duplicado de Google", () => {
  const r = combinar(
    [[n("Así quedó el arroyo de la 85 tras el aguacero", "elheraldo", "El Heraldo", 30, "img")], [n("Así quedó el arroyo de la 85 tras el aguacero", "google", "Caracol Radio", 10)]],
    { ahora: AHORA },
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].fuente, "elheraldo");
});

test("combinar: descarta lo que Google repite de un medio que llegó directo", () => {
  const listas = [[n("Nota propia", "zonacero", "Zona Cero", 5)], [n("Otra redacción de Zona Cero", "google", "Zona Cero", 6), n("Nota de radio", "google", "Caracol Radio", 7)]];
  assert.deepEqual(combinar(listas, { ahora: AHORA, directasOk: ["zonacero"] }).map((x) => x.titulo), ["Nota propia", "Nota de radio"]);
  // Si Zona Cero no respondió, su nota en Google sí se muestra.
  assert.equal(combinar(listas, { ahora: AHORA, directasOk: [] }).length, 3);
});

test("combinar: solo últimas 48 h, más nuevas primero, con máximo", () => {
  const r = combinar([[n("Vieja", "elheraldo", "El Heraldo", 49 * 60), n("Nueva", "elheraldo", "El Heraldo", 1), n("Media", "zonacero", "Zona Cero", 120)]], { ahora: AHORA, maximo: 2 });
  assert.deepEqual(r.map((x) => x.titulo), ["Nueva", "Media"]);
});

test("combinar: Google no desplaza a los medios directos, pero conserva un cupo", () => {
  const directas = Array.from({ length: 25 }, (_, i) => n(`Directa número ${i + 10} sobre tema ${i * 7 + 100}`, "elheraldo", "El Heraldo", 60 + i));
  const deGoogleMuchas = Array.from({ length: 50 }, (_, i) => n(`Google ${i + 10} asunto ${i * 13 + 100} distinto`, "google", "Caracol Radio", i));
  const r = combinar([directas, deGoogleMuchas], { ahora: AHORA, maximo: 30 });
  assert.equal(r.length, 30);
  assert.equal(r.filter((x) => x.fuente === "google").length, 10);
  assert.equal(r.filter((x) => x.fuente === "elheraldo").length, 20);
  // Con pocas directas, Google completa la lista.
  const r2 = combinar([directas.slice(0, 5), deGoogleMuchas], { ahora: AHORA, maximo: 30 });
  assert.equal(r2.filter((x) => x.fuente === "google").length, 25);
});

test("combinar con las respuestas reales", () => {
  const r = combinar([heraldo, zona, google], { ahora: AHORA, directasOk: ["elheraldo", "zonacero"] });
  assert.ok(r.length >= 20 && r.length <= 30, `${r.length}`);
  assert.ok(r.every((x, i) => i === 0 || r[i - 1].fecha >= x.fecha), "ordenadas por fecha");
  assert.ok(!r.some((x) => x.fuente === "google" && /heraldo|zona ?cero/i.test(x.medio)));
  assert.equal(new Set(r.map((x) => x.url)).size, r.length);
  assert.ok(new Set(r.map((x) => x.fuente)).size === 3, "aparecen las tres fuentes");
  // Las directas de las últimas 48 h ocupan todo menos el cupo mínimo de Google.
  const directas48 = [...heraldo, ...zona].filter((x) => AHORA - x.fecha <= 48 * 3600_000).length;
  assert.equal(r.filter((x) => x.fuente !== "google").length, Math.min(directas48, 30 - CUPO_MINIMO_GOOGLE));
  assert.equal(r.filter((x) => x.fuente === "google").length, CUPO_MINIMO_GOOGLE);
});

test("antigüedad legible", () => {
  assert.equal(antiguedad(AHORA - 20_000, AHORA), "ahora");
  assert.equal(antiguedad(AHORA - 5 * 60_000, AHORA), "hace 5 min");
  assert.equal(antiguedad(AHORA - 3 * 3600_000, AHORA), "hace 3 h");
  assert.equal(antiguedad(AHORA - 30 * 3600_000, AHORA), "ayer");
  assert.equal(antiguedad(AHORA - 80 * 3600_000, AHORA), "hace 3 días");
});

// --- Cliente ------------------------------------------------------------------------------

import { cargarNoticias, noticiasConRespaldo, type Pedidos } from "../src/lib/noticias/cliente.ts";

function pedidos(fallan: string[] = []): Pedidos {
  const falla = (url: string) => fallan.some((f) => url.includes(f));
  return {
    texto: async (url) => {
      if (falla(url)) throw new Error("caída");
      return url.includes("elheraldo") ? leer("elheraldo.xml") : leer("google-noticias.xml");
    },
    json: async <T,>(url: string) => {
      if (falla(url)) throw new Error("caída");
      return JSON.parse(leer("zonacero.json")) as T;
    },
  };
}

function almacen() {
  const datos = new Map<string, string>();
  return { datos, getItem: async (k: string) => datos.get(k) ?? null, setItem: async (k: string, v: string) => void datos.set(k, v) };
}

test("cliente: con las tres fuentes", async () => {
  const r = await cargarNoticias("barranquilla", pedidos(), () => AHORA);
  assert.deepEqual(r.caidas, []);
  assert.equal(r.noticias.length, 30);
});

test("cliente: un feed vacío se reporta como caído", async () => {
  const p = pedidos();
  const r = await cargarNoticias("barranquilla", { ...p, texto: async (u) => (u.includes("elheraldo") ? '<?xml version="1.0"?>' : p.texto(u)) }, () => AHORA);
  assert.deepEqual(r.caidas, ["elheraldo"]);
});

test("cliente: si cae una fuente, muestra las otras y la reporta", async () => {
  const r = await cargarNoticias("barranquilla", pedidos(["zonacero"]), () => AHORA);
  assert.deepEqual(r.caidas, ["zonacero"]);
  assert.ok(!r.noticias.some((x) => x.fuente === "zonacero"));
  assert.ok(r.noticias.length > 0);
});

test("cliente: si caen todas, usa lo guardado; sin guardado, error", async () => {
  const a = almacen();
  await noticiasConRespaldo("barranquilla", pedidos(), a, () => AHORA);
  await new Promise((r) => setTimeout(r, 0));
  const todas = ["elheraldo", "zonacero", "news.google"];
  const r = await noticiasConRespaldo("barranquilla", pedidos(todas), a, () => AHORA + 3600_000);
  assert.equal(r.guardado, true);
  assert.equal(r.noticias.length, 30);
  await assert.rejects(noticiasConRespaldo("atlantico", pedidos(todas), a, () => AHORA), /ninguna fuente/);
  await assert.rejects(noticiasConRespaldo("barranquilla", pedidos(todas), a, () => AHORA + 8 * 24 * 3600_000), /ninguna fuente/);
});

test("Bing Noticias: nota real (no el redireccionador), medio y foto en https", () => {
  const bing = deBing(leer("bing-noticias.xml"));
  assert.ok(bing.length >= 5);
  for (const n of bing) {
    assert.equal(n.fuente, "bing");
    assert.ok(!n.url.includes("bing.com"), n.url);
    assert.ok(n.medio.length > 0);
    if (n.imagen) assert.match(n.imagen, /^https:\/\/www\.bing\.com\/th\?id=.*&w=640&h=360/);
  }
  assert.ok(bing.some((n) => n.imagen), "trae fotos");
  assert.equal(bing[0].medio, "Pulzo");
  assert.match(bing[0].url, /^https:\/\/www\.pulzo\.com\//);
  assert.throws(() => deBing('<?xml version="1.0"?><rss></rss>'), /sin noticias/);
});

test("zonas de noticias según el lugar", () => {
  assert.deepEqual(
    zonasNoticias({ municipio: "Soledad", departamento: "Atlántico", barranquilla: true }).map((z) => z.destino),
    ["barranquilla", "atlantico"],
  );
  const [cerca, region] = zonasNoticias({ municipio: "Tocancipá", departamento: "Cundinamarca", barranquilla: false });
  assert.equal(cerca.titulo, "Tocancipá");
  assert.deepEqual(cerca.destino, { consulta: '"Tocancipá" Cundinamarca', clave: 'busqueda:"tocancipa" cundinamarca' });
  assert.equal(region.titulo, "Cundinamarca");
  // Bogotá D.C.: el departamento es la misma ciudad, así que hay una sola pestaña.
  assert.equal(zonasNoticias({ municipio: "Bogotá", departamento: "Bogotá D.C.", barranquilla: false }).length, 1);
});

test("fuera de Barranquilla solo se buscan Google y Bing", async () => {
  const pedidas: string[] = [];
  const r = await cargarNoticias(
    { consulta: '"Tocancipá" Cundinamarca', clave: "x" },
    {
      texto: async (u) => {
        pedidas.push(u);
        return u.includes("bing.com") ? leer("bing-noticias.xml") : leer("google-noticias.xml");
      },
      json: async () => {
        throw new Error("no debería pedir Zona Cero");
      },
    },
    () => Date.parse("2026-10-14T12:00:00Z"),
  );
  assert.equal(pedidas.length, 2);
  assert.ok(pedidas.some((u) => u.startsWith("https://www.bing.com/news/search?q=%22Tocanc")));
  assert.ok(pedidas.some((u) => u.startsWith("https://news.google.com/rss/search?q=%22Tocanc")));
  assert.deepEqual(r.caidas, []);
});

test("foto de la página: og:image con &amp;, relativa o de twitter", () => {
  const base = "https://www.medio.co/nota/1";
  assert.equal(
    fotoDeHtml(`<head><meta content="https://img.medio.co/a.jpg?w=1&amp;h=2" property="og:image"></head>`, base),
    "https://img.medio.co/a.jpg?w=1&h=2",
  );
  assert.equal(fotoDeHtml(`<meta property='og:image' content='/fotos/b.jpg'>`, base), "https://www.medio.co/fotos/b.jpg");
  assert.equal(fotoDeHtml(`<meta name="twitter:image" content="http://img.medio.co/c.png">`, base), "https://img.medio.co/c.png");
  assert.equal(fotoDeHtml(`<head><title>x</title></head><body><meta property="og:image" content="/no.jpg"></body>`, base), null);
});

test("foto de Google Noticias: pide el enlace real y lee su foto", async () => {
  const pedidos: string[] = [];
  const pagina = async (url: string, formulario?: string) => {
    pedidos.push(url);
    if (url.startsWith("https://news.google.com/articles/")) return `<c-wiz data-n-a-sg="FIRMA" data-n-a-ts="1760000000">`;
    if (formulario) {
      assert.ok(/ABC123.*1760000000.*FIRMA/.test(decodeURIComponent(formulario)), "lleva el id, la hora y la firma");
      return `)]}'\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https://www.medio.co/nota\\",1]",null]]`;
    }
    return `<meta property="og:image" content="https://www.medio.co/foto.jpg">`;
  };
  const google = n("Una nota", "google", "Medio", 5);
  const foto = await buscarFoto({ ...google, url: "https://news.google.com/rss/articles/ABC123?oc=5" }, pagina);
  assert.deepEqual(foto, { imagen: "https://www.medio.co/foto.jpg", url: "https://www.medio.co/nota" });
  assert.equal(pedidos.length, 3);
  // Si la página falla, la noticia sigue, sin foto.
  assert.deepEqual(await buscarFoto(n("Otra", "bing", "Medio", 5), async () => Promise.reject(new Error("x"))), {
    imagen: null,
    url: n("Otra", "bing", "Medio", 5).url,
  });
});

test("limitador: nunca más de N tareas a la vez", async () => {
  const turno = limitador(2);
  let activas = 0;
  let pico = 0;
  await Promise.all(
    Array.from({ length: 6 }, () =>
      turno(async () => {
        pico = Math.max(pico, ++activas);
        await new Promise((r) => setTimeout(r, 5));
        activas--;
      }),
    ),
  );
  assert.equal(pico, 2);
});
