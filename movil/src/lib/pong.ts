// Pong: tú (abajo) contra la máquina (arriba). Sin React, probado con node:test.
// Medidas en "anchos de cancha": x va de 0 a 1 y y de 0 a `alto` (alto ÷ ancho de la pantalla),
// así los ángulos y las velocidades son iguales en cualquier celular.

export type Nivel = "normal" | "ia";
export const NIVELES: readonly Nivel[] = ["normal", "ia"];

/**
 * Goles para ganar en normal (los dos). En la IA tú necesitas `GOLES_IA` (los 7 corazones de Rubo) y
 * Rubo solo `CORAZONES_JUGADOR` (los tuyos).
 */
export const PUNTOS_PARA_GANAR = 3;
export const GOLES_IA = 7;
export const CORAZONES_JUGADOR = 3;
/** Cuántos goles necesita cada uno para ganar. */
export const metas = (nivel: Nivel) =>
  nivel === "ia" ? { jugador: GOLES_IA, maquina: CORAZONES_JUGADOR } : { jugador: PUNTOS_PARA_GANAR, maquina: PUNTOS_PARA_GANAR };
/**
 * Con cuántos goles tuyos empieza cada fase de la IA: la 2 con el 2.º gol, la 3 con el 4.º y la 4 con
 * el 6.º, cuando a Rubo le queda un solo corazón.
 */
export const GOLES_FASE_2 = 2;
export const GOLES_FASE_3 = 4;
export const GOLES_FASE_4 = GOLES_IA - 1;
export type Fase = 1 | 2 | 3 | 4;
/** Fase de Rubo según tus goles. En normal siempre es 1. */
export function faseRubo(e: Pick<Estado, "nivel" | "puntos">): Fase {
  if (e.nivel === "normal") return 1;
  const g = e.puntos.jugador;
  return g >= GOLES_FASE_4 ? 4 : g >= GOLES_FASE_3 ? 3 : g >= GOLES_FASE_2 ? 2 : 1;
}
export const BARRA_ANCHO = 0.42;
export const BARRA_ALTO = 0.055;
/** Distancia del centro de cada barra a su borde de la cancha. */
export const MARGEN = 0.11;
export const BOLA_RADIO = 0.027;
/** Velocidades en anchos de cancha por segundo. */
export const VEL_INICIAL = 0.85;
export const VEL_MAXIMA = 2.1;
/** Cada golpe acelera la bola un 6 %. */
const ACELERACION = 1.06;
/** Ángulo de salida al pegar en la punta de la barra (en el centro sale recta). */
const ANGULO_MAXIMO = (60 * Math.PI) / 180;
/** El saque sale con un ángulo al azar de hasta 25°. */
const ANGULO_SAQUE = (25 * Math.PI) / 180;
/** Pasos de simulación de 1/240 s como máximo, para que la bola no atraviese una barra. */
const PASO_MAXIMO = 1 / 240;

/**
 * Cómo juega la máquina en cada nivel. `velocidad`: cuánto se mueve su barra por segundo.
 * `error`: hasta cuánto se equivoca al apuntar; pasado 0,237 (media barra + la bola) falla.
 * `reaccion`: solo va por la bola cuando esta ya recorrió esa fracción de la cancha hacia ella.
 * `prevee`: calcula los rebotes en las paredes (si no, solo persigue la bola).
 * `ataca`: en vez de equivocarse, pega con la punta de la barra para mandar la bola lejos de la tuya.
 * `descuido`: con `ataca`, la probabilidad de que en un golpe no ataque y apunte con `error` (y falle).
 * `ritmo`: multiplica la velocidad del saque. `tope`: multiplica la velocidad máxima de la bola.
 * `aceleracion`: cuánto se acelera la bola por segundo mientras está en juego (anchos de cancha/s²).
 * `subidaSaque`: cuánto más rápido sale cada saque por cada punto ya jugado (0,08 = 8 %).
 * La IA (fase 3) llega a todas, casi siempre ataca y su bola va cada vez más rápido, pero de vez en
 * cuando se descuida: es muy difícil, no imposible. No empieza así: ver `perfil`.
 */
export interface Perfil {
  velocidad: number;
  error: number;
  reaccion: number;
  prevee: boolean;
  ataca: boolean;
  descuido: number;
  ritmo: number;
  tope: number;
  aceleracion: number;
  subidaSaque: number;
}

export const MAQUINA: Record<Nivel, Perfil> = {
  normal: {
    velocidad: 1.4,
    error: 0.265,
    reaccion: 0,
    prevee: true,
    ataca: false,
    descuido: 0,
    ritmo: 1,
    tope: 1,
    aceleracion: 0,
    subidaSaque: 0,
  },
  ia: {
    velocidad: 3,
    error: 0.34,
    reaccion: 0,
    prevee: true,
    ataca: true,
    descuido: 0.2,
    ritmo: 1.15,
    tope: 1.6,
    aceleracion: 0.08,
    subidaSaque: 0.04,
  },
};

/**
 * La IA en la fase 2 (desde tu 2.º gol): más rápida y con menos errores que el modo normal, pero
 * todavía se le hacen goles (falla de vez en cuando y no siempre alcanza la bola).
 */
export const IA_PICADA: Perfil = {
  velocidad: 2,
  error: 0.25,
  reaccion: 0,
  prevee: true,
  ataca: false,
  descuido: 0,
  ritmo: 1.08,
  tope: 1.25,
  aceleracion: 0.03,
  subidaSaque: 0.03,
};

/**
 * La IA en la fase 4 (le queda un corazón): igual que en la 3 pero sin descuidos ni errores. Llega a
 * todas y siempre ataca lejos de tu barra: el último corazón no se puede romper.
 */
export const IA_INVENCIBLE: Perfil = { ...MAQUINA.ia, error: 0, descuido: 0 };

/**
 * Cómo juega la máquina ahora. En normal, siempre igual. En la IA depende de la fase (tus goles): en
 * la 1 juega como en normal, en la 2 se pica (`IA_PICADA`), en la 3 se pone durísima (`MAQUINA.ia`) y
 * en la 4 es invencible (`IA_INVENCIBLE`).
 */
export function perfil(e: Pick<Estado, "nivel" | "puntos">): Perfil {
  return [MAQUINA.normal, IA_PICADA, MAQUINA.ia, IA_INVENCIBLE][faseRubo(e) - 1];
}

/** Velocidad máxima de la bola en un nivel (en la IA, la de la fase 3). */
export const velocidadTope = (nivel: Nivel) => VEL_MAXIMA * MAQUINA[nivel].tope;
const topeDe = (e: Pick<Estado, "nivel" | "puntos">) => VEL_MAXIMA * perfil(e).tope;

export interface Bola {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Estado {
  alto: number;
  nivel: Nivel;
  bola: Bola;
  /** Centro de cada barra. */
  jugador: number;
  maquina: number;
  puntos: { jugador: number; maquina: number };
  /** "saque": la bola espera en el centro hasta que el jugador toque la pantalla (ver `sacarYa`). */
  fase: "saque" | "jugando" | "fin";
  /** Hacia dónde sale el próximo saque: hacia quien perdió el último punto. */
  sacaHacia: "jugador" | "maquina";
  /** Desvío de la máquina al apuntar; se elige al azar cada vez que la bola va hacia ella. */
  errorMaquina: number;
  /**
   * Qué tan rápido corre el juego (bola y barra de la máquina): 1 normal, 2 el doble (con RuboKill).
   * Tu barra sigue al dedo igual.
   */
  rapidez: number;
}

export type Azar = () => number;

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const mitad = BARRA_ANCHO / 2;
const limitarBarra = (x: number) => limitar(x, mitad, 1 - mitad);

/** Altura de la cara de cada barra que mira a la cancha. */
export const caraJugador = (alto: number) => alto - MARGEN - BARRA_ALTO / 2;
export const caraMaquina = () => MARGEN + BARRA_ALTO / 2;

export function nuevoJuego(alto: number, nivel: Nivel, rapidez = 1): Estado {
  return {
    alto,
    nivel,
    bola: { x: 0.5, y: alto / 2, vx: 0, vy: 0 },
    jugador: 0.5,
    maquina: 0.5,
    puntos: { jugador: 0, maquina: 0 },
    fase: "saque",
    sacaHacia: "jugador",
    errorMaquina: 0,
    rapidez,
  };
}

/** Si la pantalla cambia de tamaño se conserva la partida, con la bola en la misma proporción. */
export function cambiarAlto(e: Estado, alto: number): Estado {
  return { ...e, alto, bola: { ...e.bola, y: (e.bola.y / e.alto) * alto } };
}

export function ganador(e: Estado): "jugador" | "maquina" | null {
  const meta = metas(e.nivel);
  if (e.puntos.jugador >= meta.jugador) return "jugador";
  if (e.puntos.maquina >= meta.maquina) return "maquina";
  return null;
}

function sacar(e: Estado, azar: Azar): Bola {
  const angulo = (azar() * 2 - 1) * ANGULO_SAQUE;
  const haciaAbajo = e.sacaHacia === "jugador" ? 1 : -1;
  // En la IA cada saque sale un poco más rápido que el anterior.
  const m = perfil(e);
  const jugados = e.puntos.jugador + e.puntos.maquina;
  const rapidez = Math.min(VEL_INICIAL * m.ritmo * (1 + m.subidaSaque * jugados), topeDe(e));
  return { x: 0.5, y: e.alto / 2, vx: rapidez * Math.sin(angulo), vy: haciaAbajo * rapidez * Math.cos(angulo) };
}

/** Dónde cruzará la bola la altura `y`, contando los rebotes en las paredes de los lados. */
export function preverX(b: Bola, y: number): number {
  if (b.vy === 0) return b.x;
  const t = (y - b.y) / b.vy;
  if (t < 0) return b.x;
  // Se "despliega" la cancha: el ancho útil va de r a 1 - r y cada rebote es un espejo.
  const ancho = 1 - 2 * BOLA_RADIO;
  const libre = b.x + b.vx * t - BOLA_RADIO;
  const vuelta = ((libre % (2 * ancho)) + 2 * ancho) % (2 * ancho);
  return BOLA_RADIO + (vuelta <= ancho ? vuelta : 2 * ancho - vuelta);
}

/** Rebote en una barra: el ángulo depende de dónde pegue, y la bola sale un poco más rápida. */
function rebotar(b: Bola, centroBarra: number, haciaAbajo: boolean, tope: number): Bola {
  const donde = limitar((b.x - centroBarra) / (mitad + BOLA_RADIO), -1, 1);
  const rapidez = Math.min(Math.hypot(b.vx, b.vy) * ACELERACION, tope);
  const angulo = donde * ANGULO_MAXIMO;
  return { ...b, vx: rapidez * Math.sin(angulo), vy: (haciaAbajo ? 1 : -1) * rapidez * Math.cos(angulo) };
}

/**
 * Dónde le pegará la máquina a la bola que viene, respecto al centro de su barra. Se elige cuando la
 * bola sale hacia ella (`jugador`: dónde está tu barra en ese momento).
 */
function apuntar(m: Perfil, jugador: number, azar: Azar): number {
  // Pegar con la parte derecha de la barra (barra corrida a la izquierda) manda la bola a la derecha.
  if (m.ataca && azar() >= m.descuido) return (jugador < 0.5 ? -1 : 1) * mitad * 0.8;
  return (azar() * 2 - 1) * m.error;
}

/** Hacia dónde quiere ir la máquina ahora. */
export function objetivoMaquina(e: Estado): number {
  const m = perfil(e);
  const b = e.bola;
  // Si la bola se aleja (o no ha salido), vuelve al centro.
  if (e.fase !== "jugando" || b.vy >= 0) return 0.5;
  const recorrido = 1 - (b.y - caraMaquina()) / (e.alto - caraMaquina());
  if (recorrido < m.reaccion) return 0.5;
  const x = m.prevee ? preverX(b, caraMaquina() + BOLA_RADIO) : b.x;
  return x + e.errorMaquina;
}

function moverMaquina(e: Estado, dt: number): number {
  const m = perfil(e);
  const objetivo = limitarBarra(objetivoMaquina(e));
  // De vuelta al centro va a media velocidad.
  const tope = m.velocidad * dt * (e.bola.vy >= 0 ? 0.5 : 1);
  return limitarBarra(e.maquina + limitar(objetivo - e.maquina, -tope, tope));
}

function paso(e: Estado, dt: number, azar: Azar): Estado {
  let b: Bola = { ...e.bola, x: e.bola.x + e.bola.vx * dt, y: e.bola.y + e.bola.vy * dt };

  // Aceleración continua (IA): la bola gana velocidad mientras está en juego, sin pasar del tope.
  const m = perfil(e);
  if (m.aceleracion > 0) {
    const rapidez = Math.hypot(b.vx, b.vy);
    const nueva = Math.min(rapidez + m.aceleracion * dt, topeDe(e));
    if (rapidez > 0 && nueva > rapidez) b = { ...b, vx: (b.vx * nueva) / rapidez, vy: (b.vy * nueva) / rapidez };
  }
  let errorMaquina = e.errorMaquina;

  // Paredes de los lados.
  if (b.x < BOLA_RADIO) b = { ...b, x: 2 * BOLA_RADIO - b.x, vx: Math.abs(b.vx) };
  else if (b.x > 1 - BOLA_RADIO) b = { ...b, x: 2 * (1 - BOLA_RADIO) - b.x, vx: -Math.abs(b.vx) };

  // Barra del jugador (abajo).
  const cj = caraJugador(e.alto);
  if (
    b.vy > 0 &&
    b.y + BOLA_RADIO >= cj &&
    e.bola.y + BOLA_RADIO <= cj + BARRA_ALTO &&
    Math.abs(b.x - e.jugador) <= mitad + BOLA_RADIO
  ) {
    b = { ...rebotar(b, e.jugador, false, topeDe(e)), y: cj - BOLA_RADIO };
    errorMaquina = apuntar(m, e.jugador, azar);
  }

  // Barra de la máquina (arriba).
  const cm = caraMaquina();
  if (
    b.vy < 0 &&
    b.y - BOLA_RADIO <= cm &&
    e.bola.y - BOLA_RADIO >= cm - BARRA_ALTO &&
    Math.abs(b.x - e.maquina) <= mitad + BOLA_RADIO
  ) {
    b = { ...rebotar(b, e.maquina, true, topeDe(e)), y: cm + BOLA_RADIO };
  }

  // Punto: la bola salió por abajo o por arriba.
  const salioAbajo = b.y - BOLA_RADIO > e.alto;
  const salioArriba = b.y + BOLA_RADIO < 0;
  if (salioAbajo || salioArriba) {
    const puntos = salioAbajo ? { ...e.puntos, maquina: e.puntos.maquina + 1 } : { ...e.puntos, jugador: e.puntos.jugador + 1 };
    const siguiente: Estado = {
      ...e,
      puntos,
      bola: { x: 0.5, y: e.alto / 2, vx: 0, vy: 0 },
      fase: "saque",
      sacaHacia: salioAbajo ? "jugador" : "maquina",
      errorMaquina: 0,
    };
    return ganador(siguiente) ? { ...siguiente, fase: "fin" } : siguiente;
  }

  return { ...e, bola: b, errorMaquina };
}

/** Saca (si la bola está esperando en el centro): se llama cuando el jugador toca la pantalla. */
export function sacarYa(e: Estado, azar: Azar = Math.random): Estado {
  if (e.fase !== "saque") return e;
  const bola = sacar(e, azar);
  const errorMaquina = bola.vy < 0 ? apuntar(perfil(e), e.jugador, azar) : 0;
  return { ...e, fase: "jugando", bola, errorMaquina };
}

/**
 * Avanza el juego `dt` segundos. `dedoX`: dónde está el dedo del jugador (0 a 1), o `null` si no
 * está tocando (la barra se queda donde está).
 */
export function avanzar(e: Estado, dt: number, dedoX: number | null, azar: Azar = Math.random): Estado {
  if (e.fase === "fin") return e;
  // Si el celular se trabó un momento, no se salta medio partido. Con `rapidez` el juego corre más
  // tiempo por cada cuadro, en los mismos pasos cortos (así la bola tampoco atraviesa las barras).
  let resto = Math.min(dt, 0.1) * e.rapidez;
  let s: Estado = { ...e, jugador: dedoX === null ? e.jugador : limitarBarra(dedoX) };

  while (resto > 0 && s.fase !== "fin") {
    const d = Math.min(resto, PASO_MAXIMO);
    resto -= d;
    s = { ...s, maquina: moverMaquina(s, d) };
    // En el saque solo se mueven las barras: la bola espera el toque.
    if (s.fase === "jugando") s = paso(s, d, azar);
  }
  return s;
}
