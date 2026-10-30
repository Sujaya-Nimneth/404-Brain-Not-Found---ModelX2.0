from __future__ import annotations

import json
import logging
from dataclasses import replace
from datetime import date
from pathlib import Path

import httpx

from etl.live_data import WeatherObservation

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
SEEDED_RAINFALL_MM = 8.0


def get_rainfall_forecast(
    latitude: float,
    longitude: float,
    forecast_date: date,
    client: httpx.Client | None = None,
    cache_path: Path | None = None,
    market_code: str | None = None,
) -> float:
    """Fetch daily rainfall, then use a verified cache or deterministic seed."""
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": "precipitation_sum",
        "start_date": forecast_date.isoformat(),
        "end_date": forecast_date.isoformat(),
        "timezone": "Asia/Colombo",
    }
    try:
        owns_client = client is None
        active_client = client or httpx.Client(timeout=3.0)
        try:
            response = active_client.get(OPEN_METEO_URL, params=params)
            response.raise_for_status()
            values = response.json()["daily"]["precipitation_sum"]
            if not values or values[0] is None:
                raise ValueError("Open-Meteo returned no rainfall value")
            return max(0.0, float(values[0]))
        finally:
            if owns_client:
                active_client.close()
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as error:
        cached = (
            cached_rainfall(cache_path, market_code, forecast_date)
            if cache_path is not None and market_code is not None
            else None
        )
        if cached is not None:
            logger.warning(
                "Open-Meteo unavailable; using verified cached rainfall: %s",
                error,
            )
            return cached
        logger.warning(
            "Open-Meteo unavailable and no cached row exists; using seeded fallback: %s",
            error,
        )
        return SEEDED_RAINFALL_MM


def write_weather_cache(
    cache_path: Path,
    observations: list[WeatherObservation],
) -> None:
    if not observations:
        return
    existing = _read_weather_observations(cache_path)
    merged = {
        (row.market_code, row.observation_date): row
        for row in [*existing, *observations]
    }
    latest_by_market = {
        market_code: max(
            day
            for candidate_market, day in merged
            if candidate_market == market_code
        )
        for market_code in {market for market, _ in merged}
    }
    retained = [
        row
        for (market_code, observation_date), row in merged.items()
        if (latest_by_market[market_code] - observation_date).days <= 14
    ]
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": max(row.observation_date for row in retained).isoformat(),
        "observations": [
            {
                "market_code": row.market_code,
                "observation_date": row.observation_date.isoformat(),
                "precipitation_mm": row.precipitation_mm,
                "temp_max_c": row.temp_max_c,
                "temp_min_c": row.temp_min_c,
                "source": row.source,
            }
            for row in sorted(
                retained,
                key=lambda item: (item.market_code, item.observation_date),
            )
        ],
    }
    cache_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def read_weather_cache(cache_path: Path) -> list[WeatherObservation]:
    return [
        replace(row, source="OPEN_METEO_CACHED")
        for row in _read_weather_observations(cache_path)
    ]


def cached_rainfall(
    cache_path: Path,
    market_code: str,
    forecast_date: date,
) -> float | None:
    rows = [
        row
        for row in _read_weather_observations(cache_path)
        if row.market_code == market_code
        and row.observation_date <= forecast_date
    ]
    if not rows:
        return None
    return max(rows, key=lambda row: row.observation_date).precipitation_mm


def _read_weather_observations(cache_path: Path) -> list[WeatherObservation]:
    if not cache_path.exists():
        return []
    try:
        payload = json.loads(cache_path.read_text(encoding="utf-8"))
        return [
            WeatherObservation(
                market_code=str(item["market_code"]),
                observation_date=date.fromisoformat(item["observation_date"]),
                precipitation_mm=float(item["precipitation_mm"]),
                temp_max_c=(
                    None
                    if item.get("temp_max_c") is None
                    else float(item["temp_max_c"])
                ),
                temp_min_c=(
                    None
                    if item.get("temp_min_c") is None
                    else float(item["temp_min_c"])
                ),
                source=str(item.get("source", "OPEN_METEO_CACHED")),
            )
            for item in payload.get("observations", [])
        ]
    except (
        OSError,
        json.JSONDecodeError,
        KeyError,
        TypeError,
        ValueError,
    ) as error:
        logger.warning("Weather cache is unreadable: %s", error)
        return []
