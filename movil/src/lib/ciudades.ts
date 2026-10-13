// Ciudades que se pueden elegir sin GPS, y dónde aplica la alerta de arroyos (sin React, probado).

import type { Coordenadas } from "./clima/tipos.ts";
import { distanciaKm } from "./clima/respaldo.ts";

export interface Ciudad {
  id: string;
  nombre: string;
  departamento: string;
  coordenadas: Coordenadas;
  /** Los arroyos (calles que se vuelven ríos con los aguaceros) son propios del área de Barranquilla. */
  arroyos: boolean;
}

const c = (id: string, nombre: string, departamento: string, latitud: number, longitud: number, arroyos = false): Ciudad => ({
  id,
  nombre,
  departamento,
  coordenadas: { latitud, longitud },
  arroyos,
});

export const CIUDADES: Ciudad[] = [
  c("barranquilla", "Barranquilla", "Atlántico", 10.9639, -74.7964, true),
  c("soledad", "Soledad", "Atlántico", 10.9184, -74.7646, true),
  c("malambo", "Malambo", "Atlántico", 10.8597, -74.7739, true),
  c("puerto-colombia", "Puerto Colombia", "Atlántico", 10.9878, -74.9547, true),
  c("galapa", "Galapa", "Atlántico", 10.8977, -74.8857, true),
  c("cartagena", "Cartagena", "Bolívar", 10.391, -75.4794),
  c("santa-marta", "Santa Marta", "Magdalena", 11.2408, -74.199),
  c("valledupar", "Valledupar", "Cesar", 10.4631, -73.2532),
  c("monteria", "Montería", "Córdoba", 8.7479, -75.8814),
  c("sincelejo", "Sincelejo", "Sucre", 9.3047, -75.3978),
  c("riohacha", "Riohacha", "La Guajira", 11.5444, -72.9072),
  c("bogota", "Bogotá", "Bogotá D.C.", 4.711, -74.0721),
  c("medellin", "Medellín", "Antioquia", 6.2442, -75.5812),
  c("cali", "Cali", "Valle del Cauca", 3.4516, -76.532),
  c("bucaramanga", "Bucaramanga", "Santander", 7.1193, -73.1227),
  c("cucuta", "Cúcuta", "Norte de Santander", 7.8939, -72.5078),
  c("pereira", "Pereira", "Risaralda", 4.8133, -75.6961),
];

export const CIUDAD_INICIAL = CIUDADES[0];

export function buscarCiudad(id: string | null | undefined): Ciudad | undefined {
  return CIUDADES.find((x) => x.id === id);
}

/** Radio alrededor de cada municipio con arroyos dentro del cual se activa la alerta (para el GPS). */
export const RADIO_ARROYOS_KM = 12;

/** ¿Aplica la alerta de arroyos en estas coordenadas? (área metropolitana de Barranquilla) */
export function hayArroyos(coordenadas: Coordenadas): boolean {
  return CIUDADES.some((x) => x.arroyos && distanciaKm(x.coordenadas, coordenadas) <= RADIO_ARROYOS_KM);
}
