// Ícono del tiempo a color: los íconos del tiempo de Google (los SVG están en
// lib/clima/iconosTiempo.ts). En tema claro las nubes van un poco más oscuras para que se vean.
// Es decorativo: el texto de al lado dice el estado.

import { SvgXml } from "react-native-svg";

import { tipoIcono } from "@/lib/clima/codigos";
import { ICONOS_TIEMPO, ICONOS_TIEMPO_CLARO } from "@/lib/clima/iconosTiempo";
import { useOscuro } from "@/theme";

export function IconoTiempo({ codigo, esDia = true, tamano = 24 }: { codigo: number; esDia?: boolean; tamano?: number }) {
  const iconos = useOscuro() ? ICONOS_TIEMPO : ICONOS_TIEMPO_CLARO;
  return (
    <SvgXml
      xml={iconos[tipoIcono(codigo, esDia)]}
      width={tamano}
      height={tamano}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}
