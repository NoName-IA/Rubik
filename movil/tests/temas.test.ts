/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import { contraste, PALETAS, TEMAS } from "../src/lib/temas.ts";

test("contraste: blanco sobre negro es 21 y un color consigo mismo es 1", () => {
  assert.ok(Math.abs(contraste("#FFFFFF", "#000000") - 21) < 1e-9);
  assert.equal(contraste("#7C3AED", "#7C3AED"), 1);
});

test("cada tema, claro y oscuro: los textos se leen (≥ 4,5:1) sobre el fondo y las tarjetas", () => {
  for (const paleta of PALETAS) {
    for (const modo of ["oscuro", "claro"] as const) {
      const c = TEMAS[paleta][modo];
      for (const texto of ["tinta", "tinta2", "apagado", "enfasis"] as const) {
        for (const sobre of ["fondo", "superficie"] as const) {
          const r = contraste(c[texto], c[sobre]);
          assert.ok(r >= 4.5, `${paleta} ${modo}: ${texto} sobre ${sobre} = ${r.toFixed(2)}`);
        }
      }
      const boton = contraste(c.sobreEnfasis, c.enfasis);
      assert.ok(boton >= 4.5, `${paleta} ${modo}: texto del botón = ${boton.toFixed(2)}`);
    }
  }
});

test("el tema violeta es el de siempre", () => {
  assert.equal(TEMAS.violeta.oscuro.fondo, "#0F0D29");
  assert.equal(TEMAS.violeta.oscuro.enfasis, "#A78BFA");
  assert.equal(TEMAS.violeta.claro.enfasis, "#7C3AED");
  assert.equal(TEMAS.violeta.oscuro.barra, "rgba(15, 13, 41, 0.92)");
});
