/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import { COLORES_CUEVA, crearCueva, puntosSvg } from "../src/lib/cueva.ts";

test("la cueva del arcade sale siempre igual y dentro de la cancha", () => {
  const a = crearCueva(330, 610);
  assert.deepEqual(a, crearCueva(330, 610), "misma semilla, misma cueva");
  assert.ok(a.figuras.length > 20 && a.halos.length > 0 && a.motas.length > 0);
  for (const f of a.figuras) {
    for (const [x, y] of f.puntos) {
      // La roca va justo hasta el borde; las puntas de los cristales pueden asomar un poco (el SVG las recorta).
      const holgura = (COLORES_CUEVA.roca as readonly string[]).includes(f.relleno) ? 0 : 60;
      assert.ok(x >= -holgura && x <= 330 + holgura && y >= -holgura && y <= 610 + holgura, `punto fuera: ${x},${y}`);
    }
  }
  assert.match(
    puntosSvg([
      [1, 2],
      [3.5, 4],
    ]),
    /^1,2 3\.5,4$/,
  );
});

test("el centro de la cancha queda libre de roca (la bola se ve)", () => {
  const { figuras } = crearCueva(330, 610);
  const rocas = figuras.filter((f) => (COLORES_CUEVA.roca as readonly string[]).includes(f.relleno));
  assert.ok(rocas.length > 50);
  for (const f of rocas) {
    for (const [x, y] of f.puntos) assert.ok(!(x > 100 && x < 230 && y > 120 && y < 490), `roca en el centro: ${x},${y}`);
  }
});
