// Victorias del Rubo (el Pong) guardadas en el celular: las usa el juego para desbloquear el modo IA
// y Usuario para mostrar la opción RuboKill solo cuando ya está desbloqueado.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import type { Nivel } from "@/lib/pong";

/** Victorias en normal que hacen falta para desbloquear el modo IA. */
export const VICTORIAS_PARA_IA = 2;

// Clave nueva: las victorias de las versiones de prueba (con el modo IA siempre abierto) no cuentan,
// así que se cuenta desde cero.
export const CLAVE_VICTORIAS = "pong:victorias:v3";
/** El arcade no se gana (es infinito): solo cuentan normal e IA. */
export type Victorias = Record<Exclude<Nivel, "arcade">, number>;
export const SIN_VICTORIAS: Victorias = { normal: 0, ia: 0 };

export function leerVictorias(texto: string | null): Victorias {
  try {
    const g = texto ? (JSON.parse(texto) as Partial<Victorias>) : {};
    return { normal: g.normal ?? 0, ia: g.ia ?? 0 };
  } catch {
    return SIN_VICTORIAS;
  }
}

/** ¿Ya se desbloqueó el modo IA? Se vuelve a leer cada vez que la pantalla queda a la vista. */
export function useIaDesbloqueada(): boolean {
  const [desbloqueada, setDesbloqueada] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      AsyncStorage.getItem(CLAVE_VICTORIAS)
        .then((t) => vigente && setDesbloqueada(leerVictorias(t).normal >= VICTORIAS_PARA_IA))
        .catch(() => {});
      return () => {
        vigente = false;
      };
    }, []),
  );
  return desbloqueada;
}
