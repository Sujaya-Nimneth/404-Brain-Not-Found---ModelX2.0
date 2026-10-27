from datetime import date
from pathlib import Path

import pytest

from etl.live_data import (
    parse_cropix_prices,
    parse_hdx_prices,
    parse_open_meteo_weather,
    read_or_write_cache,
)


HDX_SAMPLE = """date,market,commodity,pricetype,price,unit
2021-04-15,Economic Centre-Dambulla,Tomatoes,Wholesale,35.00,KG
2021-04-15,Economic Centre-Dambulla,Tomatoes,Retail,50.00,KG
2021-04-15,Unknown Market,Tomatoes,Wholesale,99.00,KG
2021-04-15,Economic Centre-Pettah,Unknown Crop,Wholesale,99.00,KG
2021-04-15,Economic Centre-Pettah,Carrots,Wholesale,130.00,KG
"""


def test_hdx_parser_keeps_only_verified_wholesale_kg_rows():
    rows = parse_hdx_prices(HDX_SAMPLE)

    assert [(row.market_code, row.crop_code, row.recorded_date) for row in rows] == [
        ("DAMBULLA", "TOMATO", date(2021, 4, 15)),
        ("PETTAH_COLOMBO", "CARROT", date(2021, 4, 15)),
    ]
    assert {row.source for row in rows} == {"HDX_LIVE"}


def test_cropix_parser_reuses_normalized_contract_with_its_own_provenance():
    rows = parse_cropix_prices(HDX_SAMPLE)
    assert {row.source for row in rows} == {"CROPIX_LIVE"}


def test_open_meteo_parser_returns_daily_weather_values():
    payload = """
    {
      "daily": {
        "time": ["2026-10-27", "2026-10-28"],
        "precipitation_sum": [9.2, null],
        "temperature_2m_max": [30.1, 30.4],
        "temperature_2m_min": [23.2, 23.5]
      }
    }
    """

    rows = parse_open_meteo_weather(payload, "DAMBULLA")

    assert len(rows) == 1
    assert rows[0].market_code == "DAMBULLA"
    assert rows[0].precipitation_mm == 9.2
    assert rows[0].temp_max_c == 30.1
    assert rows[0].source == "OPEN_METEO_LIVE"


def test_parser_rejects_a_payload_without_expected_columns():
    with pytest.raises(ValueError, match="expected columns"):
        parse_hdx_prices("date,market\n2026-10-27,Dambulla\n")


def test_cache_writes_successful_payload(tmp_path: Path):
    cache = tmp_path / "nested" / "hdx.csv"

    assert read_or_write_cache(cache, "payload") == "payload"
    assert cache.read_text(encoding="utf-8") == "payload"
    assert read_or_write_cache(cache, None) == "payload"
