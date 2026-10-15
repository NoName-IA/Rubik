// Sonido del Rubo (expo-audio): en el modo IA, la canción de la fase (en bucle), la "voz" de 8 bits de
// Rubo mientras escribe y la estática de los glitches; en los dos modos, un golpe cuando la bola pega en
// una barra. En el modo normal los goles suenan (uno alegre si anotas, uno triste si te anotan); en la IA
// no tienen sonido propio.

import { type AudioPlayer, useAudioPlayer } from "expo-audio";
import { useEffect, useLayoutEffect, useMemo } from "react";
import { AppState } from "react-native";

import type { Fase } from "@/lib/pong";

const FASE_1 = require("../../assets/sonidos/fase-1.mp3");
/**
 * Modo arcade: en cada partida empieza una de estas al azar y, cuando se acaba, sigue otra al azar
 * (nunca la misma dos veces seguidas). Se cargan de a una en el mismo reproductor, no todas a la vez.
 */
const CANCIONES_ARCADE = [
  require("../../assets/sonidos/arcade/choral-chambers.mp3"),
  require("../../assets/sonidos/arcade/city-of-tears.mp3"),
  require("../../assets/sonidos/arcade/dirtmouth.mp3"),
  require("../../assets/sonidos/arcade/kirby-return-to-dream-land.mp3"),
  require("../../assets/sonidos/arcade/zelda-hyrule-field.mp3"),
];
const FASE_2 = require("../../assets/sonidos/fase-2.mp3");
const FASE_3 = require("../../assets/sonidos/fase-3.mp3");
const FASE_4 = require("../../assets/sonidos/fase-4.mp3");
/**
 * La voz de cada frase (`voz` en FRASES_RUBO, src/lib/dialogo.ts): un bip por letra, en silencio en
 * los espacios y en los puntos suspensivos. Dura justo lo que tarda en escribirse y se calla sola. Ver
 * scripts/generar-voces.ts.
 */
const VOCES = [
  require("../../assets/sonidos/voz-1.wav"),
  require("../../assets/sonidos/voz-2.wav"),
  require("../../assets/sonidos/voz-3.wav"),
  require("../../assets/sonidos/voz-4.wav"),
];
const GOLPE_JUGADOR = require("../../assets/sonidos/golpe-jugador.wav");
const GOLPE_MAQUINA = require("../../assets/sonidos/golpe-maquina.wav");
const GLITCH = require("../../assets/sonidos/glitch.wav");
const GOL = require("../../assets/sonidos/gol.wav");
const PERDIDA = require("../../assets/sonidos/perdida.wav");
/** Volumen de cada canción: la de la fase 1 viene más bajita, así que va al máximo. */
const VOLUMEN_MUSICA: Record<Fase, number> = { 1: 1, 2: 0.7, 3: 0.7, 4: 1 };
/** La canción del arcade viene bajita: al máximo. */
const VOLUMEN_ARCADE = 1;
/** La última canción del arcade que sonó (en toda la sesión, para no repetirla en la partida siguiente). */
let ultimaArcade = -1;
const VOLUMEN_VOZ = 0.6;
// Los efectos (ondas cuadradas de 8 bits) suenan duros al lado de la música: van más bajos.
const VOLUMEN_GOLPE = 0.35;
const VOLUMEN_GOL = 0.4;
/** El volumen que pide cada ráfaga de glitches se multiplica por esto. */
const ESCALA_GLITCH = 0.6;

export interface MusicaRubo {
  /**
   * Toca la canción de la fase y calla lo demás. Si es la misma canción que venía sonando, sigue donde
   * iba; con `desdeElPrincipio` (partida nueva) siempre empieza de cero.
   */
  tocar: (fase: Fase, desdeElPrincipio?: boolean) => void;
  /** Una canción del arcade al azar (distinta de la anterior), desde el principio; al acabar, sigue otra. */
  tocarArcade: () => void;
  /** Corta la música y suena una sola vez la voz `n` (1 a 4). */
  hablar: (n: number) => void;
  /** Silencio total. */
  parar: () => void;
  /** Pausa del juego: calla todo; al quitarla sigue la canción donde iba. */
  pausa: (si: boolean) => void;
  /** La bola pegó en una barra. */
  golpe: (barra: "jugador" | "maquina") => void;
  /** Gol en el modo normal: `jugador` si anotas tú (alegre), `maquina` si te anotan (pérdida). */
  gol: (quien: "jugador" | "maquina") => void;
  /** Una ráfaga de glitches; `volumen` de 0 a 1 (los glitches suaves casi no se oyen). */
  glitch: (volumen: number) => void;
}

export function useMusicaRubo(): MusicaRubo {
  const cancion1 = useAudioPlayer(FASE_1);
  const cancionArcade = useAudioPlayer(CANCIONES_ARCADE[0]);
  const cancion2 = useAudioPlayer(FASE_2);
  const cancion3 = useAudioPlayer(FASE_3);
  const cancion4 = useAudioPlayer(FASE_4);
  const voz1 = useAudioPlayer(VOCES[0]);
  const voz2 = useAudioPlayer(VOCES[1]);
  const voz3 = useAudioPlayer(VOCES[2]);
  const voz4 = useAudioPlayer(VOCES[3]);
  // Dos reproductores por sonido corto, alternados: si se repite seguido, el segundo no corta al primero.
  const jugadorA = useAudioPlayer(GOLPE_JUGADOR);
  const jugadorB = useAudioPlayer(GOLPE_JUGADOR);
  const maquinaA = useAudioPlayer(GOLPE_MAQUINA);
  const maquinaB = useAudioPlayer(GOLPE_MAQUINA);
  const glitchA = useAudioPlayer(GLITCH);
  const glitchB = useAudioPlayer(GLITCH);
  const gol = useAudioPlayer(GOL);
  const perdida = useAudioPlayer(PERDIDA);

  const control = useMemo(() => {
    const canciones: Record<Fase, AudioPlayer> = { 1: cancion1, 2: cancion2, 3: cancion3, 4: cancion4 };
    const voces = [voz1, voz2, voz3, voz4];
    const golpes = { jugador: [jugadorA, jugadorB], maquina: [maquinaA, maquinaB] };
    const glitches = [glitchA, glitchB];
    // `sonando`: lo que debería estar sonando (para pausarlo al salir de la app y retomarlo al volver).
    // `cancion`: la última canción que sonó (para seguirla donde iba). `turno`: de los sonidos cortos.
    // `vivo`: los reproductores siguen existiendo (al salir del juego expo-audio los libera y desde ahí
    // cualquier orden a uno de ellos da error).
    // `enPausa`: el juego está en pausa; no suena nada y lo que se pida queda para cuando siga.
    const ahora: {
      sonando: AudioPlayer | null;
      cancion: AudioPlayer | null;
      turno: number;
      vivo: boolean;
      enPausa: boolean;
      /** Qué canción del arcade tiene cargada el reproductor (al crearse, la primera). */
      cargadaArcade: number;
    } = {
      sonando: null,
      cancion: null,
      turno: 0,
      vivo: true,
      enPausa: false,
      cargadaArcade: 0,
    };
    /** Da una orden a los reproductores solo si siguen vivos; si el sistema la rechaza, se ignora. */
    const seguro = (orden: () => void) => {
      if (!ahora.vivo) return;
      try {
        orden();
      } catch {
        /* reproductor ya liberado */
      }
    };
    // Se pausan todos siempre: `playing` se actualiza con retraso y no sirve para saber qué suena.
    const callar = () =>
      seguro(() => {
        for (const p of [cancion1, cancion2, cancion3, cancion4, cancionArcade, ...voces]) p.pause();
      });
    const efecto = (p: AudioPlayer, volumen: number) =>
      !ahora.enPausa &&
      seguro(() => {
        p.volume = Math.max(0, Math.min(1, volumen));
        p.seekTo(0).catch(() => {});
        p.play();
      });
    /** `recienCambiada`: se le acaba de cambiar la canción (`replace`) y hay que esperar a que cargue. */
    const cancion = (p: AudioPlayer, volumen: number, desdeElPrincipio: boolean, recienCambiada = false) => {
      callar();
      seguro(() => {
        // Las de las fases se repiten; las del arcade no: al terminar pasa a otra (ver `siguienteArcade`).
        p.loop = p !== cancionArcade;
        p.volume = volumen;
        if (desdeElPrincipio || p !== ahora.cancion) p.seekTo(0).catch(() => {});
        if (!ahora.enPausa) p.play();
        ahora.sonando = p;
        ahora.cancion = p;
        // Si todavía no termina de cargar (en Expo Go las canciones bajan del computador y la del arcade
        // pesa 10 MB), la orden de tocar se puede perder: se repite apenas cargue, si sigue siendo la que toca.
        if (!p.isLoaded || recienCambiada) {
          const sub = p.addListener("playbackStatusUpdate", (estado) => {
            if (!estado.isLoaded) return;
            sub.remove();
            if (ahora.sonando === p && !estado.playing && !ahora.enPausa) seguro(() => p.play());
          });
        }
      });
    };
    const tocarArcade = () => {
      const otras = CANCIONES_ARCADE.map((_, i) => i).filter((i) => i !== ultimaArcade);
      const n = otras[Math.floor(Math.random() * otras.length)];
      ultimaArcade = n;
      // Si el reproductor ya tiene cargada esa, no hace falta cambiarla.
      const cambia = n !== ahora.cargadaArcade;
      ahora.cargadaArcade = n;
      if (cambia) seguro(() => cancionArcade.replace(CANCIONES_ARCADE[n]));
      cancion(cancionArcade, VOLUMEN_ARCADE, true, cambia);
    };
    return {
      tocar: (fase: Fase, desdeElPrincipio = false) => cancion(canciones[fase], VOLUMEN_MUSICA[fase], desdeElPrincipio),
      tocarArcade,
      /** Terminó la canción del arcade: si sigue siendo la que toca, pasa a otra al azar. */
      siguienteArcade: () => {
        if (ahora.vivo && ahora.sonando === cancionArcade) tocarArcade();
      },
      hablar: (n: number) => {
        callar();
        const p = voces[Math.max(1, Math.min(voces.length, n)) - 1];
        seguro(() => {
          p.loop = false;
        });
        efecto(p, VOLUMEN_VOZ);
        ahora.sonando = null;
      },
      parar: () => {
        callar();
        ahora.sonando = null;
      },
      // Encima de la música (no la cortan).
      golpe: (barra: "jugador" | "maquina") => efecto(golpes[barra][ahora.turno++ % 2], VOLUMEN_GOLPE),
      glitch: (volumen: number) => efecto(glitches[ahora.turno++ % 2], volumen * ESCALA_GLITCH),
      gol: (quien: "jugador" | "maquina") => efecto(quien === "jugador" ? gol : perdida, VOLUMEN_GOL),
      pausar: callar,
      reanudar: () => !ahora.enPausa && seguro(() => ahora.sonando?.play()),
      pausa: (si: boolean) => {
        if (si === ahora.enPausa) return;
        if (si) callar();
        ahora.enPausa = si;
        if (!si) seguro(() => ahora.sonando?.play());
      },
      encender: () => {
        ahora.vivo = true;
      },
      /** Al salir del juego: calla todo y desde ahí no da más órdenes. */
      apagar: () => {
        callar();
        ahora.sonando = null;
        ahora.vivo = false;
      },
    };
  }, [
    cancion1,
    cancionArcade,
    cancion2,
    cancion3,
    cancion4,
    voz1,
    voz2,
    voz3,
    voz4,
    jugadorA,
    jugadorB,
    maquinaA,
    maquinaB,
    glitchA,
    glitchB,
    gol,
    perdida,
  ]);

  // Arcade: cuando una canción se acaba, suena otra al azar (distinta).
  useEffect(() => {
    const sub = cancionArcade.addListener("playbackStatusUpdate", (estado) => {
      if (estado.didJustFinish) control.siguienteArcade();
    });
    return () => sub.remove();
  }, [cancionArcade, control]);

  // En segundo plano no suena nada; al volver sigue la canción donde iba.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (estado) => (estado === "active" ? control.reanudar() : control.pausar()));
    return () => sub.remove();
  }, [control]);

  // Al salir del juego todo se calla antes de que expo-audio libere los reproductores: la limpieza de un
  // useLayoutEffect corre antes que la de los useEffect (donde se liberan).
  // (Se vuelve a encender al montar: en desarrollo React monta, desmonta y vuelve a montar para probar.)
  useLayoutEffect(() => {
    control.encender();
    return () => control.apagar();
  }, [control]);

  return control;
}
