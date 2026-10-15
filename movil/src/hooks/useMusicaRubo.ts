// Sonido del Rubo (expo-audio): en el modo IA, la canción de la fase (en bucle), la "voz" de 8 bits de
// Rubo mientras escribe y la estática de los glitches; en los dos modos, un golpe cuando la bola pega en
// una barra. Los goles no tienen sonido propio.

import { type AudioPlayer, useAudioPlayer } from "expo-audio";
import { useEffect, useMemo } from "react";
import { AppState } from "react-native";

import type { Fase } from "@/lib/pong";

const FASE_1 = require("../../assets/sonidos/fase-1.mp3");
/** Las fases 2 y 3 comparten canción: al pasar a la 3 sigue donde iba. */
const FASE_2_3 = require("../../assets/sonidos/fase-2-3.mp3");
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
const VOLUMEN_MUSICA = 0.7;
const VOLUMEN_VOZ = 0.6;
const VOLUMEN_GOLPE = 0.8;

export interface MusicaRubo {
  /**
   * Toca la canción de la fase y calla lo demás. Si es la misma canción que venía sonando (de la 2 a la
   * 3), sigue donde iba; con `desdeElPrincipio` (partida nueva) siempre empieza de cero.
   */
  tocar: (fase: Fase, desdeElPrincipio?: boolean) => void;
  /** Corta la música y suena una sola vez la voz `n` (1 a 4). */
  hablar: (n: number) => void;
  /** Silencio total. */
  parar: () => void;
  /** La bola pegó en una barra. */
  golpe: (barra: "jugador" | "maquina") => void;
  /** Una ráfaga de glitches; `volumen` de 0 a 1 (los glitches suaves casi no se oyen). */
  glitch: (volumen: number) => void;
}

export function useMusicaRubo(): MusicaRubo {
  const cancion1 = useAudioPlayer(FASE_1);
  const cancion23 = useAudioPlayer(FASE_2_3);
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

  const control = useMemo(() => {
    const canciones: Record<Fase, AudioPlayer> = { 1: cancion1, 2: cancion23, 3: cancion23, 4: cancion4 };
    const voces = [voz1, voz2, voz3, voz4];
    const golpes = { jugador: [jugadorA, jugadorB], maquina: [maquinaA, maquinaB] };
    const glitches = [glitchA, glitchB];
    // `sonando`: lo que debería estar sonando (para pausarlo al salir de la app y retomarlo al volver).
    // `cancion`: la última canción que sonó (para seguirla donde iba). `turno`: de los sonidos cortos.
    const ahora: { sonando: AudioPlayer | null; cancion: AudioPlayer | null; turno: number } = {
      sonando: null,
      cancion: null,
      turno: 0,
    };
    // Se pausan todos siempre: `playing` se actualiza con retraso y no sirve para saber qué suena.
    const callar = () => {
      for (const p of [cancion1, cancion23, cancion4, ...voces]) p.pause();
    };
    const efecto = (p: AudioPlayer, volumen: number) => {
      p.volume = Math.max(0, Math.min(1, volumen));
      p.seekTo(0).catch(() => {});
      p.play();
    };
    return {
      tocar: (fase: Fase, desdeElPrincipio = false) => {
        callar();
        const p = canciones[fase];
        p.loop = true;
        p.volume = VOLUMEN_MUSICA;
        if (desdeElPrincipio || p !== ahora.cancion) p.seekTo(0).catch(() => {});
        p.play();
        ahora.sonando = p;
        ahora.cancion = p;
      },
      hablar: (n: number) => {
        callar();
        const p = voces[Math.max(1, Math.min(voces.length, n)) - 1];
        p.loop = false;
        efecto(p, VOLUMEN_VOZ);
        ahora.sonando = null;
      },
      parar: () => {
        callar();
        ahora.sonando = null;
      },
      // Encima de la música (no la cortan).
      golpe: (barra: "jugador" | "maquina") => efecto(golpes[barra][ahora.turno++ % 2], VOLUMEN_GOLPE),
      glitch: (volumen: number) => efecto(glitches[ahora.turno++ % 2], volumen),
      pausar: callar,
      reanudar: () => ahora.sonando?.play(),
    };
  }, [cancion1, cancion23, cancion4, voz1, voz2, voz3, voz4, jugadorA, jugadorB, maquinaA, maquinaB, glitchA, glitchB]);

  // En segundo plano no suena nada; al volver sigue la canción donde iba.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (estado) => (estado === "active" ? control.reanudar() : control.pausar()));
    return () => {
      sub.remove();
      control.parar();
    };
  }, [control]);

  return control;
}
