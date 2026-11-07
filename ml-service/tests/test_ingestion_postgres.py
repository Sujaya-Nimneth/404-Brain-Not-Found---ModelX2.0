from __future__ import annotations

import os
from datetime import date
from pathlib import Path

import psycopg
import pytest

from etl.ingestion_worker import (
    IngestionConfig,
    _ingest_prices,
    apply_schema,
)
from etl.live_data import PriceObservation, utc_now


ROOT = Path(__file__).resolve().parents[2]
TEST_DSN = os.getenv("ATIE_TEST_POSTGRES_DSN")


@pytest.mark.skipif(
    not TEST_DSN,
    reason="ATIE_TEST_POSTGRES_DSN is not configured",
)
def test_source_priority_and_actual_write_counts(tmp_path: Path):
    assert TEST_DSN is not None
    config = IngestionConfig(
        dsn=TEST_DSN,
        schema_path=ROOT / "db" / "ingestion_schema.sql",
        hdx_cache_path=tmp_path / "hdx.csv",
        cropix_cache_path=tmp_path / "cropix.csv",
        weather_cache_path=tmp_path / "weather.json",
    )
    apply_schema(config)
    recorded_date = date(2099, 1, 1)
    _cleanup(TEST_DSN, recorded_date)

    try:
        live = _observation(recorded_date, "11.00", "HDX_LIVE")
        first = _ingest_prices(
            config,
            [live],
            utc_now(),
            source_code="HDX",
            status="SUCCESS",
            data_state="LIVE",
            source_url="test://live-insert",
            message="live insert",
        )
        assert first["records_written"] == 1

        cached = _ingest_prices(
            config,
            [_observation(recorded_date, "22.00", "HDX_CACHED")],
            utc_now(),
            source_code="HDX",
            status="FALLBACK",
            data_state="CACHED",
            source_url="test://cached-downgrade",
            message="cached downgrade",
        )
        assert cached["records_written"] == 0
        assert _stored_price(TEST_DSN, recorded_date) == (
            11.0,
            "HDX_LIVE",
        )

        seeded = _ingest_prices(
            config,
            [_observation(recorded_date, "33.00", "HDX_SEED")],
            utc_now(),
            source_code="HDX",
            status="FALLBACK",
            data_state="SEED",
            source_url="test://seed-downgrade",
            message="seed downgrade",
        )
        assert seeded["records_written"] == 0
        assert _stored_price(TEST_DSN, recorded_date) == (
            11.0,
            "HDX_LIVE",
        )

        updated = _ingest_prices(
            config,
            [_observation(recorded_date, "12.00", "HDX_LIVE")],
            utc_now(),
            source_code="HDX",
            status="SUCCESS",
            data_state="LIVE",
            source_url="test://live-update",
            message="live update",
        )
        assert updated["records_written"] == 1
        assert _stored_price(TEST_DSN, recorded_date) == (
            12.0,
            "HDX_LIVE",
        )

        duplicate_live = _ingest_prices(
            config,
            [_observation(recorded_date, "12.00", "HDX_LIVE")],
            utc_now(),
            source_code="HDX",
            status="SUCCESS",
            data_state="LIVE",
            source_url="test://live-duplicate",
            message="live duplicate",
        )
        assert duplicate_live["records_written"] == 0

        cropix_live = _ingest_prices(
            config,
            [_observation(recorded_date, "14.50", "CROPIX_LIVE")],
            utc_now(),
            source_code="CROPIX",
            status="SUCCESS",
            data_state="LIVE",
            source_url="test://cropix-live",
            message="cropix live update",
        )
        assert cropix_live["records_written"] == 1
        assert _stored_price(TEST_DSN, recorded_date) == (
            14.5,
            "CROPIX_LIVE",
        )
        assert _run_counts(TEST_DSN, "test://cached-downgrade") == (1, 0)
    finally:
        _cleanup(TEST_DSN, recorded_date)


@pytest.mark.skipif(
    not TEST_DSN,
    reason="ATIE_TEST_POSTGRES_DSN is not configured",
)
def test_partial_weather_refresh_persists_fallback_run_without_check_violation(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    from etl import ingestion_worker
    from etl.live_data import WeatherObservation
    from etl.weather_client import write_weather_cache

    assert TEST_DSN is not None
    weather_cache = tmp_path / "weather.json"
    obs_date = date(2099, 1, 2)
    write_weather_cache(
        weather_cache,
        [
            WeatherObservation(
                market_code="JAFFNA",
                observation_date=obs_date,
                precipitation_mm=4.2,
                temp_max_c=31.0,
                temp_min_c=25.0,
                source="OPEN_METEO_LIVE",
            )
        ],
    )

    def fake_fetch_text(url, *, params=None, client=None, timeout_seconds=20.0):
        assert params is not None
        if params["latitude"] == ingestion_worker.MARKET_COORDINATES["JAFFNA"][0]:
            raise ValueError("simulated Jaffna timeout")
        return f"""
        {{
          "daily": {{
            "time": ["{obs_date.isoformat()}"],
            "precipitation_sum": [16.5],
            "temperature_2m_max": [29.0],
            "temperature_2m_min": [22.0]
          }}
        }}
        """

    monkeypatch.setattr(ingestion_worker, "fetch_text", fake_fetch_text)
    config = IngestionConfig(
        dsn=TEST_DSN,
        schema_path=ROOT / "db" / "ingestion_schema.sql",
        hdx_cache_path=tmp_path / "hdx.csv",
        cropix_cache_path=tmp_path / "cropix.csv",
        weather_cache_path=weather_cache,
        open_meteo_url="test://open-meteo-partial",
    )
    apply_schema(config)
    _cleanup_weather(TEST_DSN, obs_date)

    try:
        result = ingestion_worker.ingest_weather(config)
        assert result["status"] == "FALLBACK"
        assert result["data_state"] == "CACHED"
        assert result["records_written"] == 7
        assert _run_counts(TEST_DSN, "test://open-meteo-partial") == (6, 7)
    finally:
        _cleanup_weather(TEST_DSN, obs_date)


@pytest.mark.skipif(
    not TEST_DSN,
    reason="ATIE_TEST_POSTGRES_DSN is not configured",
)
def test_postgres_seed_sql_matches_python_seed_loader_without_skew():
    import pandas as pd
    from etl.seed_loader import generate_demo_history

    assert TEST_DSN is not None
    py_frame = generate_demo_history(end_date="2026-10-27", days=180)
    with psycopg.connect(TEST_DSN) as connection:
        db_frame = pd.read_sql_query(
            """
            SELECT markets.code AS market_code,
                   crops.code AS crop_code,
                   history.recorded_date,
                   history.wholesale_price_lkr_per_kg,
                   history.arrival_volume_tonnes
            FROM historical_prices history
            JOIN markets ON markets.id = history.market_id
            JOIN crops ON crops.id = history.crop_id
            WHERE history.source = 'HDX_SEED'
              AND history.recorded_date BETWEEN DATE '2026-05-01' AND DATE '2026-10-27'
            ORDER BY markets.code, crops.code, history.recorded_date
            """,
            connection,
        )
    if db_frame.empty:
        pytest.skip("Seed rows were replaced by live ingestion on this DB")
    db_frame["recorded_date"] = pd.to_datetime(db_frame["recorded_date"])
    merged = db_frame.merge(
        py_frame,
        on=["market_code", "crop_code", "recorded_date"],
        suffixes=("_db", "_py"),
    )
    assert len(merged) == len(db_frame)
    price_diff = (
        merged["wholesale_price_lkr_per_kg_db"]
        - merged["wholesale_price_lkr_per_kg_py"]
    ).abs()
    arrival_diff = (
        merged["arrival_volume_tonnes_db"] - merged["arrival_volume_tonnes_py"]
    ).abs()
    assert float(price_diff.max()) == 0.0
    assert float(arrival_diff.max()) == 0.0



def _observation(
    recorded_date: date,
    price: str,
    source: str,
) -> PriceObservation:
    return PriceObservation(
        market_code="DAMBULLA",
        crop_code="TOMATO",
        recorded_date=recorded_date,
        wholesale_price_lkr_per_kg=float(price),
        source=source,
    )


def _stored_price(dsn: str, recorded_date: date) -> tuple[float, str]:
    with psycopg.connect(dsn) as connection:
        row = connection.execute(
            """
            SELECT history.wholesale_price_lkr_per_kg, history.source
            FROM historical_prices history
            JOIN markets ON markets.id = history.market_id
            JOIN crops ON crops.id = history.crop_id
            WHERE markets.code = 'DAMBULLA'
              AND crops.code = 'TOMATO'
              AND history.recorded_date = %s
            """,
            (recorded_date,),
        ).fetchone()
    assert row is not None
    return float(row[0]), str(row[1])


def _run_counts(dsn: str, source_url: str) -> tuple[int, int]:
    with psycopg.connect(dsn) as connection:
        row = connection.execute(
            """
            SELECT records_received, records_written
            FROM data_ingestion_runs
            WHERE source_url = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (source_url,),
        ).fetchone()
    assert row is not None
    return int(row[0]), int(row[1])


def _cleanup(dsn: str, recorded_date: date) -> None:
    with psycopg.connect(dsn) as connection:
        connection.execute(
            """
            DELETE FROM historical_prices history
            USING markets, crops
            WHERE markets.id = history.market_id
              AND crops.id = history.crop_id
              AND markets.code = 'DAMBULLA'
              AND crops.code = 'TOMATO'
              AND history.recorded_date = %s
            """,
            (recorded_date,),
        )
        connection.execute(
            """
            DELETE FROM data_ingestion_runs
            WHERE source_url LIKE 'test://%%'
            """
        )
        connection.execute(
            """
            DELETE FROM data_source_status
            WHERE source_url LIKE 'test://%%'
            """
        )


def _cleanup_weather(dsn: str, obs_date: date) -> None:
    with psycopg.connect(dsn) as connection:
        connection.execute(
            "DELETE FROM weather_observations WHERE observation_date = %s",
            (obs_date,),
        )
        connection.execute(
            """
            DELETE FROM data_ingestion_runs
            WHERE source_url LIKE 'test://%%'
            """
        )
        connection.execute(
            """
            DELETE FROM data_source_status
            WHERE source_url LIKE 'test://%%'
            """
        )
