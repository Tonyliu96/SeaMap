from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path

from .models import MarineLocation

SOURCE_HOST = "https://tides4fishing.com"
REGISTRY_PATH = Path(__file__).resolve().parents[1] / "data" / "marine_locations.json"


@lru_cache(maxsize=1)
def load_locations() -> tuple[MarineLocation, ...]:
    records = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    seen: set[str] = set()
    locations: list[MarineLocation] = []
    for record in records:
        location_id = str(record["id"]).strip().lower()
        page_path = str(record["pagePath"])
        if location_id in seen or not page_path.startswith("/au/"):
            continue
        seen.add(location_id)
        locations.append(
            MarineLocation(
                id=location_id,
                name=record["name"],
                state=record.get("state"),
                latitude=record["latitude"],
                longitude=record["longitude"],
                pageUrl=f"{SOURCE_HOST}{page_path}",
            )
        )
    return tuple(locations)


def get_location(location_id: str) -> MarineLocation | None:
    key = location_id.strip().lower()
    return next((item for item in load_locations() if item.id == key), None)


def filter_locations(state: str | None, search: str | None, limit: int) -> list[MarineLocation]:
    state_key = state.strip().upper() if state else None
    query = search.strip().casefold() if search else ""
    results = [
        item
        for item in load_locations()
        if (not state_key or state_key == "ALL" or item.state == state_key)
        and (not query or query in item.name.casefold() or query in item.id.casefold())
    ]
    return sorted(results, key=lambda item: (item.state or "", item.name))[:limit]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0088
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    value = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return radius * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def nearby_locations(lat: float, lon: float, radius_km: float, limit: int) -> list[MarineLocation]:
    ranked: list[MarineLocation] = []
    for location in load_locations():
        distance = haversine_km(lat, lon, location.latitude, location.longitude)
        if distance <= radius_km:
            ranked.append(location.model_copy(update={"distance_km": round(distance, 1)}))
    return sorted(ranked, key=lambda item: item.distance_km or 0)[:limit]
