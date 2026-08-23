const MARINE_API = "https://marine-api.open-meteo.com/v1/marine";
const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const TIMEZONE = "Australia/Sydney";
const DUPLICATE_EVENT_WINDOW_MS = 3 * 60 * 60 * 1000;

export async function fetchTideInfo({ lat, lng }) {
  const [marine, wind] = await Promise.all([
    fetchMarine(lat, lng),
    fetchWind(lat, lng)
  ]);

  const events = mergeNearbyDuplicateEvents(
    extractTideEvents(marine.hourly).sort((a, b) => a.time - b.time)
  );
  const now = new Date();

  return {
    coordinate: { lat, lng },
    currentSeaLevel: marine.current?.sea_level_height_msl ?? null,
    nextHigh: events.find((event) => event.kind === "high" && event.time >= now) ?? null,
    nextLow: events.find((event) => event.kind === "low" && event.time >= now) ?? null,
    tideEvents: events,
    waveHeight: marine.current?.wave_height ?? null,
    wavePeriod: marine.current?.wave_period ?? null,
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
    timezone: TIMEZONE
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
    timezone: TIMEZONE
  });
  const response = await fetch(`${FORECAST_API}?${params}`);
  if (!response.ok) throw new Error("Unable to fetch wind data");
  return response.json();
}

function extractTideEvents(hourly) {
  const times = hourly?.time ?? [];
  const heights = hourly?.sea_level_height_msl ?? [];
  const events = [];

  for (let index = 1; index < times.length - 1; index += 1) {
    const previous = heights[index - 1];
    const current = heights[index];
    const next = heights[index + 1];
    if (![previous, current, next].every(Number.isFinite)) continue;

    if (current >= previous && current >= next) {
      events.push({ kind: "high", time: parseSydneyTime(times[index]), height: current });
    } else if (current <= previous && current <= next) {
      events.push({ kind: "low", time: parseSydneyTime(times[index]), height: current });
    }
  }

  return events;
}

function mergeNearbyDuplicateEvents(events) {
  const merged = [];

  for (const event of events) {
    const previous = merged.at(-1);
    if (
      previous &&
      previous.kind === event.kind &&
      event.time - previous.time <= DUPLICATE_EVENT_WINDOW_MS
    ) {
      const replace =
        event.kind === "high"
          ? event.height > previous.height
          : event.height < previous.height;
      if (replace) merged[merged.length - 1] = event;
      continue;
    }
    merged.push(event);
  }

  return merged;
}

function parseSydneyTime(value) {
  return new Date(`${value}:00+10:00`);
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
  return new Date(`${year}-${month}-${day}T00:00:00+10:00`);
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
