// Saludo y fecha en español, sin depender de Intl (no todos los Android lo traen completo).

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function saludo(fecha: Date): string {
  const h = fecha.getHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** "lunes 12 de octubre" */
export function fechaLarga(fecha: Date): string {
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

/** Lee "2026-10-12" como fecha local (sin desfases de zona horaria). */
function leerFecha(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
}

/** "Hoy", "Mañana" o "Miércoles 14", respecto a `hoy` ("2026-10-12"). */
export function nombreDia(iso: string, hoy: string): string {
  const dias = Math.round((leerFecha(iso).getTime() - leerFecha(hoy).getTime()) / 86_400_000);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  const f = leerFecha(iso);
  const nombre = DIAS[f.getDay()];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${f.getDate()}`;
}

/** "Mié" */
export function diaCorto(iso: string): string {
  const nombre = DIAS[leerFecha(iso).getDay()];
  return nombre.charAt(0).toUpperCase() + nombre.slice(1, 3);
}
