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
        assert _run_counts(TEST_DSN, "test://cached-downgrade") == (1, 0)
    finally:
        _cleanup(TEST_DSN, recorded_date)


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
