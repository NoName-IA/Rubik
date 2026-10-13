# Íconos e imágenes

```
assets/
├── marca/                         # originales del logo (no los usa la app directamente)
│   ├── logo-transparente.png      # 1254×1254, fondo transparente: base de todos los íconos
│   ├── logo-fondo-blanco.png      # 1254×1254, versión con fondo blanco
│   └── logo.ico                   # 256×256 para Windows
├── icon.png                       # 1024×1024, logo al 78 % sobre negro (ícono general)
├── android-icon-foreground.png    # 1024×1024 transparente, logo al 52 % (zona segura del ícono adaptable)
├── android-icon-background.png    # 1024×1024 negro
├── android-icon-monochrome.png    # silueta blanca para los íconos temáticos de Android 13+
├── splash-icon.png                # logo al 70 % para la pantalla de carga (sobre negro)
└── favicon.png                    # 48×48 para la versión web
```

Todos salen de `marca/logo-transparente.png` con `scripts/generar-iconos.py`. Si cambia el logo,
se reemplaza ese archivo y se vuelve a correr el script.

En **Expo Go** se ve el ícono de Expo Go, no el de la app: estos íconos aparecen cuando se compila
la app (EAS). Para la pantalla de carga, al compilar hay que instalar `expo-splash-screen` y
agregar en `app.json`:

```json
["expo-splash-screen", { "image": "./assets/splash-icon.png", "imageWidth": 200, "backgroundColor": "#000000" }]
```
