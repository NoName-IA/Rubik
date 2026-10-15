# Rubik (app móvil)

App de React Native + Expo (SDK 57, Expo Router) para el día a día en Barranquilla y otras ciudades
de Colombia. Versión **1.3.0** (`app.json`). Qué hace cada pantalla, de dónde salen los datos y la
lógica propia: ver el [README principal](../README.md).

## Estilo visual

Tomado de `portfolio_web` (VSCODEX): fondo índigo liso `#0F0D29`, acento violeta `#A78BFA`
(`#7C3AED` en modo claro), títulos en **Space Grotesk** y texto en **Inter**, tarjetas con borde
violeta tenue y esquinas de 16. Modo claro y oscuro (o el del sistema), con contrastes de texto
≥ 4,5:1. Todo está en `src/theme.ts`; los textos usan `src/components/Texto.tsx`, que elige la
variante de Inter según el grosor.

- **Navbar** (`src/components/BarraLiquida.tsx`): una "gota" se desliza a la pestaña elegida
  estirándose (efecto líquido). Atrás vuelve a la pestaña anterior (`backBehavior="history"`).
- **Entradas**: los bloques de cada pantalla aparecen subiendo, escalonados, cada vez que se entra
  (`Entrada` en `src/components/Movimiento.tsx`). Los botones se encogen un poco al tocarlos
  (`Presionable`). Con "reducir movimiento" del sistema no hay animaciones.
- **Recuerda lo elegido** en cada pantalla (vista de Clima, filtro de Noticias, período y conversor
  del Dólar, nivel del Rubo) con `src/hooks/useRecordado.ts`, aunque se cierre la app.
- **Rubo** tiene su propio estilo: menú con fondo cuadriculado, cancha roja en el modo IA y
  resultado y diálogos brutalistas (bloque de color, borde grueso, sombra dura).

## Probarla en tu Android

1. Instala **Expo Go** desde la Play Store.
2. En el computador, desde la raíz del repositorio:
   - **Windows:** doble clic en `start-local.cmd`.
   - **Git Bash, Linux o macOS:** `./start-local.sh`

   (Equivale a `cd movil && npm install && npx expo start`.)
3. Abre Expo Go y escanea el código QR que aparece en la terminal. El celular y el computador
   deben estar en la **misma red Wi-Fi**. Si la red no lo permite (redes públicas o de
   empresa), usa `./start-local.sh --tunnel`.

Los cambios en el código se ven en el celular al guardar.

**Solo en desarrollo (Expo Go):** en el menú del Rubo, mantener presionado el ícono del control
alterna entre borrar el progreso (modo IA bloqueado, con cadenas) y desbloquearlo (con las cadenas
por romper). En el APK no hace nada.

## Compilar el APK

Con [EAS](https://docs.expo.dev/eas/) (`eas.json`), en la nube:

| Perfil | Resultado |
|---|---|
| `preview` | APK para instalar directo (distribución interna) |
| `production` | App bundle (`.aab`) para la Play Store |

```bash
npx eas-cli@latest build --platform android --profile preview
```

La versión (`version` y `android.versionCode`) se sube a mano en `app.json` antes de cada build.

## Estructura

```
src/
├── app/                      # rutas (Expo Router): cada archivo es una pantalla
│   ├── _layout.tsx           # raíz: fuentes, preferencias, bienvenida y pantallas apiladas
│   ├── (tabs)/               # navbar inferior: exactamente 4 pestañas
│   │   ├── index.tsx         # Inicio: resumen + carrusel de accesos rápidos
│   │   ├── clima.tsx         # Hoy · Lluvia · 7 días
│   │   ├── dolar.tsx         # TRM, evolución y conversor
│   │   └── usuario.tsx       # preferencias (y RuboKill cuando se desbloquea)
│   ├── noticias.tsx          # acceso rápido
│   ├── aire.tsx              # detalle de la calidad del aire
│   └── pong.tsx              # Rubo: menú, juego, cadenas, glitches, fases de la IA y RuboKill
├── components/               # Pantalla, Panel, Segmentos, Carrusel, Bienvenida, ListaCiudades, Estados…
│   ├── clima/ aire/ dolar/ noticias/
├── contexto/
│   ├── Preferencias.tsx      # preferencias guardadas en el celular
│   └── Ubicacion.tsx         # GPS con permiso; si no, la ciudad elegida
├── hooks/                    # datos con caché (React Query) y estado guardado
│   ├── usePronostico.ts useAire.ts useNoticias.ts useDolar.ts
│   ├── useAvisos.ts          # programa las notificaciones de lluvia, calor y aire limpio
│   ├── useRecordado.ts       # recuerda lo elegido en cada pantalla
│   └── useVictoriasRubo.ts   # victorias del Rubo (desbloqueo del modo IA)
├── lib/                      # lógica sin React (probada con node:test)
│   ├── clima/                # Open-Meteo, METAR, resumen, lluvia, respaldo sin señal, códigos WMO
│   ├── aire/                 # Open-Meteo Air Quality e ICA colombiano
│   ├── noticias/             # fuentes (RSS / JSON:API) y combinación sin repetidas
│   ├── ciudades.ts           # ciudades y sus municipios
│   ├── pong.ts               # física del Rubo y cómo juega la máquina en cada nivel y fase
│   ├── avisos.ts dolar.ts preferencias.ts ubicacion.ts http.ts …
│   └── accesos.ts            # ← para agregar un acceso rápido, se edita esta lista
└── theme.ts                  # colores claro/oscuro, fuentes y medidas
tests/                        # pruebas unitarias; tests/fixtures/ tiene respuestas reales grabadas
assets/                       # íconos (ver assets/README.md), logo en assets/marca/, foto de RuboKill
scripts/generar-iconos.py     # regenera los íconos desde el logo
```

### Agregar un acceso rápido

1. Una entrada en `src/lib/accesos.ts` (título, ícono y ruta).
2. Su pantalla en `src/app/`.

El navbar no cambia: siempre son 4 pestañas.

### Rendimiento del Rubo

El juego corre en un ciclo por cuadro (`requestAnimationFrame`), pero React casi no redibuja: la
bola y las barras son vistas que se mueven con `Animated.Value.setValue`, y la pantalla solo se
vuelve a dibujar cuando cambia el marcador o la fase (saque, jugando, fin). Las animaciones de
ambiente (glitches, cadenas, latidos, fondo rojo) usan el driver nativo y vistas simples, no SVG
animado.

## Comandos

| Comando | Para qué |
|---|---|
| `npx expo start` | Servidor de desarrollo (QR para Expo Go) |
| `npm test` | Pruebas unitarias |
| `npm run typecheck` | Revisión de tipos |
| `npm run lint` | Lint (`expo lint`) |
| `npx expo-doctor` | Revisa versiones y configuración de Expo |
| `npx expo install <paquete>` | Instala dependencias compatibles con el SDK (en vez de `npm install`) |
