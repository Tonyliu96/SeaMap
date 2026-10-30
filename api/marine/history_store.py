from __future__ import annotations

import json
import os
from datetime import date, timedelta
from typing import Any

import httpx

from .models import DailyMarineForecast


HISTORY_TTL_SECONDS = 3 * 24 * 60 * 60
REQUEST_TIMEOUT_SECONDS = 4.0
KEY_PREFIX = "marine:forecast"


def _credentials() -> tuple[str, str] | None:
    url = os.getenv("KV_REST_API_URL") or os.getenv("UPSTASH_REDIS_REST_URL")
    token = os.getenv("KV_REST_API_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN")
    if not url or not token:
        return None
    return url.rstrip("/"), token


def _key(station_code: str, forecast_date: str) -> str:
    safe_station = "".join(character for character in station_code if character.isalnum() or character in "-_")
    return f"{KEY_PREFIX}:{safe_station}:{forecast_date}"


async def _command(command: list[Any]) -> Any | None:
    credentials = _credentials()
    if credentials is None:
        return None

    url, token = credentials
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {token}"},
                json=command,
            )
            response.raise_for_status()
            return response.json().get("result")
    except (httpx.HTTPError, ValueError, AttributeError):
        return None


async def load_previous_day(station_code: str, first_date: str) -> DailyMarineForecast | None:
    try:
        previous_date = (date.fromisoformat(first_date) - timedelta(days=1)).isoformat()
    except ValueError:
        return None

    stored = await _command(["GET", _key(station_code, previous_date)])
    if not stored:
        return None

    try:
        payload = json.loads(stored) if isinstance(stored, str) else stored
        return DailyMarineForecast.model_validate(payload)
    except (json.JSONDecodeError, TypeError, ValueError):
        return None


async def save_first_day(station_code: str, day: DailyMarineForecast) -> None:
    payload = json.dumps(day.model_dump(by_alias=True), separators=(",", ":"))
    await _command([
        "SET",
        _key(station_code, day.date),
        payload,
        "EX",
        HISTORY_TTL_SECONDS,
    ])
