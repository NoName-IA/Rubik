// Ciudades y municipios que se pueden elegir sin GPS, y dónde aplica la alerta de arroyos (sin React, probado).

import type { Coordenadas } from "./clima/tipos.ts";
import { distanciaKm } from "./clima/respaldo.ts";

/** Un municipio que se puede elegir; está dentro del área de una ciudad (ver `AREAS`). */
export interface Ciudad {
  id: string;
  nombre: string;
  departamento: string;
  coordenadas: Coordenadas;
  /** Los arroyos (calles que se vuelven ríos con los aguaceros) son propios del área de Barranquilla. */
  arroyos: boolean;
  /** id del área (`AREAS`) a la que pertenece. */
  area: string;
}

/** Una ciudad y los municipios de su alrededor; se elige primero la ciudad y luego el municipio. */
export interface Area {
  id: string;
  nombre: string;
  departamento: string;
  municipios: Ciudad[];
}

type Municipio = [id: string, nombre: string, latitud: number, longitud: number, departamento?: string];

/** El primer municipio es la ciudad misma y comparte su id (así siguen valiendo las elecciones guardadas). */
const area = (nombre: string, departamento: string, municipios: Municipio[], arroyos = false): Area => {
  const id = municipios[0][0];
  return {
    id,
    nombre,
    departamento,
    municipios: municipios.map(([mid, mnombre, latitud, longitud, mdep]) => ({
      id: mid,
      nombre: mnombre,
      departamento: mdep ?? departamento,
      coordenadas: { latitud, longitud },
      arroyos,
      area: id,
    })),
  };
};

export const AREAS: Area[] = [
  area(
    "Barranquilla",
    "Atlántico",
    [
      ["barranquilla", "Barranquilla", 10.9639, -74.7964],
      ["soledad", "Soledad", 10.9184, -74.7646],
      ["malambo", "Malambo", 10.8597, -74.7739],
      ["puerto-colombia", "Puerto Colombia", 10.9878, -74.9547],
      ["galapa", "Galapa", 10.8977, -74.8857],
    ],
    true,
  ),
  area("Cartagena", "Bolívar", [
    ["cartagena", "Cartagena", 10.391, -75.4794],
    ["turbaco", "Turbaco", 10.3317, -75.4128],
    ["arjona", "Arjona", 10.2546, -75.3443],
    ["turbana", "Turbana", 10.274, -75.443],
  ]),
  area("Santa Marta", "Magdalena", [
    ["santa-marta", "Santa Marta", 11.2408, -74.199],
    ["cienaga", "Ciénaga", 11.0069, -74.2477],
    ["aracataca", "Aracataca", 10.5917, -74.1897],
  ]),
  area("Valledupar", "Cesar", [
    ["valledupar", "Valledupar", 10.4631, -73.2532],
    ["la-paz", "La Paz", 10.387, -73.1717],
    ["codazzi", "Agustín Codazzi", 10.0367, -73.2356],
  ]),
  area("Montería", "Córdoba", [
    ["monteria", "Montería", 8.7479, -75.8814],
    ["cerete", "Cereté", 8.8853, -75.7906],
    ["lorica", "Lorica", 9.2367, -75.8136],
  ]),
  area("Sincelejo", "Sucre", [
    ["sincelejo", "Sincelejo", 9.3047, -75.3978],
    ["corozal", "Corozal", 9.3183, -75.2933],
    ["sampues", "Sampués", 9.1836, -75.3817],
  ]),
  area("Riohacha", "La Guajira", [
    ["riohacha", "Riohacha", 11.5444, -72.9072],
    ["maicao", "Maicao", 11.3778, -72.2389],
    ["manaure", "Manaure", 11.775, -72.4444],
  ]),
  area("Bogotá", "Bogotá D.C.", [
    ["bogota", "Bogotá", 4.711, -74.0721],
    ["soacha", "Soacha", 4.5794, -74.2168, "Cundinamarca"],
    ["chia", "Chía", 4.8619, -74.0328, "Cundinamarca"],
    ["mosquera", "Mosquera", 4.7059, -74.2302, "Cundinamarca"],
    ["funza", "Funza", 4.7166, -74.2116, "Cundinamarca"],
    ["zipaquira", "Zipaquirá", 5.0221, -74.0058, "Cundinamarca"],
  ]),
  area("Medellín", "Antioquia", [
    ["medellin", "Medellín", 6.2442, -75.5812],
    ["bello", "Bello", 6.3373, -75.5579],
    ["itagui", "Itagüí", 6.1846, -75.5991],
    ["envigado", "Envigado", 6.1759, -75.5917],
    ["sabaneta", "Sabaneta", 6.1515, -75.6166],
  ]),
  area("Cali", "Valle del Cauca", [
    ["cali", "Cali", 3.4516, -76.532],
    ["palmira", "Palmira", 3.5394, -76.3036],
    ["jamundi", "Jamundí", 3.261, -76.5394],
    ["yumbo", "Yumbo", 3.585, -76.495],
  ]),
  area("Bucaramanga", "Santander", [
    ["bucaramanga", "Bucaramanga", 7.1193, -73.1227],
    ["floridablanca", "Floridablanca", 7.0647, -73.0896],
    ["giron", "Girón", 7.0682, -73.1698],
    ["piedecuesta", "Piedecuesta", 6.9877, -73.0498],
  ]),
  area("Cúcuta", "Norte de Santander", [
    ["cucuta", "Cúcuta", 7.8939, -72.5078],
    ["villa-del-rosario", "Villa del Rosario", 7.8336, -72.4742],
    ["los-patios", "Los Patios", 7.838, -72.5039],
  ]),
  area("Pereira", "Risaralda", [
    ["pereira", "Pereira", 4.8133, -75.6961],
    ["dosquebradas", "Dosquebradas", 4.8392, -75.6673],
    ["santa-rosa-de-cabal", "Santa Rosa de Cabal", 4.8681, -75.6214],
  ]),
];

/** Todos los municipios, de todas las áreas. */
export const CIUDADES: Ciudad[] = AREAS.flatMap((a) => a.municipios);

export const CIUDAD_INICIAL = CIUDADES[0];

export function buscarCiudad(id: string | null | undefined): Ciudad | undefined {
  return CIUDADES.find((x) => x.id === id);
}

export function buscarArea(id: string | null | undefined): Area | undefined {
  return AREAS.find((x) => x.id === id);
}

/** Radio alrededor de cada municipio con arroyos dentro del cual se activa la alerta (para el GPS). */
export const RADIO_ARROYOS_KM = 12;

/** ¿Aplica la alerta de arroyos en estas coordenadas? (área metropolitana de Barranquilla) */
export function hayArroyos(coordenadas: Coordenadas): boolean {
  return CIUDADES.some((x) => x.arroyos && distanciaKm(x.coordenadas, coordenadas) <= RADIO_ARROYOS_KM);
}
