// Fondo de la cancha del arcade: el interior de una cueva al estilo de Geometry Dash, en low-poly. La
// roca son facetas de varios tonos con un filo de luz en la orilla; por el techo entran rayos de luz,
// hay racimos de cristales que brillan y motas flotando. Sin React: devuelve figuras en píxeles que
// la pantalla dibuja con SVG. Siempre sale la misma cueva (azar con semilla fija).

type P = [number, number];

export interface Figura {
  puntos: P[];
  /** Relleno del polígono ("none": sin relleno). */
  relleno: string;
  /** Línea (en las abiertas, la única que se dibuja). */
  borde?: string;
  grosor?: number;
  opacidad?: number;
  /** Línea abierta (polyline) en vez de polígono cerrado. */
  abierta?: boolean;
}

export interface Circulo {
  x: number;
  y: number;
  r: number;
  color: string;
  opacidad: number;
}

export interface Cueva {
  /** Del fondo hacia adelante. */
  figuras: Figura[];
  /** Halos de luz (degradado del color a transparente), detrás de los cristales. */
  halos: Circulo[];
  /** Motas de luz flotando, encima de todo. */
  motas: Circulo[];
}

/**
 * Los colores de la app (índigo #0F0D29 y violeta #A78BFA, ver theme.ts), para que la cueva combine con
 * el resto del Rubo: roca índigo, filo violeta y cristales violeta y fucsia.
 */
export const COLORES_CUEVA = {
  /** Degradado del fondo, de arriba abajo. */
  fondoArriba: "#17123A",
  fondoAbajo: "#0B0920",
  /** Capas de roca lejanas (de la más lejana a la más cercana). */
  lejos: ["#251D57", "#1C1645"],
  /** Tonos de las facetas de la roca de adelante (de más oscuro a más claro). */
  roca: ["#0A0819", "#110D28", "#191438", "#231B4A"],
  filo: "#A78BFA",
  luz: "#DDD6FE",
  cristal: "#A78BFA",
  cristalClaro: "#EDE9FE",
  cristal2: "#E879F9",
  cristal2Claro: "#FAE8FF",
  mota: "#C4B5FD",
} as const;

/** Azar con semilla (mulberry32): la cueva es igual cada vez. */
function azarCon(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = (x: number, y: number): P => [r1(x), r1(y)];

/**
 * Una franja de roca facetada pegada a un borde. `borde(t)` es el punto del borde de la cancha y
 * `orilla(t)` el de la orilla de la roca, para t de 0 a 1 a lo largo. Entre los dos hay una fila de
 * puntos intermedios; se arma con triángulos de tonos al azar (más claros cerca de la orilla, donde
 * pega la luz) y la orilla lleva el filo brillante.
 */
function franja(
  borde: (t: number) => P,
  orilla: (t: number, i: number) => P,
  n: number,
  azar: () => number,
): { facetas: Figura[]; filo: P[] } {
  const C = COLORES_CUEVA;
  const e: P[] = [];
  const m: P[] = [];
  const o: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const b = borde(t);
    const r = orilla(t, i);
    const k = 0.4 + azar() * 0.25;
    e.push(b);
    o.push(r);
    m.push(pt(b[0] + (r[0] - b[0]) * k + (azar() - 0.5) * 6, b[1] + (r[1] - b[1]) * k + (azar() - 0.5) * 6));
  }
  const facetas: Figura[] = [];
  const tono = (cerca: boolean) => C.roca[Math.min(3, Math.floor(azar() * 3) + (cerca ? 1 : 0))];
  for (let i = 0; i < n; i++) {
    facetas.push(
      { puntos: [e[i], m[i], m[i + 1]], relleno: tono(false) },
      { puntos: [e[i], m[i + 1], e[i + 1]], relleno: tono(false) },
      { puntos: [m[i], o[i], o[i + 1]], relleno: tono(true) },
      { puntos: [m[i], o[i + 1], m[i + 1]], relleno: tono(true) },
    );
  }
  // Las uniones entre facetas se notan apenas (como en el low-poly): una línea fina del mismo tono.
  for (const f of facetas) {
    f.borde = f.relleno;
    f.grosor = 0.8;
  }
  return { facetas, filo: o };
}

/** Un racimo de cristales que sale de (x, y) hacia `angulo` (radianes; 0 = arriba). */
function racimo(x: number, y: number, tam: number, angulo: number, colores: [string, string], azar: () => number): Figura[] {
  const [color, claro] = colores;
  const figuras: Figura[] = [];
  const cantidad = 3 + Math.floor(azar() * 3);
  for (let k = 0; k < cantidad; k++) {
    const a = angulo + (k - (cantidad - 1) / 2) * 0.38 + (azar() - 0.5) * 0.2;
    const largo = tam * (k === Math.floor(cantidad / 2) ? 1 : 0.5 + azar() * 0.4);
    const ancho = largo * 0.28;
    const gira = (dx: number, dy: number): P =>
      pt(x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a));
    const punta = gira(0, -largo);
    const izq = gira(-ancho / 2, -largo * 0.72);
    const der = gira(ancho / 2, -largo * 0.72);
    const baseIzq = gira(-ancho / 2.4, 0);
    const baseDer = gira(ancho / 2.4, 0);
    // Cara oscura, cara clara y el filo de la punta.
    figuras.push(
      { puntos: [punta, der, baseDer, baseIzq, izq], relleno: color, opacidad: 0.95 },
      { puntos: [punta, izq, baseIzq, gira(0, 0)], relleno: claro, opacidad: 0.7 },
      { puntos: [izq, punta, der], relleno: "none", borde: "#FFFFFF", grosor: 1, opacidad: 0.8, abierta: true },
    );
  }
  return figuras;
}

export function crearCueva(ancho: number, alto: number, semilla = 11): Cueva {
  const azar = azarCon(semilla);
  const C = COLORES_CUEVA;
  const figuras: Figura[] = [];
  const halos: Circulo[] = [];
  const motas: Circulo[] = [];

  // Rayos de luz que entran por grietas del techo, inclinados y muy tenues.
  for (let i = 0; i < 3; i++) {
    const x = ancho * (0.25 + 0.25 * i + (azar() - 0.5) * 0.1);
    const arriba = ancho * (0.03 + azar() * 0.03);
    const abajo = ancho * (0.14 + azar() * 0.1);
    const corre = ancho * (0.12 + azar() * 0.1);
    figuras.push({
      puntos: [pt(x - arriba, 0), pt(x + arriba, 0), pt(x + corre + abajo, alto * 0.85), pt(x + corre - abajo, alto * 0.85)],
      relleno: C.luz,
      opacidad: 0.05 + azar() * 0.03,
    });
  }

  // Dos capas de roca lejana (siluetas que suben del suelo y bajan del techo), cada una más cerca.
  C.lejos.forEach((color, capa) => {
    const pasos = 7 - capa * 2;
    const hondo = 0.18 + capa * 0.06;
    for (const desde of ["abajo", "arriba"] as const) {
      const base = desde === "abajo" ? alto : 0;
      const hacia = desde === "abajo" ? -1 : 1;
      const puntos: P[] = [pt(0, base)];
      for (let i = 0; i <= pasos; i++) {
        const x = (ancho * i) / pasos;
        const h = alto * hondo * (0.3 + 0.7 * azar()) * (desde === "arriba" ? 0.7 : 1);
        puntos.push(pt(x, base + hacia * h));
        if (i < pasos) puntos.push(pt(x + ancho / pasos / 2, base + hacia * h * (0.45 + azar() * 0.3)));
      }
      puntos.push(pt(ancho, base));
      figuras.push({ puntos, relleno: color, opacidad: 0.75 });
    }
  });

  // Cristales: racimos incrustados en las paredes, con su halo de luz.
  const cristales: Figura[] = [];
  const sitios: [number, number, number, [string, string]][] = [
    [0.1, 0.22, 0.9, [C.cristal, C.cristalClaro]],
    [0.92, 0.4, -1.0, [C.cristal2, C.cristal2Claro]],
    [0.09, 0.66, 1.1, [C.cristal2, C.cristal2Claro]],
    [0.91, 0.83, -0.8, [C.cristal, C.cristalClaro]],
  ];
  for (const [fx, fy, angulo, colores] of sitios) {
    const x = ancho * fx;
    const y = alto * fy;
    const tam = ancho * (0.11 + azar() * 0.04);
    halos.push({
      x: r1(x + Math.sin(angulo) * tam * 0.6),
      y: r1(y - tam * 0.4),
      r: r1(tam * 2),
      color: colores[0],
      opacidad: 0.5,
    });
    cristales.push(...racimo(x, y, tam, angulo, colores, azar));
  }

  // Adelante: las paredes de los lados, el techo con estalactitas y el suelo con estalagmitas.
  const hondoPared = ancho * 0.15;
  const n = 16;
  const pared = (lado: 1 | -1) => {
    const x0 = lado === 1 ? 0 : ancho;
    return franja(
      (t) => pt(x0, t * alto),
      (t) => pt(x0 + lado * hondoPared * (0.5 + 0.5 * azar()) * (0.75 + 0.25 * Math.sin(t * Math.PI)), t * alto),
      n,
      azar,
    );
  };
  const picos = (desde: 1 | -1, largo: number) => {
    const y0 = desde === 1 ? 0 : alto;
    return franja(
      (t) => pt(t * ancho, y0),
      // Puntos pares: punta de un pico; impares: entre picos.
      (t, i) => pt(t * ancho, y0 + desde * largo * (i % 2 === 0 ? 0.55 + 0.45 * azar() : 0.15 + 0.15 * azar())),
      14,
      azar,
    );
  };
  const partes = [pared(1), pared(-1), picos(1, alto * 0.09), picos(-1, alto * 0.075)];
  // El temblor de los puntos intermedios no puede sacar la roca de la cancha.
  for (const p of partes)
    for (const f of p.facetas)
      f.puntos = f.puntos.map(([x, y]) => pt(Math.min(ancho, Math.max(0, x)), Math.min(alto, Math.max(0, y))));
  for (const p of partes) figuras.push(...p.facetas);
  figuras.push(...cristales);
  for (const p of partes) {
    // El filo de luz: un resplandor ancho y tenue, y encima la línea fina y brillante.
    figuras.push(
      { puntos: p.filo, relleno: "none", borde: C.filo, grosor: 5, opacidad: 0.18, abierta: true },
      { puntos: p.filo, relleno: "none", borde: C.filo, grosor: 1.5, opacidad: 0.95, abierta: true },
    );
  }

  // Motas de luz flotando por toda la cueva.
  for (let i = 0; i < 22; i++) {
    motas.push({
      x: r1(ancho * (0.12 + azar() * 0.76)),
      y: r1(alto * (0.08 + azar() * 0.84)),
      r: r1(0.8 + azar() * 1.8),
      color: azar() < 0.75 ? C.mota : C.cristal2Claro,
      opacidad: r1(0.25 + azar() * 0.5),
    });
  }

  return { figuras, halos, motas };
}

/** Los puntos de un polígono como texto para SVG ("x,y x,y …"). */
export const puntosSvg = (p: P[]) => p.map(([x, y]) => `${x},${y}`).join(" ");
