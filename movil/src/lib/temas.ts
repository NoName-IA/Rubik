// Temas de color de la app (sin React, probado con node:test). Cada tema es una paleta completa con
// versión oscura y clara: fondo, tarjetas, texto y acento. Lo que tiene un significado propio (alerta,
// peligro, la rampa de lluvia) es igual en todos los temas. Los textos tienen contraste ≥ 4,5:1 sobre el
// fondo y las tarjetas (ver tests/temas.test.ts).

export type Paleta = "violeta" | "oceano" | "bosque" | "atardecer" | "rosa";

/** Lo que cambia de un tema a otro. */
interface Base {
  fondo: string;
  /** Tarjetas: un poco más claras (en oscuro) o más blancas (en claro) que el fondo. */
  superficie: string;
  borde: string;
  tinta: string;
  tinta2: string;
  apagado: string;
  enfasis: string;
  enfasisSuave: string;
  /** Texto sobre un fondo de color `enfasis` (botones). */
  sobreEnfasis: string;
  /** Caracteres de la "lluvia de código" del fondo. */
  codigo: string;
  /** Navbar inferior: fondo casi opaco y borde superior tenue. */
  barra: string;
  bordeBarra: string;
  inactivo: string;
}

const FIJOS_OSCURO = {
  alerta: "#F5A55C",
  alertaSuave: "#342531",
  /** Rojo del modo IA del Rubo (barra, falla de pantalla) y su fondo de cancha. */
  peligro: "#FF5C6C",
  peligroSuave: "#36182A",
  // Rampa secuencial de intensidad de lluvia. En oscuro se invierte: más claro = más fuerte.
  lluvia: { sin: "#33608C", ligera: "#4A8BCB", moderada: "#78B8F4", fuerte: "#BADDFF" },
};

const FIJOS_CLARO: typeof FIJOS_OSCURO = {
  alerta: "#B54708",
  alertaSuave: "#F8EDE6",
  peligro: "#C62839",
  peligroSuave: "#FBE9EC",
  lluvia: { sin: "#86B6E6", ligera: "#4F93DA", moderada: "#2163B0", fuerte: "#0D3B70" },
};

export type Colores = Base & typeof FIJOS_OSCURO;

/** rgba(...) de un color #RRGGBB. */
const rgba = (hex: string, a: number) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${a})`;

/** Arma una paleta oscura y una clara; la navbar y lo inactivo salen del fondo, la tinta y el acento. */
function tema(oscuro: Omit<Base, "barra" | "bordeBarra" | "inactivo">, claro: Omit<Base, "barra" | "bordeBarra" | "inactivo">) {
  return {
    oscuro: {
      ...oscuro,
      barra: rgba(oscuro.fondo, 0.92),
      bordeBarra: rgba("#FFFFFF", 0.15),
      inactivo: rgba(oscuro.enfasis, 0.6),
      ...FIJOS_OSCURO,
    },
    claro: {
      ...claro,
      barra: rgba(claro.fondo, 0.94),
      bordeBarra: rgba(claro.tinta, 0.15),
      inactivo: rgba(claro.enfasis, 0.6),
      ...FIJOS_CLARO,
    },
  } satisfies { oscuro: Colores; claro: Colores };
}

export const TEMAS: Record<Paleta, { nombre: string; oscuro: Colores; claro: Colores }> = {
  // El de siempre, tomado de portfolio_web (VSCODEX): fondo índigo y acento violeta.
  violeta: {
    nombre: "Violeta",
    ...tema(
      {
        fondo: "#0F0D29",
        superficie: "#1A1638",
        borde: "#302957",
        tinta: "#FFFFFF",
        tinta2: "#B2BED1",
        apagado: "#8E8CB0",
        enfasis: "#A78BFA",
        enfasisSuave: "#2A244F",
        sobreEnfasis: "#0F0D29",
        codigo: "#7D7B9C",
      },
      {
        fondo: "#F5F3FF",
        superficie: "#FBF9FE",
        borde: "#DFD2FC",
        tinta: "#1E1B4B",
        tinta2: "#4B5563",
        apagado: "#6E6A99",
        enfasis: "#7C3AED",
        enfasisSuave: "#E6DDFD",
        sobreEnfasis: "#FFFFFF",
        codigo: "#97A7DC",
      },
    ),
  },
  oceano: {
    nombre: "Océano",
    ...tema(
      {
        fondo: "#0A1A2B",
        superficie: "#10263B",
        borde: "#1E3A56",
        tinta: "#FFFFFF",
        tinta2: "#B4C6D8",
        apagado: "#8AA2B8",
        enfasis: "#38BDF8",
        enfasisSuave: "#123650",
        sobreEnfasis: "#0A1A2B",
        codigo: "#6F8BA5",
      },
      {
        fondo: "#F0F7FF",
        superficie: "#F8FBFF",
        borde: "#CFE3F5",
        tinta: "#0B2540",
        tinta2: "#475569",
        apagado: "#5A7189",
        enfasis: "#0369A1",
        enfasisSuave: "#DBEEFC",
        sobreEnfasis: "#FFFFFF",
        codigo: "#93B6D6",
      },
    ),
  },
  bosque: {
    nombre: "Bosque",
    ...tema(
      {
        fondo: "#0C1A14",
        superficie: "#12251C",
        borde: "#20402F",
        tinta: "#FFFFFF",
        tinta2: "#B5CCBF",
        apagado: "#8BA897",
        enfasis: "#4ADE80",
        enfasisSuave: "#173A28",
        sobreEnfasis: "#0C1A14",
        codigo: "#6E8F7C",
      },
      {
        fondo: "#F1F8F3",
        superficie: "#F9FCFA",
        borde: "#CFE6D7",
        tinta: "#12301F",
        tinta2: "#4B5563",
        apagado: "#557563",
        enfasis: "#15803D",
        enfasisSuave: "#DCF2E3",
        sobreEnfasis: "#FFFFFF",
        codigo: "#96C2A6",
      },
    ),
  },
  atardecer: {
    nombre: "Atardecer",
    ...tema(
      {
        fondo: "#1C1010",
        superficie: "#2A1817",
        borde: "#4A2A25",
        tinta: "#FFFFFF",
        tinta2: "#D6C1BA",
        apagado: "#AE928A",
        enfasis: "#FB923C",
        enfasisSuave: "#43251A",
        sobreEnfasis: "#1C1010",
        codigo: "#9A7A72",
      },
      {
        fondo: "#FFF6F0",
        superficie: "#FFFBF8",
        borde: "#F6D9C8",
        tinta: "#3B1A0E",
        tinta2: "#57483F",
        apagado: "#806052",
        enfasis: "#C2410C",
        enfasisSuave: "#FDE6D7",
        sobreEnfasis: "#FFFFFF",
        codigo: "#E0B39A",
      },
    ),
  },
  rosa: {
    nombre: "Rosa",
    ...tema(
      {
        fondo: "#1D0D1C",
        superficie: "#2B1529",
        borde: "#4A2546",
        tinta: "#FFFFFF",
        tinta2: "#D8BFD4",
        apagado: "#B08DAA",
        enfasis: "#F472B6",
        enfasisSuave: "#47203F",
        sobreEnfasis: "#1D0D1C",
        codigo: "#9C7495",
      },
      {
        fondo: "#FFF4FA",
        superficie: "#FFFAFD",
        borde: "#F8D3E7",
        tinta: "#4A0D2E",
        tinta2: "#5B4A55",
        apagado: "#85606F",
        enfasis: "#BE185D",
        enfasisSuave: "#FCE1EE",
        sobreEnfasis: "#FFFFFF",
        codigo: "#E3A9C7",
      },
    ),
  },
};

export const PALETAS = Object.keys(TEMAS) as Paleta[];

/** Contraste WCAG entre dos colores #RRGGBB (1 a 21). */
export function contraste(a: string, b: string): number {
  const luz = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
