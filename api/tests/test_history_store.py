from __future__ import annotations

import json
import unittest
from unittest.mock import AsyncMock, patch

from api.marine.history_store import HISTORY_TTL_SECONDS, load_previous_day, save_first_day
from api.marine.models import DailyMarineForecast, HourlyMarineForecast


def forecast_day() -> DailyMarineForecast:
    return DailyMarineForecast(
        date="2026-10-30",
        tides=[],
        hourly=[
            HourlyMarineForecast(
                time="00:00",
                windSpeedKmh=12,
                windDirectionDegrees=180,
                windDirection="S",
                significantWaveHeightM=1.2,
                swellHeightM=1.4,
                swellDirectionDegrees=160,
                swellDirection="SSE",
                swellPeriodSeconds=8,
                waterTemperatureC=20,
                pressureHpa=1022,
            )
        ],
    )


class HistoryStoreTests(unittest.IsolatedAsyncioTestCase):
    async def test_saves_complete_first_day_with_three_day_ttl(self) -> None:
        command = AsyncMock(return_value="OK")
        with patch("api.marine.history_store._command", command):
            await save_first_day("au577", forecast_day())

        arguments = command.await_args.args[0]
        self.assertEqual(arguments[:2], ["SET", "marine:forecast:au577:2026-10-30"])
        self.assertEqual(arguments[-2:], ["EX", HISTORY_TTL_SECONDS])
        stored = json.loads(arguments[2])
        self.assertEqual(stored["hourly"][0]["pressureHpa"], 1022)
        self.assertEqual(stored["hourly"][0]["swellHeightM"], 1.4)

    async def test_loads_the_day_before_first_forecast_date(self) -> None:
        stored = json.dumps(forecast_day().model_copy(update={"date": "2026-10-29"}).model_dump(by_alias=True))
        command = AsyncMock(return_value=stored)
        with patch("api.marine.history_store._command", command):
            result = await load_previous_day("au577", "2026-10-30")

        command.assert_awaited_once_with(["GET", "marine:forecast:au577:2026-10-29"])
        self.assertEqual(result.date, "2026-10-29")
        self.assertEqual(result.hourly[0].pressure_hpa, 1022)

    async def test_repeated_saves_replace_the_same_station_date_key(self) -> None:
        command = AsyncMock(return_value="OK")
        with patch("api.marine.history_store._command", command):
            await save_first_day("au577", forecast_day())
            await save_first_day("au577", forecast_day())

        keys = [call.args[0][1] for call in command.await_args_list]
        self.assertEqual(keys, [
            "marine:forecast:au577:2026-10-30",
            "marine:forecast:au577:2026-10-30",
        ])


if __name__ == "__main__":
    unittest.main()
