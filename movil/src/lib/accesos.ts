// Accesos rápidos de Inicio. Para agregar una función nueva: una entrada aquí y su pantalla
// en src/app/. El navbar no cambia.

import type { ComponentProps } from "react";
import type Ionicons from "@expo/vector-icons/Ionicons";

export interface Acceso {
  clave: string;
  titulo: string;
  icono: ComponentProps<typeof Ionicons>["name"];
  /** Ruta de Expo Router; sin ruta, la tarjeta se muestra como "Próximamente". */
  ruta?: "/noticias";
  /** Dato corto bajo el título mientras no llega el dato vivo (ver `detalles` en Carrusel). */
  detalle: string;
}

export const ACCESOS: Acceso[] = [
  { clave: "noticias", titulo: "Noticias", icono: "newspaper-outline", ruta: "/noticias", detalle: "Lo último de la ciudad" },
  { clave: "pronto", titulo: "Más pronto", icono: "add-circle-outline", detalle: "Nuevas funciones" },
];
