// Cálculos y textos sobre el pronóstico (sin React, probados con node:test).

import type { Hora, HoraLocal, Pronostico } from "./tipos.ts";

/** Hora local actual del lugar del pronóstico, en el mismo formato que Open-Meteo. */
export function ahoraLocal(desfaseUtc: number, ahora: number = Date.now()): HoraLocal {
  // Se desplaza el instante y se leen los campos en UTC: así no importa la zona del celular.
  return new Date(ahora + desfaseUtc * 1000).toISOString().slice(0, 16);
}

/** Las próximas `n` horas a partir de la hora en curso. */
export function proximasHoras(p: Pronostico, n: number, ahora: number = Date.now()): Hora[] {
  const horaEnCurso = `${ahoraLocal(p.desfaseUtc, ahora).slice(0, 13)}:00`;
  const i = p.horas.findIndex((h) => h.hora >= horaEnCurso);
  return i === -1 ? [] : p.horas.slice(i, i + n);
}

/** "3 p. m.", "12 m.", "12 a. m." (estilo colombiano). */
export function formatoHora(hora: HoraLocal): string {
  const h = Number(hora.slice(11, 13));
  if (h === 0) return "12 a. m.";
  if (h === 12) return "12 m.";
  return h < 12 ? `${h} a. m.` : `${h - 12} p. m.`;
}

/** "5:48 a. m." */
export function formatoHoraMinutos(hora: HoraLocal): string {
  const h = Number(hora.slice(11, 13));
  const m = hora.slice(14, 16);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const sufijo = h < 12 ? "a. m." : "p. m.";
  return `${h12}:${m} ${sufijo}`;
}

/** Categoría del índice UV según la OMS. */
export function categoriaUv(uv: number): string {
  if (uv < 3) return "bajo";
  if (uv < 6) return "moderado";
  if (uv < 8) return "alto";
  if (uv < 11) return "muy alto";
  return "extremo";
}

export function grados(valor: number): string {
  return `${Math.round(valor)}°`;
}

/** "hace 5 min", "hace 2 h" */
export function haceCuanto(desde: number, ahora: number = Date.now()): string {
  const min = Math.max(0, Math.round((ahora - desde) / 60_000));
  if (min < 1) return "justo ahora";
  if (min < 60) return `hace ${min} min`;
  if (min < 48 * 60) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} días`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Cuándo se guardaron unos datos: "de las 6:40 p. m.", "de ayer, 6:40 p. m." o "del 12 oct". */
export function deCuando(guardado: number, desfaseUtc: number, ahora: number = Date.now()): string {
  const g = ahoraLocal(desfaseUtc, guardado);
  const dias = Math.round((Date.parse(ahoraLocal(desfaseUtc, ahora).slice(0, 10)) - Date.parse(g.slice(0, 10))) / 86_400_000);
  if (dias <= 0) return `de las ${formatoHoraMinutos(g)}`;
  if (dias === 1) return `de ayer, ${formatoHoraMinutos(g)}`;
  return `del ${Number(g.slice(8, 10))} ${MESES[Number(g.slice(5, 7)) - 1]}`;
}
