/// <reference types="node" />

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  FRASES_RUBO,
  letras,
  MS_POR_LETRA,
  PAUSA_ENTRE_FRASES,
  SILENCIO_PUNTOS,
  tiempoEscribiendo,
  tiempoHablando,
  TODAS_LAS_FRASES,
} from "../src/lib/dialogo.ts";
import { GOLES_FASE_4 } from "../src/lib/pong.ts";

test("con el último corazón Rubo dice dos frases seguidas", () => {
  assert.deepEqual(
    FRASES_RUBO[GOLES_FASE_4].map((f) => f.texto),
    ["¿Así que así será?..", "Bueno..."],
  );
  const [a, b] = FRASES_RUBO[GOLES_FASE_4];
  assert.equal(tiempoHablando([a, b]), tiempoEscribiendo(a.texto) + PAUSA_ENTRE_FRASES + tiempoEscribiendo(b.texto));
});

test("los puntos suspensivos cuentan como letras: lentos (al menos 1 s entre todos) y en silencio", () => {
  for (const texto of ["¿Así que así será?..", "Bueno..."]) {
    const puntos = letras(texto).filter((l) => l.letra === ".");
    assert.ok(puntos.length >= 2);
    assert.ok(
      puntos.every((l) => !l.suena),
      "no suenan",
    );
    assert.ok(puntos.reduce((t, l) => t + l.ms, 0) >= SILENCIO_PUNTOS, texto);
  }
  // Las demás letras van rápido con su bip; los espacios no suenan.
  const bueno = letras("Bueno...");
  assert.deepEqual(
    bueno.slice(0, 5).map((l) => [l.ms, l.suena]),
    Array(5).fill([MS_POR_LETRA, true]),
  );
  assert.equal(letras("a b")[1].suena, false);
  assert.equal(letras("Fin.")[3].suena, true, "un punto solo no es suspensivo");
});

test("cada voz (assets/sonidos/voz-N.wav) dura justo lo que tarda en escribirse su frase", () => {
  for (const { texto, voz } of TODAS_LAS_FRASES) {
    const wav = readFileSync(new URL(`../assets/sonidos/voz-${voz}.wav`, import.meta.url));
    const ms = (wav.readUInt32LE(40) / 2 / wav.readUInt32LE(24)) * 1000;
    assert.ok(
      Math.abs(ms - tiempoEscribiendo(texto)) < 5,
      `voz-${voz}: ${ms} ms vs ${tiempoEscribiendo(texto)} ms (¿falta correr scripts/generar-voces.ts?)`,
    );
  }
});
