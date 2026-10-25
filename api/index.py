from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.responses import JSONResponse

from api.marine.models import MarineForecastResponse, MarineLocation
from api.marine.discovery import discover_locations, resolve_discovered_location
from api.marine.nautide import UpstreamError, fetch_forecast
from api.marine.registry import filter_locations, get_location, nearby_locations

app = FastAPI(title="SeaMap Marine Forecast API", docs_url="/api/docs", openapi_url="/api/openapi.json")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/marine/locations", response_model=list[MarineLocation], response_model_by_alias=True)
async def locations(
    response: Response,
    state: str | None = Query(default=None, max_length=8),
    search: str | None = Query(default=None, max_length=80),
    limit: int = Query(default=100, ge=1, le=250),
) -> list[MarineLocation]:
    response.headers["Cache-Control"] = "public, max-age=300, s-maxage=3600"
    registered = filter_locations(state, search, limit)
    if not search or len(search.strip()) < 2:
        return registered
    try:
        discovered = await discover_locations(state, search, limit)
    except UpstreamError:
        return registered
    merged = {item.id: item for item in (*registered, *discovered)}
    return list(merged.values())[:limit]


@app.get("/api/marine/locations/nearby", response_model=list[MarineLocation], response_model_by_alias=True)
async def nearby(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    radius_km: float = Query(default=100, gt=0, le=1000),
    limit: int = Query(default=5, ge=1, le=25),
) -> list[MarineLocation]:
    return nearby_locations(lat, lon, radius_km, limit)


@app.get("/api/marine/forecast", response_model=MarineForecastResponse, response_model_by_alias=True)
async def forecast(station: str = Query(min_length=2, max_length=200)) -> JSONResponse:
    location = get_location(station)
    if not location:
        try:
            location = await resolve_discovered_location(station)
        except UpstreamError:
            location = None
    if not location:
        raise HTTPException(status_code=404, detail="Unknown or unregistered marine forecast location.")
    try:
        result = await fetch_forecast(location)
    except UpstreamError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return JSONResponse(
        content=result.model_dump(mode="json", by_alias=True),
        headers={
            "Cache-Control": "public, max-age=60, s-maxage=900, stale-while-revalidate=1800",
            "X-Marine-Cache": result.cache_status,
        },
    )
