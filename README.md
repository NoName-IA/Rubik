# Rubik

App Android (React Native + Expo) para el día a día en Barranquilla: lluvia hora por hora con
**alerta de arroyos**, calidad del aire con el índice colombiano, noticias locales y el **dólar**
(TRM oficial).

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
| **Clima** | **Hoy**, **Lluvia** (gráfica de 48 h) y **7 días**; frase de resumen ("Lloverá entre 2 y 5 p. m."), alerta de arroyos y calidad del aire |
| **Dólar** | TRM oficial de hoy, su evolución (30 días, 90 días, 1 año) y un conversor |
| **Usuario** | Nombre del saludo, ubicación (GPS o una ciudad de la lista), sensibilidad de la alerta de arroyos, notificaciones y tema |

**Noticias** (El Heraldo y Zona Cero, todas con foto; filtro Barranquilla/Atlántico) se abre desde
los accesos rápidos de Inicio.

## Fuentes de datos

La app consulta todo directamente desde el celular: no necesita servidor propio ni claves de API.

| Dato | Fuente |
|---|---|
| Pronóstico y lluvia | [Open-Meteo](https://open-meteo.com/en/docs) |
| Calidad del aire | [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) |
| Noticias | RSS de El Heraldo y JSON:API de Zona Cero |
| TRM | Superintendencia Financiera vía datos.gov.co ([32sa-8pi3](https://www.datos.gov.co/d/32sa-8pi3)) |

## Lógica propia

- **Alerta de arroyos** (solo en el área metropolitana de Barranquilla): una hora tiene riesgo si
  la probabilidad de lluvia es **≥ 60 %** y hay **≥ 5 mm/h o tormenta eléctrica** (códigos WMO
  95–99). Se contrastó con 93 días de datos horarios y 5 días con arroyos reportados por la prensa
  (31 ago., 1, 20, 21 y 22 sept. de 2026):

  | Regla | Días con alerta (de 93) | Días de prensa detectados |
  |---|---|---|
  | ≥ 60 % y ≥ 10 mm/h | 0 | 0 de 5 |
  | ≥ 60 % y ≥ 5 mm/h | 4 | 1 de 5 |
  | **≥ 60 % y (≥ 5 mm/h o tormenta)** | 19 | **5 de 5** |

  El modelo subestima los aguaceros (el 20 de septiembre marcó como máximo 1,3 mm/h), pero el
  código de tormenta sí aparece esos días. La regla es provisional: la muestra es pequeña y no mide
  falsas alarmas. En Usuario se puede hacer más o menos sensible.
- **Índice de calidad del aire (ICA)** con los puntos de corte de la Resolución 2254 de 2017 y
  comparación con la guía de la OMS.
- **Resumen en una frase** de las próximas 24 h: agrupa las horas seguidas con probabilidad ≥ 50 %
  y señala la más fuerte.
- **Notificaciones** (locales, sin servidor): cada vez que llega un pronóstico se programan avisos
  para las próximas 24 h, que suenan aunque la app esté cerrada. **Lluvia**: 30 min antes, solo
  entre 6 a. m. y 10 p. m. **Arroyos**: 1 h antes, a cualquier hora, y reemplaza al de lluvia de
  esas horas. Se activan o desactivan en Usuario; al tocar una se abre Clima.
- **Sin señal**: el último pronóstico, las noticias y la TRM se guardan en el celular y se muestran
  con la hora de los datos mientras se reintenta.

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

Estilo visual, estructura de carpetas y más comandos en [`movil/README.md`](movil/README.md).
