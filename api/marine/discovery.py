from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import unquote, urlparse

import httpx

from .models import MarineLocation
from .nautide import TIMEOUT_SECONDS, USER_AGENT, UpstreamError, extract_page_parameters

SOURCE_ORIGIN = "https://tides4fishing.com"
SITEMAP_URL = f"{SOURCE_ORIGIN}/sitemap.xml"
INDEX_PATH = Path(__file__).resolve().parents[1] / "data" / "tides4fishing_au_paths.json"
SITEMAP_TTL_SECONDS = int(os.getenv("MARINE_SITEMAP_TTL_SECONDS", "21600"))
MAX_DISCOVERY_PAGES = int(os.getenv("MARINE_DISCOVERY_MAX_PAGES", "16"))

STATE_BY_SLUG = {
    "new-south-wales": "NSW",
    "queensland": "QLD",
    "victoria": "VIC",
    "south-australia": "SA",
    "western-australia": "WA",
    "tasmania": "TAS",
    "northern-territory": "NT",
    "australian-capital-territory": "ACT",
}

_sitemap_paths: tuple[str, ...] = ()
_sitemap_expires_at = 0.0
_location_cache: dict[str, MarineLocation] = {}
_path_pattern = re.compile(r"^/au/[a-z0-9-]+/[a-z0-9-]+$")


def _display_name(slug: str) -> str:
    return " ".join(part.capitalize() for part in unquote(slug).split("-") if part)


def _public_id(path: str) -> str:
    token = base64.urlsafe_b64encode(path.encode("utf-8")).decode("ascii").rstrip("=")
    return f"t4f_{token}"


def _path_from_public_id(location_id: str) -> str | None:
    if not location_id.startswith("t4f_"):
        return None
    token = location_id[4:]
    try:
        padding = "=" * (-len(token) % 4)
        path = base64.urlsafe_b64decode(f"{token}{padding}").decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        return None
    return path if _path_pattern.fullmatch(path) else None


async def _load_sitemap_paths() -> tuple[str, ...]:
    global _sitemap_paths, _sitemap_expires_at
    now = time.time()
    if _sitemap_paths and _sitemap_expires_at > now:
        return _sitemap_paths

    if INDEX_PATH.exists():
        indexed_paths = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
        _sitemap_paths = tuple(
            path for path in indexed_paths if isinstance(path, str) and _path_pattern.fullmatch(path)
        )
        _sitemap_expires_at = now + SITEMAP_TTL_SECONDS
        if _sitemap_paths:
            return _sitemap_paths

    headers = {"User-Agent": USER_AGENT, "Accept": "application/xml,text/xml"}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=True) as client:
            response = await client.get(SITEMAP_URL, headers=headers)
            response.raise_for_status()
    except httpx.HTTPError as error:
        raise UpstreamError("The marine location index is temporarily unavailable.") from error

    try:
        root = ET.fromstring(response.text)
    except ET.ParseError as error:
        raise UpstreamError("The location index returned invalid XML.") from error

    paths: list[str] = []
    for element in root.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url"):
        location = element.findtext("{http://www.sitemaps.org/schemas/sitemap/0.9}loc") or ""
        parsed = urlparse(location)
        if parsed.scheme == "https" and parsed.hostname == "tides4fishing.com" and _path_pattern.fullmatch(parsed.path):
            paths.append(parsed.path)

    _sitemap_paths = tuple(dict.fromkeys(paths))
    _sitemap_expires_at = now + SITEMAP_TTL_SECONDS
    return _sitemap_paths


async def _location_from_path(path: str, semaphore: asyncio.Semaphore) -> MarineLocation | None:
    location_id = _public_id(path)
    if location_id in _location_cache:
        return _location_cache[location_id]

    parts = path.strip("/").split("/")
    state = STATE_BY_SLUG.get(parts[1])
    if not state:
        return None

    page_url = f"{SOURCE_ORIGIN}{path}"
    headers = {"User-Agent": USER_AGENT, "Accept": "text/html"}
    try:
        async with semaphore:
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=True) as client:
                response = await client.get(page_url, headers=headers)
                response.raise_for_status()
        parameters = extract_page_parameters(response.text)
        location = MarineLocation(
            id=location_id,
            name=_display_name(parts[2]),
            state=state,
            latitude=float(parameters["JS_LATITUD"]),
            longitude=float(parameters["JS_LONGITUD"]),
            pageUrl=page_url,
        )
    except (httpx.HTTPError, UpstreamError, TypeError, ValueError):
        return None

    _location_cache[location_id] = location
    return location


async def discover_locations(state: str | None, search: str, limit: int) -> list[MarineLocation]:
    query = search.strip().casefold()
    if len(query) < 2:
        return []

    state_key = state.strip().upper() if state else None
    paths = await _load_sitemap_paths()
    candidates: list[str] = []
    for path in paths:
        _, state_slug, location_slug = path.strip("/").split("/")
        candidate_state = STATE_BY_SLUG.get(state_slug)
        searchable_name = _display_name(location_slug).casefold()
        if query not in searchable_name and query not in location_slug.casefold():
            continue
        if state_key and state_key != "ALL" and candidate_state != state_key:
            continue
        candidates.append(path)
        if len(candidates) >= min(limit * 2, MAX_DISCOVERY_PAGES):
            break

    semaphore = asyncio.Semaphore(6)
    resolved = await asyncio.gather(*(_location_from_path(path, semaphore) for path in candidates))
    return [location for location in resolved if location is not None][:limit]


async def resolve_discovered_location(location_id: str) -> MarineLocation | None:
    cached = _location_cache.get(location_id)
    if cached:
        return cached
    path = _path_from_public_id(location_id)
    if not path:
        return None
    paths = await _load_sitemap_paths()
    if path not in paths:
        return None
    return await _location_from_path(path, asyncio.Semaphore(1))
