const API_ROOT = "/api/marine";

async function getJson(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    signal: options.signal,
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch {
      // Keep the status-based fallback when the upstream body is not JSON.
    }
    throw new Error(message);
  }
  return response.json();
}

export function fetchMarineLocations({ state = "ALL", search = "", signal } = {}) {
  const parameters = new URLSearchParams({ limit: "100" });
  if (state && state !== "ALL") parameters.set("state", state);
  if (search.trim()) parameters.set("search", search.trim());
  return getJson(`/locations?${parameters}`, { signal });
}

export function fetchNearbyMarineLocations({ lat, lon, radiusKm = 150, signal }) {
  const parameters = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    radius_km: String(radiusKm),
    limit: "5"
  });
  return getJson(`/locations/nearby?${parameters}`, { signal });
}

export function fetchMarineForecast(station, { signal } = {}) {
  const parameters = new URLSearchParams({ station });
  return getJson(`/forecast?${parameters}`, { signal });
}
