// De qué lugar son las noticias según la ubicación (sin React, probado con node:test).

import type { Destino } from "./cliente.ts";

/** Dónde está el usuario, para las noticias. `barranquilla`: está en su área metropolitana. */
export interface Lugar {
  municipio: string;
  departamento: string;
  barranquilla: boolean;
}

/** Las dos pestañas de Noticias: lo de cerca (la ciudad o el municipio) y la región (el departamento). */
export interface ZonaNoticias {
  clave: "cerca" | "region";
  titulo: string;
  destino: Destino;
}

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * En el área de Barranquilla: Barranquilla y Atlántico, con sus medios. En otro lugar: el municipio
 * (entre comillas y con el departamento, para no confundirlo con otro del mismo nombre) y el
 * departamento. Si el departamento es la misma ciudad (Bogotá D.C.) o no se sabe, solo hay una.
 */
export function zonasNoticias(l: Lugar): ZonaNoticias[] {
  if (l.barranquilla) {
    return [
      { clave: "cerca", titulo: "Barranquilla", destino: "barranquilla" },
      { clave: "region", titulo: "Atlántico", destino: "atlantico" },
    ];
  }
  const departamento = l.departamento.trim();
  const mismo = !departamento || sinTildes(departamento).startsWith(sinTildes(l.municipio));
  const busqueda = (consulta: string): Destino => ({ consulta, clave: `busqueda:${sinTildes(consulta)}` });
  const cerca: ZonaNoticias = {
    clave: "cerca",
    titulo: l.municipio,
    destino: busqueda(mismo ? `"${l.municipio}"` : `"${l.municipio}" ${departamento}`),
  };
  return mismo ? [cerca] : [cerca, { clave: "region", titulo: departamento, destino: busqueda(departamento) }];
}
