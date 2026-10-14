// Notificaciones locales de lluvia, arroyos, mucho calor y aire limpio: se reprograman cada vez que cambia el pronóstico o las
// preferencias, y suenan a su hora aunque la app esté cerrada. En Expo Go Android quedan apagados:
// desde el SDK 53 importar expo-notifications ahí lanza un error (pide un development build).

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type * as N from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Platform } from "react-native";

import { useAire } from "@/hooks/useAire";
import { usePronostico } from "@/hooks/usePronostico";
import { useUmbralArroyos } from "@/hooks/useUmbralArroyos";
import { type Aviso, planearAvisos, RUTAS_AVISO, type RutaAviso } from "@/lib/avisos";

const CANAL = "avisos";
/** El permiso se pide solo una vez por sí solo; después, desde Usuario. */
const CLAVE_PEDIDO = "avisos:permisoPedido";
const enExpoGoAndroid = Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const disponible = Platform.OS !== "web" && !enExpoGoAndroid;

// Se carga solo donde funciona: un import normal se evalúa siempre y rompería Expo Go Android.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Notifications: typeof N = disponible ? require("expo-notifications") : (null as never);
/** Sin el módulo no hay respuesta que leer; se elige una sola vez, así el hook es estable. */
const useUltimaRespuesta = disponible ? Notifications.useLastNotificationResponse : () => null;

if (disponible) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

async function prepararCanal() {
  // En Android 13+ el diálogo de permiso no aparece si no existe al menos un canal.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CANAL, { name: "Avisos del clima", importance: Notifications.AndroidImportance.HIGH });
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

/**
 * Programa los avisos (todos, siempre: no se configuran; solo dependen del permiso del celular) y abre
 * la pantalla de la notificación que se toque. Se monta una vez.
 */
export function useAvisos() {
  const { data } = usePronostico();
  const umbral = useUmbralArroyos();
  const { data: aire } = useAire();

  // `umbral` es un objeto nuevo en cada render: se compara por sus valores.
  const probabilidad = umbral?.probabilidad;
  const mm = umbral?.mm;

  useEffect(() => {
    if (!disponible || !data) return;
    const arroyos = probabilidad !== undefined && mm !== undefined ? { probabilidad, mm } : null;
    programar(planearAvisos(data, { lluvia: true, arroyos, calor: true, aire: aire ?? null })).catch(() => {});
  }, [data, probabilidad, mm, aire]);

  const respuesta = useUltimaRespuesta();
  useEffect(() => {
    if (!respuesta || respuesta.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const ruta = respuesta.notification.request.content.data?.ruta;
    if (RUTAS_AVISO.includes(ruta as RutaAviso)) router.navigate(ruta as RutaAviso);
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [respuesta]);
}

export type EstadoPermiso = "concedido" | "pendiente" | "denegado";

const aEstado = (p: N.NotificationPermissionsStatus): EstadoPermiso =>
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
