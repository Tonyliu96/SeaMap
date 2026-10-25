from __future__ import annotations

import asyncio
import os
import re
import time
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

import httpx

from .cache import TtlCache
from .models import (
    DailyMarineForecast,
    HourlyMarineForecast,
    MarineForecastResponse,
    MarineLocation,
    TideEvent,
)

PAGE_HOST = "tides4fishing.com"
API_HOST = "io-s2.nautide.com"
UPSTREAM_URL = f"https://{API_HOST}/v003/wcache"
USER_AGENT = os.getenv("MARINE_UPSTREAM_USER_AGENT", "SeaMap/1.0 (+marine forecast viewer)")
TIMEOUT_SECONDS = float(os.getenv("MARINE_UPSTREAM_TIMEOUT_SECONDS", "9"))
FALLBACK_TTL_SECONDS = int(os.getenv("MARINE_CACHE_TTL_SECONDS", "1800"))
MAX_CACHE_TTL_SECONDS = int(os.getenv("MARINE_CACHE_MAX_TTL_SECONDS", "21600"))
DISCLAIMER = (
    "Unofficial forecast integration. Conditions can differ at individual rock fishing "
    "locations. Do not use this forecast for navigation or as a guarantee of safety."
)

_cache = TtlCache()
_VAR_PATTERN = re.compile(
    r"var\s+(JS_(?:CODIGO_ESTACION|LATITUD|LONGITUD|URL_ACTUAL|FECHA_ACTUAL|WCACHE_CK))"
    r"\s*=\s*['\"]([^'\"]+)['\"]"
)


class UpstreamError(RuntimeError):
    pass


def extract_page_parameters(html: str) -> dict[str, str]:
    values = dict(_VAR_PATTERN.findall(html))
    required = {
        "JS_CODIGO_ESTACION",
        "JS_LATITUD",
        "JS_LONGITUD",
        "JS_URL_ACTUAL",
        "JS_FECHA_ACTUAL",
        "JS_WCACHE_CK",
    }
    missing = sorted(required - values.keys())
    if missing:
        raise UpstreamError(f"Forecast page is missing required parameters: {', '.join(missing)}")
    return values


def _number(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _hour_label(value: Any) -> str:
    try:
        hour = int(value) // 100
        return f"{hour:02d}:00"
    except (TypeError, ValueError):
        return str(value or "")


def normalize_forecast(
    payload: dict[str, Any],
    location: MarineLocation,
    cache_status: str,
    station_code: str | None = None,
) -> MarineForecastResponse:
    weather_days = payload.get("data2", {}).get("weather", [])
    if not isinstance(weather_days, list) or not weather_days:
        raise UpstreamError("The upstream forecast did not include marine weather days.")

    days: list[DailyMarineForecast] = []
    for raw_day in weather_days:
        hourly = [
            HourlyMarineForecast(
                time=_hour_label(item.get("time")),
                windSpeedKmh=_number(item.get("windspeedKmph")),
                windDirectionDegrees=_number(item.get("winddirDegree")),
                windDirection=item.get("winddir16Point") or None,
                significantWaveHeightM=_number(item.get("sigHeight_m")),
                swellHeightM=_number(item.get("swellHeight_m")),
                swellDirectionDegrees=_number(item.get("swellDir")),
                swellDirection=item.get("swellDir16Point") or None,
                swellPeriodSeconds=_number(item.get("swellPeriod_secs")),
                waterTemperatureC=_number(item.get("waterTemp_C")),
                pressureHpa=_number(item.get("pressure")),
            )
            for item in raw_day.get("hourly", [])
            if isinstance(item, dict)
        ]
        raw_tides = (raw_day.get("tides") or [{}])[0].get("tide_data", [])
        tides = [
            TideEvent(
                time=item.get("tideDateTime") or item.get("tideTime") or "",
                heightM=_number(item.get("tideHeight_mt")),
                type=str(item.get("tide_type") or "").lower(),
            )
            for item in raw_tides
            if isinstance(item, dict)
        ]
        days.append(
            DailyMarineForecast(
                date=str(raw_day.get("date") or ""), tides=tides, hourly=hourly
            )
        )

    expires_raw = _number(payload.get("time_expires"))
    expires_iso = (
        datetime.fromtimestamp(expires_raw, UTC).isoformat() if expires_raw else None
    )
    return MarineForecastResponse(
        location=location,
        stationCode=station_code or str(payload.get("code") or "unknown"),
        days=days,
        updatedAt=datetime.now(UTC).isoformat(),
        expiresAt=expires_iso,
        cacheStatus=cache_status,
        source="Tides4Fishing / Nautide (unofficial integration)",
        disclaimer=DISCLAIMER,
    )


def _validate_location_url(location: MarineLocation) -> None:
    parsed = urlparse(location.page_url)
    if parsed.scheme != "https" or parsed.hostname != PAGE_HOST or not parsed.path.startswith("/au/"):
        raise UpstreamError("The registered upstream location URL is not permitted.")


async def _request_with_retry(client: httpx.AsyncClient, url: str, **kwargs: Any) -> httpx.Response:
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            response = await client.get(url, **kwargs)
            response.raise_for_status()
            return response
        except (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError) as error:
            last_error = error
            if attempt == 0:
                await asyncio.sleep(0.25)
    raise UpstreamError("The marine forecast provider is temporarily unavailable.") from last_error


async def fetch_forecast(location: MarineLocation) -> MarineForecastResponse:
    cached = _cache.get(location.id)
    if cached:
        return cached.model_copy(update={"cache_status": "hit"})

    _validate_location_url(location)
    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/json"}
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=True) as client:
        page_response = await _request_with_retry(client, location.page_url, headers=headers)
        parameters = extract_page_parameters(page_response.text)
        api_parameters = {
            "c": parameters["JS_CODIGO_ESTACION"],
            "l": parameters["JS_LATITUD"],
            "g": parameters["JS_LONGITUD"],
            "u": parameters["JS_URL_ACTUAL"],
            "f": parameters["JS_FECHA_ACTUAL"],
            "x": parameters["JS_WCACHE_CK"],
            "d": PAGE_HOST,
        }
        forecast_response = await _request_with_retry(
            client,
            UPSTREAM_URL,
            params=api_parameters,
            headers={**headers, "Referer": location.page_url},
        )
        try:
            payload = forecast_response.json()
        except ValueError as error:
            raise UpstreamError("The marine forecast provider returned invalid JSON.") from error

    result = normalize_forecast(
        payload, location, "miss", parameters["JS_CODIGO_ESTACION"]
    )
    upstream_expiry = _number(payload.get("time_expires"))
    now = time.time()
    expires_at = min(upstream_expiry or now + FALLBACK_TTL_SECONDS, now + MAX_CACHE_TTL_SECONDS)
    if expires_at <= now:
        expires_at = now + FALLBACK_TTL_SECONDS
    _cache.set(location.id, result, expires_at)
    return result
