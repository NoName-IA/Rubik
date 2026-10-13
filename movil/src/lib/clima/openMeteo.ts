// Proveedor Open-Meteo (gratis, sin clave): https://open-meteo.com/en/docs

import { obtenerJson } from "../http.ts";
import type { Coordenadas, Pronostico, ProveedorClima } from "./tipos.ts";

const BASE = "https://api.open-meteo.com/v1/forecast";

const ACTUAL = [
  "temperature_2m", "apparent_temperature", "relative_humidity_2m", "wind_speed_10m",
  "weather_code", "is_day", "uv_index",
];
const HORARIO = ["temperature_2m", "precipitation_probability", "precipitation", "weather_code", "is_day"];
const DIARIO = [
  "weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_probability_max",
  "precipitation_sum", "uv_index_max", "sunrise", "sunset",
];

export function urlPronostico({ latitud, longitud }: Coordenadas, dias = 7): string {
  const p = new URLSearchParams({
    latitude: latitud.toFixed(4),
    longitude: longitud.toFixed(4),
    current: ACTUAL.join(","),
    hourly: HORARIO.join(","),
    daily: DIARIO.join(","),
    // Zona del lugar consultado: las horas llegan en hora local de ese punto.
    timezone: "auto",
    forecast_days: String(dias),
  });
  return `${BASE}?${p}`;
}

/** Forma de la respuesta de Open-Meteo (solo los campos que se piden). */
export interface RespuestaOpenMeteo {
  timezone: string;
  utc_offset_seconds: number;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    is_day: number;
    uv_index: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: (number | null)[];
    precipitation: (number | null)[];
    weather_code: number[];
    is_day: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    precipitation_sum: (number | null)[];
    uv_index_max: (number | null)[];
    sunrise: string[];
    sunset: string[];
  };
}

export function convertir(r: RespuestaOpenMeteo, obtenido: number): Pronostico {
  const c = r.current;
  const h = r.hourly;
  const d = r.daily;
  return {
    actual: {
      hora: c.time,
      temperatura: c.temperature_2m,
      sensacion: c.apparent_temperature,
      humedad: c.relative_humidity_2m,
      viento: c.wind_speed_10m,
      uv: c.uv_index,
      codigo: c.weather_code,
      esDia: c.is_day === 1,
    },
    horas: h.time.map((hora, i) => ({
      hora,
      temperatura: h.temperature_2m[i],
      probabilidad: h.precipitation_probability[i] ?? null,
      mm: h.precipitation[i] ?? 0,
      codigo: h.weather_code[i],
      esDia: h.is_day[i] === 1,
    })),
    dias: d.time.map((fecha, i) => ({
      fecha,
      codigo: d.weather_code[i],
      maxima: d.temperature_2m_max[i],
      minima: d.temperature_2m_min[i],
      probabilidad: d.precipitation_probability_max[i] ?? null,
      mm: d.precipitation_sum[i] ?? 0,
      uvMax: d.uv_index_max[i] ?? 0,
      amanecer: d.sunrise[i],
      atardecer: d.sunset[i],
    })),
    desfaseUtc: r.utc_offset_seconds,
    zona: r.timezone,
    obtenido,
  };
}

export const openMeteo: ProveedorClima = {
  async pronostico(coordenadas) {
    const r = await obtenerJson<RespuestaOpenMeteo>(urlPronostico(coordenadas));
    return convertir(r, Date.now());
  },
};
