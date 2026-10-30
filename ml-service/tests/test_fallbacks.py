from datetime import date

import httpx

from etl.cropix_scraper import scrape_cropix
from etl.hdx_loader import load_hdx_prices
from etl.live_data import WeatherObservation
from etl.weather_client import (
    SEEDED_RAINFALL_MM,
    get_rainfall_forecast,
    read_weather_cache,
    write_weather_cache,
)


def test_hdx_missing_file_falls_back_without_error(tmp_path):
    frame = load_hdx_prices(tmp_path / "missing.csv")

    assert not frame.empty
    assert {"market_code", "crop_code", "recorded_date"}.issubset(frame.columns)


def test_cropix_missing_cache_falls_back_without_error(tmp_path):
    frame = scrape_cropix(tmp_path / "missing.csv")

    assert not frame.empty
    assert "wholesale_price_lkr_per_kg" in frame.columns


def test_weather_failure_returns_cached_value(tmp_path):
    def fail(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline", request=request)

    cache = tmp_path / "weather.json"
    write_weather_cache(
        cache,
        [
            WeatherObservation(
                market_code="DAMBULLA",
                observation_date=date(2026, 10, 26),
                precipitation_mm=12.5,
                temp_max_c=30.0,
                temp_min_c=23.0,
                source="OPEN_METEO_LIVE",
            )
        ],
    )
    with httpx.Client(transport=httpx.MockTransport(fail)) as client:
        rainfall = get_rainfall_forecast(
            7.86,
            80.65,
            date(2026, 10, 27),
            client,
            cache_path=cache,
            market_code="DAMBULLA",
        )

    assert rainfall == 12.5
    assert read_weather_cache(cache)[0].source == "OPEN_METEO_CACHED"


def test_weather_failure_without_cache_uses_explicit_seed():
    def fail(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline", request=request)

    with httpx.Client(transport=httpx.MockTransport(fail)) as client:
        rainfall = get_rainfall_forecast(7.86, 80.65, date(2026, 10, 27), client)

    assert rainfall == SEEDED_RAINFALL_MM


def test_weather_success_returns_daily_precipitation():
    def respond(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"daily": {"precipitation_sum": [12.5]}},
            request=request,
        )

    with httpx.Client(transport=httpx.MockTransport(respond)) as client:
        rainfall = get_rainfall_forecast(7.86, 80.65, date(2026, 10, 27), client)

    assert rainfall == 12.5
