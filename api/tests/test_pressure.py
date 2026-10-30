from __future__ import annotations

import unittest

from api.marine.models import DailyMarineForecast, HourlyMarineForecast
from api.marine.pressure import (
    FishingCondition,
    PressureTrend,
    annotate_pressure_forecast,
    classify_trend,
    judge_condition,
)


def hour(time: str, pressure: float | None) -> HourlyMarineForecast:
    return HourlyMarineForecast(
        time=time,
        windSpeedKmh=None,
        windDirectionDegrees=None,
        windDirection=None,
        significantWaveHeightM=None,
        swellHeightM=None,
        swellDirectionDegrees=None,
        swellDirection=None,
        swellPeriodSeconds=None,
        waterTemperatureC=None,
        pressureHpa=pressure,
    )


def day(date: str, pressures: list[float | None]) -> DailyMarineForecast:
    return DailyMarineForecast(
        date=date,
        tides=[],
        hourly=[hour(f"{index:02d}:00", pressure) for index, pressure in enumerate(pressures)],
    )


class PressureTrendTests(unittest.TestCase):
    def test_one_hpa_either_way_is_stable(self) -> None:
        self.assertEqual(classify_trend(1), PressureTrend.STABLE)
        self.assertEqual(classify_trend(-1), PressureTrend.STABLE)
        self.assertEqual(classify_trend(1.1), PressureTrend.RISING)
        self.assertEqual(classify_trend(-1.1), PressureTrend.FALLING)

    def test_port_kembla_three_hpa_fall_is_fluctuating_and_very_good(self) -> None:
        forecast = day(
            "2026-10-30",
            [1025, 1024, 1024, 1024, 1024, 1025, 1025, 1025, 1025, 1025, 1024, 1023, 1022],
        )

        annotate_pressure_forecast([forecast])

        noon = forecast.hourly[12]
        self.assertEqual(noon.pressure_delta_hpa, -3)
        self.assertEqual(noon.pressure_trend, PressureTrend.FALLING)
        self.assertTrue(noon.pressure_fluctuating)
        self.assertEqual(noon.fishing_condition, FishingCondition.VERY_GOOD)
        self.assertEqual(noon.pressure_condition_reason, "fluctuating")

    def test_pressure_history_crosses_midnight(self) -> None:
        first = day("2026-10-30", [1020] * 24)
        second = day("2026-10-31", [1021, 1021, 1022, 1022])

        annotate_pressure_forecast([first, second])

        self.assertEqual(second.hourly[0].pressure_delta_hpa, 1)
        self.assertEqual(second.hourly[0].pressure_trend, PressureTrend.STABLE)
        self.assertEqual(second.hourly[2].pressure_delta_hpa, 2)
        self.assertEqual(second.hourly[2].pressure_trend, PressureTrend.RISING)

    def test_separate_history_day_fills_first_three_hours(self) -> None:
        history = day("2026-10-29", [1020] * 24)
        forecast = day("2026-10-30", [1021, 1022, 1023])

        annotate_pressure_forecast([forecast], history_days=[history])

        self.assertEqual(forecast.hourly[0].pressure_delta_hpa, 1)
        self.assertEqual(forecast.hourly[1].pressure_delta_hpa, 2)
        self.assertEqual(forecast.hourly[2].pressure_delta_hpa, 3)

    def test_six_consecutive_falling_hours_becomes_poor(self) -> None:
        forecast = day(
            "2026-10-30",
            [1020, 1019, 1019, 1018, 1017, 1017, 1016, 1015, 1015],
        )

        annotate_pressure_forecast([forecast])

        sixth_falling_hour = forecast.hourly[8]
        self.assertEqual(sixth_falling_hour.pressure_falling_hours, 6)
        self.assertFalse(sixth_falling_hour.pressure_fluctuating)
        self.assertEqual(sixth_falling_hour.fishing_condition, FishingCondition.POOR)

    def test_missing_pressure_resets_falling_streak(self) -> None:
        forecast = day("2026-10-30", [1020, 1019, 1019, 1018, None, 1017, 1016, 1015])

        annotate_pressure_forecast([forecast])

        self.assertEqual(forecast.hourly[4].pressure_falling_hours, 0)
        self.assertIsNone(forecast.hourly[4].fishing_condition)
        self.assertEqual(forecast.hourly[7].pressure_condition_reason, "noHistory")

    def test_extreme_pressure_downgrades_one_level(self) -> None:
        condition, reason = judge_condition(1036, PressureTrend.RISING, False, 0)
        self.assertEqual(condition, FishingCondition.GOOD)
        self.assertEqual(reason, "risingExtreme")


if __name__ == "__main__":
    unittest.main()
