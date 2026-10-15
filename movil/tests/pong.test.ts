/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  avanzar,
  BARRA_ANCHO,
  BOLA_RADIO,
  caraJugador,
  caraMaquina,
  type Estado,
  ganador,
  IA_PICADA,
  MAQUINA,
  type Nivel,
  nuevoJuego,
  objetivoMaquina,
  perfil,
  preverX,
  PUNTOS_PARA_GANAR,
  sacarYa,
  VEL_INICIAL,
  VEL_MAXIMA,
  velocidadTope,
} from "../src/lib/pong.ts";

const ALTO = 1.85;
const DT = 1 / 60;

/** Azar repetible (mulberry32), para que las pruebas den siempre lo mismo. */
function azarFijo(semilla: number) {
  let a = semilla;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const jugando = (e: Estado, bola: Partial<Estado["bola"]>): Estado => ({ ...e, fase: "jugando", bola: { ...e.bola, ...bola } });
const rapidez = (e: Estado) => Math.hypot(e.bola.vx, e.bola.vy);
/** La IA ya imposible: con 2 goles tuyos (ver `perfil`). */
const iaImposible = (maquina = 0): Estado => ({ ...nuevoJuego(ALTO, "ia"), puntos: { jugador: 2, maquina } });

test("la bola espera en el centro hasta el toque, y saca hacia el jugador", () => {
  let e = nuevoJuego(ALTO, "normal");
  assert.equal(e.fase, "saque");
  for (let i = 0; i < 600; i++) e = avanzar(e, DT, 0.3);
  assert.equal(e.fase, "saque", "sin toque no arranca aunque pase el tiempo");
  assert.equal(e.bola.y, ALTO / 2);
  assert.equal(e.jugador, 0.3, "la barra sí se mueve mientras espera");
  e = sacarYa(e);
  assert.equal(e.fase, "jugando");
  assert.ok(e.bola.vy > 0, "sale hacia abajo");
  assert.ok(Math.abs(rapidez(e) - VEL_INICIAL) < 1e-9);
});

test("la barra sigue al dedo sin salirse de la cancha", () => {
  const e = nuevoJuego(ALTO, "normal");
  assert.equal(avanzar(e, DT, 0.3).jugador, 0.3);
  assert.equal(avanzar(e, DT, 0).jugador, BARRA_ANCHO / 2);
  assert.equal(avanzar(e, DT, 1).jugador, 1 - BARRA_ANCHO / 2);
  assert.equal(avanzar({ ...e, jugador: 0.7 }, DT, null).jugador, 0.7);
});

test("rebota en las paredes de los lados", () => {
  const e = jugando(nuevoJuego(ALTO, "normal"), { x: BOLA_RADIO + 0.001, y: 0.9, vx: -1, vy: 0.2 });
  const d = avanzar(e, 0.02, null);
  assert.ok(d.bola.vx > 0);
  assert.ok(d.bola.x >= BOLA_RADIO);
});

test("rebote en la barra: recto en el centro, en diagonal en la punta, y más rápido", () => {
  const cj = caraJugador(ALTO);
  const base = jugando(nuevoJuego(ALTO, "normal"), { y: cj - BOLA_RADIO - 0.001, vx: 0, vy: 1 });

  const centro = avanzar({ ...base, bola: { ...base.bola, x: 0.5 } }, 0.01, 0.5);
  assert.ok(centro.bola.vy < 0, "vuelve hacia arriba");
  assert.ok(Math.abs(centro.bola.vx) < 1e-9, "sale recta");
  assert.ok(rapidez(centro) > 1);

  const punta = avanzar({ ...base, bola: { ...base.bola, x: 0.5 + BARRA_ANCHO / 2 } }, 0.01, 0.5);
  assert.ok(punta.bola.vy < 0);
  assert.ok(punta.bola.vx > 0.5, "sale en diagonal hacia el lado donde pegó");
});

test("la velocidad no pasa del tope", () => {
  const cj = caraJugador(ALTO);
  const e = jugando(nuevoJuego(ALTO, "normal"), { x: 0.5, y: cj - BOLA_RADIO - 0.001, vx: 0, vy: VEL_MAXIMA });
  assert.ok(rapidez(avanzar(e, 0.01, 0.5)) <= VEL_MAXIMA + 1e-9);
});

test("si la bola pasa al jugador, punto para la máquina y saca hacia el jugador", () => {
  const e = jugando(nuevoJuego(ALTO, "normal"), { x: 0.05, y: ALTO - 0.01, vx: 0, vy: 1 });
  const d = avanzar(e, 0.05, 0.9);
  assert.deepEqual(d.puntos, { jugador: 0, maquina: 1 });
  assert.equal(d.fase, "saque");
  assert.equal(d.sacaHacia, "jugador");
  // Después del gol también espera el toque.
  const quieta = avanzar(d, 2, 0.5);
  assert.equal(quieta.fase, "saque");
  assert.equal(quieta.bola.y, ALTO / 2);
  assert.equal(sacarYa({ ...d, sacaHacia: "maquina" }).bola.vy < 0, true);
  assert.equal(d.bola.x, 0.5);
});

test("si la bola pasa a la máquina, punto para el jugador y saca hacia la máquina", () => {
  const e = { ...jugando(nuevoJuego(ALTO, "normal"), { x: 0.05, y: 0.01, vx: 0, vy: -1 }), maquina: 0.9 };
  const d = avanzar(e, 0.05, null);
  assert.deepEqual(d.puntos, { jugador: 1, maquina: 0 });
  assert.equal(d.sacaHacia, "maquina");
});

test("gana el primero que llega a los puntos de la partida y el juego se detiene", () => {
  const e = {
    ...jugando(nuevoJuego(ALTO, "normal"), { x: 0.05, y: 0.01, vx: 0, vy: -1 }),
    maquina: 0.9,
    puntos: { jugador: PUNTOS_PARA_GANAR - 1, maquina: 3 },
  };
  const d = avanzar(e, 0.05, null);
  assert.equal(d.fase, "fin");
  assert.equal(ganador(d), "jugador");
  assert.equal(avanzar(d, 1, 0.5), d);
});

test("prever dónde llega la bola, con rebotes en las paredes", () => {
  assert.ok(Math.abs(preverX({ x: 0.5, y: 1, vx: 0, vy: -1 }, 0.1) - 0.5) < 1e-9);
  assert.ok(Math.abs(preverX({ x: 0.5, y: 1, vx: 0.2, vy: -1 }, 0.5) - 0.6) < 1e-9);
  // Va a la derecha, rebota en la pared y vuelve.
  const x = preverX({ x: 0.8, y: 1, vx: 1, vy: -1 }, 0.5);
  assert.ok(Math.abs(x - (2 * (1 - BOLA_RADIO) - 1.3)) < 1e-9);
});

test("la máquina vuelve al centro cuando la bola se aleja", () => {
  const e = jugando(nuevoJuego(ALTO, "normal"), { x: 0.9, y: 0.9, vx: 0.3, vy: 1 });
  assert.equal(objetivoMaquina(e), 0.5);
  const viene = jugando(nuevoJuego(ALTO, "normal"), { x: 0.9, y: 0.9, vx: 0, vy: -1 });
  assert.ok(Math.abs(objetivoMaquina(viene) - 0.9) < 1e-9);
  assert.ok(caraMaquina() < 0.2);
});

/** Un jugador que nunca falla pero pega con ángulo (pone la barra cerca de la bola, corrida al azar). */
function jugarPartida(nivel: Nivel, partida: number, cuadros = 60 * 60 * 10) {
  const azar = azarFijo(partida + 1);
  const azarJugador = azarFijo(partida + 100);
  let e = nuevoJuego(ALTO, nivel);
  let subia = false;
  let corrimiento = 0;
  let golpes = 0;
  for (let i = 0; i < cuadros && e.fase !== "fin"; i++) {
    if (e.bola.vy < 0) corrimiento = (azarJugador() * 2 - 1) * 0.17;
    if (e.fase === "saque") e = sacarYa(e, azar);
    e = avanzar(e, DT, e.bola.x - corrimiento, azar);
    const sube = e.fase === "jugando" && e.bola.vy < 0;
    if (subia && e.fase === "jugando" && e.bola.vy > 0) golpes++;
    subia = sube;
  }
  return { e, golpes };
}

/** Cuántos golpes devuelve la máquina, en promedio, antes de fallar. */
function golpesPorPunto(nivel: Nivel): number {
  let golpes = 0;
  let puntos = 0;
  for (let partida = 0; partida < 20; partida++) {
    const r = jugarPartida(nivel, partida);
    assert.equal(ganador(r.e), "jugador", `${nivel}: el jugador perfecto gana`);
    golpes += r.golpes;
    puntos += r.e.puntos.jugador;
  }
  return golpes / puntos;
}

test("partidas simuladas: en normal la máquina falla de vez en cuando", () => {
  const normal = golpesPorPunto("normal");
  assert.ok(normal > 10 && normal < 30, `normal devuelve unas cuantas: ${normal}`);
});

test("la IA juega como en normal, se pica con tu primer gol y se pone imposible con el segundo", () => {
  const sin = { nivel: "ia" as const, puntos: { jugador: 0, maquina: 2 } };
  assert.equal(perfil(sin), MAQUINA.normal);
  assert.equal(perfil({ ...sin, puntos: { jugador: 1, maquina: 0 } }), IA_PICADA);
  assert.equal(perfil({ ...sin, puntos: { jugador: 2, maquina: 1 } }), MAQUINA.ia);
  assert.equal(perfil({ nivel: "normal", puntos: { jugador: 2, maquina: 0 } }), MAQUINA.normal);
});

test("partidas simuladas: a la IA se le hacen 2 goles, nunca el tercero", () => {
  for (let partida = 0; partida < 10; partida++) {
    const { e } = jugarPartida("ia", partida, 60 * 60 * 20);
    // El jugador simulado devuelve casi todo, así que la máquina tampoco llega a ganar: lo que importa
    // es que pasa de 0 a 2 y de ahí no sube.
    assert.equal(e.puntos.jugador, 2, `partida ${partida}: ${JSON.stringify(e.puntos)}`);
  }
});

test("en el modo IA imposible la bola va un 15 % más rápida", () => {
  const normal = sacarYa({ ...nuevoJuego(ALTO, "normal"), puntos: { jugador: 2, maquina: 0 } }, () => 0.5);
  const ia = sacarYa(iaImposible(), () => 0.5);
  // 15 % más, y cada saque un 8 % más por punto jugado (aquí van 2).
  assert.ok(Math.abs(rapidez(ia) / rapidez(normal) - 1.15 * 1.16) < 1e-9);
  const cj = caraJugador(ALTO);
  const rapida = jugando(iaImposible(), { x: 0.5, y: cj - BOLA_RADIO - 0.001, vx: 0, vy: VEL_MAXIMA * 1.7 });
  assert.ok(Math.abs(rapidez(avanzar(rapida, 0.01, 0.5)) - velocidadTope("ia")) < 1e-9, "su tope es más alto");
  assert.ok(velocidadTope("ia") > VEL_MAXIMA);
});

test("en el modo IA la bola se acelera mientras está en juego; en normal no", () => {
  // Bola en el centro yendo de lado a lado (rebota en las paredes, nunca llega a una barra).
  const de = (nivel: Nivel) =>
    jugando({ ...nuevoJuego(ALTO, nivel), puntos: { jugador: 2, maquina: 0 } }, { x: 0.5, y: ALTO / 2, vx: 1, vy: 0 });
  let ia = de("ia");
  let normal = de("normal");
  for (let i = 0; i < 300; i++) {
    ia = avanzar(ia, DT, null);
    normal = avanzar(normal, DT, null);
  }
  // 5 segundos a 0,08 por segundo: de 1 a 1,4.
  assert.ok(Math.abs(rapidez(ia) - 1.4) < 1e-6, `ia ${rapidez(ia)}`);
  assert.ok(Math.abs(rapidez(normal) - 1) < 1e-9);
  for (let i = 0; i < 6000; i++) ia = avanzar(ia, DT, null);
  assert.ok(rapidez(ia) <= velocidadTope("ia") + 1e-9, "no pasa del tope");
});

test("en el modo IA cada saque sale más rápido que el anterior", () => {
  const saque = (jugador: number, maquina: number) =>
    rapidez(sacarYa({ ...nuevoJuego(ALTO, "ia"), puntos: { jugador, maquina } }, () => 0.5));
  assert.ok(saque(2, 1) > saque(2, 0));
  assert.ok(saque(2, 2) > saque(2, 1));
  const normal = (maquina: number) =>
    rapidez(sacarYa({ ...nuevoJuego(ALTO, "normal"), puntos: { jugador: 0, maquina } }, () => 0.5));
  assert.equal(normal(2), normal(0));
});

test("la IA manda la bola lejos de tu barra", () => {
  // Tu barra a la izquierda: la IA se corre a la izquierda de la bola para pegarle con su punta derecha.
  let e = sacarYa({ ...iaImposible(), sacaHacia: "maquina", jugador: 0.25 }, () => 0.5);
  for (let i = 0; i < 600 && e.bola.vy < 0; i++) e = avanzar(e, DT, 0.25);
  assert.ok(e.bola.vy > 0, "la devolvió");
  assert.ok(e.bola.vx > 0, "hacia la derecha");
});

test("con rapidez 2 (RuboKill) la bola recorre el doble en el mismo tiempo", () => {
  const bola = { x: 0.5, y: 0.6, vx: 0, vy: 0.5 };
  const normal = avanzar(jugando(nuevoJuego(ALTO, "normal"), bola), DT, 0.5);
  const doble = avanzar(jugando(nuevoJuego(ALTO, "normal", 2), bola), DT, 0.5);
  assert.ok(Math.abs(doble.bola.y - 0.6 - 2 * (normal.bola.y - 0.6)) < 1e-9);
  assert.equal(doble.jugador, 0.5, "tu barra sigue al dedo igual");
});
