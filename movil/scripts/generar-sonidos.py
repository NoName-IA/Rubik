"""Genera los efectos de 8 bits del Rubo (onda cuadrada, sin derechos de terceros).

    python scripts/generar-sonidos.py

- golpe-jugador.wav / golpe-maquina.wav: la bola pega en tu barra (agudo) o en la de Rubo (grave).
- glitch.wav: estática digital entrecortada, del largo de una ráfaga de la falla (DURACION_FALLA, 320 ms).

La voz de Rubo (voz-N.wav) la genera scripts/generar-voces.ts, con los tiempos del texto.
"""

import random
import struct
import wave
from pathlib import Path

FS = 22050
DESTINO = Path(__file__).resolve().parent.parent / "assets" / "sonidos"


def cuadrada(f: float, i: int) -> int:
    return 1 if (i * f / FS) % 1 < 0.5 else -1


def guardar(nombre: str, muestras: list[float]) -> None:
    with wave.open(str(DESTINO / nombre), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(FS)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, m)) * 32767)) for m in muestras))


def golpe(f: float) -> list[float]:
    """Bip corto que baja un poco de tono, como el Pong de siempre."""
    n = int(0.07 * FS)
    fase = 0.0
    muestras = []
    for i in range(n):
        fase += f * (1 - 0.25 * i / n) / FS
        env = min(1, i / 30) * (1 - i / n) ** 1.5
        muestras.append((1 if fase % 1 < 0.5 else -1) * env * 0.6)
    return muestras


def glitch() -> list[float]:
    """Ruido de pocos bits en trozos de 10-40 ms que se cortan y repiten, con zumbidos cuadrados."""
    azar = random.Random(7)
    total = int(0.32 * FS)
    muestras: list[float] = []
    while len(muestras) < total:
        largo = int(azar.uniform(0.01, 0.04) * FS)
        tipo = azar.random()
        f = azar.choice([90, 140, 880, 1760, 2400])
        retenida, cada = 0.0, azar.choice([4, 8, 16, 32])  # "bitcrush": repite cada muestra varias veces
        for i in range(largo):
            if tipo < 0.15:
                v = 0.0  # corte en seco
            elif tipo < 0.55:
                if i % cada == 0:
                    retenida = azar.choice([-1, -0.5, 0.5, 1])
                v = retenida
            else:
                v = cuadrada(f, i) * (0.5 + 0.5 * cuadrada(37, i))
            muestras.append(v * 0.5)
    muestras = muestras[:total]
    for i in range(200):  # sin chasquidos al final
        muestras[-1 - i] *= i / 200
    return muestras


if __name__ == "__main__":
    guardar("golpe-jugador.wav", golpe(523))
    guardar("golpe-maquina.wav", golpe(330))
    guardar("glitch.wav", glitch())
