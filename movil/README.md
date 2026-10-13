# Rubik (app móvil)

App de React Native + Expo (SDK 57) para el día a día en Barranquilla: clima, lluvia, calidad del
aire y noticias.

Clima tiene datos reales (Open-Meteo) de la ubicación del GPS, o de
Barranquilla si no se da permiso: **Hoy**, **Lluvia** (gráfica de 48 h) y **7 días**, con una frase
de resumen ("Lloverá entre 2 y 5 p. m."), **alerta de arroyos** y el último pronóstico guardado
para cuando no hay señal. La **calidad del aire** (ICA colombiano, PM2.5 y PM10 frente a la norma
y la OMS) va dentro de Clima y en el resumen de Inicio. **Noticias** (El Heraldo y Zona Cero, todas con foto;
filtro Barranquilla/Atlántico) se abre desde los accesos rápidos, y el titular más reciente
aparece en el resumen de Inicio. En **Usuario** se guardan el nombre del saludo, la ubicación (GPS o
una ciudad de la lista), la sensibilidad de la alerta de arroyos (solo en el área de Barranquilla), las
notificaciones de lluvia y arroyos (`src/lib/avisos.ts` + `src/hooks/useAvisos.ts`) y el tema. La pestaña
**Dólar** muestra la TRM oficial de hoy, su evolución y un conversor.

## Estilo visual

Copiado de `portfolio_web` (VSCODEX): fondo índigo `#0F0D29` (sin el degradado del portfolio) con un
solo cubo de Rubik grande en líneas tenues y una "lluvia" de caracteres de código, acento violeta `#A78BFA` (`#7C3AED` en modo claro), títulos en **Space Grotesk** y
texto en **Inter**, tarjetas con borde violeta y esquinas de 16. Todo está en `src/theme.ts`; los textos
usan `src/components/Texto.tsx`, que elige la variante de Inter según el grosor.

Navegación: el navbar (`src/components/BarraLiquida.tsx`) tiene una "gota" que se desliza a la pestaña
elegida estirándose (efecto líquido). Atrás vuelve a la pestaña anterior (`backBehavior="history"`), y
la app recuerda lo elegido en cada pantalla (vista de Clima, filtro de Noticias, período y conversor
del Dólar) con `src/hooks/useRecordado.ts`, aunque se cierre.

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

## Estructura

```
src/
├── app/                    # rutas (Expo Router): cada archivo es una pantalla
│   ├── _layout.tsx         # raíz: navbar + pantallas apiladas
│   ├── (tabs)/             # navbar inferior: exactamente 4 pestañas
│   │   ├── index.tsx       # Inicio: resumen + carrusel de accesos rápidos
│   │   ├── clima.tsx       # Hoy · Lluvia · 7 días
│   │   ├── dolar.tsx       # TRM, evolución y conversor
│   │   └── usuario.tsx     # preferencias
│   ├── noticias.tsx        # acceso rápido
│   └── aire.tsx            # detalle de la calidad del aire
├── components/             # Pantalla, Panel, Carrusel, Bienvenida, Estados, clima/…
├── contexto/Ubicacion.tsx  # GPS con permiso; si no, Barranquilla
├── hooks/usePronostico.ts  # pronóstico con caché (React Query, 15 min)
├── lib/                    # lógica sin React (probada con node:test)
│   ├── clima/              # modelo, proveedor Open-Meteo, códigos WMO, formatos
│   ├── ubicacion.ts        # nombre del lugar, redondeo de coordenadas
│   └── accesos.ts          # ← para agregar un acceso rápido, se edita esta lista
└── theme.ts                # colores claro/oscuro
tests/                      # pruebas unitarias
assets/                     # íconos (ver assets/README.md); originales del logo en assets/marca/
scripts/generar-iconos.py   # regenera los íconos desde el logo
```

## Comandos

| Comando | Para qué |
|---|---|
| `npx expo start` | Servidor de desarrollo (QR para Expo Go) |
| `npm test` | Pruebas unitarias |
| `npm run typecheck` | Revisión de tipos |
| `npx expo-doctor` | Revisa versiones y configuración de Expo |
| `npx expo install <paquete>` | Instala dependencias compatibles con el SDK (en vez de `npm install`) |
