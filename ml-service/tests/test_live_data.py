from datetime import date
from pathlib import Path

import pytest

from etl.ingestion_worker import write_heartbeat
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
2021-04-15,Economic Centre-Dambulla,Chili (red, dry raw),Wholesale,450.00,KG
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


def test_heartbeat_writes_a_fresh_timestamp(tmp_path: Path):
    heartbeat = tmp_path / "atie-ingestion-health"

    write_heartbeat(heartbeat)

    assert int(heartbeat.read_text(encoding="ascii")) > 0


def test_open_meteo_parser_normalizes_inverted_temperature_bounds():
    payload = """
    {
      "daily": {
        "time": ["2026-10-27"],
        "precipitation_sum": [3.5],
        "temperature_2m_max": [21.0],
        "temperature_2m_min": [28.4]
      }
    }
    """

    rows = parse_open_meteo_weather(payload, "NUWARA_ELIYA")

    assert len(rows) == 1
    assert rows[0].temp_max_c == 28.4
    assert rows[0].temp_min_c == 21.0


def test_ingest_hdx_does_not_overwrite_valid_cache_with_malformed_live_payload(
    tmp_path: Path, monkeypatch
):
    from etl import ingestion_worker

    cache_path = tmp_path / "hdx.csv"
    cache_path.write_text(HDX_SAMPLE, encoding="utf-8")
    captured: list[tuple[str, str, int]] = []

    monkeypatch.setattr(
        ingestion_worker,
        "fetch_text",
        lambda url, **kwargs: "<html>503 maintenance</html>",
    )

    def fake_ingest_prices(config, observations, started, **kwargs):
        rows = list(observations)
        captured.append((kwargs["status"], kwargs["data_state"], len(rows)))
        return {
            "source": kwargs["source_code"],
            "status": kwargs["status"],
            "data_state": kwargs["data_state"],
            "records_received": len(rows),
            "records_written": len(rows),
            "message": kwargs["message"],
        }

    monkeypatch.setattr(ingestion_worker, "_ingest_prices", fake_ingest_prices)
    config = ingestion_worker.IngestionConfig(
        dsn="postgresql://unused",
        schema_path=tmp_path / "schema.sql",
        hdx_cache_path=cache_path,
    )

    result = ingestion_worker.ingest_hdx(config)

    assert cache_path.read_text(encoding="utf-8") == HDX_SAMPLE
    assert result["status"] == "FALLBACK"
    assert result["data_state"] == "CACHED"
    assert captured == [("FALLBACK", "CACHED", 2)]


def test_ingest_weather_backfills_failed_markets_from_cache(
    tmp_path: Path, monkeypatch
):
    from etl import ingestion_worker
    from etl.live_data import WeatherObservation
    from etl.weather_client import write_weather_cache

    weather_cache = tmp_path / "weather.json"
    write_weather_cache(
        weather_cache,
        [
            WeatherObservation(
                market_code="JAFFNA",
                observation_date=date(2026, 10, 27),
                precipitation_mm=4.2,
                temp_max_c=31.0,
                temp_min_c=25.0,
                source="OPEN_METEO_LIVE",
            )
        ],
    )

    def fake_fetch_text(url, *, params=None, client=None, timeout_seconds=30.0):
        assert params is not None
        if params["latitude"] == ingestion_worker.MARKET_COORDINATES["JAFFNA"][0]:
            raise ValueError("simulated Jaffna timeout")
        return """
        {
          "daily": {
            "time": ["2026-10-27"],
            "precipitation_sum": [6.0],
            "temperature_2m_max": [29.0],
            "temperature_2m_min": [22.0]
          }
        }
        """

    written_rows: list[WeatherObservation] = []

    def fake_ingest_weather_rows(config, observations, started, **kwargs):
        written_rows.extend(observations)
        return {
            "source": "OPEN_METEO",
            "status": kwargs["status"],
            "data_state": kwargs["data_state"],
            "records_received": kwargs["records_received"],
            "records_written": len(written_rows),
            "message": kwargs["message"],
        }

    monkeypatch.setattr(ingestion_worker, "fetch_text", fake_fetch_text)
    monkeypatch.setattr(
        ingestion_worker, "_ingest_weather_rows", fake_ingest_weather_rows
    )
    config = ingestion_worker.IngestionConfig(
        dsn="postgresql://unused",
        schema_path=tmp_path / "schema.sql",
        weather_cache_path=weather_cache,
    )

    result = ingestion_worker.ingest_weather(config)

    assert result["status"] == "FALLBACK"
    assert result["data_state"] == "CACHED"
    by_market = {row.market_code: row for row in written_rows}
    assert set(by_market) == set(ingestion_worker.MARKET_COORDINATES)
    assert by_market["DAMBULLA"].source == "OPEN_METEO_LIVE"
    assert by_market["JAFFNA"].source == "OPEN_METEO_CACHED"


def test_green_chili_and_clean_cropix_market_aliases_parse_without_accepting_dry_chili():
    sample = """date,market,commodity,pricetype,price,unit
2026-10-27,Keppetipola (DEC),Chilies (green),Wholesale,420.00,KG
2026-10-27,Colombo Pettah,Green Chili,Wholesale,455.50,KG
2026-10-27,Dambulla,Chili (red, dry raw),Wholesale,890.00,KG
"""
    rows = parse_cropix_prices(sample)

    assert [
        (row.market_code, row.crop_code, row.wholesale_price_lkr_per_kg, row.source)
        for row in rows
    ] == [
        ("KEPPETIPOLA", "GREEN_CHILI", 420.0, "CROPIX_LIVE"),
        ("PETTAH_COLOMBO", "GREEN_CHILI", 455.5, "CROPIX_LIVE"),
    ]


