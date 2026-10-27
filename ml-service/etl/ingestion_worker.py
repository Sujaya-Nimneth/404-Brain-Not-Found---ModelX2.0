from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Iterable

import httpx
import psycopg

from etl.live_data import (
    HDX_DEFAULT_URL,
    PriceObservation,
    WeatherObservation,
    fetch_text,
    parse_cropix_prices,
    parse_hdx_prices,
    parse_open_meteo_weather,
    read_or_write_cache,
    utc_now,
)

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
MARKET_COORDINATES = {
    "DAMBULLA": (7.8675, 80.6517),
    "PETTAH_COLOMBO": (6.9355, 79.8575),
    "NUWARA_ELIYA": (6.9497, 80.7891),
    "KEPPETIPOLA": (6.87, 80.93),
    "MEEGODA": (6.84, 80.03),
    "THAMBUTTEGAMA": (8.15, 80.44),
    "JAFFNA": (9.6615, 80.0255),
}


@dataclass(frozen=True)
class IngestionConfig:
    dsn: str
    schema_path: Path
    hdx_url: str = HDX_DEFAULT_URL
    hdx_cache_path: Path = Path("/app/data/cache/hdx_wfp_prices.csv")
    cropix_url: str | None = None
    cropix_cache_path: Path = Path("/app/data/cache/cropix_prices.csv")
    open_meteo_url: str = OPEN_METEO_URL
    interval_seconds: int = 21_600

    @classmethod
    def from_environment(cls) -> "IngestionConfig":
        dsn = os.getenv("POSTGRES_DSN")
        if not dsn:
            raise ValueError("POSTGRES_DSN is required for live ingestion")
        schema = Path(os.getenv("INGESTION_SCHEMA_PATH", "/app/ingestion_schema.sql"))
        if not schema.exists():
            raise ValueError(f"ingestion schema is missing: {schema}")
        return cls(
            dsn=dsn,
            schema_path=schema,
            hdx_url=os.getenv("HDX_PRICE_URL", HDX_DEFAULT_URL),
            hdx_cache_path=Path(
                os.getenv("HDX_CACHE_PATH", "/app/data/cache/hdx_wfp_prices.csv")
            ),
            cropix_url=os.getenv("CROPIX_URL") or None,
            cropix_cache_path=Path(
                os.getenv("CROPIX_CACHE_PATH", "/app/data/cache/cropix_prices.csv")
            ),
            open_meteo_url=os.getenv("OPEN_METEO_URL", OPEN_METEO_URL),
            interval_seconds=max(300, int(os.getenv("INGESTION_INTERVAL_SECONDS", "21600"))),
        )


def apply_schema(config: IngestionConfig) -> None:
    with psycopg.connect(config.dsn) as connection:
        connection.execute(config.schema_path.read_text(encoding="utf-8"))
        connection.commit()


def ingest_hdx(config: IngestionConfig) -> dict[str, object]:
    started = utc_now()
    try:
        payload = fetch_text(config.hdx_url)
        read_or_write_cache(config.hdx_cache_path, payload)
        observations = parse_hdx_prices(payload)
        if not observations:
            raise ValueError("HDX returned no supported wholesale price rows")
        return _ingest_prices(
            config,
            observations,
            started,
            source_code="HDX",
            status="SUCCESS",
            data_state="LIVE",
            source_url=config.hdx_url,
            message="WFP Sri Lanka wholesale prices fetched from HDX.",
        )
    except (httpx.HTTPError, OSError, ValueError) as error:
        return _ingest_cached_or_fallback(
            config,
            config.hdx_cache_path,
            parse_hdx_prices,
            started,
            source_code="HDX",
            source_url=config.hdx_url,
            error=error,
        )


def ingest_cropix(config: IngestionConfig) -> dict[str, object]:
    started = utc_now()
    if config.cropix_url:
        try:
            payload = fetch_text(config.cropix_url)
            read_or_write_cache(config.cropix_cache_path, payload)
            observations = parse_cropix_prices(payload)
            if not observations:
                raise ValueError("CROPIX returned no supported wholesale price rows")
            return _ingest_prices(
                config,
                observations,
                started,
                source_code="CROPIX",
                status="SUCCESS",
                data_state="LIVE",
                source_url=config.cropix_url,
                message="CROPIX prices fetched from the configured endpoint.",
            )
        except (httpx.HTTPError, OSError, ValueError) as error:
            return _ingest_cached_or_fallback(
                config,
                config.cropix_cache_path,
                parse_cropix_prices,
                started,
                source_code="CROPIX",
                source_url=config.cropix_url,
                error=error,
            )
    return _ingest_cached_or_fallback(
        config,
        config.cropix_cache_path,
        parse_cropix_prices,
        started,
        source_code="CROPIX",
        source_url=None,
        error=ValueError("CROPIX endpoint is not configured"),
    )


def ingest_weather(config: IngestionConfig) -> dict[str, object]:
    started = utc_now()
    records_received = 0
    observations: list[WeatherObservation] = []
    errors: list[str] = []
    with httpx.Client(timeout=20.0, follow_redirects=True) as client:
        for market_code, (latitude, longitude) in MARKET_COORDINATES.items():
            try:
                payload = fetch_text(
                    config.open_meteo_url,
                    params={
                        "latitude": latitude,
                        "longitude": longitude,
                        "daily": "precipitation_sum,temperature_2m_max,temperature_2m_min",
                        "forecast_days": 7,
                        "timezone": "Asia/Colombo",
                    },
                    client=client,
                )
                rows = parse_open_meteo_weather(payload, market_code)
                records_received += len(rows)
                observations.extend(rows)
            except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
                errors.append(f"{market_code}: {error}")
    if not observations:
        return _record_failure(
            config,
            source_code="OPEN_METEO",
            started=started,
            source_url=config.open_meteo_url,
            message="Open-Meteo returned no usable forecasts. " + "; ".join(errors),
        )
    return _ingest_weather_rows(
        config,
        observations,
        started,
        records_received=records_received,
        status="SUCCESS" if not errors else "FALLBACK",
        data_state="LIVE" if not errors else "CACHED",
        source_url=config.open_meteo_url,
        message=(
            "Open-Meteo forecasts fetched for every supported market."
            if not errors
            else "Partial Open-Meteo refresh: " + "; ".join(errors)
        ),
    )


def _ingest_cached_or_fallback(
    config: IngestionConfig,
    cache_path: Path,
    parser,
    started: datetime,
    *,
    source_code: str,
    source_url: str | None,
    error: Exception,
) -> dict[str, object]:
    if cache_path.exists():
        try:
            cached = cache_path.read_text(encoding="utf-8")
            observations = parser(cached, source_label=f"{source_code}_CACHED")
            if observations:
                return _ingest_prices(
                    config,
                    observations,
                    started,
                    source_code=source_code,
                    status="FALLBACK",
                    data_state="CACHED",
                    source_url=str(cache_path),
                    message=f"Live fetch failed; using cached snapshot. {error}",
                )
        except (OSError, ValueError) as cache_error:
            error = ValueError(f"{error}; cache read failed: {cache_error}")
    return _record_failure(
        config,
        source_code=source_code,
        started=started,
        source_url=source_url,
        message=str(error),
    )


def _ingest_prices(
    config: IngestionConfig,
    observations: Iterable[PriceObservation],
    started: datetime,
    *,
    source_code: str,
    status: str,
    data_state: str,
    source_url: str | None,
    message: str,
) -> dict[str, object]:
    rows = list(observations)
    with psycopg.connect(config.dsn) as connection:
        _record_run(
            connection,
            source_code=source_code,
            status=status,
            data_state=data_state,
            started=started,
            records_received=len(rows),
            records_written=len(rows),
            source_url=source_url,
            message=message,
        )
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TEMP TABLE incoming_prices (
                    market_code TEXT,
                    crop_code TEXT,
                    recorded_date DATE,
                    wholesale_price_lkr_per_kg NUMERIC(10, 2),
                    source VARCHAR(32)
                ) ON COMMIT DROP
                """
            )
            cursor.executemany(
                """
                INSERT INTO incoming_prices VALUES (%s, %s, %s, %s, %s)
                """,
                [
                    (
                        row.market_code,
                        row.crop_code,
                        row.recorded_date,
                        row.wholesale_price_lkr_per_kg,
                        row.source,
                    )
                    for row in rows
                ],
            )
            cursor.execute(
                """
                INSERT INTO historical_prices (
                    market_id, crop_id, recorded_date,
                    wholesale_price_lkr_per_kg, source
                )
                SELECT markets.id, crops.id, incoming.recorded_date,
                       incoming.wholesale_price_lkr_per_kg, incoming.source
                FROM incoming_prices incoming
                JOIN markets ON markets.code = incoming.market_code
                JOIN crops ON crops.code = incoming.crop_code
                ON CONFLICT (market_id, crop_id, recorded_date) DO UPDATE SET
                    wholesale_price_lkr_per_kg =
                        EXCLUDED.wholesale_price_lkr_per_kg,
                    source = EXCLUDED.source
                WHERE historical_prices.source LIKE '%!_LIVE' ESCAPE '!'
                   OR historical_prices.source LIKE '%!_CACHED' ESCAPE '!'
                   OR historical_prices.source LIKE '%!_SEED' ESCAPE '!'
                """
            )
            written = _matched_rows(
                cursor,
                "historical_prices",
                [(row.market_code, row.crop_code, row.recorded_date) for row in rows],
            )
            _upsert_status(
                cursor,
                source_code=source_code,
                status=status,
                data_state=data_state,
                latest_date=max(row.recorded_date for row in rows),
                source_url=source_url,
                records_written=written,
                message=message,
            )
    return {
        "source": source_code,
        "status": status,
        "data_state": data_state,
        "records_received": len(rows),
        "records_written": written,
        "message": message,
    }


def _ingest_weather_rows(
    config: IngestionConfig,
    observations: Iterable[WeatherObservation],
    started: datetime,
    *,
    records_received: int,
    status: str,
    data_state: str,
    source_url: str,
    message: str,
) -> dict[str, object]:
    rows = list(observations)
    with psycopg.connect(config.dsn) as connection:
        _record_run(
            connection,
            source_code="OPEN_METEO",
            status=status,
            data_state=data_state,
            started=started,
            records_received=records_received,
            records_written=len(rows),
            source_url=source_url,
            message=message,
        )
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TEMP TABLE incoming_weather (
                    market_code TEXT,
                    observation_date DATE,
                    precipitation_mm NUMERIC(6, 2),
                    temp_max_c NUMERIC(5, 2),
                    temp_min_c NUMERIC(5, 2),
                    source VARCHAR(32)
                ) ON COMMIT DROP
                """
            )
            cursor.executemany(
                "INSERT INTO incoming_weather VALUES (%s, %s, %s, %s, %s, %s)",
                [
                    (
                        row.market_code,
                        row.observation_date,
                        row.precipitation_mm,
                        row.temp_max_c,
                        row.temp_min_c,
                        row.source,
                    )
                    for row in rows
                ],
            )
            cursor.execute(
                """
                INSERT INTO weather_observations (
                    market_id, observation_date, precipitation_mm,
                    temp_max_c, temp_min_c, extreme_weather_flag, source
                )
                SELECT markets.id, incoming.observation_date,
                       incoming.precipitation_mm, incoming.temp_max_c,
                       incoming.temp_min_c,
                       incoming.precipitation_mm >= 15, incoming.source
                FROM incoming_weather incoming
                JOIN markets ON markets.code = incoming.market_code
                ON CONFLICT (market_id, observation_date) DO UPDATE SET
                    precipitation_mm = EXCLUDED.precipitation_mm,
                    temp_max_c = EXCLUDED.temp_max_c,
                    temp_min_c = EXCLUDED.temp_min_c,
                    extreme_weather_flag = EXCLUDED.extreme_weather_flag,
                    source = EXCLUDED.source
                """
            )
            written = _matched_rows(
                cursor,
                "weather_observations",
                [(row.market_code, None, row.observation_date) for row in rows],
            )
            _upsert_status(
                cursor,
                source_code="OPEN_METEO",
                status=status,
                data_state=data_state,
                latest_date=max(row.observation_date for row in rows),
                source_url=source_url,
                records_written=written,
                message=message,
            )
    return {
        "source": "OPEN_METEO",
        "status": status,
        "data_state": data_state,
        "records_received": records_received,
        "records_written": written,
        "message": message,
    }


def _record_failure(
    config: IngestionConfig,
    *,
    source_code: str,
    started: datetime,
    source_url: str | None,
    message: str,
) -> dict[str, object]:
    with psycopg.connect(config.dsn) as connection:
        _record_run(
            connection,
            source_code=source_code,
            status="FAILED",
            data_state="UNAVAILABLE",
            started=started,
            records_received=0,
            records_written=0,
            source_url=source_url,
            message=message,
        )
        with connection.cursor() as cursor:
            _upsert_status(
                cursor,
                source_code=source_code,
                status="FAILED",
                data_state="UNAVAILABLE",
                latest_date=None,
                source_url=source_url,
                records_written=0,
                message=message,
            )
    return {
        "source": source_code,
        "status": "FAILED",
        "data_state": "UNAVAILABLE",
        "records_received": 0,
        "records_written": 0,
        "message": message,
    }


def _record_run(
    connection: psycopg.Connection,
    *,
    source_code: str,
    status: str,
    data_state: str,
    started: datetime,
    records_received: int,
    records_written: int,
    source_url: str | None,
    message: str,
) -> None:
    connection.execute(
        """
        INSERT INTO data_ingestion_runs (
            source_code, status, data_state, started_at, finished_at,
            records_received, records_written, source_url, error_message
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            source_code,
            status,
            data_state,
            started,
            utc_now(),
            records_received,
            records_written,
            source_url,
            None if status == "SUCCESS" else message,
        ),
    )


def _matched_rows(
    cursor: psycopg.Cursor,
    table: str,
    keys: list[tuple[str, str | None, date]],
) -> int:
    if table == "historical_prices":
        cursor.execute(
            """
            SELECT count(*)
            FROM historical_prices history
            JOIN markets ON markets.id = history.market_id
            JOIN crops ON crops.id = history.crop_id
            JOIN unnest(%s::text[], %s::text[], %s::date[])
                AS incoming(market_code, crop_code, recorded_date)
            ON markets.code = incoming.market_code
            AND crops.code = incoming.crop_code
            AND history.recorded_date = incoming.recorded_date
            """,
            (
                [key[0] for key in keys],
                [key[1] for key in keys],
                [key[2] for key in keys],
            ),
        )
    else:
        cursor.execute(
            """
            SELECT count(*)
            FROM weather_observations weather
            JOIN markets ON markets.id = weather.market_id
            JOIN unnest(%s::text[], %s::date[])
                AS incoming(market_code, observation_date)
            ON markets.code = incoming.market_code
            AND weather.observation_date = incoming.observation_date
            """,
            ([key[0] for key in keys], [key[2] for key in keys]),
        )
    return int(cursor.fetchone()[0])


def _upsert_status(
    cursor: psycopg.Cursor,
    *,
    source_code: str,
    status: str,
    data_state: str,
    latest_date: date | None,
    source_url: str | None,
    records_written: int,
    message: str,
) -> None:
    now = utc_now()
    cursor.execute(
        """
        INSERT INTO data_source_status (
            source_code, data_state, last_attempt_at, last_success_at,
            latest_observation_date, source_url, records_written, message,
            updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (source_code) DO UPDATE SET
            data_state = EXCLUDED.data_state,
            last_attempt_at = EXCLUDED.last_attempt_at,
            last_success_at = CASE WHEN %s = 'SUCCESS'
                THEN EXCLUDED.last_attempt_at
                ELSE data_source_status.last_success_at END,
            latest_observation_date = CASE WHEN %s = 'SUCCESS'
                THEN EXCLUDED.latest_observation_date
                ELSE data_source_status.latest_observation_date END,
            source_url = EXCLUDED.source_url,
            records_written = EXCLUDED.records_written,
            message = EXCLUDED.message,
            updated_at = EXCLUDED.updated_at
        """,
        (
            source_code,
            data_state,
            now,
            now if status == "SUCCESS" else None,
            latest_date,
            source_url,
            records_written,
            message,
            now,
            status,
            status,
        ),
    )


def run_once(config: IngestionConfig) -> list[dict[str, object]]:
    apply_schema(config)
    results = [
        ingest_hdx(config),
        ingest_cropix(config),
        ingest_weather(config),
    ]
    for result in results:
        logger.info(
            "%s %s: %s rows (%s)",
            result["source"],
            result["status"],
            result["records_written"],
            result["message"],
        )
    return results


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    config = IngestionConfig.from_environment()
    while True:
        try:
            run_once(config)
        except Exception:
            logger.exception("Ingestion cycle failed")
        time.sleep(config.interval_seconds)


if __name__ == "__main__":
    main()
