# Rubik

App Android (React Native + Expo) para el día a día en Barranquilla y otras ciudades de Colombia:
lluvia hora por hora, calidad del aire con el índice colombiano, noticias locales, el **dólar**
(TRM oficial) y **Rubo**, un Pong contra la máquina.

```
Rubik/
├── movil/            # la app (Expo) — ver movil/README.md
├── backend/          # reservado para un backend propio; hoy vacío
└── start-local.*     # arranca la app con un código QR para Expo Go
```

## Qué hace

| Pestaña | Qué muestra |
|---|---|
| **Inicio** | Resumen del día (clima, lluvia, aire, último titular) y carrusel de accesos rápidos |
| **Clima** | **Hoy**, **Lluvia** (gráfica de 48 h) y **7 días**; frase de resumen ("Hoy podría llover entre 2 y 5 p. m.") y calidad del aire |
| **Dólar** | TRM oficial de hoy, su evolución (30 días, 90 días, 1 año) y un conversor |
| **Usuario** | Nombre del saludo, ubicación (GPS o ciudad y municipio), permiso de notificaciones, tema y, cuando se desbloquea, **RuboKill** |

Desde los accesos rápidos de Inicio se abren:

- **Noticias** locales según la ubicación, sin repetidas. En el área de Barranquilla: El Heraldo y
  Zona Cero, todas con foto, con filtro Barranquilla/Atlántico. En otro lugar: Bing Noticias y Google
  Noticias del municipio y del departamento (p. ej. Tocancipá/Cundinamarca); a las que llegan sin
  foto se les busca la de su artículo.
- **Rubo**: Pong contra la máquina (ver más abajo).

### Ubicación

Con permiso, la app usa el GPS. Sin él, se elige primero la **ciudad** y luego el **municipio** de
su área: 13 ciudades (Barranquilla, Cartagena, Santa Marta, Bogotá, Medellín, Cali…) con sus
municipios cercanos (Soledad, Turbaco, Ciénaga, Soacha, Tocancipá, Bello, Floridablanca…).

### Rubo

Pong vertical: tu barra abajo (la mueves con el dedo), la de la máquina arriba. Gana quien llegue
primero a **3** (en la IA, tú necesitas **7** y Rubo **3**). Al terminar se ve el resultado y una rueda para jugar de nuevo.
Durante la partida, arriba a la izquierda va el botón de **pausa** (también "atrás" del celular, o
salir de la app): congela el juego y la música y muestra **Continuar**, **Reiniciar** (partida nueva) y **Salir**
(al menú).

- **Normal**: la máquina falla de vez en cuando.
- **Arcade**: se puede elegir, pero el botón Jugar no funciona hasta que entres a jugar el modo IA
  por primera vez (aunque pierdas). Es infinito, nadie gana. La cancha es el interior de una cueva
  low-poly al estilo de Geometry Dash, con los colores de la app (roca índigo facetada con un filo de
  luz violeta, estalactitas, rayos de luz, cristales violeta y fucsia, motas flotando); detrás, en
  toda la pantalla, otra cueva igual pero solo en líneas, sin color (`lib/cueva.ts`). Cada gol tuyo sube el nivel (arriba, en letra de 8 bits, el
  nivel y tu récord): la máquina se mueve más rápido, falla menos y la bola corre más, hasta el nivel
  16, donde todavía falla de vez en cuando. En cada partida suena en bucle una canción al azar de `assets/sonidos/arcade/` (nunca la misma dos veces seguidas) y se guarda tu récord de
  goles en una partida. Los goles suenan como en normal.
- **IA**: empieza **encadenado**. Se desbloquea al ganar 2 veces en normal; entonces las cadenas
  vibran y al tocarlas se rompen. Rubo tiene **7 corazones** de 8 bits arriba de la cancha (negros
  cuando el fondo se pone rojo) y tú **3** abajo: cada gol rompe uno del otro (salta, tiembla, se
  parte y las mitades caen). Rubo tiene cuatro fases según tus goles:
  1. **0 y 1 gol**: juega como en normal.
  2. **Desde el 2.º gol**: "¿Crees que puedes ganarme? -ja". Le dolió el golpe (su barra queda
     herida) y juega mejor, pero todavía se le hacen goles.
  3. **Desde el 4.º gol**: "¡¡Sal de aquí!!". Se pone durísimo: casi siempre ataca lejos de tu barra
     y la bola se acelera, pero a veces se descuida. El fondo se tiñe de rojo y todo late con él.
  4. **Con el 6.º gol** (le queda un corazón): "¿Así que así será?.." y, 2 segundos después,
     "Bueno...". Se vuelve **invencible**: no falla nunca y el último corazón no se rompe.

  Cada gol de la máquina hace fallar la pantalla (glitches), un poco más con cada uno hasta el
  tercero.

  **Música**: una canción para la fase 1, otra para la 2 y otra para las fases 3 y 4 (al pasar a la 4
  sigue donde iba). Cuando Rubo habla, la música se corta y aparece un cuadro de diálogo en 8 bits
  (letra pixelada) que Rubo escribe letra por letra con su "voz": un bip por letra, callado en los
  espacios y en los puntos suspensivos, que se escriben despacio (al menos 1 segundo de silencio).
  Al terminar de escribir entra la canción de la fase nueva. Al terminar la partida se calla.
- **Golpe**: en los dos modos, cada vez que la bola pega en una barra suena un bip 8-bit (agudo en la
  tuya, grave en la de Rubo).
- **Goles en normal**: si anotas suenan cuatro notas que suben; si te anotan, un sonido de pérdida
  (notas que bajan y la última se arrastra). En la IA los goles no tienen sonido propio.
- **Glitches**: cada ráfaga suena con estática digital entrecortada; fuerte con RuboKill y casi
  inaudible sin él (sube un poco con cada gol, como la falla).
- **RuboKill** (en Usuario, apagado por defecto; solo aparece con la IA desbloqueada): en la IA la
  bola va al doble de velocidad, los glitches son fuertes y, al perder, la pantalla se pone negra y
  aparece Rubo. No cambia el modo normal.

## Fuentes de datos

La app consulta todo directamente desde el celular: no necesita servidor propio ni claves de API.

| Dato | Fuente |
|---|---|
| Pronóstico y lluvia | [Open-Meteo](https://open-meteo.com/en/docs) |
| Lluvia observada ahora | METAR del aeropuerto más cercano ([aviationweather.gov](https://aviationweather.gov/data/api/)) |
| Calidad del aire | [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) |
| Noticias | RSS de El Heraldo, Google Noticias y Bing Noticias; JSON:API de Zona Cero |
| TRM | Superintendencia Financiera vía datos.gov.co ([32sa-8pi3](https://www.datos.gov.co/d/32sa-8pi3)) |

## Lógica propia

- **Lo que pasa ahora manda sobre el pronóstico**: cerca de un aeropuerto (a 15 km o menos), su
  reporte METAR de la última hora y media corrige la frase de la hora en curso. Comparado con las
  estaciones del IDEAM de Barranquilla y Soledad (sept.–oct. 2026), cuando el pronóstico anunciaba
  lluvia llovió el 13 % de las veces si el aeropuerto estaba seco y el 40 % si reportaba lluvia.
- **Índice de calidad del aire (ICA)** con los puntos de corte de la Resolución 2254 de 2017 y
  comparación con la guía de la OMS.
- **Resumen en una frase** de hoy y mañana: agrupa las horas seguidas con probabilidad ≥ 50 % y al
  menos 0,2 mm, y dice si es lluvia, llovizna o tormenta eléctrica. Se contrastó con 10 estaciones
  automáticas del IDEAM en el Atlántico: sin exigir milímetros se anunciaba lluvia casi 3 veces más
  de lo que llovía; con 0,2 mm, 1,3 veces. Como los aguaceros son muy locales, dice "podría".
- **Notificaciones** (locales, sin servidor): cada vez que llega un pronóstico se programan avisos
  para las próximas 24 h, que suenan aunque la app esté cerrada. **Lluvia**: 30 min antes, solo
  entre 6 a. m. y 10 p. m. **Mucho calor**: 1 h antes de que la sensación térmica llegue a 42°,
  uno por día y nunca antes de las 7 a. m. **Aire limpio**: a las 7 a. m. de los días en que todas
  las horas de la calle tienen aire "Bueno". Solo dependen del permiso del celular (se da desde
  Usuario); al tocar una se abre Clima o la calidad del aire. En Expo Go para Android no funcionan.
- **Sin señal**: el último pronóstico, la calidad del aire, las noticias y la TRM se guardan en el
  celular y se muestran con la hora de los datos mientras se reintenta.
- **Noticias sin repetidas**: se unen las fuentes y se quitan las notas que cuentan lo mismo
  comparando las palabras de los titulares.
- **Fotos de las noticias**: Google Noticias no trae foto y sus enlaces son redirecciones. La app le
  pide a Google el enlace real del medio y lee la foto de portada del artículo (`og:image`); igual
  con las de Bing que llegan sin foto. Se buscan de a 4 y se guardan en el celular. Al tocar la nota
  se abre directo el medio.
- **Rubo**: la física (rebotes, aceleración, cómo juega la máquina en cada nivel y fase) se simula
  en pasos cortos para que la bola nunca atraviese una barra; las pruebas juegan partidas completas
  para comprobar que en normal la máquina falla y que a la IA se le meten 6 goles (en la fase 3
  devuelve muchas más bolas que en normal) pero nunca el 7.º.

Todo esto son funciones puras en `movil/src/lib/`, probadas con respuestas reales grabadas de cada
fuente (`movil/tests/fixtures/`).

## Probarla en tu Android

Requisito: Node 22.12+.

1. Instala **Expo Go** desde la Play Store.
2. Arranca el proyecto:
   - **Windows:** doble clic en `start-local.cmd`.
   - **Git Bash, Linux o macOS:** `./start-local.sh`
3. Escanea con Expo Go el código QR que aparece en la terminal. El celular y el computador
   deben estar en la **misma red Wi-Fi**; si no conecta, usa `./start-local.sh --tunnel`.

La primera vez instala las dependencias (~2 minutos). Los cambios en el código se ven en el
celular al guardar. Ctrl+C detiene el servidor.

## Desarrollo

Desde `movil/`:

| Comando | Para qué |
|---|---|
| `npm test` | Pruebas unitarias |
| `npm run typecheck` | Revisión de tipos |
| `npm run lint` | Lint |

Estilo visual, estructura de carpetas, cómo compilar el APK y más comandos en
[`movil/README.md`](movil/README.md).

## Licencia

Copyright (C) 2026 Brandon Alvis

Este proyecto es software libre bajo la [GNU General Public License v3.0](LICENSE) (GPL-3.0-or-later).

En resumen:

- Puedes usar, copiar, estudiar y modificar el código, incluso con fines comerciales.
- Si distribuyes este proyecto o una versión modificada (por ejemplo, publicando el código o una app compilada), debes hacerlo **bajo esta misma licencia** y **con el código fuente disponible**. Es decir, los derivados también tienen que ser open source.
- Debes conservar el aviso de copyright y la licencia, e indicar los cambios que hiciste.
- El software se entrega "tal cual", sin garantía.

Este resumen es solo orientativo; el texto legal válido es el del archivo [`LICENSE`](LICENSE).

Las canciones de `movil/assets/sonidos/` (`fase-*.mp3` y las de `arcade/`) no son parte de este proyecto ni de su licencia:
pertenecen a sus autores. La voz de Rubo, los golpes y la estática (`voz-*.wav`, `golpe-*.wav`, `glitch.wav`, `gol.wav`, `perdida.wav`) sí son propios:
los generan `movil/scripts/generar-voces.ts` y `movil/scripts/generar-sonidos.py`.
