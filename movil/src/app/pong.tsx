// Rubo (un Pong): tú contra la máquina (se abre desde Accesos rápidos en Inicio). La lógica está en
// lib/pong.ts; aquí solo se dibuja con SVG y se lee el dedo. El modo IA empieza encadenado: se
// desbloquea al ganar 2 veces en normal, y las cadenas se rompen la primera vez que lo tocas ya desbloqueado.

import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "expo-router";
import { useHeaderHeight, usePreventRemove } from "expo-router/react-navigation";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  type GestureResponderEvent,
  Image,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Pattern, Polygon, Polyline, RadialGradient, Rect, Stop } from "react-native-svg";

import { Entrada, movimientoReducido, Presionable } from "@/components/Movimiento";
import { Panel } from "@/components/Panel";
import { Segmentos } from "@/components/Segmentos";
import { Text } from "@/components/Texto";
import { usePreferencias } from "@/contexto/Preferencias";
import { type MusicaRubo, useMusicaRubo } from "@/hooks/useMusicaRubo";
import { COLORES_CUEVA, crearCueva, puntosSvg } from "@/lib/cueva";
import { FRASES_RUBO, letras, PAUSA_ENTRE_FRASES, tiempoHablando } from "@/lib/dialogo";
import { useRecordado } from "@/hooks/useRecordado";
import { CLAVE_VICTORIAS, leerVictorias, SIN_VICTORIAS, type Victorias, VICTORIAS_PARA_IA } from "@/hooks/useVictoriasRubo";
import {
  avanzar,
  BARRA_ALTO,
  BARRA_ANCHO,
  BOLA_RADIO,
  cambiarAlto,
  type Estado,
  type Fase,
  faseRubo,
  ganador,
  GOLES_FASE_2,
  GOLES_FASE_3,
  GOLES_FASE_4,
  CORAZONES_JUGADOR,
  GOLES_IA,
  MARGEN,
  NIVEL_ARCADE_MAXIMO,
  type Nivel,
  NIVELES,
  nuevoJuego,
  PUNTOS_PARA_GANAR,
  sacarYa,
} from "@/lib/pong";
import { espacio, fuente, radio, useColores } from "@/theme";

const OPCIONES_NIVEL = [
  { clave: "normal", titulo: "Normal" },
  { clave: "arcade", titulo: "Arcade" },
  { clave: "ia", titulo: "IA" },
] as const;

/**
 * El arcade se abre con solo entrar una vez a jugar el modo IA (aunque pierdas). Queda guardado en el
 * celular. `null` mientras se lee.
 */
const CLAVE_IA_JUGADA = "pong:iaJugada";
function useIaJugada(): [boolean | null, () => void, () => void] {
  const [jugada, setJugada] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_IA_JUGADA)
      .then((t) => setJugada(t === "1"))
      .catch(() => setJugada(false));
  }, []);
  const marcar = useCallback(() => {
    setJugada(true);
    AsyncStorage.setItem(CLAVE_IA_JUGADA, "1").catch(() => {});
  }, []);
  const reiniciar = useCallback(() => {
    setJugada(false);
    AsyncStorage.removeItem(CLAVE_IA_JUGADA).catch(() => {});
  }, []);
  return [jugada, marcar, reiniciar];
}

/** Récord del arcade: la mayor cantidad de goles tuyos en una partida, guardada en el celular. */
const CLAVE_RECORD_ARCADE = "pong:arcade:record";
function useRecordArcade(): [number, (goles: number) => void] {
  const [record, setRecord] = useState(0);
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_RECORD_ARCADE)
      .then((t) => setRecord(Math.max(0, Number(t) || 0)))
      .catch(() => {});
  }, []);
  const anotar = useCallback((goles: number) => {
    setRecord((r) => {
      if (goles <= r) return r;
      AsyncStorage.setItem(CLAVE_RECORD_ARCADE, String(goles)).catch(() => {});
      return goles;
    });
  }, []);
  return [record, anotar];
}

/** La cancha mide siempre 2 de ancho por 3,7 de alto (si no cabe a todo el ancho, se angosta). */
const PROPORCION_CANCHA = 1.85;
/** Espacio mínimo libre bajo la cancha: desde ahí también se mueve la barra y se saca. */
const ZONA_DEDO_MINIMA = 96;

/** Columnas de la cuadrícula de puntos del fondo. */
const COLUMNAS_CUADRICULA = 10;

type Punto = { x: number; y: number };

/** Si la bola lleva más de esto esperando el saque, empieza a soltar ondas para recordar que hay que tocar. */
const ESPERA_ONDAS = 10;
/** Cada onda tarda esto en abrirse y desvanecerse; salen `ONDAS` a la vez, repartidas en ese tiempo. */
const PERIODO_ONDA = 2.6;
const ONDAS = 2;
/** Hasta cuántas veces el radio de la bola se abre cada onda. */
const ALCANCE_ONDA = 3.5;

/** Avance (0 a 1) de cada onda visible tras `t` segundos de ondas; las que aún no han salido no se muestran. */
function ondasEn(t: number): number[] {
  const avances: number[] = [];
  for (let k = 0; k < ONDAS; k++) {
    const desde = (k * PERIODO_ONDA) / ONDAS;
    if (t >= desde) avances.push(((t - desde) / PERIODO_ONDA) % 1);
  }
  return avances;
}

/** Partículas en que se deshace la bola al hacer gol. */
const PARTICULAS = 10;
const VIDA_PARTICULA = 0.7;
type Particula = Punto & { vx: number; vy: number; vida: number };

/** Al hacer gol, la bola se deshace en partículas que salen en todas direcciones desde donde salió. */
function explotar(bola: Punto, alto: number): Particula[] {
  const y = Math.min(Math.max(bola.y, BOLA_RADIO), alto - BOLA_RADIO);
  return Array.from({ length: PARTICULAS }, (_, i) => {
    const angulo = (i / PARTICULAS) * 2 * Math.PI + Math.random() * 0.5;
    const rapidez = 0.35 + Math.random() * 0.45;
    return { x: bola.x, y, vx: Math.cos(angulo) * rapidez, vy: Math.sin(angulo) * rapidez, vida: 1 };
  });
}

function moverParticulas(ps: Particula[], dt: number): Particula[] {
  return ps
    .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vida: p.vida - dt / VIDA_PARTICULA }))
    .filter((p) => p.vida > 0);
}

/**
 * Falla de pantalla cuando anota la IA: cuánto dura cada ráfaga y cuántas franjas se corren. Empeora con
 * cada punto que te hace: con el punto n hay n + 1 ráfagas seguidas, más franjas, más corridas, una
 * sacudida más fuerte y franjas de otros colores.
 */
const DURACION_FALLA = 320;
/**
 * Sin RuboKill la falla casi no se nota: ráfagas cortas, pocas franjas tenues y apenas corridas, y una
 * sacudida mínima. Igual empeora un poco con cada gol de la IA en la partida (`gol`: 1, 2, 3…): una
 * ráfaga más, dos franjas más y algo más de fuerza.
 */
function fallaSuave(gol: number) {
  return { duracion: 200, rafagas: gol, cortes: 1 + 2 * gol, corrimiento: 0.2 + 0.15 * gol, fuerza: 0.05 + 0.1 * gol };
}
/** En el segundo gol de la IA las ráfagas van un poco más rápido. */
const DURACION_FALLA_SEGUNDO_GOL = 230;
/** Los glitches dejan de empeorar desde el tercer gol de la IA (4 ráfagas). */
const NIVEL_FALLA_MAXIMO = 4;
const CORTES_FALLA = 7;
const CORTES_EXTRA_POR_PUNTO = 5;
type Corte = { y: number; alto: number; dx: number; color: "peligro" | "enfasis" | "tinta" };

/** Una franja horizontal al azar de la cancha, corrida a un lado; `nivel` es la fuerza de la falla (2, 3, 4…). */
function crearCorte(altoPantalla: number, nivel: number, corrimiento = 1): Corte {
  const fuerza = 1 + 0.6 * (nivel - 1);
  const azar = Math.random();
  // Algunas franjas salen en otros colores (como una señal que se descompone), cada vez más.
  const otro = (nivel - 1) * 0.2;
  const color = azar < otro / 2 ? "tinta" : azar < otro ? "enfasis" : "peligro";
  return {
    y: Math.random() * altoPantalla,
    alto: (4 + Math.random() * 18) * (1 + 0.3 * (nivel - 1)),
    dx: (Math.random() * 2 - 1) * 18 * fuerza * corrimiento,
    color,
  };
}

/** Retraso entre los bloques del menú al aparecer, como el de las demás pantallas (Pantalla.tsx). */
const PASO_ENTRADA = 60;

/** Partidas ganadas a la máquina en cada nivel, guardadas en el celular. `cargado`: ya se leyeron. */
function useVictorias(): [Victorias, (n: Nivel) => void, boolean, () => void, () => void] {
  const [victorias, setVictorias] = useState(SIN_VICTORIAS);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_VICTORIAS)
      .then((t) => setVictorias(leerVictorias(t)))
      .catch(() => {})
      .finally(() => setCargado(true));
  }, []);

  // El arcade no se gana (es infinito): no suma.
  const sumar = (n: Nivel) =>
    n !== "arcade" &&
    setVictorias((v) => {
      const nuevas = { ...v, [n]: v[n] + 1 };
      AsyncStorage.setItem(CLAVE_VICTORIAS, JSON.stringify(nuevas)).catch(() => {});
      return nuevas;
    });

  const reiniciar = () => {
    setVictorias(SIN_VICTORIAS);
    AsyncStorage.removeItem(CLAVE_VICTORIAS).catch(() => {});
  };

  /** Lo contrario de reiniciar: deja justo las victorias que desbloquean el modo IA. */
  const desbloquear = () =>
    setVictorias((v) => {
      const nuevas = { ...v, normal: Math.max(v.normal, VICTORIAS_PARA_IA) };
      AsyncStorage.setItem(CLAVE_VICTORIAS, JSON.stringify(nuevas)).catch(() => {});
      return nuevas;
    });

  return [victorias, sumar, cargado, reiniciar, desbloquear];
}

/**
 * PRUEBA: con `true` el modo IA está siempre desbloqueado y las cadenas vuelven a salir cada vez que
 * entras al Rubo (no se guarda que se rompieron), para probar la animación. Poner en `false` antes de publicar.
 */
const PRUEBA_DESBLOQUEO = false;

// v2: versiones de prueba anteriores pudieron dejar guardado que ya se rompieron.
const CLAVE_CADENAS = "pong:cadenasRotas:v2";

/** Si ya se rompieron las cadenas del modo IA (`null` mientras se lee). Pasa una sola vez. */
function useCadenasRotas(): [boolean | null, () => void, () => void] {
  const [rotas, setRotas] = useState<boolean | null>(PRUEBA_DESBLOQUEO ? false : null);

  useEffect(() => {
    if (PRUEBA_DESBLOQUEO) return;
    AsyncStorage.getItem(CLAVE_CADENAS)
      .then((t) => setRotas(t === "1"))
      .catch(() => setRotas(false));
  }, []);

  const marcar = useCallback(() => {
    setRotas(true);
    if (!PRUEBA_DESBLOQUEO) AsyncStorage.setItem(CLAVE_CADENAS, "1").catch(() => {});
  }, []);

  const reiniciar = useCallback(() => {
    setRotas(false);
    AsyncStorage.removeItem(CLAVE_CADENAS).catch(() => {});
  }, []);

  return [rotas, marcar, reiniciar];
}

export default function Rubo() {
  const [nivel, setNivel] = useRecordado<Nivel>("pong:nivel", "normal", NIVELES);
  const [jugando, setJugando] = useState(false);
  const [pausado, setPausado] = useState(false);
  // Mientras juegas, "atrás" del celular pausa (y si ya está en pausa, sigue). Se sale desde la pausa.
  usePreventRemove(jugando, () => setPausado((p) => !p));
  const salir = () => {
    setPausado(false);
    setJugando(false);
  };
  // Estable: el juego la usa para el botón del encabezado y al irse la app a segundo plano.
  const pausar = useCallback(() => setPausado(true), []);
  const [victorias, sumarVictoria, cargado, reiniciarVictorias, desbloquearIa] = useVictorias();
  const [cadenasRotas, marcarCadenasRotas, reiniciarCadenas] = useCadenasRotas();
  const [iaJugada, marcarIaJugada, reiniciarIaJugada] = useIaJugada();

  const desbloqueada = PRUEBA_DESBLOQUEO || victorias.normal >= VICTORIAS_PARA_IA;
  // Si quedó guardado "IA" pero aún no se ha desbloqueado (o siguen las cadenas), se juega en normal.
  const nivelActual: Nivel = nivel === "ia" && (!desbloqueada || cadenasRotas !== true) ? "normal" : nivel;
  // Mientras no esté desbloqueado siempre lleva cadenas (aunque haya quedado guardado que se rompieron);
  // ya desbloqueado, siguen puestas hasta que tocas el modo IA: ahí se rompen.
  const cadenas = cargado && (!desbloqueada || cadenasRotas === false);

  return jugando ? (
    <Juego
      nivel={nivelActual}
      alGanar={() => sumarVictoria(nivelActual)}
      pausado={pausado}
      alPausar={pausar}
      alContinuar={() => setPausado(false)}
      alSalir={salir}
    />
  ) : (
    <Menu
      nivel={nivelActual}
      alCambiarNivel={setNivel}
      victoriasNormal={victorias.normal}
      desbloqueada={desbloqueada}
      cadenas={cadenas}
      alRomperCadenas={marcarCadenasRotas}
      arcadeAbierto={iaJugada === true}
      alJugar={() => {
        if (nivelActual === "arcade" && iaJugada !== true) return;
        // Entrar a jugar el modo IA (aunque pierdas) abre el arcade.
        if (nivelActual === "ia") marcarIaJugada();
        setJugando(true);
      }}
      // Solo en desarrollo (Expo Go): mantener presionado el control alterna entre borrar el progreso
      // (modo IA bloqueado y con cadenas) y lo contrario (modo IA desbloqueado, con las cadenas por romper).
      alReiniciar={
        __DEV__
          ? () => {
              if (desbloqueada) {
                reiniciarVictorias();
                reiniciarCadenas();
                reiniciarIaJugada();
                setNivel("normal");
              } else {
                // Las cadenas quedan puestas y vibrando, para romperlas tú tocando el modo IA.
                desbloquearIa();
                reiniciarCadenas();
              }
            }
          : undefined
      }
    />
  );
}

function Menu({
  nivel,
  alCambiarNivel,
  victoriasNormal,
  desbloqueada,
  cadenas,
  alRomperCadenas,
  arcadeAbierto,
  alJugar,
  alReiniciar,
}: {
  nivel: Nivel;
  alCambiarNivel: (n: Nivel) => void;
  victoriasNormal: number;
  desbloqueada: boolean;
  /** Si el modo IA aún tiene las cadenas puestas. */
  cadenas: boolean;
  alRomperCadenas: () => void;
  /** Si ya jugaste el modo IA alguna vez (si no, el arcade se puede elegir pero no jugar). */
  arcadeAbierto: boolean;
  alJugar: () => void;
  /** Borra victorias y cadenas (solo en desarrollo). */
  alReiniciar?: () => void;
}) {
  const c = useColores();
  const altoEncabezado = useHeaderHeight();
  const [rompiendo, setRompiendo] = useState(false);
  // Cada toque al modo IA bloqueado sacude las cadenas y el candado (sin romperlas).
  const [forcejeos, setForcejeos] = useState(0);
  const [record] = useRecordArcade();
  // El arcade se puede elegir siempre, pero sin haber jugado el modo IA no se puede jugar.
  const arcadeCerrado = nivel === "arcade" && !arcadeAbierto;
  const descripcion =
    nivel === "ia"
      ? "Imposible."
      : arcadeCerrado
        ? "Juega el modo IA una vez (aunque pierdas) para abrir el arcade."
        : nivel === "arcade"
          ? `Infinito: cada gol tuyo sube el nivel. Tu récord: ${record} ${record === 1 ? "gol" : "goles"}.`
          : !desbloqueada
            ? `Gana ${VICTORIAS_PARA_IA} veces para desbloquear el modo IA (llevas ${victoriasNormal} de ${VICTORIAS_PARA_IA}).`
            : cadenas
              ? "¡Desbloqueaste el modo IA! Tócalo para romper las cadenas."
              : "Modo normal.";

  // Ya desbloqueado, tocar el modo IA encadenado rompe las cadenas; al terminar, queda elegido.
  const elegir = (n: Nivel) => {
    if (n === "ia" && !desbloqueada) return;
    if (n === "ia" && cadenas) setRompiendo(true);
    else alCambiarNivel(n);
  };
  const alRomperse = useCallback(() => {
    setRompiendo(false);
    alRomperCadenas();
    alCambiarNivel("ia");
  }, [alRomperCadenas, alCambiarNivel]);
  return (
    // Los bloques aparecen subiendo, uno tras otro, como en las demás pantallas (también al volver de jugar).
    // El fondo cuadriculado ocupa toda la pantalla, también detrás del encabezado (que es transparente).
    <View style={[styles.menu, { backgroundColor: c.fondo, paddingTop: altoEncabezado + espacio.xl }]}>
      <Cuadricula color={c.borde} />
      <Entrada style={styles.menuCentro}>
        <Presionable
          onLongPress={alReiniciar}
          delayLongPress={800}
          disabled={!alReiniciar}
          style={[styles.icono, { backgroundColor: c.enfasisSuave }]}
        >
          <Ionicons name="game-controller-outline" size={44} color={c.enfasis} />
        </Presionable>
        <Text style={[styles.tituloMenu, { color: c.tinta }]} accessibilityRole="header">
          Tú contra la máquina
        </Text>
        <Text style={[styles.textoMenu, { color: c.tinta2 }]}>
          Desliza el dedo para mover tu barra.{" "}
          {nivel === "ia"
            ? `Rubo tiene ${GOLES_IA} corazones y tú ${CORAZONES_JUGADOR}: cada gol rompe uno.`
            : nivel === "arcade"
              ? "No se acaba: juega hasta donde aguantes."
              : `Gana el primero que llegue a ${PUNTOS_PARA_GANAR}.`}
        </Text>
      </Entrada>
      <Entrada retraso={PASO_ENTRADA}>
        <Panel titulo="Nivel" translucido>
          <Segmentos
            opciones={OPCIONES_NIVEL}
            valor={nivel}
            alCambiar={elegir}
            dentroDePanel
            bloqueadas={desbloqueada ? [] : ["ia"]}
            alTocarBloqueada={() => setForcejeos((n) => n + 1)}
            adornos={
              cadenas ? { ia: <Cadenas rompiendo={rompiendo} alRomperse={alRomperse} forcejeos={forcejeos} llamando={desbloqueada} /> } : {}
            }
          />
          <Text style={[styles.nota, { color: c.apagado }]}>{descripcion}</Text>
        </Panel>
      </Entrada>
      <Entrada retraso={2 * PASO_ENTRADA} style={styles.menuBotones}>
        <Boton texto="Jugar" alTocar={alJugar} deshabilitado={arcadeCerrado} />
      </Entrada>
    </View>
  );
}

// Para cambiar de nivel se sale con la flecha de arriba (o "atrás"), que lleva al menú.
function Juego({
  nivel,
  alGanar,
  pausado,
  alPausar,
  alContinuar,
  alSalir,
}: {
  nivel: Nivel;
  alGanar: () => void;
  /** En pausa: el juego se congela, la música se calla y encima sale Continuar / Salir. */
  pausado: boolean;
  alPausar: () => void;
  alContinuar: () => void;
  alSalir: () => void;
}) {
  const c = useColores();
  // Mientras juegas, arriba a la izquierda va el botón de pausa en vez de la flecha de atrás.
  const navegacion = useNavigation();
  useLayoutEffect(() => {
    navegacion.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <Presionable onPress={alPausar} accessibilityRole="button" accessibilityLabel="Pausa" hitSlop={12} style={styles.botonPausa}>
          <Ionicons name="pause" size={24} color={c.enfasis} />
        </Presionable>
      ),
    });
    return () => navegacion.setOptions({ headerBackVisible: true, headerLeft: undefined });
  }, [navegacion, alPausar, c.enfasis]);
  const pausadoRef = useRef(pausado);
  // Si sales de la app a mitad de partida, al volver la encuentras en pausa.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (estado) => estado !== "active" && alPausar());
    return () => sub.remove();
  }, [alPausar]);
  const insets = useSafeAreaInsets();
  // El encabezado es transparente (para que la cuadrícula del menú llegue arriba): se deja su espacio.
  const altoEncabezado = useHeaderHeight();
  /** Espacio de toda la pantalla del juego (incluye la zona bajo la cancha). */
  const [area, setArea] = useState<{ ancho: number; alto: number } | null>(null);
  /** Medidas de la cancha y su distancia al borde izquierdo de la pantalla. */
  const [tam, setTam] = useState<{
    ancho: number;
    alto: number;
    x: number;
  } | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  /** La capa de partículas y ondas se actualiza sola (ver `CapaEfectos`), sin redibujar el juego entero. */
  const conectorEfectos = useRef<((e: Efectos) => void) | null>(null);
  /** Cambia con cada revancha para volver a arrancar el ciclo del juego. */
  const [ronda, setRonda] = useState(0);
  /** Falla de pantalla cuando anota la IA: avance de 0 a 1 y franjas corridas que se dibujan mientras dura. */
  const [falla] = useState(() => new Animated.Value(0));
  /** Qué tan fuerte sacude y destella la falla: crece con cada punto de la IA. */
  const [fuerzaFalla] = useState(() => new Animated.Value(1));
  const [cortes, setCortes] = useState<Corte[]>([]);
  /** Si la falla en curso es la suave (sin RuboKill): franjas casi transparentes. */
  const [esSuave, setEsSuave] = useState(false);
  /** Cuánto parpadea la pantalla en la falla: 1 normal, casi nada si es suave. */
  const [parpadeoFalla] = useState(() => new Animated.Value(1));
  const estadoRef = useRef<Estado | null>(null);
  const dedo = useRef<number | null>(null);
  /** Hasta cuándo (Date.now) no se puede sacar, para alcanzar a leer lo que dice Rubo. */
  const saqueBloqueadoHasta = useRef(0);
  /** Lo que dice Rubo ahora (modo IA, al empezar las fases 2 y 3); se quita sola al leerse. */
  const [frase, setFrase] = useState<{ goles: number; frases: { texto: string; voz: number }[] } | null>(null);
  /** El fondo rojo de la fase 3 se está recogiendo tras tocar la rueda de reiniciar. */
  const [rojoSaliendo, setRojoSaliendo] = useState(false);
  /**
   * Tu 4.º gol en la IA (fase 3): Rubo se pone durísimo y se nota en los mismos objetos. `golpe` (0 → 1 → 0)
   * infla un momento su barra, la bola y la cancha; `furia` (0 ↔ 1, en bucle hasta el final) hace
   * latir el halo de su barra.
   */
  const [golpe] = useState(() => new Animated.Value(0));
  const [furia] = useState(() => new Animated.Value(0));
  /**
   * Tu 2.º gol en la IA (fase 2) le duele a Rubo (sin decirlo): `dolor` (0 → 1 → 0) hace que su barra destelle
   * en blanco, se aplaste y salte hacia atrás; `temblor` (-1 a 1) la sacude, y mientras dure la fase 2
   * vuelve a temblar sola cada tanto, como herida.
   */
  const [dolor] = useState(() => new Animated.Value(0));
  const [temblor] = useState(() => new Animated.Value(0));
  /**
   * Posición en px de la bola (esquina de arriba a la izquierda) y del borde izquierdo de cada barra.
   * El ciclo del juego las cambia con `setValue`, que mueve las vistas sin volver a dibujar la pantalla:
   * React solo vuelve a dibujar cuando cambia el marcador o la fase (saque, jugando, fin).
   */
  const [pos] = useState(() => ({
    bolaX: new Animated.Value(0),
    bolaY: new Animated.Value(0),
    jugador: new Animated.Value(0),
    maquina: new Animated.Value(0),
  }));
  const pintar = (s: Estado, ancho: number) => {
    pos.bolaX.setValue((s.bola.x - BOLA_RADIO) * ancho);
    pos.bolaY.setValue((s.bola.y - BOLA_RADIO) * ancho);
    pos.jugador.setValue((s.jugador - BARRA_ANCHO / 2) * ancho);
    pos.maquina.setValue((s.maquina - BARRA_ANCHO / 2) * ancho);
  };

  const medirArea = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ ancho: width, alto: height });
  };

  const medir = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!area || width === 0 || height === 0) return;
    // La cancha va centrada en una pantalla de todo el ancho: su borde izquierdo es lo que sobra a cada lado.
    setTam({ ancho: width, alto: height, x: (area.ancho - width) / 2 });
    const alto = height / width;
    const s = estadoRef.current ? cambiarAlto(estadoRef.current, alto) : nuevoJuego(alto, nivel, rapidez);
    estadoRef.current = s;
    pintar(s, width);
    setEstado(s);
  };

  const fin = estado?.fase === "fin";
  // RuboKill (opción de Usuario): cuando la IA te gana, al terminar los glitches de ese último punto,
  // la foto de Rubo sale de golpe en toda la pantalla y se va enseguida. El ciclo del juego la lee por la referencia.
  const { rubokill } = usePreferencias().preferencias;
  // Con RuboKill activado, en el modo IA la bola (y la barra de la máquina) van al doble de velocidad.
  // El modo normal no cambia.
  const rapidez = rubokill && nivel === "ia" ? RAPIDEZ_RUBOKILL : 1;
  const rubokillRef = useRef(rubokill);
  useEffect(() => {
    rubokillRef.current = rubokill;
  }, [rubokill]);
  const [verRubokill, setVerRubokill] = useState(false);
  /** Pantalla en negro durante los glitches del último gol (con RuboKill), antes de que salga Rubo. */
  const [negro, setNegro] = useState(false);

  // Sonido: en los dos modos, un golpe cuando la bola pega en una barra y un sonido de gol. En el modo IA,
  // además, la estática de los glitches y la música: la fase 1 suena desde el saque inicial y al terminar
  // la partida se calla; las fases 2 y 3 entran cuando Rubo termina de escribir (ver `Dialogo`).
  const musica = useMusicaRubo();
  useEffect(() => {
    pausadoRef.current = pausado;
    musica.pausa(pausado);
  }, [pausado, musica]);
  const conMusica = nivel !== "normal" && tam !== null;
  useEffect(() => {
    if (!conMusica) return;
    if (nivel === "arcade") musica.tocarArcade();
    else musica.tocar(1, true);
    return () => musica.parar();
  }, [conMusica, nivel, ronda, musica]);

  // Arcade: el récord se actualiza con cada gol tuyo.
  const [record, anotarRecord] = useRecordArcade();
  const golesJugador = estado?.puntos.jugador ?? 0;
  useEffect(() => {
    if (nivel === "arcade") anotarRecord(golesJugador);
  }, [nivel, golesJugador, anotarRecord]);
  useEffect(() => {
    if (fin) musica.parar();
  }, [fin, musica]);

  // Ciclo del juego: un paso por cuadro de pantalla. Con la app en segundo plano no hay cuadros,
  // así que el juego se queda quieto hasta que vuelvas. Al terminar la partida sigue hasta que se
  // apagan las partículas del último gol.
  useEffect(() => {
    if (!tam) return;
    let id = 0;
    let ultimo: number | null = null;
    let esperando = 0;
    let particulas: Particula[] = [];
    /** Si en el último cuadro había partículas u ondas dibujadas (para borrarlas una sola vez). */
    let hayEfectos = false;
    let vigente = true;
    // Modo IA: cuando anota la máquina, la cancha tiembla, parpadea y se corren unas franjas; con cada
    // punto que lleva (`nivel`) la falla se repite más veces y es más fuerte.
    let espera: ReturnType<typeof setTimeout> | undefined;
    let latido: Animated.CompositeAnimation | undefined;
    /** Tu 4.º gol en la IA (fase 3): la barra de Rubo, la bola y la cancha se inflan, y su halo empieza a latir. */
    let quejido: Animated.CompositeAnimation | undefined;
    const sacudir = (valores: number[], ms: number) =>
      Animated.sequence(valores.map((v) => Animated.timing(temblor, { toValue: v, duration: ms, useNativeDriver: NATIVO })));
    /** Tu 2.º gol en la IA (fase 2): el golpe le duele a Rubo y queda herido (tiembla solo de vez en cuando). */
    const herir = () => {
      if (movimientoReducido()) return;
      dolor.setValue(0);
      Animated.sequence([
        Animated.timing(dolor, { toValue: 1, duration: 70, easing: Easing.out(Easing.quad), useNativeDriver: NATIVO }),
        Animated.timing(dolor, { toValue: 0, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: NATIVO }),
      ]).start();
      sacudir([1, -0.8, 0.6, -0.4, 0.2, 0], 50).start(({ finished }) => {
        if (!finished || !vigente) return;
        quejido = Animated.loop(Animated.sequence([Animated.delay(2200), sacudir([0.35, -0.35, 0.2, -0.1, 0], 45)]));
        quejido.start();
      });
    };
    const enfurecer = () => {
      if (movimientoReducido()) return;
      // Ya no está herido: ahora manda él.
      quejido?.stop();
      temblor.setValue(0);
      golpe.setValue(0);
      Animated.sequence([
        Animated.timing(golpe, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(3)), useNativeDriver: NATIVO }),
        Animated.timing(golpe, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVO }),
      ]).start();
      latido = Animated.loop(
        Animated.sequence([
          Animated.timing(furia, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVO }),
          Animated.timing(furia, { toValue: 0, duration: 450, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVO }),
        ]),
      );
      latido.start();
    };
    /**
     * Tu 6.º gol (fase 4, le queda un corazón): Rubo se desata. Su halo late el doble de rápido y su
     * barra tiembla sin parar.
     */
    const desatar = () => {
      if (movimientoReducido()) return;
      latido?.stop();
      quejido?.stop();
      latido = Animated.loop(
        Animated.sequence([
          Animated.timing(furia, { toValue: 1, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVO }),
          Animated.timing(furia, { toValue: 0, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVO }),
        ]),
      );
      latido.start();
      quejido = Animated.loop(Animated.sequence([sacudir([0.5, -0.5, 0.35, -0.35, 0.2, -0.2, 0], 40), Animated.delay(120)]));
      quejido.start();
    };
    /** `pierdes`: es el punto con el que la IA gana la partida (solo ahí sale RuboKill). */
    const fallar = (nivel: number, pierdes: boolean) => {
      if (movimientoReducido()) return;
      const suave = !rubokillRef.current;
      // `nivel` va un punto por encima del marcador: 2 es el primer gol de la IA, 3 el segundo…
      const leve = fallaSuave(nivel - 1);
      setEsSuave(suave);
      parpadeoFalla.setValue(suave ? leve.fuerza : 1);
      fuerzaFalla.setValue(suave ? leve.fuerza : 1 + 0.5 * (nivel - 1));
      const duracion = suave ? leve.duracion : nivel === 3 ? DURACION_FALLA_SEGUNDO_GOL : DURACION_FALLA;
      const rafaga = (quedan: number) => {
        if (!vigente) return;
        const alto = area?.alto ?? tam.alto;
        setCortes(
          suave
            ? Array.from({ length: leve.cortes }, () => crearCorte(alto, 1, leve.corrimiento))
            : Array.from({ length: CORTES_FALLA + CORTES_EXTRA_POR_PUNTO * (nivel - 1) }, () => crearCorte(alto, nivel)),
        );
        falla.setValue(0);
        // Estática con cada ráfaga: fuerte con RuboKill; sin él, tan suave como la falla (y sube con cada gol).
        musica.glitch(suave ? Math.min(0.5, 0.1 + 0.12 * (nivel - 1)) : 0.9);
        Animated.timing(falla, { toValue: 1, duration: duracion, easing: Easing.linear, useNativeDriver: NATIVO }).start(
          ({ finished }) => {
            if (!vigente) return;
            if (finished && quedan > 1) {
              rafaga(quedan - 1);
              return;
            }
            setCortes([]);
            // RuboKill: al terminar los glitches del punto con que pierdes, Rubo en toda la pantalla.
            if (finished && pierdes && rubokillRef.current) {
              // Aparece de golpe, dura lo mismo que una ráfaga de glitches y se va de golpe.
              setVerRubokill(true);
              espera = setTimeout(() => {
                setVerRubokill(false);
                setNegro(false);
              }, duracion);
            } else setNegro(false);
          },
        );
      };
      // Sin RuboKill, ráfagas suaves (una por gol). Con RuboKill, el punto con que pierdes trae solo 2 ráfagas
      // (igual de fuertes) y después Rubo.
      // Con RuboKill, en el último gol la pantalla se pone negra mientras glitchea, y luego sale Rubo.
      if (!suave && pierdes) setNegro(true);
      rafaga(suave ? leve.rafagas : pierdes ? RAFAGAS_ANTES_DE_RUBOKILL : nivel);
    };
    const cuadro = (t: number) => {
      // En pausa no avanza nada (y al seguir, el tiempo cuenta desde ahí, sin saltos).
      if (pausadoRef.current) {
        ultimo = null;
        id = requestAnimationFrame(cuadro);
        return;
      }
      const dt = ultimo === null ? 0 : (t - ultimo) / 1000;
      ultimo = t;
      const antes = estadoRef.current;
      if (!antes) return;
      const s = avanzar(antes, dt, dedo.current);
      // La bola solo invierte su dirección vertical al pegar en una barra (las paredes invierten la horizontal).
      if (antes.fase === "jugando" && s.fase === "jugando" && Math.sign(s.bola.vy) !== Math.sign(antes.bola.vy)) {
        musica.golpe(s.bola.vy < 0 ? "jugador" : "maquina");
      }
      if (s.fase === "fin" && antes.fase !== "fin" && ganador(s) === "jugador") alGanar();
      if (antes.fase === "jugando" && s.fase !== "jugando") {
        particulas = explotar(antes.bola, antes.alto);
        // Modo IA: al empezar las fases 2 y 3 (tus goles 2 y 4) Rubo te habla. La música se corta, suena su voz mientras
        // escribe y el saque espera a que termine de escribir.
        const dice = antes.nivel === "ia" && s.puntos.jugador > antes.puntos.jugador ? FRASES_RUBO[s.puntos.jugador] : undefined;
        // En normal y arcade los goles suenan; en la IA no tienen sonido propio (solo los glitches y la voz de Rubo).
        if (antes.nivel !== "ia") musica.gol(s.puntos.jugador > antes.puntos.jugador ? "jugador" : "maquina");
        if (dice) {
          saqueBloqueadoHasta.current = Date.now() + tiempoHablando(dice) + ESPERA_FRASE;
          setFrase({ goles: s.puntos.jugador, frases: dice });
          if (s.puntos.jugador === GOLES_FASE_2) herir();
          if (s.puntos.jugador === GOLES_FASE_3) enfurecer();
          if (s.puntos.jugador === GOLES_FASE_4) desatar();
        }
        // Un nivel por encima del marcador: el primer punto ya trae 2 ráfagas, el segundo 3, y del tercero
        // en adelante 4 (la partida llega a 7 y más serían eternas).
        if (antes.nivel === "ia" && s.puntos.maquina > antes.puntos.maquina) {
          fallar(Math.min(s.puntos.maquina + 1, NIVEL_FALLA_MAXIMO), ganador(s) === "maquina");
        }
      }
      particulas = moverParticulas(particulas, dt);
      esperando = s.fase === "saque" ? esperando + dt : 0;
      const ondas = esperando > ESPERA_ONDAS ? ondasEn(esperando - ESPERA_ONDAS) : [];
      estadoRef.current = s;
      pintar(s, tam.ancho);
      if (s.fase !== antes.fase || s.puntos !== antes.puntos) setEstado(s);
      const conEfectos = particulas.length > 0 || ondas.length > 0;
      if (conEfectos || hayEfectos) conectorEfectos.current?.({ ondas, particulas, bola: s.bola });
      hayEfectos = conEfectos;
      if (s.fase !== "fin" || particulas.length > 0) id = requestAnimationFrame(cuadro);
    };
    id = requestAnimationFrame(cuadro);
    return () => {
      vigente = false;
      clearTimeout(espera);
      setFrase(null);
      latido?.stop();
      quejido?.stop();
      dolor.setValue(0);
      temblor.setValue(0);
      furia.setValue(0);
      golpe.setValue(0);
      setNegro(false);
      setVerRubokill(false);
      // Si se reinicia a mitad de una ráfaga de glitches, que no queden franjas pegadas.
      setCortes([]);
      falla.setValue(0);
      cancelAnimationFrame(id);
    };
    // `alGanar` cambia en cada render de la pantalla; solo importa el último.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tam, ronda]);

  // Se usa la posición en la pantalla (pageX): el dedo puede estar en la cancha o debajo de ella.
  const mover = (e: GestureResponderEvent) => {
    if (tam && !pausadoRef.current) dedo.current = (e.nativeEvent.pageX - tam.x) / tam.ancho;
  };

  // El saque sale solo cuando tocas la pantalla (al empezar y después de cada gol).
  const tocar = (e: GestureResponderEvent) => {
    if (pausadoRef.current) return;
    if (Date.now() < saqueBloqueadoHasta.current) {
      mover(e);
      return;
    }
    mover(e);
    const s = estadoRef.current;
    if (s?.fase === "saque") estadoRef.current = sacarYa(s);
  };

  const revancha = () => {
    if (!tam) return;
    // Si terminó en la fase 3, el fondo rojo no se quita de golpe: se recoge hacia Rubo (ver FondoRubo).
    if (fase3) setRojoSaliendo(true);
    const s = nuevoJuego(tam.alto / tam.ancho, nivel, rapidez);
    estadoRef.current = s;
    dedo.current = null;
    pintar(s, tam.ancho);
    setEstado(s);
    setRonda((r) => r + 1);
  };

  // Modo IA: cancha con tono rojo y la barra de la máquina en rojo con brillo.
  const ia = nivel === "ia";
  // Fases 3 y 4 (desde tu 4.º gol): manda Rubo. Todo se tiñe de rojo y late con él: el borde, las
  // líneas, su marcador, un rojo que respira sobre la cancha y una viñeta roja en toda la pantalla; tu
  // barra se apaga un poco.
  const fase3 = ia && estado !== null && faseRubo(estado) >= 3;
  // Fase 4 (le queda un corazón): toda la pantalla se va a negro y solo brilla Rubo.
  const fase4 = ia && estado !== null && faseRubo(estado) === 4;
  // En la fase 4 el título del encabezado va blanco (en modo claro es oscuro y sobre el negro no se vería).
  useLayoutEffect(() => {
    if (!fase4) return;
    const estilo = (color: string) => ({ headerTitleStyle: { fontFamily: fuente.titulo, color, fontSize: 20 } });
    navegacion.setOptions(estilo("#FFFFFF"));
    return () => navegacion.setOptions(estilo(c.tinta));
  }, [fase4, navegacion, c.tinta]);
  // Arcade: la cancha es una cueva oscura (igual en modo claro y oscuro), con colores fijos que se ven sobre ella.
  const enCueva = nivel === "arcade";
  const colores = {
    fondo: enCueva ? COLORES_CUEVA.fondoAbajo : fase4 ? "#000000" : ia ? c.peligroSuave : c.superficie,
    borde: enCueva ? `${COLORES_CUEVA.filo}80` : fase3 ? c.peligro : ia ? `${c.peligro}66` : c.borde,
    trazos: enCueva ? "#FFFFFF33" : fase3 ? `${c.peligro}80` : ia ? `${c.peligro}40` : c.borde,
    maquina: enCueva ? COLORES_CUEVA.cristal2 : ia ? c.peligro : c.tinta2,
    jugador: enCueva ? COLORES_CUEVA.cristal : c.enfasis,
    // Sobre el negro de la fase 4 la bola va blanca (en modo claro la tinta es oscura y no se vería).
    bola: enCueva || fase4 ? "#FFFFFF" : c.tinta,
  };

  // Tamaño de la cancha: 1,85 veces más alta que ancha, lo más grande que quepa dejando libre la
  // zona de abajo; si no cabe a todo el ancho, se angosta y queda centrada.
  // En la IA, arriba de la cancha va la fila de corazones de Rubo.
  const arcade = nivel === "arcade";
  const filaCorazones = ia || arcade ? ALTO_CORAZON + espacio.m : 0;
  const relleno = { arriba: altoEncabezado + espacio.m + filaCorazones, abajo: insets.bottom };
  const altoDisponible = area ? area.alto - relleno.arriba - relleno.abajo - ZONA_DEDO_MINIMA : 0;
  const anchoCancha = area ? Math.max(0, Math.min(area.ancho - 2 * espacio.l, altoDisponible / PROPORCION_CANCHA)) : 0;
  const altoCancha = anchoCancha * PROPORCION_CANCHA;

  return (
    // La falla de pantalla (modo IA) mueve y hace parpadear toda la pantalla del juego.
    <Animated.View
      style={[
        styles.juego,
        {
          backgroundColor: c.fondo,
          paddingTop: relleno.arriba,
          paddingBottom: relleno.abajo,
          // Parpadeo: baja la opacidad según la fuerza de la falla (casi nada si es suave).
          opacity: Animated.subtract(
            1,
            Animated.multiply(
              falla.interpolate({ inputRange: [0, 0.1, 0.2, 0.35, 0.5, 1], outputRange: [0, 0.45, 0, 0.3, 0, 0] }),
              parpadeoFalla,
            ),
          ),
          transform: [
            {
              translateX: Animated.multiply(
                falla.interpolate({
                  inputRange: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1],
                  outputRange: [0, 9, -12, 7, -5, 2, 0],
                }),
                fuerzaFalla,
              ),
            },
          ],
        },
      ]}
      onLayout={medirArea}
      onTouchStart={tocar}
      onTouchMove={mover}
    >
      {/* Arcade: detrás de la cancha, en toda la pantalla, otra cueva igual pero solo en líneas, sin color. */}
      {enCueva && area ? <FondoCuevaLineas ancho={area.ancho} alto={area.alto} color={c.tinta} /> : null}

      {/* Fase 3: detrás de la cancha, el rojo nace desde Rubo (arriba) y se extiende con borde difuminado
          hasta llenar todo el fondo; después late con él. */}
      {(fase3 || rojoSaliendo) && area ? (
        <FondoRubo
          color={c.peligro}
          furia={furia}
          ancho={area.ancho}
          alto={area.alto}
          origenY={relleno.arriba}
          saliendo={!fase3 && rojoSaliendo}
          alSalir={() => setRojoSaliendo(false)}
        />
      ) : null}

      {/* Fase 4: todo se funde a negro, también el rojo de atrás; quedan Rubo, la bola y los corazones. */}
      {fase4 ? <Oscuridad /> : null}

      {/* Arcade: arriba el nivel y el récord, en letra de 8 bits. */}
      {arcade && estado ? (
        <View pointerEvents="none" style={[styles.marcadorArcade, { top: altoEncabezado + espacio.s }]}>
          <Text style={[styles.textoArcade, { color: c.enfasis }]}>NIVEL {Math.min(golesJugador, NIVEL_ARCADE_MAXIMO - 1) + 1}</Text>
          <Text style={[styles.textoArcade, { color: c.tinta2 }]}>RÉCORD {Math.max(record, golesJugador)}</Text>
        </View>
      ) : null}

      {/* Modo IA: arriba los 7 corazones de Rubo (negros cuando el fondo se pone rojo) y abajo tus 3. */}
      {ia && estado ? (
        <>
          <Corazones
            quien="Rubo"
            total={GOLES_IA}
            rotos={estado.puntos.jugador}
            color={fase3 && !fase4 ? "#000000" : c.peligro}
            posicion={{ top: altoEncabezado + espacio.s }}
          />
          <Corazones
            quien="Tú"
            total={CORAZONES_JUGADOR}
            rotos={estado.puntos.maquina}
            color={c.enfasis}
            posicion={{ bottom: relleno.abajo + espacio.m }}
          />
        </>
      ) : null}

      {/* RuboKill activado (solo cambia el modo IA): una calavera abajo a la derecha, fuera de la cancha. */}
      {ia && rubokill ? (
        <View
          pointerEvents="none"
          style={[styles.calavera, { bottom: relleno.abajo + espacio.m }]}
          accessible
          accessibilityLabel="RuboKill activado"
        >
          <Ionicons name="skull" size={28} color={c.peligro} />
        </View>
      ) : null}

      {area ? (
        // La cancha aparece subiendo, como los bloques de las demás pantallas.
        <Entrada style={styles.contenedorCancha}>
          <Animated.View
            style={[
              styles.cancha,
              {
                width: anchoCancha,
                height: altoCancha,
                backgroundColor: colores.fondo,
                borderColor: colores.borde,
                borderWidth: fase3 ? 2 : 1,
                transform: [{ scale: golpe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }],
              },
            ]}
            onLayout={medir}
          >
            {tam && estado ? (
              <>
                {fase3 && !fase4 ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: c.peligro, opacity: furia.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.14] }) },
                    ]}
                  />
                ) : null}
                {enCueva ? (
                  <FondoCueva ancho={tam.ancho} alto={tam.alto} />
                ) : (
                  <Decoracion ancho={tam.ancho} alto={tam.alto} color={colores.trazos} />
                )}
                <LineaMedio ancho={tam.ancho} alto={tam.alto} color={colores.trazos} />

                {/* Puntos grandes y tenues de fondo: arriba la máquina, abajo tú. */}
                <View pointerEvents="none" style={[styles.mitad, { top: 0 }]}>
                  <Text style={[styles.puntoGrande, { color: fase3 ? `${c.peligro}AA` : colores.trazos }]}>{estado.puntos.maquina}</Text>
                </View>
                <View pointerEvents="none" style={[styles.mitad, { bottom: 0 }]}>
                  <Text style={[styles.puntoGrande, { color: colores.trazos }]}>{estado.puntos.jugador}</Text>
                </View>

                <Barra
                  x={pos.maquina}
                  y={MARGEN}
                  ancho={tam.ancho}
                  color={colores.maquina}
                  brillo={ia}
                  rabia={fase4}
                  golpe={golpe}
                  furia={furia}
                  dolor={dolor}
                  temblor={temblor}
                />
                <Barra x={pos.jugador} y={estado.alto - MARGEN} ancho={tam.ancho} color={colores.jugador} apagada={fase3} />
                {estado.fase !== "fin" ? (
                  <Bola x={pos.bolaX} y={pos.bolaY} golpe={golpe} ancho={tam.ancho} color={colores.bola} />
                ) : null}

                <CapaEfectos conectorRef={conectorEfectos} ancho={tam.ancho} alto={tam.alto} color={c.enfasis} />
              </>
            ) : null}

            {/* Modo IA: al empezar las fases 2, 3 y 4, Rubo te escribe algo. */}
            {tam && frase ? (
              <Dialogo
                key={frase.goles}
                frases={frase.frases}
                arriba={(MARGEN + BARRA_ALTO) * tam.ancho + espacio.l}
                musica={musica}
                fase={estado ? faseRubo(estado) : 1}
                alSalir={() => setFrase(null)}
              />
            ) : null}

            {/* Al terminar, ganes o pierdas: una rueda en el medio; solo tocarla empieza otra partida. */}
            {fin ? <Final ganaste={ganador(estado) === "jugador"} puntos={estado.puntos} rojo={ia} alReiniciar={revancha} /> : null}
          </Animated.View>
        </Entrada>
      ) : null}



      {/* Último gol con RuboKill: todo en negro; el destello y las franjas de la falla van encima. */}
      {negro ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#000000" }]} /> : null}

      {/* Falla de pantalla: un destello rojo y franjas corridas sobre toda la pantalla del juego. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: c.peligro,
            opacity: Animated.multiply(
              falla.interpolate({ inputRange: [0, 0.08, 0.25, 1], outputRange: [0, 0.18, 0, 0] }),
              fuerzaFalla,
            ),
          },
        ]}
      />
      {/* RuboKill: una capa sobre toda la pantalla del juego. Está siempre montada (con la foto ya
          cargada) y solo se muestra u oculta, así aparece en el mismo cuadro, sin retraso. */}
      <Presionable
        onPress={() => setVerRubokill(false)}
        disabled={!verRubokill}
        pointerEvents={verRubokill ? "auto" : "none"}
        accessibilityElementsHidden={!verRubokill}
        importantForAccessibility={verRubokill ? "yes" : "no-hide-descendants"}
        accessibilityLabel="Rubo te ganó"
        style={[styles.rubokill, { opacity: verRubokill ? 1 : 0 }]}
      >
        <Image source={FOTO_RUBOKILL} resizeMode="contain" style={styles.fotoRubokill} />
      </Presionable>
      {pausado ? (
        <Pausa
          alContinuar={alContinuar}
          alReiniciar={() => {
            // Partida nueva desde cero (en el arcade, con otra canción) y sin pausa.
            revancha();
            alContinuar();
          }}
          alSalir={alSalir}
        />
      ) : null}
      {cortes.map((corte, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            styles.corte,
            { top: corte.y, height: corte.alto, backgroundColor: `${corte.color === "tinta" ? c.tinta : corte.color === "enfasis" ? c.enfasis : c.peligro}${esSuave ? "18" : "55"}`, transform: [{ translateX: corte.dx }] },
          ]}
        />
      ))}
    </Animated.View>
  );
}

const NATIVO = Platform.OS !== "web";
/** Rubo de verdad: la foto que sale con RuboKill al perder contra la IA (PNG con fondo transparente). */
const FOTO_RUBOKILL = require("../../assets/rubokill.png");
/** Con RuboKill activado, el juego corre a esta velocidad (2 = el doble). */
const RAPIDEZ_RUBOKILL = 2;
/** Ráfagas de glitches antes de que salga Rubo (con RuboKill, en el punto con que pierdes). */
const RAFAGAS_ANTES_DE_RUBOKILL = 2;
/** Distancia entre eslabones de las cadenas. */
const PASO_ESLABON = 11;
/** Acero (cadenas) y latón (candado), iguales en modo claro y oscuro. */
const ACERO = { claro: "#F1EFFA", medio: "#A9A6C6", oscuro: "#57537D", sombra: "rgba(0, 0, 0, 0.35)" };
const LATON = { claro: "#FFE3A1", medio: "#E0A93B", oscuro: "#8A5A0B" };

/** Degradados compartidos: acero para eslabones y latón para el cuerpo del candado. */
function DegradadosMetal() {
  return (
    <Defs>
      <LinearGradient id="acero" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={ACERO.claro} />
        <Stop offset="0.5" stopColor={ACERO.medio} />
        <Stop offset="1" stopColor={ACERO.oscuro} />
      </LinearGradient>
      <LinearGradient id="laton" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={LATON.claro} />
        <Stop offset="0.55" stopColor={LATON.medio} />
        <Stop offset="1" stopColor={LATON.oscuro} />
      </LinearGradient>
    </Defs>
  );
}

/**
 * Una cadena recta de (x1, y1) a (x2, y2) con relieve: cada eslabón lleva sombra debajo, cuerpo de acero
 * con degradado y un brillo arriba. Se alternan eslabones de frente (anillos) y de canto (barras).
 */
function Cadena({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const largo = Math.hypot(x2 - x1, y2 - y1);
  const angulo = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const eslabones = Math.floor(largo / PASO_ESLABON);
  return (
    <>
      {Array.from({ length: eslabones }, (_, i) => {
        const t = (i + 0.5) / eslabones;
        const cx = x1 + (x2 - x1) * t;
        const cy = y1 + (y2 - y1) * t;
        return (
          <G key={i} transform={`rotate(${angulo} ${cx} ${cy})`}>
            {i % 2 === 0 ? (
              <>
                <Rect
                  x={cx - 7}
                  y={cy - 3.5}
                  width={14}
                  height={9}
                  rx={4.5}
                  stroke={ACERO.sombra}
                  strokeWidth={3.2}
                  fill="none"
                />
                <Rect x={cx - 7} y={cy - 4.5} width={14} height={9} rx={4.5} stroke="url(#acero)" strokeWidth={3.2} fill="none" />
                <Line
                  x1={cx - 3.5}
                  y1={cy - 5}
                  x2={cx + 3.5}
                  y2={cy - 5}
                  stroke={ACERO.claro}
                  strokeWidth={1}
                  strokeLinecap="round"
                  opacity={0.9}
                />
              </>
            ) : (
              <>
                <Line
                  x1={cx - 6.5}
                  y1={cy + 1.2}
                  x2={cx + 6.5}
                  y2={cy + 1.2}
                  stroke={ACERO.sombra}
                  strokeWidth={4.5}
                  strokeLinecap="round"
                />
                <Line x1={cx - 6.5} y1={cy} x2={cx + 6.5} y2={cy} stroke="url(#acero)" strokeWidth={4.5} strokeLinecap="round" />
                <Line
                  x1={cx - 4.5}
                  y1={cy - 1}
                  x2={cx + 4.5}
                  y2={cy - 1}
                  stroke={ACERO.claro}
                  strokeWidth={1}
                  strokeLinecap="round"
                  opacity={0.9}
                />
              </>
            )}
          </G>
        );
      })}
    </>
  );
}

/** Candado de latón con relieve: arco de acero (abierto, se levanta y se suelta de un lado), cuerpo, brillo y cerradura. */
function Candado({ abierto }: { abierto: boolean }) {
  return (
    <Svg width={26} height={32} viewBox="0 0 26 32">
      <DegradadosMetal />
      <Ellipse cx={13} cy={30} rx={9} ry={1.8} fill={ACERO.sombra} />
      {/* Arco: cerrado entra al cuerpo por los dos lados; abierto sube y queda suelto a la derecha. */}
      <Path
        d={abierto ? "M 7 13 L 7 6 A 6 6 0 0 1 19 6 L 19 8" : "M 7 15 L 7 10 A 6 6 0 0 1 19 10 L 19 15"}
        stroke={ACERO.sombra}
        strokeWidth={3.6}
        fill="none"
        transform="translate(0.8 1)"
      />
      <Path
        d={abierto ? "M 7 13 L 7 6 A 6 6 0 0 1 19 6 L 19 8" : "M 7 15 L 7 10 A 6 6 0 0 1 19 10 L 19 15"}
        stroke="url(#acero)"
        strokeWidth={3.6}
        strokeLinecap="round"
        fill="none"
      />
      <Rect x={3.5} y={14} width={19} height={14} rx={3} fill="url(#laton)" stroke={LATON.oscuro} strokeWidth={0.8} />
      <Rect x={5} y={15.2} width={16} height={2.2} rx={1.1} fill={LATON.claro} opacity={0.75} />
      <Circle cx={13} cy={20.5} r={2} fill="#3A2606" />
      <Rect x={12.2} y={21} width={1.6} height={4} rx={0.8} fill="#3A2606" />
    </Svg>
  );
}

/** Vaivén del candado al forcejear con el modo IA bloqueado: cada valor es un golpe, cada vez más suave. */
const VAIVEN_FORCEJEO = [1, -0.75, 0.5, -0.3, 0.15, 0];

/**
 * Dos cadenas cruzadas y un candado sobre el modo IA. Cada vez que sube `forcejeos` (tocaste el modo
 * bloqueado) las cadenas tiemblan y el candado se balancea y da un saltito, pero no se rompen. Con
 * `llamando` (ya desbloqueado, aún sin romper) vibran solas cada tanto para que las toques. Con
 * `rompiendo`, se sacuden, el candado se abre y cada mitad cae hacia su lado mientras se desvanece; al
 * terminar avisa con `alRomperse`.
 */
function Cadenas({
  rompiendo,
  alRomperse,
  forcejeos = 0,
  llamando = false,
}: {
  rompiendo: boolean;
  alRomperse: () => void;
  forcejeos?: number;
  llamando?: boolean;
}) {
  const [tam, setTam] = useState<{ ancho: number; alto: number } | null>(null);
  const [sacudida] = useState(() => new Animated.Value(0));
  const [rotura] = useState(() => new Animated.Value(0));
  const [vaiven] = useState(() => new Animated.Value(0));
  const [salto] = useState(() => new Animated.Value(0));
  const [zumbido] = useState(() => new Animated.Value(0));
  const [abierto, setAbierto] = useState(false);

  // Ya desbloqueado: una ráfaga de vibración rápida, una pausa, y otra vez, hasta que lo toques.
  useEffect(() => {
    if (!llamando || rompiendo || movimientoReducido()) return;
    const golpe = (valor: number) => Animated.timing(zumbido, { toValue: valor, duration: 40, useNativeDriver: NATIVO });
    const rafaga = Animated.sequence([golpe(1), golpe(-1), golpe(1), golpe(-1), golpe(1), golpe(-1), golpe(0)]);
    const ciclo = Animated.loop(Animated.sequence([rafaga, Animated.delay(900)]));
    ciclo.start();
    return () => {
      ciclo.stop();
      zumbido.setValue(0);
    };
  }, [llamando, rompiendo, zumbido]);

  useEffect(() => {
    if (forcejeos === 0 || movimientoReducido()) return;
    vaiven.setValue(0);
    salto.setValue(0);
    const balanceo = Animated.sequence(
      VAIVEN_FORCEJEO.map((v) => Animated.timing(vaiven, { toValue: v, duration: 70, useNativeDriver: NATIVO })),
    );
    const brinco = Animated.sequence([
      Animated.timing(salto, { toValue: 1, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: NATIVO }),
      Animated.spring(salto, { toValue: 0, friction: 4, tension: 160, useNativeDriver: NATIVO }),
    ]);
    const todo = Animated.parallel([balanceo, brinco]);
    todo.start();
    return () => todo.stop();
  }, [forcejeos, vaiven, salto]);

  useEffect(() => {
    if (!rompiendo || !tam) return;
    if (movimientoReducido()) {
      alRomperse();
      return;
    }
    let vigente = true;
    const golpe = (valor: number) => Animated.timing(sacudida, { toValue: valor, duration: 55, useNativeDriver: NATIVO });
    const sacudir = Animated.sequence([golpe(1), golpe(-1), golpe(1), golpe(-1), golpe(0)]);
    const romper = Animated.timing(rotura, {
      toValue: 1,
      duration: 650,
      easing: Easing.in(Easing.quad),
      useNativeDriver: NATIVO,
    });
    sacudir.start(({ finished }) => {
      if (!finished || !vigente) return;
      setAbierto(true);
      romper.start(({ finished: fin }) => fin && vigente && alRomperse());
    });
    return () => {
      vigente = false;
      sacudir.stop();
      romper.stop();
    };
  }, [rompiendo, tam, sacudida, rotura, alRomperse]);

  const medir = (e: LayoutChangeEvent) => setTam({ ancho: e.nativeEvent.layout.width, alto: e.nativeEvent.layout.height });
  // Al romperse tiemblan 3 px; al forcejear, las cadenas tironean 2 px con el vaivén del candado; al
  // llamar (ya desbloqueado) vibran 2 px.
  const temblor = Animated.add(
    Animated.add(Animated.multiply(sacudida, 3), Animated.multiply(vaiven, 2)),
    Animated.multiply(zumbido, 2),
  );

  /** Cada mitad (izquierda -1, derecha 1) cae hacia su lado, gira y se desvanece. */
  const mitad = (lado: -1 | 1) => ({
    opacity: rotura.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [
      {
        translateX: Animated.add(
          temblor,
          rotura.interpolate({ inputRange: [0, 1], outputRange: [0, lado * (tam?.ancho ?? 0) * 0.15] }),
        ),
      },
      { translateY: rotura.interpolate({ inputRange: [0, 1], outputRange: [0, (tam?.alto ?? 0) * 0.9] }) },
      { rotate: rotura.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${lado * 14}deg`] }) },
    ],
  });

  const dibujo = tam ? (
    <Svg width={tam.ancho} height={tam.alto}>
      <DegradadosMetal />
      <Cadena x1={4} y1={4} x2={tam.ancho - 4} y2={tam.alto - 4} />
      <Cadena x1={4} y1={tam.alto - 4} x2={tam.ancho - 4} y2={4} />
    </Svg>
  ) : null;

  return (
    <View style={StyleSheet.absoluteFill} onLayout={medir}>
      {tam ? (
        <>
          {/* La misma cadena partida en dos: cada mitad recorta su lado del dibujo. */}
          <Animated.View style={[styles.mitadCadena, { left: 0, width: tam.ancho / 2 }, mitad(-1)]}>{dibujo}</Animated.View>
          <Animated.View style={[styles.mitadCadena, { left: tam.ancho / 2, width: tam.ancho / 2 }, mitad(1)]}>
            <View style={{ marginLeft: -tam.ancho / 2 }}>{dibujo}</View>
          </Animated.View>
          <View style={styles.centroCandado}>
            <Animated.View
              style={{
                opacity: rotura.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                transform: [
                  { translateX: temblor },
                  { translateY: salto.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
                  { rotate: vaiven.interpolate({ inputRange: [-1, 1], outputRange: ["-20deg", "20deg"] }) },
                  { rotate: zumbido.interpolate({ inputRange: [-1, 1], outputRange: ["-8deg", "8deg"] }) },
                  { scale: rotura.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) },
                ],
              }}
            >
              <Candado abierto={abierto} />
            </Animated.View>
          </View>
        </>
      ) : null}
    </View>
  );
}

/**
 * Lo fijo de la cancha: cuadrícula de puntos tenue. No depende del juego, así que no se vuelve a dibujar en cada cuadro.
 */
const Decoracion = memo(function Decoracion({ ancho, alto, color }: { ancho: number; alto: number; color: string }) {
  const paso = ancho / COLUMNAS_CUADRICULA;
  const filas = Math.floor(alto / paso);
  // Se centra la cuadrícula a lo alto: lo que sobra se reparte arriba y abajo.
  const arriba = (alto - filas * paso) / 2;
  const puntos: Punto[] = [];
  for (let fila = 0; fila < filas; fila++) {
    for (let col = 0; col < COLUMNAS_CUADRICULA; col++) puntos.push({ x: (col + 0.5) * paso, y: arriba + (fila + 0.5) * paso });
  }

  return (
    <Svg width={ancho} height={alto} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {puntos.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={1.5} fill={color} />
      ))}
    </Svg>
  );
});

/**
 * Fondo de la cancha del arcade: una cueva low-poly al estilo de Geometry Dash (ver lib/cueva.ts).
 * Se arma una sola vez por tamaño de cancha y no se anima, para no pesarle al juego.
 */
const FondoCueva = memo(function FondoCueva({ ancho, alto }: { ancho: number; alto: number }) {
  // Si cambia el tamaño de la cancha, la cueva se vuelve a armar a la medida.
  const cueva = useMemo(() => crearCueva(ancho, alto), [ancho, alto]);
  const C = COLORES_CUEVA;
  return (
    <Svg width={ancho} height={alto} pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="cueva-fondo" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.fondoArriba} />
          <Stop offset="1" stopColor={C.fondoAbajo} />
        </LinearGradient>
        {/* Viñeta: las orillas más oscuras, para que la mirada vaya al centro. */}
        <RadialGradient id="cueva-vineta" cx="0.5" cy="0.5" r="0.75">
          <Stop offset="0.55" stopColor="#000000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.55} />
        </RadialGradient>
        {cueva.halos.map((h, i) => (
          <RadialGradient key={i} id={`cueva-halo-${i}`}>
            <Stop offset="0" stopColor={h.color} stopOpacity={h.opacidad} />
            <Stop offset="1" stopColor={h.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <Rect width={ancho} height={alto} fill="url(#cueva-fondo)" />
      {cueva.halos.map((h, i) => (
        <Circle key={i} cx={h.x} cy={h.y} r={h.r} fill={`url(#cueva-halo-${i})`} />
      ))}
      {cueva.figuras.map((f, i) => {
        const comun = {
          points: puntosSvg(f.puntos),
          stroke: f.borde ?? "none",
          strokeWidth: f.grosor ?? 1,
          strokeLinejoin: "round" as const,
          opacity: f.opacidad ?? 1,
        };
        return f.abierta ? (
          <Polyline key={i} {...comun} fill="none" strokeLinecap="round" />
        ) : (
          <Polygon key={i} {...comun} fill={f.relleno} />
        );
      })}
      {cueva.motas.map((m, i) => (
        <Circle key={i} cx={m.x} cy={m.y} r={m.r} fill={m.color} opacity={m.opacidad} />
      ))}
      <Rect width={ancho} height={alto} fill="url(#cueva-vineta)" />
    </Svg>
  );
});

/** Fase 4: un negro que tapa toda la pantalla del juego (también el rojo), apareciendo en casi un segundo. */
function Oscuridad() {
  const [opacidad] = useState(() => new Animated.Value(movimientoReducido() ? 1 : 0));
  useEffect(() => {
    const a = Animated.timing(opacidad, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVO });
    a.start();
    return () => a.stop();
  }, [opacidad]);
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#000000", opacity: opacidad }]} />;
}

/**
 * Fondo de toda la pantalla del arcade, detrás de la cancha: otra cueva (con otra semilla) dibujada solo
 * con líneas tenues del color de la letra, sin rellenos ni colores: el filo de la roca más marcado y las
 * facetas apenas. Estática, como la de la cancha.
 */
const FondoCuevaLineas = memo(function FondoCuevaLineas({ ancho, alto, color }: { ancho: number; alto: number; color: string }) {
  const cueva = useMemo(() => crearCueva(ancho, alto, 23), [ancho, alto]);
  return (
    <Svg width={ancho} height={alto} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {cueva.figuras.map((f, i) => {
        // Las líneas abiertas son el filo de la roca (fino) y su resplandor (grueso, que aquí no va).
        const filo = f.abierta && (f.grosor ?? 1) < 3;
        if (f.abierta && !filo) return null;
        const comun = {
          points: puntosSvg(f.puntos),
          fill: "none",
          stroke: color,
          strokeWidth: filo ? 1.2 : 0.6,
          strokeLinejoin: "round" as const,
          opacity: filo ? 0.35 : 0.12,
        };
        return f.abierta ? <Polyline key={i} {...comun} /> : <Polygon key={i} {...comun} />;
      })}
      {cueva.motas.map((m, i) => (
        <Circle key={i} cx={m.x} cy={m.y} r={m.r} fill={color} opacity={0.18} />
      ))}
    </Svg>
  );
});

/**
 * Barra de un jugador: una vista que se mueve sola con `x` (px del borde izquierdo), sin volver a
 * dibujarse. Con `brillo`, lleva un halo de su color detrás (la de la IA). `golpe` la estira un
 * momento y `furia` hace latir el halo (cuando la IA se pone imposible). Memorizada: sus props no
 * cambian durante la partida, así que no se vuelve a dibujar cuando la pantalla sí lo hace.
 */
const Barra = memo(function Barra({
  x,
  y,
  ancho,
  color,
  brillo = false,
  rabia = false,
  golpe,
  furia,
  dolor,
  temblor,
  apagada = false,
}: {
  x: Animated.Value;
  y: number;
  ancho: number;
  color: string;
  brillo?: boolean;
  /** Fase 4: brilla mucho más (halo grande y núcleo blanco que late). */
  rabia?: boolean;
  golpe?: Animated.Value;
  furia?: Animated.Value;
  /** 0 → 1 → 0 al empezar la fase 2: destella en blanco, se aplasta y salta hacia atrás. */
  dolor?: Animated.Value;
  /** -1 a 1: la sacude de lado a lado. */
  temblor?: Animated.Value;
  /** Más tenue (tu barra cuando manda Rubo). */
  apagada?: boolean;
}) {
  const largo = BARRA_ANCHO * ancho;
  const grosor = BARRA_ALTO * ancho;
  // El halo late con la furia y se apaga un instante con el dolor.
  const halo = (base: number, fuerte: number) => {
    const valor = furia ? furia.interpolate({ inputRange: [0, 1], outputRange: [base, fuerte] }) : base;
    return dolor ? Animated.multiply(valor, dolor.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })) : valor;
  };
  const de = (v: Animated.Value | undefined, salida: [number, number]) =>
    v ? v.interpolate({ inputRange: [0, 1], outputRange: salida }) : salida[0];
  // La posición (que el juego cambia en cada cuadro) va en la vista de afuera; el temblor, el golpe y el
  // dolor (animaciones nativas) en la de adentro. Así no se mezclan en una misma vista.
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.barra, { top: (y - BARRA_ALTO / 2) * ancho, width: largo, height: grosor, transform: [{ translateX: x }] }]}
    >
      <Animated.View
        style={{
          width: largo,
          height: grosor,
          opacity: apagada ? 0.7 : 1,
          transform: [
            { translateX: temblor ? Animated.multiply(temblor, 5) : 0 },
            { translateY: de(dolor, [0, -10]) },
            { scaleX: de(golpe, [1, 1.3]) },
            { scaleY: de(golpe, [1, 1.8]) },
            { scaleX: de(dolor, [1, 0.88]) },
            { scaleY: de(dolor, [1, 0.45]) },
          ],
        }}
      >
        {rabia ? (
          <>
            <Animated.View
              style={{
                position: "absolute",
                left: -26,
                top: -22,
                right: -26,
                bottom: -22,
                borderRadius: grosor / 2 + 24,
                backgroundColor: color,
                opacity: halo(0.12, 0.3),
              }}
            />
            <Animated.View
              style={{
                position: "absolute",
                left: -14,
                top: -12,
                right: -14,
                bottom: -12,
                borderRadius: grosor / 2 + 13,
                backgroundColor: color,
                opacity: halo(0.25, 0.55),
              }}
            />
          </>
        ) : null}
        {brillo ? (
          <>
            <Animated.View
              style={{
                position: "absolute",
                left: -8,
                top: -8,
                right: -8,
                bottom: -8,
                borderRadius: grosor / 2 + 8,
                backgroundColor: color,
                opacity: halo(0.12, 0.4),
              }}
            />
            <Animated.View
              style={{
                position: "absolute",
                left: -4,
                top: -4,
                right: -4,
                bottom: -4,
                borderRadius: grosor / 2 + 4,
                backgroundColor: color,
                opacity: halo(0.22, 0.6),
              }}
            />
          </>
        ) : null}
        <View style={{ flex: 1, borderRadius: grosor / 2, backgroundColor: color }} />
        {rabia ? (
          // Núcleo al rojo blanco, que late con el halo.
          <Animated.View
            style={{
              position: "absolute",
              left: grosor,
              right: grosor,
              top: grosor * 0.3,
              bottom: grosor * 0.3,
              borderRadius: grosor,
              backgroundColor: "#FFFFFF",
              opacity: halo(0.45, 0.95),
            }}
          />
        ) : null}
        {dolor ? (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: grosor / 2, backgroundColor: "#FFFFFF", opacity: dolor.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] }) },
            ]}
          />
        ) : null}
      </Animated.View>
    </Animated.View>
  );
});

/** Cuánto tarda el rojo en llenar el fondo al entrar en la fase 3 (ms). */
const EXPANSION_ROJO = 900;
/** Cuánto tarda en recogerse hacia Rubo al reiniciar después de perder en la fase 3 (ms). */
const RECOGIDA_ROJO = 700;
/** Anillos del borde difuminado: cuánto más grandes que el círculo y qué tan opacos. */
const PLUMA = [
  { escala: 1.12, opacidad: 0.25 },
  { escala: 1.06, opacidad: 0.5 },
  { escala: 1, opacidad: 1 },
];

/**
 * Fondo de la fase 3 de la IA: un círculo rojo nace desde Rubo (arriba al centro) y crece hasta cubrir
 * toda la pantalla, con el borde difuminado (anillos cada vez más transparentes por fuera). Ya lleno,
 * el rojo late con Rubo (`furia`), oscureciéndose un poco. Son vistas simples movidas con el driver
 * nativo: no le quitan fluidez al juego.
 */
function FondoRubo({
  color,
  furia,
  ancho,
  alto,
  origenY,
  saliendo = false,
  alSalir,
}: {
  color: string;
  furia: Animated.Value;
  ancho: number;
  alto: number;
  origenY: number;
  /** Al reiniciar: el rojo se recoge hacia Rubo hasta desaparecer y luego avisa con `alSalir`. */
  saliendo?: boolean;
  alSalir?: () => void;
}) {
  const [crecer] = useState(() => new Animated.Value(movimientoReducido() ? 1 : 0));
  // El círculo tiene que llegar a la esquina más lejana desde el origen.
  const radio = Math.hypot(ancho / 2, Math.max(origenY, alto - origenY)) * 1.05;

  useEffect(() => {
    if (movimientoReducido()) return;
    const animacion = Animated.timing(crecer, {
      toValue: 1,
      duration: EXPANSION_ROJO,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVO,
    });
    animacion.start();
    return () => animacion.stop();
  }, [crecer]);

  useEffect(() => {
    if (!saliendo) return;
    if (movimientoReducido()) {
      alSalir?.();
      return;
    }
    const animacion = Animated.timing(crecer, {
      toValue: 0,
      duration: RECOGIDA_ROJO,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: NATIVO,
    });
    animacion.start(({ finished }) => finished && alSalir?.());
    return () => animacion.stop();
    // `alSalir` cambia en cada render de la pantalla; solo importa cuándo empieza a salir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saliendo, crecer]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      {PLUMA.map(({ escala, opacidad }, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: ancho / 2 - radio * escala,
            top: origenY - radio * escala,
            width: 2 * radio * escala,
            height: 2 * radio * escala,
            borderRadius: radio * escala,
            backgroundColor: color,
            opacity: opacidad,
            transform: [{ scale: crecer }],
          }}
        />
      ))}
      {/* Latido: una capa oscura encima que va y viene con Rubo. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "#000000", opacity: furia.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.05] }) }]}
      />
    </View>
  );
}

/** La bola: una vista que se mueve sola con `x` e `y` (px) y se infla con `golpe`. Memorizada, como las barras. */
/**
 * La bola. La posición (que el juego cambia en cada cuadro) y el inflado de `golpe` (animación nativa)
 * van en vistas separadas, para no mezclar en una misma vista valores del juego y del driver nativo.
 */
const Bola = memo(function Bola({
  x,
  y,
  golpe,
  ancho,
  color,
}: {
  x: Animated.Value;
  y: Animated.Value;
  golpe: Animated.Value;
  ancho: number;
  color: string;
}) {
  const lado = 2 * BOLA_RADIO * ancho;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.bola, { width: lado, height: lado, transform: [{ translateX: x }, { translateY: y }] }]}
    >
      <Animated.View
        style={{
          width: lado,
          height: lado,
          borderRadius: lado / 2,
          backgroundColor: color,
          transform: [{ scale: golpe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
        }}
      />
    </Animated.View>
  );
});

type Efectos = { ondas: number[]; particulas: Particula[]; bola: Punto };

/**
 * Partículas del gol y ondas del saque. Tiene su propio estado: el juego le pasa cada cuadro por
 * `conectorRef` y solo esta capa se vuelve a dibujar. Antes se redibujaba toda la pantalla del juego en
 * cada cuadro mientras había efectos, y la bola se trababa justo después de los goles.
 */
const CapaEfectos = memo(function CapaEfectos({
  conectorRef,
  ancho,
  alto,
  color,
}: {
  conectorRef: { current: ((e: Efectos) => void) | null };
  ancho: number;
  alto: number;
  color: string;
}) {
  const [efectos, setEfectos] = useState<Efectos>({ ondas: [], particulas: [], bola: { x: 0, y: 0 } });
  useEffect(() => {
    conectorRef.current = setEfectos;
    return () => {
      conectorRef.current = null;
    };
  }, [conectorRef]);
  if (efectos.particulas.length === 0 && efectos.ondas.length === 0) return null;
  return (
    <Svg width={ancho} height={alto} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {efectos.particulas.map((p, i) => (
        <Circle key={i} cx={p.x * ancho} cy={p.y * ancho} r={BOLA_RADIO * ancho * (0.25 + 0.3 * p.vida)} fill={color} opacity={p.vida} />
      ))}
      {efectos.ondas.map((avance, i) => (
        <Circle
          key={i}
          cx={efectos.bola.x * ancho}
          cy={efectos.bola.y * ancho}
          r={BOLA_RADIO * ancho * (1 + (ALCANCE_ONDA - 1) * avance)}
          stroke={color}
          strokeWidth={4}
          fill="none"
          opacity={0.8 * (1 - avance)}
        />
      ))}
    </Svg>
  );
});

/** Línea punteada del medio de la cancha (fija: no se vuelve a dibujar en cada cuadro). */
const LineaMedio = memo(function LineaMedio({ ancho, alto, color }: { ancho: number; alto: number; color: string }) {
  return (
    <Svg width={ancho} height={alto} pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Line x1={0} x2={ancho} y1={alto / 2} y2={alto / 2} stroke={color} strokeWidth={2} strokeDasharray="8 8" />
    </Svg>
  );
});

/** Corazón de 8 bits: 7 × 6 píxeles. */
const PIXELES_CORAZON = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
/** Por dónde se parte (columna de cada fila): una grieta en zigzag. */
const GRIETA = [4, 3, 4, 3, 3, 4];
const PIXEL = 4;
const ANCHO_CORAZON = PIXEL * 7;
const ALTO_CORAZON = PIXEL * 6;
const DURACION_ROTURA = 650;

/** Los píxeles de un corazón: entero, o solo la mitad izquierda o derecha de la grieta. */
function PixelesCorazon({ color, mitad }: { color: string; mitad?: "izquierda" | "derecha" }) {
  return (
    <Svg width={ANCHO_CORAZON} height={ALTO_CORAZON}>
      {PIXELES_CORAZON.flatMap((fila, y) =>
        [...fila].map((p, x) =>
          p === "X" && (!mitad || (mitad === "izquierda") === x < GRIETA[y]) ? (
            <Rect key={`${x}-${y}`} x={x * PIXEL} y={y * PIXEL} width={PIXEL} height={PIXEL} fill={color} />
          ) : null,
        ),
      )}
    </Svg>
  );
}

/**
 * Un corazón de Rubo. Al romperse (`roto`) da un salto, tiembla, se parte por la grieta y las dos
 * mitades caen girando y se desvanecen; queda su hueco apagado. Al reiniciar vuelve entero.
 */
const Corazon = memo(function Corazon({ roto, color }: { roto: boolean; color: string }) {
  const c = useColores();
  const [rotura] = useState(() => new Animated.Value(roto ? 1 : 0));

  useEffect(() => {
    if (!roto || movimientoReducido()) {
      rotura.setValue(roto ? 1 : 0);
      return;
    }
    rotura.setValue(0);
    const animacion = Animated.timing(rotura, { toValue: 1, duration: DURACION_ROTURA, easing: Easing.linear, useNativeDriver: NATIVO });
    animacion.start();
    return () => animacion.stop();
  }, [roto, rotura]);

  // Primer 20 %: salto y temblor con el corazón entero. Después se separan las mitades.
  const mitad = (lado: -1 | 1) => ({
    position: "absolute" as const,
    opacity: rotura.interpolate({ inputRange: [0, 0.2, 0.55, 1], outputRange: [1, 1, 1, 0] }),
    transform: [
      {
        translateX: rotura.interpolate({
          inputRange: [0, 0.05, 0.1, 0.15, 0.2, 1],
          outputRange: [0, 2, -2, 1, 0, 9 * lado],
        }),
      },
      {
        translateY: rotura.interpolate({
          // Cae acelerando (sin `easing`: el driver nativo no lo admite en interpolate).
          inputRange: [0, 0.08, 0.2, 0.6, 1],
          outputRange: [0, -6, 0, 6, 22],
        }),
      },
      { rotate: rotura.interpolate({ inputRange: [0, 0.2, 1], outputRange: ["0deg", "0deg", `${40 * lado}deg`] }) },
    ],
  });

  return (
    <View style={{ width: ANCHO_CORAZON, height: ALTO_CORAZON }}>
      {/* El hueco que queda (se ve solo cuando ya se cayeron las mitades). */}
      <View style={{ position: "absolute" }}>
        <PixelesCorazon color={`${c.tinta}26`} />
      </View>
      <Animated.View style={mitad(-1)}>
        <PixelesCorazon color={color} mitad="izquierda" />
      </Animated.View>
      <Animated.View style={mitad(1)}>
        <PixelesCorazon color={color} mitad="derecha" />
      </Animated.View>
    </View>
  );
});

/** Vidas en el modo IA: una fila de corazones; cada gol del otro rompe uno, de derecha a izquierda. */
function Corazones({
  quien,
  total,
  rotos,
  color,
  posicion,
}: {
  quien: string;
  total: number;
  rotos: number;
  color: string;
  posicion: { top: number } | { bottom: number };
}) {
  return (
    <View
      pointerEvents="none"
      style={[styles.corazones, posicion]}
      accessible
      accessibilityLabel={`${quien}: ${Math.max(0, total - rotos)} de ${total} corazones`}
    >
      {Array.from({ length: total }, (_, i) => (
        <Corazon key={i} roto={i >= total - rotos} color={color} />
      ))}
    </View>
  );
}

/** Cuánto se queda el cuadro después de la última frase, para leerla (ms). */
const DURACION_FRASE = 1500;
/** Cuánto espera el saque después de que Rubo termina de hablar (ms). */
const ESPERA_FRASE = 400;

/**
 * Cuadro de diálogo de Rubo en 8 bits: caja negra con borde blanco y letra pixelada. Rubo escribe cada
 * frase letra por letra con su voz (la música se corta; los puntos suspensivos van lentos y en
 * silencio). Si son varias, cada una se queda `PAUSA_ENTRE_FRASES` y la siguiente la reemplaza en la
 * misma caja. Al terminar la última entra la canción de la fase nueva (`fase`), el cuadro se queda un
 * momento y se va hacia arriba, achicándose, y luego avisa con `alSalir`.
 */
function Dialogo({
  frases,
  arriba,
  musica,
  fase,
  alSalir,
}: {
  frases: { texto: string; voz: number }[];
  arriba: number;
  musica: MusicaRubo;
  fase: Fase;
  alSalir: () => void;
}) {
  const [partes] = useState(() => frases.map((f) => letras(f.texto)));
  const reducido = movimientoReducido();
  const [actual, setActual] = useState(reducido ? partes.length - 1 : 0);
  const [escritas, setEscritas] = useState(reducido ? partes[partes.length - 1].length : 0);
  const [salida] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let espera: ReturnType<typeof setTimeout> | undefined;
    let animacion: Animated.CompositeAnimation | undefined;
    const salir = () => {
      musica.tocar(fase);
      espera = setTimeout(() => {
        if (reducido) return alSalir();
        animacion = Animated.timing(salida, {
          toValue: 1,
          duration: 260,
          easing: Easing.in(Easing.back(2)),
          useNativeDriver: NATIVO,
        });
        animacion.start(({ finished }) => finished && alSalir());
      }, DURACION_FRASE);
    };
    // Escribe la frase `f` letra por letra (cada una con su tiempo: ver `letras` en lib/dialogo.ts).
    const escribir = (f: number) => {
      setActual(f);
      setEscritas(0);
      musica.hablar(frases[f].voz);
      const siguiente = (n: number) => {
        espera = setTimeout(() => {
          setEscritas(n + 1);
          if (n + 1 < partes[f].length) siguiente(n + 1);
          else if (f + 1 < partes.length) espera = setTimeout(() => escribir(f + 1), PAUSA_ENTRE_FRASES);
          else salir();
        }, partes[f][n].ms);
      };
      siguiente(0);
    };
    if (reducido) salir();
    else escribir(0);
    return () => {
      clearTimeout(espera);
      animacion?.stop();
    };
    // Cada vez que Rubo habla se monta un cuadro nuevo (con su `key`): esto corre una sola vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const texto = partes[actual].map((l) => l.letra);
  // La caja toma el tamaño de la frase más larga desde el principio, para no cambiar al escribir.
  const larga = frases.reduce((a, f) => (f.texto.length > a.length ? f.texto : a), "");
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLabel={`Rubo: ${frases.map((f) => f.texto).join(" ")}`}
      style={[
        styles.dialogo,
        {
          top: arriba,
          opacity: salida.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateY: salida.interpolate({ inputRange: [0, 1], outputRange: [0, -24] }) },
            { scale: salida.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] }) },
          ],
        },
      ]}
    >
      <View style={styles.bloqueDialogo}>
        <Text style={[styles.textoDialogo, { color: "transparent" }]}>{`* ${larga}`}</Text>
        <Text style={[styles.textoDialogo, styles.textoEscrito]}>
          {"* "}
          {texto.slice(0, escritas).join("")}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * Final de la partida, sobre la cancha: "Ganaste" o "Perdiste" en grande con el marcador, y debajo una
 * rueda de "otra vez". Solo la rueda empieza otra partida (tocar el resto de la cancha no hace nada).
 */
function Final({
  ganaste,
  puntos,
  rojo,
  alReiniciar,
}: {
  ganaste: boolean;
  puntos: { jugador: number; maquina: number };
  rojo: boolean;
  alReiniciar: () => void;
}) {
  const c = useColores();
  const acento = rojo ? c.peligro : c.enfasis;
  const titulo = ganaste ? "Ganaste" : "Perdiste";
  const marcador = `${puntos.jugador} – ${puntos.maquina}`;
  return (
    <View style={[styles.capa, { backgroundColor: `${c.fondo}E6` }]}>
      <Entrada style={styles.final}>
        {/* Resultado brutalista: bloque de color plano, borde grueso, esquinas rectas y sombra dura
            corrida (sin difuminar), letras en mayúsculas muy apretadas. */}
        <View style={styles.anuncio}>
          <View>
            <View style={[styles.sombraDura, { backgroundColor: c.tinta }]} />
            <View style={[styles.bloque, { backgroundColor: ganaste ? c.enfasis : acento, borderColor: c.tinta }]}>
              <Text style={[styles.tituloFinal, { color: c.sobreEnfasis }]} accessibilityRole="header">
                {titulo.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={[styles.etiquetaMarcador, { backgroundColor: c.tinta }]}>
            <Text style={[styles.resultado, { color: c.fondo }]}>{marcador}</Text>
          </View>
        </View>
        <Presionable
          onPress={alReiniciar}
          accessibilityRole="button"
          accessibilityLabel={`${titulo}, ${marcador}. Jugar de nuevo`}
          hitSlop={12}
          style={({ pressed }) => [styles.rueda, { borderColor: acento, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="refresh" size={30} color={acento} />
        </Presionable>
      </Entrada>
    </View>
  );
}

/**
 * Pausa, sobre todo el juego: "PAUSA" en bloque brutalista y debajo Continuar, Reiniciar (partida
 * nueva) y Salir (al menú).
 */
function Pausa({ alContinuar, alReiniciar, alSalir }: { alContinuar: () => void; alReiniciar: () => void; alSalir: () => void }) {
  const c = useColores();
  return (
    <View style={[styles.capa, { backgroundColor: `${c.fondo}E6` }]}>
      <Entrada style={styles.final}>
        <View>
          <View style={[styles.sombraDura, { backgroundColor: c.tinta }]} />
          <View style={[styles.bloque, { backgroundColor: c.enfasis, borderColor: c.tinta }]}>
            <Text style={[styles.tituloFinal, { color: c.sobreEnfasis }]} accessibilityRole="header">
              PAUSA
            </Text>
          </View>
        </View>
        <View style={styles.botonesPausa}>
          <Boton texto="Continuar" alTocar={alContinuar} />
          <Boton texto="Reiniciar" alTocar={alReiniciar} secundario />
          <Boton texto="Salir" alTocar={alSalir} secundario />
        </View>
      </Entrada>
    </View>
  );
}

/** `deshabilitado`: se ve apagado y no hace nada. `secundario`: solo borde, sin relleno. */
function Boton({
  texto,
  alTocar,
  deshabilitado = false,
  secundario = false,
}: {
  texto: string;
  alTocar: () => void;
  deshabilitado?: boolean;
  secundario?: boolean;
}) {
  const c = useColores();
  return (
    <Presionable
      onPress={alTocar}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado }}
      style={({ pressed }) => [
        styles.boton,
        secundario
          ? { backgroundColor: "transparent", borderWidth: 2, borderColor: c.enfasis }
          : { backgroundColor: deshabilitado ? c.borde : c.enfasis },
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.textoBoton, { color: secundario ? c.enfasis : deshabilitado ? c.apagado : c.sobreEnfasis }]}>
        {texto}
      </Text>
    </Presionable>
  );
}

/** Lado de cada cuadro del fondo cuadriculado del menú. */
const CUADRO = 40;

/** Fondo cuadriculado del menú, como una hoja de cuaderno con líneas tenues. */
const Cuadricula = memo(function Cuadricula({ color }: { color: string }) {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="cuadricula" width={CUADRO} height={CUADRO} patternUnits="userSpaceOnUse">
          <Path d={`M ${CUADRO} 0 L 0 0 0 ${CUADRO}`} stroke={color} strokeWidth={1} fill="none" opacity={0.7} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#cuadricula)" />
    </Svg>
  );
});

const styles = StyleSheet.create({
  menu: {
    flex: 1,
    paddingVertical: espacio.xl,
    gap: espacio.l,
    justifyContent: "space-between",
  },
  menuCentro: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: espacio.l,
    paddingHorizontal: espacio.xl,
  },
  icono: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tituloMenu: { fontSize: 28, fontFamily: fuente.titulo, textAlign: "center" },
  textoMenu: { fontSize: 16, textAlign: "center", lineHeight: 23 },
  nota: { fontSize: 13, marginTop: espacio.m },
  menuBotones: { paddingHorizontal: espacio.l },
  botonPausa: { padding: espacio.xs },
  botonesPausa: { alignSelf: "stretch", gap: espacio.m, paddingHorizontal: espacio.xl, minWidth: 240 },
  juego: { flex: 1, paddingHorizontal: espacio.l },
  contenedorCancha: { alignSelf: "center" },
  calavera: { position: "absolute", right: espacio.l },
  marcadorArcade: {
    position: "absolute",
    left: espacio.l,
    right: espacio.l,
    height: ALTO_CORAZON,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textoArcade: { fontFamily: fuente.pixel, fontSize: 12 },
  corazones: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  corte: { position: "absolute", left: 0, right: 0 },
  // RuboKill: fondo casi negro con un tinte rojo, la foto lo más grande que quepa.
  rubokill: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    backgroundColor: "#120306",
    alignItems: "center",
    justifyContent: "center",
    padding: espacio.l,
  },
  bola: { position: "absolute", left: 0, top: 0 },
  barra: { position: "absolute", left: 0 },
  fotoRubokill: { width: "100%", height: "85%" },
  mitadCadena: { position: "absolute", top: 0, bottom: 0, overflow: "hidden" },
  centroCandado: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  cancha: { borderRadius: radio.m, borderWidth: 1, overflow: "hidden" },
  mitad: {
    position: "absolute",
    left: 0,
    right: 0,
    height: "50%",
    alignItems: "center",
    justifyContent: "center",
  },
  puntoGrande: { fontSize: 96, fontFamily: fuente.titulo },
  capa: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    padding: espacio.l,
  },
  final: { alignItems: "center", gap: espacio.xl },
  anuncio: { alignItems: "flex-start" },
  bloque: { borderWidth: 3, paddingHorizontal: espacio.l, paddingVertical: espacio.s },
  dialogo: { position: "absolute", left: espacio.l, right: espacio.l },
  // Caja de 8 bits: negra, borde blanco grueso y esquinas rectas (igual en modo claro y oscuro).
  bloqueDialogo: { backgroundColor: "#000000", borderColor: "#FFFFFF", borderWidth: 4, padding: espacio.m },
  textoDialogo: { color: "#FFFFFF", fontSize: 13, fontFamily: fuente.pixel, lineHeight: 22 },
  textoEscrito: { position: "absolute", top: espacio.m, left: espacio.m, right: espacio.m },
  sombraDura: { position: "absolute", left: 7, top: 7, right: -7, bottom: -7 },
  tituloFinal: { fontSize: 44, fontFamily: fuente.titulo, lineHeight: 50, letterSpacing: -1.5 },
  // El marcador cuelga pegado debajo del bloque, como una etiqueta.
  etiquetaMarcador: { marginTop: 10, marginLeft: espacio.l, paddingHorizontal: espacio.s, paddingVertical: 2 },
  rueda: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  resultado: { fontSize: 16, fontFamily: fuente.titulo, letterSpacing: 2 },
  boton: {
    minHeight: 52,
    borderRadius: radio.m,
    alignItems: "center",
    justifyContent: "center",
  },
  textoBoton: { fontSize: 16, fontWeight: "700" },
});
