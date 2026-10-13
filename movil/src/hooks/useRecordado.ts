// Estado de pantalla que la app recuerda: al volver a una pantalla (o al reabrir la app) aparece
// como la dejaste, p. ej. la vista "Lluvia" de Clima o el filtro "Atlántico" de Noticias.
// Se guarda en memoria (restauración instantánea) y en el celular (dura aunque se cierre la app).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const memoria = new Map<string, string>();
const PREFIJO = "recordado:";

export function useRecordado<T extends string>(clave: string, inicial: T, validos: readonly T[]): [T, (v: T) => void] {
  const leer = (v: string | null | undefined): T | null => (v && (validos as readonly string[]).includes(v) ? (v as T) : null);
  const [valor, setValor] = useState<T>(() => leer(memoria.get(clave)) ?? inicial);

  useEffect(() => {
    if (memoria.has(clave)) return;
    let vigente = true;
    AsyncStorage.getItem(PREFIJO + clave)
      .then((v) => {
        const guardado = (v && (validos as readonly string[]).includes(v) ? (v as T) : null);
        if (vigente && guardado) {
          memoria.set(clave, guardado);
          setValor(guardado);
        }
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
    // `validos` es una constante de cada pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const cambiar = useCallback(
    (v: T) => {
      memoria.set(clave, v);
      setValor(v);
      AsyncStorage.setItem(PREFIJO + clave, v).catch(() => {});
    },
    [clave],
  );

  return [valor, cambiar];
}
