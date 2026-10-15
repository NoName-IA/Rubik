// Genera la "voz" de Rubo para cada frase (assets/sonidos/voz-N.wav):
//
//     node --experimental-strip-types scripts/generar-voces.ts
//
// Un bip 8-bit (onda cuadrada) por letra, con los mismos tiempos con que se escribe en pantalla
// (`letras` en src/lib/dialogo.ts): silencio en los espacios y en los puntos suspensivos. Dura justo lo
// que el texto y se calla sola. Si cambian las frases, hay que volver a correrlo.

import { writeFileSync } from "node:fs";

import { letras, TODAS_LAS_FRASES } from "../src/lib/dialogo.ts";

const FS = 22050;
const TONOS = [262, 277, 262, 247, 270, 262, 254, 277];
const BIP = Math.round(0.03 * FS);

function voz(texto: string): Int16Array {
  const partes = letras(texto);
  const total = partes.reduce((t, l) => t + Math.round((l.ms * FS) / 1000), 0);
  const muestras = new Int16Array(total);
  let inicio = 0;
  partes.forEach((l, k) => {
    if (l.suena) {
      const f = TONOS[k % TONOS.length];
      for (let i = 0; i < BIP; i++) {
        const onda = (i * f) / FS - Math.floor((i * f) / FS) < 0.5 ? 1 : -1;
        const envolvente = Math.min(1, i / 40) * (1 - i / BIP) ** 0.6;
        muestras[inicio + i] = Math.round(onda * envolvente * 0.55 * 32767);
      }
    }
    inicio += Math.round((l.ms * FS) / 1000);
  });
  return muestras;
}

function wav(muestras: Int16Array): Buffer {
  const datos = Buffer.from(muestras.buffer);
  const cabecera = Buffer.alloc(44);
  cabecera.write("RIFF", 0);
  cabecera.writeUInt32LE(36 + datos.length, 4);
  cabecera.write("WAVEfmt ", 8);
  cabecera.writeUInt32LE(16, 16);
  cabecera.writeUInt16LE(1, 20); // PCM
  cabecera.writeUInt16LE(1, 22); // mono
  cabecera.writeUInt32LE(FS, 24);
  cabecera.writeUInt32LE(FS * 2, 28);
  cabecera.writeUInt16LE(2, 32);
  cabecera.writeUInt16LE(16, 34);
  cabecera.write("data", 36);
  cabecera.writeUInt32LE(datos.length, 40);
  return Buffer.concat([cabecera, datos]);
}

for (const { texto, voz: n } of TODAS_LAS_FRASES) {
  writeFileSync(new URL(`../assets/sonidos/voz-${n}.wav`, import.meta.url), wav(voz(texto)));
  console.log(`voz-${n}.wav  ${texto}`);
}
