// Ubicación de la app: GPS si hay permiso, o la ciudad elegida en Usuario (Barranquilla por defecto).

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";

import { usePreferencias } from "@/contexto/Preferencias";
import type { Coordenadas } from "@/lib/clima/tipos";
import { buscarCiudad, CIUDAD_INICIAL, municipioCercano } from "@/lib/ciudades";
import type { Lugar } from "@/lib/noticias/lugar";
import { nombreLugar } from "@/lib/ubicacion";

const CLAVE_BIENVENIDA = "bienvenida-vista";

type Permiso = "concedido" | "denegado" | "sin-preguntar";

interface EstadoUbicacion {
  /** `false` mientras se lee lo guardado en el celular. */
  lista: boolean;
  bienvenidaVista: boolean;
  coordenadas: Coordenadas;
  nombre: string;
  /** "ciudad": el usuario eligió una ciudad; "predeterminada": quiere GPS pero aún no hay posición. */
  origen: "gps" | "predeterminada" | "ciudad";
  /** Municipio y departamento (para las noticias locales) y si es el área de Barranquilla. */
  lugar: Lugar;
  permiso: Permiso;
  /** Pide el permiso (o abre los ajustes de Android si ya se negó "para siempre"). */
  pedirPermiso: () => Promise<void>;
  terminarBienvenida: () => Promise<void>;
}

const Contexto = createContext<EstadoUbicacion | null>(null);

export function useUbicacion(): EstadoUbicacion {
  const v = useContext(Contexto);
  if (!v) throw new Error("useUbicacion debe usarse dentro de <ProveedorUbicacion>");
  return v;
}

const conTiempo = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, no) => setTimeout(() => no(new Error("tiempo")), ms))]);

export function ProveedorUbicacion({ children }: { children: ReactNode }) {
  const { ubicacion, ciudad: idCiudad } = usePreferencias().preferencias;
  const fija = ubicacion === "ciudad";
  const ciudad = buscarCiudad(idCiudad) ?? CIUDAD_INICIAL;
  // Referencia para las funciones asíncronas: con una ciudad elegida no se lee el GPS.
  const fijaRef = useRef(fija);
  useEffect(() => {
    fijaRef.current = fija;
  }, [fija]);
  const [lista, setLista] = useState(false);
  const [bienvenidaVista, setBienvenidaVista] = useState(false);
  const [permiso, setPermiso] = useState<Permiso>("sin-preguntar");
  const [puedePreguntar, setPuedePreguntar] = useState(true);
  /** Posición del GPS; `municipio` y `departamento` llegan con el nombre del lugar (si hay geocodificador). */
  const [gps, setGps] = useState<{ coordenadas: Coordenadas; nombre: string; municipio?: string; departamento?: string } | null>(null);

  // Cada lectura tiene un número: si llega una respuesta de una lectura vieja, se ignora
  // (evita que una posición antigua pise una más reciente).
  const ultimaLectura = useRef(0);

  const leerPosicion = useCallback(async () => {
    const lectura = ++ultimaLectura.current;
    const vigente = () => lectura === ultimaLectura.current;

    const usar = (pos: Location.LocationObject) => {
      if (!vigente()) return;
      const coordenadas = { latitud: pos.coords.latitude, longitud: pos.coords.longitude };
      setGps((previo) => ({ ...previo, coordenadas, nombre: previo?.nombre ?? "Tu ubicación" }));
      // El nombre del barrio llega después, sin frenar la lectura. En la web no hay geocodificador.
      if (Platform.OS === "web") return;
      Location.reverseGeocodeAsync({ latitude: coordenadas.latitud, longitude: coordenadas.longitud })
        .then(([dir]) => {
          if (vigente()) {
            setGps({
              coordenadas,
              nombre: nombreLugar(dir),
              municipio: dir?.city || dir?.subregion || undefined,
              departamento: dir?.region || undefined,
            });
          }
        })
        .catch(() => {
          /* sin red o sin geocodificador: se queda el nombre anterior */
        });
    };

    try {
      // Primero la última conocida (instantánea) y luego una lectura fresca.
      const ultima = await Location.getLastKnownPositionAsync({ maxAge: 15 * 60_000 });
      if (ultima) usar(ultima);
      usar(await conTiempo(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 12_000));
    } catch {
      // GPS apagado o sin señal: se mantiene lo que haya (o Barranquilla).
    }
  }, []);

  const aplicarPermiso = useCallback(
    (r: Location.LocationPermissionResponse) => {
      setPuedePreguntar(r.canAskAgain);
      if (r.granted) {
        setPermiso("concedido");
        // Sin await: la pantalla no espera al GPS (puede tardar varios segundos).
        if (!fijaRef.current) void leerPosicion();
      } else {
        setPermiso(r.status === Location.PermissionStatus.UNDETERMINED ? "sin-preguntar" : "denegado");
      }
    },
    [leerPosicion],
  );

  useEffect(() => {
    (async () => {
      try {
        setBienvenidaVista((await AsyncStorage.getItem(CLAVE_BIENVENIDA)) === "1");
      } catch {
        /* sin almacenamiento: se muestra la bienvenida */
      }
      try {
        aplicarPermiso(await Location.getForegroundPermissionsAsync());
      } catch {
        /* sin servicio de ubicación: Barranquilla */
      }
      setLista(true);
    })();
  }, [aplicarPermiso]);

  // Al pasar de una ciudad elegida a GPS se revisa el permiso y se lee la posición.
  useEffect(() => {
    if (fija) return;
    Location.getForegroundPermissionsAsync()
      .then(aplicarPermiso)
      .catch(() => {});
  }, [fija, aplicarPermiso]);

  // Al volver a la app (p. ej. desde los ajustes de Android) se revisa otra vez el permiso,
  // y si ya estaba concedido se actualiza la posición.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado !== "active") return;
      Location.getForegroundPermissionsAsync()
        .then(aplicarPermiso)
        .catch(() => {});
    });
    return () => sub.remove();
  }, [aplicarPermiso]);

  const pedirPermiso = useCallback(async () => {
    if (!puedePreguntar && permiso === "denegado") {
      await Linking.openSettings();
      return;
    }
    aplicarPermiso(await Location.requestForegroundPermissionsAsync());
  }, [aplicarPermiso, permiso, puedePreguntar]);

  const terminarBienvenida = useCallback(async () => {
    setBienvenidaVista(true);
    try {
      await AsyncStorage.setItem(CLAVE_BIENVENIDA, "1");
    } catch {
      /* se volverá a mostrar la próxima vez; no es grave */
    }
  }, []);

  const valor = useMemo<EstadoUbicacion>(() => {
    const usaGps = !fija && gps !== null;
    const coordenadas = usaGps ? gps.coordenadas : ciudad.coordenadas;
    // Con GPS: lo que diga el geocodificador o, si no, el municipio de la lista más cercano.
    const cercano = usaGps ? municipioCercano(coordenadas, 30) : ciudad;
    const lugar: Lugar = {
      municipio: (usaGps ? gps.municipio : undefined) ?? cercano?.nombre ?? CIUDAD_INICIAL.nombre,
      departamento: (usaGps ? gps.departamento : undefined) ?? cercano?.departamento ?? CIUDAD_INICIAL.departamento,
      barranquilla: usaGps ? cercano?.area === "barranquilla" || (!gps.municipio && !cercano) : ciudad.area === "barranquilla",
    };
    return {
      lista,
      bienvenidaVista,
      coordenadas,
      nombre: usaGps ? gps.nombre : ciudad.nombre,
      origen: fija ? "ciudad" : usaGps ? "gps" : "predeterminada",
      lugar,
      permiso,
      pedirPermiso,
      terminarBienvenida,
    };
  }, [lista, bienvenidaVista, gps, fija, ciudad, permiso, pedirPermiso, terminarBienvenida]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
