// Preferencias del usuario: se leen al abrir la app y se guardan en el celular al cambiarlas.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { leerPreferencias, PREFERENCIAS_INICIALES, type Preferencias } from "@/lib/preferencias";

const CLAVE = "preferencias";

interface EstadoPreferencias {
  /** `false` mientras se lee lo guardado. */
  lista: boolean;
  preferencias: Preferencias;
  cambiar: (cambio: Partial<Preferencias> | ((p: Preferencias) => Preferencias)) => void;
}

const Contexto = createContext<EstadoPreferencias | null>(null);

export function usePreferencias(): EstadoPreferencias {
  const v = useContext(Contexto);
  if (!v) throw new Error("usePreferencias debe usarse dentro de <ProveedorPreferencias>");
  return v;
}

/** Versión que no exige el proveedor (para el tema, que también se usa fuera de él). */
export function usePreferenciasOpcional(): Preferencias | null {
  return useContext(Contexto)?.preferencias ?? null;
}

export function ProveedorPreferencias({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState(false);
  const [preferencias, setPreferencias] = useState<Preferencias>(PREFERENCIAS_INICIALES);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((t) => setPreferencias(leerPreferencias(t)))
      .catch(() => {})
      .finally(() => setLista(true));
  }, []);

  const cambiar = useCallback<EstadoPreferencias["cambiar"]>((cambio) => {
    setPreferencias((previas) => {
      const nuevas = typeof cambio === "function" ? cambio(previas) : { ...previas, ...cambio };
      AsyncStorage.setItem(CLAVE, JSON.stringify(nuevas)).catch(() => {});
      return nuevas;
    });
  }, []);

  const valor = useMemo(() => ({ lista, preferencias, cambiar }), [lista, preferencias, cambiar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
