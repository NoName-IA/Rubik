// Raíz: proveedores de datos y ubicación, bienvenida del primer arranque, y la navegación
// (navbar + pantallas que se abren desde los accesos rápidos).

import { PressStart2P_400Regular } from "@expo-google-fonts/press-start-2p";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { SpaceGrotesk_300Light, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, Platform, View } from "react-native";

import { Bienvenida } from "@/components/Bienvenida";
import { ProveedorPreferencias, usePreferencias } from "@/contexto/Preferencias";
import { ProveedorUbicacion, useUbicacion } from "@/contexto/Ubicacion";
import { useAvisos } from "@/hooks/useAvisos";
import { fuente, useColores, useOscuro } from "@/theme";

// Al volver a la app se actualiza lo que esté viejo (React Query no lo detecta solo en móvil).
function useRecargaAlVolver() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", (estado) => focusManager.setFocused(estado === "active"));
    return () => sub.remove();
  }, []);
}

function Navegacion() {
  const c = useColores();
  const { lista, bienvenidaVista } = useUbicacion();
  const { lista: preferenciasListas } = usePreferencias();

  const [fuentesListas, errorFuentes] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_300Light,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    PressStart2P_400Regular,
  });

  // Si las fuentes fallan se sigue con las del sistema (no se bloquea la app).
  if (!lista || !preferenciasListas || (!fuentesListas && !errorFuentes)) return <View style={{ flex: 1, backgroundColor: c.fondo }} />;
  if (!bienvenidaVista) return <Bienvenida />;

  return (
    <>
      <Avisos />
      <Stack
        screenOptions={{
          headerBackTitle: "Atrás",
          headerStyle: { backgroundColor: c.fondo },
          headerShadowVisible: false,
          headerTintColor: c.enfasis,
          headerTitleStyle: { fontFamily: fuente.titulo, color: c.tinta, fontSize: 20 },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="noticias" options={{ title: "Noticias" }} />
        <Stack.Screen name="aire" options={{ title: "Calidad del aire" }} />
        {/* Encabezado transparente: el fondo cuadriculado del Rubo llega hasta arriba de la pantalla. */}
        <Stack.Screen name="pong" options={{
            title: "Rubo",
            gestureEnabled: false,
            headerTransparent: true,
            headerStyle: { backgroundColor: "transparent" },
          }} />
      </Stack>
    </>
  );
}

/** Notificaciones de lluvia, calor y aire limpio (después de la bienvenida, para no pedir permisos antes). */
function Avisos() {
  useAvisos();
  return null;
}

export default function RootLayout() {
  const [clienteDatos] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 2 } } }));
  useRecargaAlVolver();

  return (
    <QueryClientProvider client={clienteDatos}>
      <ProveedorPreferencias>
        <ProveedorUbicacion>
          <Tema />
        </ProveedorUbicacion>
      </ProveedorPreferencias>
    </QueryClientProvider>
  );
}

/** Tema de la navegación y barra de estado según la preferencia (sistema, claro u oscuro). */
function Tema() {
  const oscuro = useOscuro();
  const c = useColores();
  const base = oscuro ? DarkTheme : DefaultTheme;
  const tema = {
    ...base,
    colors: { ...base.colors, primary: c.enfasis, background: c.fondo, card: c.superficie, text: c.tinta, border: c.borde },
  };

  return (
    <ThemeProvider value={tema}>
      <StatusBar style={oscuro ? "light" : "dark"} />
      <Navegacion />
    </ThemeProvider>
  );
}
