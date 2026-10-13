// Navbar inferior: exactamente 4 pestañas. Todo lo demás entra por los accesos rápidos de Inicio.
// La barra es BarraLiquida (efecto líquido al cambiar de pestaña, estilo de portfolio_web).

import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/tabs";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { BarraLiquida } from "@/components/BarraLiquida";

/** Ícono de pestaña: la activa lleva un brillo suave, como en portfolio_web. */
function IconoTab({
  activo,
  inactivo,
  focused,
  color,
}: {
  activo: ComponentProps<typeof Ionicons>["name"];
  inactivo: ComponentProps<typeof Ionicons>["name"];
  focused: boolean;
  color: ColorValue;
}) {
  return (
    <Ionicons
      name={focused ? activo : inactivo}
      size={24}
      color={color}
      style={focused ? { textShadowColor: color, textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } } : undefined}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      // Atrás vuelve a la pestaña donde estabas antes (no siempre a Inicio).
      backBehavior="history"
      tabBar={(props) => <BarraLiquida {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => <IconoTab activo="home" inactivo="home-outline" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clima"
        options={{
          title: "Clima",
          tabBarIcon: ({ color, focused }) => (
            <IconoTab activo="partly-sunny" inactivo="partly-sunny-outline" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dolar"
        options={{
          title: "Dólar",
          tabBarIcon: ({ color, focused }) => <IconoTab activo="cash" inactivo="cash-outline" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="usuario"
        options={{
          title: "Usuario",
          tabBarIcon: ({ color, focused }) => (
            <IconoTab activo="person-circle" inactivo="person-circle-outline" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
