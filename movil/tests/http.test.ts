/// <reference types="node" />

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { ErrorRed, obtenerJson } from "../src/lib/http.ts";

const fetchOriginal = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

function simular(respuesta: () => Promise<Response>) {
  globalThis.fetch = (() => respuesta()) as typeof fetch;
}

test("devuelve el JSON de una respuesta correcta", async () => {
  simular(async () => new Response(JSON.stringify({ a: 1 }), { status: 200 }));
  assert.deepEqual(await obtenerJson("https://x"), { a: 1 });
});

test("un error HTTP conserva el código de estado", async () => {
  simular(async () => new Response("no", { status: 400 }));
  await assert.rejects(obtenerJson("https://x"), (e) => e instanceof ErrorRed && e.estado === 400 && /400/.test(e.message));
});

test("una respuesta que no es JSON no se confunde con falta de conexión", async () => {
  simular(async () => new Response("<html>mantenimiento</html>", { status: 200 }));
  await assert.rejects(obtenerJson("https://x"), (e) => e instanceof ErrorRed && /no válidos/.test(e.message));
});

test("sin red: mensaje de conexión", async () => {
  simular(async () => {
    throw new TypeError("Network request failed");
  });
  await assert.rejects(obtenerJson("https://x"), (e) => e instanceof ErrorRed && e.estado === null && /conexión/.test(e.message));
});

test("se cancela al pasar el tiempo máximo", async () => {
  globalThis.fetch = ((_url: string, init: RequestInit) =>
    new Promise((_, rechazar) => {
      init.signal!.addEventListener("abort", () => rechazar(new DOMException("abortado", "AbortError")));
    })) as typeof fetch;
  await assert.rejects(obtenerJson("https://x", 50), (e) => e instanceof ErrorRed && /tardó demasiado/.test(e.message));
});
