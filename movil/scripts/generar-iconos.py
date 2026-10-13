"""Genera los íconos de la app a partir de assets/marca/logo-transparente.png.

Uso (desde movil/, con Pillow instalado: pip install pillow):
    python scripts/generar-iconos.py assets      # Windows
    python3 scripts/generar-iconos.py assets     # Linux/Mac
"""

import sys

from PIL import Image, ImageDraw

NEGRO = (0, 0, 0, 255)
TRANSPARENTE = (0, 0, 0, 0)
GENERADOS = [
    "icon",
    "android-icon-foreground",
    "android-icon-background",
    "android-icon-monochrome",
    "splash-icon",
    "favicon",
]


def cargar_logo(base: str) -> Image.Image:
    logo = Image.open(f"{base}/marca/logo-transparente.png").convert("RGBA")
    # Recorte al contenido (ignora píxeles casi transparentes del borde).
    alfa = logo.getchannel("A").point(lambda v: 255 if v > 32 else 0)
    return logo.crop(alfa.getbbox())


def lienzo(logo: Image.Image, tam: int, fondo, fraccion: float) -> Image.Image:
    """Logo centrado ocupando `fraccion` del lado, sobre `fondo` (None = transparente)."""
    im = Image.new("RGBA", (tam, tam), fondo or TRANSPARENTE)
    lado = round(tam * fraccion)
    copia = logo.copy()
    copia.thumbnail((lado, lado), Image.LANCZOS)
    im.alpha_composite(copia, ((tam - copia.width) // 2, (tam - copia.height) // 2))
    return im


def esquinas_curvas(im: Image.Image, fraccion: float = 0.225) -> Image.Image:
    """Recorta las esquinas en curva (radio = `fraccion` del lado); fuera queda transparente."""
    mascara = Image.new("L", im.size, 0)
    lado = im.width
    caja = (0, 0, lado - 1, lado - 1)
    ImageDraw.Draw(mascara).rounded_rectangle(caja, radius=round(lado * fraccion), fill=255)
    out = Image.new("RGBA", im.size, TRANSPARENTE)
    out.paste(im, (0, 0), mascara)
    return out


def silueta(im: Image.Image) -> Image.Image:
    """Silueta blanca de las piezas de color.

    Los bordes del logo son negros opacos, así que la silueta sale de lo claro, no del alfa.
    """
    r, g, b, a = im.split()
    brillo = Image.merge("RGB", (r, g, b)).convert("L")
    piezas = Image.composite(
        brillo.point(lambda v: 255 if v > 60 else 0),
        Image.new("L", im.size, 0),
        a.point(lambda v: 255 if v > 128 else 0),
    )
    blanco = Image.new("RGBA", im.size, (255, 255, 255, 255))
    blanco.putalpha(piezas)
    return blanco


def main(base: str) -> None:
    logo = cargar_logo(base)
    # Ícono general: logo al 72 % sobre negro, con las esquinas curvas.
    esquinas_curvas(lienzo(logo, 1024, NEGRO, 0.72)).save(f"{base}/icon.png", optimize=True)
    # Ícono adaptable de Android: debe caber en la zona segura (círculo de 66/108); se usa 52 %.
    frente = lienzo(logo, 1024, None, 0.52)
    frente.save(f"{base}/android-icon-foreground.png", optimize=True)
    Image.new("RGB", (1024, 1024), NEGRO[:3]).save(f"{base}/android-icon-background.png")
    # Monocromático (íconos temáticos de Android 13+).
    silueta(frente).save(f"{base}/android-icon-monochrome.png", optimize=True)
    # Pantalla de carga y favicon.
    lienzo(logo, 1024, None, 0.70).save(f"{base}/splash-icon.png", optimize=True)
    lienzo(logo, 48, NEGRO, 0.86).convert("RGB").save(f"{base}/favicon.png", optimize=True)
    for n in GENERADOS:
        im = Image.open(f"{base}/{n}.png")
        print(f"{n}.png", im.size, im.mode)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "assets")
