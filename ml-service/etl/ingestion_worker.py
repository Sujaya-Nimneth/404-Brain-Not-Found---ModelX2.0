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
    atomic_write_text,
    bound_message,
    dedupe_by_key,
    dedupe_weather_by_key,
    fetch_text,
    parse_cropix_prices,
    parse_hdx_prices,
    parse_open_meteo_weather,
    read_or_write_cache,
    utc_now,
)
from etl.weather_client import read_weather_cache, write_weather_cache

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
    weather_cache_path: Path = Path("/app/data/cache/weather_forecasts.json")
    interval_seconds: int = 21_600
    fetch_timeout_seconds: float = 20.0

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
            weather_cache_path=Path(
                os.getenv(
                    "OPEN_METEO_CACHE_PATH",
                    "/app/data/cache/weather_forecasts.json",
                )
            ),
            interval_seconds=max(
                300, int(os.getenv("INGESTION_INTERVAL_SECONDS", "21600"))
            ),
            fetch_timeout_seconds=max(
                2.0, float(os.getenv("INGESTION_FETCH_TIMEOUT_SECONDS", "20"))
            ),
        )


def apply_schema(config: IngestionConfig) -> None:
    with psycopg.connect(config.dsn, connect_timeout=5) as connection:
        connection.execute(config.schema_path.read_text(encoding="utf-8"))
        connection.commit()


def ingest_hdx(config: IngestionConfig) -> dict[str, object]:
    started = utc_now()
    try:
        payload = fetch_text(
            config.hdx_url,
            timeout_seconds=config.fetch_timeout_seconds,
        )
        observations = parse_hdx_prices(payload)
        if not observations:
            raise ValueError("HDX returned no supported wholesale price rows")
        read_or_write_cache(config.hdx_cache_path, payload)
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
    except (httpx.HTTPError, OSError, ValueError, psycopg.Error) as error:
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
            payload = fetch_text(
                config.cropix_url,
                timeout_seconds=config.fetch_timeout_seconds,
            )
            observations = parse_cropix_prices(payload)
            if not observations:
                raise ValueError("CROPIX returned no supported wholesale price rows")
            read_or_write_cache(config.cropix_cache_path, payload)
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
        except (httpx.HTTPError, OSError, ValueError, psycopg.Error) as error:
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
    prior_cached = read_weather_cache(config.weather_cache_path)
    with httpx.Client(
        timeout=config.fetch_timeout_seconds,
        follow_redirects=True,
    ) as client:
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
                    timeout_seconds=config.fetch_timeout_seconds,
                )
                rows = parse_open_meteo_weather(payload, market_code)
                records_received += len(rows)
                observations.extend(rows)
            except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
                errors.append(f"{market_code}: {error}")
    if observations:
        try:
            merged_cache = list(observations)
            if prior_cached:
                live_markets = {row.market_code for row in observations}
                merged_cache.extend(
                    row for row in prior_cached if row.market_code not in live_markets
                )
            write_weather_cache(config.weather_cache_path, merged_cache)
        except OSError as error:
            errors.append(f"weather cache write failed: {error}")
    if not observations:
        cached = prior_cached or read_weather_cache(config.weather_cache_path)
        if cached:
            try:
                return _ingest_weather_rows(
                    config,
                    cached,
                    started,
                    records_received=len(cached),
                    status="FALLBACK",
                    data_state="CACHED",
                    source_url=str(config.weather_cache_path),
                    message=bound_message(
                        "Open-Meteo unavailable; using verified cached weather. "
                        + "; ".join(errors)
                    ),
                )
            except (OSError, psycopg.Error) as db_error:
                errors.append(f"database write failed: {db_error}")
        return _record_failure(
            config,
            source_code="OPEN_METEO",
            started=started,
            source_url=config.open_meteo_url,
            message=bound_message(
                "Open-Meteo returned no usable forecasts. " + "; ".join(errors)
            ),
        )

    to_write = list(observations)
    if errors and prior_cached:
        live_markets = {row.market_code for row in observations}
        backfilled = [
            row for row in prior_cached if row.market_code not in live_markets
        ]
        to_write.extend(backfilled)

    try:
        return _ingest_weather_rows(
            config,
            to_write,
            started,
            records_received=records_received,
            status="SUCCESS" if not errors else "FALLBACK",
            data_state="LIVE" if not errors else "CACHED",
            source_url=config.open_meteo_url,
            message=bound_message(
                "Open-Meteo forecasts fetched for every supported market."
                if not errors
                else "Partial Open-Meteo refresh (cached fallback used where needed): "
                + "; ".join(errors)
            ),
        )
    except (OSError, psycopg.Error) as db_error:
        return _record_failure(
            config,
            source_code="OPEN_METEO",
            started=started,
            source_url=config.open_meteo_url,
            message=bound_message(f"Open-Meteo persistence failed: {db_error}"),
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
                    message=bound_message(
                        f"Live fetch failed; using cached snapshot. {error}"
                    ),
                )
        except (OSError, ValueError, psycopg.Error) as cache_error:
            error = ValueError(f"{error}; cache fallback failed: {cache_error}")
    return _record_failure(
        config,
        source_code=source_code,
        started=started,
        source_url=source_url,
        message=bound_message(str(error)),
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
    rows = dedupe_by_key(observations)
    if not rows:
        raise ValueError("price ingestion requires at least one observation")
    bounded = bound_message(message)
    with psycopg.connect(config.dsn, connect_timeout=5) as connection:
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
                WITH upserted AS (
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
                    WHERE atie_source_priority(EXCLUDED.source)
                            > atie_source_priority(historical_prices.source)
                       OR (
                            atie_source_priority(EXCLUDED.source)
                                = atie_source_priority(historical_prices.source)
                        AND EXCLUDED.source = historical_prices.source
                        AND historical_prices.wholesale_price_lkr_per_kg
                                IS DISTINCT FROM EXCLUDED.wholesale_price_lkr_per_kg
                       )
                    RETURNING 1
                )
                SELECT count(*) FROM upserted
                """
            )
            written = int(cursor.fetchone()[0])
            _upsert_status(
                cursor,
                source_code=source_code,
                status=status,
                data_state=data_state,
                latest_date=max(row.recorded_date for row in rows),
                source_url=source_url,
                records_written=written,
                message=bounded,
            )
        _record_run(
            connection,
            source_code=source_code,
            status=status,
            data_state=data_state,
            started=started,
            records_received=len(rows),
            records_written=written,
            source_url=source_url,
            message=bounded,
        )
    return {
        "source": source_code,
        "status": status,
        "data_state": data_state,
        "records_received": len(rows),
        "records_written": written,
        "message": bounded,
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
    rows = dedupe_weather_by_key(observations)
    if not rows:
        raise ValueError("weather ingestion requires at least one observation")
    bounded = bound_message(message)
    with psycopg.connect(config.dsn, connect_timeout=5) as connection:
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
                WITH upserted AS (
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
                    WHERE atie_source_priority(EXCLUDED.source)
                            > atie_source_priority(weather_observations.source)
                       OR (
                            atie_source_priority(EXCLUDED.source)
                                = atie_source_priority(weather_observations.source)
                        AND EXCLUDED.source = weather_observations.source
                        AND (
                            weather_observations.precipitation_mm
                                IS DISTINCT FROM EXCLUDED.precipitation_mm
                            OR weather_observations.temp_max_c
                                IS DISTINCT FROM EXCLUDED.temp_max_c
                            OR weather_observations.temp_min_c
                                IS DISTINCT FROM EXCLUDED.temp_min_c
                            OR weather_observations.extreme_weather_flag
                                IS DISTINCT FROM EXCLUDED.extreme_weather_flag
                        )
                       )
                    RETURNING 1
                )
                SELECT count(*) FROM upserted
                """
            )
            written = int(cursor.fetchone()[0])
            _upsert_status(
                cursor,
                source_code="OPEN_METEO",
                status=status,
                data_state=data_state,
                latest_date=max(row.observation_date for row in rows),
                source_url=source_url,
                records_written=written,
                message=bounded,
            )
        _record_run(
            connection,
            source_code="OPEN_METEO",
            status=status,
            data_state=data_state,
            started=started,
            records_received=records_received,
            records_written=written,
            source_url=source_url,
            message=bounded,
        )
    return {
        "source": "OPEN_METEO",
        "status": status,
        "data_state": data_state,
        "records_received": records_received,
        "records_written": written,
        "message": bounded,
    }


def _record_failure(
    config: IngestionConfig,
    *,
    source_code: str,
    started: datetime,
    source_url: str | None,
    message: str,
) -> dict[str, object]:
    bounded = bound_message(message)
    try:
        with psycopg.connect(config.dsn, connect_timeout=5) as connection:
            _record_run(
                connection,
                source_code=source_code,
                status="FAILED",
                data_state="UNAVAILABLE",
                started=started,
                records_received=0,
                records_written=0,
                source_url=source_url,
                message=bounded,
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
                    message=bounded,
                )
    except (OSError, psycopg.Error) as db_error:
        logger.warning(
            "Unable to persist failure status for %s: %s",
            source_code,
            db_error,
        )
    return {
        "source": source_code,
        "status": "FAILED",
        "data_state": "UNAVAILABLE",
        "records_received": 0,
        "records_written": 0,
        "message": bounded,
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
            None if status == "SUCCESS" else bound_message(message),
        ),
    )


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
            data_state = CASE
                WHEN %s = 'FAILED' AND data_source_status.last_success_at IS NOT NULL
                THEN 'CACHED'
                ELSE EXCLUDED.data_state
            END,
            last_attempt_at = EXCLUDED.last_attempt_at,
            last_success_at = CASE WHEN %s = 'SUCCESS'
                THEN EXCLUDED.last_attempt_at
                ELSE data_source_status.last_success_at END,
            latest_observation_date = CASE
                WHEN %s IN ('SUCCESS', 'FALLBACK')
                 AND EXCLUDED.latest_observation_date IS NOT NULL
                THEN EXCLUDED.latest_observation_date
                ELSE data_source_status.latest_observation_date END,
            source_url = COALESCE(EXCLUDED.source_url, data_source_status.source_url),
            records_written = CASE
                WHEN %s = 'FAILED' AND data_source_status.records_written > 0
                THEN data_source_status.records_written
                ELSE EXCLUDED.records_written END,
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
            bound_message(message),
            now,
            status,
            status,
            status,
            status,
        ),
    )


def run_once(
    config: IngestionConfig,
    status_path: Path | None = None,
    *,
    ensure_schema: bool = True,
) -> list[dict[str, object]]:
    if status_path is not None:
        write_heartbeat(status_path)
    if ensure_schema:
        apply_schema(config)
    results: list[dict[str, object]] = []
    for step in (ingest_hdx, ingest_cropix, ingest_weather):
        if status_path is not None:
            write_heartbeat(status_path)
        results.append(step(config))
    if status_path is not None:
        write_heartbeat(status_path)
    for result in results:
        logger.info(
            "%s %s: %s rows (%s)",
            result["source"],
            result["status"],
            result["records_written"],
            result["message"],
        )
    return results


def write_heartbeat(status_path: Path) -> None:
    atomic_write_text(status_path, str(int(time.time())), encoding="ascii")


def wait_for_next_cycle(interval_seconds: int, status_path: Path) -> None:
    deadline = time.monotonic() + interval_seconds
    while True:
        write_heartbeat(status_path)
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return
        time.sleep(min(60, remaining))


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    config = IngestionConfig.from_environment()
    status_path = Path(
        os.getenv("INGESTION_HEALTH_PATH", "/tmp/atie-ingestion-health")
    )
    write_heartbeat(status_path)
    schema_ready = False
    while True:
        try:
            if not schema_ready:
                apply_schema(config)
                schema_ready = True
            run_once(config, status_path=status_path, ensure_schema=False)
        except Exception:
            logger.exception("Ingestion cycle failed")
        wait_for_next_cycle(config.interval_seconds, status_path)


if __name__ == "__main__":
    main()
