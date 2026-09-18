import { fetchMhlWaveInfo } from "./mhlWaves.js";
import { estimateTideExtrema } from "../utils/tideExtrema.js";

const MARINE_API = "https://marine-api.open-meteo.com/v1/marine";
const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const TIMEZONE = "Australia/Sydney";

export async function fetchTideInfo({ lat, lng }) {
  const [marine, wind, mhlWaves] = await Promise.all([
    fetchMarine(lat, lng),
    fetchWind(lat, lng),
    fetchMhlWaveInfo({ lat, lng }).catch(() => null)
  ]);

  const events = extractTideEvents(marine.hourly).sort((a, b) => a.time - b.time);
  const now = new Date();

  return {
    coordinate: { lat, lng },
    currentSeaLevel: marine.current?.sea_level_height_msl ?? null,
    nextHigh: events.find((event) => event.kind === "high" && event.time >= now) ?? null,
    nextLow: events.find((event) => event.kind === "low" && event.time >= now) ?? null,
    tideEvents: events,
    waveHeight: mhlWaves?.waveHeight ?? marine.current?.wave_height ?? null,
    wavePeriod: mhlWaves?.wavePeriod ?? marine.current?.wave_period ?? null,
    waveDirection: mhlWaves?.waveDirection ?? null,
    waveSource: mhlWaves?.source ?? "Open-Meteo Marine",
    wavePoint: mhlWaves?.buoy ?? null,
    wavePointDistanceKm: mhlWaves?.distanceKm ?? null,
    waveObservedAt: mhlWaves?.observedAt ?? null,
    windSpeed: wind.current?.wind_speed_10m ?? null,
    windDirection: wind.current?.wind_direction_10m ?? null,
    updatedAt: now
  };
}

export function getTodayTideEvents(info) {
  const start = startOfSydneyDay(new Date());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return (info?.tideEvents ?? [])
    .filter((event) => event.time >= start && event.time < end)
    .sort((a, b) => a.time - b.time);
}

export function groupThreeDayTideEvents(info) {
  const start = startOfSydneyDay(new Date());
  const end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);
  const groups = new Map();

  for (const event of info?.tideEvents ?? []) {
    if (event.time < start || event.time >= end) continue;
    const key = formatDateKey(event.time);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }

  return Array.from(groups.entries()).map(([key, events]) => ({
    key,
    label: formatDayLabel(events[0]?.time),
    events: events.sort((a, b) => a.time - b.time)
  }));
}

export function formatMeters(value, t = fallbackTranslator) {
  if (!Number.isFinite(value)) return t("notAvailable");
  return `${value.toFixed(2)} m`;
}

export function formatSeconds(value, t = fallbackTranslator) {
  if (!Number.isFinite(value)) return t("notAvailable");
  return `${value.toFixed(1)} s`;
}

export function formatWindSpeed(value, t = fallbackTranslator) {
  if (!Number.isFinite(value)) return t("notAvailable");
  return `${value.toFixed(1)} km/h`;
}

export function formatWindDirection(value, t = fallbackTranslator) {
  if (!Number.isFinite(value)) return t("notAvailable");
  return `${windCompass(value, t)} ${Math.round(value)}°`;
}

export function formatTideTime(date) {
  if (!(date instanceof Date)) return fallbackTranslator("notAvailable");
  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIMEZONE
  }).format(date);
}

async function fetchMarine(lat, lng) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: "wave_height,wave_period,sea_level_height_msl",
    hourly: "sea_level_height_msl",
    forecast_days: "3",
    timezone: TIMEZONE,
    timeformat: "unixtime",
    cell_selection: "sea"
  });
  const response = await fetch(`${MARINE_API}?${params}`);
  if (!response.ok) throw new Error("Unable to fetch marine data");
  return response.json();
}

async function fetchWind(lat, lng) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: "wind_speed_10m,wind_direction_10m",
    wind_speed_unit: "kmh",
    timezone: TIMEZONE,
    cell_selection: "sea"
  });
  const response = await fetch(`${FORECAST_API}?${params}`);
  if (!response.ok) throw new Error("Unable to fetch wind data");
  return response.json();
}

function extractTideEvents(hourly) {
  const times = hourly?.time ?? [];
  const heights = hourly?.sea_level_height_msl ?? [];
  return estimateTideExtrema(times.map((time, index) => ({
    time: parseApiTime(time),
    value: numberOrNull(heights[index])
  })));
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseApiTime(value) {
  if (typeof value === "number") return new Date(value * 1000);
  return new Date(value);
}

function startOfSydneyDay(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const noon = new Date(`${year}-${month}-${day}T12:00:00Z`);
  const offsetMinutes = getSydneyOffsetMinutes(noon);
  return new Date(Date.UTC(+year, +month - 1, +day) - offsetMinutes * 60 * 1000);
}

function getSydneyOffsetMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type) => Number(parts.find((part) => part.type === type)?.value);
  const representedUtc = Date.UTC(
    value("year"), value("month") - 1, value("day"), value("hour"), value("minute")
  );
  return Math.round((representedUtc - date.getTime()) / 60000);
}

function formatDateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatDayLabel(date) {
  if (!(date instanceof Date)) return fallbackTranslator("notAvailable");
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: TIMEZONE
  }).format(date);
}

function windCompass(degrees, t) {
  const keys = [
    "compass.n",
    "compass.ne",
    "compass.e",
    "compass.se",
    "compass.s",
    "compass.sw",
    "compass.w",
    "compass.nw"
  ];
  return t(keys[Math.round(degrees / 45) % keys.length]);
}

function fallbackTranslator(key) {
  const values = {
    notAvailable: "N/A",
    "compass.n": "N",
    "compass.ne": "NE",
    "compass.e": "E",
    "compass.se": "SE",
    "compass.s": "S",
    "compass.sw": "SW",
    "compass.w": "W",
    "compass.nw": "NW"
  };
  return values[key] ?? key;
}
