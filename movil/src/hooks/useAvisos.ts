// Notificaciones locales de lluvia y arroyos: se reprograman cada vez que cambia el pronóstico o las
// preferencias, y suenan a su hora aunque la app esté cerrada. Funcionan en Expo Go (las push no).

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Platform } from "react-native";

import { usePreferencias } from "@/contexto/Preferencias";
import { usePronostico } from "@/hooks/usePronostico";
import { useUmbralArroyos } from "@/hooks/useUmbralArroyos";
import { type Aviso, planearAvisos } from "@/lib/avisos";

const CANAL = "avisos";
/** El permiso se pide solo una vez por sí solo; después, desde Usuario. */
const CLAVE_PEDIDO = "avisos:permisoPedido";
const disponible = Platform.OS !== "web";

if (disponible) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

async function prepararCanal() {
  // En Android 13+ el diálogo de permiso no aparece si no existe al menos un canal.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CANAL, { name: "Lluvia y arroyos", importance: Notifications.AndroidImportance.HIGH });
  }
}

async function hayPermiso(): Promise<boolean> {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain || (await AsyncStorage.getItem(CLAVE_PEDIDO))) return false;
  await AsyncStorage.setItem(CLAVE_PEDIDO, "1");
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function programar(avisos: Aviso[]) {
  // La app solo programa estos avisos: se borran todos y se vuelven a crear con el pronóstico nuevo.
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (avisos.length === 0) return;
  await prepararCanal();
  if (!(await hayPermiso())) return;
  for (const a of avisos) {
    await Notifications.scheduleNotificationAsync({
      identifier: a.id,
      content: { title: a.titulo, body: a.cuerpo, data: { ruta: a.ruta } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.fecha, channelId: CANAL },
    });
  }
}

/** Programa los avisos y abre la pantalla de la notificación que se toque. Se monta una vez. */
export function useAvisos() {
  const { data } = usePronostico();
  const umbral = useUmbralArroyos();
  const { lluvia, arroyos } = usePreferencias().preferencias.avisos;

  // `umbral` es un objeto nuevo en cada render: se compara por sus valores.
  const probabilidad = umbral?.probabilidad;
  const mm = umbral?.mm;

  useEffect(() => {
    if (!disponible || !data) return;
    const u = arroyos && probabilidad !== undefined && mm !== undefined ? { probabilidad, mm } : null;
    programar(planearAvisos(data, { lluvia, arroyos: u })).catch(() => {});
  }, [data, lluvia, arroyos, probabilidad, mm]);

  const respuesta = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!respuesta || respuesta.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    if (respuesta.notification.request.content.data?.ruta === "/clima") router.navigate("/clima");
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [respuesta]);
}

export type EstadoPermiso = "concedido" | "pendiente" | "denegado";

const aEstado = (p: Notifications.NotificationPermissionsStatus): EstadoPermiso =>
  p.granted ? "concedido" : p.canAskAgain ? "pendiente" : "denegado";

/** Estado del permiso de notificaciones, para Usuario; se actualiza al volver a la app. */
export function usePermisoAvisos() {
  const [estado, setEstado] = useState<EstadoPermiso | null>(null);

  useEffect(() => {
    if (!disponible) return;
    const leer = () => Notifications.getPermissionsAsync().then((p) => setEstado(aEstado(p)), () => {});
    leer();
    // Al volver de los ajustes del celular.
    const sub = AppState.addEventListener("change", (e) => e === "active" && leer());
    return () => sub.remove();
  }, []);

  /** Pide el permiso; si Android ya no deja pedirlo, abre los ajustes de la app. */
  const pedir = useCallback(async () => {
    if (estado === "denegado") return Linking.openSettings();
    await prepararCanal();
    setEstado(aEstado(await Notifications.requestPermissionsAsync()));
  }, [estado]);

  return { estado, pedir };
}
