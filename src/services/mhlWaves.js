const API_URL = "https://api.manly.hydraulics.works/api.php";
const MARINE_API = "https://marine-api.open-meteo.com/v1/marine";
const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const USERNAME = "publicwww";
const MAX_NEAREST_BUOY_KM = 180;
const TIMEZONE = "Australia/Sydney";
const FORECAST_DAYS = "4";

const WAVE_BUOY_CODES = [
  "BYRBOW",
  "COFHOW",
  "CRHDOW",
  "SYDDOW",
  "PTKMOW",
  "BATBOW",
  "EDENOW"
];

let cachedBuoys = null;

export async function fetchMhlWaveInfo({ lat, lng }) {
  const buoys = await fetchWaveBuoys();
  const nearest = findNearestBuoy(buoys, lat, lng);
  if (!nearest || nearest.distanceKm > MAX_NEAREST_BUOY_KM) return null;

  const latest = await fetchMhlBuoyLatest(nearest.buoy.sitecode);

  if (!latest.waveHeight && !latest.wavePeriod && !latest.waveDirection) return null;

  return {
    source: "MHL NSW Ocean Wave Buoy",
    buoy: nearest.buoy,
    distanceKm: nearest.distanceKm,
    waveHeight: latest.waveHeight,
    wavePeriod: latest.wavePeriod,
    waveDirection: latest.waveDirection,
    observedAt: latest.observedAt
  };
}

export async function fetchMhlBuoySnapshots() {
  const buoys = await fetchWaveBuoys();
  return Promise.all(
    buoys.map(async (buoy) => {
      const [latest, weather] = await Promise.all([
        fetchMhlBuoyLatest(buoy.sitecode).catch(() => ({})),
        fetchOpenMeteoCurrent(buoy.latitude, buoy.longitude).catch(() => ({}))
      ]);

      return {
        ...buoy,
        ...latest,
        windSpeed: weather.windSpeed ?? null,
        windDirection: weather.windDirection ?? null,
        temperature: weather.temperature ?? null
      };
    })
  );
}

export async function fetchMhlBuoyForecast(buoy) {
  const [latest, weather, marine] = await Promise.all([
    fetchMhlBuoyLatest(buoy.sitecode).catch(() => ({})),
    fetchOpenMeteoHourly(buoy.latitude, buoy.longitude),
    fetchOpenMeteoMarineHourly(buoy.latitude, buoy.longitude)
  ]);

  return {
    buoy,
    latest,
    hours: combineHourlyForecasts(weather.hourly, marine.hourly).slice(0, 96)
  };
}

export async function fetchWaveBuoys() {
  if (cachedBuoys) return cachedBuoys;

  const params = new URLSearchParams({
    page: "sitedata",
    sitecode: WAVE_BUOY_CODES.join(","),
    characteristic: "all",
    display: "all",
    username: USERNAME
  });
  const data = await fetchJson(params);

  cachedBuoys = (Array.isArray(data) ? data : [data])
    .map((site) => ({
      id: site.id,
      sitecode: site.sitecode,
      name: site.name,
      longname: site.longname,
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
      sensorIds: String(site.sensor_ids ?? "")
        .split(",")
        .filter(Boolean)
    }))
    .filter((site) =>
      site.sitecode &&
      Number.isFinite(site.latitude) &&
      Number.isFinite(site.longitude)
    );

  return cachedBuoys;
}

export async function fetchMhlBuoyLatest(sitecode) {
  const latest = await fetchLatestReadings(sitecode);
  const waveHeight = findLatestValue(latest, "Wave Height");
  const wavePeriod = findLatestValue(latest, "Wave Period");
  const waveDirection = findLatestValue(latest, "Wave Direction");
  const seaTemperature = findLatestValue(latest, "Sea Temp");

  return {
    waveHeight: waveHeight?.value ?? null,
    wavePeriod: wavePeriod?.value ?? null,
    waveDirection: waveDirection?.value ?? null,
    seaTemperature: seaTemperature?.value ?? null,
    observedAt:
      waveHeight?.timestamp ??
      wavePeriod?.timestamp ??
      waveDirection?.timestamp ??
      seaTemperature?.timestamp ??
      null
  };
}

async function fetchLatestReadings(sitecode) {
  const params = new URLSearchParams({
    page: "latest-readings",
    sitecode,
    username: USERNAME
  });
  return fetchJson(params);
}

async function fetchOpenMeteoCurrent(lat, lng) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: "wind_speed_10m,wind_direction_10m,temperature_2m",
    wind_speed_unit: "kmh",
    timezone: TIMEZONE
  });
  const response = await fetch(`${FORECAST_API}?${params}`);
  if (!response.ok) throw new Error("Unable to fetch buoy wind data");
  const data = await response.json();
  return {
    windSpeed: numberOrNull(data.current?.wind_speed_10m),
    windDirection: numberOrNull(data.current?.wind_direction_10m),
    temperature: numberOrNull(data.current?.temperature_2m)
  };
}

async function fetchOpenMeteoHourly(lat, lng) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly: "wind_speed_10m,wind_direction_10m,temperature_2m,cloud_cover,precipitation",
    wind_speed_unit: "kmh",
    forecast_days: FORECAST_DAYS,
    timezone: TIMEZONE
  });
  const response = await fetch(`${FORECAST_API}?${params}`);
  if (!response.ok) throw new Error("Unable to fetch buoy weather forecast");
  return response.json();
}

async function fetchOpenMeteoMarineHourly(lat, lng) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly: "wave_height,wave_period,wave_direction,sea_level_height_msl",
    forecast_days: FORECAST_DAYS,
    timezone: TIMEZONE
  });
  const response = await fetch(`${MARINE_API}?${params}`);
  if (!response.ok) throw new Error("Unable to fetch buoy marine forecast");
  return response.json();
}

async function fetchJson(params) {
  const response = await fetch(`${API_URL}?${params}`);
  if (!response.ok) throw new Error(`MHL wave request failed: ${response.status}`);
  return response.json();
}

function combineHourlyForecasts(weather, marine) {
  const marineByTime = new Map(
    (marine?.time ?? []).map((time, index) => [time, marineIndex(marine, index)])
  );

  return (weather?.time ?? []).map((time, index) => ({
    time: parseSydneyTime(time),
    windSpeed: numberOrNull(weather.wind_speed_10m?.[index]),
    windDirection: numberOrNull(weather.wind_direction_10m?.[index]),
    temperature: numberOrNull(weather.temperature_2m?.[index]),
    cloudCover: numberOrNull(weather.cloud_cover?.[index]),
    precipitation: numberOrNull(weather.precipitation?.[index]),
    ...(marineByTime.get(time) ?? {})
  }));
}

function marineIndex(marine, index) {
  return {
    waveHeight: numberOrNull(marine.wave_height?.[index]),
    wavePeriod: numberOrNull(marine.wave_period?.[index]),
    waveDirection: numberOrNull(marine.wave_direction?.[index]),
    seaLevel: numberOrNull(marine.sea_level_height_msl?.[index])
  };
}

function findLatestValue(readings, unitType) {
  const reading = Object.values(readings ?? {}).find(
    (item) =>
      String(item.unit_type ?? "").toLowerCase() === unitType.toLowerCase() &&
      !String(item.name ?? "").toLowerCase().includes("forecast")
  );
  if (!reading) return null;

  return {
    name: reading.name,
    value: numberOrNull(Array.isArray(reading.value) ? reading.value[0] : reading.value),
    timestamp: parseMhlTimestamp(reading.obsdate)
  };
}

function parseSydneyTime(value) {
  if (!value) return null;
  const date = new Date(`${String(value)}:00+10:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function findNearestBuoy(buoys, lat, lng) {
  return buoys.reduce((nearest, buoy) => {
    const distanceKm = haversineKm(lat, lng, buoy.latitude, buoy.longitude);
    if (!nearest || distanceKm < nearest.distanceKm) {
      return { buoy, distanceKm };
    }
    return nearest;
  }, null);
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const radiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * radiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function parseMhlTimestamp(value) {
  if (!value) return null;
  const date = new Date(`${String(value).replace(" ", "T")}+10:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
