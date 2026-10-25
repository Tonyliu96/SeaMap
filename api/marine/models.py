from __future__ import annotations

from pydantic import BaseModel, Field


class MarineLocation(BaseModel):
    id: str
    name: str
    state: str | None = None
    latitude: float
    longitude: float
    page_url: str = Field(alias="pageUrl")
    distance_km: float | None = Field(default=None, alias="distanceKm")

    model_config = {"populate_by_name": True}


class TideEvent(BaseModel):
    time: str
    height_m: float | None = Field(alias="heightM")
    type: str

    model_config = {"populate_by_name": True}


class HourlyMarineForecast(BaseModel):
    time: str
    wind_speed_kmh: float | None = Field(alias="windSpeedKmh")
    wind_direction_degrees: float | None = Field(alias="windDirectionDegrees")
    wind_direction: str | None = Field(alias="windDirection")
    significant_wave_height_m: float | None = Field(alias="significantWaveHeightM")
    swell_height_m: float | None = Field(alias="swellHeightM")
    swell_direction_degrees: float | None = Field(alias="swellDirectionDegrees")
    swell_direction: str | None = Field(alias="swellDirection")
    swell_period_seconds: float | None = Field(alias="swellPeriodSeconds")
    water_temperature_c: float | None = Field(alias="waterTemperatureC")
    pressure_hpa: float | None = Field(alias="pressureHpa")

    model_config = {"populate_by_name": True}


class DailyMarineForecast(BaseModel):
    date: str
    tides: list[TideEvent]
    hourly: list[HourlyMarineForecast]


class MarineForecastResponse(BaseModel):
    location: MarineLocation
    station_code: str = Field(alias="stationCode")
    days: list[DailyMarineForecast]
    updated_at: str = Field(alias="updatedAt")
    expires_at: str | None = Field(alias="expiresAt")
    cache_status: str = Field(alias="cacheStatus")
    source: str
    disclaimer: str

    model_config = {"populate_by_name": True}
