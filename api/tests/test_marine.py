from __future__ import annotations

import json
import unittest
from unittest.mock import AsyncMock, patch

from api.marine.models import MarineLocation
from api.marine.discovery import _path_from_public_id, _public_id
from api.marine.nautide import extract_page_parameters, fetch_forecast, normalize_forecast
from api.marine.registry import filter_locations, nearby_locations


FIXTURE_HTML = """
<script>
var JS_CODIGO_ESTACION = "au577";
var JS_LATITUD = "-34.58356";
var JS_LONGITUD = "150.87337";
var JS_URL_ACTUAL = "%2Fau%2Fnew-south-wales%2Fshellharbour";
var JS_FECHA_ACTUAL = "2026-10-25+08%3A00";
var JS_WCACHE_CK = "test-cache-key";
</script>
"""

FIXTURE_PAYLOAD = {
    "code": "au577",
    "time_expires": "1893456000",
    "data2": {
        "weather": [{
            "date": "2026-10-25",
            "tides": [{"tide_data": [{
                "tideDateTime": "2026-10-25 08:10",
                "tideHeight_mt": "1.58",
                "tide_type": "HIGH",
            }]}],
            "hourly": [{
                "time": "600",
                "windspeedKmph": "15",
                "winddirDegree": "345",
                "winddir16Point": "NNW",
                "sigHeight_m": "0.4",
                "swellHeight_m": "1.4",
                "swellDir": "65",
                "swellDir16Point": "ENE",
                "swellPeriod_secs": "7.6",
                "waterTemp_C": "17",
                "pressure": "1009",
            }],
        }]
    },
}


class FakeResponse:
    def __init__(self, text: str = "", payload: dict | None = None) -> None:
        self.text = text
        self._payload = payload

    def json(self) -> dict:
        return self._payload if self._payload is not None else json.loads(self.text)


class MarineParserTests(unittest.TestCase):
    def test_extracts_dynamic_page_parameters(self) -> None:
        values = extract_page_parameters(FIXTURE_HTML)
        self.assertEqual(values["JS_CODIGO_ESTACION"], "au577")
        self.assertEqual(values["JS_LATITUD"], "-34.58356")
        self.assertEqual(values["JS_WCACHE_CK"], "test-cache-key")

    def test_normalizes_numbers_and_keeps_wave_types_separate(self) -> None:
        location = MarineLocation(
            id="fixture", name="Fixture", state="NSW", latitude=-34, longitude=151,
            pageUrl="https://tides4fishing.com/au/new-south-wales/fixture",
        )
        result = normalize_forecast(FIXTURE_PAYLOAD, location, "miss")
        hour = result.days[0].hourly[0]
        self.assertEqual(hour.time, "06:00")
        self.assertEqual(hour.wind_speed_kmh, 15.0)
        self.assertEqual(hour.significant_wave_height_m, 0.4)
        self.assertEqual(hour.swell_height_m, 1.4)


class RegistryTests(unittest.TestCase):
    def test_state_and_partial_name_filtering(self) -> None:
        self.assertEqual([item.name for item in filter_locations("NSW", "shell", 10)], ["Shellharbour"])
        self.assertIn("Port Adelaide", [item.name for item in filter_locations(None, "port", 10)])

    def test_nearby_results_are_distance_sorted(self) -> None:
        results = nearby_locations(-34.58, 150.87, 1000, 5)
        self.assertEqual(results[0].id, "shellharbour-nsw")
        self.assertLess(results[0].distance_km, results[1].distance_km)

    def test_discovered_location_id_round_trip_is_path_bounded(self) -> None:
        path = "/au/new-south-wales/wollongong"
        self.assertEqual(_path_from_public_id(_public_id(path)), path)
        self.assertIsNone(_path_from_public_id(_public_id("/nz/auckland")))


class MockedUpstreamIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def test_fetch_uses_page_then_forecast_response(self) -> None:
        location = MarineLocation(
            id="mock-integration", name="Mock", state="NSW", latitude=-34, longitude=151,
            pageUrl="https://tides4fishing.com/au/new-south-wales/mock",
        )
        mocked_request = AsyncMock(
            side_effect=[FakeResponse(text=FIXTURE_HTML), FakeResponse(payload=FIXTURE_PAYLOAD)]
        )
        with patch("api.marine.nautide._request_with_retry", mocked_request):
            result = await fetch_forecast(location)
        self.assertEqual(mocked_request.await_count, 2)
        self.assertEqual(result.station_code, "au577")
        self.assertEqual(result.days[0].hourly[0].swell_period_seconds, 7.6)


if __name__ == "__main__":
    unittest.main()
