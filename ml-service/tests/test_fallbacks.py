from datetime import date

import httpx

from etl.cropix_scraper import scrape_cropix
from etl.hdx_loader import load_hdx_prices
from etl.weather_client import get_rainfall_forecast


def test_hdx_missing_file_falls_back_without_error(tmp_path):
    frame = load_hdx_prices(tmp_path / "missing.csv")

    assert not frame.empty
    assert {"market_code", "crop_code", "recorded_date"}.issubset(frame.columns)


def test_cropix_missing_cache_falls_back_without_error(tmp_path):
    frame = scrape_cropix(tmp_path / "missing.csv")

    assert not frame.empty
    assert "wholesale_price_lkr_per_kg" in frame.columns


def test_weather_failure_returns_cached_value():
    def fail(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline", request=request)

    with httpx.Client(transport=httpx.MockTransport(fail)) as client:
        rainfall = get_rainfall_forecast(7.86, 80.65, date(2026, 10, 27), client)

    assert rainfall == 8.0


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
