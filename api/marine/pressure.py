from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum

from .models import DailyMarineForecast, HourlyMarineForecast


class PressureTrend(StrEnum):
    RISING = "rising"
    STABLE = "stable"
    FALLING = "falling"


class FishingCondition(StrEnum):
    POOR = "poor"
    GOOD = "good"
    VERY_GOOD = "veryGood"


@dataclass(frozen=True)
class PressureConfig:
    window_hours: int = 3
    trend_threshold_hpa: float = 1.0
    fluctuation_threshold_hpa: float = 3.0
    falling_to_poor_hours: int = 6
    extreme_low_hpa: float = 1000.0
    extreme_high_hpa: float = 1035.0


DEFAULT_PRESSURE_CONFIG = PressureConfig()


def classify_trend(delta_hpa: float, config: PressureConfig = DEFAULT_PRESSURE_CONFIG) -> PressureTrend:
    if delta_hpa > config.trend_threshold_hpa:
        return PressureTrend.RISING
    if delta_hpa < -config.trend_threshold_hpa:
        return PressureTrend.FALLING
    return PressureTrend.STABLE


def _downgrade(condition: FishingCondition) -> FishingCondition:
    if condition == FishingCondition.VERY_GOOD:
        return FishingCondition.GOOD
    return FishingCondition.POOR


def judge_condition(
    pressure_hpa: float,
    trend: PressureTrend,
    fluctuating: bool,
    falling_hours: int,
    config: PressureConfig = DEFAULT_PRESSURE_CONFIG,
) -> tuple[FishingCondition, str]:
    if fluctuating:
        condition, reason = FishingCondition.VERY_GOOD, "fluctuating"
    elif trend == PressureTrend.RISING:
        condition, reason = FishingCondition.VERY_GOOD, "rising"
    elif trend == PressureTrend.FALLING:
        if falling_hours >= config.falling_to_poor_hours:
            condition, reason = FishingCondition.POOR, "fallingLong"
        else:
            condition, reason = FishingCondition.GOOD, "fallingEarly"
    else:
        condition, reason = FishingCondition.GOOD, "stable"

    if pressure_hpa < config.extreme_low_hpa or pressure_hpa > config.extreme_high_hpa:
        condition = _downgrade(condition)
        reason = f"{reason}Extreme"

    return condition, reason


def annotate_pressure_forecast(
    days: list[DailyMarineForecast],
    config: PressureConfig = DEFAULT_PRESSURE_CONFIG,
    history_days: list[DailyMarineForecast] | None = None,
) -> None:
    timeline: list[tuple[datetime, HourlyMarineForecast]] = []
    for day in [*(history_days or []), *days]:
        for hour in day.hourly:
            try:
                timestamp = datetime.fromisoformat(f"{day.date}T{hour.time}")
            except ValueError:
                continue
            timeline.append((timestamp, hour))

    timeline.sort(key=lambda item: item[0])
    by_time = {timestamp: hour for timestamp, hour in timeline}
    window = timedelta(hours=config.window_hours)
    falling_hours = 0

    for timestamp, hour in timeline:
        previous = by_time.get(timestamp - window)
        if (
            hour.pressure_hpa is None
            or previous is None
            or previous.pressure_hpa is None
        ):
            falling_hours = 0
            hour.pressure_falling_hours = 0
            hour.pressure_condition_reason = "noHistory"
            continue

        delta_hpa = hour.pressure_hpa - previous.pressure_hpa
        trend = classify_trend(delta_hpa, config)
        fluctuating = abs(delta_hpa) >= config.fluctuation_threshold_hpa
        falling_hours = falling_hours + 1 if trend == PressureTrend.FALLING else 0
        condition, reason = judge_condition(
            hour.pressure_hpa,
            trend,
            fluctuating,
            falling_hours,
            config,
        )

        hour.pressure_delta_hpa = delta_hpa
        hour.pressure_trend = trend.value
        hour.pressure_fluctuating = fluctuating
        hour.pressure_falling_hours = falling_hours
        hour.fishing_condition = condition.value
        hour.pressure_condition_reason = reason
