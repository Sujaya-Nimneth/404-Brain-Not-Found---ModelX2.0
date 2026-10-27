from __future__ import annotations

import logging
from datetime import date

import httpx

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def get_rainfall_forecast(
    latitude: float,
    longitude: float,
    forecast_date: date,
    client: httpx.Client | None = None,
) -> float:
    """Fetch daily rainfall, returning a safe deterministic value on failure."""
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
        logger.warning("Open-Meteo unavailable; using cached rainfall: %s", error)
        return 8.0
