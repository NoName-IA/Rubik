/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

import { AREAS, buscarArea, CIUDADES, municipioCercano } from "../src/lib/ciudades.ts";

test("los ids de los municipios no se repiten y cada uno apunta a un área que existe", () => {
  const ids = CIUDADES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of CIUDADES) assert.ok(buscarArea(c.area), `${c.id} apunta a un área inexistente`);
});

test("el primer municipio de cada área es la ciudad y comparte su id", () => {
  for (const a of AREAS) {
    assert.equal(a.municipios[0].id, a.id);
    assert.equal(a.municipios[0].nombre, a.nombre);
  }
});

test("buscarArea: encuentra por id y no inventa nada", () => {
  assert.equal(buscarArea("barranquilla")?.nombre, "Barranquilla");
  assert.equal(buscarArea("atlantida"), undefined);
  assert.equal(buscarArea(null), undefined);
  assert.equal(buscarArea(undefined), undefined);
});

test("municipioCercano: el más cercano dentro del radio", () => {
  // Centro de Soledad, a pocos km de Barranquilla: debe elegir Soledad, no Barranquilla.
  assert.equal(municipioCercano({ latitud: 10.918, longitud: -74.765 }, 15)?.id, "soledad");
  // Justo en las coordenadas de Barranquilla.
  assert.equal(municipioCercano({ latitud: 10.9639, longitud: -74.7964 }, 15)?.id, "barranquilla");
});

test("municipioCercano: nada si ninguno está dentro del radio", () => {
  // En el mar Caribe, lejos de todos.
  assert.equal(municipioCercano({ latitud: 13, longitud: -78 }, 15), undefined);
  // Barranquilla está a ~6 km de Soledad: con 1 km de radio no alcanza.
  assert.equal(municipioCercano({ latitud: 10.94, longitud: -74.78 }, 1), undefined);
});
